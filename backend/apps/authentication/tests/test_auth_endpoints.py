"""
apps/authentication/tests/test_auth_endpoints.py — AUTH-02

Tests d'intégration des endpoints JWT.
Vérifie la conformité exacte avec le contrat d'API (§1).
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role, Permission
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
def suspended_tenant(plan):
    return Tenant.objects.create(
        name="École Suspendue",
        slug="ecole-suspendue",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.SUSPENDED,
        plan=plan,
        contact_name="Directeur Suspendu",
        contact_phone="+224620000002",
        contact_email="dir@ecole-suspendue.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.create(name="DIRECTOR", label="Directeur")


@pytest.fixture
def director_user(tenant, director_role):
    user = User.objects.create_user(
        username="directeur",
        email="directeur@ecole-test.gn",
        password="SecurePass123!",
        first_name="Mamadou",
        last_name="Diallo",
        role=director_role,
        tenant=tenant,
    )
    return user


@pytest.fixture
def suspended_user(suspended_tenant, director_role):
    return User.objects.create_user(
        username="directeur-suspendu",
        email="dir@ecole-suspendue.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=suspended_tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


# ─── Tests Login ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestLoginView:

    def test_login_success_returns_correct_structure(self, api_client, director_user):
        """POST /auth/login/ réussit et retourne la structure exacte du contrat."""
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "directeur@ecole-test.gn", "password": "SecurePass123!"},
            format="json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert "user" in data["data"]
        user_data = data["data"]["user"]
        assert user_data["role"] == "DIRECTOR"
        assert "tenant" in user_data
        assert user_data["tenant"]["slug"] == "ecole-test"

    def test_login_wrong_credentials_returns_401(self, api_client, director_user):
        """Mauvais mot de passe → 401 avec message exact du contrat."""
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "directeur@ecole-test.gn", "password": "WrongPassword!"},
            format="json",
        )
        assert response.status_code == 401
        data = response.json()
        assert data["status"] == "error"
        assert data["message"] == "Identifiants incorrects"

    def test_login_suspended_tenant_returns_403(self, api_client, suspended_user):
        """Tenant suspendu → 403 avec message 'Compte suspendu'."""
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "dir@ecole-suspendue.gn", "password": "SecurePass123!"},
            format="json",
        )
        assert response.status_code == 403
        data = response.json()
        assert data["message"] == "Compte suspendu"

    def test_login_missing_fields_returns_401(self, api_client):
        """Login sans champs → 401."""
        url = reverse("auth-login")
        response = api_client.post(url, {}, format="json")
        assert response.status_code == 401


# ─── Tests Refresh ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRefreshView:

    def _get_tokens(self, api_client, user):
        url = reverse("auth-login")
        resp = api_client.post(
            url,
            {"email": user.email, "password": "SecurePass123!"},
            format="json",
        )
        return resp.json()["data"]

    def test_refresh_returns_new_access_token(self, api_client, director_user):
        """POST /auth/refresh/ retourne un nouveau access_token."""
        tokens = self._get_tokens(api_client, director_user)
        url = reverse("auth-refresh")
        response = api_client.post(
            url,
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "access_token" in data["data"]

    def test_refresh_invalid_token_returns_401(self, api_client):
        """Token invalide → 401."""
        url = reverse("auth-refresh")
        response = api_client.post(
            url,
            {"refresh_token": "invalid.token.here"},
            format="json",
        )
        assert response.status_code == 401

    def test_refresh_missing_token_returns_400(self, api_client):
        """Champ manquant → 400."""
        url = reverse("auth-refresh")
        response = api_client.post(url, {}, format="json")
        assert response.status_code == 400


# ─── Tests Logout ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestLogoutView:

    def _get_tokens(self, api_client, user):
        url = reverse("auth-login")
        resp = api_client.post(
            url,
            {"email": user.email, "password": "SecurePass123!"},
            format="json",
        )
        return resp.json()["data"]

    def test_logout_returns_204(self, api_client, director_user):
        """POST /auth/logout/ → 204 No Content."""
        tokens = self._get_tokens(api_client, director_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        url = reverse("auth-logout")
        response = api_client.post(
            url,
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        assert response.status_code == 204

    def test_logout_requires_auth(self, api_client, director_user):
        """Logout sans token → 401."""
        tokens = self._get_tokens(api_client, director_user)
        url = reverse("auth-logout")
        response = api_client.post(
            url,
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        assert response.status_code == 401

    def test_refresh_token_blacklisted_after_logout(self, api_client, director_user):
        """Le refresh token est blacklisté après logout — re-utilisation → 401."""
        tokens = self._get_tokens(api_client, director_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        # Logout
        api_client.post(
            reverse("auth-logout"),
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        # Tentative de re-utilisation du refresh token
        api_client.credentials()  # Reset
        response = api_client.post(
            reverse("auth-refresh"),
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        assert response.status_code == 401


# ─── Tests /users/me/ ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeView:

    def _authenticate(self, api_client, user):
        url = reverse("auth-login")
        resp = api_client.post(
            url,
            {"email": user.email, "password": "SecurePass123!"},
            format="json",
        )
        token = resp.json()["data"]["access_token"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_get_me_returns_user_data(self, api_client, director_user):
        """GET /users/me/ retourne les données de l'utilisateur connecté."""
        self._authenticate(api_client, director_user)
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["email"] == "directeur@ecole-test.gn"
        assert data["data"]["role"] == "DIRECTOR"

    def test_patch_me_updates_phone(self, api_client, director_user):
        """PATCH /users/me/ met à jour le téléphone."""
        self._authenticate(api_client, director_user)
        response = api_client.patch(
            reverse("users-me"),
            {"phone": "+224620000001"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["data"]["phone"] == "+224620000001"

    def test_patch_me_invalid_phone_format(self, api_client, director_user):
        """Téléphone invalide → 400 avec message exact."""
        self._authenticate(api_client, director_user)
        response = api_client.patch(
            reverse("users-me"),
            {"phone": "0620000001"},  # Mauvais format
            format="json",
        )
        assert response.status_code == 400

    def test_me_requires_auth(self, api_client):
        """Sans token → 401."""
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 401


# ─── Tests /auth/permissions/me/ ─────────────────────────────────────────────

@pytest.mark.django_db
class TestPermissionsMeView:

    def test_permissions_me_returns_role_and_codenames(self, api_client, director_user, director_role):
        """GET /auth/permissions/me/ retourne le rôle et les codenames."""
        perm, _ = Permission.objects.get_or_create(
            codename="eleves:read", defaults={"module": "eleves"}
        )
        director_role.permissions.add(perm)

        url = reverse("auth-login")
        resp = api_client.post(
            url,
            {"email": director_user.email, "password": "SecurePass123!"},
            format="json",
        )
        token = resp.json()["data"]["access_token"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = api_client.get(reverse("auth-permissions-me"))
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["role"] == "DIRECTOR"
        assert "eleves:read" in data["permissions"]
