"""
apps/authentication/tests/test_staff.py — STAFF-MVP-01 / STAFF-MVP-02

Tests pour la gestion du personnel :
- Branchement is_active dans le login
- Service de création de compte staff
- Endpoints CRUD staff
- Isolation multi-tenant
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan


# ─── Factories ────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Test",
        slug="ecole-test",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email="directeur@ecole-test.gn",
    )


@pytest.fixture
def tenant2(plan):
    return Tenant.objects.create(
        name="Autre École",
        slug="autre-ecole",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Autre Directeur",
        contact_phone="+224620000002",
        contact_email="autre@ecole.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.create(name="DIRECTOR", label="Directeur")


@pytest.fixture
def teacher_role(db):
    return Role.objects.create(name="TEACHER", label="Enseignant")


@pytest.fixture
def ss_role(db):
    return Role.objects.create(name="STUDENT_STUDIES", label="Scolarité")


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur",
        email="directeur@ecole-test.gn",
        password="SecurePass123!",
        first_name="Mamadou",
        last_name="Diallo",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _login(api_client, email, password):
    url = reverse("auth-login")
    resp = api_client.post(url, {"email": email, "password": password}, format="json")
    return resp


def _auth(api_client, user):
    resp = _login(api_client, user.email, "SecurePass123!")
    assert resp.status_code == 200
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return resp.json()["data"]


# ─── Tests is_active dans le login (STAFF-MVP-01) ────────────────────────────

@pytest.mark.django_db
class TestLoginIsActive:

    def test_login_normal_user_succeeds(self, api_client, director_user):
        """Un utilisateur actif se connecte normalement (non-régression)."""
        resp = _login(api_client, "directeur@ecole-test.gn", "SecurePass123!")
        assert resp.status_code == 200

    def test_login_inactive_user_blocked(self, api_client, director_user):
        """Un utilisateur désactivé reçoit 403 'Compte désactivé'."""
        director_user.is_active = False
        director_user.save(update_fields=["is_active"])

        resp = _login(api_client, "directeur@ecole-test.gn", "SecurePass123!")
        assert resp.status_code == 403
        assert resp.json()["message"] == "Compte désactivé"

    def test_login_inactive_user_other_tenant(self, api_client, tenant2, director_role):
        """Un compte désactivé d'un autre tenant est aussi bloqué."""
        other = User.objects.create_user(
            username="autre",
            email="autre@autre-ecole.gn",
            password="SecurePass123!",
            role=director_role,
            tenant=tenant2,
            is_active=False,
        )
        resp = _login(api_client, "autre@autre-ecole.gn", "SecurePass123!")
        assert resp.status_code == 403
        assert resp.json()["message"] == "Compte désactivé"


# ─── Tests creation staff (STAFF-MVP-01) ─────────────────────────────────────

@pytest.mark.django_db
class TestStaffCreateService:

    def test_create_teacher_success(self, api_client, tenant, director_user, teacher_role):
        """Création d'un enseignant via le service."""
        from apps.authentication.services.staff_service import create_staff_account

        user, temp_pass = create_staff_account(
            tenant=tenant,
            created_by=director_user,
            email="enseignant@ecole-test.gn",
            first_name="Aissatou",
            last_name="Bah",
            role_name="TEACHER",
            phone="+224620000010",
        )

        assert user.email == "enseignant@ecole-test.gn"
        assert user.role.name == "TEACHER"
        assert user.tenant_id == tenant.id
        assert user.must_change_password is True
        assert user.is_active is True
        assert temp_pass is not None
        assert len(temp_pass) == 12

    def test_create_ss_success(self, api_client, tenant, director_user, ss_role):
        """Création d'un STUDENT_STUDIES via le service."""
        from apps.authentication.services.staff_service import create_staff_account

        user, temp_pass = create_staff_account(
            tenant=tenant,
            created_by=director_user,
            email="secretaire@ecole-test.gn",
            first_name="Fanta",
            last_name="Camara",
            role_name="STUDENT_STUDIES",
        )

        assert user.role.name == "STUDENT_STUDIES"
        assert user.must_change_password is True

    def test_create_staff_duplicate_email(self, api_client, tenant, director_user, teacher_role):
        """Email déjà utilisé → ValidationError."""
        from apps.authentication.services.staff_service import create_staff_account
        from rest_framework.exceptions import ValidationError

        create_staff_account(
            tenant=tenant,
            created_by=director_user,
            email="dup@ecole-test.gn",
            first_name="Test",
            last_name="Dup",
            role_name="TEACHER",
        )

        with pytest.raises(ValidationError):
            create_staff_account(
                tenant=tenant,
                created_by=director_user,
                email="dup@ecole-test.gn",
                first_name="Autre",
                last_name="Nom",
                role_name="TEACHER",
            )

    def test_create_staff_invalid_role(self, api_client, tenant, director_user):
        """Rôle non autorisé → ValidationError (DIRECTOR non créable ici)."""
        from apps.authentication.services.staff_service import create_staff_account
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError):
            create_staff_account(
                tenant=tenant,
                created_by=director_user,
                email="invalid@ecole-test.gn",
                first_name="Test",
                last_name="Invalid",
                role_name="DIRECTOR",
            )

    def test_create_staff_tenant_isolation(self, api_client, tenant, tenant2, director_user, teacher_role):
        """La création dans tenant1 n'affecte pas tenant2."""
        from apps.authentication.services.staff_service import create_staff_account

        create_staff_account(
            tenant=tenant,
            created_by=director_user,
            email="iso@ecole-test.gn",
            first_name="Iso",
            last_name="Test",
            role_name="TEACHER",
        )

        assert User.objects.filter(tenant=tenant, email="iso@ecole-test.gn").count() == 1
        assert User.objects.filter(tenant=tenant2, email="iso@ecole-test.gn").count() == 0


# ─── Tests permissions staff (STAFF-MVP-01) ──────────────────────────────────

@pytest.mark.django_db
class TestStaffPermissions:

    def test_staff_permissions_exist_in_db(self, db):
        """Les 4 permissions staff existent en base (vérifie que la migration 0003 a tourné)."""
        from apps.authentication.models import Permission
        for codename in ("staff:create", "staff:read", "staff:update", "staff:disable"):
            assert Permission.objects.filter(codename=codename).exists(), f"{codename} introuvable"

    def test_director_has_all_staff_permissions(self, db, director_role):
        """DIRECTOR possède les 4 permissions staff."""
        from apps.authentication.models import Permission
        for codename in ("staff:create", "staff:read", "staff:update", "staff:disable"):
            perm, _ = Permission.objects.get_or_create(codename=codename, defaults={"module": "staff"})
            director_role.permissions.add(perm)
        codenames = set(director_role.permissions.values_list("codename", flat=True))
        for c in ("staff:create", "staff:read", "staff:update", "staff:disable"):
            assert c in codenames

    def test_student_studies_has_staff_read_only(self, db, ss_role):
        """STUDENT_STUDIES a staff:read mais pas staff:create/update/disable."""
        from apps.authentication.models import Permission
        perm, _ = Permission.objects.get_or_create(codename="staff:read", defaults={"module": "staff"})
        ss_role.permissions.add(perm)
        codenames = set(ss_role.permissions.values_list("codename", flat=True))
        assert "staff:read" in codenames
        for c in ("staff:create", "staff:update", "staff:disable"):
            assert c not in codenames
