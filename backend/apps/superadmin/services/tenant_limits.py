"""
apps/superadmin/services/tenant_limits.py — TENANT-02

Service de contrôle des limites du Plan associé au Tenant.
Contient la logique de validation des limites d'élèves (max_students) et de staff (max_staff).
"""

from rest_framework.exceptions import ValidationError
from apps.superadmin.models import Tenant


def check_student_limit(tenant: Tenant):
    """
    Vérifie si la limite d'élèves du plan est atteinte.
    Lève une ValidationError (HTTP 400) si la limite est atteinte ou dépassée.

    Note : get_student_count() retourne 0 en Épic 2. Le comptage réel
    sera branché en Épic 4.
    """
    limit = tenant.plan.max_students
    current_count = tenant.get_student_count()

    if current_count >= limit:
        raise ValidationError(
            {
                "non_field_errors": [
                    f"Limite d'élèves atteinte ({current_count}/{limit}). "
                    "Veuillez contacter le support pour mettre à jour votre plan."
                ]
            }
        )


def check_staff_limit(tenant: Tenant):
    """
    Vérifie si la limite de personnels (staff) du plan est atteinte.
    Lève une ValidationError (HTTP 400) si la limite est atteinte ou dépassée.
    """
    limit = tenant.plan.max_staff
    current_count = tenant.get_staff_count()

    if current_count >= limit:
        raise ValidationError(
            {
                "non_field_errors": [
                    f"Limite de personnels atteinte ({current_count}/{limit}). "
                    "Veuillez contacter le support pour mettre à jour votre plan."
                ]
            }
        )
