"""
apps/superadmin/services/tenant_status_service.py — SUPERADMIN-V2-04

Point d'entrée unique pour toute transition de `Tenant.status` : status,
`settings.suspend_reason`, `billing_cycle_start` (SUPERADMIN-V2-05),
notification (email + SMS) et `AuditLog`. Remplace la logique auparavant
DUPLIQUÉE dans `TenantViewSet.suspend`/`reactivate` (SUPERADMIN-V2-01/05) —
réutilisée à la fois par ces deux actions (manuelles) et par l'escalade
automatique des impayés (`platform_invoice_service.escalate_overdue_tenants`),
pas une troisième implémentation.

`actor=None` distingue une transition automatique (pas d'utilisateur,
`AuditLog.user` nul) d'une transition manuelle initiée par un Super Admin —
`action` reste à la charge de l'appelant (`"tenant:suspend"`,
`"tenant:reactivate"`, `"tenant:auto-suspend-overdue"`...) pour rester
lisible dans l'AuditLog sans avoir à deviner l'origine depuis `user`.

No-op si `new_status == tenant.status` (aucune mutation, aucune
notification, aucun AuditLog) — décision PO (SUPERADMIN-V2-04) pour ne
jamais écraser un `suspend_reason` déjà en place quand le tenant est déjà
dans l'état cible. Appliqué UNIFORMÉMENT ici, y compris pour les appels
manuels (pas seulement l'escalade automatique) : un second appel manuel
"suspendre en HARD" sur un tenant déjà HARD n'a plus d'effet ni de
notification redondante — aucun test existant ne dépendait de la
ré-exécution précédente.
"""

from apps.superadmin.models import Tenant


def transition_tenant_status(
    tenant: Tenant,
    new_status: str,
    *,
    reason: str | None,
    action: str,
    actor=None,
    ip_address: str | None = None,
) -> bool:
    """
    Retourne True si une transition a effectivement eu lieu, False si
    no-op (tenant déjà dans `new_status`).

    `reason` : si fourni (non None), écrit dans `settings.suspend_reason`
    (cas suspend, manuel ou automatique). Si None, retire
    `suspend_reason` de `settings` s'il y était (cas reactivate).
    """
    if tenant.status == new_status:
        return False

    from django.utils import timezone

    old_status = tenant.status
    tenant.status = new_status
    if not tenant.settings:
        tenant.settings = {}
    if reason is not None:
        tenant.settings["suspend_reason"] = reason
    elif "suspend_reason" in tenant.settings:
        tenant.settings.pop("suspend_reason")

    update_fields = ["status", "settings", "updated_at"]
    if old_status in (Tenant.Status.TRIAL, Tenant.Status.CANCELLED):
        # SUPERADMIN-V2-05 : rentrée en éligibilité facturation, cf.
        # docstring de Tenant.billing_cycle_start.
        tenant.billing_cycle_start = timezone.now().date()
        update_fields.append("billing_cycle_start")
    tenant.save(update_fields=update_fields)

    from apps.superadmin.tasks import send_tenant_status_notification

    send_tenant_status_notification.delay(str(tenant.id), old_status, new_status)

    from apps.monitoring.services import audit_log

    audit_log(
        user=actor,
        tenant=tenant,
        action=action,
        ip_address=ip_address,
    )
    return True
