"""
apps/superadmin/tests/test_dashboard_endpoint.py — SUPERADMIN-V2-02

Tests d'intégration pour GET /superadmin/dashboard/ :
- Isolation (IsSuperAdmin uniquement).
- Décompte par statut (5 valeurs de Tenant.Status + total).
- MRR estimé (ACTIVE uniquement).
- Évolution des créations sur 12 mois glissants, zero-paddée, toutes
  créations comptées indépendamment du statut actuel.
- 5 dernières écoles créées.
"""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.superadmin.services.dashboard_service import _month_window


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Plan Dashboard Starter", max_students=200, max_staff=20,
        price_monthly=Decimal("500000.00"), is_active=True,
    )


@pytest.fixture
def pro_plan(db):
    return Plan.objects.create(
        name="Plan Dashboard Pro", max_students=1000, max_staff=100,
        price_monthly=Decimal("1500000.00"), is_active=True,
    )


@pytest.fixture
def superadmin_role(db):
    return Role.objects.get_or_create(name="SUPER_ADMIN", defaults={"label": "Super Admin"})[0]


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})[0]


@pytest.fixture
def superadmin_user(superadmin_role):
    return User.objects.create_user(
        username="sadmin-dash", email="sadmin-dash@eduguinee.gn",
        password="SecurePass123!", role=superadmin_role, tenant=None,
    )


@pytest.fixture
def director_user(director_role, plan):
    tenant = Tenant.objects.create(
        name="École Directeur Dash", slug="ecole-directeur-dash",
        school_type=Tenant.SchoolType.PRIMAIRE, status=Tenant.Status.ACTIVE, plan=plan,
        contact_name="Directeur", contact_phone="+224620000099",
        contact_email="directeur-dash@ecole.gn",
    )
    return User.objects.create_user(
        username="director-dash", email="director-dash@ecole.gn",
        password="SecurePass123!", role=director_role, tenant=tenant,
    )


def login_user(client, email, password="SecurePass123!"):
    resp = client.post(reverse("auth-login"), {"email": email, "password": password}, format="json")
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


def _make_tenant(plan, status, suffix, created_at=None):
    tenant = Tenant.objects.create(
        name=f"École Dash {suffix}",
        slug=f"ecole-dash-{suffix}",
        school_type=Tenant.SchoolType.MIXTE,
        status=status,
        plan=plan,
        contact_name="Directeur Test",
        contact_phone="+224620000001",
        contact_email=f"dir-dash-{suffix}@ecole.gn",
    )
    if created_at is not None:
        Tenant.objects.filter(id=tenant.id).update(created_at=created_at)
        tenant.refresh_from_db()
    return tenant


def _months_ago(n: int) -> tuple[int, int]:
    """(année, mois) situé n mois avant le mois courant."""
    return _month_window(timezone.localdate(), size=n + 1)[0]


