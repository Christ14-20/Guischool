import datetime

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, Student, Guardian, Attendance,
)
from apps.pedagogy.tasks import lock_stale_attendances


def _add_attendance_create(role):
    perm, _ = Permission.objects.get_or_create(
        codename="attendance:create",
        defaults={"name": "Saisir les présences", "module": "attendance"},
    )
    role.permissions.add(perm)


def _add_attendance_justify(role):
    perm, _ = Permission.objects.get_or_create(
        codename="attendance:justify",
        defaults={"name": "Justifier une absence", "module": "attendance"},
    )
    role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Att", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Att A", slug="ecole-att-a",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir A", contact_phone="+224620000021",
        contact_email="dir@att-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Att B", slug="ecole-att-b",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE,
        plan=plan, contact_name="Dir B", contact_phone="+224620000022",
        contact_email="dir@att-b.gn",
    )


@pytest.fixture
def teacher_role(db):
    role = Role.objects.get_or_create(
        name="TEACHER", defaults={"description": "Enseignant"}
    )[0]
    _add_attendance_create(role)
    return role


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"description": "Directeur"}
    )[0]
    _add_attendance_create(role)
    _add_attendance_justify(role)
    return role


@pytest.fixture
def parent_role(db):
    return Role.objects.get_or_create(
        name="PARENT", defaults={"description": "Parent"}
    )[0]


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teach-att", email="teach-att@ecole.gn",
        password="SecurePass123!", role=teacher_role, tenant=tenant,
    )


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="dir-att", email="dir-att@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant,
    )


@pytest.fixture
def parent_user(tenant, parent_role):
    return User.objects.create_user(
        username="parent-att", email="parent-att@ecole.gn",
        password="SecurePass123!", role=parent_role, tenant=tenant,
    )


@pytest.fixture
def active_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
        status=SchoolYear.Status.ACTIVE,
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


_COUNTER = {"n": 0}


def _make_student(tenant, active_year, school_class, with_guardian=True, **overrides):
    _COUNTER["n"] += 1
    defaults = dict(
        tenant=tenant, matricule=f"2025-{_COUNTER['n']:05d}",
        nom="Camara", prenom=f"Eleve{_COUNTER['n']}",
        date_naissance=datetime.date(2013, 3, 22), sexe=Student.Sexe.F,
        lieu_naissance="Kindia", classe_actuelle=school_class,
        annee_inscription=active_year,
    )
    defaults.update(overrides)
    student = Student.objects.create(**defaults)
    if with_guardian:
        Guardian.objects.create(
            tenant=tenant, student=student, lien=Guardian.Lien.MERE,
            nom_complet="Mariama Camara", telephone="+224655112233",
            is_contact_urgence=True,
        )
    return student


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


DATE = "2025-10-06"


