import datetime

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, Student, Guardian, Enrollment,
)


ELEVES_PERMS = [
    ("eleves:create", "Créer / inscrire un élève"),
    ("eleves:read", "Consulter les élèves"),
    ("eleves:update", "Modifier / réinscrire / archiver un élève"),
]


def _add_eleves_perms(role):
    for codename, name in ELEVES_PERMS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"name": name, "module": "eleves"}
        )
        role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Crud", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Crud A", slug="ecole-crud-a",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir A", contact_phone="+224620000011",
        contact_email="dir@crud-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Crud B", slug="ecole-crud-b",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir B", contact_phone="+224620000012",
        contact_email="dir@crud-b.gn",
    )


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"description": "Directeur"}
    )[0]
    _add_eleves_perms(role)
    return role


@pytest.fixture
def teacher_role(db):
    return Role.objects.get_or_create(
        name="TEACHER", defaults={"description": "Enseignant"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="dir-crud", email="dir-crud@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teach-crud", email="teach-crud@ecole.gn",
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
def next_year_prep(tenant):
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


def _make_student(tenant, active_year, school_class, **overrides):
    defaults = dict(
        tenant=tenant, matricule="2025-00001", nom="Camara", prenom="Fatoumata",
        date_naissance=datetime.date(2013, 3, 22), sexe=Student.Sexe.F,
        lieu_naissance="Kindia", classe_actuelle=school_class,
        annee_inscription=active_year,
    )
    defaults.update(overrides)
    student = Student.objects.create(**defaults)
    Guardian.objects.create(
        tenant=tenant, student=student, lien=Guardian.Lien.MERE,
        nom_complet="Mariama Camara", telephone="+224655112233",
        is_contact_urgence=True,
    )
    Enrollment.objects.create(
        tenant=tenant, student=student, classe=school_class, school_year=active_year,
        type_inscription=Enrollment.TypeInscription.NOUVELLE,
    )
    return student


@pytest.fixture
def student(tenant, active_year, school_class):
    return _make_student(tenant, active_year, school_class)


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
class TestStudentList:
    def test_list_paginated(self, director_user, tenant, active_year, school_class):
        for i in range(3):
            _make_student(
                tenant, active_year, school_class,
                matricule=f"2025-0000{i+1}", nom=f"Nom{i}", prenom=f"Prenom{i}",
            )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-list"))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["count"] == 3
        assert len(data["results"]) == 3
        first = data["results"][0]
        assert set(first.keys()) == {
            "id", "matricule", "nom", "prenom", "classe_actuelle", "statut",
            "guardian_phone",
        }
        assert first["guardian_phone"] == "+224655112233"

    def test_filter_by_statut(self, director_user, tenant, active_year, school_class):
        _make_student(tenant, active_year, school_class, matricule="2025-00001",
                      nom="Actif", prenom="Un")
        _make_student(tenant, active_year, school_class, matricule="2025-00002",
                      nom="Archive", prenom="Deux", statut=Student.Status.ARCHIVE)
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-list") + "?statut=ARCHIVE")
        results = resp.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["nom"] == "Archive"

    def test_filter_by_classe(self, director_user, tenant, active_year, level, school_class):
        other_class = SchoolClass.objects.create(
            tenant=tenant, school_year=active_year, level=level, name="6ème B", capacity=50
        )
        _make_student(tenant, active_year, school_class, matricule="2025-00001",
                      nom="ClasseA", prenom="Un")
        _make_student(tenant, active_year, other_class, matricule="2025-00002",
                      nom="ClasseB", prenom="Deux")
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-list") + f"?classe_id={other_class.id}")
        results = resp.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["nom"] == "ClasseB"

    def test_search_by_name(self, director_user, tenant, active_year, school_class):
        _make_student(tenant, active_year, school_class, matricule="2025-00001",
                      nom="Camara", prenom="Fatou")
        _make_student(tenant, active_year, school_class, matricule="2025-00002",
                      nom="Diallo", prenom="Amadou")
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-list") + "?search=diallo")
        results = resp.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["nom"] == "Diallo"

    def test_list_forbidden_for_teacher(self, teacher_user):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.get(reverse("student-list"))
        assert resp.status_code == 403

    def test_list_isolated_by_tenant(self, director_user, tenant_b, plan):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6Z", capacity=50
        )
        _make_student(tenant_b, year_b, class_b, matricule="2025-09999",
                      nom="Autre", prenom="Tenant")
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-list"))
        assert resp.json()["data"]["count"] == 0


@pytest.mark.django_db
class TestStudentDetail:
    def test_retrieve(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-detail", args=[student.id]))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["matricule"] == "2025-00001"
        assert len(data["enrollments"]) == 1
        assert data["enrollments"][0]["type_inscription"] == "NOUVELLE_INSCRIPTION"
        assert len(data["guardians"]) == 1

    def test_retrieve_cross_tenant_404(self, director_user, tenant_b, plan):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6Z", capacity=50
        )
        other = _make_student(tenant_b, year_b, class_b, matricule="2025-09999",
                              nom="Autre", prenom="Tenant")
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("student-detail", args=[other.id]))
        assert resp.status_code == 404


