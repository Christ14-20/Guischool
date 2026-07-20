import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import Level, SchoolClass, SchoolYear


def _add_pedagogy_permissions(role):
    codenames = ["pedagogy:create:schoolyear", "pedagogy:create:period"]
    for codename in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": codename, "module": "pedagogy"},
        )
        role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Cls",
        slug="ecole-test-cls",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test-cls.gn",
    )


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
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
        username="director-cls",
        email="director-cls@ecole-test.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teacher-cls",
        email="teacher-cls@ecole-test.gn",
        password="SecurePass123!",
        role=teacher_role,
        tenant=tenant,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE,
        name="6ème", order_index=7,
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date="2025-09-15", end_date="2026-07-10",
        status=SchoolYear.Status.ACTIVE,
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
class TestSchoolClassModel:
    def test_class_has_all_schema_fields(self, tenant, school_year, level):
        cls = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level,
            name="6ème A", capacity=50, room="Salle 12",
        )
        required_fields = [
            "id", "tenant", "school_year", "level", "name",
            "capacity", "room", "main_teacher",
            "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(cls, field), f"Missing field: {field}"

    def test_class_default_capacity(self, tenant, school_year, level):
        cls = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level,
            name="6ème B",
        )
        assert cls.capacity == 60

    def test_class_unique_name_per_year(self, tenant, school_year, level):
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level,
            name="6ème A",
        )
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            SchoolClass.objects.create(
                tenant=tenant, school_year=school_year, level=level,
                name="6ème A",
            )

    def test_same_name_different_year(self, tenant, plan, level, school_year):
        sy2 = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date="2026-09-15", end_date="2027-07-10",
        )
        c1 = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème A",
        )
        c2 = SchoolClass.objects.create(
            tenant=tenant, school_year=sy2, level=level, name="6ème A",
        )
        assert c1.id != c2.id

    def test_current_headcount_returns_zero(self, tenant, school_year, level):
        cls = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level,
            name="6ème A",
        )
        assert cls.current_headcount == 0

    def test_class_str(self, tenant, school_year, level):
        cls = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level,
            name="6ème A",
        )
        assert str(cls) == "6ème A (2025-2026)"


@pytest.mark.django_db
class TestClassEndpoints:
    def test_list_classes_empty(self, director_user):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-list"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["data"]["results"]) == 0

    def test_create_class(self, director_user, tenant, school_year, level):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-list"),
            {
                "school_year": str(school_year.id),
                "level_id": str(level.id),
                "name": "6ème A",
                "capacity": 50,
                "room": "Salle 12",
            },
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "success"
        assert data["data"]["name"] == "6ème A"
        assert data["data"]["current_headcount"] == 0
        assert data["data"]["level"]["name"] == "6ème"

    def test_create_class_with_main_teacher(self, director_user, tenant, school_year, level):
        teacher = User.objects.create_user(
            username="teacher-main",
            email="teacher-main@ecole-test.gn",
            password="SecurePass123!",
            role=Role.objects.get_or_create(name="TEACHER", defaults={"label": "Teacher"})[0],
            tenant=tenant,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-list"),
            {
                "school_year": str(school_year.id),
                "level_id": str(level.id),
                "name": "6ème A",
                "main_teacher_id": str(teacher.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["main_teacher"]["first_name"] == ""

    def test_create_class_unauthorized_for_teacher(self, teacher_user, school_year, level):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("class-list"),
            {
                "school_year": str(school_year.id),
                "level_id": str(level.id),
                "name": "6ème A",
            },
            format="json",
        )
        assert resp.status_code == 403

    def test_list_classes_filter_by_school_year(self, director_user, tenant, school_year, level):
        sy2 = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date="2026-09-15", end_date="2027-07-10",
        )
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème A",
        )
        SchoolClass.objects.create(
            tenant=tenant, school_year=sy2, level=level, name="6ème A",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-list"), {"school_year_id": school_year.id})
        assert resp.status_code == 200
        assert len(resp.json()["data"]["results"]) == 1

    def test_list_classes_filter_by_level(self, director_user, tenant, school_year, level):
        level_b = Level.objects.create(
            tenant=tenant, name="5ème", cycle=Level.Cycle.COLLEGE, order_index=8,
        )
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème A",
        )
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level_b, name="5ème A",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-list"), {"level_id": level_b.id})
        assert resp.status_code == 200
        assert len(resp.json()["data"]["results"]) == 1
        assert resp.json()["data"]["results"][0]["name"] == "5ème A"

    def test_list_classes_search(self, director_user, tenant, school_year, level):
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème A",
        )
        SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème B",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-list"), {"search": "B"})
        assert resp.status_code == 200
        assert len(resp.json()["data"]["results"]) == 1
        assert resp.json()["data"]["results"][0]["name"] == "6ème B"

    def test_class_isolation(self, tenant, plan, director_user):
        tenant_b = Tenant.objects.create(
            name="École B Cls",
            slug="ecole-b-cls",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b-cls.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE,
            name="6ème", order_index=7,
        )
        SchoolClass.objects.create(
            tenant=tenant_b, school_year=sy_b, level=level_b, name="6ème B",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-list"))
        assert resp.status_code == 200
        assert len(resp.json()["data"]["results"]) == 0
