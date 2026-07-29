import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, AcademicPeriod


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test EP",
        slug="ecole-test-ep",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test-ep.gn",
    )


def _add_pedagogy_permissions(role):
    from apps.authentication.models import Permission
    codenames = ["pedagogy:create:schoolyear", "pedagogy:create:period"]
    for codename in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": codename, "module": "pedagogy"},
        )
        role.permissions.add(perm)


def _add_director_only_permissions(role):
    from apps.authentication.models import Permission
    codenames = ["pedagogy:update:schoolyear", "pedagogy:close:schoolyear"]
    for codename in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": codename, "module": "pedagogy"},
        )
        role.permissions.add(perm)


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]
    _add_pedagogy_permissions(role)
    _add_director_only_permissions(role)
    return role


@pytest.fixture
def secretaire_role(db):
    role = Role.objects.get_or_create(
        name="STUDENT_STUDIES", defaults={"label": "Directeur des études"}
    )[0]
    _add_pedagogy_permissions(role)
    return role


@pytest.fixture
def teacher_role(db):
    return Role.objects.get_or_create(
        name="TEACHER", defaults={"label": "Enseignant"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="director-ep",
        email="director@ecole-test-ep.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def secretaire_user(tenant, secretaire_role):
    return User.objects.create_user(
        username="secretaire-ep",
        email="secretaire@ecole-test-ep.gn",
        password="SecurePass123!",
        role=secretaire_role,
        tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teacher-ep",
        email="teacher@ecole-test-ep.gn",
        password="SecurePass123!",
        role=teacher_role,
        tenant=tenant,
    )


def login_client(client, email):
    resp = client.post(
        reverse("auth-login"),
        {"email": email, "password": "SecurePass123!"},
        format="json",
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
class TestSchoolYearEndpoints:
    def test_list_schoolyears_empty(self, director_user):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("schoolyear-list"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["data"]["results"]) == 0

    def test_create_school_year(self, director_user, tenant):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "success"
        assert data["data"]["label"] == "2025-2026"
        assert data["data"]["status"] == "PREPARATION"
        assert data["data"]["is_current"] is False

    def test_create_school_year_duplicate_label(self, director_user, tenant):
        client = login_client(APIClient(), director_user.email)
        client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"},
            format="json",
        )
        resp = client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"},
            format="json",
        )
        assert resp.status_code == 400
        assert "existe déjà" in resp.json()["message"]

    def test_create_school_year_invalid_dates(self, director_user, tenant):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2026-07-10", "end_date": "2025-09-15"},
            format="json",
        )
        assert resp.status_code == 400

    def test_retrieve_school_year(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant,
            label="2025-2026",
            start_date="2025-09-15",
            end_date="2026-07-10",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("schoolyear-detail", args=[sy.id]))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["label"] == "2025-2026"
        assert "periods" in data

    def test_retrieve_school_year_other_tenant_returns_404(self, tenant, plan, director_user):
        tenant_b = Tenant.objects.create(
            name="École B EP",
            slug="ecole-b-ep",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b-ep.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date="2025-09-15",
            end_date="2026-07-10",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("schoolyear-detail", args=[sy_b.id]))
        assert resp.status_code == 404

    def test_set_current_school_year(self, director_user, tenant):
        sy1 = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        sy2 = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date="2026-09-15", end_date="2027-07-10",
        )
        client = login_client(APIClient(), director_user.email)

        resp = client.patch(
            reverse("schoolyear-set-current", args=[sy1.id]),
            {},
            format="json",
        )
        assert resp.status_code == 200
        sy1.refresh_from_db()
        sy2.refresh_from_db()
        assert sy1.is_current is True
        assert sy2.is_current is False

        resp = client.patch(
            reverse("schoolyear-set-current", args=[sy2.id]),
            {},
            format="json",
        )
        assert resp.status_code == 200
        sy1.refresh_from_db()
        sy2.refresh_from_db()
        assert sy1.is_current is False
        assert sy2.is_current is True

    def test_set_current_school_year_unauthorized_for_teacher(self, teacher_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("schoolyear-set-current", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 403

    def test_close_school_year_success(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
            status=SchoolYear.Status.ACTIVE, is_current=True,
        )
        AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=True,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["status"] == "CLOSED"
        # Clôturer ne touche jamais is_current (décision PO 2026-07-29).
        assert data["is_current"] is True

    def test_close_school_year_unclosed_period_returns_422(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=False,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 422
        assert "période(s)" in resp.json()["message"]
        sy.refresh_from_db()
        assert sy.status != SchoolYear.Status.CLOSED

    def test_close_school_year_without_periods_returns_422(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 422
        assert "Aucune période" in resp.json()["message"]

    def test_close_school_year_already_closed_returns_422(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
            status=SchoolYear.Status.CLOSED,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 422
        assert "déjà clôturée" in resp.json()["message"]

    def test_close_school_year_not_current_is_allowed(self, director_user, tenant):
        """Aucune contrainte is_current sur la clôture (décision PO 2026-07-29)."""
        sy_current = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date="2026-09-15", end_date="2027-07-10",
            is_current=True,
        )
        sy_abandoned = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
            status=SchoolYear.Status.PREPARATION, is_current=False,
        )
        AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy_abandoned,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=True,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy_abandoned.id]), {}, format="json",
        )
        assert resp.status_code == 200
        sy_current.refresh_from_db()
        assert sy_current.is_current is True

    def test_close_school_year_unauthorized_for_teacher(self, teacher_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 403

    def test_secretaire_cannot_close_school_year(self, secretaire_user, tenant):
        """close/set-current sont DIRECTOR uniquement, contrairement à create."""
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), secretaire_user.email)
        resp = client.patch(
            reverse("schoolyear-close", args=[sy.id]), {}, format="json",
        )
        assert resp.status_code == 403

    def test_create_school_year_unauthorized_for_teacher(self, teacher_user):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"},
            format="json",
        )
        assert resp.status_code == 403

    def test_secretaire_can_create_school_year(self, secretaire_user):
        client = login_client(APIClient(), secretaire_user.email)
        resp = client.post(
            reverse("schoolyear-list"),
            {"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"},
            format="json",
        )
        assert resp.status_code == 201


