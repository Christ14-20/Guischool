"""
apps/authentication/views.py — AUTH-02

Endpoints JWT : login, refresh, logout, /users/me/, /auth/permissions/me/.

Rate-limiting sur /auth/login/ via django-ratelimit (protection anti-brute-force).
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User, StaffProfile

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

from core.permissions import HasPermission
from core.utils import success_response, error_response, created_response
from apps.monitoring.services import audit_log, get_client_ip

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserMeSerializer,
    ChangePasswordSerializer,
    StaffListSerializer,
    StaffDetailSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
    STAFF_PROFILE_FIELDS,
)
from .services.staff_service import create_staff_account


class LoginView(APIView):
    """
    POST /auth/login/
    Auth : aucune
    Rate-limit : 10 req/min par IP (protection brute-force — AUTH-02)
    """
    permission_classes = [AllowAny]
    throttle_classes = []  # Désactivé au niveau DRF, géré par ratelimit

    @method_decorator(ratelimit(key="ip", rate="10/m", method="POST", block=True))
    def post(self, request):
        from rest_framework.exceptions import PermissionDenied
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except PermissionDenied as e:
            # Compte suspendu — message exact du contrat §9 (403)
            return error_response(
                str(e.detail) if hasattr(e, "detail") else str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )
        except Exception as e:
            # Identifiants incorrects — message exact du contrat §1 (401)
            return error_response(
                "Identifiants incorrects",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data

        # AuditLog
        audit_log(
            user=serializer.user,
            tenant=getattr(serializer.user, "tenant", None),
            action="auth:login",
            ip_address=get_client_ip(request),
        )

        return success_response(data)


class RefreshView(APIView):
    """
    POST /auth/refresh/
    Auth : aucune (refresh token dans le body)
    Réponse 200 : {"status": "success", "data": {"access_token": "..."}}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return error_response(
                "Le champ refresh_token est requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
        except (TokenError, InvalidToken):
            return error_response(
                "Token de rafraîchissement invalide ou expiré.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        return success_response({"access_token": access_token})


class LogoutView(APIView):
    """
    POST /auth/logout/
    Auth : JWT
    Body : {"refresh_token": "..."} → blacklisté
    Réponse 204
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return error_response(
                "Le champ refresh_token est requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except (TokenError, InvalidToken):
            # Token déjà blacklisté ou invalide — on considère le logout réussi
            pass

        audit_log(
            user=request.user,
            tenant=getattr(request, "tenant", None),
            action="auth:logout",
            ip_address=get_client_ip(request),
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET  /users/me/  — Retourne le profil de l'utilisateur connecté
    PATCH /users/me/ — Modifie les champs autorisés (phone, first_name, last_name)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return success_response(serializer.data)

    def patch(self, request):
        serializer = UserMeSerializer(
            request.user, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return error_response(
                "Données invalides",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return success_response(serializer.data)


class PermissionsMeView(APIView):
    """
    GET /auth/permissions/me/
    Retourne le rôle et la liste des codenames de permissions de l'utilisateur.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.role:
            return success_response({"role": None, "permissions": []})

        permissions = list(
            user.role.permissions.values_list("codename", flat=True)
        )
        # Ajouter les permissions individuelles (custom_permissions JSON)
        if user.custom_permissions:
            for codename in user.custom_permissions:
                if codename not in permissions:
                    permissions.append(codename)

        return success_response(
            {
                "role": user.role.name,
                "permissions": permissions,
            }
        )


class TeachersListView(APIView):
    """
    GET /auth/teachers/ — Liste des enseignants du tenant courant.
    Retourne id, first_name, last_name, email.
    Permission : authentication:read:teachers (DIRECTOR, STUDENT_STUDIES uniquement).
    """
    def get_permissions(self):
        return [IsAuthenticated(), HasPermission("authentication:read:teachers")]

    def get(self, request):
        teachers = User.objects.filter(
            tenant=request.tenant,
            role__name="TEACHER",
        ).values("id", "first_name", "last_name", "email").order_by("first_name")
        return success_response(list(teachers))


class ChangePasswordView(APIView):
    """
    POST /auth/change-password/ — AUTH-06.

    Permet à un utilisateur connecté de changer son mot de passe.
    Disponible même lorsque must_change_password=True (whitelisté dans
    MustChangePasswordMiddleware).

    Body :
        {"old_password": "...", "new_password": "...", "new_password_confirm": "..."}

    Réponse 200 : {"status": "success", "data": {"message": "Mot de passe modifié avec succès."}}
    Erreurs :
        400 — validation échouée (ancien incorrect, confirm différent, trop court…)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return error_response(
                "Données invalides",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])

        audit_log(
            user=user,
            tenant=getattr(user, "tenant", None),
            action="auth:change-password",
            ip_address=get_client_ip(request),
        )

        return success_response({"message": "Mot de passe modifié avec succès."})


class StaffViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion du personnel de l'établissement — STAFF-MVP-02.

    Endpoints :
    - GET    /auth/staff/          → liste paginée (staff:read)
    - POST   /auth/staff/          → création (staff:create)
    - GET    /auth/staff/{id}/     → détail (staff:read)
    - PATCH  /auth/staff/{id}/     → modification (staff:update)
    - PATCH  /auth/staff/{id}/disable/     → désactivation (staff:disable)
    - PATCH  /auth/staff/{id}/enable/      → réactivation (staff:disable)

    Isolation multi-tenant : filtré sur request.tenant.
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["role__name", "is_active", "staff_profile__statut"]
    search_fields = ["first_name", "last_name", "email"]
    ordering_fields = ["first_name", "last_name", "created_at"]
    ordering = ["first_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return StaffCreateSerializer
        elif self.action in ("partial_update", "update"):
            return StaffUpdateSerializer
        elif self.action == "retrieve":
            return StaffDetailSerializer
        return StaffListSerializer

    def get_permissions(self):
        perms = super().get_permissions()
        if self.action in ("list", "retrieve"):
            perms.append(HasPermission("staff:read"))
        elif self.action == "create":
            perms.append(HasPermission("staff:create"))
        elif self.action in ("partial_update", "update"):
            perms.append(HasPermission("staff:update"))
        elif self.action in ("disable", "enable"):
            perms.append(HasPermission("staff:disable"))
        return perms

    def get_queryset(self):
        return User.objects.filter(
            tenant=self.request.tenant,
        ).exclude(
            role__name__in=["DIRECTOR", "SUPER_ADMIN"],
        ).select_related("role", "staff_profile")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, temp_pass = create_staff_account(
            tenant=request.tenant,
            created_by=request.user,
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            role_name=serializer.validated_data["role"],
            phone=serializer.validated_data.get("phone", ""),
            subjects_taught=serializer.validated_data.get("subjects_taught", []),
            ip_address=get_client_ip(request),
            date_naissance=serializer.validated_data.get("date_naissance"),
            sexe=serializer.validated_data.get("sexe", ""),
            date_embauche=serializer.validated_data.get("date_embauche"),
            type_contrat=serializer.validated_data.get("type_contrat", ""),
            numero_cnss=serializer.validated_data.get("numero_cnss", ""),
            type_compte_paie=serializer.validated_data.get("type_compte_paie", ""),
            numero_compte_paie=serializer.validated_data.get("numero_compte_paie", ""),
        )

        response_data = StaffDetailSerializer(user).data
        response_data["temporary_password"] = temp_pass
        return created_response(response_data)

    def partial_update(self, request, *args, **kwargs):
        """
        STAFF-V2-01 : les champs validés sont routés vers `User` ou vers
        `StaffProfile` selon leur appartenance à `STAFF_PROFILE_FIELDS` —
        `StaffProfile` est un modèle séparé (cf. sa docstring), la boucle
        générique précédente (`setattr` direct sur `instance`) ne peut plus
        s'appliquer telle quelle à tous les champs.
        """
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        user_fields = {}
        profile_fields = {}
        for field, value in serializer.validated_data.items():
            if field in STAFF_PROFILE_FIELDS:
                profile_fields[field] = value
            else:
                user_fields[field] = value

        if user_fields:
            for field, value in user_fields.items():
                setattr(instance, field, value)
            instance.save(update_fields=list(user_fields.keys()))

        if profile_fields:
            profile, _ = StaffProfile.objects.get_or_create(user=instance)
            for field, value in profile_fields.items():
                setattr(profile, field, value)
            profile.save(update_fields=list(profile_fields.keys()))
            # get_queryset() fait un select_related("staff_profile") : la
            # réponse ci-dessous doit refléter le profil mis à jour, pas
            # celui (obsolète) déjà mis en cache sur `instance` par ce join.
            instance.staff_profile = profile

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="staff:update",
            target_model="User",
            target_id=str(instance.id),
            ip_address=get_client_ip(request),
        )

        return success_response(StaffDetailSerializer(instance).data)

    @action(detail=True, methods=["patch"])
    def disable(self, request, pk=None):
        """Désactive un compte (is_active=False)."""
        user = self.get_object()
        if not user.is_active:
            return error_response(
                "Ce compte est déjà désactivé.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="staff:disable",
            target_model="User",
            target_id=str(user.id),
            ip_address=get_client_ip(request),
        )
        return success_response({"id": user.id, "is_active": False})

    @action(detail=True, methods=["patch"])
    def enable(self, request, pk=None):
        """Réactive un compte (is_active=True)."""
        user = self.get_object()
        if user.is_active:
            return error_response(
                "Ce compte est déjà actif.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = True
        user.save(update_fields=["is_active"])

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="staff:enable",
            target_model="User",
            target_id=str(user.id),
            ip_address=get_client_ip(request),
        )
        return success_response({"id": user.id, "is_active": True})
