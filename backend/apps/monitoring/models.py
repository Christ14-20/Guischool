"""
apps/monitoring/models.py — AUTH-01 / A8

AuditLog : journal des actions importantes pour traçabilité.
Index composite (tenant, created_at) requis dès la création (décision A8).

Usage depuis n'importe quelle vue :
    from apps.monitoring.services import audit_log
    audit_log(request, action="auth:login", extra={"ip": ...})
"""

from django.db import models
from core.models import TimestampedModel


class AuditLog(TimestampedModel):
    """
    Enregistrement immuable d'une action utilisateur ou système.
    On n'utilise pas TenantScopedModel ici car :
    - Les logs SUPER_ADMIN n'ont pas de tenant
    - On veut un FK nullable sur tenant (pas CASCADE)
    """

    tenant = models.ForeignKey(
        "superadmin.Tenant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    user = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(
        max_length=100,
        help_text="Codename de l'action — même format que les permissions : module:action[:scope]",
    )
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=36, blank=True)  # UUID en string
    extra = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Index composite (tenant, created_at) — décision A8
            models.Index(fields=["tenant", "created_at"], name="auditlog_tenant_created_idx"),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action"]),
        ]
        # Pas de suppression de logs — voir convention §0.3 du schéma
        # La purge éventuelle se fera par archivage vers cold storage (V2)

    def __str__(self):
        return f"{self.action} by {self.user_id} at {self.created_at}"