@pytest.mark.django_db
class TestPeriodEndpoints:
    def test_list_periods_empty(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(
            reverse("schoolyear-periods", args=[sy.id])
        )
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 0

    def test_list_periods(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(
            reverse("schoolyear-periods", args=[sy.id])
        )
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1
        assert resp.json()["data"][0]["name"] == "Trimestre 1"

    def test_create_period(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("schoolyear-periods", args=[sy.id]),
            {"name": "Trimestre 1", "type": "TRIMESTRE",
             "start_date": "2025-09-15", "end_date": "2025-12-20", "order": 1},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "Trimestre 1"
        assert data["is_closed"] is False

    def test_create_period_overlap_raises_422(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("schoolyear-periods", args=[sy.id]),
            {"name": "Trimestre 1 bis", "type": "TRIMESTRE",
             "start_date": "2025-10-01", "end_date": "2026-01-15", "order": 2},
            format="json",
        )
        assert resp.status_code == 400
        assert "chevauche" in resp.json()["message"]

    def test_close_period(self, director_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        period = AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("period-close", args=[period.id]),
            {},
            format="json",
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["is_closed"] is True

    def test_close_period_unauthorized_for_teacher(self, teacher_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        period = AcademicPeriod.objects.create(
            tenant=tenant, school_year=sy,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("period-close", args=[period.id]), {}, format="json",
        )
        assert resp.status_code == 403
        period.refresh_from_db()
        assert period.is_closed is False

    def test_create_period_unauthorized_for_teacher(self, teacher_user, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("schoolyear-periods", args=[sy.id]),
            {"name": "Trimestre 1", "type": "TRIMESTRE",
             "start_date": "2025-09-15", "end_date": "2025-12-20", "order": 1},
            format="json",
        )
        assert resp.status_code == 403
