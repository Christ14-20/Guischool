from decimal import Decimal
from datetime import date

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.pedagogy.models import (
    AcademicPeriod, ClassSubject, Evaluation, Grade, Level,
    SchoolClass, SchoolYear, Student, Subject, YearEndDecision,
)
from apps.superadmin.models import Tenant, Plan
from apps.authentication.models import User, Role, Permission


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan", max_students=200, max_staff=20)


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test Notes",
        slug="ecole-test-notes-ep",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000011",
        contact_email="directeur@ecole-test-notes-ep.gn",
    )


@pytest.fixture
def other_tenant(plan):
    return Tenant.objects.create(
        name="Autre École",
        slug="autre-ecole",
        school_type=Tenant.SchoolType.PRIMAIRE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Autre Directeur",
        contact_phone="+224620000099",
        contact_email="autre@ecole.gn",
    )


def _add_notes_permissions(role, codenames):
    for codename in codenames:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": codename, "module": "notes"},
        )
        role.permissions.add(perm)


@pytest.fixture
def director_role(db):
    role, _ = Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )
    _add_notes_permissions(role, [
        "notes:create:evaluation", "notes:read", "notes:lock", "notes:validate",
    ])
    return role


@pytest.fixture
def teacher_role(db):
    role, _ = Role.objects.get_or_create(
        name="TEACHER", defaults={"label": "Enseignant"}
    )
    _add_notes_permissions(role, [
        "notes:create:evaluation", "notes:read", "notes:lock",
    ])
    return role


@pytest.fixture
def student_studies_role(db):
    role, _ = Role.objects.get_or_create(
        name="STUDENT_STUDIES", defaults={"label": "Directeur des études / Scolarité"}
    )
    _add_notes_permissions(role, [
        "notes:create:evaluation", "notes:read", "notes:lock",
    ])
    return role


PASSWORD = "SecurePass123!"


@pytest.fixture
def director(tenant, director_role):
    user = User.objects.create_user(
        email="directeur@test.gn",
        password=PASSWORD,
        tenant=tenant,
        role=director_role,
        username="dir_notes",
    )
    return user


@pytest.fixture
def teacher(tenant, teacher_role):
    user = User.objects.create_user(
        email="enseignant@test.gn",
        password=PASSWORD,
        tenant=tenant,
        role=teacher_role,
        username="ens_notes",
    )
    return user


@pytest.fixture
def other_teacher(tenant, teacher_role):
    user = User.objects.create_user(
        email="enseignant2@test.gn",
        password=PASSWORD,
        tenant=tenant,
        role=teacher_role,
        username="ens_notes2",
    )
    return user


@pytest.fixture
def secretary(tenant, student_studies_role):
    user = User.objects.create_user(
        email="secretaire@test.gn",
        password=PASSWORD,
        tenant=tenant,
        role=student_studies_role,
        username="sec_notes",
    )
    return user


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
        tenant=tenant, school_year=school_year, level=level, name="6ème A", capacity=60
    )


@pytest.fixture
def subject(tenant):
    return Subject.objects.create(tenant=tenant, code="MATH", name="Mathématiques")


@pytest.fixture
def other_subject(tenant):
    return Subject.objects.create(tenant=tenant, code="FR", name="Français")


@pytest.fixture
def class_subject(tenant, school_class, subject, teacher):
    return ClassSubject.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject,
        coefficient=Decimal("4.0"),
        teacher=teacher,
    )


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
def student_b(tenant, school_year, school_class):
    return Student.objects.create(
        tenant=tenant,
        matricule="2025-00002",
        nom="Diallo",
        prenom="Mamadou",
        date_naissance="2013-08-15",
        sexe=Student.Sexe.M,
        classe_actuelle=school_class,
        annee_inscription=school_year,
    )


@pytest.fixture
def evaluation(tenant, school_class, subject, period, teacher):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject,
        period=period,
        teacher=teacher,
        type=Evaluation.Type.DS,
        title="DS Fractions",
        max_score=Decimal("20.00"),
        coefficient=Decimal("3.0"),
        date="2025-10-20",
    )


