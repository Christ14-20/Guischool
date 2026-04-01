"""apps/monitoring/api/serializers.py"""
from rest_framework import serializers
from apps.monitoring.models import AuditLog, SystemAlert


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "tenant", "user", "user_email", "action", "entity_type", "entity_id", "old_value", "new_value", "ip_address", "timestamp"]
        read_only_fields = ["id", "timestamp", "user_email"]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class SystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ["id", "tenant", "type", "level", "message", "timestamp", "is_resolved"]
        read_only_fields = ["id", "timestamp"]
