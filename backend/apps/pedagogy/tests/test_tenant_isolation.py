import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import SchoolYear, AcademicPeriod


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Isolation Plan", max_students=100, max_staff=10)


@pytest.fixture
def tenant_a(plan):
    return Tenant.objects.create(
        name="Pedagogy Tenant A",
        slug="ped-iso-a",
        school_type=Tenant.SchoolType.PRIMAIRE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur A",
        contact_phone="+224620000010",
        contact_email="a-ped@ecole-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="Pedagogy Tenant B",
        slug="ped-iso-b",
        school_type=Tenant.SchoolType.LYCEE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur B",
        contact_phone="+224620000011",
        contact_email="b-ped@ecole-b.gn",
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


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]
    _add_pedagogy_permissions(role)
    return role


@pytest.fixture
def user_a(tenant_a, director_role):
    return User.objects.create_user(
        username="director-a-ped",
        email="director-a-ped@ecole-a.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_a,
    )


@pytest.fixture
def user_b(tenant_b, director_role):
    return User.objects.create_user(
        username="director-b-ped",
        email="director-b-ped@ecole-b.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_b,
    )


def login(client, email):
    resp = client.post(
        reverse("auth-login"),
        {"email": email, "password": "SecurePass123!"},
        format="json",
    )
    assert resp.status_code == 200
    return resp.json()["data"]["access_token"]


@pytest.mark.django_db
@pytest.mark.tenant_isolation
class TestPedagogyTenantIsolation:
    def test_school_year_isolation(self, tenant_a, tenant_b, user_a, user_b):
        sy_a = SchoolYear.objects.create(
            tenant=tenant_a, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )

        client = APIClient()
        token_a = login(client, user_a.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # user_a doit voir son année scolaire
        resp = client.get(reverse("schoolyear-list"))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()["data"]["results"]]
        assert str(sy_a.id) in ids
        assert str(sy_b.id) not in ids

        # user_a ne doit pas pouvoir accéder au détail de sy_b
        resp = client.get(reverse("schoolyear-detail", args=[sy_b.id]))
        assert resp.status_code == 404

    def test_period_isolation(self, tenant_a, tenant_b, user_a, user_b):
        sy_a = SchoolYear.objects.create(
            tenant=tenant_a, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )

        period_a = AcademicPeriod.objects.create(
            tenant=tenant_a, school_year=sy_a,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        period_b = AcademicPeriod.objects.create(
            tenant=tenant_b, school_year=sy_b,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )

        client = APIClient()
        token_a = login(client, user_a.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # user_a ne voit pas les périodes de sy_b
        resp = client.get(reverse("schoolyear-periods", args=[sy_b.id]))
        assert resp.status_code == 404

        # user_a voit ses propres périodes
        resp = client.get(reverse("schoolyear-periods", args=[sy_a.id]))
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1
        assert resp.json()["data"][0]["name"] == "Trimestre 1"

    def test_cross_tenant_close_period_returns_404(self, tenant_a, tenant_b, user_a, user_b):
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        period_b = AcademicPeriod.objects.create(
            tenant=tenant_b, school_year=sy_b,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
        )
        client = APIClient()
        token_a = login(client, user_a.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        resp = client.patch(reverse("period-close", args=[period_b.id]), {}, format="json")
        assert resp.status_code == 404
