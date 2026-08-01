"""
apps/authentication/models.py  — AUTH-01

Modèles User, Role, Permission.

Convention de nommage des codenames (décision A2, 2026-07-15) :
    Format : module:action[:scope]
    Exemples : "notes:create:evaluation", "attendance:create", "auth:login"
    Source de vérité : contrat d'API §1 GET /auth/permissions/me/
    ⚠ NE PAS utiliser la notation can_verb_resource — c'est l'ancienne convention.

Note A1 : /auth/register/ n'est PAS implémenté ici.
    La création de comptes Directeur/staff se fera via POST /superadmin/schools/
    dans le ticket TENANT-03 (Épic 2).
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import TimestampedModel


class Permission(TimestampedModel):
    """
    Permission atomique du système RBAC.

    Codename au format module:action[:scope] (décision A2).
    Exemples valides :
        auth:login, auth:logout, users:read:me
        notes:create:evaluation, attendance:create
        eleves:read, eleves:update:medical
    """

    codename = models.CharField(
        max_length=100,
        unique=True,
        help_text='Format : module:action[:scope]  ex : "notes:create:evaluation"',
    )
    name = models.CharField(max_length=150, blank=True)
    module = models.CharField(
        max_length=50,
        help_text="Module fonctionnel auquel appartient la permission.",
    )

    class Meta:
        ordering = ["module", "codename"]

    def __str__(self):
        return self.codename

    def save(self, *args, **kwargs):
        # Auto-dériver le module depuis le codename si non fourni
        if not self.module and ":" in self.codename:
            self.module = self.codename.split(":")[0]
        super().save(*args, **kwargs)


class Role(TimestampedModel):
    """
    Rôle applicatif — 6 rôles fixes pour le MVP (SUPER_ADMIN, DIRECTOR,
    STUDENT_STUDIES, TEACHER, ACCOUNTANT, PARENT).
    Le rôle CUSTOM (constructeur de rôle) est prévu dans l'enum mais son usage
    réel est différé en V2.
    """

    class RoleName(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Administrateur"
        DIRECTOR = "DIRECTOR", "Directeur"
        STUDENT_STUDIES = "STUDENT_STUDIES", "Directeur des études / Scolarité"
        TEACHER = "TEACHER", "Enseignant"
        ACCOUNTANT = "ACCOUNTANT", "Comptable"
        PARENT = "PARENT", "Parent d'élève"
        CUSTOM = "CUSTOM", "Personnalisé"

    name = models.CharField(
        max_length=30, choices=RoleName.choices, unique=True
    )
    label = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255, blank=True)
    permissions = models.ManyToManyField(
        Permission, related_name="roles", blank=True
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.get_name_display()


class User(AbstractUser):
    """
    Modèle utilisateur central du système.

    Notes importantes :
    - USERNAME_FIELD = "email" → l'email est l'identifiant de connexion.
    - tenant = null pour SUPER_ADMIN (utilisateur plateforme, hors tenant).
    - Un User PARENT ≠ un Guardian (modèle pédagogique défini en Épic 3).
      Le lien se fait via Guardian.user (FK nullable).
    - custom_permissions : codenames supplémentaires pour le rôle CUSTOM (V2).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    tenant = models.ForeignKey(
        "superadmin.Tenant",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        db_index=True,
        help_text="Null pour SUPER_ADMIN (pas rattaché à une école).",
    )

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)  # +224XXXXXXXXX

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,  # null durant le create_superuser initial avant que le rôle existe
        blank=True,
    )

    # Codenames supplémentaires accordés individuellement (rôle CUSTOM — V2)
    custom_permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste de codenames supplémentaires (format module:action[:scope]).",
    )

    # Vérifications
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    must_change_password = models.BooleanField(
        default=False,
        help_text="Forcé à True lors de la création par le Super Admin.",
    )

    # Données enseignant dénormalisées (à normaliser en V2 si besoin)
    subjects_taught = models.JSONField(
        default=list,
        blank=True,
        help_text='Codes matières enseignées — ex : ["MATH", "PC"]',
    )

    USERNAME_FIELD = "email"
    # username reste dans AbstractUser mais n'est plus l'identifiant de connexion
    REQUIRED_FIELDS = ["username"]

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "role"]),
        ]

    def __str__(self):
        return self.email

    def can(self, codename: str) -> bool:
        """
        Vérifie si l'utilisateur possède une permission par son codename.

        Ordre de vérification :
          1. Permissions du rôle (M2M Role.permissions)
          2. Permissions individuelles custom_permissions (JSON)

        Usage :
            if request.user.can("notes:create:evaluation"):
                ...
        """
        if not self.role_id:
            return False

        # 1. Permissions du rôle (requête DB mise en cache par le prefetch)
        if self.role.permissions.filter(codename=codename).exists():
            return True

        # 2. Permissions individuelles (liste JSON, pas de requête DB)
        return codename in (self.custom_permissions or [])