# ─── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDashboardIsolation:
    def test_requires_authentication(self):
        client = APIClient()
        resp = client.get(reverse("superadmin-dashboard"))
        assert resp.status_code == 401

    def test_director_forbidden(self, director_user):
        client = APIClient()
        token = login_user(client, director_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        assert resp.status_code == 403

    def test_superadmin_allowed(self, superadmin_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"


@pytest.mark.django_db
class TestDashboardEmptyState:
    def test_no_tenants_returns_zeros(self, superadmin_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        data = resp.json()["data"]

        assert data["totals"] == {
            "total": 0, "TRIAL": 0, "ACTIVE": 0,
            "SUSPENDED_SOFT": 0, "SUSPENDED_HARD": 0, "CANCELLED": 0,
        }
        assert Decimal(data["mrr_estimated"]) == Decimal("0.00")
        assert len(data["monthly_creations"]) == 12
        assert all(m["count"] == 0 for m in data["monthly_creations"])
        assert data["recent_schools"] == []


@pytest.mark.django_db
class TestDashboardTotalsAndMRR:
    def test_totals_by_status(self, superadmin_user, plan):
        _make_tenant(plan, Tenant.Status.TRIAL, "trial1")
        _make_tenant(plan, Tenant.Status.TRIAL, "trial2")
        _make_tenant(plan, Tenant.Status.ACTIVE, "active1")
        _make_tenant(plan, Tenant.Status.SUSPENDED_SOFT, "soft1")
        _make_tenant(plan, Tenant.Status.SUSPENDED_HARD, "hard1")
        _make_tenant(plan, Tenant.Status.CANCELLED, "cancelled1")

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        totals = resp.json()["data"]["totals"]

        assert totals == {
            "total": 6, "TRIAL": 2, "ACTIVE": 1,
            "SUSPENDED_SOFT": 1, "SUSPENDED_HARD": 1, "CANCELLED": 1,
        }

    def test_mrr_counts_active_only(self, superadmin_user, plan, pro_plan):
        _make_tenant(plan, Tenant.Status.ACTIVE, "active-starter")       # 500000
        _make_tenant(pro_plan, Tenant.Status.ACTIVE, "active-pro")       # 1500000
        _make_tenant(pro_plan, Tenant.Status.TRIAL, "trial-pro")         # excluded
        _make_tenant(pro_plan, Tenant.Status.SUSPENDED_SOFT, "soft-pro")  # excluded
        _make_tenant(pro_plan, Tenant.Status.SUSPENDED_HARD, "hard-pro")  # excluded
        _make_tenant(pro_plan, Tenant.Status.CANCELLED, "cancelled-pro")  # excluded

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        mrr = Decimal(resp.json()["data"]["mrr_estimated"])

        assert mrr == Decimal("2000000.00")


@pytest.mark.django_db
class TestDashboardMonthlyCreations:
    def test_zero_padded_12_months_chronological(self, superadmin_user, plan):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        series = resp.json()["data"]["monthly_creations"]

        assert len(series) == 12
        expected_months = [f"{y:04d}-{m:02d}" for (y, m) in _month_window(timezone.localdate())]
        assert [row["month"] for row in series] == expected_months

    def test_counts_all_creations_regardless_of_current_status(self, superadmin_user, plan):
        current_year, current_month = _months_ago(0)
        two_months_ago_year, two_months_ago_month = _months_ago(2)

        _make_tenant(
            plan, Tenant.Status.ACTIVE, "current-month-1",
            created_at=timezone.make_aware(
                datetime(current_year, current_month, 5)
            ),
        )
        _make_tenant(
            plan, Tenant.Status.CANCELLED, "current-month-2-cancelled",
            created_at=timezone.make_aware(
                datetime(current_year, current_month, 10)
            ),
        )
        _make_tenant(
            plan, Tenant.Status.SUSPENDED_HARD, "two-months-ago",
            created_at=timezone.make_aware(
                datetime(two_months_ago_year, two_months_ago_month, 1)
            ),
        )

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        series = resp.json()["data"]["monthly_creations"]
        by_month = {row["month"]: row["count"] for row in series}

        assert by_month[f"{current_year:04d}-{current_month:02d}"] == 2
        assert by_month[f"{two_months_ago_year:04d}-{two_months_ago_month:02d}"] == 1
        # tous les autres mois de la fenêtre restent à 0
        others = [
            row["count"] for row in series
            if row["month"] not in (
                f"{current_year:04d}-{current_month:02d}",
                f"{two_months_ago_year:04d}-{two_months_ago_month:02d}",
            )
        ]
        assert all(c == 0 for c in others)

    def test_creations_outside_window_are_excluded(self, superadmin_user, plan):
        outside_year, outside_month = _months_ago(13)
        _make_tenant(
            plan, Tenant.Status.ACTIVE, "outside-window",
            created_at=timezone.make_aware(
                datetime(outside_year, outside_month, 1)
            ),
        )

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        series = resp.json()["data"]["monthly_creations"]

        assert sum(row["count"] for row in series) == 0
        # mais le tenant existe bien (visible dans les totals), preuve que
        # l'exclusion vient bien de la fenêtre temporelle, pas d'un bug de comptage
        totals_resp_active = resp.json()["data"]["totals"]["ACTIVE"]
        assert totals_resp_active == 1


@pytest.mark.django_db
class TestDashboardRecentSchools:
    def test_limited_to_five_ordered_by_created_at_desc(self, superadmin_user, plan):
        base = timezone.now()
        for i in range(7):
            t = _make_tenant(plan, Tenant.Status.ACTIVE, f"recent-{i}")
            Tenant.objects.filter(id=t.id).update(
                created_at=base - timedelta(days=7 - i)
            )

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        recent = resp.json()["data"]["recent_schools"]

        assert len(recent) == 5
        names = [r["name"] for r in recent]
        # Les plus récents créés en dernier (i=6, 5, 4, 3, 2) doivent apparaître,
        # les plus anciens (i=0, 1) doivent être exclus.
        assert names == [
            "École Dash recent-6", "École Dash recent-5", "École Dash recent-4",
            "École Dash recent-3", "École Dash recent-2",
        ]

    def test_recent_school_shape_matches_tenant_list_serializer(self, superadmin_user, plan):
        _make_tenant(plan, Tenant.Status.ACTIVE, "shape-check")

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = client.get(reverse("superadmin-dashboard"))
        school = resp.json()["data"]["recent_schools"][0]

        assert set(school.keys()) == {"id", "name", "slug", "status", "plan", "student_count", "created_at"}
        assert set(school["plan"].keys()) == {"id", "name"}
