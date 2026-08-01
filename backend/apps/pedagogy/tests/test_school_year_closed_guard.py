"""
apps/pedagogy/tests/test_school_year_closed_guard.py — SCHOOLYEAR-V2-01

Vérifie qu'une fois une SchoolYear.status=CLOSED, aucune écriture n'est plus
possible sur les ressources qui s'y rattachent (directement ou via
classe/période/catégorie de frais), à travers le point central
assert_school_year_open().

Chaque écriture est mise en place pendant que l'année est encore ACTIVE puis
l'année est basculée à CLOSED directement en base (on ne teste pas ici le
workflow de clôture lui-même, couvert par test_school_year_service.py et
test_school_year_endpoints.py), avant d'appeler l'endpoint visé.
"""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import (
    AcademicPeriod, ClassSubject, Evaluation, Grade, Guardian, Level,
    SchoolClass, SchoolYear, Student, Subject,
)
from apps.finance.models import FeeCategory, StudentFee


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Clôture",
        slug="ecole-test-cloture",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000021",
        contact_email="directeur@ecole-test-cloture.gn",
    )


@pytest.fixture
def director_role(db):
    role, _ = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )
    codenames = [
        ("pedagogy:create:schoolyear", "pedagogy"),
        ("pedagogy:create:period", "pedagogy"),
        ("notes:create:evaluation", "notes"),
        ("notes:lock", "notes"),
        ("notes:validate", "notes"),
        ("notes:read", "notes"),
        ("attendance:create", "pedagogy"),
        ("attendance:justify", "pedagogy"),
        ("finance:create", "finance"),
        ("finance:read", "finance"),
        ("finance:update", "finance"),
        # SCHOOLYEAR-V2-02 : ces tests envoient des school_year/school_year_id
        # explicites (comportement pré-V2-02) — nécessite l'override.
        ("pedagogy:override:schoolyear", "pedagogy"),
    ]
    for codename, module in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"name": codename, "module": module},
        )
        role.permissions.add(perm)
    return role


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-cloture",
        email="directeur@ecole-test-cloture.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(tenant=tenant, name="6ème", cycle="COLLEGE", order_index=7)


@pytest.fixture
def subject(tenant):
    return Subject.objects.create(tenant=tenant, code="MATH", name="Mathématiques", category="Scientifique")


@pytest.fixture
def closed_year(tenant):
    """Année encore ACTIVE : le contenu est créé pendant qu'elle est ouverte."""
    return SchoolYear.objects.create(
        tenant=tenant, label="2024-2025",
        start_date="2024-09-15", end_date="2025-07-10",
        status=SchoolYear.Status.ACTIVE,
    )


def _close(school_year):
    school_year.status = SchoolYear.Status.CLOSED
    school_year.save(update_fields=["status"])


@pytest.fixture
def classe(tenant, closed_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=closed_year, level=level, name="6ème A", capacity=50,
    )


@pytest.fixture
def period(tenant, closed_year):
    return AcademicPeriod.objects.create(
        tenant=tenant, school_year=closed_year,
        name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
        start_date="2024-09-15", end_date="2024-12-20", order=1,
        is_closed=True,
    )


@pytest.fixture
def student(tenant, closed_year, classe):
    s = Student.objects.create(
        tenant=tenant, matricule="2024-00001", nom="Diallo", prenom="Alpha",
        date_naissance="2012-05-15", sexe="M", statut="ACTIF",
        annee_inscription=closed_year, classe_actuelle=classe,
    )
    Guardian.objects.create(
        tenant=tenant, student=s, lien=Guardian.Lien.MERE,
        nom_complet="Mariama Diallo", telephone="+224655112233",
        is_contact_urgence=True,
    )
    return s


@pytest.fixture
def evaluation(tenant, classe, subject, period, director_user):
    return Evaluation.objects.create(
        tenant=tenant, class_obj=classe, subject=subject, period=period,
        teacher=director_user, type="CC", title="Devoir 1",
        max_score=20, coefficient=1, date="2024-10-01",
    )


@pytest.fixture
def grade(tenant, evaluation, student, director_user):
    return Grade.objects.create(
        tenant=tenant, evaluation=evaluation, student=student,
        score=Decimal("15.00"), created_by=director_user,
    )


@pytest.fixture
def fee_category(tenant, closed_year):
    return FeeCategory.objects.create(
        tenant=tenant, school_year=closed_year, name="Frais d'inscription",
        type="INSCRIPTION", amount=Decimal("50000"), is_mandatory=True,
    )


@pytest.fixture
def student_fee(tenant, student, fee_category):
    return StudentFee.objects.create(
        tenant=tenant, student=student, fee_category=fee_category,
        total_amount=Decimal("50000"), discount_amount=0, balance_due=Decimal("50000"),
    )


