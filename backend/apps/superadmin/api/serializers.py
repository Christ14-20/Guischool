"""
apps/superadmin/api/serializers.py
Serializers : Plan, Tenant (création + list + detail), Subscription, Campus.
"""
from rest_framework import serializers
from apps.superadmin.models import Plan, Tenant, Subscription, Campus
from apps.authentication.models import User, Role


class PlanSerializer(serializers.ModelSerializer):
    billing_preview = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id", "name", "plan_type", "max_campuses", "max_students", "max_staff",
            "modules_activated", "modules_included", "storage_max_gb",
            "price_monthly", "price_annual", "price_per_student",
            "billing_preview", "created_at",
        ]
        read_only_fields = ["id", "billing_preview", "created_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        plan_type = attrs.get("plan_type", getattr(self.instance, "plan_type", "standard"))
        price_per_student = attrs.get(
            "price_per_student",
            getattr(self.instance, "price_per_student", 0),
        )
        if plan_type == "network" and price_per_student < 0:
            raise serializers.ValidationError({
                "price_per_student": "Le prix par élève ne peut pas être négatif.",
            })
        return attrs

    def get_billing_preview(self, obj):
        return {
            "billing_model": "per_student" if obj.plan_type == "network" else "flat",
            "base_monthly": obj.price_monthly,
            "price_per_student": obj.price_per_student,
        }


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


class SuperadminUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "status",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields

    def get_role(self, obj):
        return obj.get_role_name() or ""

    def get_status(self, obj):
        return "ACTIVE" if obj.is_active else "SUSPENDED"


class SuperadminUserCreateUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Role.ROLE_CHOICES, required=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "role", "password"]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Le mot de passe est requis à la création."})
        return attrs

    def create(self, validated_data):
        role_name = validated_data.pop("role")
        password = validated_data.pop("password")
        role = Role.objects.get(name=role_name)
        user = User(tenant=None, role=role, **validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        role_name = validated_data.pop("role", None)
        if role_name:
            role = Role.objects.get(name=role_name)
            instance.role = role
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ── Campus Serializers ────────────────────────────────────────────────────

class CampusSerializer(serializers.ModelSerializer):
    """Serializer complet pour lecture (list + detail)."""
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    classes_count = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = Campus
        fields = [
            "id", "tenant", "tenant_name", "name", "address", "city", "prefecture",
            "latitude", "longitude", "active_levels", "phone", "email",
            "is_main", "is_active", "classes_count", "students_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "tenant_name", "classes_count", "students_count", "created_at", "updated_at"]

    def get_classes_count(self, obj):
        return obj.classes.count()

    def get_students_count(self, obj):
        return obj.students.count()


class CampusWriteSerializer(serializers.ModelSerializer):
    """Serializer pour création et mise à jour d'un campus."""

    class Meta:
        model = Campus
        fields = [
            "name", "address", "city", "prefecture",
            "latitude", "longitude", "active_levels",
            "phone", "email", "is_main", "is_active",
        ]

    def validate_active_levels(self, value):
        """Vérifier que les cycles sont valides."""
        valid_cycles = {"MATERNELLE", "PRIMAIRE", "CQP", "COLLEGE", "LYCEE_GEN",
                        "LYCEE_TECH", "ETFP_A", "ETFP_B", "SUPERIEUR"}
        for level in value:
            if level not in valid_cycles:
                raise serializers.ValidationError(
                    f"Cycle invalide : '{level}'. Valeurs acceptables : {', '.join(sorted(valid_cycles))}"
                )
        return value