class StaffProfile(TimestampedModel):
    """
    STAFF-V2-01 — Fiche RH enrichie du personnel, distincte de `User`.

    Décision PO (2026-08-01) : modèle séparé plutôt que des champs
    directement sur `User`. `User` est la base commune de 6 types de
    comptes (SUPER_ADMIN, DIRECTOR, STUDENT_STUDIES, TEACHER, ACCOUNTANT,
    PARENT) — des champs RH comme `numero_cnss`/`type_contrat`/
    `numero_compte_paie` n'ont de sens que pour le personnel, jamais pour un
    PARENT ou un SUPER_ADMIN. Contrairement à `Student` (précédent le plus
    proche dans ce repo, modèle "gras" avec `date_naissance`/`sexe`/`statut`
    directement dessus), `Student` ne représente qu'un seul type d'entité :
    l'analogie s'arrête là.

    `TimestampedModel`, pas `TenantScopedModel` : `StaffProfile` n'est
    jamais interrogé directement par son propre endpoint (toujours via
    `user.staff_profile`, dans un `StaffViewSet` déjà filtré sur
    `user.tenant`) — un FK `tenant` séparé serait redondant et pourrait
    diverger de `user.tenant` sans bénéfice.

    Créé uniquement pour les comptes gérés par `StaffViewSet`
    (TEACHER/STUDENT_STUDIES/ACCOUNTANT — `StaffViewSet` exclut déjà
    DIRECTOR/SUPER_ADMIN de son queryset), jamais pour DIRECTOR/SUPER_ADMIN/
    PARENT.

    `statut` (métadonnée RH) et `User.is_active` (contrôle d'accès binaire)
    sont VOLONTAIREMENT indépendants (décision PO explicite) : aucune
    transition de `statut` n'a d'effet automatique sur `is_active`, et
    inversement. L'accès reste exclusivement piloté par
    `StaffViewSet.disable`/`enable`, comme avant ce ticket — évite toute
    cascade surprenante (ex. repasser un `PARTI` à `ACTIF` ne réactive
    jamais l'accès tout seul).
    """

    class Sexe(models.TextChoices):
        M = "M", "Masculin"
        F = "F", "Féminin"

    class ContractType(models.TextChoices):
        CDI = "CDI", "CDI"
        CDD = "CDD", "CDD"
        VACATAIRE = "VACATAIRE", "Vacataire"
        STAGE = "STAGE", "Stage"

    class PayrollAccountType(models.TextChoices):
        BANQUE = "BANQUE", "Compte bancaire"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
        ESPECES = "ESPECES", "Espèces"

    class Status(models.TextChoices):
        ACTIF = "ACTIF", "Actif"
        EN_CONGE = "EN_CONGE", "En congé"
        SUSPENDU = "SUSPENDU", "Suspendu"
        PARTI = "PARTI", "Parti"

    class Grade(models.TextChoices):
        """STAFF-V2-04 — échelle guinéenne, pertinent pour TEACHER uniquement."""
        INSTITUTEUR_ADJOINT = "INSTITUTEUR_ADJOINT", "Instituteur adjoint"
        INSTITUTEUR = "INSTITUTEUR", "Instituteur"
        PROFESSEUR_ADJOINT = "PROFESSEUR_ADJOINT", "Professeur adjoint d'enseignement secondaire"
        PROFESSEUR_ENS_SECONDAIRE = "PROFESSEUR_ENS_SECONDAIRE", "Professeur d'enseignement secondaire"
        PROFESSEUR_CERTIFIE = "PROFESSEUR_CERTIFIE", "Professeur certifié"

    class EmploymentStatus(models.TextChoices):
        """
        STAFF-V2-04 — statut dans la fonction publique/enseignement (décision
        PO : axe distinct de `type_contrat`, qui reste une typologie
        contractuelle générique — un compte peut être CDI + TITULAIRE).
        """
        TITULAIRE = "TITULAIRE", "Titulaire"
        CONTRACTUEL = "CONTRACTUEL", "Contractuel"
        VACATAIRE = "VACATAIRE", "Vacataire"

    user = models.OneToOneField(
        "authentication.User", on_delete=models.CASCADE, related_name="staff_profile"
    )

    date_naissance = models.DateField(null=True, blank=True)
    sexe = models.CharField(max_length=1, choices=Sexe.choices, blank=True)
    date_embauche = models.DateField(null=True, blank=True)
    type_contrat = models.CharField(max_length=10, choices=ContractType.choices, blank=True)
    numero_cnss = models.CharField(max_length=50, blank=True)
    type_compte_paie = models.CharField(max_length=15, choices=PayrollAccountType.choices, blank=True)
    numero_compte_paie = models.CharField(max_length=50, blank=True)
    statut = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIF, db_index=True
    )
    grade = models.CharField(max_length=30, choices=Grade.choices, blank=True)
    statut_emploi = models.CharField(max_length=15, choices=EmploymentStatus.choices, blank=True)
    access_start_date = models.DateField(
        null=True, blank=True,
        help_text="STAFF-V2-04 : compte inaccessible avant cette date (mécanisme GUEST_TEACHER, vérifié au login).",
    )
    access_end_date = models.DateField(
        null=True, blank=True,
        help_text="STAFF-V2-04 : compte inaccessible après cette date (mécanisme GUEST_TEACHER, vérifié au login).",
    )

    def __str__(self):
        return f"Profil RH — {self.user.email}"
