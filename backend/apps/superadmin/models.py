"""
apps/superadmin/models.py — TENANT-01 / TENANT-02

Modèles Tenant et Plan — source de vérité multi-tenant.

§1.1 Tenant : établissement scolaire (une école = un tenant).
§1.2 Plan   : abonnement SaaS (Starter / Pro en V1).

Décisions d'architecture :
- Tenant.get_student_count() est l'unique point d'accès au comptage d'élèves.
  Retourne 0 jusqu'à l'Épic 4 (modèle Student inexistant). À brancher en Épic 4.
- Meta.indexes sur status ajouté conformément au schéma §1.1, même s'il est
  redondant avec db_index=True (tracé ici pour respecter le schéma au champ près).
"""

from django.db import models
from core.models import TimestampedModel


class Plan(TimestampedModel):
    """
    §1.2 — Abonnement SaaS.
    Stub minimal en Épic 1 (seul `name`). Complété ici avec tous les champs §1.2.
    Migration additive : les lignes existantes ne sont pas recréées.
    """

    name = models.CharField(max_length=50, unique=True)
    max_students = models.PositiveIntegerField(default=0)
    max_staff = models.PositiveIntegerField(default=0)
    price_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, default="0.00"
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Tenant(TimestampedModel):
    """
    §1.1 — Établissement scolaire (1 école = 1 tenant = 1 espace isolé).

    Note V1 : 1 campus = 1 tenant. Le multi-campus (hors-MVP) s'ajoutera
    via un modèle Campus avec FK sur Tenant sans casser ce schéma.
    """

    class Status(models.TextChoices):
        TRIAL = "TRIAL", "Essai"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspendue"
        CANCELLED = "CANCELLED", "Résiliée"

    class SchoolType(models.TextChoices):
        PRIMAIRE = "PRIMAIRE", "Primaire"
        COLLEGE = "COLLEGE", "Collège"
        LYCEE = "LYCEE", "Lycée"
        MIXTE = "MIXTE", "Mixte"

    # ── Identité ──────────────────────────────────────────────────────────────
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    code_minedu = models.CharField(
        max_length=50, unique=True, null=True, blank=True
    )  # ex. GN-CKY-00123
    school_type = models.CharField(max_length=20, choices=SchoolType.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TRIAL,
        db_index=True,  # index simple sur le champ
    )
    plan = models.ForeignKey(
        "superadmin.Plan", on_delete=models.PROTECT, related_name="tenants"
    )

    # ── Contact principal ─────────────────────────────────────────────────────
    contact_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)   # validé +224XXXXXXXXX au serializer
    contact_email = models.EmailField(unique=True)

    # ── Localisation ─────────────────────────────────────────────────────────
    region = models.CharField(max_length=100, blank=True)
    prefecture = models.CharField(max_length=100, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    quartier = models.CharField(max_length=150, blank=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    # ── Configuration ─────────────────────────────────────────────────────────
    logo = models.URLField(blank=True)
    settings = models.JSONField(default=dict, blank=True)   # configuration libre (V2)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # Conforme §1.1 — redondant avec db_index=True sur le champ status,
        # mais ajouté tel quel pour respecter le schéma au champ près.
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"{self.name} ({self.status})"

    # ── Méthodes métier ───────────────────────────────────────────────────────

    def get_student_count(self) -> int:
        """
        Retourne le nombre d'élèves actifs de cet établissement.

        ÉPIC 2 : retourne 0 — le modèle Student n'existe pas encore.
        ÉPIC 4 : remplacer par :
            from apps.pedagogy.models import Student
            return Student.objects.filter(
                tenant=self, status=Student.Status.ACTIF
            ).count()

        Point d'entrée unique : ne jamais calculer student_count
        ailleurs que dans cette méthode (liste, détail, dashboard).
        """
        # TODO Épic 4 : brancher le vrai calcul Student
        return 0

    def get_staff_count(self) -> int:
        """
        Retourne le nombre d'utilisateurs staff (hors SUPER_ADMIN) de ce tenant.
        Calculé dès maintenant (User existe depuis Épic 1).
        """
        return self.users.exclude(role__name="SUPER_ADMIN").count()
