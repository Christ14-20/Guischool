"""
apps/superadmin/services/plan_service.py — SUPERADMIN-V2-03

Point de comparaison central « un effectif tient-il dans une limite de
plan ? », utilisé à la fois par TenantViewSet.change_plan (un seul tenant,
plan cible) et PlanViewSet.update (potentiellement plusieurs tenants déjà
rattachés à un plan dont les limites sont réduites) — une seule
implémentation, pas deux qui pourraient diverger.

Distinct de tenant_limits.check_student_limit/check_staff_limit : ceux-ci
répondent à « puis-je ajouter UNE inscription/embauche de plus ? »
(current_count >= limit, bloque la limite+1-ième). Ici la question est
rétroactive — « cet effectif tient-il déjà dans cette limite ? » — donc la
comparaison est current_count > limit : être PILE à la limite est un état
valide (c'est la définition même de la limite), pas une violation.
"""

from apps.superadmin.models import Tenant


def exceeds_limits(student_count: int, staff_count: int, max_students: int, max_staff: int) -> bool:
    return student_count > max_students or staff_count > max_staff


def find_tenants_exceeding_limits(
    plan_id, max_students: int, max_staff: int, exclude_tenant_id=None
) -> list[dict]:
    """
    Parmi les tenants actuellement rattachés à `plan_id`, retourne ceux dont
    l'effectif actuel dépasserait les limites proposées (`max_students`,
    `max_staff`) — à appeler AVANT de sauvegarder une édition de Plan qui
    réduit ces limites.
    """
    tenants = Tenant.objects.filter(plan_id=plan_id)
    if exclude_tenant_id:
        tenants = tenants.exclude(id=exclude_tenant_id)

    affected = []
    for tenant in tenants:
        student_count = tenant.get_student_count()
        staff_count = tenant.get_staff_count()
        if exceeds_limits(student_count, staff_count, max_students, max_staff):
            affected.append(
                {
                    "id": str(tenant.id),
                    "name": tenant.name,
                    "student_count": student_count,
                    "staff_count": staff_count,
                }
            )
    return affected