@pytest.fixture
def grade(tenant, evaluation, student, director):
    return Grade.objects.create(
        tenant=tenant,
        evaluation=evaluation,
        student=student,
        score=Decimal("14.50"),
        created_by=director,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def jwt_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


# ── Evaluation endpoints ──────────────────────────────────────────────────────


class TestEvaluationCreate:
    URL = "/api/v1/pedagogy/evaluations/"

    def test_director_can_create(self, director, school_class, subject, period):
        client = jwt_client(director)
        data = {
            "class_id": str(school_class.id),
            "subject_id": str(subject.id),
            "period_id": str(period.id),
            "type": "DS",
            "title": "DS Fractions",
            "max_score": "20.00",
            "coefficient": "3.0",
            "date": "2025-10-20",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["status"] == "success"
        assert response.data["data"]["title"] == "DS Fractions"
        assert response.data["data"]["max_score"] == "20.00"
        assert response.data["data"]["is_locked"] is False
        assert response.data["data"]["is_published"] is False
        # teacher auto-assigned
        created = Evaluation.objects.get(id=response.data["data"]["id"])
        assert created.teacher == director

    def test_student_studies_can_create(self, secretary, school_class, subject, period):
        client = jwt_client(secretary)
        data = {
            "class_id": str(school_class.id),
            "subject_id": str(subject.id),
            "period_id": str(period.id),
            "type": "DS",
            "title": "DS Test",
            "date": "2025-10-20",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_teacher_can_create_own_subject(
        self, teacher, school_class, subject, class_subject, period
    ):
        client = jwt_client(teacher)
        data = {
            "class_id": str(school_class.id),
            "subject_id": str(subject.id),
            "period_id": str(period.id),
            "type": "CC",
            "title": "Interro rapide",
            "date": "2025-10-05",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_teacher_cannot_create_other_subject(
        self, teacher, school_class, other_subject, period
    ):
        client = jwt_client(teacher)
        data = {
            "class_id": str(school_class.id),
            "subject_id": str(other_subject.id),
            "period_id": str(period.id),
            "type": "CC",
            "title": "Interro français",
            "date": "2025-10-05",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN, response.data

    def test_unauthenticated_fails(self):
        client = APIClient()
        response = client.post(self.URL, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tenant_isolation(self, evaluation, other_tenant, director_role):
        """Un utilisateur du tenant B ne voit pas les évaluations du tenant A."""
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password=PASSWORD,
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_b",
        )
        client = jwt_client(other_user)
        detail_url = f"{self.URL}{evaluation.id}/"
        response = client.get(detail_url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestEvaluationList:
    URL = "/api/v1/pedagogy/evaluations/"

    def _extract_data(self, response):
        """Extrait la liste des résultats depuis la réponse paginée."""
        data = response.data.get("data", {})
        return data.get("results", data) if isinstance(data, dict) else data

    def test_list_filters_by_class(self, director, evaluation, school_class):
        client = jwt_client(director)
        response = client.get(self.URL, {"class_id": school_class.id})
        assert response.status_code == status.HTTP_200_OK
        results = self._extract_data(response)
        assert len(results) == 1

    def test_list_shows_student_count(self, director, evaluation, student):
        client = jwt_client(director)
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_200_OK
        results = self._extract_data(response)
        assert len(results) == 1
        assert results[0]["student_count"] == 1


class TestEvaluationLock:
    URL = "/api/v1/pedagogy/evaluations/"

    def _lock_url(self, evaluation):
        return f"{self.URL}{evaluation.id}/lock/"

    def test_lock_success_when_all_graded(
        self, director, evaluation, student, student_b
    ):
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student,
            score=Decimal("12.00"),
            created_by=director,
        )
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student_b,
            score=Decimal("14.00"),
            created_by=director,
        )
        client = jwt_client(director)
        response = client.patch(self._lock_url(evaluation), {}, format="json")
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["data"]["is_locked"] is True
        evaluation.refresh_from_db()
        assert evaluation.is_locked is True

    def test_lock_fails_when_grades_missing(
        self, director, evaluation, student, student_b
    ):
        """Un seul élève sur 2 a une note → 422."""
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student,
            score=Decimal("12.00"),
            created_by=director,
        )
        client = jwt_client(director)
        response = client.patch(self._lock_url(evaluation), {}, format="json")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY, response.data
        assert "élève(s) n'ont pas encore de note" in response.data["message"]

    def test_lock_fails_when_already_locked(
        self, director, evaluation, student, student_b
    ):
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student,
            score=Decimal("12.00"),
            created_by=director,
        )
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student_b,
            score=Decimal("14.00"),
            created_by=director,
        )
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        client = jwt_client(director)
        response = client.patch(self._lock_url(evaluation), {}, format="json")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ── Grade bulk endpoint ───────────────────────────────────────────────────────


class TestGradeBulk:
    URL = "/api/v1/pedagogy/grades/bulk/"

    def test_bulk_create(self, director, evaluation, student, student_b):
        client = jwt_client(director)
        data = {
            "evaluation_id": str(evaluation.id),
            "grades": [
                {"student_id": str(student.id), "score": "14.50"},
                {"student_id": str(student_b.id), "score": "12.00"},
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["data"]["created_count"] == 2
        assert response.data["data"]["warnings"] == []
        assert response.data["data"]["stats"]["moyenne"] == 13.25
        assert response.data["data"]["stats"]["mediane"] == 13.25
        assert Grade.objects.filter(evaluation=evaluation).count() == 2

    def test_bulk_absent(self, director, evaluation, student):
        """Score null pour ABS → stats vides."""
        client = jwt_client(director)
        data = {
            "evaluation_id": str(evaluation.id),
            "grades": [
                {"student_id": str(student.id), "is_absent": True},
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        grade = Grade.objects.get(evaluation=evaluation, student=student)
        assert grade.is_absent is True
        assert grade.score is None
        assert grade.note_convertie is None
        assert response.data["data"]["stats"] == {}

    def test_bulk_stats(self, director, evaluation, student, student_b):
        """Vérifie le calcul des stats."""
        client = jwt_client(director)
        data = {
            "evaluation_id": str(evaluation.id),
            "grades": [
                {"student_id": str(student.id), "score": "14.00"},
                {"student_id": str(student_b.id), "score": "10.00"},
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        stats = response.data["data"]["stats"]
        assert stats["moyenne"] == 12.0
        assert stats["mediane"] == 12.0
        assert isinstance(stats["ecart_type"], float)

    def test_bulk_stats_non_20_scale(
        self, director, tenant, school_class, subject, period, student, student_b
    ):
        """Barème 40 → stats calculées sur note_convertie (/20), pas sur le brut."""
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
        client = jwt_client(director)
        data = {
            "evaluation_id": str(ev40.id),
            "grades": [
                {"student_id": str(student.id), "score": "14.00"},    # → note_convertie 7.00
                {"student_id": str(student_b.id), "score": "10.00"},  # → note_convertie 5.00
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        stats = response.data["data"]["stats"]
        # note_convertie = score / max_score * 20
        # 14/40*20 = 7.0 ; 10/40*20 = 5.0 → moyenne = 6.0
        assert stats["moyenne"] == 6.0
        grade_a = Grade.objects.get(evaluation=ev40, student=student)
        assert grade_a.note_convertie == Decimal("7.00")

    def test_bulk_individual_rejection(
        self, director, evaluation, student, student_b
    ):
        """score 22/20 → rejet individuel, reste enregistré."""
        client = jwt_client(director)
        data = {
            "evaluation_id": str(evaluation.id),
            "grades": [
                {"student_id": str(student.id), "score": "14.00"},
                {"student_id": str(student_b.id), "score": "22.00"},
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["data"]["created_count"] == 1
        assert len(response.data["data"]["warnings"]) == 1
        warning = response.data["data"]["warnings"][0]
        assert warning["student_id"] == str(student_b.id)

    def test_bulk_fails_when_evaluation_locked(
        self, director, evaluation, student
    ):
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        client = jwt_client(director)
        data = {
            "evaluation_id": str(evaluation.id),
            "grades": [
                {"student_id": str(student.id), "score": "14.00"},
            ],
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGradeValidate:
    def _url(self, grade):
        return f"/api/v1/grades/{grade.id}/valider/"

    def test_validate_success(
        self, director, evaluation, grade, student_b
    ):
        """Verrouiller d'abord, puis valider."""
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        # Deux notes nécessaires pour que is_published devienne True
        Grade.objects.create(
            tenant=evaluation.tenant,
            evaluation=evaluation,
            student=student_b,
            score=Decimal("12.00"),
            created_by=director,
        )

        client = jwt_client(director)
        response = client.post(self._url(grade), {}, format="json")
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["data"]["is_validated"] is True

        grade.refresh_from_db()
        assert grade.is_validated is True
        assert grade.validated_by == director
        assert grade.validated_at is not None

        # is_published doit être True car toutes les notes sont validées
        evaluation.refresh_from_db()
        # La deuxième note n'est pas validée donc is_published reste False
        assert evaluation.is_published is False

    def test_validate_requires_locked_evaluation(self, director, grade):
        client = jwt_client(director)
        response = client.post(self._url(grade), {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_validate_only_director(self, teacher, evaluation, grade):
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        client = jwt_client(teacher)
        response = client.post(self._url(grade), {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestGradeModifyAfterValidation:
    def _url(self, grade):
        return f"/api/v1/grades/{grade.id}/modifier-apres-validation/"

    def test_modify_requires_justification(self, director, grade):
        grade.is_validated = True
        grade.validated_by = director
        grade.save(update_fields=["is_validated", "validated_by"])

        client = jwt_client(director)
        response = client.patch(
            self._url(grade), {"score": "15.00"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_modify_success(self, director, grade):
        grade.is_validated = True
        grade.validated_by = director
        grade.save(update_fields=["is_validated", "validated_by"])

        client = jwt_client(director)
        response = client.patch(
            self._url(grade),
            {
                "score": "15.00",
                "is_absent": False,
                "comment": "Note saisie corrigée",
                "justification": "Erreur de saisie initiale",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        grade.refresh_from_db()
        assert grade.score == Decimal("15.00")
        # Après modification, la note n'est plus validée
        assert grade.is_validated is False

    def test_modify_only_director(self, teacher, evaluation, grade):
        grade.is_validated = True
        grade.validated_by = teacher
        grade.save(update_fields=["is_validated", "validated_by"])

        client = jwt_client(teacher)
        response = client.patch(
            self._url(grade),
            {"score": "15.00", "justification": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Moyenne endpoint ──────────────────────────────────────────────────────────


class TestStudentMoyenne:
    URL_TEMPLATE = "/api/v1/students/{student_id}/moyenne/"

    def _url(self, student):
        return self.URL_TEMPLATE.format(student_id=student.id)

    def test_moyenne_requires_period(
        self, director, student
    ):
        client = jwt_client(director)
        response = client.get(self._url(student))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_moyenne_unknown_period(
        self, director, student
    ):
        client = jwt_client(director)
        response = client.get(
            self._url(student),
            {"period_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_moyenne_returns_moyenne(
        self, director, student, evaluation, class_subject, period
    ):
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        Grade.objects.create(
            tenant=student.tenant,
            student=student,
            evaluation=evaluation,
            score=Decimal("14.00"),
        )
        client = jwt_client(director)
        response = client.get(
            self._url(student),
            {"period_id": period.id},
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        data = response.data["data"]
        assert data["moyenne_generale"] is not None
        assert data["mention"] is not None
        assert len(data["par_matiere"]) >= 1

    def test_moyenne_no_grades(
        self, director, student, period
    ):
        client = jwt_client(director)
        response = client.get(
            self._url(student),
            {"period_id": period.id},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert data["moyenne_generale"] is None

    def test_moyenne_tenant_isolation(
        self, student, other_tenant, director_role, period
    ):
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password=PASSWORD,
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_moy",
        )
        client = jwt_client(other_user)
        response = client.get(
            self.URL_TEMPLATE.format(student_id=student.id),
            {"period_id": period.id},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── Classement endpoint ───────────────────────────────────────────────────────


class TestClassClassement:
    URL = "/api/v1/pedagogy/classes/{class_id}/classement/"

    def test_classement_requires_period(self, director, school_class):
        client = jwt_client(director)
        response = client.get(self.URL.format(class_id=school_class.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_classement_returns_ordered_list(
        self, director, student, student_b, school_class,
        evaluation, class_subject, period,
    ):
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        Grade.objects.create(
            tenant=student.tenant,
            student=student,
            evaluation=evaluation,
            score=Decimal("18.00"),
            is_validated=True,
        )
        Grade.objects.create(
            tenant=student_b.tenant,
            student=student_b,
            evaluation=evaluation,
            score=Decimal("12.00"),
            is_validated=True,
        )
        client = jwt_client(director)
        response = client.get(
            self.URL.format(class_id=school_class.id),
            {"period_id": period.id},
        )
        assert response.status_code == status.HTTP_200_OK, response.data
        data = response.data["data"]
        assert "classement" in data
        assert len(data["classement"]) >= 2

    def test_classement_tenant_isolation(
        self, school_class, other_tenant, director_role, period
    ):
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password=PASSWORD,
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_cls",
        )
        client = jwt_client(other_user)
        response = client.get(
            self.URL.format(class_id=school_class.id),
            {"period_id": period.id},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── Bulletin endpoint ─────────────────────────────────────────────────────────


class TestStudentBulletin:
    URL_TEMPLATE = "/api/v1/students/{student_id}/bulletin/"

    def _url(self, student):
        return self.URL_TEMPLATE.format(student_id=student.id)

    def test_bulletin_requires_period(self, director, student):
        client = jwt_client(director)
        response = client.post(self._url(student))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulletin_returns_202(
        self, director, student, period
    ):
        client = jwt_client(director)
        response = client.post(
            self._url(student),
            {"period_id": period.id},
            format="json",
        )
        assert response.status_code == status.HTTP_202_ACCEPTED, response.data
        data = response.data["data"]
        assert "task_id" in data
        assert data["status"] == "processing"

    def test_bulletin_unknown_student_404(
        self, director, period
    ):
        client = jwt_client(director)
        url = self.URL_TEMPLATE.format(student_id="00000000-0000-0000-0000-000000000000")
        response = client.post(url, {"period_id": period.id}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulletin_unknown_period(
        self, director, student
    ):
        client = jwt_client(director)
        response = client.post(
            self._url(student),
            {"period_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── Task Status endpoint ──────────────────────────────────────────────────────


class TestTaskStatus:
    URL_TEMPLATE = "/api/v1/pedagogy/tasks/{task_id}/status/"

    def test_unknown_task_404(self, director):
        client = jwt_client(director)
        url = self.URL_TEMPLATE.format(
            task_id="00000000-0000-0000-0000-000000000000"
        )
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── YearEndDecision endpoint ────────────────────────────────────────────────────


class TestYearEndDecisionCreate:
    URL = "/api/v1/pedagogy/year-end-decisions/"

    def test_create_decision_admis(
        self, director, student, school_year, school_class
    ):
        client = jwt_client(director)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "ADMIS",
            "classe_destination": str(school_class.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["data"]["decision"] == "ADMIS"
        assert response.data["data"]["moyenne_annuelle"] is None

    def test_create_decision_redouble(
        self, director, student, school_year
    ):
        client = jwt_client(director)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "REDOUBLE",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["data"]["decision"] == "REDOUBLE"
        # pas de classe_destination pour un redoublement
        assert response.data["data"]["classe_destination"] is None

    def test_admis_requires_classe_destination(
        self, director, student, school_year
    ):
        client = jwt_client(director)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "ADMIS",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_exclu_rejects_classe_destination(
        self, director, student, school_year, school_class
    ):
        client = jwt_client(director)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "EXCLU",
            "classe_destination": str(school_class.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unique_per_student_per_year(
        self, director, student, school_year, school_class
    ):
        YearEndDecision.objects.create(
            tenant=student.tenant,
            student=student,
            school_year=school_year,
            decision=YearEndDecision.Decision.ADMIS,
            classe_destination=school_class,
            prise_par=director,
        )
        client = jwt_client(director)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "ADMIS",
            "classe_destination": str(school_class.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_forbidden_for_teacher(
        self, teacher, student, school_year, school_class
    ):
        client = jwt_client(teacher)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "ADMIS",
            "classe_destination": str(school_class.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_tenant_isolation(
        self, student, school_year, school_class, other_tenant, director_role
    ):
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password="SecurePass123!",
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_yd",
        )
        client = jwt_client(other_user)
        data = {
            "student": str(student.id),
            "school_year": str(school_year.id),
            "decision": "ADMIS",
            "classe_destination": str(school_class.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestYearEndDecisionList:
    URL = "/api/v1/pedagogy/year-end-decisions/"

    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get(self.URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_filters_by_school_year(
        self, director, student, school_year, school_class
    ):
        YearEndDecision.objects.create(
            tenant=student.tenant,
            student=student,
            school_year=school_year,
            decision=YearEndDecision.Decision.ADMIS,
            classe_destination=school_class,
            prise_par=director,
        )
        client = jwt_client(director)
        response = client.get(self.URL, {"school_year_id": school_year.id})
        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("data", response.data)
        results = data.get("results", [data]) if isinstance(data, dict) else data
        assert len(results) >= 1

    def test_list_tenant_isolation(
        self, student, school_year, school_class, other_tenant, director_role
    ):
        YearEndDecision.objects.create(
            tenant=student.tenant,
            student=student,
            school_year=school_year,
            decision=YearEndDecision.Decision.ADMIS,
            classe_destination=school_class,
            prise_par=None,
        )
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password="SecurePass123!",
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_ydl",
        )
        client = jwt_client(other_user)
        response = client.get(self.URL, {"school_year_id": school_year.id})
        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("data", response.data)
        results = data.get("results", [data]) if isinstance(data, dict) else data
        assert len(results) == 0


# ── Promotions bulk endpoint ────────────────────────────────────────────────────


class TestPromotionsBulk:
    URL = "/api/v1/pedagogy/promotions/bulk/"

    def test_bulk_promotes_admis(
        self, director, student, student_b, school_year, school_class
    ):
        classe_dest = SchoolClass.objects.create(
            tenant=student.tenant,
            school_year=school_year,
            level=school_class.level,
            name="5ème A",
            capacity=60,
        )
        YearEndDecision.objects.create(
            tenant=student.tenant,
            student=student,
            school_year=school_year,
            decision=YearEndDecision.Decision.ADMIS,
            classe_destination=classe_dest,
            prise_par=director,
        )
        YearEndDecision.objects.create(
            tenant=student_b.tenant,
            student=student_b,
            school_year=school_year,
            decision=YearEndDecision.Decision.ADMIS,
            classe_destination=classe_dest,
            prise_par=director,
        )
        client = jwt_client(director)
        data = {
            "classe_origine_id": str(school_class.id),
            "school_year_cible_id": str(school_year.id),
            "decisions_filter": "ADMIS",
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_200_OK, response.data
        result = response.data["data"]
        assert result["processed_count"] == 2
        assert result["skipped_count"] == 0
        student.refresh_from_db()
        assert student.classe_actuelle_id == classe_dest.id
        assert student.statut == Student.Status.ACTIF

    def test_bulk_requires_auth(self):
        client = APIClient()
        response = client.post(self.URL, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_forbidden_for_teacher(
        self, teacher, school_class, school_year
    ):
        client = jwt_client(teacher)
        data = {
            "classe_origine_id": str(school_class.id),
            "school_year_cible_id": str(school_year.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_unknown_class_404(
        self, director, school_class, school_year
    ):
        client = jwt_client(director)
        data = {
            "classe_origine_id": "00000000-0000-0000-0000-000000000000",
            "school_year_cible_id": str(school_year.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulk_tenant_isolation(
        self, school_class, school_year, other_tenant, director_role
    ):
        other_user = User.objects.create_user(
            email="autre@tenant-b.gn",
            password="SecurePass123!",
            tenant=other_tenant,
            role=director_role,
            username="autre_tenant_pb",
        )
        client = jwt_client(other_user)
        data = {
            "classe_origine_id": str(school_class.id),
            "school_year_cible_id": str(school_year.id),
        }
        response = client.post(self.URL, data, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND
