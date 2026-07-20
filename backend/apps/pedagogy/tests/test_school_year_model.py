import pytest
from django.db import IntegrityError
from apps.pedagogy.models import SchoolYear, AcademicPeriod
from apps.superadmin.models import Tenant, Plan
from apps.authentication.models import User, Role


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test",
        slug="ecole-test-sy",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test-sy.gn",
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date="2025-09-15",
        end_date="2026-07-10",
    )


@pytest.mark.django_db
class TestSchoolYearModel:
    def test_school_year_has_all_schema_fields(self, school_year):
        required_fields = [
            "id", "tenant", "label", "start_date", "end_date",
            "status", "is_current", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(school_year, field), f"Missing field: {field}"

    def test_school_year_default_status(self, tenant):
        sy = SchoolYear.objects.create(
            tenant=tenant,
            label="2026-2027",
            start_date="2026-09-15",
            end_date="2027-07-10",
        )
        assert sy.status == SchoolYear.Status.PREPARATION
        assert sy.is_current is False

    def test_school_year_status_choices(self):
        choices = {c[0] for c in SchoolYear.Status.choices}
        assert choices == {"PREPARATION", "ACTIVE", "CLOSED"}

    def test_school_year_label_unique_per_tenant(self, tenant, school_year):
        with pytest.raises(IntegrityError):
            SchoolYear.objects.create(
                tenant=tenant,
                label="2025-2026",
                start_date="2025-09-15",
                end_date="2026-07-10",
            )

    def test_school_year_same_label_different_tenants(self, tenant, plan, school_year):
        tenant_b = Tenant.objects.create(
            name="École B",
            slug="ecole-b",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date="2025-09-15",
            end_date="2026-07-10",
        )
        assert sy_b.id != school_year.id

    def test_school_year_str(self, school_year):
        assert str(school_year) == "2025-2026 (Préparation)"


@pytest.mark.django_db
class TestAcademicPeriodModel:
    def test_academic_period_has_all_schema_fields(self, school_year):
        period = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        required_fields = [
            "id", "tenant", "school_year", "name", "type",
            "start_date", "end_date", "order", "is_closed",
            "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(period, field), f"Missing field: {field}"

    def test_academic_period_default_is_closed(self, school_year):
        period = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        assert period.is_closed is False

    def test_academic_period_type_choices(self):
        choices = {c[0] for c in AcademicPeriod.PeriodType.choices}
        assert choices == {"TRIMESTRE", "SEMESTRE"}

    def test_academic_period_order_unique_per_year(self, school_year):
        AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        with pytest.raises(IntegrityError):
            AcademicPeriod.objects.create(
                tenant=school_year.tenant,
                school_year=school_year,
                name="Trimestre 1 bis",
                type=AcademicPeriod.PeriodType.TRIMESTRE,
                start_date="2025-09-15",
                end_date="2025-10-15",
                order=1,
            )

    def test_academic_period_ordering(self, school_year):
        p1 = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        p2 = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 2",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2026-01-05",
            end_date="2026-03-28",
            order=2,
        )
        p3 = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 3",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2026-04-07",
            end_date="2026-07-10",
            order=3,
        )
        periods = list(AcademicPeriod.objects.filter(school_year=school_year))
        assert periods == [p1, p2, p3]

    def test_period_belongs_to_school_year(self, school_year):
        period = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        assert period.school_year == school_year

    def test_academic_period_str(self, school_year):
        period = AcademicPeriod.objects.create(
            tenant=school_year.tenant,
            school_year=school_year,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        assert str(period) == "Trimestre 1 (2025-2026)"
