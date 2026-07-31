"""
apps/superadmin/serializers.py — TENANT-02 / TENANT-03 / TENANT-04

Sérialiseurs pour la gestion des Plans et des Établissements (Schools/Tenants)
par le Super Administrateur.
"""

from rest_framework import serializers
from apps.superadmin.models import Plan, PlatformInvoice, Tenant


class PlanSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Plan (§1.2 / §2.6 du contrat d'API).
    """

    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "max_students",
            "max_staff",
            "price_monthly",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_price_monthly(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Le prix mensuel ne peut pas être négatif."
            )
        return value


class TenantPlanNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "name"]


class TenantPlanDetailNestedSerializer(serializers.ModelSerializer):
    """
    Variante de TenantPlanNestedSerializer pour TenantDetailSerializer
    uniquement — SUPERADMIN-V2-03, correctif trouvé en marge du ticket (pas
    une régression introduite par lui) : la page de détail école affiche
    déjà `school.plan.price_monthly`/`max_students`/`max_staff` (tarif,
    limites, barres "Utilisation actuelle"), mais TenantPlanNestedSerializer
    ne renvoyait que `id`/`name`, donnant "NaN GNF" et des limites vides à
    l'affichage. Distincte de TenantPlanNestedSerializer (utilisée par
    TenantListSerializer / GET /superadmin/schools/) pour ne pas élargir le
    contrat déjà documenté de la liste, qui n'a besoin que de `id`/`name`.
    """

    class Meta:
        model = Plan
        fields = ["id", "name", "price_monthly", "max_students", "max_staff"]


class TenantCreateSerializer(serializers.Serializer):
    """
    Serializer pour la requête POST de création d'école (§2.1 du contrat d'API).
    """

    name = serializers.CharField(max_length=150)
    school_type = serializers.ChoiceField(choices=Tenant.SchoolType.choices)
    code_minedu = serializers.CharField(max_length=50, required=False, allow_null=True)
    contact_name = serializers.CharField(max_length=150)
    contact_phone = serializers.CharField(max_length=20)
    contact_email = serializers.EmailField()
    region = serializers.CharField(max_length=100, required=False, default="")
    prefecture = serializers.CharField(max_length=100, required=False, default="")
    commune = serializers.CharField(max_length=100, required=False, default="")
    quartier = serializers.CharField(max_length=150, required=False, default="")
    plan_id = serializers.UUIDField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    logo = serializers.URLField(required=False, default="", allow_blank=True)

    def validate_contact_phone(self, value):
        from core.utils import is_valid_guinea_phone
        if not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Le format du téléphone doit être +224XXXXXXXXX (9 chiffres après l'indicatif).")
        return value


class TenantListSerializer(serializers.ModelSerializer):
    """
    Serializer pour la liste des écoles (§2.2 du contrat d'API).
    """

    plan = TenantPlanNestedSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "status",
            "plan",
            "student_count",
            "created_at",
        ]

    def get_student_count(self, obj) -> int:
        return obj.get_student_count()


class TenantDetailSerializer(serializers.ModelSerializer):
    """
    Serializer pour le détail complet d'une école (§2.3 du contrat d'API).
    """

    plan = TenantPlanDetailNestedSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "code_minedu",
            "school_type",
            "status",
            "plan",
            "contact_name",
            "contact_phone",
            "contact_email",
            "region",
            "prefecture",
            "commune",
            "quartier",
            "latitude",
            "longitude",
            "logo",
            "settings",
            "trial_ends_at",
            "student_count",
            "staff_count",
            "created_at",
            "updated_at",
        ]

    def get_student_count(self, obj) -> int:
        return obj.get_student_count()

    def get_staff_count(self, obj) -> int:
        return obj.get_staff_count()


class PlatformInvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer pour PlatformInvoice (SUPERADMIN-V2-05) — lecture seule,
    aucun champ n'est censé être modifiable via l'API directement (mutation
    exclusive via l'action nommée `mark-paid`, jamais via un PATCH générique
    — même principe que TenantViewSet depuis SUPERADMIN-V2-03).
    """

    class Meta:
        model = PlatformInvoice
        fields = [
            "id",
            "invoice_number",
            "amount",
            "plan_name",
            "period_start",
            "period_end",
            "issued_date",
            "due_date",
            "paid_date",
            "status",
        ]
        read_only_fields = fields

