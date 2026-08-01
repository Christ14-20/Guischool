"""
tests/test_comm_mvp_02.py — COMM-MVP-02

Tests d'intégration des 4 déclencheurs SMS :
  1. Absence   (send_absence_notification_sms)
  2. Inscription (send_enrollment_confirmation_sms)
  3. Paiement   (notify_payment — CASH)
  4. Note validée (notify_grade_validated — endpoint API /valider/)

Chaque test vérifie qu'un SMSLog est créé avec le bon trigger_type.
"""

import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.urls import reverse

from apps.authentication.models import User, Permission, Role
from apps.superadmin.models import Plan, Tenant
from apps.pedagogy.models import (
    Student, Level, SchoolClass, SchoolYear, Subject, AcademicPeriod,
    Evaluation, Grade, Enrollment,
)
from apps.finance.models import Payment, StudentFee, FeeCategory

pytestmark = pytest.mark.django_db


# =============================================================================
# Fixtures partagées
# =============================================================================

@pytest.fixture(autouse=True)
def _celery_eager(settings):
    """Exécute les tâches Celery .delay() en synchrone."""
    settings.CELERY_TASK_ALWAYS_EAGER = True


@pytest.fixture(autouse=True)
def _local_storage(settings):
    """
    Override S3 storage → FileSystemStorage pour la génération de reçus.

    INFRA-V2-01 : `DEFAULT_FILE_STORAGE` n'est plus lu par Django depuis la
    5.0 (seul `STORAGES` l'est) — cet override était un no-op silencieux
    depuis toujours. `default_storage` retombait déjà sur FileSystemStorage
    par défaut (bug de config réel, corrigé dans config/settings/base.py),
    ce qui masquait le problème ici. Corrigé pour cibler `STORAGES`.
    """
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan Eduguinee")


@pytest.fixture
def tenant(plan):
    t = Tenant.objects.create(
        name="Test School", slug="test-school",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Test",
        contact_phone="+224620000001",
        contact_email="test@ecole.gn",
    )
    return t


@pytest.fixture
def school_year(tenant):
    return SchoolYear.objects.create(
        tenant=tenant,
        label="2025-2026",
        start_date="2025-09-01",
        end_date="2026-08-31",
        is_current=True,
    )


@pytest.fixture
def director_role(db):
    role, _ = Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})
    return role


