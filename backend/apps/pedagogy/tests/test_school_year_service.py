import pytest
from rest_framework.exceptions import ValidationError as DRFValidationError
from apps.pedagogy.models import SchoolYear, AcademicPeriod
from apps.pedagogy.services.school_year_service import (
    set_current_school_year,
    validate_no_period_overlap,
    close_period,
    check_period_is_open,
    check_year_is_open,
    assert_school_year_open,
    close_school_year,
    SchoolYearError,
)
from apps.superadmin.models import Tenant, Plan


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test",
        slug="ecole-test-svc",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test-svc.gn",
    )


@pytest.fixture
def school_year_a(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date="2025-09-15",
        end_date="2026-07-10",
        status=SchoolYear.Status.ACTIVE,
    )


@pytest.fixture
def school_year_b(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2026-2027",
        start_date="2026-09-15",
        end_date="2027-07-10",
    )


@pytest.mark.django_db
class TestSetCurrentSchoolYear:
    def test_set_current_unsets_others(self, school_year_a, school_year_b):
        set_current_school_year(school_year_a)
        school_year_a.refresh_from_db()
        school_year_b.refresh_from_db()
        assert school_year_a.is_current is True
        assert school_year_b.is_current is False

    def test_set_current_switches_to_another(self, school_year_a, school_year_b):
        set_current_school_year(school_year_a)
        set_current_school_year(school_year_b)
        school_year_a.refresh_from_db()
        school_year_b.refresh_from_db()
        assert school_year_a.is_current is False
        assert school_year_b.is_current is True

    def test_set_current_isolated_per_tenant(self, tenant, plan, school_year_a):
        tenant_b = Tenant.objects.create(
            name="École B",
            slug="ecole-b-svc",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE,
            plan=plan,
            contact_name="Directeur B",
            contact_phone="+224620000002",
            contact_email="directeur@ecole-b-svc.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b,
            label="2025-2026",
            start_date="2025-09-15",
            end_date="2026-07-10",
        )
        set_current_school_year(school_year_a)
        set_current_school_year(sy_b)
        school_year_a.refresh_from_db()
        sy_b.refresh_from_db()
        assert school_year_a.is_current is True
        assert sy_b.is_current is True


@pytest.mark.django_db
class TestValidateNoPeriodOverlap:
    def test_no_overlap_passes(self, school_year_a):
        validate_no_period_overlap(
            school_year_a, "2025-09-15", "2025-12-20"
        )

    def test_overlap_raises_error(self, school_year_a):
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        with pytest.raises(DRFValidationError) as exc:
            validate_no_period_overlap(
                school_year_a, "2025-10-01", "2026-01-15"
            )
        assert "chevauche" in str(exc.value)

    def test_same_period_excluded_ok(self, school_year_a):
        period = AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        validate_no_period_overlap(
            school_year_a, "2025-09-15", "2025-12-20", exclude_period_id=period.id
        )

    def test_different_school_year_no_overlap(self, school_year_a, school_year_b):
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        validate_no_period_overlap(
            school_year_b, "2025-09-15", "2025-12-20"
        )


@pytest.mark.django_db
class TestClosePeriod:
    def test_close_period(self, school_year_a):
        period = AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        assert period.is_closed is False
        close_period(period)
        period.refresh_from_db()
        assert period.is_closed is True


@pytest.mark.django_db
class TestCheckUtilities:
    def test_check_period_is_open_returns_true_for_open(self, school_year_a):
        period = AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
        )
        assert check_period_is_open(period) is True

    def test_check_period_is_open_returns_false_for_closed(self, school_year_a):
        period = AcademicPeriod.objects.create(
            tenant=school_year_a.tenant,
            school_year=school_year_a,
            name="Trimestre 1",
            type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15",
            end_date="2025-12-20",
            order=1,
            is_closed=True,
        )
        assert check_period_is_open(period) is False

    def test_check_year_is_open(self, tenant):
        sy_active = SchoolYear.objects.create(
            tenant=tenant,
            label="2025-2026",
            start_date="2025-09-15",
            end_date="2026-07-10",
            status=SchoolYear.Status.ACTIVE,
        )
        sy_prep = SchoolYear.objects.create(
            tenant=tenant,
            label="2026-2027",
            start_date="2026-09-15",
            end_date="2027-07-10",
            status=SchoolYear.Status.PREPARATION,
        )
        sy_closed = SchoolYear.objects.create(
            tenant=tenant,
            label="2024-2025",
            start_date="2024-09-15",
            end_date="2025-07-10",
            status=SchoolYear.Status.CLOSED,
        )
        assert check_year_is_open(sy_active) is True
        assert check_year_is_open(sy_prep) is True
        assert check_year_is_open(sy_closed) is False

    def test_assert_school_year_open_passes_silently_when_open(self, school_year_a):
        assert_school_year_open(school_year_a)  # ACTIVE — ne doit rien lever

    def test_assert_school_year_open_raises_422_when_closed(self, tenant):
        sy_closed = SchoolYear.objects.create(
            tenant=tenant, label="2024-2025",
            start_date="2024-09-15", end_date="2025-07-10",
            status=SchoolYear.Status.CLOSED,
        )
        with pytest.raises(SchoolYearError) as exc:
            assert_school_year_open(sy_closed)
        assert exc.value.status_code == 422


@pytest.mark.django_db
class TestCloseSchoolYear:
    def test_close_school_year_success(self, school_year_a):
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant, school_year=school_year_a,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=True,
        )
        close_school_year(school_year_a)
        school_year_a.refresh_from_db()
        assert school_year_a.status == SchoolYear.Status.CLOSED

    def test_close_school_year_does_not_touch_is_current(self, school_year_a):
        set_current_school_year(school_year_a)
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant, school_year=school_year_a,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=True,
        )
        close_school_year(school_year_a)
        school_year_a.refresh_from_db()
        assert school_year_a.status == SchoolYear.Status.CLOSED
        assert school_year_a.is_current is True

    def test_close_school_year_without_periods_raises(self, school_year_a):
        with pytest.raises(SchoolYearError) as exc:
            close_school_year(school_year_a)
        assert exc.value.status_code == 422
        assert "Aucune période" in str(exc.value)

    def test_close_school_year_with_unclosed_period_raises(self, school_year_a):
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant, school_year=school_year_a,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=False,
        )
        with pytest.raises(SchoolYearError) as exc:
            close_school_year(school_year_a)
        assert exc.value.status_code == 422
        school_year_a.refresh_from_db()
        assert school_year_a.status != SchoolYear.Status.CLOSED

    def test_close_school_year_already_closed_raises(self, school_year_a):
        AcademicPeriod.objects.create(
            tenant=school_year_a.tenant, school_year=school_year_a,
            name="Trimestre 1", type=AcademicPeriod.PeriodType.TRIMESTRE,
            start_date="2025-09-15", end_date="2025-12-20", order=1,
            is_closed=True,
        )
        close_school_year(school_year_a)
        with pytest.raises(SchoolYearError) as exc:
            close_school_year(school_year_a)
        assert "déjà clôturée" in str(exc.value)
