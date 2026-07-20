"""
apps/superadmin/services/tenant_service.py — TENANT-03

Service métier pour la création et la gestion des établissements (schools/tenants).
Gère le workflow complet de création de tenant + compte Directeur.
"""

import secrets
import string
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from apps.authentication.models import User, Role
from apps.superadmin.models import Tenant, Plan
from apps.monitoring.services import audit_log
from apps.pedagogy.services.school_year_service import seed_standard_levels_for_tenant


def generate_unique_slug(name: str) -> str:
    """Génère un slug unique à partir du nom de l'école."""
    base_slug = slugify(name)
    if not base_slug:
        base_slug = "ecole"

    slug = base_slug
    counter = 1
    while Tenant.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def generate_temporary_password(length: int = 12) -> str:
    """Génère un mot de passe temporaire robuste et sécurisé."""
    # S'assure d'avoir au moins une majuscule, une minuscule, un chiffre et un caractère spécial
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "$%@#!=+-"
    all_chars = uppercase + lowercase + digits + special

    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    password += [secrets.choice(all_chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


def create_school(data: dict, ip_address: str = "") -> tuple[Tenant, str]:
    """
    Workflow complet de création d'une école (Tenant) + compte Directeur.
    Retourne un tuple (tenant, temporary_password).

    Règles métier :
    - Génération automatique du slug.
    - Plan par défaut ou plan spécifié (vérifié actif).
    - Essai par défaut (TRIAL) pendant 30 jours.
    - Création du Directeur avec must_change_password=True.
    - Transaction atomique complète.
    """
    name = data.get("name")
    school_type = data.get("school_type")
    code_minedu = data.get("code_minedu")
    contact_name = data.get("contact_name")
    contact_phone = data.get("contact_phone")
    contact_email = data.get("contact_email")
    plan_id = data.get("plan_id")

    # 1. Validations métier
    if Tenant.objects.filter(name__iexact=name).exists():
        raise ValidationError({"name": ["Un établissement avec ce nom existe déjà."]})

    if Tenant.objects.filter(contact_email__iexact=contact_email).exists():
        raise ValidationError({"contact_email": ["Cette adresse email est déjà utilisée par un autre établissement."]})

    if User.objects.filter(email__iexact=contact_email).exists():
        raise ValidationError({"contact_email": ["Cette adresse email est déjà utilisée."]})

    # Récupération du Plan
    try:
        plan = Plan.objects.get(id=plan_id)
    except (Plan.DoesNotExist, ValueError):
        raise ValidationError({"plan_id": ["Le plan sélectionné est introuvable."]})

    if not plan.is_active:
        raise ValidationError({"plan_id": ["Le plan sélectionné n'est pas actif."]})

    # Génération du slug unique
    slug = generate_unique_slug(name)

    # Découpage du nom de contact pour First/Last name
    contact_parts = contact_name.strip().split(" ", 1)
    first_name = contact_parts[0]
    last_name = contact_parts[1] if len(contact_parts) > 1 else ""

    # Génération du mot de passe temporaire
    temp_pass = generate_temporary_password()

    with transaction.atomic():
        # 2. Création du Tenant
        trial_ends_at = timezone.now() + timedelta(days=30)
        tenant = Tenant.objects.create(
            name=name,
            slug=slug,
            school_type=school_type,
            code_minedu=code_minedu,
            contact_name=contact_name,
            contact_phone=contact_phone,
            contact_email=contact_email,
            region=data.get("region", ""),
            prefecture=data.get("prefecture", ""),
            commune=data.get("commune", ""),
            quartier=data.get("quartier", ""),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            logo=data.get("logo", ""),
            plan=plan,
            status=Tenant.Status.TRIAL,
            trial_ends_at=trial_ends_at,
        )

        # 3. Récupération du rôle DIRECTOR
        director_role, _ = Role.objects.get_or_create(
            name="DIRECTOR",
            defaults={
                "label": "Directeur",
                "description": "Compte de direction de l'établissement",
            },
        )

        # 4. Création de l'utilisateur Directeur
        User.objects.create_user(
            username=contact_email,
            email=contact_email,
            password=temp_pass,
            first_name=first_name,
            last_name=last_name,
            phone=contact_phone,
            role=director_role,
            tenant=tenant,
            must_change_password=True,
        )

        # 5. Seed des niveaux standards guinéens (STRUCT-02)
        seed_standard_levels_for_tenant(tenant)

        # 6. Audit Log
        audit_log(
            user=None,  # Créé par le système (ou l'admin en session, loggé via le viewset)
            tenant=tenant,
            action="tenant:create",
            ip_address=ip_address,
        )

    return tenant, temp_pass
