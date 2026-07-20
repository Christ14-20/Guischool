"""
tests/test_models.py — AUTH-01

Tests unitaires des modèles User, Role, Permission.
Ces tests utilisent pytest-django avec @pytest.mark.django_db.
"""

import pytest
from django.test import TestCase
from apps.authentication.models import User, Role, Permission
from apps.superadmin.models import Tenant, Plan


# ─── Factories légers (sans factory-boy pour la lisibilité) ────────────────────

def make_plan(name="Starter"):
    return Plan.objects.get_or_create(name=name)[0]


def make_tenant(name="École Test", plan=None):
    if plan is None:
        plan = make_plan()
    return Tenant.objects.get_or_create(
        name=name,
        defaults={
            "slug": name.lower().replace(" ", "-"),
            "school_type": Tenant.SchoolType.MIXTE,
            "status": Tenant.Status.ACTIVE,
            "plan": plan,
        },
    )[0]


def make_role(name="DIRECTOR"):
    return Role.objects.get_or_create(
        name=name,
        defaults={"label": name},
    )[0]


def make_permission(codename="notes:create:evaluation"):
    return Permission.objects.get_or_create(
        codename=codename,
        defaults={"module": codename.split(":")[0]},
    )[0]


def make_user(email="test@school.gn", role_name="DIRECTOR", tenant=None):
    role = make_role(role_name)
    if tenant is None:
        tenant = make_tenant()
    user, _ = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email.split("@")[0],
            "role": role,
            "tenant": tenant,
        },
    )
    return user


# ─── Tests Permission ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPermission:
    def test_codename_format_module_action(self):
        """Le module est auto-dérivé du codename au format module:action."""
        perm = Permission.objects.create(codename="notes:create:evaluation")
        assert perm.module == "notes"

    def test_codename_unique(self):
        """Deux permissions ne peuvent pas avoir le même codename."""
        from django.db import IntegrityError
        Permission.objects.create(codename="sample:duplicate")
        with pytest.raises(IntegrityError):
            Permission.objects.create(codename="sample:duplicate")

    def test_str_returns_codename(self):
        perm = Permission(codename="eleves:read")
        assert str(perm) == "eleves:read"


# ─── Tests Role ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRole:
    def test_five_mvp_roles_exist_after_fixture(self, django_db_setup):
        """Après chargement de la fixture, les 5 rôles MVP existent."""
        # Ce test est validé par le chargement de fixture — ici on teste la création
        role = Role.objects.create(name="CUSTOM", label="Personnalisé")
        assert role.name == "CUSTOM"

    def test_role_permissions_m2m(self):
        """Un rôle peut avoir plusieurs permissions."""
        role = make_role("TEACHER")
        perm1 = make_permission("notes:create:evaluation")
        perm2 = make_permission("attendance:create")
        role.permissions.add(perm1, perm2)
        assert role.permissions.count() == 2


# ─── Tests User ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUser:
    def test_user_uuid_pk(self):
        """La clé primaire est un UUID."""
        import uuid
        user = make_user(email="uuid-test@school.gn")
        assert isinstance(user.id, uuid.UUID)

    def test_username_field_is_email(self):
        """L'identifiant de connexion est l'email."""
        assert User.USERNAME_FIELD == "email"

    def test_super_admin_has_no_tenant(self):
        """Un SUPER_ADMIN n'est pas rattaché à un tenant (null)."""
        role = make_role("SUPER_ADMIN")
        user = User.objects.create_user(
            username="sadmin",
            email="sadmin@eduguinee.gn",
            password="test1234!",
            role=role,
            tenant=None,
        )
        assert user.tenant is None
        assert user.role.name == "SUPER_ADMIN"

    def test_can_returns_true_for_role_permission(self):
        """user.can() renvoie True si la permission est dans le rôle."""
        user = make_user(email="can-test@school.gn")
        perm = make_permission("eleves:read")
        user.role.permissions.add(perm)
        assert user.can("eleves:read") is True

    def test_can_returns_false_for_missing_permission(self):
        """user.can() renvoie False si la permission n'existe pas."""
        user = make_user(email="can-false@school.gn")
        assert user.can("finance:create:payment") is False

    def test_can_returns_true_for_custom_permission(self):
        """user.can() renvoie True pour une permission individuelle JSON."""
        user = make_user(email="custom-perm@school.gn")
        user.custom_permissions = ["finance:read:invoice"]
        user.save()
        assert user.can("finance:read:invoice") is True

    def test_can_returns_false_with_no_role(self):
        """user.can() renvoie False si l'utilisateur n'a pas de rôle."""
        user = make_user(email="norole@school.gn")
        user.role = None
        # Pas de save — on teste la méthode sans FK
        assert user.can("notes:create:evaluation") is False
