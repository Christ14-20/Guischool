"""
apps/superadmin/models.py
Modèles multi-tenant : Plan, Tenant (École), Subscription, Campus.
"""
import uuid
from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator


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


class Campus(models.Model):
    """
    Campus géographique d'une école (multi-campus).
    Un tenant peut avoir plusieurs campus (ex: Campus Centre, Campus Nord).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "Tenant",
        on_delete=models.CASCADE,
        related_name="campuses",
        verbose_name="École",
    )
    name = models.CharField(max_length=200, verbose_name="Nom du campus")
    address = models.TextField(blank=True, verbose_name="Adresse complète")
    city = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    prefecture = models.CharField(max_length=100, blank=True, verbose_name="Préfecture")

    # Coordonnées GPS
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        verbose_name="Longitude",
    )

    # Niveaux éducatifs activés sur ce campus (liste de cycles : PRIMAIRE, COLLEGE, LYCEE...)
    active_levels = models.JSONField(
        default=list,
        blank=True,
        help_text="Cycles actifs sur ce campus ex: ['PRIMAIRE', 'COLLEGE']",
        verbose_name="Niveaux activés",
    )

    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")
    is_main = models.BooleanField(
        default=False,
        verbose_name="Campus principal",
        help_text="Le campus principal est le siège de l'établissement.",
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Campus"
        verbose_name_plural = "Campus"
        ordering = ["-is_main", "name"]
        unique_together = [("tenant", "name")]

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

    def save(self, *args, **kwargs):
        # Garantir un seul campus principal par tenant
        if self.is_main:
            Campus.objects.filter(tenant=self.tenant, is_main=True).exclude(pk=self.pk).update(is_main=False)
        super().save(*args, **kwargs)


class TenantNetwork(models.Model):
    """Réseau d'écoles / chaînes d'établissement."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom du réseau")
    description = models.TextField(blank=True, verbose_name="Description")
    admin_network = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_networks",
        verbose_name="Administrateur du réseau",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Réseau d'écoles"
        verbose_name_plural = "Réseaux d'écoles"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Tenant(models.Model):
    """École / établissement scolaire (unité d'isolation multi-tenant)."""
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("TRIAL", "Essai"),
        ("SUSPENDED", "Suspendue"),
        ("CANCELLED", "Annulée"),
    ]
    TYPE_CHOICES = [
        ("PRIMAIRE", "Primaire"),
        ("COLLEGE", "Collège"),
        ("LYCEE", "Lycée"),
        ("MIXTE", "Mixte"),
    ]
    EDUCATION_SYSTEM_CHOICES = [
        ("GUINEEN", "Guinéen"),
        ("FRANCO_ARABE", "Franco-arabe"),
        ("IB", "IB"),
        ("MIXTE", "Mixte"),
    ]
    DATE_FORMAT_CHOICES = [
        ("DD/MM/YYYY", "JJ/MM/AAAA"),
        ("MM/DD/YYYY", "MM/JJ/AAAA"),
        ("YYYY-MM-DD", "AAAA-MM-JJ"),
    ]
    FIRST_DAY_WEEK_CHOICES = [
        (0, "Dimanche"),
        (1, "Lundi"),
    ]
    LANG_CHOICES = [
        ("fr", "Français"),
        ("en", "English"),
        ("ar", "Arabe"),
    ]
    CURRENCY_CHOICES = [
        ("GNF", "Franc guinéen"),
        ("USD", "Dollar US"),
        ("EUR", "Euro"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nom de l'école")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(
        upload_to="tenants/logos/", null=True, blank=True, verbose_name="Logo",
    )
    code_minedu = models.CharField(
        max_length=50, blank=True, unique=True, null=True,
        verbose_name="Code MEN (MINEDU)",
    )
    nif = models.CharField(max_length=50, blank=True, verbose_name="NIF")
    registre_commerce = models.CharField(
        max_length=100, blank=True, verbose_name="Registre de commerce",
    )
    timezone = models.CharField(
        max_length=64, default="Africa/Conakry", verbose_name="Fuseau horaire",
    )
    date_format = models.CharField(
        max_length=20, choices=DATE_FORMAT_CHOICES, default="DD/MM/YYYY",
        verbose_name="Format de date",
    )
    first_day_week = models.PositiveSmallIntegerField(
        choices=FIRST_DAY_WEEK_CHOICES, default=1, verbose_name="Premier jour de la semaine",
    )
    default_lang = models.CharField(
        max_length=5, choices=LANG_CHOICES, default="fr", verbose_name="Langue par défaut",
    )
    default_currency = models.CharField(
        max_length=3, choices=CURRENCY_CHOICES, default="GNF", verbose_name="Devise par défaut",
    )
    education_system = models.CharField(
        max_length=20, choices=EDUCATION_SYSTEM_CHOICES, default="GUINEEN",
        verbose_name="Système éducatif",
    )
    active_levels = models.JSONField(
        default=list, blank=True,
        help_text="Cycles actifs ex: ['PRIMAIRE', 'COLLEGE']",
        verbose_name="Niveaux actifs",
    )
    exams_prepared = models.JSONField(
        default=list, blank=True,
        help_text="Examens préparés ex: ['CEP', 'BEPC', 'BAC']",
        verbose_name="Examens préparés",
    )
    has_internat = models.BooleanField(default=False, verbose_name="Internat")
    has_transport = models.BooleanField(default=False, verbose_name="Transport")
    has_cantine = models.BooleanField(default=False, verbose_name="Cantine")
    has_bibliotheque = models.BooleanField(default=False, verbose_name="Bibliothèque")
    has_labo = models.BooleanField(default=False, verbose_name="Laboratoire")
    has_official_exams = models.BooleanField(default=False, verbose_name="Examens officiels")
    has_payroll = models.BooleanField(default=False, verbose_name="Paie")
    has_whatsapp = models.BooleanField(default=False, verbose_name="WhatsApp")
    has_offline_advanced = models.BooleanField(default=False, verbose_name="Offline avancé")
    has_predictive_analytics = models.BooleanField(
        default=False, verbose_name="Analytique prédictive",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="PRIVE")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TRIAL")
    plan = models.ForeignKey(
        Plan, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="tenants", verbose_name="Plan d'abonnement",
    )
    network = models.ForeignKey(
        TenantNetwork, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="tenants", verbose_name="Réseau d'écoles",
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
