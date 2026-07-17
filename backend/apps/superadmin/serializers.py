"""
apps/superadmin/serializers.py — TENANT-02 / TENANT-03 / TENANT-04

Sérialiseurs pour la gestion des Plans et des Établissements (Schools/Tenants)
par le Super Administrateur.
"""

from rest_framework import serializers
from apps.superadmin.models import Plan, Tenant


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
