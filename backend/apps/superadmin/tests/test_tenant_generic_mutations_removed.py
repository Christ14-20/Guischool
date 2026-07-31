"""
apps/superadmin/tests/test_tenant_generic_mutations_removed.py — SUPERADMIN-V2-03

Test de régression pour le correctif de sécurité découvert en marge du
ticket : TenantViewSet héritait de viewsets.ModelViewSet, exposant
silencieusement PUT/PATCH/DELETE génériques sur /superadmin/schools/{id}/.
Le PATCH générique permettait de réécrire `status` directement (via
TenantListSerializer, seul cas de repli de get_serializer_class), en
contournant tout le workflow suspend/reactivate (raison, AuditLog,
notification) ; le DELETE générique supprimait purement et simplement le
Tenant. Ces deux tests auraient échoué (200/204 au lieu de 405) sur
l'ancien comportement (ViewSet complet, aucune restriction de méthode).
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan


@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Plan Regression", max_students=200, max_staff=20,
        price_monthly=Decimal("500000.00"), is_active=True,
    )


@pytest.fixture
def superadmin_role(db):
    return Role.objects.get_or_create(name="SUPER_ADMIN", defaults={"label": "Super Admin"})[0]


@pytest.fixture
def superadmin_user(superadmin_role):
    return User.objects.create_user(
        username="sadmin-regression", email="sadmin-regression@eduguinee.gn",
        password="SecurePass123!", role=superadmin_role, tenant=None,
    )


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École Régression", slug="ecole-regression",
        school_type=Tenant.SchoolType.MIXTE, status=Tenant.Status.ACTIVE, plan=plan,
        contact_name="Directeur Test", contact_phone="+224620000001",
        contact_email="dir-regression@ecole.gn",
    )


def login_user(client, email, password="SecurePass123!"):
    resp = client.post(reverse("auth-login"), {"email": email, "password": password}, format="json")
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


@pytest.mark.django_db
class TestGenericMutationsRemoved:
    def test_generic_patch_on_school_detail_returns_405(self, superadmin_user, tenant):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-detail", args=[str(tenant.id)])
        resp = client.patch(url, {"status": "SUSPENDED_HARD"}, format="json")

        assert resp.status_code == 405
        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.ACTIVE

    def test_generic_put_on_school_detail_returns_405(self, superadmin_user, tenant):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-detail", args=[str(tenant.id)])
        resp = client.put(url, {"name": "École Renommée"}, format="json")

        assert resp.status_code == 405
        tenant.refresh_from_db()
        assert tenant.name == "École Régression"

    def test_generic_delete_on_school_detail_returns_405(self, superadmin_user, tenant):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-detail", args=[str(tenant.id)])
        resp = client.delete(url)

        assert resp.status_code == 405
        assert Tenant.objects.filter(id=tenant.id).exists()

    def test_retrieve_still_works(self, superadmin_user, tenant):
        """GET reste autorisé — seules les mutations génériques sont retirées."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-detail", args=[str(tenant.id)])
        resp = client.get(url)

        assert resp.status_code == 200
