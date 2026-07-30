"""
apps/communication/tests/test_tenant_status_notification.py — SUPERADMIN-V2-01

Tests du déclencheur SMS "changement de statut d'établissement"
(notify_tenant_status) : suspension soft/hard et réactivation.
"""

import pytest

from apps.superadmin.models import Tenant, Plan
from apps.communication.models import SMSLog

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _celery_eager(settings):
    """Exécute les tâches Celery .delay() en synchrone."""
    settings.CELERY_TASK_ALWAYS_EAGER = True


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Notif Test")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Notif",
        slug="ecole-notif",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Notif",
        contact_phone="+224655998877",
        contact_email="dir@ecole-notif.gn",
    )


class TestNotifyTenantStatus:
    def test_soft_suspension_creates_sms_log(self, tenant):
        from apps.communication.services import notify_tenant_status

        notify_tenant_status(str(tenant.id), Tenant.Status.SUSPENDED_SOFT)

        logs = SMSLog.objects.filter(
            recipient_phone="+224655998877", trigger_type="TENANT_STATUS"
        )
        assert logs.count() == 1
        assert "lecture seule" in logs.first().content

    def test_hard_suspension_creates_sms_log(self, tenant):
        from apps.communication.services import notify_tenant_status

        notify_tenant_status(str(tenant.id), Tenant.Status.SUSPENDED_HARD)

        logs = SMSLog.objects.filter(
            recipient_phone="+224655998877", trigger_type="TENANT_STATUS"
        )
        assert logs.count() == 1
        assert "entierement suspendu" in logs.first().content

    def test_reactivation_creates_sms_log(self, tenant):
        from apps.communication.services import notify_tenant_status

        notify_tenant_status(str(tenant.id), Tenant.Status.ACTIVE)

        logs = SMSLog.objects.filter(
            recipient_phone="+224655998877", trigger_type="TENANT_STATUS"
        )
        assert logs.count() == 1
        assert "operationnel" in logs.first().content

    def test_no_contact_phone_skips_sms(self, plan):
        tenant_no_phone = Tenant.objects.create(
            name="École Sans Tel",
            slug="ecole-sans-tel",
            school_type=Tenant.SchoolType.MIXTE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur Sans Tel",
            contact_phone="",
            contact_email="dir@ecole-sans-tel.gn",
        )
        from apps.communication.services import notify_tenant_status

        notify_tenant_status(str(tenant_no_phone.id), Tenant.Status.SUSPENDED_HARD)

        assert not SMSLog.objects.filter(trigger_type="TENANT_STATUS").exists()

    def test_unmapped_status_skips_sms(self, tenant):
        from apps.communication.services import notify_tenant_status

        notify_tenant_status(str(tenant.id), Tenant.Status.CANCELLED)

        assert not SMSLog.objects.filter(trigger_type="TENANT_STATUS").exists()

    def test_suspend_task_sends_both_email_and_sms(self, tenant, mailoutbox):
        """
        Vérifie que send_tenant_status_notification (TENANT-04) envoie bien
        l'email ET le SMS — jusqu'ici cette tâche n'envoyait qu'un email.
        """
        from apps.superadmin.tasks import send_tenant_status_notification

        send_tenant_status_notification(
            str(tenant.id), Tenant.Status.ACTIVE, Tenant.Status.SUSPENDED_SOFT
        )

        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["dir@ecole-notif.gn"]

        logs = SMSLog.objects.filter(trigger_type="TENANT_STATUS")
        assert logs.count() == 1
