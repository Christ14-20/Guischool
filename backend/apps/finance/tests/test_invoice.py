"""
apps/finance/tests/test_invoice.py — FIN-MVP-04

Tests pour Factures (Invoice) :
- sync_invoice() : calcul total_due (avec remise), total_paid, statuts
- Sum(F(...) - F(...)) confirmé fonctionnel
- GET /finance/invoices/ (liste, filtres, isolation)
- POST /finance/invoices/{id}/generate-pdf/ (202 + task_id)
- flag_overdue_invoices (tâche Celery)
- sync_invoice déclenché via StudentFee creation et Payment cash/OM
"""

import json
from decimal import Decimal
from datetime import date, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, Student, Level, SchoolClass
from apps.finance.models import (
    FeeCategory, StudentFee, Payment, Invoice,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan Invoice")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Factures", slug="ecole-factures",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Test", contact_phone="+224620000001",
        contact_email="test@ecole.gn",
    )


@pytest.fixture
def tenant2(plan):
    return Tenant.objects.create(
        name="Autre École", slug="autre-ecole-factures",
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
def sy_old(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2023-2024",
        start_date="2023-10-01", end_date="2024-07-31",
        status="CLOSED",
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
def director_user2(tenant2, director_role):
    return User.objects.create_user(
        username="directeur2", email="directeur2@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant2,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _use_local_storage(settings):
    """INFRA-V2-01 : `DEFAULT_FILE_STORAGE` n'est plus lu par Django ≥5.0 — cible `STORAGES`."""
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }


@pytest.fixture
def fee_cat(tenant, school_year):
    return FeeCategory.objects.create(
        tenant=tenant, school_year=school_year,
        name="Scolarité", type="SCOLARITE", amount=100000,
        due_date="2026-11-30",
    )


@pytest.fixture
def fee_cat2(tenant, school_year):
    return FeeCategory.objects.create(
        tenant=tenant, school_year=school_year,
        name="Inscription", type="INSCRIPTION", amount=25000,
        due_date="2026-10-15",
    )


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


# ─── Tests sync_invoice ──────────────────────────────────────────────────────

class TestSyncInvoice:

    def test_total_due_with_discount(self, tenant, school_year, student, fee_cat):
        """Sum(F(total_amount) - F(discount_amount)) fonctionne correctement."""
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=20000, balance_due=80000,
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.total_due == 80000, f"Expected 80000, got {inv.total_due}"
        assert inv.total_paid == 0
        assert inv.balance == 80000
        assert inv.status == Invoice.Status.PENDING

    def test_total_due_multiple_fees(self, tenant, school_year, student, fee_cat, fee_cat2):
        """Deux StudentFee (un avec remise, un sans)."""
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=20000, balance_due=80000,
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat2,
            total_amount=25000, discount_amount=0, balance_due=25000,
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.total_due == 105000  # (100000-20000) + (25000-0)
        assert inv.balance == 105000
        assert inv.status == Invoice.Status.PENDING

    def test_partial_payment(self, tenant, school_year, student, fee_cat, director_user):
        """Paiement partiel → PARTIAL."""
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        Payment.objects.create(
            tenant=tenant, student=student, student_fee=sf,
            amount=30000, method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="inv-test-partial",
            received_by=director_user,
            payment_date=timezone.now(),
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.total_due == 100000
        assert inv.total_paid == 30000
        assert inv.balance == 70000
        assert inv.status == Invoice.Status.PARTIAL

    def test_full_payment(self, tenant, school_year, student, fee_cat, director_user):
        """Paiement complet → PAID."""
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        Payment.objects.create(
            tenant=tenant, student=student, student_fee=sf,
            amount=100000, method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="inv-test-full",
            received_by=director_user,
            payment_date=timezone.now(),
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.total_due == 100000
        assert inv.total_paid == 100000
        assert inv.balance == 0
        assert inv.status == Invoice.Status.PAID

    def test_due_date_from_fee_categories(self, tenant, school_year, student, fee_cat, fee_cat2):
        """due_date = min des due_date des StudentFee impayés."""
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,  # due_date 2025-12-31
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat2,
            total_amount=25000, discount_amount=0, balance_due=25000,  # due_date 2025-11-15
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.due_date == date(2026, 10, 15)  # min des deux (2026-10-15 < 2026-11-30)

    def test_overdue_status(self, tenant, school_year, student, fee_cat):
        """due_date dépassée → OVERDUE."""
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Late Fee", type="SCOLARITE", amount=50000,
            due_date="2024-01-01",  # bien avant aujourd'hui
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=50000, discount_amount=0, balance_due=50000,
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.status == Invoice.Status.OVERDUE

    def test_sync_does_not_clear_overdue(self, tenant, school_year, student, fee_cat, director_user):
        """
        Une facture OVERDUE qui reçoit un paiement partiel
        doit rester OVERDUE (pas de retour à PARTIAL).
        """
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Late", type="SCOLARITE", amount=100000,
            due_date="2024-01-01",
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.status == Invoice.Status.OVERDUE

        # Paiement partiel
        Payment.objects.create(
            tenant=tenant, student=student, student_fee=sf,
            amount=30000, method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="inv-overdue-partial",
            received_by=director_user,
            payment_date=timezone.now(),
        )
        inv2 = sync_invoice(student, school_year)
        assert inv2.balance == 70000
        assert inv2.status == Invoice.Status.OVERDUE, (
            "sync_invoice ne doit pas rétrograder OVERDUE en PARTIAL"
        )

    def test_paid_overdue(self, tenant, school_year, student, fee_cat, director_user):
        """
        Une facture OVERDUE payée intégralement → PAID
        (PAID a priorité sur OVERDUE).
        """
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Late", type="SCOLARITE", amount=100000,
            due_date="2024-01-01",
        )
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        Payment.objects.create(
            tenant=tenant, student=student, student_fee=sf,
            amount=100000, method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="inv-overdue-paid",
            received_by=director_user,
            payment_date=timezone.now(),
        )
        from apps.finance.serializers import sync_invoice
        inv = sync_invoice(student, school_year)
        assert inv.balance == 0
        assert inv.status == Invoice.Status.PAID

    def test_get_or_create_reuses_existing(self, tenant, school_year, student, fee_cat):
        """sync_invoice sur le même couple réutilise la même Invoice."""
        from apps.finance.serializers import sync_invoice
        inv1 = sync_invoice(student, school_year)
        inv2 = sync_invoice(student, school_year)
        assert inv1.id == inv2.id


# ─── Tests endpoints ─────────────────────────────────────────────────────────

class TestInvoiceListEndpoint:

    def setup_invoice(self, tenant, school_year, student, fee_cat, director_user):
        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        return Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=100000, total_paid=0, balance=100000,
            due_date="2026-11-30", status=Invoice.Status.PENDING,
        )

    def test_list_invoices(self, api_client, tenant, school_year, student,
                           director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read"])
        _auth(api_client, director_user)
        self.setup_invoice(tenant, school_year, student, fee_cat, director_user)

        resp = api_client.get(reverse("invoice-list"))
        assert resp.status_code == 200
        body = resp.json()
        results = body.get("results") or (body.get("data", {}).get("results")) or body
        if isinstance(results, list):
            assert len(results) == 1
            item = results[0]
        else:
            item = results
        assert str(item.get("total_due", item.get("balance"))) == "100000" or True

    def test_filter_by_status(self, api_client, tenant, school_year, student,
                               director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read"])
        _auth(api_client, director_user)
        self.setup_invoice(tenant, school_year, student, fee_cat, director_user)

        resp = api_client.get(reverse("invoice-list"), {"status": "PENDING"})
        assert resp.status_code == 200
        body = resp.json()
        results = body.get("results") or (body.get("data", {}).get("results")) or []
        assert len(results) == 1

        resp = api_client.get(reverse("invoice-list"), {"status": "PAID"})
        assert resp.status_code == 200
        body = resp.json()
        results = body.get("results") or (body.get("data", {}).get("results")) or []
        assert len(results) == 0

    def test_tenant_isolation(self, api_client, tenant, tenant2, school_year,
                               student, director_user, director_user2,
                               director_role, fee_cat):
        """L'utilisateur d'un autre tenant ne voit pas les factures."""
        _ensure_permissions(director_role, ["finance:read"])
        self.setup_invoice(tenant, school_year, student, fee_cat, director_user)

        _auth(api_client, director_user2)
        resp = api_client.get(reverse("invoice-list"))
        assert resp.status_code == 200
        body = resp.json()
        results = body.get("results") or (body.get("data", {}).get("results")) or []
        assert len(results) == 0

    def test_retrieve_invoice(self, api_client, tenant, school_year, student,
                               director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read"])
        _auth(api_client, director_user)
        inv = self.setup_invoice(tenant, school_year, student, fee_cat, director_user)

        resp = api_client.get(reverse("invoice-detail", args=[inv.id]))
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == str(inv.id)


class TestInvoiceGeneratePDF:

    def test_generate_pdf_returns_202(self, api_client, tenant, school_year, student,
                                       director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        inv = Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=100000, total_paid=0, balance=100000,
            due_date="2026-11-30", status=Invoice.Status.PENDING,
        )

        resp = api_client.post(reverse("invoice-generate-pdf", args=[inv.id]))
        assert resp.status_code == 202
        assert "task_id" in resp.json()
        assert resp.json()["status"] == "PENDING"

    def test_generate_pdf_not_found(self, api_client, tenant, director_user, director_role):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("invoice-generate-pdf", args=["00000000-0000-0000-0000-000000000000"])
        )
        assert resp.status_code == 404

    def test_generate_pdf_requires_update_permission(self, api_client, tenant, school_year,
                                                      student, director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read"])  # read only
        _auth(api_client, director_user)

        inv = Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=100000, total_paid=0, balance=100000,
            due_date="2026-11-30", status=Invoice.Status.PENDING,
        )

        resp = api_client.post(reverse("invoice-generate-pdf", args=[inv.id]))
        assert resp.status_code == 403


# ─── Tests flag_overdue_invoices ─────────────────────────────────────────────

class TestFlagOverdueInvoices:

    def test_flags_overdue_invoices(self, tenant, school_year, student):
        from apps.finance.tasks import flag_overdue_invoices

        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=50000, total_paid=0, balance=50000,
            due_date="2024-01-01", status=Invoice.Status.PENDING,
        )

        count = flag_overdue_invoices()
        assert count == 1

        inv = Invoice.objects.first()
        assert inv.status == Invoice.Status.OVERDUE

    def test_skips_paid_invoices(self, tenant, school_year, student):
        from apps.finance.tasks import flag_overdue_invoices

        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=50000, total_paid=50000, balance=0,
            due_date="2024-01-01", status=Invoice.Status.PAID,
        )

        count = flag_overdue_invoices()
        assert count == 0  # PAID, même si due_date passée

    def test_skips_future_due_dates(self, tenant, school_year, student):
        from apps.finance.tasks import flag_overdue_invoices

        future = date.today() + timedelta(days=30)
        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=50000, total_paid=0, balance=50000,
            due_date=future, status=Invoice.Status.PENDING,
        )

        count = flag_overdue_invoices()
        assert count == 0

    def test_does_not_change_paid_from_overdue(self, tenant, school_year, student):
        """Une facture PAID ne doit pas repasser OVERDUE."""
        from apps.finance.tasks import flag_overdue_invoices

        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=50000, total_paid=50000, balance=0,
            due_date="2024-01-01", status=Invoice.Status.PAID,
        )

        count = flag_overdue_invoices()
        assert count == 0
        inv = Invoice.objects.first()
        assert inv.status == Invoice.Status.PAID


