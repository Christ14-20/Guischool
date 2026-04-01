"""apps/monitoring/api/views.py"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.monitoring.models import AuditLog, SystemAlert
from apps.monitoring.api.serializers import AuditLogSerializer, SystemAlertSerializer
from apps.authentication.permissions import CanViewAuditLogs, CanViewSystemAlerts


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [CanViewAuditLogs]
    filterset_fields = ["tenant", "action", "entity_type", "user"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        user = self.request.user
        if user.get_role_name() == "SUPER_ADMIN":
            return AuditLog.objects.all()
        return AuditLog.objects.filter(tenant=user.tenant)


class SystemAlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemAlertSerializer
    permission_classes = [CanViewSystemAlerts]
    filterset_fields = ["type", "level", "is_resolved"]

    def get_queryset(self):
        user = self.request.user
        if user.get_role_name() == "SUPER_ADMIN":
            return SystemAlert.objects.all()
        return SystemAlert.objects.filter(tenant=user.tenant)
