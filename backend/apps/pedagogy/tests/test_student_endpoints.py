import datetime

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, Student, Guardian, Enrollment,
)


def _add_eleves_create(role):
    perm, _ = Permission.objects.get_or_create(
        codename="eleves:create",
        defaults={"name": "Créer / inscrire un élève", "module": "eleves"},
    )
    role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Stu", max_students=200, max_staff=20)


@pytest.fixture
def small_plan(db):
    return Plan.objects.create(name="Plan Mini", max_students=1, max_staff=5)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Stu A", slug="ecole-stu-a",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir A", contact_phone="+224620000001",
        contact_email="dir@stu-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Stu B", slug="ecole-stu-b",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir B", contact_phone="+224620000002",
        contact_email="dir@stu-b.gn",
    )


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"description": "Directeur"}
    )[0]
    _add_eleves_create(role)
    return role


@pytest.fixture
def teacher_role(db):
    return Role.objects.get_or_create(
        name="TEACHER", defaults={"description": "Enseignant"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="dir-stu", email="dir-stu@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teach-stu", email="teach-stu@ecole.gn",
        password="SecurePass123!", role=teacher_role, tenant=tenant,
    )


@pytest.fixture
def active_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
        status=SchoolYear.Status.ACTIVE,
    )


@pytest.fixture
def prep_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2026-2027",
        start_date=datetime.date(2026, 9, 15), end_date=datetime.date(2027, 7, 10),
        status=SchoolYear.Status.PREPARATION,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
    )


