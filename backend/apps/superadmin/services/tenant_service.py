"""
apps/superadmin/services/tenant_service.py
Logique métier : création tenant, suspension, réactivation, audit.
"""
from apps.superadmin.models import Tenant, Plan, Subscription
from django.utils import timezone


def create_tenant(name: str, plan_name: str = "TRIAL", **kwargs) -> Tenant:
    """Créer un nouveau tenant (école) avec abonnement initial."""
    plan = Plan.objects.filter(name=plan_name.upper()).first()
    tenant = Tenant.objects.create(name=name, plan=plan, **kwargs)
    # Créer l'abonnement initial
    if plan:
        Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            start_date=timezone.now().date(),
            status="TRIAL",
        )
    return tenant


def suspend_tenant(tenant: Tenant, reason: str = "") -> Tenant:
    """Suspendre un tenant et journaliser l'action."""
    tenant.suspend()
    # TODO: Journaliser dans AuditLog
    return tenant


def reactivate_tenant(tenant: Tenant) -> Tenant:
    """Réactiver un tenant suspendu."""
    tenant.reactivate()
    # TODO: Journaliser dans AuditLog
    return tenant
