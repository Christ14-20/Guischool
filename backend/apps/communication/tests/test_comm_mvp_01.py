"""
apps/communication/tests/test_comm_mvp_01.py — COMM-MVP-01

Tests pour le socle technique SMS :
- Provider Africa's Talking (mode mock)
- Tâche Celery send_sms (throttling, retry)
- Webhook de livraison AT (signature, mise à jour SMSLog)
- Isolation multi-tenant sur SMSLog
- Permission communication:send
"""

import json
import hashlib
import hmac
import requests
from unittest.mock import patch, MagicMock

import pytest
from django.urls import reverse
from django.test.utils import override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, Student, Guardian

from core.retry import ProviderNetworkError, retry_with_backoff

from apps.communication.providers.africastalking import AfricaSMSProvider
from apps.communication.models import SMSLog


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan SMS")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École SMS", slug="ecole-sms",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Test", contact_phone="+224620000001",
        contact_email="test@ecole.gn",
    )


@pytest.fixture
def tenant2(plan):
    return Tenant.objects.create(
        name="Autre École SMS", slug="autre-ecole-sms",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Autre", contact_phone="+224620000002",
        contact_email="autre@ecole.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date="2025-10-01", end_date="2026-07-31",
        status="OPEN", is_current=True,
    )


@pytest.fixture
def student(tenant, school_year):
    return Student.objects.create(
        tenant=tenant, matricule="2025-00001", nom="Diallo", prenom="Alpha",
        date_naissance="2010-05-15", sexe="M", statut="ACTIF",
        annee_inscription=school_year,
    )


@pytest.fixture
def guardian(tenant, student):
    return Guardian.objects.create(
        tenant=tenant, student=student, lien="PERE",
        nom_complet="Moussa Diallo", telephone="+224655112233",
    )


# ─── Test AfricaSMSProvider (mock) ─────────────────────────────────────────────

class TestAfricaSMSProviderMock:

    def test_send_returns_sent(self):
        provider = AfricaSMSProvider()
        result = provider.send("+224655112233", "Test message")
        assert result["status"] == "SENT"
        assert result["provider_message_id"].startswith("AT-")

    def test_verify_webhook_valid_signature(self):
        provider = AfricaSMSProvider()
        body = json.dumps({"id": "txn-001", "status": "Success", "messageId": "AT-001"}).encode("utf-8")
        sig = hmac.new(
            b"mock-webhook-secret", body, hashlib.sha256,
        ).hexdigest()
        assert provider.verify_webhook(body, sig) is True

    def test_verify_webhook_invalid_signature(self):
        provider = AfricaSMSProvider()
        body = json.dumps({"id": "txn-001", "status": "Success"}).encode("utf-8")
        assert provider.verify_webhook(body, "bad-sig") is False

    def test_verify_webhook_tampered_payload(self):
        provider = AfricaSMSProvider()
        body = json.dumps({"id": "txn-001", "status": "Success", "messageId": "AT-001"}).encode("utf-8")
        sig = hmac.new(
            b"mock-webhook-secret", body, hashlib.sha256,
        ).hexdigest()
        tampered = json.dumps({"id": "txn-001", "status": "Failed", "messageId": "AT-001"}).encode("utf-8")
        assert provider.verify_webhook(tampered, sig) is False


# ─── Test AfricaSMSProvider (real mode) ────────────────────────────────────────

class TestAfricaSMSProviderReal:

    @override_settings(AFRICASTALKING_MOCK=False)
    def test_send_raises_on_network_error(self):
        provider = AfricaSMSProvider()
        with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Connection refused")):
            with pytest.raises(ProviderNetworkError):
                provider.send("+224655112233", "Test")

    @override_settings(AFRICASTALKING_MOCK=False)
    def test_send_parses_response(self):
        provider = AfricaSMSProvider()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "SMSMessageData": {
                "Recipients": [{"messageId": "AT-REAL-001", "status": "Success"}],
            },
        }
        with patch("requests.post", return_value=mock_resp):
            result = provider.send("+224655112233", "Test")
        assert result["provider_message_id"] == "AT-REAL-001"
        assert result["status"] == "SENT"