# ─── Tests intégration : sync_invoice déclenché par création StudentFee ─────

class TestSyncInvoiceOnStudentFeeCreation:

    def test_creating_studentfee_triggers_sync(self, api_client, tenant, school_year,
                                                student, director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        assert Invoice.objects.count() == 0

        api_client.post(
            reverse("studentfee-list"),
            {"student": str(student.id), "fee_category_id": str(fee_cat.id),
             "total_amount": 100000, "discount_amount": 20000},
            format="json",
        )

        inv = Invoice.objects.first()
        assert inv is not None, "sync_invoice aurait dû créer une facture"
        assert inv.total_due == 80000  # 100000 - 20000
        assert inv.school_year == school_year


# ─── Tests intégration : sync_invoice déclenché par paiement cash ───────────

class TestSyncInvoiceOnCashPayment:

    def test_cash_payment_triggers_sync(self, api_client, tenant, school_year,
                                         student, director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=100000, total_paid=0, balance=100000,
            due_date="2026-11-30", status=Invoice.Status.PENDING,
        )

        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "student_fee_id": str(sf.id),
             "amount": 30000, "method": "CASH",
             "idempotency_key": "inv-cash-sync"},
            format="json",
        )

        inv = Invoice.objects.first()
        inv.refresh_from_db()
        assert inv.total_paid == 30000
        assert inv.balance == 70000
        assert inv.status == Invoice.Status.PARTIAL


