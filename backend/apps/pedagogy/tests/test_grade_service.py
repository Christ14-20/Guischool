from decimal import Decimal

import pytest

from apps.pedagogy.services.grade_service import (
    arrondi_academique,
    compute_mention,
    compute_moyenne_par_matiere,
    compute_student_moyenne,
    compute_class_classement,
)
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
from apps.superadmin.models import Tenant, Plan


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Grade",
        slug="ecole-test-grade",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000011",
        contact_email="directeur@ecole-test-grade.gn",
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
def period(tenant, school_year):
    return AcademicPeriod.objects.create(
        tenant=tenant,
        school_year=school_year,
        name="Semestre 1",
        start_date="2025-09-15",
        end_date="2026-01-31",
        order=1,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=1
    )


@pytest.fixture
def school_class(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant,
        school_year=school_year,
        level=level,
        name="6ème A",
        capacity=60,
    )


@pytest.fixture
def student(tenant, school_class, school_year):
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
def subject_math(tenant):
    return Subject.objects.create(tenant=tenant, code="MATH", name="Mathématiques")


@pytest.fixture
def subject_fr(tenant):
    return Subject.objects.create(tenant=tenant, code="FR", name="Français")


@pytest.fixture
def cs_math(tenant, school_class, subject_math):
    return ClassSubject.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject_math,
        coefficient=4,
    )


@pytest.fixture
def cs_fr(tenant, school_class, subject_fr):
    return ClassSubject.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject_fr,
        coefficient=3,
    )


@pytest.fixture
def eval_math(tenant, school_class, cs_math, period, subject_math):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject_math,
        period=period,
        max_score=20,
        coefficient=1,
        title="DS1 Maths",
        type=Evaluation.Type.DS,
        date="2025-10-20",
        is_locked=True,
    )


@pytest.fixture
def eval_math2(tenant, school_class, cs_math, period, subject_math):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject_math,
        period=period,
        max_score=20,
        coefficient=2,
        title="DS2 Maths",
        type=Evaluation.Type.DS,
        date="2025-10-20",
        is_locked=True,
    )


@pytest.fixture
def eval_fr(tenant, school_class, cs_fr, period, subject_fr):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject_fr,
        period=period,
        max_score=20,
        coefficient=1,
        title="DS1 Français",
        type=Evaluation.Type.DS,
        date="2025-10-20",
        is_locked=True,
    )


class TestArrondiAcademique:
    def test_arrondi_simple(self):
        assert arrondi_academique(Decimal("12.34")) == Decimal("12.34")

    def test_arrondi_trois_decimales(self):
        assert arrondi_academique(Decimal("12.345")) == Decimal("12.35")

    def test_arrondi_quatre_decimales(self):
        assert arrondi_academique(Decimal("12.3449")) == Decimal("12.34")

    def test_arrondi_exact(self):
        assert arrondi_academique(Decimal("12.5")) == Decimal("12.50")

    def test_arrondi_zero(self):
        assert arrondi_academique(Decimal("0")) == Decimal("0.00")


class TestComputeMention:
    def test_excellent(self):
        assert compute_mention(Decimal("18.5")) == "Excellent"

    def test_tres_bien(self):
        assert compute_mention(Decimal("16.0")) == "Très Bien"

    def test_bien(self):
        assert compute_mention(Decimal("14.5")) == "Bien"

    def test_assez_bien(self):
        assert compute_mention(Decimal("12.0")) == "Assez Bien"

    def test_passable(self):
        assert compute_mention(Decimal("10.0")) == "Passable"

    def test_insuffisant(self):
        assert compute_mention(Decimal("8.0")) == "Insuffisant"

    def test_none(self):
        assert compute_mention(None) is None