# ─── Tests SMSLog model ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSMSLogModel:

    def test_create_sms_log(self, tenant):
        log = SMSLog.objects.create(
            tenant=tenant,
            recipient_phone="+224655112233",
            content="Test SMS",
            trigger_type="ABSENCE",
            status="SENT",
        )
        assert log.id is not None
        assert str(log).startswith("[Notification d'absence]")

    def test_isolation_multi_tenant(self, tenant, tenant2):
        SMSLog.objects.create(
            tenant=tenant, recipient_phone="+224655112233",
            content="Test", trigger_type="ABSENCE",
        )
        SMSLog.objects.create(
            tenant=tenant2, recipient_phone="+224655112233",
            content="Test2", trigger_type="PAIEMENT",
        )
        assert SMSLog.objects.filter(tenant=tenant).count() == 1
        assert SMSLog.objects.filter(tenant=tenant2).count() == 1
        assert SMSLog.objects.count() == 2


# ─── Tests send_sms task ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSendSMSTask:

    def test_task_creates_sms_log(self, tenant, guardian):
        from apps.communication.tasks import send_sms

        result = send_sms(
            recipient_phone="+224655112233",
            message="Test message",
            trigger_type="ABSENCE",
            guardian_id=str(guardian.id),
            tenant_id=str(tenant.id),
        )
        assert result["status"] == "SENT"
        assert SMSLog.objects.count() == 1
        log = SMSLog.objects.first()
        assert log.recipient_phone == "+224655112233"
        assert log.trigger_type == "ABSENCE"
        assert log.guardian_id == guardian.id

    def test_throttling_blocks_4th_sms(self, tenant):
        from apps.communication.tasks import send_sms

        # Create 3 SENT logs for today
        for i in range(3):
            SMSLog.objects.create(
                tenant=tenant,
                recipient_phone="+224655112233",
                content=f"SMS {i}",
                trigger_type="ABSENCE",
                status="SENT",
            )

        result = send_sms(
            recipient_phone="+224655112233",
            message="4th SMS",
            trigger_type="ABSENCE",
            tenant_id=str(tenant.id),
        )
        assert result["status"] == "SKIPPED"
        assert result["reason"] == "daily_limit_reached"

    def test_throttling_resets_next_day(self, tenant):
        from apps.communication.tasks import send_sms

        # Create 3 SENT logs for yesterday
        yesterday = timezone.now() - timedelta(days=1)
        for i in range(3):
            SMSLog.objects.create(
                tenant=tenant,
                recipient_phone="+224655112233",
                content=f"SMS {i}",
                trigger_type="ABSENCE",
                status="SENT",
                sent_at=yesterday,
            )

        result = send_sms(
            recipient_phone="+224655112233",
            message="Today SMS",
            trigger_type="ABSENCE",
            tenant_id=str(tenant.id),
        )
        assert result["status"] == "SENT"

    def test_retry_on_provider_network_error(self, tenant):
        from apps.communication.tasks import send_sms

        with patch.object(AfricaSMSProvider, "send", side_effect=ProviderNetworkError("Timeout")):
            result = send_sms(
                recipient_phone="+224655112233",
                message="Retry test",
                trigger_type="ABSENCE",
                tenant_id=str(tenant.id),
            )

        assert result["status"] == "FAILED"
        assert "Timeout" in result.get("failure_reason", "")
        # Exactly one FAILED log, no duplication
        assert SMSLog.objects.filter(status="FAILED").count() == 1

    def test_retry_creates_only_one_failed_log(self, tenant):
        """Vérifie qu'un échec définitif ne produit qu'une seule entrée FAILED."""
        from apps.communication.tasks import send_sms

        # Provider échoue systématiquement
        with patch.object(AfricaSMSProvider, "send", side_effect=ProviderNetworkError("Network down")):
            send_sms(
                recipient_phone="+224655112233",
                message="Dedup test",
                trigger_type="PAIEMENT",
                tenant_id=str(tenant.id),
            )

        # Un seul FAILED, pas un par tentative de retry
        logs = SMSLog.objects.filter(status="FAILED")
        assert logs.count() == 1
        assert logs[0].failure_reason == "Network down"
        assert logs[0].trigger_type == "PAIEMENT"


# ─── Tests webhook de livraison ────────────────────────────────────────────────