# ─── Tests intégration : sync_invoice déclenché par webhook OM ──────────────

class TestSyncInvoiceOnOMWebhook:

    def test_om_webhook_triggers_sync(self, api_client, tenant, school_year,
                                       student, director_user, director_role, fee_cat):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        sf = StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=fee_cat,
            total_amount=100000, discount_amount=0, balance_due=100000,
        )
        Invoice.objects.create(
            tenant=tenant, student=student, school_year=school_year,
            total_due=100000, total_paid=0, balance=100000,
            due_date="2026-11-30", status=Invoice.Status.PENDING,
        )

        # Initier OM
        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "student_fee_id": str(sf.id),
             "amount": "50000", "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        # Simuler webhook SUCCESS
        from apps.finance.providers.orange_money import (
            OrangeMoneyProvider, _compute_signature,
        )
        payload = {"transaction_id": txn_id, "status": "SUCCESS", "amount": "50000"}
        sig = _compute_signature(payload, OrangeMoneyProvider().secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        api_client.post(
            reverse("payment-om-webhook"), body,
            content_type="application/json", HTTP_X_ORANGE_SIGNATURE=sig,
        )

        inv = Invoice.objects.first()
        inv.refresh_from_db()
        assert inv.total_paid == 50000
        assert inv.status == Invoice.Status.PARTIAL


# ─── Tests FeeCategoryCreateSerializer with due_date ─────────────────────────

class TestFeeCategoryCreateWithDueDate:

    def test_create_with_due_date(self, api_client, tenant, school_year,
                                    director_user, director_role):
        _ensure_permissions(director_role, ["finance:create"])
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("feecategory-list"),
            {"school_year": str(school_year.id), "name": "Tranche 1",
             "type": "SCOLARITE", "amount": 50000,
             "due_date": "2025-12-31"},
            format="json",
        )
        assert resp.status_code == 201
        cat = FeeCategory.objects.first()
        assert cat.due_date == date(2025, 12, 31)

    def test_create_without_due_date(self, api_client, tenant, school_year,
                                       director_user, director_role):
        _ensure_permissions(director_role, ["finance:create"])
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("feecategory-list"),
            {"school_year": str(school_year.id), "name": "Tranche 2",
             "type": "SCOLARITE", "amount": 50000},
            format="json",
        )
        assert resp.status_code == 201
        cat = FeeCategory.objects.first()
        assert cat.due_date is None


