"""
apps/finance/tests/test_payment_endpoints.py — FIN-MVP-02

Tests pour Payment (paiement espèces) :
- Création paiement espèces (COMPLETED, balance_due mis à jour)
- Idempotence (409 Conflict)
- Solde insuffisant (400)
- Lecture/liste paiements
- Téléchargement reçu PDF
- Isolation multi-tenant
- Autorisation (finance:create)
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, Student, Level, SchoolClass
from apps.finance.models import FeeCategory, StudentFee, Payment


# ─── Factories ────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test",
        slug="ecole-test",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test.gn",
    )


@pytest.fixture
def tenant2(plan):
    return Tenant.objects.create(
        name="Autre École",
        slug="autre-ecole",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Autre Directeur",
        contact_phone="+224620000002",
        contact_email="autre@ecole.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date="2025-10-01",
        end_date="2026-07-31",
        status="PREPARATION",
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
        tenant=tenant,
        matricule="2025-00001",
        nom="Diallo",
        prenom="Alpha",
        date_naissance="2010-05-15",
        sexe="M",
        statut="ACTIF",
        annee_inscription=school_year,
        classe_actuelle=school_class,
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})[0]


@pytest.fixture
def accountant_role(db):
    return Role.objects.get_or_create(name="ACCOUNTANT", defaults={"label": "Comptable"})[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur",
        email="directeur@ecole-test.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def accountant_role(db):
    return Role.objects.get_or_create(name="ACCOUNTANT", defaults={"label": "Comptable"})[0]


@pytest.fixture
def ss_role(db):
    return Role.objects.get_or_create(name="STUDENT_STUDIES", defaults={"label": "Scolarité"})[0]


@pytest.fixture
def accountant_user(tenant, accountant_role):
    return User.objects.create_user(
        username="comptable",
        email="comptable@ecole-test.gn",
        password="SecurePass123!",
        role=accountant_role,
        tenant=tenant,
    )


@pytest.fixture
def fee_category(tenant, school_year):
    return FeeCategory.objects.create(
        tenant=tenant, school_year=school_year,
        name="Inscription", type="INSCRIPTION", amount=50000,
    )


@pytest.fixture
def student_fee(tenant, student, fee_category):
    return StudentFee.objects.create(
        tenant=tenant, student=student, fee_category=fee_category,
        total_amount=50000, discount_amount=0, balance_due=50000,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _login(api_client, email, password):
    url = reverse("auth-login")
    return api_client.post(url, {"email": email, "password": password}, format="json")


def _auth(api_client, user):
    resp = _login(api_client, user.email, "SecurePass123!")
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return resp.json()["data"]


def _ensure_permissions(role, codenames):
    for c in codenames:
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "finance"})
        role.permissions.add(perm)


# ─── Tests Paiement Espèces ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestCashPaymentEndpoints:

    def test_create_cash_payment(self, api_client, tenant, director_user, director_role, student, student_fee):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("payment-list"),
            {
                "student_id": str(student.id),
                "student_fee_id": str(student_fee.id),
                "amount": "50000",
                "method": "CASH",
                "idempotency_key": "cash-001",
            },
            format="json",
        )
        assert response.status_code == 201, f"Error: {response.json()}"
        data = response.json()["data"]
        assert data["status"] == "COMPLETED"
        assert data["method"] == "CASH"
        assert data["receipt_number"].startswith("REC-")
        assert Decimal(data["amount"]) == 50000

        # Vérifier mise à jour du solde
        student_fee.refresh_from_db()
        assert student_fee.balance_due == 0

    def test_cash_payment_updates_balance_partially(self, api_client, tenant, director_user, director_role, student, student_fee):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("payment-list"),
            {
                "student_id": str(student.id),
                "student_fee_id": str(student_fee.id),
                "amount": "30000",
                "method": "CASH",
                "idempotency_key": "cash-002",
            },
            format="json",
        )
        assert response.status_code == 201
        student_fee.refresh_from_db()
        assert student_fee.balance_due == 20000  # 50000 - 30000

    def test_idempotency_key_prevents_duplicate(self, api_client, tenant, director_user, director_role, student, student_fee):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        payload = {
            "student_id": str(student.id),
            "student_fee_id": str(student_fee.id),
            "amount": "10000",
            "method": "CASH",
            "idempotency_key": "cash-dup-001",
        }
        response1 = api_client.post(reverse("payment-list"), payload, format="json")
        assert response1.status_code == 201

        response2 = api_client.post(reverse("payment-list"), payload, format="json")
        assert response2.status_code == 409

    def test_payment_exceeds_balance(self, api_client, tenant, director_user, director_role, student, student_fee):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("payment-list"),
            {
                "student_id": str(student.id),
                "student_fee_id": str(student_fee.id),
                "amount": "60000",
                "method": "CASH",
                "idempotency_key": "cash-exceed",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_list_payments(self, api_client, tenant, director_user, director_role, student, student_fee):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": "50000",
             "method": "CASH", "idempotency_key": "list-test"},
            format="json",
        )
        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": "25000",
             "method": "CASH", "idempotency_key": "list-test-2"},
            format="json",
        )

        response = api_client.get(reverse("payment-list"))
        assert response.status_code == 200
        results = response.json()["data"]["results"]
        assert len(results) == 2

    def test_filter_payments_by_method(self, api_client, tenant, director_user, director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": "10000",
             "method": "CASH", "idempotency_key": "filter-method"},
            format="json",
        )

        response = api_client.get(f"{reverse('payment-list')}?method=CASH")
        assert response.status_code == 200
        assert len(response.json()["data"]["results"]) == 1

        response = api_client.get(f"{reverse('payment-list')}?method=ORANGE_MONEY")
        assert len(response.json()["data"]["results"]) == 0

    def test_payment_tenant_isolation(self, api_client, tenant, tenant2, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        level2 = Level.objects.create(tenant=tenant2, name="6ème", cycle="PRIMAIRE", order_index=1)
        sc2 = SchoolClass.objects.create(
            tenant=tenant2, school_year=sy2, level=level2, name="6ème A", capacity=60,
        )
        student2 = Student.objects.create(
            tenant=tenant2, matricule="2025-00002", nom="Bah", prenom="Aminata",
            date_naissance="2011-03-20", sexe="F", statut="ACTIF",
            annee_inscription=sy2, classe_actuelle=sc2,
        )
        Payment.objects.create(
            tenant=tenant2, student=student2,
            amount=10000, method="CASH", status="COMPLETED",
            receipt_number="REC-2025-999999",
            idempotency_key="om-key-isolation",
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("payment-list"))
        assert len(response.json()["data"]["results"]) == 0

    def test_payment_cross_tenant_404(self, api_client, tenant, tenant2, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        level2 = Level.objects.create(tenant=tenant2, name="6ème", cycle="PRIMAIRE", order_index=1)
        sc2 = SchoolClass.objects.create(
            tenant=tenant2, school_year=sy2, level=level2, name="6ème A", capacity=60,
        )
        student2 = Student.objects.create(
            tenant=tenant2, matricule="2025-00003", nom="Sow", prenom="Moussa",
            date_naissance="2010-01-10", sexe="M", statut="ACTIF",
            annee_inscription=sy2, classe_actuelle=sc2,
        )
        other = Payment.objects.create(
            tenant=tenant2, student=student2,
            amount=10000, method="CASH", status="COMPLETED",
            receipt_number="REC-2025-888888",
            idempotency_key="om-key-cross",
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("payment-detail", args=[other.id]))
        assert response.status_code == 404

    def test_payment_without_permission(self, api_client, tenant, ss_role, student):
        _ensure_permissions(ss_role, ["finance:read"])
        user = User.objects.create_user(
            username="ss", email="ss@ecole-test.gn", password="SecurePass123!",
            role=ss_role, tenant=tenant,
        )
        _auth(api_client, user)

        response = api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": "10000",
             "method": "CASH", "idempotency_key": "no-perm"},
            format="json",
        )
        assert response.status_code == 403

    def test_receipt_pdf_download(self, api_client, tenant, director_user, director_role, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        create_resp = api_client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "amount": "10000",
             "method": "CASH", "idempotency_key": "pdf-test"},
            format="json",
        )
        payment_id = create_resp.json()["data"]["id"]

        response = api_client.get(reverse("payment-receipt", args=[payment_id]))
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "recu_REC-" in response["Content-Disposition"]
