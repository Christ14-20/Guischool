"""
apps/superadmin/api/views.py
ViewSets : School (Tenant) + Plan avec actions suspend/reactivate.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.superadmin.models import Tenant, Plan
from apps.superadmin.api.serializers import (
    TenantSerializer, PlanSerializer, TenantSuspendSerializer
)
from apps.superadmin.services import tenant_service
from apps.authentication.permissions import CanCreateSchool, CanViewSchools, CanSuspendSchool, CanReactivateSchool, CanCreatePlan, CanViewPlans, CanEditPlan


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
