"""
apps/support/models.py
Modèles : SupportTicket, TicketMessage
"""
import uuid
from django.db import models


class SupportTicket(models.Model):
    CATEGORY_CHOICES = [
        ("TECHNICAL", "Technique"),
        ("BILLING", "Facturation"),
        ("FUNCTIONAL", "Fonctionnel"),
        ("FEATURE_REQUEST", "Demande de fonctionnalité"),
        ("ACCOUNT_BLOCKED", "Compte bloqué"),
        ("PAYMENT_ISSUE", "Problème de paiement"),
    ]
    PRIORITY_CHOICES = [
        ("BLOCKING", "Bloquant"),
        ("MAJOR", "Majeur"),
        ("MINOR", "Mineur"),
        ("QUESTION", "Question"),
    ]
    STATUS_CHOICES = [
        ("OPEN", "Ouvert"),
        ("IN_PROGRESS", "En cours"),
        ("WAITING_CUSTOMER", "En attente client"),
        ("RESOLVED", "Résolu"),
        ("CLOSED", "Fermé"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="tickets")
    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE, related_name="tickets")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="MINOR")
    description = models.TextField()
    screenshot_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    assigned_to = models.ForeignKey(
        "authentication.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="assigned_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ticket de support"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Ticket #{str(self.id)[:8]} — {self.get_category_display()} ({self.status})"


class TicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("authentication.User", on_delete=models.CASCADE, related_name="ticket_messages")
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message de ticket"
        ordering = ["timestamp"]

    def __str__(self):
        return f"Msg de {self.sender} sur #{str(self.ticket_id)[:8]}"
