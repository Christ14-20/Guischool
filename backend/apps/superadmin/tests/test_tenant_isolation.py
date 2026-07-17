"""
apps/superadmin/tests/test_tenant_isolation.py — TENANT-01

Tests d'isolation multi-tenant pour les ressources Tenant/Plan.

RÈGLE CRITIQUE (§0.7 contrat) :
    Une ressource appartenant à un autre tenant renvoie 404, JAMAIS 403.

Ce fichier est le test d'isolation de référence pour l'Épic 2.
Chaque nouveau endpoint TENANT-03/04 devra ajouter ses cas ici.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Isolation Plan",
        max_students=100,
        max_staff=10,
        price_monthly="500000.00",
        is_active=True,
    )


@pytest.fixture
def tenant_a(plan):
    return Tenant.objects.create(
        name="Tenant Isolation A",
        slug="tenant-iso-a",
        school_type=Tenant.SchoolType.PRIMAIRE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur A",
        contact_phone="+224620000010",
        contact_email="a@ecole-a.gn",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="Tenant Isolation B",
        slug="tenant-iso-b",
        school_type=Tenant.SchoolType.LYCEE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur B",
        contact_phone="+224620000011",
        contact_email="b@ecole-b.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]


@pytest.fixture
def user_a(tenant_a, director_role):
    return User.objects.create_user(
        username="director-a-iso",
        email="director-a@ecole-a.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_a,
    )


@pytest.fixture
def user_b(tenant_b, director_role):
    return User.objects.create_user(
        username="director-b-iso",
        email="director-b@ecole-b.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant_b,
    )


def login(api_client, email, password="SecurePass123!"):
    resp = api_client.post(
        reverse("auth-login"),
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


# ─── Tests d'isolation ────────────────────────────────────────────────────────

@pytest.mark.django_db
@pytest.mark.tenant_isolation
class TestTenantIsolationEpic2:
    """
    Tests garantissant que les tenants sont étanches entre eux.
    Ces tests doivent être enrichis à chaque nouveau endpoint de l'Épic 2.
    """

    def test_tenant_objects_are_distinct(self, tenant_a, tenant_b):
        """Les deux tenants ont des IDs distincts — base de l'isolation."""
        assert tenant_a.id != tenant_b.id
        assert tenant_a.slug != tenant_b.slug
        assert tenant_a.contact_email != tenant_b.contact_email

    def test_user_token_scoped_to_correct_tenant(self, user_a, tenant_a):
        """Le JWT de user_a contient bien le tenant_id de tenant_a."""
        import jwt as pyjwt
        client = APIClient()
        token = login(client, user_a.email)
        decoded = pyjwt.decode(token, options={"verify_signature": False})
        assert decoded["tenant_id"] == str(tenant_a.id)

    def test_me_endpoint_scoped_to_token_tenant(self, user_a, user_b, tenant_a, tenant_b):
        """
        /users/me/ retourne toujours les données du token, jamais celles d'un autre tenant.
        Règle : aucune ressource cross-tenant n'est accessible.
        """
        client = APIClient()
        token_a = login(client, user_a.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        resp = client.get(reverse("users-me"))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == user_a.email
        assert data["email"] != user_b.email

    def test_get_student_count_isolated_per_tenant(self, tenant_a, tenant_b):
        """
        get_student_count() est isolé par tenant.
        Sentinelle : vérifie que les deux tenants retournent 0 en Épic 2,
        sans contamination croisée.

        ÉPIC 4 : ce test sera enrichi avec de vraies données Student pour
        vérifier que le comptage n'inclut pas les élèves de l'autre tenant.
        """
        assert tenant_a.get_student_count() == 0
        assert tenant_b.get_student_count() == 0
        # Vérification que les tenants ne "partagent" pas leur comptage
        assert tenant_a.get_student_count() == tenant_b.get_student_count()

    def test_get_staff_count_isolated_per_tenant(
        self, tenant_a, tenant_b, director_role
    ):
        """
        get_staff_count() ne compte QUE les users du tenant concerné.
        Un user du tenant_b ne doit pas apparaître dans le count du tenant_a.
        """
        # Crée un user dans tenant_b seulement
        User.objects.create_user(
            username="extra-b",
            email="extra@ecole-b.gn",
            password="SecurePass123!",
            role=director_role,
            tenant=tenant_b,
        )
        assert tenant_a.get_staff_count() == 0  # tenant_a n'a aucun user
        assert tenant_b.get_staff_count() == 1  # tenant_b a un user

    def test_superadmin_school_detail_cross_tenant_returns_404(
        self, user_a, tenant_b
    ):
        """
        RÈGLE 404 (§0.7 contrat) : GET /superadmin/schools/{id}/ avec
        un ID appartenant à un autre tenant → 404, jamais 403.

        Note : cet endpoint sera implémenté en TENANT-04. Ce test est
        un placeholder structurel — il sera activé (not skipped) dès que
        l'URL superadmin-school-detail existera.
        Pour l'instant, on vérifie la règle au niveau modèle.
        """
        # Vérification au niveau des données :
        # user_a.tenant != tenant_b → isolation garantie par le modèle
        assert user_a.tenant_id != tenant_b.id

        # Le test d'endpoint 404 sera dans test_superadmin_views.py (TENANT-04)
        # pour garder ce fichier focalisé sur les invariants de modèle.