class TestComputeMoyenneParMatiere:
    def test_single_evaluation(self, student, eval_math, cs_math):
        Grade.objects.create(
            tenant=student.tenant,
            student=student,
            evaluation=eval_math,
            score=Decimal("15"),
            is_validated=True,
        )
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert len(result) == 1
        assert result[0]["subject_id"] == cs_math.subject_id
        assert result[0]["moyenne"] == Decimal("15")
        assert result[0]["coefficient"] == Decimal("4")

    def test_multiple_evaluations_same_subject(
        self, student, eval_math, eval_math2, cs_math
    ):
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math, score=Decimal("12"), is_validated=True,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math2, score=Decimal("16"), is_validated=True,
        )

        # (12*1 + 16*2) / (1+2) = 44/3 = 14.666...
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert len(result) == 1
        expected = Decimal("14.66666666666666666666666667")
        assert result[0]["moyenne"] == expected

    def test_multiple_subjects(
        self, student, eval_math, eval_fr, cs_math, cs_fr
    ):
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math, score=Decimal("15"), is_validated=True,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_fr, score=Decimal("10"), is_validated=True,
        )
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert len(result) == 2

    def test_no_grades(self, student, eval_math):
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert result == []

    def test_unlocked_evaluation_excluded(self, student, eval_math, tenant, school_class, cs_math, period, subject_math):
        eval_unlocked = Evaluation.objects.create(
            tenant=tenant,
            class_obj=school_class,
            subject=subject_math,
            period=period,
            max_score=20,
            coefficient=1,
            title="DS Non verrouillé",
            type=Evaluation.Type.DS,
            date="2025-10-20",
            is_locked=False,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_unlocked, score=Decimal("15"),
        )
        result = compute_moyenne_par_matiere(student, eval_math.period)
        # Grade on unlocked evaluation is excluded
        assert result == []


    def test_locked_evaluation_included_unlocked_excluded(
        self, student, eval_math, tenant, school_class, cs_math, period, subject_math
    ):
        eval_unlocked = Evaluation.objects.create(
            tenant=tenant,
            class_obj=school_class,
            subject=subject_math,
            period=period,
            max_score=20,
            coefficient=1,
            title="DS Non verrouillé",
            type=Evaluation.Type.DS,
            date="2025-10-20",
            is_locked=False,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math, score=Decimal("18"),  # locked
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_unlocked, score=Decimal("12"),  # unlocked
        )
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert len(result) == 1
        assert result[0]["moyenne"] == Decimal("18")

    def test_unvalidated_grade_on_locked_evaluation_is_included(self, student, eval_math):
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math, score=Decimal("15"), is_validated=False,
        )
        result = compute_moyenne_par_matiere(student, eval_math.period)
        assert len(result) == 1
        assert result[0]["moyenne"] == Decimal("15")


class TestComputeStudentMoyenne:
    def test_full_calculation(
        self, student, eval_math, eval_math2, eval_fr,
        cs_math, cs_fr
    ):
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math, score=Decimal("12"), is_validated=True,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_math2, score=Decimal("16"), is_validated=True,
        )
        Grade.objects.create(
            tenant=student.tenant, student=student,
            evaluation=eval_fr, score=Decimal("10"), is_validated=True,
        )

        result = compute_student_moyenne(student, eval_math.period)

        # Maths: (12*1 + 16*2)/3 = 44/3 ≈ 14.6667
        # Français: 10/1 = 10
        # Générale: (14.6667*4 + 10*3)/7 ≈ 12.6667
        assert result["moyenne_generale"] is not None
        assert result["mention"] is not None
        assert len(result["par_matiere"]) == 2

    def test_no_grades(self, student, eval_math):
        result = compute_student_moyenne(student, eval_math.period)
        assert result["moyenne_generale"] is None
        assert result["mention"] is None
        assert result["par_matiere"] == []


class TestComputeClassClassement:
    def test_classement_order(
        self, tenant, school_class, eval_math, cs_math, period, school_year
    ):
        student1 = Student.objects.create(
            tenant=tenant, matricule="2025-0002", nom="Alpha", prenom="Z",
            date_naissance="2013-01-01", sexe=Student.Sexe.M,
            classe_actuelle=school_class, annee_inscription=school_year,
        )
        student2 = Student.objects.create(
            tenant=tenant, matricule="2025-0003", nom="Beta", prenom="A",
            date_naissance="2013-01-01", sexe=Student.Sexe.M,
            classe_actuelle=school_class, annee_inscription=school_year,
        )

        Grade.objects.create(
            tenant=tenant, student=student2,
            evaluation=eval_math, score=Decimal("18"), is_validated=True,
        )
        Grade.objects.create(
            tenant=tenant, student=student1,
            evaluation=eval_math, score=Decimal("12"), is_validated=True,
        )

        result = compute_class_classement(school_class, period)
        assert len(result) == 2
        assert result[0]["rang"] == 1
        assert result[0]["student_id"] == str(student2.id)
        assert result[1]["rang"] == 2
        assert result[1]["student_id"] == str(student1.id)

    def test_no_students(self, school_class, period):
        result = compute_class_classement(school_class, period)
        assert result == []

    def test_tie_break_alphabetical(
        self, tenant, school_class, eval_math, cs_math, period, school_year
    ):
        student_a = Student.objects.create(
            tenant=tenant, matricule="2025-0004", nom="Alpha", prenom="Z",
            date_naissance="2013-01-01", sexe=Student.Sexe.M,
            classe_actuelle=school_class, annee_inscription=school_year,
        )
        student_b = Student.objects.create(
            tenant=tenant, matricule="2025-0005", nom="Beta", prenom="A",
            date_naissance="2013-01-01", sexe=Student.Sexe.M,
            classe_actuelle=school_class, annee_inscription=school_year,
        )

        Grade.objects.create(
            tenant=tenant, student=student_a,
            evaluation=eval_math, score=Decimal("14"), is_validated=True,
        )
        Grade.objects.create(
            tenant=tenant, student=student_b,
            evaluation=eval_math, score=Decimal("14"), is_validated=True,
        )

        result = compute_class_classement(school_class, period)
        # Tie-break : "A Beta" (student_b) < "Z Alpha" (student_a)
        assert result[0]["student_id"] == str(student_b.id), f"expected student_b first, got {result}"
        assert result[1]["student_id"] == str(student_a.id)
