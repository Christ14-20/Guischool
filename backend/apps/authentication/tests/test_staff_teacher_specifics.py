"""
apps/authentication/tests/test_staff_teacher_specifics.py — STAFF-V2-04

Tests pour les spécificités enseignants : grade, statut_emploi (StaffProfile),
et la fenêtre d'accès temporelle (access_start_date/access_end_date, mécanisme
GUEST_TEACHER) vérifiée au login.
"""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, StaffProfile, Permission


# ─── Fixtures (mêmes conventions que test_staff_profile.py) ───────────────────

@pytest.fixture
def plan(db):
    from apps.superadmin.models import Plan
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="École Test SV4", slug="ecole-test-sv4", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000004", contact_email="directeur@ecole-test-sv4.gn",
    )


@pytest.fixture
def director_role(tenant):
    return Role.objects.create(name="DIRECTOR", label="Directeur", tenant=tenant)


@pytest.fixture
def teacher_role(tenant):
    return Role.objects.create(name="TEACHER", label="Enseignant", tenant=tenant)


@pytest.fixture
def accountant_role(tenant):
    return Role.objects.get_or_create(
        name="ACCOUNTANT", tenant=tenant, defaults={"label": "Comptable"}
    )[0]


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-sv4", email="directeur@ecole-test-sv4.gn", password="SecurePass123!",
        first_name="Mamadou", last_name="Diallo", role=director_role, tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _auth(api_client, user, password="SecurePass123!"):
    url = reverse("auth-login")
    resp = api_client.post(url, {"email": user.email, "password": password}, format="json")
    assert resp.status_code == 200, resp.json()
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _ensure_director_permissions(director_role):
    for c in ("staff:create", "staff:read", "staff:update", "staff:disable"):
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "staff"})
        director_role.permissions.add(perm)


# ─── Champs RH (grade, statut_emploi) ──────────────────────────────────────────

@pytest.mark.django_db
class TestGradeAndStatutEmploiFields:
    def test_create_via_api_persists_teacher_fields(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {
                "email": "prof@ecole-test-sv4.gn", "first_name": "Aissatou", "last_name": "Bah",
                "role": str(teacher_role.id), "grade": "PROFESSEUR_CERTIFIE", "statut_emploi": "TITULAIRE",
                "access_start_date": "2026-09-01", "access_end_date": "2027-06-30",
            },
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()["data"]
        assert data["grade"] == "PROFESSEUR_CERTIFIE"
        assert data["statut_emploi"] == "TITULAIRE"
        assert data["access_start_date"] == "2026-09-01"
        assert data["access_end_date"] == "2027-06-30"

    def test_create_without_teacher_fields_defaults_blank(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {"email": "minimal2@ecole-test-sv4.gn", "first_name": "A", "last_name": "B", "role": str(teacher_role.id)},
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()["data"]
        assert data["grade"] == ""
        assert data["statut_emploi"] == ""
        assert data["access_start_date"] is None
        assert data["access_end_date"] is None

    def test_invalid_grade_returns_400(self, api_client, tenant, director_user, director_role, teacher_role):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {"email": "grade-invalide@ecole-test-sv4.gn", "first_name": "A", "last_name": "B",
             "role": str(teacher_role.id), "grade": "PAS_UN_GRADE"},
            format="json",
        )
        assert resp.status_code == 400

    def test_patch_updates_grade_and_statut_emploi(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="patch-grade@ecole-test-sv4.gn",
            first_name="C", last_name="D", role_id=str(teacher_role.id),
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]),
            {"grade": "INSTITUTEUR", "statut_emploi": "CONTRACTUEL"},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        profile = StaffProfile.objects.get(user=user)
        assert profile.grade == "INSTITUTEUR"
        assert profile.statut_emploi == "CONTRACTUEL"

    def test_grade_and_statut_emploi_not_cleared_by_change_role(
        self, api_client, tenant, director_user, director_role, teacher_role, accountant_role
    ):
        """
        Décision PO : contrairement à `subjects_taught`, grade/statut_emploi
        sont des métadonnées RH d'historique — pas de vidage automatique au
        changement de rôle.
        """
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="grade-persist@ecole-test-sv4.gn",
            first_name="E", last_name="F", role_id=str(teacher_role.id),
            grade="PROFESSEUR_CERTIFIE", statut_emploi="TITULAIRE",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-change-role", args=[str(user.id)]), {"role": str(accountant_role.id)}, format="json",
        )
        assert resp.status_code == 200, resp.json()

        profile = StaffProfile.objects.get(user=user)
        assert profile.grade == "PROFESSEUR_CERTIFIE"
        assert profile.statut_emploi == "TITULAIRE"