@pytest.fixture
def director_user(tenant, director_role):
    user = User.objects.create_user(
        username="directeur-test",
        email="directeur@test.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )
    return user


@pytest.fixture
def teacher_role(db):
    role, _ = Role.objects.get_or_create(name="TEACHER", defaults={"label": "Professeur"})
    return role


@pytest.fixture
def teacher_user(tenant, teacher_role):
    user = User.objects.create_user(
        username="teacher-test",
        email="teacher@test.gn",
        password="SecurePass123!",
        role=teacher_role,
        tenant=tenant,
    )
    return user


@pytest.fixture
def level(tenant):
    return Level.objects.create(tenant=tenant, name="6ème", cycle="PRIMAIRE", order_index=1)


@pytest.fixture
def school_class(tenant, school_year, level):
    return SchoolClass.objects.create(
        tenant=tenant, school_year=school_year, level=level, name="6ème A", capacity=60,
    )


@pytest.fixture
def guardian_role(db):
    role, _ = Role.objects.get_or_create(name="PARENT", defaults={"label": "Parent d'élève"})
    return role


@pytest.fixture
def guardian_user(tenant, guardian_role):
    return User.objects.create_user(
        username="parent-test",
        email="parent@test.gn",
        password="SecurePass123!",
        role=guardian_role,
        tenant=tenant,
    )


@pytest.fixture
def guardian(tenant, student, guardian_user):
    from apps.pedagogy.models import Guardian
    g = Guardian.objects.create(
        tenant=tenant,
        student=student,
        nom_complet="Parent Test",
        telephone="+224655112233",
        lien="TUTEUR",
        user=guardian_user,
    )
    return g


@pytest.fixture
def student(tenant, school_class, school_year):
    s = Student.objects.create(
        tenant=tenant,
        matricule="STU001",
        nom="Diallo",
        prenom="Alpha",
        date_naissance="2010-05-15",
        sexe="M",
        statut="ACTIF",
        classe_actuelle=school_class,
        annee_inscription=school_year,
    )
    Enrollment.objects.create(
        tenant=tenant,
        student=s,
        school_year=school_year,
        classe=school_class,
        date_inscription="2025-09-01",
    )
    return s


@pytest.fixture
def period(tenant, school_year):
    return AcademicPeriod.objects.create(
        tenant=tenant,
        school_year=school_year,
        name="Trimestre 1",
        type="TRIMESTRE",
        start_date="2025-10-01",
        end_date="2025-12-31",
        order=1,
    )


@pytest.fixture
def subject(tenant):
    return Subject.objects.create(
        tenant=tenant,
        code="MATH",
        name="Mathematiques",
    )


@pytest.fixture
def evaluation(tenant, school_class, subject, period, teacher_user):
    return Evaluation.objects.create(
        tenant=tenant,
        class_obj=school_class,
        subject=subject,
        period=period,
        teacher=teacher_user,
        type="DS",
        title="Devoir 1",
        max_score=20,
        date="2025-10-15",
        is_locked=True,
    )


@pytest.fixture
def grade(tenant, student, evaluation):
    return Grade.objects.create(
        tenant=tenant,
        student=student,
        evaluation=evaluation,
        score=15,
        note_convertie=15,
    )


@pytest.fixture
def fee_category(tenant, school_year):
    return FeeCategory.objects.create(
        tenant=tenant,
        school_year=school_year,
        name="Frais de scolarite",
        type="SCOLARITE",
        amount=Decimal("100000"),
    )


@pytest.fixture
def student_fee(tenant, student, fee_category):
    return StudentFee.objects.create(
        tenant=tenant,
        student=student,
        fee_category=fee_category,
        total_amount=Decimal("100000"),
        discount_amount=Decimal("50000"),
        balance_due=Decimal("50000"),
    )


# =============================================================================
# Helpers
# =============================================================================

def jwt_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def _ensure_permissions(role, codenames):
    for c in codenames:
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "notes"})
        role.permissions.add(perm)


def _ensure_payment_permissions(role):
    for c in ["finance:read", "finance:create"]:
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "finance"})
        role.permissions.add(perm)


# =============================================================================
# Tests Absence (déclencheur 1)
# =============================================================================

class TestAbsenceTrigger:
    def test_notify_absence_creates_sms_log(self, tenant, student, guardian):
        from apps.communication.services import notify_absence

        notify_absence(str(student.id), "+224655112233")

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="ABSENCE")
        assert logs.count() == 1
        assert "absent" in logs.first().content.lower()

    def test_absence_stub_delegates(self, tenant, student, guardian):
        from apps.pedagogy.tasks import send_absence_notification_sms
        from apps.communication.models import SMSLog

        send_absence_notification_sms(str(student.id), "+224655112233")

        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="ABSENCE")
        assert logs.count() == 1


# =============================================================================
# Tests Inscription (déclencheur 2)
# =============================================================================

class TestEnrollmentTrigger:
    def test_notify_enrollment_creates_sms_log(self, tenant, student, guardian):
        from apps.communication.services import notify_enrollment

        notify_enrollment(str(student.id), "+224655112233")

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="INSCRIPTION")
        assert logs.count() == 1
        assert "inscription" in logs.first().content.lower()

    def test_enrollment_stub_delegates(self, tenant, student, guardian):
        from apps.pedagogy.tasks import send_enrollment_confirmation_sms
        from apps.communication.models import SMSLog

        send_enrollment_confirmation_sms(str(student.id), "+224655112233")

        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="INSCRIPTION")
        assert logs.count() == 1


