"""
apps/superadmin/services/dashboard_service.py — SUPERADMIN-V2-02

Agrégation des données du tableau de bord plateforme (nb écoles par statut,
MRR estimé, évolution mensuelle des créations, dernières écoles créées).

PAS DE CACHE ICI (décision PO 2026-07-31) : ces requêtes sont des COUNT/SUM
sur une colonne indexée (Tenant.status) plus un regroupement par mois — bon
marché à l'échelle actuelle de la plateforme (stade précoce, pas des
milliers de tenants). Redis est déjà configuré (config/settings/base.py,
CACHES) mais n'est utilisé par aucun code applicatif à ce jour ; ce module
n'introduit pas le premier usage. get_dashboard_data() est volontairement
une fonction pure et isolée : si le volume le justifie un jour, il suffira
de l'envelopper avec cache.get_or_set("superadmin:dashboard", get_dashboard_data,
timeout=...) sans toucher au reste du code. Ne pas ajouter de cache ici
sans nouvelle décision produit (le "pas encore" n'est pas un "jamais").
"""

from datetime import date, datetime
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from apps.superadmin.models import Tenant

RECENT_SCHOOLS_LIMIT = 5
MONTHLY_WINDOW_SIZE = 12


def _month_window(end_date: date, size: int = MONTHLY_WINDOW_SIZE) -> list[tuple[int, int]]:
    """
    Retourne `size` couples (année, mois) en ordre chronologique, se
    terminant par le mois de `end_date` inclus (fenêtre glissante).
    """
    months = []
    year, month = end_date.year, end_date.month
    for _ in range(size):
        months.append((year, month))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


def _get_status_totals() -> dict:
    """
    Décompte des tenants par statut (les 5 valeurs de Tenant.Status) + total.
    Chaque statut est toujours présent dans le résultat, même à 0 — pas de
    clé manquante à gérer côté frontend.
    """
    totals = {choice: 0 for choice in Tenant.Status.values}
    rows = Tenant.objects.values("status").annotate(count=Count("id"))
    for row in rows:
        totals[row["status"]] = row["count"]
    return {"total": sum(totals.values()), **totals}


def _get_mrr_estimated() -> Decimal:
    """
    MRR estimé = Σ Plan.price_monthly des tenants ACTIVE uniquement
    (décision PO 2026-07-31) : TRIAL ne facture rien, SUSPENDED_SOFT/HARD
    sont typiquement en défaut de paiement — ni l'un ni l'autre ne
    représente un revenu récurrent réellement comptable.
    """
    result = Tenant.objects.filter(status=Tenant.Status.ACTIVE).aggregate(
        mrr=Coalesce(Sum("plan__price_monthly"), Decimal("0.00"))
    )
    return result["mrr"]


def _get_monthly_creations() -> list[dict]:
    """
    Évolution des créations d'écoles sur 12 mois glissants (mois courant
    inclus), zero-paddée : chaque mois de la fenêtre apparaît même à 0,
    pour un graphique sans trou silencieux.

    Compte TOUTES les créations, quel que soit le statut actuel du tenant
    (décision PO 2026-07-31) : c'est un historique d'événements de création,
    pas un indicateur de tenants actifs nets — un tenant depuis résilié a
    bien été créé ce mois-là.
    """
    months = _month_window(timezone.localdate())
    window_start_year, window_start_month = months[0]
    window_start = timezone.make_aware(
        datetime(window_start_year, window_start_month, 1)
    )

    rows = (
        Tenant.objects.filter(created_at__gte=window_start)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
    )
    counts_by_month = {row["month"].strftime("%Y-%m"): row["count"] for row in rows}

    return [
        {
            "month": f"{year:04d}-{month:02d}",
            "count": counts_by_month.get(f"{year:04d}-{month:02d}", 0),
        }
        for (year, month) in months
    ]


def get_dashboard_data() -> dict:
    """
    Point d'entrée unique de l'agrégation du tableau de bord Super Admin.
    Retourne des données brutes (querysets/valeurs Python) — la sérialisation
    (ex. TenantListSerializer pour recent_schools) reste à la charge de la
    vue, ce module ne dépend pas de la couche de présentation.
    """
    return {
        "totals": _get_status_totals(),
        "mrr_estimated": _get_mrr_estimated(),
        "monthly_creations": _get_monthly_creations(),
        "recent_schools": list(
            Tenant.objects.select_related("plan").order_by("-created_at")[:RECENT_SCHOOLS_LIMIT]
        ),
    }
