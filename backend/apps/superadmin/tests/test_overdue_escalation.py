"""
apps/superadmin/tests/test_overdue_escalation.py — SUPERADMIN-V2-04

Tests pour la détection des impayés plateforme (PENDING -> OVERDUE) et
l'escalade des tenants (relances OVERDUE/D7, suspension SOFT/HARD à
D15/D30), ainsi que pour transition_tenant_status (service centralisé
extrait de TenantViewSet.suspend/reactivate).
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from apps.superadmin.models import Plan, PlatformInvoice, Tenant
from apps.superadmin.services.platform_invoice_service import (
    mark_overdue_invoices,
    escalate_overdue_tenants,
)
from apps.superadmin.services.tenant_status_service import transition_tenant_status


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Pro Plan", max_students=1000, max_staff=100,
        price_monthly=Decimal("1500000.00"), is_active=True,
    )


def make_tenant(plan, status=Tenant.Status.ACTIVE, name="École Impayé", slug="ecole-impaye"):
    return Tenant.objects.create(
        name=name, slug=slug, school_type=Tenant.SchoolType.PRIMAIRE, status=status, plan=plan,
        contact_name="Directeur Test", contact_phone="+224620000001",
        contact_email=f"dir-{slug}@ecole.gn",
    )


def make_invoice(tenant, plan, due_date, status=PlatformInvoice.Status.PENDING, number="PINV-2026-000001"):
    return PlatformInvoice.objects.create(
        tenant=tenant, invoice_number=number, amount=plan.price_monthly, plan_name=plan.name,
        period_start=due_date - timedelta(days=15), period_end=due_date + timedelta(days=15),
        issued_date=due_date - timedelta(days=15), due_date=due_date, status=status,
    )


# ─── mark_overdue_invoices ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMarkOverdueInvoices:
    def test_pending_past_due_date_becomes_overdue(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1))

        count = mark_overdue_invoices(today=date(2026, 4, 5))
        assert count == 1
        invoice.refresh_from_db()
        assert invoice.status == PlatformInvoice.Status.OVERDUE

    def test_pending_not_yet_due_untouched(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 10))

        count = mark_overdue_invoices(today=date(2026, 4, 5))
        assert count == 0
        invoice.refresh_from_db()
        assert invoice.status == PlatformInvoice.Status.PENDING

    def test_paid_invoice_never_flagged(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.PAID)

        mark_overdue_invoices(today=date(2026, 4, 10))
        invoice.refresh_from_db()
        assert invoice.status == PlatformInvoice.Status.PAID


# ─── transition_tenant_status ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestTransitionTenantStatus:
    def test_noop_when_already_at_target_status(self, plan):
        """Décision PO : aucune mutation/notification/audit si déjà dans l'état cible."""
        tenant = make_tenant(plan, status=Tenant.Status.SUSPENDED_HARD)
        tenant.settings = {"suspend_reason": "Non-respect des CGU"}
        tenant.save(update_fields=["settings"])

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            result = transition_tenant_status(
                tenant, Tenant.Status.SUSPENDED_HARD,
                reason="Nouvelle raison qui ne devrait jamais s'appliquer",
                action="tenant:auto-suspend-overdue", actor=None,
            )
        assert result is False
        mock_notify.assert_not_called()

        tenant.refresh_from_db()
        assert tenant.settings["suspend_reason"] == "Non-respect des CGU"

    def test_real_transition_sets_reason_and_notifies(self, plan):
        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            result = transition_tenant_status(
                tenant, Tenant.Status.SUSPENDED_SOFT,
                reason="Facture impayée", action="tenant:auto-suspend-overdue", actor=None,
            )
        assert result is True
        mock_notify.assert_called_once_with(
            str(tenant.id), "ACTIVE", Tenant.Status.SUSPENDED_SOFT,
            reason="Facture impayée", action="tenant:auto-suspend-overdue",
        )

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_SOFT
        assert tenant.settings["suspend_reason"] == "Facture impayée"

    def test_reason_none_clears_existing_reason(self, plan):
        tenant = make_tenant(plan, status=Tenant.Status.SUSPENDED_HARD)
        tenant.settings = {"suspend_reason": "Facture impayée"}
        tenant.save(update_fields=["settings"])

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            transition_tenant_status(
                tenant, Tenant.Status.ACTIVE, reason=None, action="tenant:reactivate", actor=None,
            )
        tenant.refresh_from_db()
        assert "suspend_reason" not in tenant.settings

    def test_audit_log_uses_actor_none_for_automatic_transitions(self, plan):
        from apps.monitoring.models import AuditLog

        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            transition_tenant_status(
                tenant, Tenant.Status.SUSPENDED_SOFT, reason="Facture impayée",
                action="tenant:auto-suspend-overdue", actor=None,
            )
        log = AuditLog.objects.filter(action="tenant:auto-suspend-overdue", tenant=tenant).first()
        assert log is not None
        assert log.user_id is None


