"""
apps/finance/models.py
Modèles : FeeCategory, StudentFee, Payment, Invoice
"""
import uuid
from django.db import models


class FeeCategory(models.Model):
    TYPE_CHOICES = [
        ("TUITION", "Scolarité"),
        ("REGISTRATION", "Inscription"),
        ("CANTEEN", "Cantine"),
        ("TRANSPORT", "Transport"),
        ("UNIFORM", "Uniforme"),
        ("SUPPLIES", "Fournitures"),
        ("TRIP", "Sortie scolaire"),
        ("OTHER", "Autre"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="fee_categories")
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    installments = models.JSONField(
        default=list, blank=True,
        help_text="Échéancier ex: [{date: ..., amount: ...}]",
    )
    is_mandatory = models.BooleanField(default=True)
    school_year = models.ForeignKey(
        "pedagogy.SchoolYear", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="fee_categories",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Catégorie de frais"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()}) — {self.amount} GNF"


class StudentFee(models.Model):
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="student_fees")
    student = models.ForeignKey("pedagogy.Student", on_delete=models.CASCADE, related_name="fees")
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.PROTECT, related_name="student_fees")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_reason = models.TextField(blank=True)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [("tenant", "student", "fee_category")]
        verbose_name = "Frais élève"

    def __str__(self):
        return f"{self.student} — {self.fee_category.name} (solde: {self.balance_due} GNF)"


class Payment(models.Model):
    METHOD_CHOICES = [
        ("CASH", "Espèces"),
        ("ORANGE_MONEY", "Orange Money"),
        ("MTN_MONEY", "MTN MoMo"),
        ("WAVE", "Wave"),
        ("BANK_TRANSFER", "Virement bancaire"),
        ("CHECK", "Chèque"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "En attente"),
        ("COMPLETED", "Complété"),
        ("FAILED", "Échoué"),
        ("CANCELLED", "Annulé"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="payments")
    student = models.ForeignKey("pedagogy.Student", on_delete=models.CASCADE, related_name="payments")
    student_fee = models.ForeignKey(
        StudentFee, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    reference = models.CharField(max_length=100, blank=True, help_text="Référence transaction externe")
    received_by = models.ForeignKey("authentication.User", on_delete=models.PROTECT, related_name="payments_received")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="COMPLETED")
    receipt_number = models.CharField(max_length=50, unique=True)
    receipt_url = models.URLField(blank=True)
    sms_notification_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Paiement"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"Paiement {self.receipt_number} — {self.amount} GNF ({self.get_method_display()})"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "En attente"),
        ("PAID", "Payée"),
        ("OVERDUE", "En retard"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="invoices")
    student = models.ForeignKey("pedagogy.Student", on_delete=models.CASCADE, related_name="invoices")
    school_year = models.ForeignKey("pedagogy.SchoolYear", on_delete=models.PROTECT, related_name="invoices")
    total_due = models.DecimalField(max_digits=12, decimal_places=2)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    pdf_url = models.URLField(blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("tenant", "student", "school_year")]
        verbose_name = "Facture"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Facture — {self.student} ({self.school_year.label}) — {self.status}"
