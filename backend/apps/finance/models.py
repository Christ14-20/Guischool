"""
apps/finance/models.py

Tous les montants utilisent decimal_places=0 (GNF entier) car le franc guinéen
n'a pas de sous-unité. Ce choix est conforme au schéma métier : les frais de
scolarité, paiements et soldes sont toujours des nombres entiers de GNF.
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator
from core.models import TenantScopedModel


class FeeCategory(TenantScopedModel):
    class FeeType(models.TextChoices):
        INSCRIPTION = "INSCRIPTION", "Inscription"
        SCOLARITE = "SCOLARITE", "Scolarité"

    school_year = models.ForeignKey(
        "pedagogy.SchoolYear",
        on_delete=models.CASCADE,
        related_name="fee_categories",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=FeeType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=0)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        unique_together = ["tenant", "school_year", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()}) — {self.amount} GNF"


class StudentFee(TenantScopedModel):
    student = models.ForeignKey(
        "pedagogy.Student",
        on_delete=models.CASCADE,
        related_name="student_fees",
    )
    fee_category = models.ForeignKey(
        FeeCategory,
        on_delete=models.CASCADE,
        related_name="student_fees",
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    balance_due = models.DecimalField(max_digits=10, decimal_places=0)

    class Meta:
        unique_together = ["tenant", "student", "fee_category"]

    def __str__(self):
        return f"{self.student} — {self.fee_category.name} : {self.balance_due} GNF"


class ReceiptSequence(TenantScopedModel):
    school_year = models.ForeignKey(
        "pedagogy.SchoolYear", on_delete=models.CASCADE, related_name="receipt_sequences"
    )
    last_seq = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "school_year"],
                name="uq_receipt_sequence_per_tenant_year",
            )
        ]


class Payment(TenantScopedModel):
    class Method(models.TextChoices):
        CASH = "CASH", "Espèces"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        COMPLETED = "COMPLETED", "Complété"
        FAILED = "FAILED", "Échoué"
        CANCELLED = "CANCELLED", "Annulé"

    student = models.ForeignKey(
        "pedagogy.Student", on_delete=models.PROTECT, related_name="payments",
    )
    student_fee = models.ForeignKey(
        StudentFee, on_delete=models.PROTECT, related_name="payments",
        null=True, blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=0,
                                 validators=[MinValueValidator(0)])
    payment_date = models.DateTimeField(auto_now_add=True)
    method = models.CharField(max_length=20, choices=Method.choices)
    reference = models.CharField(max_length=100, blank=True)
    idempotency_key = models.CharField(
        max_length=100, unique=True, db_index=True,
    )
    received_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    receipt_pdf_url = models.URLField(max_length=500, blank=True)
    sms_notification_sent = models.BooleanField(default=False)
    failure_reason = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "status", "payment_date"]),
        ]

    def __str__(self):
        return f"{self.receipt_number or '(sans reçu)'} — {self.amount} GNF ({self.get_status_display()})"
