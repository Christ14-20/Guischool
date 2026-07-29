"""
apps/communication/models.py — COMM-MVP-01

Modèle SMSLog : journal d'envoi des SMS + compteur de throttling.

Champs de conception (validés par le PO) :
  - recipient_phone : numéro effectif, clé de bucket pour le throttling
  - guardian : FK nullable pour traçabilité (un même phone peut être
    partagé par plusieurs guardians d'une fratrie)
  - provider_message_id : corrélation avec le webhook de livraison AT
  - content : corps du message envoyé (debug/support)
  - failure_reason : cohérent avec Payment.failure_reason
  - DELIVERED documenté comme dette V2 si la sandbox AT ne le permet pas
"""

from django.db import models
from django.utils import timezone
from core.models import TenantScopedModel


class SMSLog(TenantScopedModel):
    class TriggerType(models.TextChoices):
        ABSENCE = "ABSENCE", "Notification d'absence"
        PAIEMENT = "PAIEMENT", "Confirmation de paiement"
        NOTE_VALIDEE = "NOTE_VALIDEE", "Note validée"
        INSCRIPTION = "INSCRIPTION", "Confirmation d'inscription"

    class Status(models.TextChoices):
        SENT = "SENT", "Envoyé"
        FAILED = "FAILED", "Échec"
        DELIVERED = "DELIVERED", "Délivré"

    recipient_phone = models.CharField(
        max_length=20, db_index=True,
        help_text="Numéro de téléphone destinataire (ex: +224655112233)",
    )
    guardian = models.ForeignKey(
        "pedagogy.Guardian",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="sms_logs",
        help_text="Guardian associé (nullable — SMS peut partir vers un numéro sans guardian)",
    )
    content = models.TextField(help_text="Corps du message envoyé")
    trigger_type = models.CharField(
        max_length=20, choices=TriggerType.choices,
        help_text="Déclencheur métier à l'origine de l'envoi",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.SENT, db_index=True,
    )
    provider_message_id = models.CharField(
        max_length=100, blank=True, db_index=True,
        help_text="ID retourné par Africa's Talking, utilisé pour corréler le webhook de livraison",
    )
    failure_reason = models.TextField(
        blank=True,
        help_text="Raison d'échec (cohérent avec Payment.failure_reason)",
    )
    sent_at = models.DateTimeField(
        default=timezone.now,
        help_text="Horodatage de l'envoi",
    )

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "recipient_phone", "sent_at"]),
            models.Index(fields=["tenant", "trigger_type"]),
        ]

    def __str__(self):
        return f"[{self.get_trigger_type_display()}] {self.recipient_phone} — {self.get_status_display()}"
