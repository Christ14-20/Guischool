import datetime

import pytest
from django.db import IntegrityError

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import (
    Level,
    SchoolClass,
    SchoolYear,
    Student,
    Enrollment,
    MatriculeSequence,
)
from apps.pedagogy.services.student_service import generate_matricule


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Std", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Élèves A",
        slug="ecole-eleves-a",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur A",
        contact_phone="+224620000001",
        contact_email="dir@eleves-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Élèves B",
        slug="ecole-eleves-b",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur B",
        contact_phone="+224620000002",
        contact_email="dir@eleves-b.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date=datetime.date(2025, 9, 15),
        end_date=datetime.date(2026, 7, 10),
        status=SchoolYear.Status.ACTIVE,
        is_current=True,
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE, name="6ème", order_index=7
    )


@pytest.fixture
def school_class(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant,
        school_year=school_year,
        level=level,
        name="6ème A",
        capacity=50,
    )


def _make_student(tenant, school_year, matricule="2025-00001", **kwargs):
    defaults = dict(
        tenant=tenant,
        matricule=matricule,
        nom="Camara",
        prenom="Fatoumata",
        date_naissance=datetime.date(2013, 3, 22),
        sexe=Student.Sexe.F,
        annee_inscription=school_year,
    )
    defaults.update(kwargs)
    return Student.objects.create(**defaults)


@pytest.mark.django_db
class TestStudentModel:
    def test_student_has_all_schema_fields(self, tenant, school_year, school_class):
        s = _make_student(
            tenant, school_year, lieu_naissance="Kindia", classe_actuelle=school_class
        )
        assert s.matricule == "2025-00001"
        assert s.nom == "Camara"
        assert s.prenom == "Fatoumata"
        assert s.date_naissance == datetime.date(2013, 3, 22)
        assert s.lieu_naissance == "Kindia"
        assert s.sexe == "F"
        assert s.classe_actuelle == school_class
        assert s.annee_inscription == school_year

    def test_student_default_statut_actif(self, tenant, school_year):
        s = _make_student(tenant, school_year)
        assert s.statut == Student.Status.ACTIF

    def test_student_statut_choices(self):
        assert set(Student.Status.values) == {
            "ACTIF",
            "SUSPENDU",
            "TRANSFERE",
            "SORTI",
            "ARCHIVE",
        }

    def test_matricule_unique_per_tenant(self, tenant, school_year):
        _make_student(tenant, school_year, matricule="2025-00001")
        with pytest.raises(IntegrityError):
            _make_student(tenant, school_year, matricule="2025-00001")

    def test_same_matricule_different_tenant(self, tenant, tenant_b, school_year, plan):
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date=datetime.date(2025, 9, 15),
            end_date=datetime.date(2026, 7, 10),
        )
        _make_student(tenant, school_year, matricule="2025-00001")
        s2 = _make_student(tenant_b, sy_b, matricule="2025-00001")
        assert s2.pk is not None

    def test_student_str(self, tenant, school_year):
        s = _make_student(tenant, school_year)
        assert "2025-00001" in str(s)
        assert "Fatoumata" in str(s)


@pytest.mark.django_db
class TestEnrollmentModel:
    def test_enrollment_has_all_schema_fields(self, tenant, school_year, school_class):
        s = _make_student(tenant, school_year)
        e = Enrollment.objects.create(
            tenant=tenant,
            student=s,
            classe=school_class,
            school_year=school_year,
            type_inscription=Enrollment.TypeInscription.NOUVELLE,
        )
        assert e.student == s
        assert e.classe == school_class
        assert e.school_year == school_year
        assert e.type_inscription == "NOUVELLE_INSCRIPTION"
        assert e.date_inscription is not None

    def test_type_inscription_choices(self):
        assert set(Enrollment.TypeInscription.values) == {
            "NOUVELLE_INSCRIPTION",
            "REINSCRIPTION",
            "TRANSFERT_ENTRANT",
        }

    def test_unique_enrollment_per_year(self, tenant, school_year, school_class):
        s = _make_student(tenant, school_year)
        Enrollment.objects.create(
            tenant=tenant,
            student=s,
            classe=school_class,
            school_year=school_year,
            type_inscription=Enrollment.TypeInscription.NOUVELLE,
        )
        with pytest.raises(IntegrityError):
            Enrollment.objects.create(
                tenant=tenant,
                student=s,
                classe=school_class,
                school_year=school_year,
                type_inscription=Enrollment.TypeInscription.REINSCRIPTION,
            )

    def test_classe_protect_on_delete(self, tenant, school_year, school_class):
        s = _make_student(tenant, school_year)
        Enrollment.objects.create(
            tenant=tenant,
            student=s,
            classe=school_class,
            school_year=school_year,
            type_inscription=Enrollment.TypeInscription.NOUVELLE,
        )
        from django.db.models import ProtectedError

        with pytest.raises(ProtectedError):
            school_class.delete()


@pytest.mark.django_db
class TestCurrentHeadcount:
    def test_headcount_counts_only_active(self, tenant, school_year, school_class):
        _make_student(
            tenant, school_year, matricule="2025-00001", classe_actuelle=school_class
        )
        _make_student(
            tenant,
            school_year,
            matricule="2025-00002",
            classe_actuelle=school_class,
            statut=Student.Status.ARCHIVE,
        )
        assert school_class.current_headcount == 1

    def test_headcount_zero_empty_class(self, school_class):
        assert school_class.current_headcount == 0


@pytest.mark.django_db
class TestGenerateMatricule:
    def test_format_and_increment(self, tenant, school_year):
        m1 = generate_matricule(tenant, school_year)
        m2 = generate_matricule(tenant, school_year)
        assert m1 == "2025-00001"
        assert m2 == "2025-00002"

    def test_sequence_row_created(self, tenant, school_year):
        generate_matricule(tenant, school_year)
        seq = MatriculeSequence.objects.get(tenant=tenant, school_year=school_year)
        assert seq.last_seq == 1

    def test_sequence_isolated_per_tenant(self, tenant, tenant_b, school_year):
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date=datetime.date(2025, 9, 15),
            end_date=datetime.date(2026, 7, 10),
        )
        m_a = generate_matricule(tenant, school_year)
        m_b = generate_matricule(tenant_b, sy_b)
        assert m_a == "2025-00001"
        assert m_b == "2025-00001"

    def test_sequence_reset_per_year(self, tenant, school_year):
        sy_next = SchoolYear.objects.create(
            tenant=tenant,
            label="2026-2027",
            start_date=datetime.date(2026, 9, 15),
            end_date=datetime.date(2027, 7, 10),
        )
        generate_matricule(tenant, school_year)
        m_next = generate_matricule(tenant, sy_next)
        assert m_next == "2026-00001"


@pytest.mark.django_db
class TestStudentTenantIsolation:
    def test_students_isolated_per_tenant(self, tenant, tenant_b, school_year):
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date=datetime.date(2025, 9, 15),
            end_date=datetime.date(2026, 7, 10),
        )
        _make_student(tenant, school_year, matricule="2025-00001")
        _make_student(tenant_b, sy_b, matricule="2025-00099")
        assert Student.objects.filter(tenant=tenant).count() == 1
        assert Student.objects.filter(tenant=tenant_b).count() == 1
        assert (
            Student.objects.filter(tenant=tenant).first().matricule == "2025-00001"
        )
