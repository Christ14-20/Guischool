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
- Même règle appliquée symétriquement (correctif trouvé en marge, pas dans
  la décision PO initiale) à un tenant qui sort de l'éligibilité
  (CANCELLED) puis y REVIENT (réactivé) : la prochaine facturation redémarre
  au jour de la réactivation (`Tenant.billing_cycle_start`, repositionné par
  `TenantViewSet.suspend`/`reactivate`), jamais sur le `period_end` d'une
  facture antérieure au passage CANCELLED — sinon la génération suivante
  facturerait rétroactivement la période où le tenant ne payait rien et
  n'utilisait pas le service.
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

    S'il existe déjà une facture ET qu'elle couvre bien le cycle de
    facturation en cours (`period_end >= tenant.billing_cycle_start`), on
    repart de son `period_end` (cycle continu). Sinon, le tenant est soit vu
    pour la première fois en statut éligible, soit y REVIENT après un
    passage par TRIAL/CANCELLED (`billing_cycle_start` repositionné par
    TenantViewSet.suspend/reactivate) : le cycle redémarre à
    `billing_cycle_start` (ou `today` si jamais positionné), jamais sur
    l'ancienne `period_end` — sinon la prochaine facture couvrirait
    rétroactivement une période où le tenant ne payait rien et n'utilisait
    pas le service. Correctif SUPERADMIN-V2-05 trouvé en marge : la première
    version ne traitait que le cas TRIAL -> ACTIVE (jamais de première
    facture rétroactive sur `Tenant.created_at`), pas le cas symétrique
    ACTIVE -> CANCELLED -> réactivé, où une facture existante rendait le
    même bug de facturation rétroactive possible via `period_end`.
    """
    last_invoice = (
        PlatformInvoice.objects.filter(tenant=tenant).order_by("-period_end").first()
    )
    if last_invoice and (
        tenant.billing_cycle_start is None or last_invoice.period_end >= tenant.billing_cycle_start
    ):
        return last_invoice.period_end
    return tenant.billing_cycle_start or today


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


# ─── SUPERADMIN-V2-04 : détection des impayés + escalade ──────────────────────
#
# Paliers d'escalade (jours de retard depuis `due_date`, valeurs assumées en
# l'absence de chiffre contractuel, isolées ici comme PAYMENT_TERM_DAYS) :
#   J+1  -> OVERDUE  : simple relance (email+SMS), pas de changement de statut.
#   J+7  -> D7       : simple relance, pas de changement de statut.
#   J+15 -> D15      : escalade SUSPENDED_SOFT (relance portée par la
#                       notification de changement de statut elle-même —
#                       décision PO, pas de message distinct le même jour).
#   J+30 -> D30      : escalade SUSPENDED_HARD (idem).
#
# Le palier est déterminé par tenant à partir de SA facture impayée la plus
# ancienne (due_date la plus reculée) — pas du nombre de factures ni d'un
# cumul. `PlatformInvoice.last_reminder_stage` vit sur cette facture (pas sur
# Tenant) : si elle est payée, la facture suivante devient l'ancre et repart
# de zéro sur son propre due_date (décision PO explicite, cf. docstring du
# champ) — payer l'arriéré le plus ancien réduit réellement la sévérité.
REMINDER_MILESTONES = [
    (PlatformInvoice.ReminderStage.OVERDUE, 1, None),
    (PlatformInvoice.ReminderStage.D7, 7, None),
    (PlatformInvoice.ReminderStage.D15, 15, Tenant.Status.SUSPENDED_SOFT),
    (PlatformInvoice.ReminderStage.D30, 30, Tenant.Status.SUSPENDED_HARD),
]

STATUS_SEVERITY = {
    Tenant.Status.ACTIVE: 0,
    Tenant.Status.SUSPENDED_SOFT: 1,
    Tenant.Status.SUSPENDED_HARD: 2,
}

UNPAID_STATUSES = [PlatformInvoice.Status.PENDING, PlatformInvoice.Status.OVERDUE]


def mark_overdue_invoices(today: date | None = None) -> int:
    """
    PENDING dont `due_date` est dépassée -> OVERDUE. Appelé quotidiennement,
    avant `escalate_overdue_tenants` (même tâche Celery Beat
    `apps.superadmin.tasks.flag_overdue_platform_invoices`), pour que
    l'escalade du jour voie déjà les factures fraîchement en retard. Même
    pattern que `apps.finance.tasks.flag_overdue_invoices`, un niveau
    au-dessus (facture plateforme, pas facture élève).
    """
    if today is None:
        today = date.today()

    return PlatformInvoice.objects.filter(
        status=PlatformInvoice.Status.PENDING, due_date__lt=today
    ).update(status=PlatformInvoice.Status.OVERDUE)


def _compute_reminder_stage(days_overdue: int):
    """Palier le plus élevé atteint pour ce nombre de jours de retard, ou (None, None)."""
    stage, target_status = None, None
    for code, threshold, status_target in REMINDER_MILESTONES:
        if days_overdue >= threshold:
            stage, target_status = code, status_target
    return stage, target_status


def escalate_overdue_tenants(today: date | None = None) -> list[dict]:
    """
    Pour chaque tenant éligible (ACTIVE/SUSPENDED_SOFT/SUSPENDED_HARD — un
    tenant CANCELLED avec de vieilles factures impayées résiduelles n'est
    jamais réévalué ici) ayant au moins une facture impayée, détermine le
    palier à partir de la facture impayée la plus ancienne et agit une seule
    fois par palier (garde `PlatformInvoice.last_reminder_stage`) :
    - OVERDUE/D7 : relance email+SMS (`apps.superadmin.tasks.
      send_overdue_invoice_reminder`), aucun changement de statut.
    - D15/D30 : escalade via `transition_tenant_status`, mais UNIQUEMENT si
      la sévérité cible dépasse la sévérité actuelle du tenant — jamais de
      downgrade si le tenant est déjà à un palier plus sévère pour une autre
      raison (ex. suspension CGU manuelle déjà en HARD). Si déjà au palier
      cible ou au-delà, aucune action (ni notification ni écrasement du
      `suspend_reason` existant — `transition_tenant_status` est lui-même
      no-op si le statut ne change pas, cf. sa docstring).
    """
    if today is None:
        today = date.today()

    actions = []
    tenant_ids = (
        PlatformInvoice.objects.filter(
            status__in=UNPAID_STATUSES, tenant__status__in=ELIGIBLE_STATUSES
        )
        .values_list("tenant_id", flat=True)
        .distinct()
    )

    for tenant_id in tenant_ids:
        oldest = (
            PlatformInvoice.objects.filter(tenant_id=tenant_id, status__in=UNPAID_STATUSES)
            .select_related("tenant")
            .order_by("due_date")
            .first()
        )
        if oldest is None or oldest.due_date >= today:
            continue

        days_overdue = (today - oldest.due_date).days
        stage, target_status = _compute_reminder_stage(days_overdue)
        if stage is None or stage == oldest.last_reminder_stage:
            continue

        oldest.last_reminder_stage = stage
        oldest.save(update_fields=["last_reminder_stage"])

        tenant = oldest.tenant
        escalated = False
        if target_status is not None:
            if STATUS_SEVERITY[target_status] > STATUS_SEVERITY[tenant.status]:
                from apps.superadmin.services.tenant_status_service import transition_tenant_status

                escalated = transition_tenant_status(
                    tenant,
                    target_status,
                    reason=(
                        f"Suspension automatique — facture {oldest.invoice_number} "
                        f"impayée depuis {days_overdue} jour(s) (échéance dépassée "
                        f"le {oldest.due_date.isoformat()})."
                    ),
                    action="tenant:auto-suspend-overdue",
                    actor=None,
                )
        else:
            from apps.superadmin.tasks import send_overdue_invoice_reminder

            send_overdue_invoice_reminder.delay(str(tenant.id), str(oldest.id), stage)

        actions.append(
            {"tenant_id": tenant.id, "invoice_id": oldest.id, "stage": stage, "escalated": escalated}
        )

    return actions