@pytest.mark.django_db
class TestStudentUpdate:
    def test_patch_success(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("student-detail", args=[student.id]),
            {"lieu_naissance": "Conakry"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["lieu_naissance"] == "Conakry"
        student.refresh_from_db()
        assert student.lieu_naissance == "Conakry"

    def test_patch_forbidden_for_teacher(self, teacher_user, student):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("student-detail", args=[student.id]),
            {"lieu_naissance": "Conakry"},
            format="json",
        )
        assert resp.status_code == 403

    def test_patch_cross_tenant_404(self, director_user, tenant_b, plan):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6Z", capacity=50
        )
        other = _make_student(tenant_b, year_b, class_b, matricule="2025-09999",
                              nom="Autre", prenom="Tenant")
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("student-detail", args=[other.id]),
            {"lieu_naissance": "Conakry"}, format="json",
        )
        assert resp.status_code == 404


@pytest.mark.django_db
class TestReinscription:
    def test_reinscription_success(
        self, director_user, student, tenant, level
    ):
        target_year = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date=datetime.date(2026, 9, 15), end_date=datetime.date(2027, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        target_class = SchoolClass.objects.create(
            tenant=tenant, school_year=target_year, level=level, name="5ème A", capacity=50
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-reinscription", args=[student.id]),
            {"classe_id": str(target_class.id), "school_year_id": str(target_year.id)},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        data = resp.json()["data"]
        assert data["type_inscription"] == "REINSCRIPTION"
        assert data["classe"]["name"] == "5ème A"
        assert data["school_year"]["label"] == "2026-2027"
        student.refresh_from_db()
        assert student.classe_actuelle_id == target_class.id
        assert student.enrollments.count() == 2

    def test_reinscription_year_not_open_422(
        self, director_user, student, tenant, next_year_prep, level
    ):
        target_class = SchoolClass.objects.create(
            tenant=tenant, school_year=next_year_prep, level=level, name="5ème B", capacity=50
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-reinscription", args=[student.id]),
            {"classe_id": str(target_class.id), "school_year_id": str(next_year_prep.id)},
            format="json",
        )
        assert resp.status_code == 422

    def test_reinscription_non_actif_422(
        self, director_user, tenant, active_year, school_class, level
    ):
        archived = _make_student(
            tenant, active_year, school_class, matricule="2025-00002",
            nom="Sorti", prenom="Un", statut=Student.Status.ARCHIVE,
        )
        target_year = SchoolYear.objects.create(
            tenant=tenant, label="2026-2027",
            start_date=datetime.date(2026, 9, 15), end_date=datetime.date(2027, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        target_class = SchoolClass.objects.create(
            tenant=tenant, school_year=target_year, level=level, name="5ème A", capacity=50
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-reinscription", args=[archived.id]),
            {"classe_id": str(target_class.id), "school_year_id": str(target_year.id)},
            format="json",
        )
        assert resp.status_code == 422
        assert "décision" in resp.json()["message"].lower()

    def test_reinscription_duplicate_year_409(
        self, director_user, student, tenant, active_year, school_class
    ):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-reinscription", args=[student.id]),
            {"classe_id": str(school_class.id), "school_year_id": str(active_year.id)},
            format="json",
        )
        assert resp.status_code == 409


@pytest.mark.django_db
class TestArchiver:
    def test_archiver_success(self, director_user, student):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-archiver", args=[student.id]),
            {"motif": "Fin de scolarité"},
            format="json",
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["statut"] == "ARCHIVE"
        student.refresh_from_db()
        assert student.statut == Student.Status.ARCHIVE

    def test_archiver_forbidden_for_teacher(self, teacher_user, student):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("student-archiver", args=[student.id]),
            {"motif": "x"}, format="json",
        )
        assert resp.status_code == 403

    def test_archiver_cross_tenant_404(self, director_user, tenant_b, plan):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6Z", capacity=50
        )
        other = _make_student(tenant_b, year_b, class_b, matricule="2025-09999",
                              nom="Autre", prenom="Tenant")
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("student-archiver", args=[other.id]),
            {"motif": "x"}, format="json",
        )
        assert resp.status_code == 404