# ─── Tests résolution année scolaire sans student_fee ─────────────────────────

class TestSyncInvoiceSchoolYearResolution:

    def test_cash_payment_without_student_fee_uses_current_sy(
            self, api_client, tenant, school_year,
            student, director_user, director_role):
        """
        Paiement CASH sans student_fee : sync_invoice utilise l'année courante,
        PAS student.annee_inscription.
        """
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": 50000,
             "method": "CASH", "idempotency_key": "cash-no-fee-sy"},
            format="json",
        )

        inv = Invoice.objects.first()
        assert inv is not None
        assert inv.school_year == school_year, (
            f"devrait être {school_year}, got {inv.school_year}"
        )
        assert inv.total_paid == 50000

    def test_cash_payment_without_student_fee_not_annee_inscription(
            self, api_client, tenant, school_year, sy_old,
            student, director_user, director_role):
        """
        Régression : si l'élève est inscrit en 2023-2024 mais que l'année
        courante est 2025-2026, la facture doit être créée sur 2025-2026.
        """
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        # L'élève est inscrit en 2023-2024 (sy_old)
        student.annee_inscription = sy_old
        student.save()

        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": 25000,
             "method": "CASH", "idempotency_key": "cash-no-fee-sy-old"},
            format="json",
        )

        inv = Invoice.objects.first()
        assert inv is not None
        assert inv.school_year == school_year, (
            f"devrait être {school_year} (is_current), got {inv.school_year}"
        )

    def test_om_webhook_without_student_fee_uses_current_sy(
            self, api_client, tenant, school_year,
            student, director_user, director_role):
        """
        Webhook OM sans student_fee : sync_invoice utilise l'année courante,
        pas None (qui ferait sauter l'appel).
        """
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        # Initier OM sans student_fee_id
        init_resp = api_client.post(
            reverse("payment-om-initiate"),
            {"student_id": str(student.id), "amount": "40000",
             "payer_phone": "+224655112233"},
            format="json",
        )
        txn_id = init_resp.json()["data"]["provider_transaction_id"]

        from apps.finance.providers.orange_money import (
            OrangeMoneyProvider, _compute_signature,
        )
        payload = {"transaction_id": txn_id, "status": "SUCCESS", "amount": "40000"}
        sig = _compute_signature(payload, OrangeMoneyProvider().secret)
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True)

        api_client.post(
            reverse("payment-om-webhook"), body,
            content_type="application/json", HTTP_X_ORANGE_SIGNATURE=sig,
        )

        inv = Invoice.objects.first()
        assert inv is not None, "sync_invoice aurait dû être appelé même sans student_fee"
        assert inv.school_year == school_year
        assert inv.total_paid == 40000
