"""
apps/superadmin/tests/test_platform_invoice.py — SUPERADMIN-V2-05

Tests pour la facturation SaaS (école -> Eduguinée) : génération, listing,
marquage payé, isolation cross-tenant.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User, Role
from apps.superadmin.models import Plan, PlatformInvoice, PlatformInvoiceSequence, Tenant
from apps.superadmin.services.platform_invoice_service import (
    generate_due_invoices,
    generate_invoice_number,
    get_next_billing_date,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def superadmin_role(db):
    return Role.objects.get_or_create(name="SUPER_ADMIN", defaults={"label": "Super Admin"})[0]


@pytest.fixture
def superadmin_user(superadmin_role):
    return User.objects.create_user(
        username="sadmin-test-invoices",
        email="sadmin-invoices@eduguinee.gn",
        password="SecurePass123!",
        role=superadmin_role,
        tenant=None,
    )


@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Pro Plan", max_students=1000, max_staff=100,
        price_monthly=Decimal("1500000.00"), is_active=True,
    )


def make_tenant(plan, status=Tenant.Status.ACTIVE, name="École Facturation", slug="ecole-facturation"):
    return Tenant.objects.create(
        name=name, slug=slug, school_type=Tenant.SchoolType.PRIMAIRE, status=status, plan=plan,
        contact_name="Directeur Test", contact_phone="+224620000001",
        contact_email=f"dir-{slug}@ecole.gn",
    )


def login_user(client, email, password="SecurePass123!"):
    resp = client.post(reverse("auth-login"), {"email": email, "password": password}, format="json")
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["data"]["access_token"]


# ─── Service : numérotation ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestInvoiceNumbering:
    def test_sequential_within_year(self):
        n1 = generate_invoice_number(date(2026, 3, 1))
        n2 = generate_invoice_number(date(2026, 3, 15))
        assert n1 == "PINV-2026-000001"
        assert n2 == "PINV-2026-000002"

    def test_resets_per_year(self):
        generate_invoice_number(date(2025, 12, 31))
        n = generate_invoice_number(date(2026, 1, 1))
        assert n == "PINV-2026-000001"

    def test_global_across_tenants(self, plan):
        """La séquence est globale (un seul émetteur), pas par tenant."""
        tenant_a = make_tenant(plan, name="École A", slug="ecole-a")
        tenant_b = make_tenant(plan, name="École B", slug="ecole-b")
        n1 = generate_invoice_number(date(2026, 5, 1))
        n2 = generate_invoice_number(date(2026, 5, 2))
        assert n1 != n2
        assert PlatformInvoiceSequence.objects.get(year=2026).last_seq == 2


# ─── Service : ancre de facturation ───────────────────────────────────────────

@pytest.mark.django_db
class TestBillingAnchor:
    def test_first_cycle_starts_today_not_created_at(self, plan):
        """
        Décision PO : pas de rattrapage rétroactif sur created_at si le
        tenant est resté longtemps en TRIAL avant de devenir éligible.
        """
        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        Tenant.objects.filter(id=tenant.id).update(
            created_at=timezone.make_aware(timezone.datetime(2020, 1, 1))
        )
        tenant.refresh_from_db()

        today = date(2026, 6, 15)
        next_due = get_next_billing_date(tenant, today)
        assert next_due == today

    def test_next_cycle_starts_from_previous_period_end(self, plan):
        tenant = make_tenant(plan)
        PlatformInvoice.objects.create(
            tenant=tenant, invoice_number="PINV-2026-000099", amount=Decimal("100.00"),
            plan_name=plan.name, period_start=date(2026, 1, 10), period_end=date(2026, 2, 10),
            issued_date=date(2026, 1, 10), due_date=date(2026, 1, 25),
        )
        next_due = get_next_billing_date(tenant, date(2026, 2, 20))
        assert next_due == date(2026, 2, 10)

    def test_no_retroactive_billing_after_cancellation_and_reactivation(self, plan):
        """
        Régression : un tenant qui a déjà des factures, passe CANCELLED
        (sort du filtre ELIGIBLE_STATUSES, invisible à la tâche), puis est
        réactivé des mois plus tard, ne doit JAMAIS repartir de l'ancien
        `period_end` de sa dernière facture (ça facturerait rétroactivement
        la période CANCELLED, où le tenant ne payait rien et n'utilisait pas
        le service) — même principe que la décision PO sur TRIAL, étendu à
        CANCELLED. `billing_cycle_start` (repositionné par
        TenantViewSet.suspend/reactivate à la réactivation) doit prévaloir
        sur toute facture antérieure.
        """
        tenant = make_tenant(plan, status=Tenant.Status.CANCELLED)
        # Dernière facture avant le passage CANCELLED : plusieurs mois dans le passé.
        PlatformInvoice.objects.create(
            tenant=tenant, invoice_number="PINV-2025-000050", amount=Decimal("100.00"),
            plan_name=plan.name, period_start=date(2025, 10, 1), period_end=date(2025, 11, 1),
            issued_date=date(2025, 10, 1), due_date=date(2025, 10, 16),
        )
        # Réactivation simulée le 2026-04-01 (ce que TenantViewSet.reactivate
        # ferait réellement via timezone.now().date()).
        reactivation_date = date(2026, 4, 1)
        tenant.status = Tenant.Status.ACTIVE
        tenant.billing_cycle_start = reactivation_date
        tenant.save(update_fields=["status", "billing_cycle_start"])

        next_due = get_next_billing_date(tenant, date(2026, 4, 1))
        assert next_due == reactivation_date
        assert next_due != date(2025, 11, 1)

    def test_billing_cycle_start_ignored_when_after_a_current_invoice(self, plan):
        """
        Si `billing_cycle_start` est antérieur à la dernière facture (cas
        normal : le tenant facture en continu depuis sa réactivation, sans
        nouveau passage par TRIAL/CANCELLED), la facturation continue
        normalement depuis `period_end` — `billing_cycle_start` ne doit
        jamais bloquer un cycle de facturation déjà en cours.
        """
        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        tenant.billing_cycle_start = date(2026, 1, 1)
        tenant.save(update_fields=["billing_cycle_start"])

        PlatformInvoice.objects.create(
            tenant=tenant, invoice_number="PINV-2026-000060", amount=Decimal("100.00"),
            plan_name=plan.name, period_start=date(2026, 2, 1), period_end=date(2026, 3, 1),
            issued_date=date(2026, 2, 1), due_date=date(2026, 2, 16),
        )
        next_due = get_next_billing_date(tenant, date(2026, 3, 15))
        assert next_due == date(2026, 3, 1)

    def test_variable_month_length_handled_via_relativedelta(self, plan):
        """Un cycle démarrant le 31 janvier se termine le 28 février (pas d'erreur)."""
        tenant = make_tenant(plan)
        invoices = generate_due_invoices(today=date(2026, 1, 31))
        # Force period_start to Jan 31 directly via the service's own logic:
        # get_next_billing_date returns today when no invoice exists yet.
        assert len(invoices) == 1
        inv = invoices[0]
        assert inv.period_start == date(2026, 1, 31)
        assert inv.period_end == date(2026, 2, 28)


# ─── Service : génération ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestGenerateDueInvoices:
    def test_generates_for_active_tenant(self, plan):
        tenant = make_tenant(plan, status=Tenant.Status.ACTIVE)
        invoices = generate_due_invoices(today=date(2026, 4, 1))
        assert len(invoices) == 1
        inv = invoices[0]
        assert inv.tenant_id == tenant.id
        assert inv.amount == plan.price_monthly
        assert inv.plan_name == plan.name
        assert inv.status == PlatformInvoice.Status.PENDING
        assert inv.due_date == date(2026, 4, 1) + timedelta(days=15)

    def test_generates_for_suspended_soft_and_hard(self, plan):
        make_tenant(plan, status=Tenant.Status.SUSPENDED_SOFT, name="Soft", slug="soft")
        make_tenant(plan, status=Tenant.Status.SUSPENDED_HARD, name="Hard", slug="hard")
        invoices = generate_due_invoices(today=date(2026, 4, 1))
        assert len(invoices) == 2

    def test_does_not_generate_for_trial_or_cancelled(self, plan):
        make_tenant(plan, status=Tenant.Status.TRIAL, name="Trial", slug="trial")
        make_tenant(plan, status=Tenant.Status.CANCELLED, name="Cancelled", slug="cancelled")
        invoices = generate_due_invoices(today=date(2026, 4, 1))
        assert len(invoices) == 0

    def test_no_duplicate_generation_same_period(self, plan):
        tenant = make_tenant(plan)
        first = generate_due_invoices(today=date(2026, 4, 1))
        assert len(first) == 1
        # Re-running the same day (or any day still within the same period)
        # must not create a second invoice.
        second = generate_due_invoices(today=date(2026, 4, 15))
        assert len(second) == 0
        assert PlatformInvoice.objects.filter(tenant=tenant).count() == 1

    def test_generates_next_cycle_once_period_elapses(self, plan):
        tenant = make_tenant(plan)
        generate_due_invoices(today=date(2026, 4, 1))
        second = generate_due_invoices(today=date(2026, 5, 1))
        assert len(second) == 1
        assert PlatformInvoice.objects.filter(tenant=tenant).count() == 2


# ─── API : suspend/reactivate positionnent billing_cycle_start ───────────────

@pytest.mark.django_db
class TestBillingCycleStartTransitions:
    """
    Régression : TenantViewSet.suspend/reactivate doivent repositionner
    billing_cycle_start à aujourd'hui uniquement lors d'une rentrée en
    éligibilité (ancien statut TRIAL ou CANCELLED), jamais lors d'une
    transition entre deux statuts déjà éligibles.
    """

    def test_reactivate_from_cancelled_sets_billing_cycle_start(self, superadmin_user, plan):
        tenant = make_tenant(plan, status=Tenant.Status.CANCELLED)
        assert tenant.billing_cycle_start is None

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-reactivate", args=[str(tenant.id)])
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            resp = client.patch(url, {}, format="json")
        assert resp.status_code == 200

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.ACTIVE
        assert tenant.billing_cycle_start == date.today()

    def test_suspend_from_trial_sets_billing_cycle_start(self, superadmin_user, plan):
        tenant = make_tenant(plan, status=Tenant.Status.TRIAL)
        assert tenant.billing_cycle_start is None

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-suspend", args=[str(tenant.id)])
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            resp = client.patch(url, {"reason": "Test", "type": "SOFT"}, format="json")
        assert resp.status_code == 200

        tenant.refresh_from_db()
        assert tenant.status == Tenant.Status.SUSPENDED_SOFT
        assert tenant.billing_cycle_start == date.today()

    def test_reactivate_between_eligible_statuses_does_not_reset(self, superadmin_user, plan):
        """SUSPENDED_HARD -> ACTIVE : les deux sont éligibles, pas de nouvelle rentrée."""
        tenant = make_tenant(plan, status=Tenant.Status.SUSPENDED_HARD)
        earlier = date(2025, 1, 1)
        tenant.billing_cycle_start = earlier
        tenant.save(update_fields=["billing_cycle_start"])

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-reactivate", args=[str(tenant.id)])
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            resp = client.patch(url, {}, format="json")
        assert resp.status_code == 200

        tenant.refresh_from_db()
        assert tenant.billing_cycle_start == earlier

    def test_full_flow_cancelled_reactivation_generates_no_retroactive_invoice(self, superadmin_user, plan):
        """
        Bout en bout : facture ancienne existante -> tenant CANCELLED ->
        réactivé via l'API réelle -> generate_due_invoices ne doit produire
        qu'UNE facture, dont la période démarre à la réactivation, jamais à
        l'ancien period_end.
        """
        tenant = make_tenant(plan, status=Tenant.Status.CANCELLED)
        PlatformInvoice.objects.create(
            tenant=tenant, invoice_number="PINV-2025-000099", amount=Decimal("100.00"),
            plan_name=plan.name, period_start=date(2025, 6, 1), period_end=date(2025, 7, 1),
            issued_date=date(2025, 6, 1), due_date=date(2025, 6, 16),
        )

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        url = reverse("superadmin-schools-reactivate", args=[str(tenant.id)])
        with patch("apps.superadmin.tasks.send_tenant_status_notification.delay"):
            client.patch(url, {}, format="json")

        tenant.refresh_from_db()
        today = date.today()
        created = generate_due_invoices(today=today)

        new_invoices = [inv for inv in created if inv.tenant_id == tenant.id]
        assert len(new_invoices) == 1
        assert new_invoices[0].period_start == today
        assert new_invoices[0].period_start != date(2025, 7, 1)

        # Une seconde exécution le même jour ne doit rien produire de plus
        # (pas de rattrapage en boucle).
        second = generate_due_invoices(today=today)
        assert [inv for inv in second if inv.tenant_id == tenant.id] == []


# ─── API : liste + mark-paid ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestInvoiceEndpoints:
    def test_list_invoices_for_school(self, superadmin_user, plan):
        tenant = make_tenant(plan)
        generate_due_invoices(today=date(2026, 4, 1))

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-invoices", args=[str(tenant.id)])
        resp = client.get(url)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["data"]["count"] == 1
        assert body["data"]["results"][0]["invoice_number"].startswith("PINV-2026-")

    def test_list_invoices_unknown_school_returns_404(self, superadmin_user):
        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-invoices", args=["00000000-0000-0000-0000-000000000000"])
        resp = client.get(url)
        assert resp.status_code == 404

    def test_mark_invoice_paid_success(self, superadmin_user, plan):
        tenant = make_tenant(plan)
        [invoice] = generate_due_invoices(today=date(2026, 4, 1))

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-mark-invoice-paid", args=[str(tenant.id), str(invoice.id)])
        resp = client.patch(url)
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["status"] == "PAID"
        assert body["data"]["paid_date"] is not None

        invoice.refresh_from_db()
        assert invoice.status == PlatformInvoice.Status.PAID
        assert invoice.paid_date == date.today()

    def test_mark_already_paid_invoice_returns_422(self, superadmin_user, plan):
        tenant = make_tenant(plan)
        [invoice] = generate_due_invoices(today=date(2026, 4, 1))
        invoice.status = PlatformInvoice.Status.PAID
        invoice.paid_date = date(2026, 4, 2)
        invoice.save(update_fields=["status", "paid_date"])

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-mark-invoice-paid", args=[str(tenant.id), str(invoice.id)])
        resp = client.patch(url)
        assert resp.status_code == 422

    def test_mark_invoice_paid_creates_audit_log(self, superadmin_user, plan):
        from apps.monitoring.models import AuditLog

        tenant = make_tenant(plan)
        [invoice] = generate_due_invoices(today=date(2026, 4, 1))

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-mark-invoice-paid", args=[str(tenant.id), str(invoice.id)])
        client.patch(url)

        log = AuditLog.objects.filter(action="platforminvoice:mark-paid", target_id=str(invoice.id)).first()
        assert log is not None
        assert log.user_id == superadmin_user.id

    def test_mark_invoice_paid_cross_tenant_returns_404(self, superadmin_user, plan):
        """
        Régression : un invoice_id valide mais rattaché à un AUTRE tenant que
        {id} dans l'URL ne doit jamais être accepté (isolation cross-tenant,
        même famille de faille que level_id/TenantViewSet des tickets
        précédents).
        """
        tenant_a = make_tenant(plan, name="École A", slug="ecole-a")
        tenant_b = make_tenant(plan, name="École B", slug="ecole-b")

        invoice_a = PlatformInvoice.objects.create(
            tenant=tenant_a, invoice_number="PINV-2026-000001", amount=Decimal("100.00"),
            plan_name=plan.name, period_start=date(2026, 4, 1), period_end=date(2026, 5, 1),
            issued_date=date(2026, 4, 1), due_date=date(2026, 4, 16),
        )

        client = APIClient()
        token = login_user(client, superadmin_user.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # invoice_a belongs to tenant_a, but the URL names tenant_b.
        url = reverse("superadmin-schools-mark-invoice-paid", args=[str(tenant_b.id), str(invoice_a.id)])
        resp = client.patch(url)
        assert resp.status_code == 404

        invoice_a.refresh_from_db()
        assert invoice_a.status == PlatformInvoice.Status.PENDING

    def test_invoices_endpoint_forbidden_for_director(self, plan):
        director_role, _ = Role.objects.get_or_create(name="DIRECTOR", defaults={"label": "Directeur"})
        tenant = make_tenant(plan)
        director = User.objects.create_user(
            username="director-invoices", email="director-invoices@eduguinee.gn",
            password="SecurePass123!", role=director_role, tenant=tenant,
        )

        client = APIClient()
        token = login_user(client, director.email)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("superadmin-schools-invoices", args=[str(tenant.id)])
        resp = client.get(url)
        assert resp.status_code == 403
