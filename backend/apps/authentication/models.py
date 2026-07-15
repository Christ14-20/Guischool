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
    Rôle applicatif — 5 rôles fixes pour le MVP.
    Le rôle CUSTOM (constructeur de rôle) est prévu dans l'enum mais son usage
    réel est différé en V2.
    """

    class RoleName(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Administrateur"
        DIRECTOR = "DIRECTOR", "Directeur"
        STUDENT_STUDIES = "STUDENT_STUDIES", "Directeur des études / Scolarité"
        TEACHER = "TEACHER", "Enseignant"
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
