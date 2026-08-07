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
    """SUPERADMIN-V2-01 : HARD — bloque la connexion, comme l'ancien SUSPENDED."""
    return Tenant.objects.create(
        name="École Suspendue",
        slug="ecole-suspendue",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.SUSPENDED_HARD,
        plan=plan,
        contact_name="Directeur Suspendu",
        contact_phone="+224620000002",
        contact_email="dir@ecole-suspendue.gn",
    )


@pytest.fixture
def soft_suspended_tenant(plan):
    """SUPERADMIN-V2-01 : SOFT — la connexion reste autorisée."""
    return Tenant.objects.create(
        name="École Suspendue Soft",
        slug="ecole-suspendue-soft",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.SUSPENDED_SOFT,
        plan=plan,
        contact_name="Directeur Suspendu Soft",
        contact_phone="+224620000004",
        contact_email="dir@ecole-suspendue-soft.gn",
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
def soft_suspended_user(soft_suspended_tenant, director_role):
    return User.objects.create_user(
        username="directeur-suspendu-soft",
        email="dir@ecole-suspendue-soft.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=soft_suspended_tenant,
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

    def test_login_hard_suspended_tenant_returns_403(self, api_client, suspended_user):
        """Tenant SUSPENDED_HARD → 403 avec message 'Compte suspendu'."""
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "dir@ecole-suspendue.gn", "password": "SecurePass123!"},
            format="json",
        )
        assert response.status_code == 403
        data = response.json()
        assert data["message"] == "Compte suspendu"

    def test_login_soft_suspended_tenant_succeeds(self, api_client, soft_suspended_user):
        """
        SUPERADMIN-V2-01 : SUSPENDED_SOFT laisse la connexion passer — la
        consultation/export doit rester accessible, ce qui exige un token.
        """
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "dir@ecole-suspendue-soft.gn", "password": "SecurePass123!"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["data"]["access_token"]

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


# ─── Tests Must Change Password (AUTH-06) ─────────────────────────────────

@pytest.fixture
def user_must_change(tenant, director_role):
    return User.objects.create_user(
        username="mustchange",
        email="mustchange@ecole-test.gn",
        password="SecurePass123!",
        first_name="ÀChanger",
        last_name="Test",
        role=director_role,
        tenant=tenant,
        must_change_password=True,
    )


@pytest.fixture
def super_admin_role():
    return Role.objects.get_or_create(name="SUPER_ADMIN", defaults={"label": "Super Admin"})[0]


@pytest.fixture
def super_admin_must_change(super_admin_role):
    return User.objects.create_user(
        username="sa_mustchange",
        email="sa_mustchange@guischool.gn",
        password="SecurePass123!",
        first_name="Super",
        last_name="Admin",
        role=super_admin_role,
        tenant=None,
        must_change_password=True,
    )


