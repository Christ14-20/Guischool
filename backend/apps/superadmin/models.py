"""
apps/superadmin/models.py
Modèles multi-tenant : Plan, Tenant (École), Subscription.
"""
import uuid
from django.db import models
from django.utils.text import slugify


class Plan(models.Model):
    """Plan d'abonnement SaaS (Starter, Pro, Enterprise)."""
    PLAN_CHOICES = [
        ("STARTER", "Starter"),
        ("PRO", "Pro"),
        ("ENTERPRISE", "Enterprise"),
    ]
    name = models.CharField(max_length=50, unique=True, choices=PLAN_CHOICES)
    max_students = models.PositiveIntegerField(default=500)
    max_staff = models.PositiveIntegerField(default=50)
    modules_activated = models.JSONField(
        default=list,
        help_text="Liste des modules activés ex: ['pedagogy','finance']",
    )
    storage_max_gb = models.PositiveIntegerField(default=10, verbose_name="Stockage max (Go)")
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_annual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Plan"
        verbose_name_plural = "Plans"
        ordering = ["price_monthly"]

    def __str__(self):
        return self.get_name_display()


class Tenant(models.Model):
    """École / établissement scolaire (unité d'isolation multi-tenant)."""
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("TRIAL", "Essai"),
        ("SUSPENDED", "Suspendue"),
        ("CANCELLED", "Annulée"),
    ]
    TYPE_CHOICES = [
        ("PUBLIC", "Public"),
        ("PRIVE", "Privé"),
        ("COMMUNAUTAIRE", "Communautaire"),
        ("CONFESSIONNEL", "Confessionnel"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom de l'école")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    code_minedu = models.CharField(
        max_length=50, blank=True, unique=True, null=True,
        verbose_name="Code MEN (MINEDU)",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="PRIVE")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TRIAL")
    plan = models.ForeignKey(
        Plan, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="tenants", verbose_name="Plan d'abonnement",
    )
    settings = models.JSONField(
        default=dict, blank=True,
        help_text="Configuration spécifique à l'école (seuils, périodes, etc.)",
    )
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "École"
        verbose_name_plural = "Écoles"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_setting(self, key, default=None):
        """Accès sécurisé aux paramètres d'école."""
        return self.settings.get(key, default)

    # ── Actions métier ──────────────────────────────────────────────
    def suspend(self):
        self.status = "SUSPENDED"
        self.save(update_fields=["status", "updated_at"])

    def reactivate(self):
        self.status = "ACTIVE"
        self.save(update_fields=["status", "updated_at"])


class Subscription(models.Model):
    """Abonnement d'une école à un plan."""
    STATUS_CHOICES = [
        ("TRIAL", "Essai"),
        ("ACTIVE", "Active"),
        ("PAST_DUE", "En retard"),
        ("SUSPENDED", "Suspendue"),
        ("CANCELLED", "Annulée"),
    ]
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="subscriptions",
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name="subscriptions",
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TRIAL")
    last_payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tenant.name} — {self.plan.name} ({self.status})"
