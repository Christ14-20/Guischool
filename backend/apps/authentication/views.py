"""
apps/authentication/views.py — AUTH-02

Endpoints JWT : login, refresh, logout, /users/me/, /auth/permissions/me/.

Rate-limiting sur /auth/login/ via django-ratelimit (protection anti-brute-force).
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

from core.permissions import HasPermission
from core.utils import success_response, error_response
from apps.monitoring.services import audit_log, get_client_ip

from .serializers import CustomTokenObtainPairSerializer, UserMeSerializer


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
    permission_classes = [IsAuthenticated, HasPermission("authentication:read:teachers")]

    def get(self, request):
        from apps.authentication.models import User
        teachers = User.objects.filter(
            tenant=request.tenant,
            role__name="TEACHER",
        ).values("id", "first_name", "last_name", "email").order_by("first_name")
        return success_response(list(teachers))
