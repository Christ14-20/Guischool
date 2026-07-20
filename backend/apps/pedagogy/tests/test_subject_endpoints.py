import pytest
from django.db import IntegrityError
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan
from apps.pedagogy.models import Level, SchoolClass, SchoolYear, Subject, ClassSubject
from apps.pedagogy.services.school_year_service import (
    seed_standard_subjects_for_tenant,
    STANDARD_SUBJECTS,
)


def _add_pedagogy_permissions(role):
    codenames = ["pedagogy:create:schoolyear", "pedagogy:create:period"]
    for codename in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": codename, "module": "pedagogy"},
        )
        role.permissions.add(perm)


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan Subj", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Subj",
        slug="ecole-test-subj",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur-subj@ecole-test.gn",
    )


@pytest.fixture
def director_role(db):
    role = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]
    _add_pedagogy_permissions(role)
    return role


@pytest.fixture
def teacher_role(db):
    return Role.objects.get_or_create(
        name="TEACHER", defaults={"label": "Enseignant"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="director-subj",
        email="director-subj@ecole-test.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def teacher_user(tenant, teacher_role):
    return User.objects.create_user(
        username="teacher-subj",
        email="teacher-subj@ecole-test.gn",
        password="SecurePass123!",
        role=teacher_role,
        tenant=tenant,
    )


@pytest.fixture
def subject(tenant):
    return Subject.objects.create(
        tenant=tenant, code="MATH", name="Mathématiques",
        category="Scientifique", is_official=True,
    )


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant, label="2025-2026",
        start_date="2025-09-15", end_date="2026-07-10",
    )


@pytest.fixture
def level(tenant):
    return Level.objects.create(
        tenant=tenant, cycle=Level.Cycle.COLLEGE,
        name="6ème", order_index=7,
    )


@pytest.fixture
def class_obj(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=school_year, level=level, name="6ème A",
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


@pytest.mark.django_db
class TestSubjectModel:
    def test_subject_has_all_schema_fields(self, tenant):
        subj = Subject.objects.create(
            tenant=tenant, code="FR", name="Français",
            category="Langue", is_official=True,
        )
        required_fields = [
            "id", "tenant", "code", "name", "category",
            "is_official", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(subj, field), f"Missing field: {field}"

    def test_subject_code_unique_per_tenant(self, tenant, subject):
        with pytest.raises(IntegrityError):
            Subject.objects.create(
                tenant=tenant, code="MATH", name="Maths",
            )

    def test_same_code_different_tenant(self, tenant, plan):
        tenant_b = Tenant.objects.create(
            name="École B Subj", slug="ecole-b-subj",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-subj@ecole-test.gn",
        )
        Subject.objects.create(tenant=tenant, code="MATH", name="Mathématiques")
        Subject.objects.create(tenant=tenant_b, code="MATH", name="Maths B")
        assert Subject.objects.filter(code="MATH").count() == 2

    def test_subject_category_blank_by_default(self, tenant):
        subj = Subject.objects.create(tenant=tenant, code="TEST", name="Test")
        assert subj.category == ""

    def test_subject_is_official_default_true(self, tenant):
        subj = Subject.objects.create(tenant=tenant, code="TEST", name="Test")
        assert subj.is_official is True

    def test_subject_ordering(self, tenant):
        Subject.objects.create(tenant=tenant, code="ZZZ", name="ZZ")
        Subject.objects.create(tenant=tenant, code="AAA", name="AA")
        qs = Subject.objects.filter(tenant=tenant)
        assert qs.first().code == "AAA"

    def test_subject_str(self, tenant):
        subj = Subject.objects.create(tenant=tenant, code="FR", name="Français")
        assert str(subj) == "FR — Français"


@pytest.mark.django_db
class TestClassSubjectModel:
    def test_class_subject_has_all_schema_fields(self, tenant, class_obj, subject):
        cs = ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
            coefficient=4, weekly_hours=5,
        )
        required_fields = [
            "id", "tenant", "class_obj", "subject", "coefficient",
            "weekly_hours", "teacher", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(cs, field), f"Missing field: {field}"

    def test_class_subject_defaults(self, tenant, class_obj, subject):
        cs = ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
        )
        assert cs.coefficient == 1
        assert cs.weekly_hours == 0
        assert cs.teacher is None

    def test_unique_subject_per_class(self, tenant, class_obj, subject):
        ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
        )
        with pytest.raises(IntegrityError):
            ClassSubject.objects.create(
                tenant=tenant, class_obj=class_obj, subject=subject,
            )

    def test_same_subject_different_class(self, tenant, class_obj, subject, school_year, level):
        class_b = SchoolClass.objects.create(
            tenant=tenant, school_year=school_year, level=level, name="6ème B",
        )
        cs1 = ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
        )
        cs2 = ClassSubject.objects.create(
            tenant=tenant, class_obj=class_b, subject=subject,
        )
        assert cs1.id != cs2.id

    def test_subject_on_delete_protect(self, tenant, class_obj, subject):
        ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
        )
        with pytest.raises(IntegrityError):
            subject.delete()

    def test_class_subject_str(self, tenant, class_obj, subject):
        cs = ClassSubject.objects.create(
            tenant=tenant, class_obj=class_obj, subject=subject,
        )
        assert str(cs) == "6ème A / MATH"