def login_client(client, email):
    resp = client.post(
        reverse("auth-login"),
        {"email": email, "password": "SecurePass123!"},
        format="json",
    )
    assert resp.status_code == 200, resp.json()
    token = resp.json()["data"]["access_token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.mark.django_db
class TestClosedYearBlocksWrites:
    def test_create_class_on_closed_year_returns_422(self, director_user, closed_year, level):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-list"),
            {"name": "6ème B", "level_id": str(level.id), "capacity": 50,
             "school_year": str(closed_year.id)},
            format="json",
        )
        assert resp.status_code == 422

    def test_add_subject_to_class_on_closed_year_returns_422(self, director_user, classe, subject, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": classe.id}),
            {"subject_id": str(subject.id), "coefficient": 2, "weekly_hours": 4},
            format="json",
        )
        assert resp.status_code == 422

    def test_create_period_on_closed_year_returns_422(self, director_user, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("schoolyear-periods", args=[closed_year.id]),
            {"name": "Trimestre 2", "type": "TRIMESTRE",
             "start_date": "2025-01-06", "end_date": "2025-03-28", "order": 2},
            format="json",
        )
        assert resp.status_code == 422

    def test_close_period_on_closed_year_returns_422(self, director_user, period, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("period-close", args=[period.id]), {}, format="json",
        )
        assert resp.status_code == 422

    def test_batch_attendance_on_closed_year_returns_422(self, director_user, classe, student, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("attendance-list"),
            {"classe_id": str(classe.id), "date": "2024-10-02",
             "records": [{"student_id": str(student.id), "status": "PRESENT"}]},
            format="json",
        )
        assert resp.status_code == 422

    def test_correct_attendance_on_closed_year_returns_422(self, director_user, classe, student, closed_year):
        from apps.pedagogy.models import Attendance
        attendance = Attendance.objects.create(
            tenant=classe.tenant, student=student, classe=classe,
            date="2024-10-02", status=Attendance.Status.PRESENT,
        )
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-detail", args=[attendance.id]),
            {"status": "ABSENT"}, format="json",
        )
        assert resp.status_code == 422

    def test_justify_attendance_on_closed_year_returns_422(self, director_user, classe, student, closed_year):
        from apps.pedagogy.models import Attendance
        attendance = Attendance.objects.create(
            tenant=classe.tenant, student=student, classe=classe,
            date="2024-10-02", status=Attendance.Status.ABSENT,
        )
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("attendance-justify", args=[attendance.id]),
            {"justification_text": "Certificat médical"}, format="json",
        )
        assert resp.status_code == 422

    def test_create_evaluation_on_closed_year_returns_422(self, director_user, classe, subject, period, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("evaluation-list"),
            {"class_id": str(classe.id), "subject_id": str(subject.id),
             "period_id": str(period.id), "type": "CC", "title": "Devoir 2",
             "max_score": 20, "coefficient": 1, "date": "2024-11-01"},
            format="json",
        )
        assert resp.status_code == 422

    def test_lock_evaluation_on_closed_year_returns_422(self, director_user, evaluation, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("evaluation-lock", args=[evaluation.id]), {}, format="json",
        )
        assert resp.status_code == 422

    def test_bulk_grades_on_closed_year_returns_422(self, director_user, evaluation, student, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("grades-bulk"),
            {"evaluation_id": str(evaluation.id),
             "grades": [{"student_id": str(student.id), "score": "12.00"}]},
            format="json",
        )
        assert resp.status_code == 422

    def test_validate_grade_on_closed_year_returns_422(self, director_user, grade, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("grade-valider", args=[grade.id]), {}, format="json",
        )
        assert resp.status_code == 422

    def test_modify_grade_after_validation_on_closed_year_returns_422(self, director_user, grade, closed_year):
        grade.is_validated = True
        grade.save(update_fields=["is_validated"])
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("grade-modifier", args=[grade.id]),
            {"score": "18.00", "justification": "Erreur de saisie"},
            format="json",
        )
        assert resp.status_code == 422

    def test_create_yearenddecision_on_closed_year_returns_422(self, director_user, student, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("year-end-decisions"),
            {"student": str(student.id), "school_year": str(closed_year.id),
             "decision": "EXCLU"},
            format="json",
        )
        assert resp.status_code == 422

    def test_create_feecategory_on_closed_year_returns_422(self, director_user, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("feecategory-list"),
            {"school_year": str(closed_year.id), "name": "Frais de cantine",
             "type": "SCOLARITE", "amount": 20000, "is_mandatory": False},
            format="json",
        )
        assert resp.status_code == 422

    def test_update_feecategory_on_closed_year_returns_422(self, director_user, fee_category, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.patch(
            reverse("feecategory-detail", args=[fee_category.id]),
            {"amount": 60000}, format="json",
        )
        assert resp.status_code == 422

    def test_create_studentfee_on_closed_year_returns_422(self, director_user, student, fee_category, closed_year):
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("studentfee-list"),
            {"student": str(student.id), "fee_category_id": str(fee_category.id),
             "total_amount": 50000, "discount_amount": 0},
            format="json",
        )
        assert resp.status_code == 422

    def test_payment_on_closed_year_is_not_blocked(self, director_user, student, student_fee, closed_year, settings):
        """
        Décision PO 2026-07-29 : un encaissement tardif sur une dette d'une
        année clôturée reste autorisé, contrairement à la création/modification
        de frais.

        Ce paiement CASH déclenche generate_receipt_for_payment (WeasyPrint +
        default_storage) — override vers FileSystemStorage (INFRA-V2-01,
        même raison que les fixtures homonymes côté finance : éviter un
        appel réseau réel vers MinIO pendant les tests).
        """
        settings.STORAGES = {
            "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        }
        _close(closed_year)
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("payment-list"),
            {"student_id": str(student.id), "student_fee_id": str(student_fee.id),
             "amount": 10000, "method": "CASH",
             "idempotency_key": "closed-year-payment-test-1"},
            format="json",
        )
        assert resp.status_code == 201, resp.json()
