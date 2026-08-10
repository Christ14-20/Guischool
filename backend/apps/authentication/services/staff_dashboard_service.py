"""
apps/authentication/services/staff_dashboard_service.py — STAFF-V2-05

Agrégation du tableau de bord personnel (effectifs par rôle, ancienneté
moyenne, taux de vacataires).

PAS DE CACHE ICI, même rationale que apps/superadmin/services/dashboard_service.py :
requêtes COUNT bon marché à l'échelle actuelle (un tenant = quelques dizaines
de comptes staff au plus), pas de premier usage de Redis à introduire ici.

2 décisions PO actées (2026-08-01) :
- Périmètre limité aux comptes actifs (`is_active=True`) pour les 3 métriques —
  reflète l'effectif réel actuel, pas un cumul historique incluant des comptes
  désactivés.
- Taux de vacataires basé sur `StaffProfile.statut_emploi` (STAFF-V2-04, statut
  fonction publique/enseignement), PAS `type_contrat` (STAFF-V2-01, typologie
  contractuelle générique) — ce ticket dépend explicitement de STAFF-V2-04.
"""

from django.db.models import Count
from django.utils import timezone

from apps.authentication.models import User, StaffProfile

DAYS_PER_YEAR = 365.25

# Répartition par rôle de base uniquement — limite connue (ROLES-V2-01) :
# un membre du staff sur un rôle CUSTOM n'apparaît dans aucune de ces 3
# clés, et n'est donc pas compté dans total_staff. Regrouper les rôles
# CUSTOM ici (par label ? sous une clé "Autres" ?) est une question produit
# distincte, non traitée par la feature de gestion des rôles elle-même.
BASE_STAFF_ROLE_NAMES = ("TEACHER", "STUDENT_STUDIES", "ACCOUNTANT")


def _average_tenure_years(dates) -> float:
    """
    Ancienneté moyenne en années, sur les seuls comptes ayant un
    `date_embauche` renseigné (champ optionnel depuis STAFF-V2-01) —
    aucune valeur par défaut inventée pour les comptes sans cette donnée.
    """
    dates = list(dates)
    if not dates:
        return 0.0
    today = timezone.localdate()
    total_days = sum((today - d).days for d in dates)
    return round((total_days / len(dates)) / DAYS_PER_YEAR, 1)


def get_staff_dashboard_data(tenant) -> dict:
    """
    Point d'entrée unique de l'agrégation du tableau de bord personnel.

    Même population que `StaffViewSet.get_queryset()` (exclut DIRECTOR/
    SUPER_ADMIN, jamais gérés par ce viewset), restreinte aux comptes actifs.
    """
    staff_qs = User.objects.filter(
        tenant=tenant, is_active=True,
    ).exclude(role__name__in=["DIRECTOR", "SUPER_ADMIN"])

    by_role = dict.fromkeys(BASE_STAFF_ROLE_NAMES, 0)
    rows = staff_qs.values("role__name").annotate(count=Count("id"))
    for row in rows:
        if row["role__name"] in by_role:
            by_role[row["role__name"]] = row["count"]
    total_staff = sum(by_role.values())

    tenure_dates = StaffProfile.objects.filter(
        user__in=staff_qs, date_embauche__isnull=False,
    ).values_list("date_embauche", flat=True)

    vacataire_count = StaffProfile.objects.filter(
        user__in=staff_qs, statut_emploi=StaffProfile.EmploymentStatus.VACATAIRE,
    ).count()

    return {
        "total_staff": total_staff,
        "by_role": by_role,
        "average_tenure_years": _average_tenure_years(tenure_dates),
        "vacataire_rate": round(vacataire_count / total_staff, 4) if total_staff else 0.0,
    }
