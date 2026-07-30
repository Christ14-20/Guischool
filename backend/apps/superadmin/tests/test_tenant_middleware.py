"""
apps/superadmin/tests/test_tenant_middleware.py — SUPERADMIN-V2-01

Vérifie que TenantMiddleware bloque réellement les requêtes sur un tenant
suspendu (soft ou hard), au niveau de CHAQUE requête — pas seulement à la
connexion.

Avant ce ticket, TenantMiddleware posait un flag `_tenant_suspended` jamais
lu ailleurs et laissait systématiquement la requête passer : un utilisateur
déjà authentifié (JWT valide émis avant la suspension de son tenant)
pouvait continuer à appeler n'importe quel endpoint sans restriction. La
classe TestSecurityRegression ci-dessous reproduit exactement ce scénario
de bout en bout (connexion pendant que le tenant est ACTIVE, suspension
après coup, réutilisation du même token) — ce test aurait échoué (200 au
lieu de 403) sur l'ancien comportement.
"""

import json

import pytest
from django.http import HttpResponse
from django.test import RequestFactory
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from core.middleware import TenantMiddleware


@pytest.fixture
def plan(db):
    return Plan.objects.create(name="Plan Middleware Test", max_students=200, max_staff=20)


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})[0]


def _make_tenant(plan, status, suffix):
    return Tenant.objects.create(
        name=f"École {suffix}",
        slug=f"ecole-mw-{suffix.lower()}",
        school_type=Tenant.SchoolType.MIXTE,
        status=status,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000010",
        contact_email=f"dir-mw-{suffix.lower()}@ecole.gn",
    )


def _make_user(tenant, role, suffix):
    return User.objects.create_user(
        username=f"user-mw-{suffix.lower()}",
        email=f"user-mw-{suffix.lower()}@ecole.gn",
        password="SecurePass123!",
        role=role,
        tenant=tenant,
    )


def _token_for(user, tenant):
    token = AccessToken.for_user(user)
    token["tenant_id"] = str(tenant.id)
    return str(token)


def _call_middleware(token, method="get", path="/api/v1/pedagogy/schoolyears/"):
    factory = RequestFactory()
    request = getattr(factory, method)(path)
    request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    middleware = TenantMiddleware(get_response=lambda r: HttpResponse("passed", status=200))
    return middleware(request)


@pytest.mark.django_db
class TestTenantMiddlewareSuspensionEnforcement:
    def test_hard_suspended_blocks_get(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.SUSPENDED_HARD, "Hard")
        user = _make_user(tenant, director_role, "hard-get")
        token = _token_for(user, tenant)

        response = _call_middleware(token, "get")
        assert response.status_code == 403
        assert json.loads(response.content)["message"] == "Compte suspendu"

    def test_hard_suspended_blocks_post(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.SUSPENDED_HARD, "HardPost")
        user = _make_user(tenant, director_role, "hard-post")
        token = _token_for(user, tenant)

        response = _call_middleware(token, "post")
        assert response.status_code == 403

    def test_soft_suspended_blocks_post(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.SUSPENDED_SOFT, "SoftPost")
        user = _make_user(tenant, director_role, "soft-post")
        token = _token_for(user, tenant)

        response = _call_middleware(token, "post")
        assert response.status_code == 403
        assert "lecture seule" in json.loads(response.content)["message"]

    def test_soft_suspended_blocks_patch_put_delete(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.SUSPENDED_SOFT, "SoftUnsafe")
        user = _make_user(tenant, director_role, "soft-unsafe")
        token = _token_for(user, tenant)

        for method in ("patch", "put", "delete"):
            response = _call_middleware(token, method)
            assert response.status_code == 403, f"{method} devrait être bloqué en SOFT"

    def test_soft_suspended_allows_get(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.SUSPENDED_SOFT, "SoftGet")
        user = _make_user(tenant, director_role, "soft-get")
        token = _token_for(user, tenant)

        response = _call_middleware(token, "get")
        assert response.status_code == 200
        assert response.content == b"passed"

    def test_active_tenant_allows_post(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.ACTIVE, "Active")
        user = _make_user(tenant, director_role, "active")
        token = _token_for(user, tenant)

        response = _call_middleware(token, "post")
        assert response.status_code == 200

    def test_super_admin_without_tenant_claim_not_blocked(self, db):
        sa_role, _ = Role.objects.get_or_create(name="SUPER_ADMIN", defaults={"label": "Super Admin"})
        sa_user = User.objects.create_user(
            username="sadmin-mw", email="sadmin-mw@eduguinee.gn",
            password="SecurePass123!", role=sa_role, tenant=None,
        )
        token = AccessToken.for_user(sa_user)  # pas de claim tenant_id

        factory = RequestFactory()
        request = factory.post("/api/v1/superadmin/schools/")
        request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        middleware = TenantMiddleware(get_response=lambda r: HttpResponse("passed", status=200))
        response = middleware(request)
        assert response.status_code == 200
        assert request.tenant is None


@pytest.mark.django_db
class TestSecurityRegression:
    """
    Reproduit exactement le scénario de la faille corrigée : un token émis
    pendant que le tenant était ACTIVE reste utilisé après coup, une fois le
    tenant passé en SUSPENDED_HARD. Avant ce ticket, TenantMiddleware ne
    bloquait rien ici (flag _tenant_suspended jamais lu) — ce test aurait
    donc échoué (200 au lieu de 403) sur l'ancien comportement.
    """

    def test_hard_suspended_blocks_already_issued_token_regression(self, plan, director_role):
        tenant = _make_tenant(plan, Tenant.Status.ACTIVE, "Regression")
        user = _make_user(tenant, director_role, "regression")

        client = APIClient()
        login_resp = client.post(
            reverse("auth-login"),
            {"email": user.email, "password": "SecurePass123!"},
            format="json",
        )
        assert login_resp.status_code == 200
        access_token = login_resp.json()["data"]["access_token"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Le token est valide et fonctionne normalement tant que le tenant est ACTIVE.
        ok_resp = client.get(reverse("schoolyear-list"))
        assert ok_resp.status_code == 200

        # Le tenant est suspendu APRÈS l'émission du token (le token n'est pas révoqué).
        tenant.status = Tenant.Status.SUSPENDED_HARD
        tenant.save(update_fields=["status"])

        # Le même token, déjà émis, doit désormais être bloqué sur CETTE requête.
        blocked_resp = client.get(reverse("schoolyear-list"))
        assert blocked_resp.status_code == 403
        assert blocked_resp.json()["message"] == "Compte suspendu"
