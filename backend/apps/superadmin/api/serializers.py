"""
apps/superadmin/api/serializers.py
Serializers : Plan, Tenant (création + list + detail), Subscription.
"""
from rest_framework import serializers
from apps.superadmin.models import Plan, Tenant, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id", "name", "max_students", "max_staff",
            "modules_activated", "storage_max_gb",
            "price_monthly", "price_annual", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class TenantSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "slug", "code_minedu", "type", "status",
            "plan", "plan_name", "address", "phone", "email",
            "settings", "users_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "plan_name", "users_count"]

    def get_plan_name(self, obj):
        return str(obj.plan) if obj.plan else None

    def get_users_count(self, obj):
        return obj.users.count()


class TenantSuspendSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class SubscriptionSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "tenant", "tenant_name", "plan", "plan_name",
            "start_date", "end_date", "status", "last_payment_date", "created_at",
        ]
        read_only_fields = ["id", "created_at", "tenant_name", "plan_name"]