# ─── escalate_overdue_tenants ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestEscalateOverdueTenants:
    def test_overdue_stage_sends_reminder_no_status_change(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_overdue_invoice_reminder.delay") as mock_reminder:
            actions = escalate_overdue_tenants(today=date(2026, 4, 2))

        assert len(actions) == 1
        assert actions[0]["stage"] == "OVERDUE"
        assert actions[0]["escalated"] is False
        mock_reminder.assert_called_once_with(str(tenant.id), str(invoice.id), "OVERDUE")

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.ACTIVE
        invoice.refresh_from_db()
        assert invoice.last_reminder_stage == "OVERDUE"

    def test_d7_stage_sends_reminder_no_status_change(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_overdue_invoice_reminder.delay") as mock_reminder:
            actions = escalate_overdue_tenants(today=date(2026, 4, 8))

        assert actions[0]["stage"] == "D7"
        mock_reminder.assert_called_once_with(str(tenant.id), str(invoice.id), "D7")
        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.ACTIVE

    def test_d15_stage_escalates_to_suspended_soft(self, plan):
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify, \
             patch("apps.superadmin.tasks.send_overdue_invoice_reminder.delay") as mock_reminder:
            actions = escalate_overdue_tenants(today=date(2026, 4, 16))

        assert actions[0]["stage"] == "D15"
        assert actions[0]["escalated"] is True
        mock_reminder.assert_not_called()  # pas de relance distincte à D15 (décision PO)
        mock_notify.assert_called_once()

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_SOFT
        assert "impayé" in tenant.settings["suspend_reason"]
        assert invoice.invoice_number in tenant.settings["suspend_reason"]
        assert str(invoice.amount) in tenant.settings["suspend_reason"]
        invoice.refresh_from_db()
        assert invoice.last_reminder_stage == "D15"

    def test_d30_stage_escalates_to_suspended_hard(self, plan):
        tenant = make_tenant(plan)
        make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            actions = escalate_overdue_tenants(today=date(2026, 5, 1))

        assert actions[0]["stage"] == "D30"
        assert actions[0]["escalated"] is True
        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_HARD

    def test_no_downgrade_when_already_more_severe_for_unrelated_reason(self, plan):
        """
        Tenant déjà SUSPENDED_HARD pour une raison sans lien avec un impayé
        (ex. CGU) : l'escalade automatique (palier D15 -> cible SOFT, moins
        sévère que HARD) ne doit rien faire de plus, et surtout ne doit pas
        écraser le suspend_reason CGU existant.
        """
        tenant = make_tenant(plan, status=Tenant.Status.SUSPENDED_HARD)
        tenant.settings = {"suspend_reason": "Non-respect des CGU"}
        tenant.save(update_fields=["settings"])
        make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            actions = escalate_overdue_tenants(today=date(2026, 4, 16))  # D15

        assert actions[0]["stage"] == "D15"
        assert actions[0]["escalated"] is False
        mock_notify.assert_not_called()

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_HARD
        assert tenant.settings["suspend_reason"] == "Non-respect des CGU"

    def test_no_duplicate_action_same_stage_reran_same_day(self, plan):
        tenant = make_tenant(plan)
        make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_overdue_invoice_reminder.delay") as mock_reminder:
            first = escalate_overdue_tenants(today=date(2026, 4, 2))
            second = escalate_overdue_tenants(today=date(2026, 4, 2))

        assert len(first) == 1
        assert len(second) == 0
        mock_reminder.assert_called_once()

    def test_oldest_unpaid_invoice_determines_stage(self, plan):
        """Deux factures impayées : le palier suit la plus ancienne (due_date la plus reculée)."""
        tenant = make_tenant(plan)
        old_invoice = make_invoice(
            tenant, plan, due_date=date(2026, 3, 1), status=PlatformInvoice.Status.OVERDUE,
            number="PINV-2026-000001",
        )
        make_invoice(
            tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE,
            number="PINV-2026-000002",
        )

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            actions = escalate_overdue_tenants(today=date(2026, 4, 2))  # 32j de retard sur old_invoice

        assert actions[0]["invoice_id"] == old_invoice.id
        assert actions[0]["stage"] == "D30"

    def test_trial_tenant_with_stale_invoice_never_escalated(self, plan):
        """CANCELLED/TRIAL restent hors périmètre — même avec une facture impayée résiduelle."""
        tenant = make_tenant(plan, status=Tenant.Status.TRIAL)
        make_invoice(tenant, plan, due_date=date(2026, 3, 1), status=PlatformInvoice.Status.OVERDUE)

        actions = escalate_overdue_tenants(today=date(2026, 4, 2))
        assert actions == []

    def test_paying_oldest_invoice_resets_clock_on_next_oldest(self, plan):
        """
        Décision PO : pas de mémoire globale par tenant — payer la facture
        la plus ancienne fait repartir l'horloge sur la nouvelle plus
        ancienne facture impayée, avec son propre due_date.
        """
        tenant = make_tenant(plan)
        old_invoice = make_invoice(
            tenant, plan, due_date=date(2026, 3, 1), status=PlatformInvoice.Status.OVERDUE,
            number="PINV-2026-000001",
        )
        newer_invoice = make_invoice(
            tenant, plan, due_date=date(2026, 4, 20), status=PlatformInvoice.Status.PENDING,
            number="PINV-2026-000002",
        )
        old_invoice.status = PlatformInvoice.Status.PAID
        old_invoice.save(update_fields=["status"])

        with patch("apps.superadmin.tasks.send_overdue_invoice_reminder.delay") as mock_reminder:
            actions = escalate_overdue_tenants(today=date(2026, 4, 21))  # 1j de retard sur newer_invoice

        assert len(actions) == 1
        assert actions[0]["invoice_id"] == newer_invoice.id
        assert actions[0]["stage"] == "OVERDUE"
        mock_reminder.assert_called_once_with(str(tenant.id), str(newer_invoice.id), "OVERDUE")


# ─── Tâches Celery : intégration bout en bout ──────────────────────────────────

@pytest.mark.django_db
class TestFlagOverduePlatformInvoicesTask:
    def test_task_flags_and_escalates_in_sequence(self, plan):
        """
        Appel direct du corps de la tâche (pas .delay) : mark_overdue_invoices
        doit s'exécuter AVANT escalate_overdue_tenants dans la même
        exécution, pour que l'escalade du jour voie déjà la facture
        fraîchement passée OVERDUE.
        """
        from apps.superadmin.tasks import flag_overdue_platform_invoices

        real_today = date.today()
        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=real_today - timedelta(days=20))  # palier D15

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            result = flag_overdue_platform_invoices()

        assert result == {"flagged": 1, "escalation_actions": 1}

        invoice.refresh_from_db()
        assert invoice.status == PlatformInvoice.Status.OVERDUE
        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_SOFT


@pytest.mark.django_db
class TestSendOverdueInvoiceReminderTask:
    def test_sends_email_and_sms(self, plan):
        from apps.superadmin.tasks import send_overdue_invoice_reminder

        tenant = make_tenant(plan)
        invoice = make_invoice(tenant, plan, due_date=date(2026, 4, 1), status=PlatformInvoice.Status.OVERDUE)

        with patch("apps.superadmin.tasks.send_mail") as mock_mail, \
             patch("apps.communication.services.send_sms.delay") as mock_sms:
            send_overdue_invoice_reminder(str(tenant.id), str(invoice.id), "OVERDUE")

        mock_mail.assert_called_once()
        mock_sms.assert_called_once()
        _, kwargs = mock_sms.call_args
        assert kwargs["trigger_type"] == "INVOICE_REMINDER"
        assert kwargs["recipient_phone"] == tenant.contact_phone

    def test_unknown_invoice_logs_and_returns_without_error(self, plan):
        from apps.superadmin.tasks import send_overdue_invoice_reminder

        tenant = make_tenant(plan)
        with patch("apps.superadmin.tasks.send_mail") as mock_mail:
            send_overdue_invoice_reminder(str(tenant.id), "00000000-0000-0000-0000-000000000000", "OVERDUE")
        mock_mail.assert_not_called()


@pytest.mark.django_db
class TestOverdueSuspensionMessageContent:
    """
    Régression demandée par le PO : le message de suspension automatique
    (D15/D30) doit inclure explicitement le motif impayé (montant, numéro de
    facture) dans son corps — PAS le message générique déjà utilisé pour une
    suspension manuelle.
    """

    def test_email_body_includes_invoice_number_and_amount_not_generic_text(self, plan):
        from apps.superadmin.tasks import send_tenant_status_notification

        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        reason = (
            "Suspension automatique pour impayé — facture PINV-2026-000042 "
            "(1500000.00 GNF) en retard de paiement depuis 15 jour(s) "
            "(échéance dépassée le 2026-04-01)."
        )

        with patch("apps.superadmin.tasks.send_mail") as mock_mail, \
             patch("apps.communication.services.send_sms.delay"):
            send_tenant_status_notification(
                str(tenant.id), "ACTIVE", Tenant.Status.SUSPENDED_SOFT,
                reason=reason, action="tenant:auto-suspend-overdue",
            )

        mock_mail.assert_called_once()
        args, _ = mock_mail.call_args
        subject, body = args[0], args[1]

        assert "PINV-2026-000042" in body
        assert "1500000.00 GNF" in body
        assert "impayé" in subject.lower() or "impayé" in body.lower()
        # Pas le sujet générique utilisé pour une suspension manuelle.
        assert subject != "Eduguinée — Statut de votre établissement mis à jour"
        assert "a été mis à jour" not in body

    def test_manual_suspend_still_uses_generic_message(self, plan):
        """Non-régression : une suspension manuelle garde le message générique inchangé."""
        from apps.superadmin.tasks import send_tenant_status_notification

        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)

        with patch("apps.superadmin.tasks.send_mail") as mock_mail, \
             patch("apps.communication.services.send_sms.delay"):
            send_tenant_status_notification(
                str(tenant.id), "ACTIVE", Tenant.Status.SUSPENDED_HARD,
                reason="Non-respect des CGU", action="tenant:suspend",
            )

        mock_mail.assert_called_once()
        args, _ = mock_mail.call_args
        subject, body = args[0], args[1]

        assert subject == "Eduguinée — Statut de votre établissement mis à jour"
        assert "Non-respect des CGU" not in body  # jamais inclus dans le message généré

    def test_sms_body_includes_invoice_reason_for_auto_suspend(self, plan):
        from apps.communication.services import notify_tenant_status

        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        reason = "Suspension automatique pour impayé — facture PINV-2026-000042 (1500000.00 GNF)..."

        with patch("apps.communication.services.send_sms.delay") as mock_sms:
            notify_tenant_status(
                str(tenant.id), Tenant.Status.SUSPENDED_SOFT,
                reason=reason, action="tenant:auto-suspend-overdue",
            )

        mock_sms.assert_called_once()
        _, kwargs = mock_sms.call_args
        assert "PINV-2026-000042" in kwargs["message"]

    def test_sms_manual_suspend_still_generic(self, plan):
        from apps.communication.services import notify_tenant_status

        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        with patch("apps.communication.services.send_sms.delay") as mock_sms:
            notify_tenant_status(
                str(tenant.id), Tenant.Status.SUSPENDED_HARD,
                reason="Non-respect des CGU", action="tenant:suspend",
            )

        mock_sms.assert_called_once()
        _, kwargs = mock_sms.call_args
        assert "Non-respect des CGU" not in kwargs["message"]