@pytest.mark.django_db
class TestMustChangePassword:

    def _login(self, api_client, email, password):
        url = reverse("auth-login")
        resp = api_client.post(url, {"email": email, "password": password}, format="json")
        return resp.json()["data"] if resp.status_code == 200 else None

    def _auth(self, api_client, email="mustchange@ecole-test.gn", password="SecurePass123!"):
        tokens = self._login(api_client, email, password)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        return tokens

    # ── Login ────────────────────────────────────────────────────────────

    def test_login_returns_must_change_password_flag(self, api_client, user_must_change):
        """Le login renvoie le flag must_change_password dans la réponse."""
        tokens = self._login(api_client, "mustchange@ecole-test.gn", "SecurePass123!")
        assert tokens is not None
        assert tokens["user"]["must_change_password"] is True

    def test_login_normal_user_has_flag_false(self, api_client, director_user):
        """Un utilisateur normal a must_change_password=False."""
        tokens = self._login(api_client, "directeur@ecole-test.gn", "SecurePass123!")
        assert tokens is not None
        assert tokens["user"]["must_change_password"] is False

    # ── Enforcement du blocage ────────────────────────────────────────────

    def test_me_blocked_when_must_change_password(self, api_client, user_must_change):
        """GET /users/me/ est bloqué (403) quand must_change_password=True."""
        self._auth(api_client)
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 403
        assert response.json()["message"] == "Vous devez changer votre mot de passe."

    def test_permissions_me_allowed_when_must_change_password(self, api_client, user_must_change):
        """GET /auth/permissions/me/ est accessible malgré must_change_password.

        Whitelisté (RBAC front) : le frontend appelle cet endpoint dès le
        login, avant même l'écran de changement de mot de passe obligatoire,
        pour peupler permissions[] dans la session. L'endpoint est en
        lecture seule et ne débloque aucune capacité — tous les endpoints
        métier restent bloqués tant que must_change_password=True.
        """
        self._auth(api_client)
        response = api_client.get(reverse("auth-permissions-me"))
        assert response.status_code == 200

    def test_logout_allowed_when_must_change_password(self, api_client, user_must_change):
        """POST /auth/logout/ est accessible malgré must_change_password."""
        tokens = self._auth(api_client)
        response = api_client.post(
            reverse("auth-logout"),
            {"refresh_token": tokens["refresh_token"]},
            format="json",
        )
        assert response.status_code == 204

    def test_unauthenticated_request_not_blocked(self, api_client):
        """Une requête sans token n'est pas bloquée par ce middleware (DRF renverra 401)."""
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 401  # IsAuthenticated, pas 403

    def test_super_admin_exempt_from_must_change(self, api_client, super_admin_must_change):
        """SUPER_ADMIN avec must_change_password=True n'est PAS bloqué."""
        # On l'authentifie via le helper interne (login + set credentials)
        self._auth(api_client, email="sa_mustchange@guischool.gn", password="SecurePass123!")
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 200

    # ── Change password ──────────────────────────────────────────────────

    def test_change_password_success(self, api_client, user_must_change):
        """POST /auth/change-password/ réussit et met must_change_password=False."""
        self._auth(api_client)
        response = api_client.post(
            reverse("auth-change-password"),
            {
                "old_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["data"]["message"] == "Mot de passe modifié avec succès."

        # Vérification en base
        user_must_change.refresh_from_db()
        assert user_must_change.must_change_password is False

        # Vérification : après changement, le nouvel accès n'est plus bloqué
        tokens = self._login(api_client, "mustchange@ecole-test.gn", "NewSecurePass456!")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access_token']}")
        response = api_client.get(reverse("users-me"))
        assert response.status_code == 200

    def test_change_password_wrong_old_password(self, api_client, user_must_change):
        """Mauvais ancien mot de passe → 400."""
        self._auth(api_client)
        response = api_client.post(
            reverse("auth-change-password"),
            {
                "old_password": "WrongPassword!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "NewSecurePass456!",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_change_password_mismatch(self, api_client, user_must_change):
        """Les deux nouveaux mots de passe ne correspondent pas → 400."""
        self._auth(api_client)
        response = api_client.post(
            reverse("auth-change-password"),
            {
                "old_password": "SecurePass123!",
                "new_password": "NewSecurePass456!",
                "new_password_confirm": "DifferentPass789!",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_change_password_same_as_old(self, api_client, user_must_change):
        """Nouveau mot de passe identique à l'ancien → 400."""
        self._auth(api_client)
        response = api_client.post(
            reverse("auth-change-password"),
            {
                "old_password": "SecurePass123!",
                "new_password": "SecurePass123!",
                "new_password_confirm": "SecurePass123!",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_change_password_too_short(self, api_client, user_must_change):
        """Mot de passe trop court (< 12) → 400 via validate_password."""
        self._auth(api_client)
        response = api_client.post(
            reverse("auth-change-password"),
            {
                "old_password": "SecurePass123!",
                "new_password": "Short1!",
                "new_password_confirm": "Short1!",
            },
            format="json",
        )
        assert response.status_code == 400
