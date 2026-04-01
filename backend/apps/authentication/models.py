"""
apps/authentication/models.py
Modèles : Permission (RBAC), Role, User (AbstractUser étendu)
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class Permission(models.Model):
    """Permission granulaire identifiée par un codename (ex: 'can_create_student')."""
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["codename"]
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"

    def __str__(self):
        return f"{self.codename} — {self.name}"


class Role(models.Model):
    """Rôle prédéfini regroupant un ensemble de permissions."""
    ROLE_CHOICES = [
        ("SUPER_ADMIN", "Super Administrateur"),
        ("ADMIN_SCHOOL", "Administrateur École"),
        ("SECRETAIRE", "Secrétaire"),
        ("ENSEIGNANT", "Enseignant"),
        ("PARENT", "Parent"),
        ("CUSTOM", "Personnalisé"),
    ]
    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(
        Permission, blank=True, related_name="roles", verbose_name="Permissions"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Rôle"
        verbose_name_plural = "Rôles"

    def __str__(self):
        return self.get_name_display()

    def has_permission(self, codename: str) -> bool:
        return self.permissions.filter(codename=codename).exists()


class User(AbstractUser):
    """
    Utilisateur étendu d'Eduguinée.
    - email est utilisé comme identifiant principal (USERNAME_FIELD)
    - tenant : école à laquelle appartient l'utilisateur
    - role : rôle RBAC prédéfini
    - custom_permissions : permissions granulaires additionnelles (mode CUSTOM)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, blank=True, unique=False)  # non utilisé
    email = models.EmailField(unique=True, verbose_name="Adresse e-mail")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")

    # Rattachement multi-tenant (null pour les Super Admins)
    tenant = models.ForeignKey(
        "superadmin.Tenant",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        verbose_name="École",
    )
    role = models.ForeignKey(
        Role,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        verbose_name="Rôle",
    )
    custom_permissions = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Permissions personnalisées",
        help_text="Liste de codenames actifs quand le rôle est 'CUSTOM'.",
    )
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    # ── Helpers RBAC ───────────────────────────────────────────────
    def can(self, codename: str) -> bool:
        """Vérifie si l'utilisateur possède la permission 'codename'."""
        if not self.is_active:
            return False
        if self.is_superuser:
            return True
        if self.role:
            if self.role.name == "SUPER_ADMIN":
                return True
            if self.role.has_permission(codename):
                return True
        # Permissions personnalisées (rôle CUSTOM)
        return codename in (self.custom_permissions or [])

    def get_role_name(self) -> str:
        return self.role.name if self.role else ""
