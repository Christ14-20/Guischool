"""
apps/authentication/tests/test_role_endpoints.py — ROLES-V2-01

Tests pour RoleViewSet (/auth/roles/) : CRUD des rôles tenant-scopés,
socle anti-verrouillage DIRECTOR, immutabilité des rôles de base,
isolation multi-tenant, blocage de suppression si assigné.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, Permission
from apps.authentication.services.role_service import DIRECTOR_PERMISSION_FLOOR


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    from apps.superadmin.models import Plan
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="École Test Roles", slug="ecole-test-roles", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000001", contact_email="directeur@ecole-test-roles.gn",
    )


@pytest.fixture
def tenant2(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="Autre École Roles", slug="autre-ecole-roles", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Autre Directeur",
        contact_phone="+224620000002", contact_email="autre@ecole-roles.gn",
    )


def _ensure_permissions(role, codenames):
    for c in codenames:
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": c.split(":")[0]})
        role.permissions.add(perm)


ROLES_ALL = {"roles:read", "roles:create", "roles:update", "roles:delete"}


@pytest.fixture
def director_role(tenant):
    role = Role.objects.create(name="DIRECTOR", label="Directeur", tenant=tenant)
    _ensure_permissions(role, ROLES_ALL | DIRECTOR_PERMISSION_FLOOR)
    return role


@pytest.fixture
def teacher_role(tenant):
    return Role.objects.create(name="TEACHER", label="Enseignant", tenant=tenant)


@pytest.fixture
def director_role_t2(tenant2):
    role = Role.objects.create(name="DIRECTOR", label="Directeur", tenant=tenant2)
    _ensure_permissions(role, ROLES_ALL | DIRECTOR_PERMISSION_FLOOR)
    return role


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-roles", email="directeur@ecole-test-roles.gn", password="SecurePass123!",
        first_name="Mamadou", last_name="Diallo", role=director_role, tenant=tenant,
    )


@pytest.fixture
def director_user_t2(tenant2, director_role_t2):
    return User.objects.create_user(
        username="directeur-roles-t2", email="directeur@autre-ecole-roles.gn", password="SecurePass123!",
        first_name="Autre", last_name="Directeur", role=director_role_t2, tenant=tenant2,
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


# ─── Retrieve (détail) ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleRetrieve:
    def test_retrieve_uses_standard_success_envelope(self, api_client, director_user, teacher_role):
        """
        Régression : ModelViewSet.retrieve() par défaut renvoie le serializer
        nu (pas de {status, data}), contrairement à list() qui l'obtient
        gratuitement via StandardPagination. RoleViewSet doit le surcharger
        comme StaffViewSet.retrieve() — sans ça, le frontend (qui teste
        `resp.data?.status === "success"`) affiche "Rôle introuvable" alors
        que la requête a réussi (200) et que le rôle existe bel et bien.
        """
        _auth(api_client, director_user)
        resp = api_client.get(reverse("role-detail", args=[str(teacher_role.id)]))
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["data"]["id"] == str(teacher_role.id)
        assert body["data"]["name"] == "TEACHER"


# ─── Liste / isolation tenant ───────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleList:
    def test_list_returns_only_own_tenant_roles(self, api_client, director_user, teacher_role):
        _auth(api_client, director_user)
        resp = api_client.get(reverse("role-list"))
        assert resp.status_code == 200
        names = {r["name"] for r in resp.json()["data"]["results"]}
        assert names == {"DIRECTOR", "TEACHER"}

    def test_list_excludes_other_tenant_roles(self, api_client, director_user, director_user_t2):
        _auth(api_client, director_user)
        resp = api_client.get(reverse("role-list"))
        ids = {r["id"] for r in resp.json()["data"]["results"]}
        assert str(director_user_t2.role_id) not in ids

    def test_list_forbidden_without_roles_read(self, api_client, tenant, teacher_role):
        user = User.objects.create_user(
            username="prof-roles", email="prof@ecole-test-roles.gn", password="SecurePass123!",
            role=teacher_role, tenant=tenant,
        )
        _auth(api_client, user)
        resp = api_client.get(reverse("role-list"))
        assert resp.status_code == 403


# ─── Création de rôles CUSTOM ───────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleCreate:
    def test_create_custom_role(self, api_client, director_user, tenant):
        perm, _ = Permission.objects.get_or_create(
            codename="finance:read", defaults={"module": "finance"}
        )
        _auth(api_client, director_user)
        resp = api_client.post(
            reverse("role-list"),
            {"label": "Surveillant général", "description": "Vie scolaire", "permissions": ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()["data"]
        assert data["name"] == "CUSTOM"
        assert data["label"] == "Surveillant général"
        assert data["is_base"] is False
        assert data["permissions"] == ["finance:read"]

        role = Role.objects.get(id=data["id"])
        assert role.tenant_id == tenant.id

    def test_create_custom_role_duplicate_label_rejected(self, api_client, director_user):
        _auth(api_client, director_user)
        payload = {"label": "Surveillant général", "permissions": []}
        resp1 = api_client.post(reverse("role-list"), payload, format="json")
        assert resp1.status_code == 201

        resp2 = api_client.post(reverse("role-list"), payload, format="json")
        assert resp2.status_code == 400

    def test_create_custom_role_unknown_codename_rejected(self, api_client, director_user):
        _auth(api_client, director_user)
        resp = api_client.post(
            reverse("role-list"),
            {"label": "Rôle Test", "permissions": ["not:a:real:permission"]},
            format="json",
        )
        assert resp.status_code == 400

    def test_multiple_custom_roles_per_tenant(self, api_client, director_user):
        _auth(api_client, director_user)
        resp1 = api_client.post(reverse("role-list"), {"label": "Surveillant", "permissions": []}, format="json")
        resp2 = api_client.post(reverse("role-list"), {"label": "Économe adjoint", "permissions": []}, format="json")
        assert resp1.status_code == 201
        assert resp2.status_code == 201
        assert resp1.json()["data"]["id"] != resp2.json()["data"]["id"]

        list_resp = api_client.get(reverse("role-list"))
        custom = [r for r in list_resp.json()["data"]["results"] if r["name"] == "CUSTOM"]
        assert len(custom) == 2


# ─── Modification de rôles ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleUpdate:
    def test_update_custom_role_permissions_and_label(self, api_client, director_user):
        _auth(api_client, director_user)
        create_resp = api_client.post(reverse("role-list"), {"label": "Rôle A", "permissions": []}, format="json")
        role_id = create_resp.json()["data"]["id"]

        perm, _ = Permission.objects.get_or_create(codename="finance:read", defaults={"module": "finance"})
        resp = api_client.patch(
            reverse("role-detail", args=[role_id]),
            {"label": "Rôle A renommé", "permissions": ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        data = resp.json()["data"]
        assert data["label"] == "Rôle A renommé"
        assert data["permissions"] == ["finance:read"]

    def test_update_base_role_permissions_allowed(self, api_client, director_user, teacher_role):
        perm, _ = Permission.objects.get_or_create(codename="notes:read", defaults={"module": "notes"})
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("role-detail", args=[str(teacher_role.id)]),
            {"permissions": ["notes:read"]},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["permissions"] == ["notes:read"]

    def test_update_base_role_label_rejected(self, api_client, director_user, teacher_role):
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("role-detail", args=[str(teacher_role.id)]),
            {"label": "Nouveau nom"},
            format="json",
        )
        assert resp.status_code == 400

    def test_director_floor_enforced_on_removal(self, api_client, director_user, director_role):
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("role-detail", args=[str(director_role.id)]),
            {"permissions": ["staff:update", "staff:create"]},  # roles:update manquant
            format="json",
        )
        assert resp.status_code == 400
        director_role.refresh_from_db()
        assert "roles:update" in set(director_role.permissions.values_list("codename", flat=True))

    def test_director_floor_allows_non_floor_changes(self, api_client, director_user, director_role):
        perm, _ = Permission.objects.get_or_create(codename="finance:read", defaults={"module": "finance"})
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("role-detail", args=[str(director_role.id)]),
            {"permissions": list(DIRECTOR_PERMISSION_FLOOR) + ["finance:read"]},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        codenames = set(resp.json()["data"]["permissions"])
        assert "finance:read" in codenames
        assert DIRECTOR_PERMISSION_FLOOR <= codenames


# ─── Suppression ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleDelete:
    def test_delete_unused_custom_role(self, api_client, director_user):
        _auth(api_client, director_user)
        create_resp = api_client.post(reverse("role-list"), {"label": "À supprimer", "permissions": []}, format="json")
        role_id = create_resp.json()["data"]["id"]

        resp = api_client.delete(reverse("role-detail", args=[role_id]))
        assert resp.status_code == 204
        assert not Role.objects.filter(id=role_id).exists()

    def test_delete_assigned_custom_role_rejected(self, api_client, director_user, tenant):
        _auth(api_client, director_user)
        create_resp = api_client.post(reverse("role-list"), {"label": "Assigné", "permissions": []}, format="json")
        role_id = create_resp.json()["data"]["id"]
        role = Role.objects.get(id=role_id)

        User.objects.create_user(
            username="assigne", email="assigne@ecole-test-roles.gn", password="P@ss123!",
            role=role, tenant=tenant,
        )

        resp = api_client.delete(reverse("role-detail", args=[role_id]))
        assert resp.status_code == 400
        assert Role.objects.filter(id=role_id).exists()

    def test_delete_base_role_rejected(self, api_client, director_user, teacher_role):
        _auth(api_client, director_user)
        resp = api_client.delete(reverse("role-detail", args=[str(teacher_role.id)]))
        assert resp.status_code == 400
        assert Role.objects.filter(id=teacher_role.id).exists()


# ─── Isolation multi-tenant ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoleTenantIsolation:
    def test_retrieve_other_tenant_role_returns_404(self, api_client, director_user, director_user_t2):
        _auth(api_client, director_user)
        resp = api_client.get(reverse("role-detail", args=[str(director_user_t2.role_id)]))
        assert resp.status_code == 404

    def test_update_other_tenant_role_returns_404(self, api_client, director_user, director_user_t2):
        _auth(api_client, director_user)
        resp = api_client.patch(
            reverse("role-detail", args=[str(director_user_t2.role_id)]),
            {"permissions": []},
            format="json",
        )
        assert resp.status_code == 404
