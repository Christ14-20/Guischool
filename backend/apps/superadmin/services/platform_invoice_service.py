"""
apps/superadmin/services/platform_invoice_service.py — SUPERADMIN-V2-05

Point d'entrée unique pour la génération des factures d'abonnement SaaS
(école → Eduguinée) — appelé par la tâche Celery Beat quotidienne
(apps.superadmin.tasks.generate_platform_invoices), pas de logique dupliquée
ailleurs. Distinct de apps.finance (factures école → parents).

Ancre de facturation (décision PO 2026-07-31) :
- Seuls les tenants ACTIVE/SUSPENDED_SOFT/SUSPENDED_HARD génèrent des
  factures — TRIAL et CANCELLED jamais (cohérent avec la règle Finance déjà
  actée : "l'encaissement d'arriérés reste possible même en situation
  dégradée", mais pas de facturation pendant l'essai gratuit).
- Le premier cycle de facturation d'un tenant démarre le jour où il est vu
  pour la première fois par cette fonction en statut éligible — PAS
  `Tenant.created_at` littéralement. Un tenant resté plusieurs mois en TRIAL
  avant de passer ACTIVE n'est jamais facturé rétroactivement pour ses mois
  d'essai (décision PO explicite, tranchée après clarification : "départ à
  l'éligibilité", pas de rattrapage sur `created_at`). En pratique, ceci
  retombe naturellement sur `Tenant.created_at` pour un tenant qui serait
  déjà ACTIVE à sa création.
- Chaque facture suivante part de `period_end` de la précédente — l'ancre
  effective est donc la date de première éligibilité, pas le 1er du mois
  civil (évite un pic de génération groupé le 1er de chaque mois, et reste
  cohérente avec la date réelle de souscription).
- Pas de prorata sur le premier mois : la première période facturée est un
  mois plein.
- `dateutil.relativedelta` gère le cas des mois de longueur variable (un
  tenant devenu éligible un 31 janvier n'a pas d'équivalent le 31 février —
  relativedelta cale automatiquement sur le dernier jour valide du mois).

Délai de paiement (`due_date`) : 15 jours après `issued_date`. Valeur
assumée, aucun chiffre contractuel communiqué au moment de ce ticket — à
ajuster si besoin, c'est le seul endroit où ce nombre est en dur.
"""

from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from django.db import transaction

from apps.superadmin.models import PlatformInvoice, PlatformInvoiceSequence, Tenant

ELIGIBLE_STATUSES = [
    Tenant.Status.ACTIVE,
    Tenant.Status.SUSPENDED_SOFT,
    Tenant.Status.SUSPENDED_HARD,
]

PAYMENT_TERM_DAYS = 15


def generate_invoice_number(today: date) -> str:
    """
    Séquence globale par année (PINV-{année}-{seq:06d}), verrouillée comme
    `generate_receipt_for_payment` (apps.finance.serializers) —
    `select_for_update()` à l'intérieur d'une transaction atomique pour
    éviter deux numéros identiques sous génération concurrente.
    """
    with transaction.atomic():
        seq, _ = PlatformInvoiceSequence.objects.select_for_update().get_or_create(
            year=today.year, defaults={"last_seq": 0}
        )
        seq.last_seq += 1
        seq.save(update_fields=["last_seq"])
        return f"PINV-{today.year}-{seq.last_seq:06d}"


def get_next_billing_date(tenant: Tenant, today: date) -> date:
    """
    Date de départ de la prochaine période à facturer pour ce tenant.

    S'il existe déjà une facture, on repart de son `period_end` (cycle
    continu). Sinon, le tenant est vu pour la première fois en statut
    éligible : le premier cycle démarre aujourd'hui (pas de rattrapage sur
    `Tenant.created_at` si le tenant est resté en TRIAL avant de devenir
    éligible — cf. docstring du module).
    """
    last_invoice = (
        PlatformInvoice.objects.filter(tenant=tenant).order_by("-period_end").first()
    )
    if last_invoice:
        return last_invoice.period_end
    return today


def generate_due_invoices(today: date | None = None) -> list[PlatformInvoice]:
    """
    Point d'entrée appelé quotidiennement par la tâche Celery Beat
    (apps.superadmin.tasks.generate_platform_invoices).

    Pour chaque tenant éligible dont la prochaine période est déjà entamée
    (`today >= next_due`), émet UNE facture (période pleine, pas de
    rattrapage multi-mois en une seule exécution — si la tâche a manqué
    plusieurs jours, elle se remet à niveau progressivement, un cycle par
    exécution, plutôt que de produire d'un coup plusieurs factures
    rétroactives pour un même tenant).
    """
    if today is None:
        today = date.today()

    created = []
    for tenant in Tenant.objects.filter(status__in=ELIGIBLE_STATUSES).select_related("plan"):
        next_due = get_next_billing_date(tenant, today)
        if today < next_due:
            continue

        period_end = next_due + relativedelta(months=1)
        invoice = PlatformInvoice.objects.create(
            tenant=tenant,
            invoice_number=generate_invoice_number(today),
            amount=tenant.plan.price_monthly,
            plan_name=tenant.plan.name,
            period_start=next_due,
            period_end=period_end,
            issued_date=today,
            due_date=today + timedelta(days=PAYMENT_TERM_DAYS),
            status=PlatformInvoice.Status.PENDING,
        )
        created.append(invoice)

    return created
