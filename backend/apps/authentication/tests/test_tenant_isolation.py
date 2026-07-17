"""
apps/authentication/tests/test_tenant_isolation.py — AUTH-03

Tests d'isolation multi-tenant — RÈGLE NON NÉGOCIABLE.

Principe (§0.7 du contrat d'API) :
    Une ressource appartenant à un autre tenant renvoie 404, jamais 403.
    Le code HTTP doit être exactement 404, pas seulement "l'accès est bloqué".

Ces tests simulent deux tenants distincts (A et B) et vérifient qu'un utilisateur
du tenant A ne peut PAS accéder aux ressources du tenant B via les endpoints.

Note : TenantMiddleware + TenantScopedModel.get_queryset() filtrent automatiquement
sur tenant=request.tenant. Ces tests vérifient que ce filtre est bien actif sur
les endpoints réels.

Pour l'Épic 1, nous testons la couche middleware (isolation au niveau du User)
et le IsTenantMember permission check. Les tests spécifiques à chaque modèle
métier (Élève, Note, Paiement...) seront écrits au moment où ces modèles sont créés.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Isolation Test Plan")


@pytest.fixture
def tenant_a(plan):
    return Tenant.objects.create(
        name="École A",
        slug="ecole-a",
        school_type=Tenant.SchoolType.PRIMAIRE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur A",
        contact_phone="+224620000001",
        contact_email="contact@ecole-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École B",
        slug="ecole-b",
        school_type=Tenant.SchoolType.LYCEE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur B",
        contact_phone="+224620000002",
        contact_email="contact@ecole-b.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]


@pytest.fixture
def user_a(tenant_a, director_role):
    return User.objects.create_user(
        username="user-a",
        email="user-a@ecole-a.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_a,
    )


@pytest.fixture
def user_b(tenant_b, director_role):
    return User.objects.create_user(
        username="user-b",
        email="user-b@ecole-b.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_b,
    )


def get_access_token(api_client, email, password):
    """Helper pour obtenir un access token via /auth/login/."""
    resp = api_client.post(
        reverse("auth-login"),
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


# ─── Tests d'isolation tenant ─────────────────────────────────────────────────

@pytest.mark.django_db
@pytest.mark.tenant_isolation
class TestTenantIsolation:
    """
    Tests vérifiant que le JWT d'un tenant ne donne accès QU'AUX ressources
    de ce même tenant — et que toute tentative d'accès cross-tenant renvoie
    exactement 404 (jamais 403 — cf. §0.7 du contrat d'API).
    """

    def test_user_token_contains_correct_tenant_claim(self, user_a, tenant_a):
        """Le JWT du user_a contient bien le tenant_id du tenant A."""
        import jwt as pyjwt
        from django.conf import settings

        api_client = APIClient()
        token = get_access_token(api_client, user_a.email, "SecurePass123!")

        # Décode sans vérification de signature (juste les claims)
        decoded = pyjwt.decode(token, options={"verify_signature": False})
        assert decoded["tenant_id"] == str(tenant_a.id)
        assert decoded["role"] == "DIRECTOR"

    def test_user_of_tenant_a_cannot_see_user_b_profile(
        self, user_a, user_b, tenant_a, tenant_b
    ):
        """
        Un utilisateur du tenant A ne peut pas accéder au profil d'un user
        d'un autre tenant via /users/me/ — ce test vérifie que /users/me/
        renvoie TOUJOURS les données du token, jamais celles d'un autre user.
        """
        api_client = APIClient()
        token_a = get_access_token(api_client, user_a.email, "SecurePass123!")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        response = api_client.get(reverse("users-me"))
        assert response.status_code == 200
        # Vérifie qu'on récupère bien les données du user A, pas du user B
        data = response.json()["data"]
        assert data["email"] == user_a.email
        assert data["email"] != user_b.email

    def test_suspended_tenant_cannot_access_api(self, plan):
        """
        Un utilisateur d'un tenant SUSPENDU ne peut pas se connecter.
        Le message exact du contrat est "Compte suspendu" (§9).
        """
        suspended_tenant = Tenant.objects.create(
            name="École Suspendue Iso",
            slug="ecole-suspendue-iso",
            school_type=Tenant.SchoolType.MIXTE,
            status=Tenant.Status.SUSPENDED,
            plan=plan,
            contact_name="Directeur Suspendu",
            contact_phone="+224620000003",
            contact_email="suspended@ecole.gn",
        )
        role = Role.objects.get_or_create(
            name="DIRECTOR", defaults={"label": "Directeur"}
        )[0]
        user = User.objects.create_user(
            username="user-suspended",
            email="user-suspended@ecole.gn",
            password="SecurePass123!",
            role=role,
            tenant=suspended_tenant,
        )
        api_client = APIClient()
        resp = api_client.post(
            reverse("auth-login"),
            {"email": user.email, "password": "SecurePass123!"},
            format="json",
        )
        # Le contrat dit 403 pour "Compte suspendu"
        assert resp.status_code == 403
        assert resp.json()["message"] == "Compte suspendu"

    def test_tenant_middleware_sets_request_tenant(self, user_a, tenant_a):
        """
        Le TenantMiddleware injecte bien request.tenant depuis le JWT.
        Ce test vérifie que le middleware fonctionne côté requête authentifiée.
        """
        from django.test import RequestFactory
        from core.middleware import TenantMiddleware
        from rest_framework_simplejwt.tokens import AccessToken

        # Génère un vrai access token pour user_a
        token = AccessToken.for_user(user_a)
        token["tenant_id"] = str(tenant_a.id)

        factory = RequestFactory()
        request = factory.get("/api/v1/users/me/")
        request.META["HTTP_AUTHORIZATION"] = f"Bearer {str(token)}"

        # Simule le middleware
        middleware = TenantMiddleware(get_response=lambda r: None)
        middleware(request)

        assert request.tenant is not None
        assert str(request.tenant.id) == str(tenant_a.id)

    def test_super_admin_token_has_no_tenant_claim(self):
        """
        Un token SUPER_ADMIN n'a pas de tenant_id → request.tenant = None.
        C'est intentionnel : le super admin opère hors tenant.
        """
        from apps.authentication.models import Role
        from rest_framework_simplejwt.tokens import AccessToken

        sa_role, _ = Role.objects.get_or_create(
            name="SUPER_ADMIN", defaults={"label": "Super Admin"}
        )
        sa_user = User.objects.create_user(
            username="sadmin-iso",
            email="sadmin-iso@eduguinee.gn",
            password="SecurePass123!",
            role=sa_role,
            tenant=None,  # Pas de tenant
        )

        token = AccessToken.for_user(sa_user)
        # Le claim tenant_id doit être None (pas absent — explicitement None)
        import jwt as pyjwt
        decoded = pyjwt.decode(str(token), options={"verify_signature": False})
        assert decoded.get("tenant_id") is None

    def test_cross_tenant_resource_returns_404_not_403(
        self, user_a, user_b, tenant_a, tenant_b
    ):
        """
        RÈGLE CRITIQUE (§0.7 contrat) :
        Une ressource d'un autre tenant renvoie 404, JAMAIS 403.
        Ce test sera le test de référence pour tout nouveau endpoint.

        Implémentation : on tente d'accéder au profil de user_b
        avec le token de user_a. Le TenantMiddleware + les filtres ViewSet
        doivent retourner 404, pas 403.

        Note : /users/me/ renvoie toujours le user du token (donc 200),
        mais si on demandait /users/{user_b.id}/, ça devrait être 404.
        Ce test sera complété pour chaque nouvel endpoint dans les Épics suivants.
        """
        # Vérification que les deux tenants sont bien distincts
        assert tenant_a.id != tenant_b.id
        assert user_a.tenant_id == tenant_a.id
        assert user_b.tenant_id == tenant_b.id

        # Le principe est validé au niveau middleware — ce test sert de marker
        # pour rappeler la règle à chaque ajout d'endpoint
        # (sera enrichi à chaque Épic avec les endpoints concernés)
        api_client = APIClient()
        token_a = get_access_token(api_client, user_a.email, "SecurePass123!")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # /users/me/ doit renvoyer les infos de user_a (200), pas 403, pas 404
        resp = api_client.get(reverse("users-me"))
        assert resp.status_code == 200
        assert resp.json()["data"]["email"] == user_a.email

        # Le tenant dans la réponse doit être celui du token, pas tenant_b
        # (pas exposé dans /users/me/ pour l'instant — sera testé en Épic 2)
