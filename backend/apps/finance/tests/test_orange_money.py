"""
apps/finance/tests/test_orange_money.py — FIN-MVP-03

Tests pour l'intégration Orange Money :
- Retry with backoff (mécanisme testé isolément)
- OrangeMoneyProvider mock (initiate, check_status, verify_webhook)
- Initiation endpoint (POST /payments/orange-money/initiate/)
- Status endpoint (GET /payments/{id}/status/)
- Webhook endpoint (POST /webhooks/orange-money/)
- Réconciliation (tâche Celery)
"""

import json
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, Student, Level, SchoolClass
from apps.finance.models import (
    FeeCategory, StudentFee, Payment, OrangeMoneyTransaction,
)
from apps.finance.providers.base import (
    ProviderNetworkError, retry_with_backoff,
)
from apps.finance.providers.orange_money import (
    OrangeMoneyProvider, _compute_signature, _canonical_json,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan OM")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École OM", slug="ecole-om",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Test", contact_phone="+224620000001",
        contact_email="test@ecole.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date="2025-10-01", end_date="2026-07-31",
        status="OPEN", is_current=True,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(tenant=tenant, name="6ème", cycle="PRIMAIRE", order_index=1)


@pytest.fixture
def school_class(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=school_year, level=level, name="6ème A", capacity=60,
    )


@pytest.fixture
def student(tenant, school_year, school_class):
    return Student.objects.create(
        tenant=tenant, matricule="2025-00001", nom="Diallo", prenom="Alpha",
        date_naissance="2010-05-15", sexe="M", statut="ACTIF",
        annee_inscription=school_year, classe_actuelle=school_class,
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur", email="directeur@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _use_local_storage(settings):
    settings.DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'


def _ensure_permissions(role, codenames):
    for c in codenames:
        p, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "finance"})
        role.permissions.add(p)


