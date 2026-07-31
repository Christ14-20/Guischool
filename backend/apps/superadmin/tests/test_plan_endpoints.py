"""
apps/superadmin/tests/test_plan_endpoints.py — TENANT-02

Tests d'intégration des endpoints Plan et du service de limites.
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.superadmin.services.tenant_limits import check_student_limit, check_staff_limit


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def superadmin_role(db):
    return Role.objects.get_or_create(
        name="SUPER_ADMIN", defaults={"label": "Super Admin"}
    )[0]


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]


@pytest.fixture
def superadmin_user(superadmin_role):
    return User.objects.create_user(
        username="sadmin-test-plans",
        email="sadmin-plans@eduguinee.gn",
        password="SecurePass123!",
        role=superadmin_role,
        tenant=None,
    )


@pytest.fixture
def director_user(director_role):
    # On a besoin d'un tenant pour le directeur
    plan = Plan.objects.create(name="Temp Plan")
    tenant = Tenant.objects.create(
        name="École Temp",
        slug="ecole-temp",
        school_type=Tenant.SchoolType.MIXTE,
        plan=plan,
        contact_name="Dir",
        contact_phone="+224620000000",
        contact_email="dir@temp.gn",
    )
    return User.objects.create_user(
        username="director-test-plans",
        email="director-plans@ecole.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


def login_user(api_client, email, password="SecurePass123!"):
    resp = api_client.post(
        reverse("auth-login"),
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


# ─── Tests Endpoints Plan ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPlanEndpoints:

    def test_superadmin_can_create_and_list_plans(self, superadmin_user):
        """Un superadmin peut créer et lister les plans."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 1. Création
        url = reverse("superadmin-plans-list")
        payload = {
            "name": "Starter Premium",
            "max_students": 300,
            "max_staff": 30,
            "price_monthly": "750000.00",
            "is_active": True,
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 201
        assert resp.json()["status"] == "success"
        data = resp.json()["data"]
        assert data["name"] == "Starter Premium"
        assert data["max_students"] == 300
        assert data["max_staff"] == 30
        assert data["price_monthly"] == "750000.00"

        # 2. Liste
        resp = client.get(url)
        assert resp.status_code == 200
        results = resp.json()["data"]["results"]
        assert len(results) >= 1
        names = [p["name"] for p in results]
        assert "Starter Premium" in names

    def test_director_cannot_create_or_list_plans(self, director_user):
        """Un directeur (non superadmin) est rejeté avec 403."""
        client = APIClient()
        token = login_user(client, director_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-plans-list")
        # Tentative list
        resp = client.get(url)
        assert resp.status_code == 403

        # Tentative create
        resp = client.post(url, {"name": "Hack Plan"}, format="json")
        assert resp.status_code == 403

    def test_anonymous_cannot_access_plans(self):
        """Un utilisateur anonyme est rejeté avec 401."""
        client = APIClient()
        url = reverse("superadmin-plans-list")
        resp = client.get(url)
        assert resp.status_code == 401

    def test_create_plan_invalid_price_monthly(self, superadmin_user):
        """Prix mensuel négatif rejeté avec 400."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-plans-list")
        payload = {
            "name": "Invalid Price Plan",
            "max_students": 100,
            "max_staff": 10,
            "price_monthly": "-5000.00",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "price_monthly" in resp.json()["errors"]

    def test_superadmin_can_edit_plan(self, superadmin_user):
        """SUPERADMIN-V2-03 : PATCH édite un plan existant."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        plan = Plan.objects.create(
            name="Plan Éditable", max_students=200, max_staff=20,
            price_monthly=Decimal("500000.00"), is_active=True,
        )
        url = reverse("superadmin-plans-detail", args=[str(plan.id)])
        resp = client.patch(url, {"price_monthly": "600000.00"}, format="json")

        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["price_monthly"] == "600000.00"
        plan.refresh_from_db()
        assert plan.price_monthly == Decimal("600000.00")

    def test_deactivate_plan_via_edit(self, superadmin_user):
        """is_active=False via l'endpoint d'édition — pas besoin de DELETE."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        plan = Plan.objects.create(name="Plan À Désactiver", is_active=True)
        url = reverse("superadmin-plans-detail", args=[str(plan.id)])
        resp = client.patch(url, {"is_active": False}, format="json")

        assert resp.status_code == 200
        plan.refresh_from_db()
        assert plan.is_active is False

    def test_edit_plan_blocked_when_downgrade_exceeds_attached_tenant(
        self, superadmin_user, director_role
    ):
        """
        Réduire max_students sous l'effectif d'un tenant déjà rattaché au
        plan est bloqué (422), avec la liste des tenants affectés.
        """
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        plan = Plan.objects.create(name="Plan Partagé", max_students=200, max_staff=20)
        tenant = Tenant.objects.create(
            name="École Sur Plan Partagé", slug="ecole-plan-partage",
            school_type=Tenant.SchoolType.MIXTE, plan=plan,
            contact_name="Dir", contact_phone="+224620000020",
            contact_email="dir-plan-partage@ecole.gn",
        )
        from unittest.mock import patch as mock_patch
        with mock_patch.object(Tenant, "get_student_count", return_value=150):
            url = reverse("superadmin-plans-detail", args=[str(plan.id)])
            resp = client.patch(url, {"max_students": 100}, format="json")

        assert resp.status_code == 422
        affected = resp.json()["errors"]["affected_tenants"]
        assert len(affected) == 1
        assert affected[0]["id"] == str(tenant.id)
        assert affected[0]["student_count"] == 150
        plan.refresh_from_db()
        assert plan.max_students == 200  # inchangé

    def test_edit_plan_allowed_when_no_tenant_exceeds(self, superadmin_user):
        """Réduction de limite acceptée si aucun tenant rattaché n'est affecté."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        plan = Plan.objects.create(name="Plan Sans Impact", max_students=200, max_staff=20)
        Tenant.objects.create(
            name="École Petit Effectif", slug="ecole-petit-effectif",
            school_type=Tenant.SchoolType.MIXTE, plan=plan,
            contact_name="Dir", contact_phone="+224620000021",
            contact_email="dir-petit-effectif@ecole.gn",
        )
        # get_student_count() réel = 0 (aucun Student créé) : bien sous la nouvelle limite.
        url = reverse("superadmin-plans-detail", args=[str(plan.id)])
        resp = client.patch(url, {"max_students": 10}, format="json")

        assert resp.status_code == 200
        plan.refresh_from_db()
        assert plan.max_students == 10

    def test_director_cannot_edit_plan(self, director_user):
        client = APIClient()
        token = login_user(client, director_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        plan = Plan.objects.create(name="Plan Protégé")
        url = reverse("superadmin-plans-detail", args=[str(plan.id)])
        resp = client.patch(url, {"price_monthly": "1.00"}, format="json")
        assert resp.status_code == 403

    def test_filter_plans_by_is_active(self, superadmin_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        Plan.objects.create(name="Plan Actif Filtre", is_active=True)
        Plan.objects.create(name="Plan Inactif Filtre", is_active=False)

        url = reverse("superadmin-plans-list")
        resp = client.get(url, {"is_active": "true"})
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()["data"]["results"]]
        assert "Plan Actif Filtre" in names
        assert "Plan Inactif Filtre" not in names


# ─── Tests du Service de Limites ──────────────────────────────────────────────

@pytest.mark.django_db
class TestTenantLimitsService:

    def test_check_student_limit_under_limit(self, db):
        """Si le nombre d'élèves est inférieur à la limite, pas d'exception."""
        from unittest.mock import patch
        plan = Plan.objects.create(name="Starter", max_students=100)
        tenant = Tenant.objects.create(
            name="Limit École A",
            slug="limit-ecole-a",
            school_type=Tenant.SchoolType.PRIMAIRE,
            plan=plan,
            contact_name="A",
            contact_phone="+224620000010",
            contact_email="a@limit.gn",
        )
        # Mock get_student_count pour retourner 50 (< 100)
        with patch.object(Tenant, "get_student_count", return_value=50):
            # Ne doit pas lever d'erreur
            check_student_limit(tenant)

    def test_check_student_limit_reached(self, db):
        """Si le nombre d'élèves atteint la limite, une ValidationError est levée."""
        from unittest.mock import patch
        plan = Plan.objects.create(name="Starter", max_students=100)
        tenant = Tenant.objects.create(
            name="Limit École B",
            slug="limit-ecole-b",
            school_type=Tenant.SchoolType.PRIMAIRE,
            plan=plan,
            contact_name="B",
            contact_phone="+224620000011",
            contact_email="b@limit.gn",
        )
        # Mock get_student_count pour retourner 100 (limite atteinte)
        with patch.object(Tenant, "get_student_count", return_value=100):
            with pytest.raises(ValidationError) as exc_info:
                check_student_limit(tenant)
            assert "Limite d'élèves atteinte" in str(exc_info.value)

    def test_check_staff_limit_under_limit(self, db):
        """Si le nombre de personnels est inférieur à la limite, pas d'exception."""
        from unittest.mock import patch
        plan = Plan.objects.create(name="Starter", max_staff=10)
        tenant = Tenant.objects.create(
            name="Limit École C",
            slug="limit-ecole-c",
            school_type=Tenant.SchoolType.PRIMAIRE,
            plan=plan,
            contact_name="C",
            contact_phone="+224620000012",
            contact_email="c@limit.gn",
        )
        # Mock get_staff_count pour retourner 5 (< 10)
        with patch.object(Tenant, "get_staff_count", return_value=5):
            # Ne doit pas lever d'erreur
            check_staff_limit(tenant)

    def test_check_staff_limit_reached(self, db):
        """Si le nombre de personnels atteint la limite, une ValidationError est levée."""
        from unittest.mock import patch
        plan = Plan.objects.create(name="Starter", max_staff=10)
        tenant = Tenant.objects.create(
            name="Limit École D",
            slug="limit-ecole-d",
            school_type=Tenant.SchoolType.PRIMAIRE,
            plan=plan,
            contact_name="D",
            contact_phone="+224620000013",
            contact_email="d@limit.gn",
        )
        # Mock get_staff_count pour retourner 10 (limite atteinte)
        with patch.object(Tenant, "get_staff_count", return_value=10):
            with pytest.raises(ValidationError) as exc_info:
                check_staff_limit(tenant)
            assert "Limite de personnels atteinte" in str(exc_info.value)
