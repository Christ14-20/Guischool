"""
apps/superadmin/views.py — TENANT-02 / TENANT-03 / TENANT-04

Vues DRF pour la gestion des Plans et des Tenants par le Super Administrateur.
"""

from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsSuperAdmin
from core.utils import success_response, created_response
from apps.superadmin.models import Plan
from apps.superadmin.serializers import PlanSerializer


class PlanViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet pour la gestion des Plans par le Super Admin.
    Supporte :
    - GET  /superadmin/plans/ (liste paginée)
    - POST /superadmin/plans/ (création)
    """

    queryset = Plan.objects.all().order_by("name")
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)