@pytest.mark.django_db
class TestAttendanceCreate:
    def test_batch_create_success(self, teacher_user, tenant, active_year, school_class):
        s1 = _make_student(tenant, active_year, school_class)
        s2 = _make_student(tenant, active_year, school_class)
        client = login_client(APIClient(), teacher_user.email)
        payload = {
            "classe_id": str(school_class.id),
            "date": DATE,
            "records": [
                {"student_id": str(s1.id), "status": "PRESENT"},
                {"student_id": str(s2.id), "status": "ABSENT"},
            ],
        }
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["created_count"] == 2
        assert data["classe_id"] == str(school_class.id)
        assert data["sms_queued_for"] == [str(s2.id)]
        assert Attendance.objects.filter(tenant=tenant).count() == 2

    def test_absent_without_guardian_not_queued(
        self, teacher_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class, with_guardian=False)
        client = login_client(APIClient(), teacher_user.email)
        payload = {
            "classe_id": str(school_class.id),
            "date": DATE,
            "records": [{"student_id": str(s1.id), "status": "ABSENT"}],
        }
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 201
        assert resp.json()["data"]["sms_queued_for"] == []

    def test_duplicate_returns_409(self, teacher_user, tenant, active_year, school_class):
        s1 = _make_student(tenant, active_year, school_class)
        client = login_client(APIClient(), teacher_user.email)
        payload = {
            "classe_id": str(school_class.id),
            "date": DATE,
            "records": [{"student_id": str(s1.id), "status": "PRESENT"}],
        }
        assert client.post(reverse("attendance-list"), payload, format="json").status_code == 201
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 409
        assert "06/10/2025" in resp.json()["message"]
        assert "PATCH" in resp.json()["message"]

    def test_student_not_in_class_returns_422(
        self, teacher_user, tenant, active_year, level, school_class
    ):
        other_class = SchoolClass.objects.create(
            tenant=tenant, school_year=active_year, level=level, name="6ème B", capacity=50
        )
        s_other = _make_student(tenant, active_year, other_class)
        client = login_client(APIClient(), teacher_user.email)
        payload = {
            "classe_id": str(school_class.id),
            "date": DATE,
            "records": [{"student_id": str(s_other.id), "status": "PRESENT"}],
        }
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 422

    def test_class_not_in_tenant_returns_404(
        self, teacher_user, tenant_b, plan
    ):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6ème A", capacity=50
        )
        client = login_client(APIClient(), teacher_user.email)
        payload = {"classe_id": str(class_b.id), "date": DATE, "records": [
            {"student_id": str(class_b.id), "status": "PRESENT"}
        ]}
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 404

    def test_permission_denied_without_perm(
        self, parent_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        client = login_client(APIClient(), parent_user.email)
        payload = {"classe_id": str(school_class.id), "date": DATE, "records": [
            {"student_id": str(s1.id), "status": "PRESENT"}
        ]}
        resp = client.post(reverse("attendance-list"), payload, format="json")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestAttendanceList:
    def test_list_open_to_authenticated(
        self, parent_user, teacher_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        client = login_client(APIClient(), parent_user.email)
        resp = client.get(reverse("attendance-list"))
        assert resp.status_code == 200
        rows = resp.json()["data"]
        assert len(rows) == 1
        assert set(rows[0].keys()) == {"id", "student_id", "date", "status", "is_locked"}

    def test_filter_by_class_and_date(
        self, teacher_user, tenant, active_year, level, school_class
    ):
        other_class = SchoolClass.objects.create(
            tenant=tenant, school_year=active_year, level=level, name="6ème B", capacity=50
        )
        s1 = _make_student(tenant, active_year, school_class)
        s2 = _make_student(tenant, active_year, other_class)
        Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        Attendance.objects.create(
            tenant=tenant, student=s2, classe=other_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.get(
            reverse("attendance-list") + f"?classe_id={school_class.id}&date=2025-10-06"
        )
        rows = resp.json()["data"]
        assert len(rows) == 1
        assert rows[0]["student_id"] == str(s1.id)

    def test_list_isolated_per_tenant(
        self, teacher_user, tenant, tenant_b, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6ème A", capacity=50
        )
        s_b = _make_student(tenant_b, year_b, class_b)
        Attendance.objects.create(
            tenant=tenant_b, student=s_b, classe=class_b,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.get(reverse("attendance-list"))
        assert len(resp.json()["data"]) == 1


@pytest.mark.django_db
class TestAttendancePatch:
    def test_patch_updates_status(self, teacher_user, tenant, active_year, school_class):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("attendance-detail", args=[att.id]),
            {"status": "RETARD", "minutes_late": 10}, format="json",
        )
        assert resp.status_code == 200
        att.refresh_from_db()
        assert att.status == "RETARD"
        assert att.minutes_late == 10

    def test_patch_locked_returns_422(self, teacher_user, tenant, active_year, school_class):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
            is_locked=True,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("attendance-detail", args=[att.id]),
            {"status": "PRESENT"}, format="json",
        )
        assert resp.status_code == 422
        att.refresh_from_db()
        assert att.status == "ABSENT"

    def test_patch_cross_tenant_returns_404(
        self, teacher_user, tenant_b, plan
    ):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6ème A", capacity=50
        )
        s_b = _make_student(tenant_b, year_b, class_b)
        att_b = Attendance.objects.create(
            tenant=tenant_b, student=s_b, classe=class_b,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("attendance-detail", args=[att_b.id]),
            {"status": "ABSENT"}, format="json",
        )
        assert resp.status_code == 404


@pytest.mark.django_db
class TestLockStaleAttendances:
    def test_locks_records_older_than_24h(self, tenant, active_year, school_class):
        s1 = _make_student(tenant, active_year, school_class)
        s2 = _make_student(tenant, active_year, school_class)
        old = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 5), status=Attendance.Status.PRESENT,
        )
        recent = Attendance.objects.create(
            tenant=tenant, student=s2, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.PRESENT,
        )
        Attendance.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - datetime.timedelta(hours=30)
        )
        locked = lock_stale_attendances()
        old.refresh_from_db()
        recent.refresh_from_db()
        assert locked == 1
        assert old.is_locked is True
        assert recent.is_locked is False


@pytest.mark.django_db
class TestAttendanceJustify:
    def test_justify_sets_absent_justifie(
        self, director_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[att.id]),
            {"justification_text": "Certificat médical remis le 07/10"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "ABSENT_JUSTIFIE"
        att.refresh_from_db()
        assert att.status == "ABSENT_JUSTIFIE"
        assert att.justification_text == "Certificat médical remis le 07/10"

    def test_justify_locked_returns_422(
        self, director_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
            is_locked=True,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[att.id]),
            {"justification_text": "Retard justifié"}, format="json",
        )
        assert resp.status_code == 422
        assert "verrouillé" in resp.json()["message"]
        att.refresh_from_db()
        assert att.status == "ABSENT"

    def test_justify_requires_text(
        self, director_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[att.id]), {}, format="json"
        )
        assert resp.status_code == 400

    def test_teacher_cannot_justify(
        self, teacher_user, tenant, active_year, school_class
    ):
        s1 = _make_student(tenant, active_year, school_class)
        att = Attendance.objects.create(
            tenant=tenant, student=s1, classe=school_class,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), teacher_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[att.id]),
            {"justification_text": "Absence"}, format="json",
        )
        assert resp.status_code == 403
        att.refresh_from_db()
        assert att.status == "ABSENT"

    def test_justify_cross_tenant_returns_404(
        self, director_user, tenant_b
    ):
        year_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date=datetime.date(2025, 9, 15), end_date=datetime.date(2026, 7, 10),
            status=SchoolYear.Status.ACTIVE,
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=year_b, level=level_b, name="6ème A", capacity=50
        )
        s_b = _make_student(tenant_b, year_b, class_b)
        att_b = Attendance.objects.create(
            tenant=tenant_b, student=s_b, classe=class_b,
            date=datetime.date(2025, 10, 6), status=Attendance.Status.ABSENT,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[att_b.id]),
            {"justification_text": "Absence"}, format="json",
        )
        assert resp.status_code == 404