@pytest.mark.django_db
class TestATDeliveryWebhook:

    def test_delivery_webhook_updates_status(self, tenant):
        log = SMSLog.objects.create(
            tenant=tenant,
            recipient_phone="+224655112233",
            content="Test",
            trigger_type="ABSENCE",
            status="SENT",
            provider_message_id="AT-DEL-001",
        )

        client = APIClient()
        body = json.dumps({"id": "cb-001", "status": "Success", "messageId": "AT-DEL-001", "phoneNumber": "+224655112233"})
        sig = hmac.new(b"mock-webhook-secret", body.encode("utf-8"), hashlib.sha256).hexdigest()

        response = client.post(
            "/webhooks/africastalking/delivery/",
            data=body,
            content_type="application/json",
            HTTP_X_AFRICASTALKING_SIGNATURE=sig,
        )
        assert response.status_code == 200

        log.refresh_from_db()
        assert log.status == "DELIVERED"

    def test_delivery_webhook_failed_status(self, tenant):
        log = SMSLog.objects.create(
            tenant=tenant,
            recipient_phone="+224655112233",
            content="Test",
            trigger_type="PAIEMENT",
            status="SENT",
            provider_message_id="AT-DEL-002",
        )

        client = APIClient()
        body = json.dumps({"id": "cb-002", "status": "Failed", "messageId": "AT-DEL-002", "phoneNumber": "+224655112233"})
        sig = hmac.new(b"mock-webhook-secret", body.encode("utf-8"), hashlib.sha256).hexdigest()

        response = client.post(
            "/webhooks/africastalking/delivery/",
            data=body,
            content_type="application/json",
            HTTP_X_AFRICASTALKING_SIGNATURE=sig,
        )
        assert response.status_code == 200

        log.refresh_from_db()
        assert log.status == "FAILED"
        assert "Failed" in log.failure_reason

    def test_delivery_webhook_invalid_signature_returns_401(self, tenant):
        client = APIClient()
        body = json.dumps({"id": "cb-003", "status": "Success", "messageId": "AT-DEL-003"})
        response = client.post(
            "/webhooks/africastalking/delivery/",
            data=body,
            content_type="application/json",
            HTTP_X_AFRICASTALKING_SIGNATURE="bad-signature",
        )
        assert response.status_code == 401

    def test_delivery_webhook_unknown_message_id_returns_200(self, tenant):
        client = APIClient()
        body = json.dumps({"id": "cb-004", "status": "Success", "messageId": "AT-UNKNOWN"})
        sig = hmac.new(b"mock-webhook-secret", body.encode("utf-8"), hashlib.sha256).hexdigest()

        response = client.post(
            "/webhooks/africastalking/delivery/",
            data=body,
            content_type="application/json",
            HTTP_X_AFRICASTALKING_SIGNATURE=sig,
        )
        assert response.status_code == 200


# ─── Tests permission communication:send ───────────────────────────────────────

@pytest.mark.django_db
class TestCommunicationPermission:

    def test_permission_exists(self):
        perm = Permission.objects.filter(codename="communication:send").first()
        assert perm is not None
        assert perm.module == "communication"


# ─── Tests retry_with_backoff (core) ──────────────────────────────────────────

class TestCoreRetry:

    def test_retry_success_first_attempt(self):
        fn = MagicMock(return_value="ok")
        result = retry_with_backoff(fn, max_attempts=3)
        assert result == "ok"
        assert fn.call_count == 1

    def test_retry_succeeds_on_second_attempt(self):
        fn = MagicMock(side_effect=[ProviderNetworkError("fail1"), "ok"])
        result = retry_with_backoff(fn, max_attempts=3)
        assert result == "ok"
        assert fn.call_count == 2

    def test_retry_exhausted_raises(self):
        fn = MagicMock(side_effect=ProviderNetworkError("always fails"))
        with pytest.raises(ProviderNetworkError):
            retry_with_backoff(fn, max_attempts=3)
        assert fn.call_count == 3

    def test_retry_non_network_error_raises_immediately(self):
        fn = MagicMock(side_effect=ValueError("not a network error"))
        with pytest.raises(ValueError):
            retry_with_backoff(fn, max_attempts=3)
        assert fn.call_count == 1
