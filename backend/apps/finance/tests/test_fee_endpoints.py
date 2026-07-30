"""
apps/finance/tests/test_fee_endpoints.py — FIN-MVP-01

Tests pour FeeCategory et StudentFee :
- CRUD FeeCategory
- CRUD StudentFee
- Isolation multi-tenant
- Permissions finance
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, Student, Level, SchoolClass
from apps.finance.models import FeeCategory, StudentFee


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
def student(tenant, school_year, level):
    from apps.pedagogy.models import SchoolClass
    school_class = SchoolClass.objects.create(
        tenant=tenant, school_year=school_year, level=level, name="6ème A", capacity=60,
    )
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
def ss_role(db):
    return Role.objects.get_or_create(name="STUDENT_STUDIES", defaults={"label": "Scolarité"})[0]


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


# ─── Tests FeeCategory ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFeeCategoryEndpoints:

    def test_create_feecategory(self, api_client, tenant, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        # SCHOOLYEAR-V2-02 : ce test envoie un school_year explicite
        # (comportement pré-V2-02) — nécessite désormais l'override.
        director_role.permissions.add(
            Permission.objects.get_or_create(
                codename="pedagogy:override:schoolyear",
                defaults={"module": "pedagogy"},
            )[0]
        )
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("feecategory-list"),
            {
                "school_year": str(school_year.id),
                "name": "Frais d'inscription",
                "type": "INSCRIPTION",
                "amount": 50000,
                "is_mandatory": True,
            },
            format="json",
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Frais d'inscription"
        assert Decimal(data["amount"]) == 50000
        assert FeeCategory.objects.filter(tenant=tenant, name="Frais d'inscription").exists()

    def test_list_feecategories(self, api_client, tenant, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:read"])
        FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Scolarité", type="SCOLARITE", amount=250000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("feecategory-list"))
        assert response.status_code == 200
        results = response.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["name"] == "Scolarité"

    def test_create_feecategory_without_permission(self, api_client, tenant, ss_role, school_year):
        user = User.objects.create_user(
            username="ss", email="ss@ecole-test.gn", password="SecurePass123!",
            role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:read"])
        _auth(api_client, user)

        response = api_client.post(
            reverse("feecategory-list"),
            {"school_year": str(school_year.id), "name": "Test", "type": "INSCRIPTION", "amount": 1000},
            format="json",
        )
        assert response.status_code == 403

    def test_feecategory_tenant_isolation(self, api_client, tenant, tenant2, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        # Créer une catégorie dans tenant2
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        FeeCategory.objects.create(
            tenant=tenant2, school_year=sy2, name="Frais autre", type="INSCRIPTION", amount=30000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("feecategory-list"))
        results = response.json()["data"]["results"]
        assert len(results) == 0  # Aucune catégorie du tenant2

    def test_retrieve_feecategory_cross_tenant_404(self, api_client, tenant, tenant2, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:read"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        other = FeeCategory.objects.create(
            tenant=tenant2, school_year=sy2, name="Autre", type="INSCRIPTION", amount=10000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("feecategory-detail", args=[other.id]))
        assert response.status_code == 404


@pytest.mark.django_db
class TestFeeCategorySchoolYearDefaultAndOverride:
    """SCHOOLYEAR-V2-02 : school_year devient optionnel, défaut = année courante."""

    def test_omitted_defaults_to_current_year(self, api_client, tenant, ss_role, school_year):
        SchoolYear.objects.filter(id=school_year.id).update(is_current=True)
        user = User.objects.create_user(
            username="ss-default", email="ss-default@ecole-test.gn",
            password="SecurePass123!", role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:create"])
        _auth(api_client, user)

        response = api_client.post(
            reverse("feecategory-list"),
            {"name": "Cantine", "type": "SCOLARITE", "amount": 20000},
            format="json",
        )
        assert response.status_code == 201, response.json()
        cat = FeeCategory.objects.get(id=response.json()["data"]["id"])
        assert cat.school_year_id == school_year.id

    def test_omitted_raises_422_when_no_current_year(self, api_client, tenant, ss_role, school_year):
        user = User.objects.create_user(
            username="ss-nocurrent", email="ss-nocurrent@ecole-test.gn",
            password="SecurePass123!", role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:create"])
        _auth(api_client, user)

        response = api_client.post(
            reverse("feecategory-list"),
            {"name": "Cantine", "type": "SCOLARITE", "amount": 20000},
            format="json",
        )
        assert response.status_code == 422
        assert "Aucune année scolaire courante" in response.json()["message"]

    def test_explicit_different_from_current_denied_without_override(
        self, api_client, tenant, ss_role, school_year
    ):
        SchoolYear.objects.filter(id=school_year.id).update(is_current=True)
        other_year = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027", start_date="2026-10-01", end_date="2027-07-31",
        )
        user = User.objects.create_user(
            username="ss-override", email="ss-override@ecole-test.gn",
            password="SecurePass123!", role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:create"])
        _auth(api_client, user)

        response = api_client.post(
            reverse("feecategory-list"),
            {"school_year": str(other_year.id), "name": "Cantine", "type": "SCOLARITE", "amount": 20000},
            format="json",
        )
        assert response.status_code == 403

    def test_explicit_school_year_from_other_tenant_returns_404(
        self, api_client, tenant, tenant2, director_user, director_role
    ):
        _ensure_permissions(director_role, ["finance:create"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        _auth(api_client, director_user)

        response = api_client.post(
            reverse("feecategory-list"),
            {"school_year": str(sy2.id), "name": "Cantine", "type": "SCOLARITE", "amount": 20000},
            format="json",
        )
        assert response.status_code == 404

    def test_update_school_year_denied_without_override(
        self, api_client, tenant, ss_role, school_year
    ):
        other_year = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027", start_date="2026-10-01", end_date="2027-07-31",
        )
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Scolarité", type="SCOLARITE", amount=250000,
        )
        user = User.objects.create_user(
            username="ss-update", email="ss-update@ecole-test.gn",
            password="SecurePass123!", role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:read", "finance:update"])
        _auth(api_client, user)

        response = api_client.patch(
            reverse("feecategory-detail", args=[cat.id]),
            {"school_year": str(other_year.id)},
            format="json",
        )
        assert response.status_code == 403
        cat.refresh_from_db()
        assert cat.school_year_id == school_year.id

    def test_update_other_fields_allowed_without_override(
        self, api_client, tenant, ss_role, school_year
    ):
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Scolarité", type="SCOLARITE", amount=250000,
        )
        user = User.objects.create_user(
            username="ss-update-ok", email="ss-update-ok@ecole-test.gn",
            password="SecurePass123!", role=ss_role, tenant=tenant,
        )
        _ensure_permissions(ss_role, ["finance:read", "finance:update"])
        _auth(api_client, user)

        response = api_client.patch(
            reverse("feecategory-detail", args=[cat.id]),
            {"amount": 300000},
            format="json",
        )
        assert response.status_code == 200, response.json()
        cat.refresh_from_db()
        assert cat.amount == 300000


# ─── Tests StudentFee ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStudentFeeEndpoints:

    def test_create_student_fee(self, api_client, tenant, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Inscription", type="INSCRIPTION", amount=50000,
        )

        response = api_client.post(
            reverse("studentfee-list"),
            {
                "student": str(student.id),
                "fee_category_id": str(cat.id),
                "total_amount": 50000,
                "discount_amount": 5000,
            },
            format="json",
        )
        assert response.status_code == 201, f"Error: {response.json()}"
        data = response.json()["data"]
        assert data["student_name"] == f"{student.nom} {student.prenom}"
        assert Decimal(data["balance_due"]) == 45000  # 50000 - 5000

    def test_list_student_fees(self, api_client, tenant, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read"])
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Scolarité", type="SCOLARITE", amount=250000,
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=250000, discount_amount=0, balance_due=250000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("studentfee-list"))
        assert response.status_code == 200
        results = response.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["fee_category"]["name"] == "Scolarité"

    def test_filter_student_fees_by_student(self, api_client, tenant, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read"])
        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Frais", type="INSCRIPTION", amount=10000,
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=10000, discount_amount=0, balance_due=10000,
        )
        _auth(api_client, director_user)

        response = api_client.get(f"{reverse('studentfee-list')}?student={student.id}")
        assert response.status_code == 200
        results = response.json()["data"]["results"]
        assert len(results) == 1

    def test_student_fee_tenant_isolation(self, api_client, tenant, tenant2, director_user, director_role, school_year, level):
        _ensure_permissions(director_role, ["finance:read"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        cat2 = FeeCategory.objects.create(
            tenant=tenant2, school_year=sy2, name="Frais", type="INSCRIPTION", amount=10000,
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
        StudentFee.objects.create(
            tenant=tenant2, student=student2, fee_category=cat2,
            total_amount=10000, discount_amount=0, balance_due=10000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("studentfee-list"))
        assert len(response.json()["data"]["results"]) == 0

    def test_student_fee_cross_tenant_404(self, api_client, tenant, tenant2, director_user, director_role, school_year, level):
        _ensure_permissions(director_role, ["finance:read"])
        sy2 = SchoolYear.objects.create(
            tenant=tenant2, label="2025-2026", start_date="2025-10-01", end_date="2026-07-31",
        )
        cat2 = FeeCategory.objects.create(
            tenant=tenant2, school_year=sy2, name="Frais", type="INSCRIPTION", amount=10000,
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
        other = StudentFee.objects.create(
            tenant=tenant2, student=student2, fee_category=cat2,
            total_amount=10000, discount_amount=0, balance_due=10000,
        )
        _auth(api_client, director_user)

        response = api_client.get(reverse("studentfee-detail", args=[other.id]))
        assert response.status_code == 404

    def test_discount_exceeds_total(self, api_client, tenant, director_user, director_role, school_year, student):
        _ensure_permissions(director_role, ["finance:read", "finance:create"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year, name="Test", type="INSCRIPTION", amount=10000,
        )
        response = api_client.post(
            reverse("studentfee-list"),
            {
                "student": str(student.id),
                "fee_category_id": str(cat.id),
                "total_amount": 10000,
                "discount_amount": 15000,
            },
            format="json",
        )
        assert response.status_code == 400


# ─── Tests PUT/PATCH/DELETE FeeCategory ─────────────────────────────────────

class TestFeeCategoryUpdateDelete:

    def test_update_fee_category(self, api_client, tenant, director_user,
                                  director_role, school_year):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Ancien nom", type="INSCRIPTION", amount=10000,
        )

        resp = api_client.put(
            reverse("feecategory-detail", args=[cat.id]),
            {"school_year": str(school_year.id), "name": "Nouveau nom",
             "type": "SCOLARITE", "amount": 20000, "is_mandatory": True},
            format="json",
        )
        assert resp.status_code == 200
        cat.refresh_from_db()
        assert cat.name == "Nouveau nom"
        assert cat.amount == 20000

    def test_partial_update_fee_category(self, api_client, tenant, director_user,
                                          director_role, school_year):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Modifiable", type="SCOLARITE", amount=50000,
            is_mandatory=False,
        )

        resp = api_client.patch(
            reverse("feecategory-detail", args=[cat.id]),
            {"amount": 45000},
            format="json",
        )
        assert resp.status_code == 200
        cat.refresh_from_db()
        assert cat.amount == 45000
        assert cat.name == "Modifiable"  # inchangé

    def test_delete_fee_category_without_student_fees(
            self, api_client, tenant, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="À supprimer", type="INSCRIPTION", amount=5000,
        )

        resp = api_client.delete(reverse("feecategory-detail", args=[cat.id]))
        assert resp.status_code == 204
        assert FeeCategory.objects.filter(id=cat.id).count() == 0

    def test_delete_fee_category_with_student_fees_blocked(
            self, api_client, tenant, director_user, director_role,
            school_year, student):
        _ensure_permissions(director_role, ["finance:update"])
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Protégée", type="SCOLARITE", amount=50000,
        )
        StudentFee.objects.create(
            tenant=tenant, student=student, fee_category=cat,
            total_amount=50000, discount_amount=0, balance_due=50000,
        )

        resp = api_client.delete(reverse("feecategory-detail", args=[cat.id]))
        assert resp.status_code == 403
        assert FeeCategory.objects.filter(id=cat.id).count() == 1

    def test_delete_fee_category_requires_finance_update(
            self, api_client, tenant, director_user, director_role, school_year):
        _ensure_permissions(director_role, ["finance:read"])  # read only
        _auth(api_client, director_user)

        cat = FeeCategory.objects.create(
            tenant=tenant, school_year=school_year,
            name="Sans perm", type="INSCRIPTION", amount=10000,
        )

        resp = api_client.delete(reverse("feecategory-detail", args=[cat.id]))
        assert resp.status_code == 403
