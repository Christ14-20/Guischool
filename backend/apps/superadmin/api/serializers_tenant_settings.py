"""apps/superadmin/api/serializers_tenant_settings.py — Configuration avancée tenant (ARCH-03)."""
import json

from rest_framework import serializers

from apps.superadmin.models import Tenant
from apps.superadmin.constants import (
    VALID_EDUCATION_CYCLES,
    VALID_EXAM_TYPES,
    TENANT_MODULE_FLAGS,
)


class TenantSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer de configuration tenant avec validation des modules selon le plan.
    """
    logo_url = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_modules = serializers.SerializerMethodField()
    module_availability = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "slug", "logo", "logo_url",
            "code_minedu", "nif", "registre_commerce",
            "timezone", "date_format", "first_day_week", "default_lang", "default_currency",
            "education_system", "active_levels", "exams_prepared",
            "has_internat", "has_transport", "has_cantine", "has_bibliotheque",
            "has_labo", "has_official_exams", "has_payroll", "has_whatsapp",
            "has_offline_advanced", "has_predictive_analytics",
            "address", "phone", "email",
            "plan_name", "plan_modules", "module_availability",
            "updated_at",
        ]
        read_only_fields = [
            "id", "slug", "logo_url", "plan_name", "plan_modules",
            "module_availability", "updated_at",
        ]
        extra_kwargs = {
            "logo": {"write_only": True, "required": False},
        }

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url

    def get_plan_name(self, obj):
        return obj.plan.name if obj.plan else None

    def get_plan_modules(self, obj):
        if not obj.plan:
            return []
        return list(obj.plan.modules_activated or [])

    def get_module_availability(self, obj):
        plan_modules = set(obj.plan.modules_activated or []) if obj.plan else set()
        availability = {}
        for flag, module_key in TENANT_MODULE_FLAGS.items():
            availability[flag] = {
                "available": module_key in plan_modules,
                "required_plan_module": module_key,
            }
        return availability

    @staticmethod
    def _parse_json_list(value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError("Format JSON invalide.") from exc
        return value

    def validate_active_levels(self, value):
        value = self._parse_json_list(value)
        if not isinstance(value, list):
            raise serializers.ValidationError("Les niveaux actifs doivent être une liste.")
        invalid = [level for level in value if level not in VALID_EDUCATION_CYCLES]
        if invalid:
            raise serializers.ValidationError(
                f"Cycles invalides : {', '.join(invalid)}. "
                f"Valeurs acceptées : {', '.join(sorted(VALID_EDUCATION_CYCLES))}"
            )
        return value

    def validate_exams_prepared(self, value):
        value = self._parse_json_list(value)
        if not isinstance(value, list):
            raise serializers.ValidationError("Les examens préparés doivent être une liste.")
        invalid = [exam for exam in value if exam not in VALID_EXAM_TYPES]
        if invalid:
            raise serializers.ValidationError(
                f"Examens invalides : {', '.join(invalid)}. "
                f"Valeurs acceptées : {', '.join(sorted(VALID_EXAM_TYPES))}"
            )
        return value

    def validate(self, attrs):
        tenant = self.instance
        plan_modules = set(tenant.plan.modules_activated or []) if tenant and tenant.plan else set()

        for flag, module_key in TENANT_MODULE_FLAGS.items():
            if flag not in attrs:
                continue
            if attrs[flag] and module_key not in plan_modules:
                plan_label = tenant.plan.name if tenant and tenant.plan else "aucun plan"
                raise serializers.ValidationError({
                    flag: (
                        f"Le module « {module_key} » n'est pas inclus dans votre plan ({plan_label}). "
                        "Contactez le support pour mettre à niveau votre abonnement."
                    )
                })
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop("logo", None)
        return data
