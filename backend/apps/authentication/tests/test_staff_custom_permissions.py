"""
apps/authentication/tests/test_staff_custom_permissions.py — STAFF-V2-03

Tests pour :
- GET /auth/permissions/catalog/ (catalogue des permissions)
- PATCH /auth/staff/{id}/custom-permissions/ (rôles composites)
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
        name="École Test SV3", slug="ecole-test-sv3", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000002", contact_email="directeur@ecole-test-sv3.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.create(name="DIRECTOR", label="Directeur")


@pytest.fixture
def teacher_role(db):
    return Role.objects.create(name="TEACHER", label="Enseignant")


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-sv3", email="directeur@ecole-test-sv3.gn", password="SecurePass123!",
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


def _seed_catalog():
    """Catalogue minimal pour les tests (le vrai catalogue est semé par des migrations en prod)."""
    codenames = [
        "eleves:read", "eleves:create", "finance:read", "finance:create",
        "notes:read", "notes:create", "staff:read",
    ]
    for c in codenames:
        Permission.objects.get_or_create(codename=c, defaults={"module": c.split(":")[0]})
    return codenames


@pytest.mark.django_db
class TestPermissionsCatalog:
    def test_catalog_returns_all_permissions(self, api_client, tenant, director_user, director_role):
        codenames = _seed_catalog()
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("auth-permissions-catalog"))
        assert resp.status_code == 200, resp.json()
        returned = {p["codename"] for p in resp.json()["data"]}
        assert set(codenames) <= returned
        # forme attendue par le sélecteur frontend
        first = resp.json()["data"][0]
        assert set(first.keys()) == {"codename", "name", "module"}

    def test_catalog_forbidden_without_staff_update_permission(
        self, api_client, tenant, director_user, director_role
    ):
        _seed_catalog()
        _auth(api_client, director_user)  # aucune permission accordée

        resp = api_client.get(reverse("auth-permissions-catalog"))
        assert resp.status_code == 403

    def test_catalog_accessible_with_roles_read_alone(
        self, api_client, tenant, director_user, director_role
    ):
        """
        ROLES-V2-01 : HasAnyPermission — roles:read seul (sans staff:update)
        suffit désormais, pour l'éditeur de rôles.
        """
        _seed_catalog()
        perm, _ = Permission.objects.get_or_create(codename="roles:read", defaults={"module": "roles"})
        director_role.permissions.add(perm)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("auth-permissions-catalog"))
        assert resp.status_code == 200, resp.json()


@pytest.mark.django_db
class TestStaffCustomPermissions:
    def test_grant_custom_permissions(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens-sv3", email="ens-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="A", last_name="B",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read", "finance:create"]},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["custom_permissions"] == ["finance:read", "finance:create"]

        teacher.refresh_from_db()
        assert teacher.custom_permissions == ["finance:read", "finance:create"]

    def test_composite_role_grants_effective_access_via_can(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """Le mécanisme complet : User.can() doit voir la permission ajoutée sans nouveau rôle en base."""
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens2-sv3", email="ens2-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="C", last_name="D",
        )
        assert teacher.can("finance:read") is False

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 200

        teacher.refresh_from_db()
        assert teacher.can("finance:read") is True
        assert teacher.role.name == "TEACHER"  # pas de nouveau rôle créé

    def test_replaces_list_entirely_not_incremental(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens3-sv3", email="ens3-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="E", last_name="F",
            custom_permissions=["finance:read"],
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["notes:read"]},
            format="json",
        )
        assert resp.status_code == 200
        teacher.refresh_from_db()
        assert teacher.custom_permissions == ["notes:read"]  # finance:read n'est plus là

    def test_empty_list_clears_custom_permissions(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens4-sv3", email="ens4-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="G", last_name="H",
            custom_permissions=["finance:read"],
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": []},
            format="json",
        )
        assert resp.status_code == 200
        teacher.refresh_from_db()
        assert teacher.custom_permissions == []

    def test_unknown_codename_rejected(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens5-sv3", email="ens5-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="I", last_name="J",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read", "totally:fake:codename"]},
            format="json",
        )
        assert resp.status_code == 400
        teacher.refresh_from_db()
        assert teacher.custom_permissions == []

    def test_duplicate_codenames_rejected(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens6-sv3", email="ens6-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="K", last_name="L",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read", "finance:read"]},
            format="json",
        )
        assert resp.status_code == 400

    def test_creates_audit_log_with_old_and_new_permissions(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        from apps.monitoring.models import AuditLog

        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens7-sv3", email="ens7-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="M", last_name="N",
            custom_permissions=["finance:read"],
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["notes:read", "notes:create"]},
            format="json",
        )
        assert resp.status_code == 200

        log = AuditLog.objects.filter(
            action="staff:custom-permissions", target_id=str(teacher.id)
        ).first()
        assert log is not None
        assert log.user_id == director_user.id
        assert log.extra["old_permissions"] == ["finance:read"]
        assert log.extra["new_permissions"] == ["notes:read", "notes:create"]

    def test_forbidden_without_staff_update_permission(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens8-sv3", email="ens8-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="O", last_name="P",
        )
        # Aucune permission accordée à director_role.
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 403
        teacher.refresh_from_db()
        assert teacher.custom_permissions == []

    def test_cross_tenant_isolation(
        self, api_client, tenant, director_user, director_role, teacher_role
    ):
        """Un directeur d'un autre tenant ne peut pas voir/modifier un compte staff hors de son tenant."""
        from apps.superadmin.models import Plan, Tenant

        _seed_catalog()
        teacher = User.objects.create_user(
            username="ens9-sv3", email="ens9-sv3@ecole-test-sv3.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="Q", last_name="R",
        )

        other_plan = Plan.objects.create(name="Autre Plan")
        other_tenant = Tenant.objects.create(
            name="École Autre", slug="ecole-autre-sv3", school_type=Tenant.SchoolType.MIXTE,
            status=Tenant.Status.ACTIVE, plan=other_plan, contact_name="Autre Directeur",
            contact_phone="+224620000003", contact_email="autre@ecole-autre-sv3.gn",
        )
        # Role est global (pas de champ tenant) — le même Role "DIRECTOR" est
        # partagé entre tenants, seul l'utilisateur change de tenant.
        other_director = User.objects.create_user(
            username="autre-directeur-sv3", email="autre-directeur@ecole-autre-sv3.gn",
            password="SecurePass123!", first_name="Autre", last_name="Directeur",
            role=director_role, tenant=other_tenant,
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, other_director)

        resp = api_client.patch(
            reverse("staff-custom-permissions", args=[str(teacher.id)]),
            {"custom_permissions": ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 404
        teacher.refresh_from_db()
        assert teacher.custom_permissions == []
