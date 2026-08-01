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
        # SUPERADMIN-V2-01 : SUSPENDED remplacé par deux valeurs distinctes
        # (décision PO 2026-07-30) — énumération auto-cohérente plutôt qu'un
        # champ suspension_type séparé qui pourrait diverger de status.
        SUSPENDED_SOFT = "SUSPENDED_SOFT", "Suspendue (lecture seule)"
        SUSPENDED_HARD = "SUSPENDED_HARD", "Suspendue (blocage total)"
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

    # SUPERADMIN-V2-05 — correctif trouvé en marge (facturation rétroactive
    # après CANCELLED -> réactivation) : date à partir de laquelle le cycle
    # de facturation en cours est valide. Reposée à aujourd'hui par
    # TenantViewSet.suspend/reactivate chaque fois que le statut PRÉCÉDENT
    # était TRIAL ou CANCELLED (rentrée en éligibilité) — jamais lors d'une
    # transition entre deux statuts déjà éligibles (ex. ACTIVE -> SUSPENDED).
    # `PlatformInvoice` dont `period_end` précède cette date ne doit jamais
    # servir d'ancre pour la prochaine facture (apps.superadmin.services.
    # platform_invoice_service.get_next_billing_date) : sinon la prochaine
    # génération couvrirait rétroactivement la période où le tenant était
    # TRIAL/CANCELLED, donc ne payait rien et n'utilisait pas le service —
    # même principe que la décision PO sur TRIAL, étendu à CANCELLED.
    billing_cycle_start = models.DateField(null=True, blank=True)

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

        Point d'entrée unique : ne jamais calculer student_count
        ailleurs que dans cette méthode (liste, détail, dashboard, limite plan).
        """
        from apps.pedagogy.models import Student

        return Student.objects.filter(
            tenant=self, statut=Student.Status.ACTIF
        ).count()

    def get_staff_count(self) -> int:
        """
        Retourne le nombre d'utilisateurs staff (hors SUPER_ADMIN) de ce tenant.
        Calculé dès maintenant (User existe depuis Épic 1).
        """
        return self.users.exclude(role__name="SUPER_ADMIN").count()


class PlatformInvoiceSequence(models.Model):
    """
    SUPERADMIN-V2-05 — compteur de numérotation des factures plateforme
    (école → Eduguinée), séquence GLOBALE par année (pas par tenant, décision
    PO 2026-07-31) : Eduguinée est l'émetteur unique facturant plusieurs
    écoles, contrairement à `apps.finance.ReceiptSequence` où chaque école
    est sa propre entité émettant des reçus à ses parents. Même mécanisme de
    verrouillage que `generate_receipt_for_payment`
    (`select_for_update().get_or_create()`), simplement scopée par année
    plutôt que par (tenant, année scolaire).
    """

    year = models.PositiveIntegerField(unique=True)
    last_seq = models.PositiveIntegerField(default=0)


class PlatformInvoice(TimestampedModel):
    """
    SUPERADMIN-V2-05 — Facture d'abonnement SaaS (école → Eduguinée).

    À NE JAMAIS CONFONDRE avec `apps.finance.Invoice` (école → parents,
    Épic 7) : modèle distinct, périmètre distinct. `TimestampedModel` (comme
    `Tenant`/`Plan`) et non `TenantScopedModel` : entité globale consultée
    uniquement par le Super Admin cross-tenant, jamais filtrée par le
    middleware tenant.

    `amount`/`plan_name` sont des INSTANTANÉS au moment de l'émission (copiés
    depuis `Plan.price_monthly`/`Plan.name`) — décision PO explicite,
    contraire à `Tenant.plan` qui reste une référence live (SUPERADMIN-V2-03) :
    une facture déjà émise ne doit jamais changer de valeur si le Plan ou le
    tenant change ensuite.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PAID = "PAID", "Payé"
        # SUPERADMIN-V2-04 : assignée par platform_invoice_service.
        # mark_overdue_invoices (PENDING dont due_date est dépassée),
        # posée sans transition par SUPERADMIN-V2-05.
        OVERDUE = "OVERDUE", "En retard"

    class ReminderStage(models.TextChoices):
        """
        SUPERADMIN-V2-04 — garde anti-doublon de relance/escalade : dernier
        palier déjà notifié pour CETTE facture (pas le tenant — voir
        `last_reminder_stage` ci-dessous). Paliers strictement ordonnés par
        ancienneté de `due_date` dépassée (jours de retard) ; seul le palier
        le plus élevé atteint est conservé, jamais une liste cumulative.
        """
        OVERDUE = "OVERDUE", "Retard initial (J+1)"
        D7 = "D7", "Relance J+7"
        D15 = "D15", "Suspension lecture seule J+15"
        D30 = "D30", "Suspension totale J+30"

    tenant = models.ForeignKey(
        "superadmin.Tenant", on_delete=models.PROTECT, related_name="platform_invoices"
    )
    invoice_number = models.CharField(max_length=30, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    plan_name = models.CharField(max_length=50)
    period_start = models.DateField()
    period_end = models.DateField()
    issued_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True,
    )
    # SUPERADMIN-V2-04 — vit sur LA FACTURE (pas sur Tenant) : si la plus
    # ancienne facture impayée est payée, la facture suivante devient
    # l'ancre d'escalade et repart de zéro sur son propre due_date (décision
    # PO explicite) — payer l'arriéré le plus ancien réduit réellement la
    # sévérité, il est logique que l'horloge reparte sur la nouvelle plus
    # ancienne facture impayée.
    last_reminder_stage = models.CharField(
        max_length=10, choices=ReminderStage.choices, blank=True, default=""
    )

    class Meta:
        indexes = [models.Index(fields=["tenant", "status"])]
        ordering = ["-period_start"]

    def __str__(self):
        return f"{self.invoice_number} — {self.tenant.name} ({self.get_status_display()})"
