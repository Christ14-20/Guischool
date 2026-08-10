"""
apps/authentication/tests/test_staff_change_role.py — STAFF-V2-02

Tests pour PATCH /auth/staff/{id}/change-role/ : rôles autorisés,
nettoyage de subjects_taught, AuditLog, permissions.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    from apps.superadmin.models import Plan
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="École Test SV2", slug="ecole-test-sv2", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000001", contact_email="directeur@ecole-test-sv2.gn",
    )


@pytest.fixture
def director_role(tenant):
    return Role.objects.create(name="DIRECTOR", label="Directeur", tenant=tenant)


@pytest.fixture
def teacher_role(tenant):
    return Role.objects.create(name="TEACHER", label="Enseignant", tenant=tenant)


@pytest.fixture
def ss_role(tenant):
    return Role.objects.create(name="STUDENT_STUDIES", label="Scolarité", tenant=tenant)


@pytest.fixture
def accountant_role(tenant):
    return Role.objects.get_or_create(
        name="ACCOUNTANT", tenant=tenant, defaults={"label": "Comptable"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-sv2", email="directeur@ecole-test-sv2.gn", password="SecurePass123!",
        first_name="Mamadou", last_name="Diallo", role=director_role, tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _auth(api_client, user):
    url = reverse("auth-login")
    resp = api_client.post(url, {"email": user.email, "password": "SecurePass123!"}, format="json")
    assert resp.status_code == 200, resp.json()
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _ensure_director_permissions(director_role):
    for c in ("staff:create", "staff:read", "staff:update", "staff:disable"):
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "staff"})
        director_role.permissions.add(perm)


@pytest.mark.django_db
class TestChangeRole:
    def test_teacher_to_accountant_clears_subjects(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        teacher = User.objects.create_user(
            username="ens-sv2", email="ens-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="A", last_name="B",
            subjects_taught=["MATH", "PC"],
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {"role": str(accountant_role.id)}, format="json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["role"]["name"] == "ACCOUNTANT"
        assert resp.json()["data"]["subjects_taught"] == []

        teacher.refresh_from_db()
        assert teacher.role.name == "ACCOUNTANT"
        assert teacher.subjects_taught == []

    def test_accountant_to_teacher_does_not_touch_subjects(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        """subjects_taught n'est jamais peuplé automatiquement — reste vide, à assigner ensuite via PATCH."""
        accountant = User.objects.create_user(
            username="comptable-sv2", email="comptable-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=accountant_role, tenant=tenant, first_name="C", last_name="D",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(accountant.id)]), {"role": str(teacher_role.id)}, format="json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["role"]["name"] == "TEACHER"
        assert resp.json()["data"]["subjects_taught"] == []

    def test_ss_to_ss_same_role_returns_400(
        self, api_client, tenant, director_user, director_role, ss_role
    ):
        ss = User.objects.create_user(
            username="ss-sv2", email="ss-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=ss_role, tenant=tenant, first_name="E", last_name="F",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(ss.id)]), {"role": str(ss_role.id)}, format="json",
        )
        assert resp.status_code == 400
        ss.refresh_from_db()
        assert ss.role.name == "STUDENT_STUDIES"

    def test_target_director_role_rejected(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        teacher = User.objects.create_user(
            username="ens2-sv2", email="ens2-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="G", last_name="H",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {"role": str(director_role.id)}, format="json",
        )
        assert resp.status_code == 400
        teacher.refresh_from_db()
        assert teacher.role.name == "TEACHER"

    def test_missing_role_returns_400(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        teacher = User.objects.create_user(
            username="ens3-sv2", email="ens3-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="I", last_name="J",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {}, format="json",
        )
        assert resp.status_code == 400

    def test_creates_audit_log_with_old_and_new_role(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        from apps.monitoring.models import AuditLog

        teacher = User.objects.create_user(
            username="ens4-sv2", email="ens4-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="K", last_name="L",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {"role": str(accountant_role.id)}, format="json",
        )
        assert resp.status_code == 200

        log = AuditLog.objects.filter(action="staff:change-role", target_id=str(teacher.id)).first()
        assert log is not None
        assert log.user_id == director_user.id
        assert log.extra["old_role"] == "TEACHER"
        assert log.extra["new_role"] == "ACCOUNTANT"

    def test_forbidden_without_staff_update_permission(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        teacher = User.objects.create_user(
            username="ens5-sv2", email="ens5-sv2@ecole-test-sv2.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="M", last_name="N",
        )
        # Aucune permission accordée à director_role.
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {"role": str(accountant_role.id)}, format="json",
        )
        assert resp.status_code == 403
        teacher.refresh_from_db()
        assert teacher.role.name == "TEACHER"

    def test_staff_profile_untouched_by_role_change(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        """Le profil RH (StaffProfile) ne dépend pas du rôle — inchangé par change-role."""
        from apps.authentication.services.staff_service import create_staff_account
        from apps.authentication.models import StaffProfile

        teacher, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="ens6-sv2@ecole-test-sv2.gn",
            first_name="O", last_name="P", role_id=str(teacher_role.id), numero_cnss="CNSS-555",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(teacher.id)]), {"role": str(accountant_role.id)}, format="json",
        )
        assert resp.status_code == 200
        assert StaffProfile.objects.get(user=teacher).numero_cnss == "CNSS-555"