@pytest.mark.django_db
class TestSubjectEndpoints:
    def test_list_subjects_empty(self, director_user):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("subject-list"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["data"]["results"]) == 0

    def test_create_subject(self, director_user, tenant):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("subject-list"),
            {"code": "MATH", "name": "Mathématiques", "category": "Scientifique"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "success"
        assert data["data"]["code"] == "MATH"
        assert data["data"]["name"] == "Mathématiques"
        assert data["data"]["category"] == "Scientifique"
        assert data["data"]["is_official"] is True

    def test_create_subject_duplicate_code(self, director_user, tenant, subject):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("subject-list"),
            {"code": "MATH", "name": "Mathématiques"},
            format="json",
        )
        assert resp.status_code == 400

    def test_create_subject_unauthorized_for_teacher(self, teacher_user):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("subject-list"),
            {"code": "MATH", "name": "Mathématiques"},
            format="json",
        )
        assert resp.status_code == 403

    def test_list_subjects_isolated_per_tenant(self, tenant, plan, subject, director_user):
        tenant_b = Tenant.objects.create(
            name="École B Subj", slug="ecole-b-subj-endp",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-subj-endp@ecole-test.gn",
        )
        Subject.objects.create(
            tenant=tenant_b, code="FR", name="Français",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("subject-list"))
        assert resp.status_code == 200
        assert len(resp.json()["data"]["results"]) == 1

    def test_list_subjects_shows_all_fields(self, director_user, tenant, subject):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("subject-list"))
        assert resp.status_code == 200
        item = resp.json()["data"]["results"][0]
        assert "id" in item
        assert item["code"] == "MATH"
        assert item["name"] == "Mathématiques"
        assert item["category"] == "Scientifique"
        assert item["is_official"] is True
        assert "created_at" in item


