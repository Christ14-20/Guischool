"""
apps/monitoring/models.py
Modèles : AuditLog, SystemAlert
"""
import uuid
from django.db import models


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "superadmin.Tenant", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="audit_logs",
    )
    user = models.ForeignKey(
        "authentication.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="audit_logs",
    )
    action = models.CharField(max_length=200, help_text="Ex: student_created, grade_validated")
    entity_type = models.CharField(max_length=100, help_text="Ex: Student, Grade, Enrollment")
    entity_id = models.CharField(max_length=100, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log d'audit"
        verbose_name_plural = "Logs d'audit"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["tenant", "timestamp"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"[{self.timestamp}] {self.action} — {self.entity_type}/{self.entity_id}"

    @classmethod
    def log(cls, user, action: str, entity_type: str, entity_id="",
            old_value=None, new_value=None, ip_address=None):
        """Raccourci pour créer un log d'audit."""
        return cls.objects.create(
            tenant=getattr(user, "tenant", None),
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
        )


class SystemAlert(models.Model):
    TYPE_CHOICES = [
        ("ERROR_500", "Erreur 500"),
        ("SYNC_FAILURE", "Échec synchronisation"),
        ("HIGH_RESPONSE_TIME", "Temps de réponse élevé"),
        ("STORAGE_FULL", "Stockage plein"),
        ("BACKUP_FAILED", "Sauvegarde échouée"),
        ("SUBSCRIPTION_EXPIRED", "Abonnement expiré"),
    ]
    LEVEL_CHOICES = [
        ("INFO", "Info"),
        ("WARNING", "Avertissement"),
        ("CRITICAL", "Critique"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "superadmin.Tenant", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="system_alerts",
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default="INFO")
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Alerte système"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.level}] {self.type} — {self.timestamp}"
