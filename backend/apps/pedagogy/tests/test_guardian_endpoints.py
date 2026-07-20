import datetime

import pytest
from django.db import IntegrityError
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import Level, SchoolClass, SchoolYear, Student, Guardian


def _add_eleves_create(role):
    perm, _ = Permission.objects.get_or_create(
        codename="eleves:create",
        defaults={"name": "Créer / inscrire un élève", "module": "eleves"},
    )
    role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Grd", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Guardian A",
        slug="ecole-guardian-a",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Dir A",
        contact_phone="+224620000001",
        contact_email="dir@guardian-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Guardian B",
        slug="ecole-guardian-b",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Dir B",
        contact_phone="+224620000002",
        contact_email="dir@guardian-b.gn",
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
        username="dir-grd",
        email="dir-grd@ecole.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teach-grd",
        email="teach-grd@ecole.gn",
        password="SecurePass123!",
        role=teacher_role,
        tenant=tenant,
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date=datetime.date(2025, 9, 15),
        end_date=datetime.date(2026, 7, 10),
        status=SchoolYear.Status.ACTIVE,
    )


@pytest.fixture
def student(tenant, school_year):
    return Student.objects.create(
        tenant=tenant,
        matricule="2025-00001",
        nom="Camara",
        prenom="Fatoumata",
        date_naissance=datetime.date(2013, 3, 22),
        sexe=Student.Sexe.F,
        annee_inscription=school_year,
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


VALID_GUARDIAN = {
    "lien": "MERE",
    "nom_complet": "Mariama Camara",
    "telephone": "+224655112233",
    "email": "",
    "is_contact_urgence": True,
}


@pytest.mark.django_db
class TestGuardianModel:
    def test_guardian_has_all_schema_fields(self, tenant, student):
        g = Guardian.objects.create(
            tenant=tenant,
            student=student,
            lien=Guardian.Lien.MERE,
            nom_complet="Mariama Camara",
            telephone="+224655112233",
            is_contact_urgence=True,
        )
        assert g.student == student
        assert g.lien == "MERE"
        assert g.nom_complet == "Mariama Camara"
        assert g.telephone == "+224655112233"
        assert g.is_contact_urgence is True
        assert g.user is None

    def test_lien_choices(self):
        assert set(Guardian.Lien.values) == {"PERE", "MERE", "TUTEUR", "AUTRE"}

    def test_guardian_cascade_on_student_delete(self, tenant, student):
        Guardian.objects.create(
            tenant=tenant, student=student, lien=Guardian.Lien.PERE,
            nom_complet="Sekou Camara", telephone="+224655000000",
        )
        student.delete()
        assert Guardian.objects.filter(student_id=student.id).count() == 0

    def test_guardian_str(self, tenant, student):
        g = Guardian.objects.create(
            tenant=tenant, student=student, lien=Guardian.Lien.TUTEUR,
            nom_complet="Oumar Diallo", telephone="+224655000001",
        )
        assert "Oumar Diallo" in str(g)


@pytest.mark.django_db
class TestGuardianEndpoints:
    def test_list_guardians_empty(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student.id])
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_create_guardian(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student.id])
        resp = client.post(url, VALID_GUARDIAN, format="json")
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["lien"] == "MERE"
        assert data["nom_complet"] == "Mariama Camara"
        assert data["telephone"] == "+224655112233"
        assert Guardian.objects.filter(student=student).count() == 1

    def test_create_guardian_invalid_phone(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student.id])
        payload = {**VALID_GUARDIAN, "telephone": "0655112233"}
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "telephone" in resp.json()["errors"]
        assert "Format attendu" in resp.json()["errors"]["telephone"][0]

    def test_create_guardian_unauthorized_for_teacher(self, teacher_user, student):
        client = login_client(APIClient(), teacher_user.email)
        url = reverse("student-guardians", args=[student.id])
        resp = client.post(url, VALID_GUARDIAN, format="json")
        assert resp.status_code == 403

    def test_list_guardians_after_create(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student.id])
        client.post(url, VALID_GUARDIAN, format="json")
        resp = client.get(url)
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    def test_guardians_404_for_wrong_tenant_student(
        self, director_user, tenant_b, plan
    ):
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date=datetime.date(2025, 9, 15),
            end_date=datetime.date(2026, 7, 10),
        )
        student_b = Student.objects.create(
            tenant=tenant_b,
            matricule="2025-00099",
            nom="Bah",
            prenom="Ibrahima",
            date_naissance=datetime.date(2012, 1, 1),
            sexe=Student.Sexe.M,
            annee_inscription=sy_b,
        )
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student_b.id])
        resp = client.get(url)
        assert resp.status_code == 404

    def test_guardians_404_for_nonexistent_student(self, director_user):
        import uuid

        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[uuid.uuid4()])
        resp = client.get(url)
        assert resp.status_code == 404

    def test_guardians_isolated_per_tenant(self, director_user, student, tenant_b):
        client = login_client(APIClient(), director_user.email)
        url = reverse("student-guardians", args=[student.id])
        client.post(url, VALID_GUARDIAN, format="json")
        assert Guardian.objects.filter(tenant=student.tenant).count() == 1
        assert Guardian.objects.filter(tenant=tenant_b).count() == 0
