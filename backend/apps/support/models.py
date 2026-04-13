"""
apps/support/models.py
Modèles : SupportTicket, TicketMessage
"""
import uuid
from django.db import models


def generate_tracking_code() -> str:
    return uuid.uuid4().hex[:10].upper()


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


class SchoolOnboardingRequest(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "En attente"),
        ("APPROVED", "Approuvée"),
        ("REJECTED", "Rejetée"),
    ]

    SCHOOL_TYPE_CHOICES = [
        ("PRIMAIRE", "Primaire"),
        ("COLLEGE", "Collège"),
        ("LYCEE", "Lycée"),
        ("MIXTE", "Mixte"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(max_length=20, unique=True, default=generate_tracking_code)

    # Ecole
    school_name = models.CharField(max_length=255)
    school_type = models.CharField(max_length=20, choices=SCHOOL_TYPE_CHOICES)
    school_city = models.CharField(max_length=120, blank=True)
    school_phone = models.CharField(max_length=20, blank=True)
    school_email = models.EmailField()

    # Admin école demandé
    admin_first_name = models.CharField(max_length=120)
    admin_last_name = models.CharField(max_length=120)
    admin_email = models.EmailField()
    admin_phone = models.CharField(max_length=20, blank=True)
    admin_password_hash = models.CharField(max_length=255)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    review_note = models.TextField(blank=True)
    processed_by = models.ForeignKey(
        "authentication.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="processed_onboarding_requests",
    )
    created_tenant = models.ForeignKey(
        "superadmin.Tenant",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="onboarding_requests",
    )
    created_admin_user = models.ForeignKey(
        "authentication.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="onboarding_created_accounts",
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Demande d'ouverture d'école"
        verbose_name_plural = "Demandes d'ouverture d'école"

    def __str__(self):
        return f"{self.school_name} ({self.tracking_code})"
