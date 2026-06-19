"""
apps/superadmin/api/views.py
ViewSets : School (Tenant) + Plan avec actions suspend/reactivate.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils.crypto import get_random_string

from apps.superadmin.models import Tenant, Plan, Campus
from apps.authentication.models import User
from apps.superadmin.api.serializers import (
    TenantSerializer, PlanSerializer, TenantSuspendSerializer,
    SuperadminUserSerializer, SuperadminUserCreateUpdateSerializer,
    CampusSerializer, CampusWriteSerializer,
)
from apps.superadmin.services import tenant_service
from apps.superadmin.services.plan_limits import ensure_campus_limit_available
from apps.authentication.permissions import (
    CanCreateSchool,
    CanViewSchools,
    CanSuspendSchool,
    CanReactivateSchool,
    CanCreatePlan,
    CanViewPlans,
    CanEditPlan,
    CanViewUsers,
    CanEditUser,
    CanCreateUser,
    CanViewCampuses,
    CanCreateCampus,
    CanEditCampus,
    CanDeleteCampus,
)


class SchoolViewSet(viewsets.ModelViewSet):
    """
    CRUD sur les écoles (tenants).
    Réservé aux Super Admins.
    """
    queryset = Tenant.objects.select_related("plan").all()
    serializer_class = TenantSerializer
    filterset_fields = ["status", "type", "plan"]
    search_fields = ["name", "slug", "code_minedu"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [CanCreateSchool()]
        if self.action in ("suspend", "reactivate", "partial_update", "update"):
            perms = {
                "suspend": CanSuspendSchool,
                "reactivate": CanReactivateSchool,
            }
            return [perms.get(self.action, CanViewSchools)()]
        return [CanViewSchools()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = tenant_service.create_tenant(
            name=serializer.validated_data["name"],
            plan_name=serializer.validated_data.get("plan", {}).name
            if serializer.validated_data.get("plan") else "STARTER",
            **{
                k: v for k, v in serializer.validated_data.items()
                if k not in ("name", "plan")
            },
        )
        return Response(
            {"status": "success", "data": TenantSerializer(tenant).data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({"status": "success", "data": self.get_serializer(instance).data})

    @action(detail=True, methods=["patch"], url_path="suspend")
    def suspend(self, request, pk=None):
        tenant = self.get_object()
        if tenant.status == "SUSPENDED":
            return Response(
                {"status": "error", "message": "L'école est déjà suspendue."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = TenantSuspendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tenant_service.suspend_tenant(tenant, reason=ser.validated_data.get("reason", ""))
        return Response({"status": "success", "message": f"École '{tenant.name}' suspendue."})

    @action(detail=True, methods=["patch"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        tenant = self.get_object()
        if tenant.status == "ACTIVE":
            return Response(
                {"status": "error", "message": "L'école est déjà active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tenant_service.reactivate_tenant(tenant)
        return Response({"status": "success", "message": f"École '{tenant.name}' réactivée."})


class PlanViewSet(viewsets.ModelViewSet):
    """CRUD sur les plans d'abonnement."""
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    ordering = ["price_monthly"]

    def get_permissions(self):
        if self.action == "create":
            return [CanCreatePlan()]
        if self.action in ("update", "partial_update", "destroy"):
            return [CanEditPlan()]
        return [CanViewPlans()]

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        return Response({"status": "success", "data": self.get_serializer(self.get_object()).data})


class SuperadminUserViewSet(viewsets.ModelViewSet):
    """Gestion des utilisateurs globaux (hors utilisateurs d'écoles)."""
    serializer_class = SuperadminUserSerializer
    ordering_fields = ["first_name", "last_name", "email", "last_login", "date_joined"]
    ordering = ["last_name", "first_name"]

    def get_permissions(self):
        if self.action == "create":
            return [CanCreateUser()]
        if self.action in ("update", "partial_update", "toggle_active", "reset_password"):
            return [CanEditUser()]
        return [CanViewUsers()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SuperadminUserCreateUpdateSerializer
        return SuperadminUserSerializer

    def get_queryset(self):
        qs = User.objects.select_related("role", "tenant").filter(tenant__isnull=True)

        role = (self.request.query_params.get("role") or "").strip().upper()
        status_filter = (self.request.query_params.get("status") or "").strip().upper()
        search = (self.request.query_params.get("search") or self.request.query_params.get("q") or "").strip()

        if role:
            qs = qs.filter(role__name=role)

        if status_filter == "ACTIVE":
            qs = qs.filter(is_active=True)
        elif status_filter == "SUSPENDED":
            qs = qs.filter(is_active=False)

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        serializer = SuperadminUserCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"status": "success", "data": SuperadminUserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = SuperadminUserCreateUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"status": "success", "data": SuperadminUserSerializer(user).data})

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return Response({"status": "success", "data": self.get_serializer(self.get_object()).data})

    @action(detail=True, methods=["patch"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        serializer = self.get_serializer(user)
        return Response(
            {
                "status": "success",
                "message": "Utilisateur activé." if user.is_active else "Utilisateur suspendu.",
                "data": serializer.data,
            }
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        temporary_password = get_random_string(12)
        user.set_password(temporary_password)
        user.save(update_fields=["password"])
        return Response(
            {
                "status": "success",
                "message": "Mot de passe réinitialisé avec succès.",
                "data": {"temporary_password": temporary_password},
            }
        )


class CampusViewSet(viewsets.ModelViewSet):
    """
    CRUD campus pour une école donnée.
    Routes : /superadmin/schools/{school_pk}/campuses/
             /superadmin/schools/{school_pk}/campuses/{pk}/
    """
    serializer_class = CampusSerializer

    def get_permissions(self):
        if self.action == "create":
            return [CanCreateCampus()]
        if self.action in ("update", "partial_update"):
            return [CanEditCampus()]
        if self.action == "destroy":
            return [CanDeleteCampus()]
        return [CanViewCampuses()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CampusWriteSerializer
        return CampusSerializer

    def _get_tenant(self):
        """Récupère le tenant (school) depuis l'URL (school_pk)."""
        school_pk = self.kwargs.get("school_pk")
        try:
            return Tenant.objects.get(pk=school_pk)
        except Tenant.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("École introuvable.")

    def get_queryset(self):
        tenant = self._get_tenant()
        return Campus.objects.filter(tenant=tenant).order_by("-is_main", "name")

    def perform_create(self, serializer):
        tenant = self._get_tenant()
        ensure_campus_limit_available(tenant)
        serializer.save(tenant=tenant)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = CampusSerializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        campus = self.get_object()
        return Response({"status": "success", "data": CampusSerializer(campus).data})

    def create(self, request, *args, **kwargs):
        serializer = CampusWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        campus = serializer.instance
        return Response(
            {"status": "success", "data": CampusSerializer(campus).data},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        campus = self.get_object()
        serializer = CampusWriteSerializer(campus, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"status": "success", "data": CampusSerializer(serializer.instance).data})