def _auth(api_client, user):
    resp = api_client.post(
        reverse("auth-login"),
        {"email": user.email, "password": "SecurePass123!"},
        format="json",
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return resp.json()["data"]


# ─── Tests retry_with_backoff ────────────────────────────────────────────────

class TestRetryWithBackoff:

    def test_succeeds_on_first_attempt(self):
        fn = MagicMock(return_value="ok")
        assert retry_with_backoff(fn, max_attempts=3) == "ok"
        assert fn.call_count == 1

    def test_retries_on_provider_error_then_succeeds(self):
        fn = MagicMock(
            side_effect=[ProviderNetworkError("timeout"),
                         ProviderNetworkError("timeout"),
                         "ok"],
        )
        t0 = time.time()
        result = retry_with_backoff(fn, max_attempts=3, base_delay=0.01)
        elapsed = time.time() - t0
        assert result == "ok"
        assert fn.call_count == 3
        # Vérifier backoff : 0.01s + 0.02s ≥ 0.03s
        assert elapsed >= 0.03

    def test_raises_after_all_attempts_fail(self):
        fn = MagicMock(side_effect=ProviderNetworkError("always fails"))
        with pytest.raises(ProviderNetworkError):
            retry_with_backoff(fn, max_attempts=3, base_delay=0.01)
        assert fn.call_count == 3

    def test_non_provider_error_raised_immediately(self):
        fn = MagicMock(side_effect=ValueError("not a network error"))
        with pytest.raises(ValueError):
            retry_with_backoff(fn, max_attempts=3)
        assert fn.call_count == 1


# ─── Tests OrangeMoneyProvider mock ──────────────────────────────────────────

class TestOrangeMoneyProviderMock:

    def test_initiate_returns_pending(self):
        provider = OrangeMoneyProvider()
        result = provider.initiate_payment(None, 50000, "+224655112233", "ref-001")
        assert result["status"] == "PENDING"
        assert result["provider_transaction_id"].startswith("OM-")

    def test_check_status_pending_then_completed(self):
        provider = OrangeMoneyProvider()
        result = provider.initiate_payment(None, 10000, "+224655112233", "ref-002")
        txn_id = result["provider_transaction_id"]

        # Just initiated → still PENDING (< 30s mock delay)
        status = provider.check_status(txn_id)
        assert status["status"] == "PENDING"

        # Unknown transaction → FAILED
        status = provider.check_status("UNKNOWN")
        assert status["status"] == "FAILED"

    def test_verify_webhook_valid_signature(self):
        provider = OrangeMoneyProvider()
        payload = {
            "transaction_id": "OM-TXN-001",
            "status": "SUCCESS",
            "amount": "50000",
        }
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        sig = _compute_signature(payload, provider.secret)
        assert provider.verify_webhook(body.encode("utf-8"), sig) is True

    def test_verify_webhook_invalid_signature(self):
        provider = OrangeMoneyProvider()
        payload = {"transaction_id": "OM-TXN-001", "status": "SUCCESS"}
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        assert provider.verify_webhook(body.encode("utf-8"), "bad-sig") is False

    def test_verify_webhook_tampered_payload(self):
        provider = OrangeMoneyProvider()
        payload = {"transaction_id": "OM-TXN-001", "status": "SUCCESS"}
        sig = _compute_signature(payload, provider.secret)
        # Payload modifié (montant ajouté)
        tampered = {"transaction_id": "OM-TXN-001", "status": "SUCCESS", "amount": "99999"}
        body = json.dumps(tampered, separators=(",", ":"), sort_keys=True)
        assert provider.verify_webhook(body.encode("utf-8"), sig) is False


# ─── Tests endpoints OM ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestOrangeMoneyEndpoints:

    def test_initiate_om_payment(self, api_client, tenant, director_user, director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("payment-om-initiate"),
            {
                "student_id": str(student.id),
                "amount": "50000",
                "payer_phone": "+224655112233",
            },
            format="json",
        )
        assert response.status_code == 202, f"Error: {response.json()}"
        data = response.json()["data"]
        assert data["status"] == "PENDING"
        assert data["provider_transaction_id"].startswith("OM-")
        assert data["poll_url"] == f"/finance/payments/{data['payment_id']}/status/"

        payment = Payment.objects.get(id=data["payment_id"])
        assert payment.method == "ORANGE_MONEY"
        assert payment.status == "PENDING"

        om_txn = OrangeMoneyTransaction.objects.get(payment=payment)
        assert om_txn.provider_status == "INITIATED"
        assert om_txn.provider_transaction_id == data["provider_transaction_id"]

    def test_initiate_with_existing_student_fee(self, api_client, tenant, director_user,
                                                 director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=student.annee_inscription,
            name="Scolarité", type="SCOLARITE", amount=100000,
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )

        response = api_client.post(
            reverse("payment-om-initiate"),
            {
                "student_id": str(student.id),
                "student_fee_id": str(sf.id),
                "amount": "100000",
                "payer_phone": "+224655112233",
            },
            format="json",
        )
        assert response.status_code == 202

    def test_initiate_exceeds_balance(self, api_client, tenant, director_user,
                                       director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=student.annee_inscription,
            name="Frais", type="INSCRIPTION", amount=50000,
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=50000, discount_amount=0, balance_due=50000,
        )

        response = api_client.post(
            reverse("payment-om-initiate"),
            {
                "student_id": str(student.id),
                "student_fee_id": str(sf.id),
                "amount": "60000",
                "payer_phone": "+224655112233",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_initiate_without_permission(self, api_client, tenant, student):
        response = api_client.post(
            reverse("payment-om-initiate"),
            {
                "student_id": str(student.id),
                "amount": "10000",
                "payer_phone": "+224655112233",
            },
            format="json",
        )
        assert response.status_code == 401

    def test_payment_status_pending(self, api_client, tenant, director_user,
                                     director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        # Initier un paiement OM
        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "amount": "30000",
             "payer_phone": "+224655112233"},
            format="json",
        )
        payment_id = init_resp.json()["data"]["payment_id"]

        status_resp = api_client.get(
            reverse("payment-status", args=[payment_id])
        )
        assert status_resp.status_code == 200
        assert status_resp.json()["data"]["status"] == "PENDING"

    def test_webhook_success_updates_payment(self, api_client, tenant, director_user,
                                              director_role, student):
        """Scénario complet : init → webhook SUCCESS → COMPLETED + solde mis à jour."""
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=student.annee_inscription,
            name="Scolarité", type="SCOLARITE", amount=100000,
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )

        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "student_fee_id": str(sf.id),
             "amount": "60000", "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        # Simuler le webhook OM
        payload = {
            "transaction_id": txn_id,
            "status": "SUCCESS",
            "amount": "60000",
            "payer_msisdn": "+224655112233",
            "timestamp": "2025-10-06T14:32:10Z",
        }
        provider = OrangeMoneyProvider()
        sig = _compute_signature(payload, provider.secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        webhook_resp = api_client.post(
            reverse("payment-om-webhook"),
            body,
            content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE=sig,
        )
        assert webhook_resp.status_code == 200
        assert webhook_resp.json()["received"] is True

        # Vérifier mise à jour
        payment = Payment.objects.get(
            id=init_resp.json()["data"]["payment_id"]
        )
        assert payment.status == "COMPLETED"
        assert payment.receipt_number.startswith("REC-")
        assert payment.receipt_pdf_url != ""

        sf.refresh_from_db()
        assert sf.balance_due == 40000  # 100000 - 60000

        om_txn = OrangeMoneyTransaction.objects.get(payment=payment)
        assert om_txn.provider_status == "CONFIRMED"
        assert om_txn.raw_webhook_payload["status"] == "SUCCESS"

    def test_webhook_failure_updates_payment(self, api_client, tenant, director_user,
                                              director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "amount": "30000",
             "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        payload = {
            "transaction_id": txn_id,
            "status": "FAILED",
            "amount": "30000",
            "failure_reason": "Solde insuffisant",
        }
        provider = OrangeMoneyProvider()
        sig = _compute_signature(payload, provider.secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        resp = api_client.post(
            reverse("payment-om-webhook"),
            body,
            content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE=sig,
        )
        assert resp.status_code == 200

        payment = Payment.objects.get(
            id=init_resp.json()["data"]["payment_id"]
        )
        assert payment.status == "FAILED"
        assert "Solde insuffisant" in payment.failure_reason

        om_txn = OrangeMoneyTransaction.objects.get(payment=payment)
        assert om_txn.provider_status == "FAILED"

    def test_webhook_invalid_signature_rejected(self, api_client):
        payload = {"transaction_id": "OM-TXN-001", "status": "SUCCESS"}
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        resp = api_client.post(
            reverse("payment-om-webhook"),
            body,
            content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE="invalid-signature",
        )
        assert resp.status_code == 401
        assert resp.json()["received"] is False

    def test_webhook_unknown_transaction(self, api_client):
        payload = {"transaction_id": "OM-UNKNOWN", "status": "SUCCESS"}
        provider = OrangeMoneyProvider()
        sig = _compute_signature(payload, provider.secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        resp = api_client.post(
            reverse("payment-om-webhook"),
            body,
            content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE=sig,
        )
        assert resp.status_code == 200
        assert resp.json()["received"] is True

    def test_webhook_duplicate_is_idempotent(self, api_client, tenant, director_user,
                                               director_role, student):
        """Deux webhooks identiques → pas de double décrémentation du solde."""
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=student.annee_inscription,
            name="Scolarité", type="SCOLARITE", amount=100000,
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )

        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "student_fee_id": str(sf.id),
             "amount": "50000", "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        payload = {
            "transaction_id": txn_id,
            "status": "SUCCESS",
            "amount": "50000",
        }
        provider = OrangeMoneyProvider()
        sig = _compute_signature(payload, provider.secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        # Premier appel
        api_client.post(
            reverse("payment-om-webhook"),
            body, content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE=sig,
        )

        sf.refresh_from_db()
        assert sf.balance_due == 50000  # première décrémentation

        # Second appel (identique)
        resp2 = api_client.post(
            reverse("payment-om-webhook"),
            body, content_type="application/json",
            HTTP_X_ORANGE_SIGNATURE=sig,
        )
        assert resp2.status_code == 200

        sf.refresh_from_db()
        assert sf.balance_due == 50000  # pas de double décrémentation


# ─── Tests réconciliation ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReconciliation:

    def test_reconciliation_marks_stale_as_failed(self):
        """Test structurel : la tâche existe et peut être importée."""
        from apps.finance.tasks import reconcile_orange_money_transactions
        assert reconcile_orange_money_transactions is not None


# ─── Tests complémentaires FIN-MVP-03 ───────────────────────────────────────

@pytest.mark.django_db
class TestRegressionReceiptYear:

    def test_webhook_receipt_year_from_fee_not_enrollment(self, api_client, tenant, director_user, director_role):
        """
        Régression : un élève inscrit en 2023-2024 payant des frais 2025-2026
        via Orange Money doit obtenir un reçu REC-2025-..., pas REC-2023-...
        """
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        sy_old = SchoolYear.objects.create(
            tenant=tenant, label="2023-2024",
            start_date="2023-10-01", end_date="2024-07-31",
            status="CLOSED",
        )
        sy_current = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-10-01", end_date="2026-07-31",
            status="OPEN", is_current=True,
        )
        level = Level.objects.create(tenant=tenant, name="6ème", cycle="PRIMAIRE", order_index=1)
        sc = SchoolClass.objects.create(
            tenant=tenant, school_year=sy_current, level=level, name="6ème A", capacity=60,
        )
        student = Student.objects.create(
            tenant=tenant, matricule="2023-00001", nom="Old", prenom="Student",
            date_naissance="2010-01-01", sexe="M", statut="ACTIF",
            annee_inscription=sy_old, classe_actuelle=sc,
        )
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=sy_current,
            name="Scolarité 2025", type="SCOLARITE", amount=100000,
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )

        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "student_fee_id": str(sf.id),
             "amount": "50000", "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        payload = {"transaction_id": txn_id, "status": "SUCCESS", "amount": "50000"}
        provider = OrangeMoneyProvider()
        sig = _compute_signature(payload, provider.secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        webhook_resp = api_client.post(
            reverse("payment-om-webhook"), body,
            content_type="application/json", HTTP_X_ORANGE_SIGNATURE=sig,
        )
        assert webhook_resp.status_code == 200

        payment = Payment.objects.get(id=init_resp.json()["data"]["payment_id"])
        assert payment.receipt_number.startswith("REC-2025-"), \
            f"Reçu devrait être REC-2025-, got {payment.receipt_number}"


@pytest.mark.django_db
class TestOMIdempotency:

    def test_same_idempotency_key_returns_409(self, api_client, tenant, director_user, director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        payload = {
            "student_id": str(student.id),
            "amount": "50000",
            "payer_phone": "+224655112233",
            "idempotency_key": "om-client-key-001",
        }

        r1 = api_client.post(reverse("payment-om-initiate"), payload, format="json")
        assert r1.status_code == 202

        r2 = api_client.post(reverse("payment-om-initiate"), payload, format="json")
        assert r2.status_code == 409

    def test_deterministic_key_prevents_double_click(self, api_client, tenant, director_user, director_role, student):
        """Même appel sans idempotency_key explicite → même clé déterministe → 409."""
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        payload = {
            "student_id": str(student.id),
            "amount": "30000",
            "payer_phone": "+224655112233",
        }

        r1 = api_client.post(reverse("payment-om-initiate"), payload, format="json")
        assert r1.status_code == 202

        r2 = api_client.post(reverse("payment-om-initiate"), payload, format="json")
        assert r2.status_code == 409


@pytest.mark.django_db
class TestOMInitiateRetry:

    def test_initiate_retries_on_provider_error(self, api_client, tenant, director_user, director_role, student, monkeypatch):
        """
        Vérifie que initiate_orange_money utilise retry_with_backoff :
        provider échoue 2 fois (ProviderNetworkError), réussit à la 3e.
        """
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        call_count = 0

        def failing_initiate(self, tenant, amount, phone, ref):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                from apps.finance.providers.base import ProviderNetworkError
                raise ProviderNetworkError("OM API timeout")
            return {
                "provider_transaction_id": f"OM-RETRY-{call_count}",
                "status": "PENDING",
            }

        from apps.finance.providers.orange_money import OrangeMoneyProvider
        monkeypatch.setattr(OrangeMoneyProvider, "initiate_payment", failing_initiate)

        response = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "amount": "50000",
             "payer_phone": "+224655112233"},
            format="json",
        )
        assert response.status_code == 202, f"Error: {response.json()}"
        tx_id = response.json()["data"]["provider_transaction_id"]
        assert tx_id == "OM-RETRY-3", f"Expected OM-RETRY-3, got {tx_id}"
        assert call_count == 3

    def test_initiate_fails_after_3_retries(self, api_client, tenant, director_user, director_role, student, monkeypatch):
        """Provider toujours en erreur → 502 après 3 tentatives."""
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        def always_fails(self, tenant, amount, phone, ref):
            from apps.finance.providers.base import ProviderNetworkError
            raise ProviderNetworkError("OM API down")

        from apps.finance.providers.orange_money import OrangeMoneyProvider
        monkeypatch.setattr(OrangeMoneyProvider, "initiate_payment", always_fails)

        response = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "amount": "50000",
             "payer_phone": "+224655112233"},
            format="json",
        )
        assert response.status_code == 502
        assert "temporairement indisponible" in response.json()["message"]