# =============================================================================
# Tests Paiement (déclencheur 3)
# =============================================================================

class TestPaymentTrigger:
    def test_notify_payment_creates_sms_log(self, tenant, student, guardian, student_fee):
        payment = Payment.objects.create(
            tenant=tenant,
            student=student,
            amount=Decimal("50000"),
            method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="test-payment-sms-001",
        )
        from apps.communication.services import notify_payment

        notify_payment(str(payment.id), str(tenant.id))

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="PAIEMENT")
        assert logs.count() == 1
        assert "50,000" in logs.first().content

    def test_cash_payment_endpoint_triggers_sms(self, tenant, student, guardian, student_fee, director_user, director_role):
        _ensure_payment_permissions(director_role)
        from unittest.mock import patch

        with patch("django.db.transaction.on_commit", side_effect=lambda cb: cb()):
            client = jwt_client(director_user)
            response = client.post(
                reverse("payment-list"),
                {
                    "student_id": str(student.id),
                    "student_fee_id": str(student_fee.id),
                    "amount": "50000",
                    "method": "CASH",
                    "idempotency_key": "cash-sms-test",
                },
                format="json",
            )
        assert response.status_code == 201, f"Error: {response.json()}"

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="PAIEMENT")
        assert logs.count() == 1

        payment = Payment.objects.get(idempotency_key="cash-sms-test")
        assert payment.sms_notification_sent is True


# =============================================================================
# Tests Note validée (déclencheur 4)
# =============================================================================

class TestGradeValidationTrigger:
    def test_notify_grade_validated_creates_sms_log(self, tenant, student, guardian, grade):
        from apps.communication.services import notify_grade_validated

        notify_grade_validated(str(grade.id), str(tenant.id))

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="NOTE_VALIDEE")
        assert logs.count() == 1
        assert "note" in logs.first().content.lower()
        assert "mathematiques" in logs.first().content.lower()

    def test_grade_validation_endpoint_triggers_sms(self, tenant, student, guardian, evaluation, grade, teacher_user, teacher_role):
        _ensure_permissions(teacher_role, ["notes:validate"])
        from apps.communication.models import SMSLog

        client = jwt_client(teacher_user)
        response = client.post(
            f"/api/v1/grades/{grade.id}/valider/",
            {},
            format="json",
        )
        assert response.status_code == 200, f"Error: {response.data}"

        logs = SMSLog.objects.filter(
            recipient_phone="+224655112233",
            trigger_type="NOTE_VALIDEE",
        )
        assert logs.count() == 1

    def test_no_guardian_skips_sms(self, tenant, student, grade):
        from apps.communication.services import notify_grade_validated
        from apps.communication.models import SMSLog

        notify_grade_validated(str(grade.id), str(tenant.id))

        assert SMSLog.objects.filter(trigger_type="NOTE_VALIDEE").count() == 0


# =============================================================================
# Tests isolation multi-tenant
# =============================================================================

class TestMultiTenantIsolation:
    def test_absence_sms_tenant_isolation(self, tenant, student, guardian):
        from apps.communication.services import notify_absence

        notify_absence(str(student.id), "+224655112233")

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="ABSENCE")
        assert logs.count() == 1
        assert logs.first().tenant_id == tenant.id

    def test_payment_sms_tenant_isolation(self, tenant, student, guardian, student_fee):
        payment = Payment.objects.create(
            tenant=tenant,
            student=student,
            amount=Decimal("50000"),
            method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key="test-payment-sms-iso",
        )
        from apps.communication.services import notify_payment
        notify_payment(str(payment.id), str(tenant.id))

        from apps.communication.models import SMSLog
        logs = SMSLog.objects.filter(recipient_phone="+224655112233", trigger_type="PAIEMENT")
        assert logs.count() == 1
        assert logs.first().tenant_id == tenant.id