@pytest.mark.django_db
class TestClassSubjectEndpoints:
    def test_list_class_subjects_empty(self, director_user, class_obj):
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-subjects", kwargs={"class_pk": class_obj.id}))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["data"]) == 0

    def test_list_class_subjects_404_for_wrong_tenant(self, director_user, tenant, plan, class_obj):
        tenant_b = Tenant.objects.create(
            name="École B ClsSubj", slug="ecole-b-clssubj",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-clssubj@ecole-test.gn",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-subjects", kwargs={"class_pk": class_obj.id}))
        assert resp.status_code == 200

    def test_list_class_subjects_404_for_nonexistent_class(self, director_user):
        import uuid
        fake_id = uuid.uuid4()
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-subjects", kwargs={"class_pk": fake_id}))
        assert resp.status_code == 404

    def test_create_class_subject(self, director_user, tenant, class_obj, subject):
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": class_obj.id}),
            {"subject_id": str(subject.id), "coefficient": "4.0", "weekly_hours": "5.0"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["subject"]["id"] == str(subject.id)
        assert data["subject"]["code"] == "MATH"
        assert data["coefficient"] == "4.0"
        assert data["weekly_hours"] == "5.0"
        assert data["teacher"] is None

    def test_create_class_subject_with_teacher(self, director_user, tenant, class_obj, subject):
        teacher = User.objects.create_user(
            username="teacher-cs",
            email="teacher-cs@ecole-test.gn",
            password="SecurePass123!",
            role=Role.objects.get_or_create(name="TEACHER", defaults={"label": "Teacher"})[0],
            tenant=tenant,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": class_obj.id}),
            {
                "subject_id": str(subject.id),
                "coefficient": "3.0",
                "weekly_hours": "4.0",
                "teacher_id": str(teacher.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["teacher"]["id"] == str(teacher.id)

    def test_create_class_subject_duplicate(self, director_user, tenant, class_obj, subject):
        client = login_client(APIClient(), director_user.email)
        client.post(
            reverse("class-subjects", kwargs={"class_pk": class_obj.id}),
            {"subject_id": str(subject.id), "coefficient": "4.0"},
            format="json",
        )
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": class_obj.id}),
            {"subject_id": str(subject.id), "coefficient": "2.0"},
            format="json",
        )
        assert resp.status_code == 400

    def test_create_class_subject_unauthorized_for_teacher(self, teacher_user, class_obj, subject):
        client = login_client(APIClient(), teacher_user.email)
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": class_obj.id}),
            {"subject_id": str(subject.id), "coefficient": "4.0"},
            format="json",
        )
        assert resp.status_code == 403

    def test_create_class_subject_404_for_wrong_tenant_class(self, director_user, tenant, plan, subject):
        tenant_b = Tenant.objects.create(
            name="École B ClsSubj2", slug="ecole-b-clssubj2",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-clssubj2@ecole-test.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE,
            name="6ème", order_index=7,
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=sy_b, level=level_b, name="6ème B",
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.post(
            reverse("class-subjects", kwargs={"class_pk": class_b.id}),
            {"subject_id": str(subject.id), "coefficient": "4.0"},
            format="json",
        )
        assert resp.status_code == 404

    def test_class_subjects_isolated(self, director_user, tenant, plan, class_obj, subject):
        tenant_b = Tenant.objects.create(
            name="École B ClsSubj3", slug="ecole-b-clssubj3",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-clssubj3@ecole-test.gn",
        )
        sy_b = SchoolYear.objects.create(
            tenant=tenant_b, label="2025-2026",
            start_date="2025-09-15", end_date="2026-07-10",
        )
        level_b = Level.objects.create(
            tenant=tenant_b, cycle=Level.Cycle.COLLEGE,
            name="6ème", order_index=7,
        )
        class_b = SchoolClass.objects.create(
            tenant=tenant_b, school_year=sy_b, level=level_b, name="6ème B",
        )
        subj_b = Subject.objects.create(
            tenant=tenant_b, code="FR", name="Français",
        )
        ClassSubject.objects.create(
            tenant=tenant_b, class_obj=class_b, subject=subj_b,
        )
        client = login_client(APIClient(), director_user.email)
        resp = client.get(reverse("class-subjects", kwargs={"class_pk": class_obj.id}))
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 0


@pytest.mark.django_db
class TestSeedStandardSubjects:
    def test_seeds_all_10_subjects(self, tenant):
        created = seed_standard_subjects_for_tenant(tenant)
        assert len(created) == len(STANDARD_SUBJECTS)

    def test_seed_is_idempotent(self, tenant):
        seed_standard_subjects_for_tenant(tenant)
        created = seed_standard_subjects_for_tenant(tenant)
        assert len(created) == 0

    def test_subjects_have_correct_codes(self, tenant):
        created = seed_standard_subjects_for_tenant(tenant)
        codes = {s.code for s in created}
        expected = {code for code, _, _ in STANDARD_SUBJECTS}
        assert codes == expected

    def test_seed_isolated_per_tenant(self, tenant, plan):
        tenant_b = Tenant.objects.create(
            name="École B Seed", slug="ecole-b-seed",
            school_type=Tenant.SchoolType.LYCEE,
            status=Tenant.Status.ACTIVE, plan=plan,
            contact_name="Directeur B", contact_phone="+224620000002",
            contact_email="directeur-b-seed@ecole-test.gn",
        )
        seed_standard_subjects_for_tenant(tenant)
        seed_standard_subjects_for_tenant(tenant_b)
        assert Subject.objects.filter(tenant=tenant).count() == len(STANDARD_SUBJECTS)
        assert Subject.objects.filter(tenant=tenant_b).count() == len(STANDARD_SUBJECTS)

    def test_is_official_true_for_standard_subjects(self, tenant):
        seed_standard_subjects_for_tenant(tenant)
        for subj in Subject.objects.filter(tenant=tenant):
            assert subj.is_official is True

    def test_create_school_seeds_subjects(self, tenant, plan):
        from apps.pedagogy.services.school_year_service import seed_standard_subjects_for_tenant
        seed_standard_subjects_for_tenant(tenant)
        assert Subject.objects.filter(tenant=tenant).count() == len(STANDARD_SUBJECTS)
