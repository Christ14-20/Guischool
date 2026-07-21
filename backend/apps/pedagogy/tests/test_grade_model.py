from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.pedagogy.models import (
    AcademicPeriod,
    ClassSubject,
    Evaluation,
    Grade,
    Level,
    SchoolClass,
    SchoolYear,
    Student,
    Subject,
)
from apps.superadmin.models import Plan, Tenant


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Notes",
        slug="ecole-test-notes",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000010",
        contact_email="directeur@ecole-test-notes.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date="2025-09-15",
        end_date="2026-07-10",
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=1
    )


@pytest.fixture
def school_class(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=school_year, level=level, name="6ème A"
    )


@pytest.fixture
def subject(tenant):
    return Subject.objects.create(tenant=tenant, code="MATH", name="Mathématiques")


@pytest.fixture
def period(tenant, school_year):
    return AcademicPeriod.objects.create(
        tenant=tenant,
        school_year=school_year,
        name="Trimestre 1",
        type=AcademicPeriod.PeriodType.TRIMESTRE,
        start_date="2025-09-15",
        end_date="2025-12-20",
        order=1,
    )


@pytest.fixture
def student(tenant, school_year, school_class):
    return Student.objects.create(
        tenant=tenant,
        matricule="2025-00001",
        nom="Camara",
        prenom="Fatoumata",
        date_naissance="2013-05-10",
        sexe=Student.Sexe.F,
        classe_actuelle=school_class,
        annee_inscription=school_year,
    )


@pytest.fixture
def evaluation(tenant, school_class, subject, period):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject,
        period=period,
        type=Evaluation.Type.DS,
        title="Devoir surveillé n°1 — Fractions",
        max_score=Decimal("20.00"),
        coefficient=Decimal("3.0"),
        date="2025-10-20",
    )


@pytest.mark.django_db
class TestEvaluationModel:
    def test_evaluation_has_all_schema_fields(self, evaluation):
        required_fields = [
            "id", "tenant", "class_obj", "subject", "period", "teacher",
            "type", "title", "max_score", "coefficient", "date",
            "is_locked", "is_published", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(evaluation, field), f"Missing field: {field}"

    def test_evaluation_type_choices(self):
        choices = {c[0] for c in Evaluation.Type.choices}
        assert choices == {"CC", "DS"}

    def test_evaluation_defaults(self, tenant, school_class, subject, period):
        ev = Evaluation.objects.create(
            tenant=tenant,
            class_obj=school_class,
            subject=subject,
            period=period,
            type=Evaluation.Type.CC,
            title="Interro rapide",
            date="2025-10-05",
        )
        assert ev.max_score == Decimal("20")
        assert ev.coefficient == Decimal("1")
        assert ev.is_locked is False
        assert ev.is_published is False
        assert ev.teacher is None

    def test_evaluation_str(self, evaluation):
        assert str(evaluation) == "Devoir surveillé n°1 — Fractions — 6ème A (MATH)"


@pytest.mark.django_db
class TestGradeModel:
    def test_grade_has_all_schema_fields(self, tenant, student, evaluation):
        grade = Grade.objects.create(
            tenant=tenant, student=student, evaluation=evaluation, score=Decimal("14.50")
        )
        required_fields = [
            "id", "tenant", "student", "evaluation", "score", "is_absent",
            "note_convertie", "comment", "created_by", "is_validated",
            "validated_by", "validated_at", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(grade, field), f"Missing field: {field}"

    def test_grade_defaults(self, tenant, student, evaluation):
        grade = Grade.objects.create(
            tenant=tenant, student=student, evaluation=evaluation, score=Decimal("14.50")
        )
        assert grade.is_absent is False
        assert grade.is_validated is False
        assert grade.validated_by is None
        assert grade.validated_at is None
        assert grade.comment == ""

    def test_conversion_same_scale(self, tenant, student, evaluation):
        """max_score=20 → note_convertie == score."""
        grade = Grade.objects.create(
            tenant=tenant, student=student, evaluation=evaluation, score=Decimal("14.00")
        )
        assert grade.note_convertie == Decimal("14.00")

    def test_conversion_scale_40(self, tenant, student, school_class, subject, period):
        """score 14/40 → 7/20."""
        ev40 = Evaluation.objects.create(
            tenant=tenant,
            class_obj=school_class,
            subject=subject,
            period=period,
            type=Evaluation.Type.DS,
            title="DS sur 40",
            max_score=Decimal("40.00"),
            date="2025-11-10",
        )
        grade = Grade.objects.create(
            tenant=tenant, student=student, evaluation=ev40, score=Decimal("14.00")
        )
        assert grade.note_convertie == Decimal("7.00")

    def test_absent_leaves_note_convertie_null(self, tenant, student, evaluation):
        grade = Grade.objects.create(
            tenant=tenant,
            student=student,
            evaluation=evaluation,
            score=None,
            is_absent=True,
        )
        assert grade.note_convertie is None

    def test_unique_per_student_evaluation(self, tenant, student, evaluation):
        Grade.objects.create(
            tenant=tenant, student=student, evaluation=evaluation, score=Decimal("10.00")
        )
        with pytest.raises(IntegrityError):
            Grade.objects.create(
                tenant=tenant, student=student, evaluation=evaluation, score=Decimal("12.00")
            )

    def test_note_convertie_out_of_range_rejected(
        self, tenant, student, school_class, subject, period
    ):
        """score 15/10 → note_convertie 30 > 20 : rejet par CheckConstraint."""
        ev10 = Evaluation.objects.create(
            tenant=tenant,
            class_obj=school_class,
            subject=subject,
            period=period,
            type=Evaluation.Type.CC,
            title="CC sur 10",
            max_score=Decimal("10.00"),
            date="2025-11-15",
        )
        with pytest.raises(IntegrityError):
            Grade.objects.create(
                tenant=tenant, student=student, evaluation=ev10, score=Decimal("15.00")
            )

    def test_grade_str(self, tenant, student, evaluation):
        grade = Grade.objects.create(
            tenant=tenant, student=student, evaluation=evaluation, score=Decimal("14.50")
        )
        assert str(grade) == "2025-00001 — Devoir surveillé n°1 — Fractions"
