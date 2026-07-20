import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import Level


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Lvl",
        slug="ecole-test-lvl",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test-lvl.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="director-lvl",
        email="director-lvl@ecole-test.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def seeded_levels(tenant):
    from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
    return seed_standard_levels_for_tenant(tenant)


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
class TestLevelModel:
    def test_level_has_all_schema_fields(self, tenant):
        level = Level.objects.create(
            tenant=tenant, cycle=Level.Cycle.COLLEGE,
            name="6ème", order_index=1,
        )
        required_fields = [
            "id", "tenant", "cycle", "name",
            "order_index", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(level, field), f"Missing field: {field}"

    def test_level_cycle_choices(self):
        choices = {c[0] for c in Level.Cycle.choices}
        assert choices == {"PRIMAIRE", "COLLEGE", "LYCEE"}

    def test_level_ordering(self, tenant):
        l1 = Level.objects.create(
            tenant=tenant, name="CM2", cycle=Level.Cycle.PRIMAIRE, order_index=6,
        )
        l2 = Level.objects.create(
            tenant=tenant, name="6ème", cycle=Level.Cycle.COLLEGE, order_index=7,
        )
        l3 = Level.objects.create(
            tenant=tenant, name="CP1", cycle=Level.Cycle.PRIMAIRE, order_index=1,
        )
        levels = list(Level.objects.filter(tenant=tenant))
        assert levels == [l3, l1, l2]

    def test_level_str(self, tenant):
        level = Level.objects.create(
            tenant=tenant, cycle=Level.Cycle.COLLEGE,
            name="6ème", order_index=7,
        )
        assert str(level) == "6ème"


@pytest.mark.django_db
class TestSeedStandardLevels:
    def test_seeds_all_13_levels(self, tenant):
        from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
        levels = seed_standard_levels_for_tenant(tenant)
        assert len(levels) == 13

    def test_seed_is_idempotent(self, tenant):
        from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
        seed_standard_levels_for_tenant(tenant)
        levels = seed_standard_levels_for_tenant(tenant)
        assert len(levels) == 0

    def test_levels_have_correct_cycles(self, tenant):
        from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
        seed_standard_levels_for_tenant(tenant)
        primaire = Level.objects.filter(tenant=tenant, cycle=Level.Cycle.PRIMAIRE)
        college = Level.objects.filter(tenant=tenant, cycle=Level.Cycle.COLLEGE)
        lycee = Level.objects.filter(tenant=tenant, cycle=Level.Cycle.LYCEE)
        assert primaire.count() == 6
        assert college.count() == 4
        assert lycee.count() == 3

    def test_seed_isolated_per_tenant(self, tenant, plan):
        tenant_b = Tenant.objects.create(
            name="École B Lvl",
            slug="ecole-b-lvl",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b-lvl.gn",
        )
        from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
        seed_standard_levels_for_tenant(tenant)
        seed_standard_levels_for_tenant(tenant_b)
        assert Level.objects.filter(tenant=tenant).count() == 13
        assert Level.objects.filter(tenant=tenant_b).count() == 13

    def test_create_school_seeds_levels(self, plan):
        from apps.superadmin.services.tenant_service import create_school
        data = {
            "name": "École Auto Seed",
            "school_type": "MIXTE",
            "contact_name": "Directeur Auto",
            "contact_phone": "+224620000099",
            "contact_email": "auto@seed-test.gn",
            "plan_id": plan.id,
        }
        tenant, _ = create_school(data)
        levels = Level.objects.filter(tenant=tenant)
        assert levels.count() == 13


@pytest.mark.django_db
class TestLevelEndpoints:
    def test_list_levels(self, director_user, seeded_levels):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("level-list"))
        assert resp.status_code == 200
        data = resp.json()
        # Non paginé (catalogue fixe)
        assert len(data) == 13

    def test_list_levels_filter_by_cycle(self, director_user, seeded_levels):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("level-list"), {"cycle": "COLLEGE"})
        assert resp.status_code == 200
        assert len(resp.json()) == 4
        for level in resp.json():
            assert level["cycle"] == "COLLEGE"

    def test_list_levels_isolated_per_tenant(self, tenant, plan, director_user, seeded_levels):
        tenant_b = Tenant.objects.create(
            name="École B Endpoint",
            slug="ecole-b-endpoint",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b-endpoint.gn",
        )
        director_role = Role.objects.get_or_create(
            name="DIRECTOR", defaults={"label": "Directeur"}
        )[0]
        user_b = User.objects.create_user(
            username="director-b-ep",
            email="director-b-ep@ecole-b.gn",
            password="SecurePass123!",
            role=director_role,
            tenant=tenant_b,
        )
        from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant
        seed_standard_levels_for_tenant(tenant_b)

        client = login_client(APIClient(), user_b.email)
        resp = client.get(reverse("level-list"))
        assert resp.status_code == 200
        assert len(resp.json()) == 13

        client_a = login_client(APIClient(), director_user.email)
        resp_a = client_a.get(reverse("level-list"))
        assert resp_a.status_code == 200
        assert len(resp_a.json()) == 13