# ─── Fenêtre d'accès temporelle (GUEST_TEACHER) ────────────────────────────────

@pytest.mark.django_db
class TestAccessWindowLogin:
    def _make_teacher(self, tenant, director_user, teacher_role, **profile_kwargs):
        from apps.authentication.services.staff_service import create_staff_account
        user, temp_pass = create_staff_account(
            tenant=tenant, created_by=director_user, email=profile_kwargs.pop("email"),
            first_name="G", last_name="H", role_id=str(teacher_role.id), **profile_kwargs,
        )
        user.must_change_password = False
        user.set_password("P@ssTeacher123!")
        user.save()
        return user

    def test_login_blocked_before_access_start_date(self, api_client, tenant, director_user, teacher_role):
        tomorrow = date.today() + timedelta(days=1)
        user = self._make_teacher(
            tenant, director_user, teacher_role,
            email="pas-encore@ecole-test-sv4.gn", access_start_date=tomorrow,
        )

        resp = api_client.post(
            reverse("auth-login"), {"email": user.email, "password": "P@ssTeacher123!"}, format="json",
        )
        assert resp.status_code == 403
        assert "pas encore actif" in resp.json()["message"]

    def test_login_blocked_after_access_end_date(self, api_client, tenant, director_user, teacher_role):
        yesterday = date.today() - timedelta(days=1)
        user = self._make_teacher(
            tenant, director_user, teacher_role,
            email="expire@ecole-test-sv4.gn", access_end_date=yesterday,
        )

        resp = api_client.post(
            reverse("auth-login"), {"email": user.email, "password": "P@ssTeacher123!"}, format="json",
        )
        assert resp.status_code == 403
        assert "plus actif" in resp.json()["message"]

    def test_login_allowed_within_access_window(self, api_client, tenant, director_user, teacher_role):
        yesterday = date.today() - timedelta(days=1)
        tomorrow = date.today() + timedelta(days=1)
        user = self._make_teacher(
            tenant, director_user, teacher_role,
            email="dans-la-fenetre@ecole-test-sv4.gn",
            access_start_date=yesterday, access_end_date=tomorrow,
        )

        resp = api_client.post(
            reverse("auth-login"), {"email": user.email, "password": "P@ssTeacher123!"}, format="json",
        )
        assert resp.status_code == 200, resp.json()

    def test_login_allowed_when_no_window_set(self, api_client, tenant, director_user, teacher_role):
        """Comportement historique inchangé : pas de fenêtre = pas de restriction."""
        user = self._make_teacher(tenant, director_user, teacher_role, email="sans-fenetre@ecole-test-sv4.gn")

        resp = api_client.post(
            reverse("auth-login"), {"email": user.email, "password": "P@ssTeacher123!"}, format="json",
        )
        assert resp.status_code == 200, resp.json()

    def test_login_unaffected_for_account_without_staff_profile(
        self, api_client, tenant, director_user
    ):
        """DIRECTOR/SUPER_ADMIN/PARENT n'ont jamais de StaffProfile — le login ne doit pas planter."""
        resp = api_client.post(
            reverse("auth-login"), {"email": director_user.email, "password": "SecurePass123!"}, format="json",
        )
        assert resp.status_code == 200, resp.json()
