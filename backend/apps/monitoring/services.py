"""
apps/monitoring/services.py

Helper audit_log() — à appeler depuis les views/services pour toute action traçable.

Usage :
    from apps.monitoring.services import audit_log

    audit_log(
        user=request.user,
        tenant=request.tenant,
        action="auth:login",
        ip_address=get_client_ip(request),
    )
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.authentication.models import User
    from apps.superadmin.models import Tenant


def audit_log(
    *,
    user: "User | None" = None,
    tenant: "Tenant | None" = None,
    action: str,
    target_model: str = "",
    target_id: str = "",
    extra: dict = None,
    ip_address: str | None = None,
) -> None:
    """
    Crée une entrée AuditLog de manière asynchrone (fire-and-forget).
    Ne lève pas d'exception en cas d'échec — les logs ne doivent jamais bloquer
    le flux principal.
    """
    from apps.monitoring.models import AuditLog

    try:
        AuditLog.objects.create(
            user=user,
            tenant=tenant,
            action=action,
            target_model=target_model,
            target_id=str(target_id) if target_id else "",
            extra=extra or {},
            ip_address=ip_address,
        )
    except Exception:
        # Fail silently — ne jamais bloquer la requête principale pour un log
        pass


def get_client_ip(request) -> str | None:
    """Extrait l'adresse IP réelle du client depuis les headers HTTP."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
