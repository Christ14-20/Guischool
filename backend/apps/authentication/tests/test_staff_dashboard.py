"""
apps/authentication/tests/test_staff_dashboard.py — STAFF-V2-05

Tests pour GET /auth/staff/dashboard/ : effectifs par rôle, ancienneté
moyenne, taux de vacataires — comptes actifs uniquement (décision PO).
"""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, StaffProfile, Permission


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    from apps.superadmin.models import Plan
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="École Test SV5", slug="ecole-test-sv5", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000005", contact_email="directeur@ecole-test-sv5.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.create(name="DIRECTOR", label="Directeur")


@pytest.fixture
def teacher_role(db):
    return Role.objects.create(name="TEACHER", label="Enseignant")


@pytest.fixture
def ss_role(db):
    return Role.objects.create(name="STUDENT_STUDIES", label="Scolarité")


@pytest.fixture
def accountant_role(db):
    return Role.objects.get_or_create(name="ACCOUNTANT", defaults={"label": "Comptable"})[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-sv5", email="directeur@ecole-test-sv5.gn", password="SecurePass123!",
        first_name="Mamadou", last_name="Diallo", role=director_role, tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _auth(api_client, user):
    url = reverse("auth-login")
    resp = api_client.post(url, {"email": user.email, "password": "SecurePass123!"}, format="json")
    assert resp.status_code == 200, resp.json()
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _ensure_director_permissions(director_role):
    for c in ("staff:create", "staff:read", "staff:update", "staff:disable"):
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "staff"})
        director_role.permissions.add(perm)


def _make_staff(tenant, role, email, **profile_kwargs):
    user = User.objects.create_user(
        username=email.split("@")[0], email=email, password="P@ss123!", role=role, tenant=tenant,
        first_name="A", last_name="B",
    )
    StaffProfile.objects.create(user=user, **profile_kwargs)
    return user


# ─── Dashboard ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStaffDashboard:
    def test_counts_by_role(
        self, api_client, tenant, director_user, director_role, teacher_role, ss_role, accountant_role
    ):
        _make_staff(tenant, teacher_role, "t1@ecole-test-sv5.gn")
        _make_staff(tenant, teacher_role, "t2@ecole-test-sv5.gn")
        _make_staff(tenant, ss_role, "ss1@ecole-test-sv5.gn")
        _make_staff(tenant, accountant_role, "a1@ecole-test-sv5.gn")

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200, resp.json()
        data = resp.json()["data"]
        assert data["by_role"] == {"TEACHER": 2, "STUDENT_STUDIES": 1, "ACCOUNTANT": 1}
        assert data["total_staff"] == 4

    def test_director_excluded_from_counts(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """DIRECTOR n'est jamais géré par StaffViewSet — jamais compté ici non plus."""
        _make_staff(tenant, teacher_role, "t1@ecole-test-sv5.gn")
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["data"]["total_staff"] == 1  # director_user lui-même exclu

    def test_disabled_accounts_excluded(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """Décision PO : comptes actifs uniquement."""
        active = _make_staff(tenant, teacher_role, "actif@ecole-test-sv5.gn")
        disabled = _make_staff(tenant, teacher_role, "desactive@ecole-test-sv5.gn")
        disabled.is_active = False
        disabled.save(update_fields=["is_active"])

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total_staff"] == 1
        assert data["by_role"]["TEACHER"] == 1

    def test_average_tenure_years(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        today = date.today()
        _make_staff(
            tenant, teacher_role, "anciennete1@ecole-test-sv5.gn",
            date_embauche=today - timedelta(days=int(2 * 365.25)),
        )
        _make_staff(
            tenant, teacher_role, "anciennete2@ecole-test-sv5.gn",
            date_embauche=today - timedelta(days=int(4 * 365.25)),
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["data"]["average_tenure_years"] == pytest.approx(3.0, abs=0.1)

    def test_average_tenure_ignores_missing_date_embauche(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """Champ optionnel (STAFF-V2-01) — aucune valeur inventée pour les comptes sans donnée."""
        today = date.today()
        _make_staff(
            tenant, teacher_role, "avec-date@ecole-test-sv5.gn",
            date_embauche=today - timedelta(days=int(1 * 365.25)),
        )
        _make_staff(tenant, teacher_role, "sans-date@ecole-test-sv5.gn")  # date_embauche=None

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["data"]["average_tenure_years"] == pytest.approx(1.0, abs=0.1)

    def test_average_tenure_zero_when_no_data(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _make_staff(tenant, teacher_role, "sans-date2@ecole-test-sv5.gn")
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["data"]["average_tenure_years"] == 0.0

    def test_vacataire_rate_based_on_statut_emploi(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """Décision PO : statut_emploi (STAFF-V2-04), pas type_contrat (STAFF-V2-01)."""
        _make_staff(tenant, teacher_role, "vacataire1@ecole-test-sv5.gn", statut_emploi="VACATAIRE")
        _make_staff(tenant, teacher_role, "titulaire1@ecole-test-sv5.gn", statut_emploi="TITULAIRE")
        # type_contrat=VACATAIRE mais statut_emploi vide : ne doit PAS compter comme vacataire.
        _make_staff(tenant, teacher_role, "contrat-vacataire@ecole-test-sv5.gn", type_contrat="VACATAIRE")

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total_staff"] == 3
        assert data["vacataire_rate"] == pytest.approx(1 / 3, abs=0.001)

    def test_vacataire_rate_zero_when_no_staff(
        self, api_client, tenant, director_user, director_role
    ):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total_staff"] == 0
        assert data["vacataire_rate"] == 0.0
        assert data["average_tenure_years"] == 0.0

    def test_forbidden_without_staff_read_permission(
        self, api_client, tenant, director_user, director_role
    ):
        # Aucune permission accordée à director_role.
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 403

    def test_tenant_isolation(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        from apps.superadmin.models import Plan, Tenant

        _make_staff(tenant, teacher_role, "monteacher@ecole-test-sv5.gn")

        other_plan = Plan.objects.create(name="Autre Plan SV5")
        other_tenant = Tenant.objects.create(
            name="École Autre SV5", slug="ecole-autre-sv5", school_type=Tenant.SchoolType.MIXTE,
            status=Tenant.Status.ACTIVE, plan=other_plan, contact_name="Autre Directeur",
            contact_phone="+224620000006", contact_email="autre@ecole-autre-sv5.gn",
        )
        _make_staff(other_tenant, teacher_role, "autre-teacher@ecole-autre-sv5.gn")
        _make_staff(other_tenant, teacher_role, "autre-teacher2@ecole-autre-sv5.gn")

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["data"]["total_staff"] == 1  # ne voit pas les 2 comptes de l'autre tenant