@pytest.fixture
def school_class(tenant, active_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=active_year, level=level, name="6ème A", capacity=50
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


def _payload(school_class, active_year, **overrides):
    data = {
        "nom": "Camara",
        "prenom": "Fatoumata",
        "date_naissance": "2013-03-22",
        "lieu_naissance": "Kindia",
        "sexe": "F",
        "classe_id": str(school_class.id),
        "school_year_id": str(active_year.id),
        "type_inscription": "NOUVELLE_INSCRIPTION",
        "guardian": {
            "lien": "MERE",
            "nom_complet": "Mariama Camara",
            "telephone": "+224655112233",
            "email": "",
            "is_contact_urgence": True,
        },
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestStudentEnrollment:
    def test_create_student_success(self, director_user, school_class, active_year):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        assert resp.status_code == 201, resp.content
        data = resp.json()["data"]
        assert data["matricule"] == "2025-00001"
        assert data["nom"] == "Camara"
        assert data["statut"] == "ACTIF"
        assert data["classe_actuelle"]["name"] == "6ème A"
        assert len(data["guardians"]) == 1
        assert data["guardians"][0]["lien"] == "MERE"
        # Enrollment + Guardian créés dans la même transaction
        student = Student.objects.get(id=data["id"])
        assert student.enrollments.count() == 1
        assert student.enrollments.first().type_inscription == "NOUVELLE_INSCRIPTION"
        assert student.annee_inscription == active_year
        assert Guardian.objects.filter(student=student).count() == 1

    def test_create_student_unauthorized_for_teacher(
        self, teacher_user, school_class, active_year
    ):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        assert resp.status_code == 403

    def test_invalid_guardian_phone_returns_400(
        self, director_user, school_class, active_year
    ):
        client = login_client(APIClient(), director_user.email)
        payload = _payload(school_class, active_year)
        payload["guardian"]["telephone"] = "0655112233"
        resp = client.post(reverse("student-list"), payload, format="json")
        assert resp.status_code == 400
        errors = resp.json()["errors"]
        assert "guardian" in errors
        assert "telephone" in errors["guardian"]

    def test_year_not_open_returns_422(
        self, director_user, tenant, prep_year, level
    ):
        classe = SchoolClass.objects.create(
            tenant=tenant, school_year=prep_year, level=level,
            name="6ème B", capacity=50,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-list"),
            _payload(classe, prep_year),
            format="json",
        )
        assert resp.status_code == 422
        assert "année scolaire ouverte" in resp.json()["message"]

    def test_capacity_full_returns_422(
        self, director_user, tenant, active_year, level
    ):
        classe = SchoolClass.objects.create(
            tenant=tenant, school_year=active_year, level=level,
            name="6ème C", capacity=1,
        )
        client = login_client(APIClient(), director_user.email)
        first = client.post(
            reverse("student-list"),
            _payload(classe, active_year, nom="Un", prenom="Premier"),
            format="json",
        )
        assert first.status_code == 201
        second = client.post(
            reverse("student-list"),
            _payload(classe, active_year, nom="Deux", prenom="Second"),
            format="json",
        )
        assert second.status_code == 422
        assert "capacité" in second.json()["message"]

    def test_plan_limit_returns_422(
        self, small_plan, level
    ):
        tenant = Tenant.objects.create(
            name="École Mini", slug="ecole-mini",
            school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
            plan=small_plan, contact_name="Dir", contact_phone="+224620000009",
            contact_email="dir@mini.gn",
        )
        role = Role.objects.get_or_create(
            name="DIRECTOR", defaults={"description": "Directeur"}
        )[0]
        _add_eleves_create(role)
        user = User.objects.create_user(
            username="dir-mini", email="dir-mini@ecole.gn",
            password="SecurePass123!", role=role, tenant=tenant,
        )
        year = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        classe = SchoolClass.objects.create(
            tenant=tenant, school_year=year, level=level, name="6ème A", capacity=50
        )
        client = login_client(APIClient(), user.email)
        first = client.post(
            reverse("student-list"),
            _payload(classe, year, nom="A", prenom="Un"),
            format="json",
        )
        assert first.status_code == 201
        second = client.post(
            reverse("student-list"),
            _payload(classe, year, nom="B", prenom="Deux"),
            format="json",
        )
        assert second.status_code == 422
        assert "plan" in second.json()["message"].lower()


@pytest.mark.django_db
class TestDuplicateDetection:
    def test_duplicate_returns_409_with_candidate(
        self, director_user, school_class, active_year
    ):
        client = login_client(APIClient(), director_user.email)
        first = client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        assert first.status_code == 201
        existing_matricule = first.json()["data"]["matricule"]

        second = client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        assert second.status_code == 409
        body = second.json()
        assert "similaires" in body["message"]
        candidate = body["errors"]["duplicate_candidate"]
        assert candidate["matricule"] == existing_matricule
        assert candidate["similarity"] == "nom+prenom+date_naissance identiques"

    def test_force_true_bypasses_duplicate(
        self, director_user, school_class, active_year
    ):
        client = login_client(APIClient(), director_user.email)
        client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        forced = client.post(
            reverse("student-list") + "?force=true",
            _payload(school_class, active_year),
            format="json",
        )
        assert forced.status_code == 201
        assert Student.objects.filter(nom="Camara", prenom="Fatoumata").count() == 2

    def test_no_duplicate_when_only_name_matches(
        self, director_user, school_class, active_year
    ):
        client = login_client(APIClient(), director_user.email)
        client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        other = client.post(
            reverse("student-list"),
            _payload(school_class, active_year, date_naissance="2014-01-01"),
            format="json",
        )
        assert other.status_code == 201


@pytest.mark.django_db
class TestEnrollmentAtomicity:
    def test_no_partial_record_on_duplicate(
        self, director_user, school_class, active_year
    ):
        client = login_client(APIClient(), director_user.email)
        client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        students_before = Student.objects.count()
        guardians_before = Guardian.objects.count()
        enrollments_before = Enrollment.objects.count()

        resp = client.post(
            reverse("student-list"),
            _payload(school_class, active_year),
            format="json",
        )
        assert resp.status_code == 409
        assert Student.objects.count() == students_before
        assert Guardian.objects.count() == guardians_before
        assert Enrollment.objects.count() == enrollments_before


@pytest.mark.django_db
class TestStudentTenantIsolationEndpoint:
    def test_cannot_enroll_in_other_tenant_class(
        self, director_user, tenant_b, level
    ):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        classe_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6ème Z", capacity=50
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-list"),
            _payload(classe_b, year_b),
            format="json",
        )
        assert resp.status_code == 400
        assert "classe_id" in resp.json()["errors"]
