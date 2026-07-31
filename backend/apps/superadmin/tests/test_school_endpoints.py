"""
apps/superadmin/tests/test_school_endpoints.py — TENANT-03 / TENANT-04

Tests d'intégration pour les endpoints de gestion des écoles (schools/tenants) par le Super Admin.
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from unittest.mock import patch
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan


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
        username="sadmin-test-schools",
        email="sadmin-schools@eduguinee.gn",
        password="SecurePass123!",
        role=superadmin_role,
        tenant=None,
    )


@pytest.fixture
def director_user(director_role, plan):
    tenant = Tenant.objects.create(
        name="École Existante",
        slug="ecole-existante",
        school_type=Tenant.SchoolType.PRIMAIRE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Directeur Existant",
        contact_phone="+224620000000",
        contact_email="directeur@existante-schools.gn",
    )
    return User.objects.create_user(
        username="director-test-schools",
        email="director-schools@ecole.gn",
        password="SecurePass123!",
        role=director_role,
        tenant=tenant,
    )


@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Pro Plan",
        max_students=1000,
        max_staff=100,
        price_monthly=Decimal("1500000.00"),
        is_active=True,
    )


def login_user(api_client, email, password="SecurePass123!"):
    resp = api_client.post(
        reverse("auth-login"),
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


# ─── Tests Endpoints Tenant ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestSchoolEndpoints:

    def test_superadmin_can_create_school_workflow(self, superadmin_user, plan):
        """Workflow complet de création d'école (Tenant + Directeur) avec mot de passe temporaire."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-list")
        payload = {
            "name": "Groupe Scolaire Les Palmiers",
            "school_type": "MIXTE",
            "code_minedu": "GN-CKY-00123",
            "contact_name": "Mamadou Diallo",
            "contact_phone": "+224620000000",
            "contact_email": "directeur@ecole-exemple.gn",
            "region": "Conakry",
            "prefecture": "Conakry",
            "commune": "Ratoma",
            "quartier": "Nongo",
            "plan_id": str(plan.id),
        }

        resp = client.post(url, payload, format="json")
        assert resp.status_code == 201
        assert resp.json()["status"] == "success"
        data = resp.json()["data"]

        assert "id" in data
        assert data["name"] == "Groupe Scolaire Les Palmiers"
        assert data["slug"] == "groupe-scolaire-les-palmiers"
        assert data["status"] == "TRIAL"
        assert "trial_ends_at" in data

        # Vérification compte Directeur
        director_account = data["director_account"]
        assert director_account["email"] == "directeur@ecole-exemple.gn"
        assert "temporary_password" in director_account
        assert len(director_account["temporary_password"]) >= 8

        # Vérifie que le Directeur est bien créé en BDD avec must_change_password=True
        user = User.objects.get(email="directeur@ecole-exemple.gn")
        assert user.must_change_password is True
        assert user.tenant.name == "Groupe Scolaire Les Palmiers"
        assert user.role.name == "DIRECTOR"

    def test_create_school_validations(self, superadmin_user, plan, director_user):
        """Vérifie les validations de doublons et formats à la création d'une école."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-list")
        
        # 1. Nom doublon
        payload = {
            "name": "École Existante",  # déjà pris par la fixture director_user
            "school_type": "PRIMAIRE",
            "contact_name": "Nouveau",
            "contact_phone": "+224620000099",
            "contact_email": "nouveau@ecole.gn",
            "plan_id": str(plan.id),
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "name" in resp.json()["errors"]

        # 2. Email doublon
        payload["name"] = "Unique Name School"
        payload["contact_email"] = "directeur@existante-schools.gn"  # déjà pris (fixture director_user)
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "contact_email" in resp.json()["errors"]

        # 3. Format téléphone invalide
        payload["contact_email"] = "nouveau@ecole.gn"
        payload["contact_phone"] = "620000099"  # pas d'indicatif +224
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "contact_phone" in resp.json()["errors"]

        # 4. Plan inactif
        inactive_plan = Plan.objects.create(name="Inactive Plan", is_active=False)
        payload["contact_phone"] = "+224620000099"
        payload["plan_id"] = str(inactive_plan.id)
        resp = client.post(url, payload, format="json")
        assert resp.status_code == 400
        assert "plan_id" in resp.json()["errors"]

    def test_superadmin_can_list_and_filter_schools(self, superadmin_user, plan):
        """Vérifie le filtrage, la recherche et le tri sur la liste des écoles."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Crée deux écoles distinctes
        t1 = Tenant.objects.create(
            name="École Alpha", slug="ecole-alpha", school_type="PRIMAIRE",
            status="TRIAL", plan=plan, contact_name="Alpha Man",
            contact_phone="+224620000100", contact_email="alpha@ecole.gn"
        )
        t2 = Tenant.objects.create(
            name="École Beta", slug="ecole-beta", school_type="LYCEE",
            status="ACTIVE", plan=plan, contact_name="Beta Man",
            contact_phone="+224620000101", contact_email="beta@ecole.gn"
        )

        url = reverse("superadmin-schools-list")
        
        # 1. Filtre par status
        resp = client.get(f"{url}?status=ACTIVE")
        assert resp.status_code == 200
        results = resp.json()["data"]["results"]
        # Doit contenir Beta, pas Alpha
        names = [t["name"] for t in results]
        assert "École Beta" in names
        assert "École Alpha" not in names

        # 2. Recherche textuelle (search)
        resp = client.get(f"{url}?search=Alpha")
        assert resp.status_code == 200
        results = resp.json()["data"]["results"]
        assert len(results) == 1
        assert results[0]["name"] == "École Alpha"

    def test_superadmin_can_get_school_detail(self, superadmin_user, director_user):
        """Vérifie l'obtention du détail d'une école avec student_count et staff_count."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        tenant = director_user.tenant
        url = reverse("superadmin-schools-detail", args=[str(tenant.id)])

        resp = client.get(url)
        assert resp.status_code == 200
        resp_body = resp.json()
        assert resp_body["status"] == "success"
        data = resp_body["data"]

        assert data["name"] == tenant.name
        # student_count == 0 en Épic 2 (sentinelle)
        assert data["student_count"] == 0
        # staff_count == 1 (director_user créé dans ce tenant)
        assert data["staff_count"] == 1

        # SUPERADMIN-V2-03 — correctif trouvé en marge du ticket : le plan
        # imbriqué doit inclure price_monthly/max_students/max_staff (pas
        # seulement id/name), sinon la page de détail école affiche
        # "NaN GNF" et des limites vides.
        assert data["plan"]["id"] == str(tenant.plan.id)
        assert data["plan"]["price_monthly"] == str(tenant.plan.price_monthly)
        assert data["plan"]["max_students"] == tenant.plan.max_students
        assert data["plan"]["max_staff"] == tenant.plan.max_staff

    def test_superadmin_can_suspend_and_reactivate_school(self, superadmin_user, director_user):
        """Vérifie le workflow de suspension (HARD) et de réactivation d'une école."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        tenant = director_user.tenant

        # 1. Suspension
        suspend_url = reverse("superadmin-schools-suspend", args=[str(tenant.id)])
        payload = {"reason": "Impayé abonnement", "type": "HARD"}

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            resp = client.patch(suspend_url, payload, format="json")
            assert resp.status_code == 200
            assert resp.json()["data"]["status"] == "SUSPENDED_HARD"

            tenant.refresh_from_db()
            assert tenant.status == Tenant.Status.SUSPENDED_HARD
            assert tenant.settings.get("suspend_reason") == "Impayé abonnement"
            # Notification Celery asynchrone déclenchée (old_status=ACTIVE car la fixture crée un tenant ACTIVE)
            mock_notify.assert_called_once_with(str(tenant.id), "ACTIVE", Tenant.Status.SUSPENDED_HARD)

        # 2. Réactivation
        reactivate_url = reverse("superadmin-schools-reactivate", args=[str(tenant.id)])
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            resp = client.patch(reactivate_url, {}, format="json")
            assert resp.status_code == 200
            assert resp.json()["data"]["status"] == "ACTIVE"

            tenant.refresh_from_db()
            assert tenant.status == Tenant.Status.ACTIVE
            assert "suspend_reason" not in tenant.settings
            mock_notify.assert_called_once_with(str(tenant.id), "SUSPENDED_HARD", Tenant.Status.ACTIVE)

    def test_superadmin_can_soft_suspend_school(self, superadmin_user, director_user):
        """SUPERADMIN-V2-01 : suspension SOFT distincte de HARD."""
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        tenant = director_user.tenant
        suspend_url = reverse("superadmin-schools-suspend", args=[str(tenant.id)])
        payload = {"reason": "Retard de paiement mineur", "type": "SOFT"}

        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay") as mock_notify:
            resp = client.patch(suspend_url, payload, format="json")
            assert resp.status_code == 200
            assert resp.json()["data"]["status"] == "SUSPENDED_SOFT"

            tenant.refresh_from_db()
            assert tenant.status == Tenant.Status.SUSPENDED_SOFT
            mock_notify.assert_called_once_with(str(tenant.id), "ACTIVE", Tenant.Status.SUSPENDED_SOFT)

    def test_suspend_without_type_returns_400(self, superadmin_user, director_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        tenant = director_user.tenant
        suspend_url = reverse("superadmin-schools-suspend", args=[str(tenant.id)])
        resp = client.patch(suspend_url, {"reason": "Impayé"}, format="json")
        assert resp.status_code == 400

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.ACTIVE

    def test_suspend_with_invalid_type_returns_400(self, superadmin_user, director_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        tenant = director_user.tenant
        suspend_url = reverse("superadmin-schools-suspend", args=[str(tenant.id)])
        resp = client.patch(
            suspend_url, {"reason": "Impayé", "type": "MEDIUM"}, format="json"
        )
        assert resp.status_code == 400

    def test_director_cannot_manage_schools(self, director_user):
        """Un directeur ne peut pas accéder aux endpoints superadmin-schools."""
        client = APIClient()
        token = login_user(client, director_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        list_url = reverse("superadmin-schools-list")
        resp = client.get(list_url)
        assert resp.status_code == 403

        # Tentative suspension
        suspend_url = reverse("superadmin-schools-suspend", args=[str(director_user.tenant.id)])
        resp = client.patch(suspend_url, {"reason": "Test"}, format="json")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestChangePlan:
    """SUPERADMIN-V2-03 : PATCH /superadmin/schools/{id}/change-plan/"""

    def test_change_plan_success_immediate_effect(self, superadmin_user, director_user, plan):
        tenant = director_user.tenant
        new_plan = Plan.objects.create(
            name="Enterprise", max_students=2000, max_staff=200,
            price_monthly=Decimal("3000000.00"), is_active=True,
        )
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
        resp = client.patch(url, {"plan_id": str(new_plan.id)}, format="json")

        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["plan"]["name"] == "Enterprise"
        tenant.refresh_from_db()
        assert tenant.plan_id == new_plan.id

    def test_change_plan_blocked_when_student_count_exceeds_target(
        self, superadmin_user, director_user, plan
    ):
        tenant = director_user.tenant
        small_plan = Plan.objects.create(
            name="Mini", max_students=100, max_staff=10, is_active=True,
        )
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        with patch.object(Tenant, "get_student_count", return_value=150):
            url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
            resp = client.patch(url, {"plan_id": str(small_plan.id)}, format="json")

        assert resp.status_code == 422
        assert "150" in resp.json()["message"]
        tenant.refresh_from_db()
        assert tenant.plan_id == plan.id  # inchangé

    def test_change_plan_blocked_when_staff_count_exceeds_target(
        self, superadmin_user, director_user, plan
    ):
        tenant = director_user.tenant
        small_plan = Plan.objects.create(
            name="Mini Staff", max_students=1000, max_staff=5, is_active=True,
        )
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        with patch.object(Tenant, "get_staff_count", return_value=10):
            url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
            resp = client.patch(url, {"plan_id": str(small_plan.id)}, format="json")

        assert resp.status_code == 422
        tenant.refresh_from_db()
        assert tenant.plan_id == plan.id

    def test_change_plan_allowed_when_exactly_at_limit(
        self, superadmin_user, director_user, plan
    ):
        """Être PILE à la limite est un état valide, pas un dépassement."""
        tenant = director_user.tenant
        exact_plan = Plan.objects.create(
            name="Exact", max_students=150, max_staff=100, is_active=True,
        )
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        with patch.object(Tenant, "get_student_count", return_value=150):
            url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
            resp = client.patch(url, {"plan_id": str(exact_plan.id)}, format="json")

        assert resp.status_code == 200, resp.json()

    def test_change_plan_to_inactive_plan_returns_422(self, superadmin_user, director_user):
        tenant = director_user.tenant
        inactive_plan = Plan.objects.create(name="Retiré", is_active=False)
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
        resp = client.patch(url, {"plan_id": str(inactive_plan.id)}, format="json")

        assert resp.status_code == 422

    def test_change_plan_missing_plan_id_returns_400(self, superadmin_user, director_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(director_user.tenant.id)])
        resp = client.patch(url, {}, format="json")
        assert resp.status_code == 400

    def test_change_plan_unknown_plan_returns_404(self, superadmin_user, director_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(director_user.tenant.id)])
        resp = client.patch(
            url, {"plan_id": "00000000-0000-0000-0000-000000000000"}, format="json"
        )
        assert resp.status_code == 404

    def test_change_plan_forbidden_for_director(self, director_user, plan):
        other_plan = Plan.objects.create(name="Autre", is_active=True)
        client = APIClient()
        token = login_user(client, director_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(director_user.tenant.id)])
        resp = client.patch(url, {"plan_id": str(other_plan.id)}, format="json")
        assert resp.status_code == 403

    def test_change_plan_creates_audit_log(self, superadmin_user, director_user, plan):
        from apps.monitoring.models import AuditLog

        tenant = director_user.tenant
        new_plan = Plan.objects.create(
            name="Audit Plan", max_students=500, max_staff=50, is_active=True,
        )
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-change-plan", args=[str(tenant.id)])
        client.patch(url, {"plan_id": str(new_plan.id)}, format="json")

        log = AuditLog.objects.filter(action="tenant:change-plan", target_id=str(tenant.id)).first()
        assert log is not None
        assert log.extra["new_plan_id"] == str(new_plan.id)
        assert log.extra["old_plan_id"] == str(plan.id)
