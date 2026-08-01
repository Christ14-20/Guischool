"""
apps/authentication/services/staff_service.py — STAFF-MVP-01

Service métier pour la création et la gestion des comptes du personnel.
Réutilise generate_temporary_password() de tenant_service.py.

Rôles créables : TEACHER, STUDENT_STUDIES (DIRECTOR via Super Admin seulement).
DIRECTOR n'est pas créable via ce service (réservé à TENANT-03).
"""

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.authentication.models import User, Role, StaffProfile
from apps.superadmin.services.tenant_service import generate_temporary_password
from apps.monitoring.services import audit_log


ALLOWED_CREATE_ROLES = ("TEACHER", "STUDENT_STUDIES", "ACCOUNTANT")


def create_staff_account(
    *,
    tenant,
    created_by,
    email: str,
    first_name: str,
    last_name: str,
    role_name: str,
    phone: str = "",
    subjects_taught: list | None = None,
    ip_address: str = "",
    date_naissance=None,
    sexe: str = "",
    date_embauche=None,
    type_contrat: str = "",
    numero_cnss: str = "",
    type_compte_paie: str = "",
    numero_compte_paie: str = "",
) -> tuple[User, str]:
    """
    Crée un compte personnel (TEACHER ou STUDENT_STUDIES) dans un tenant.

    Retourne (user, temporary_password).

    Règles :
    - Seul DIRECTOR peut créer (vérifié par la permission staff:create au niveau vue).
    - Rôles autorisés : TEACHER, STUDENT_STUDIES uniquement.
    - Mot de passe temporaire généré, must_change_password=True.
    - Création atomique (transaction.atomic).
    - AuditLog tracé.
    - STAFF-V2-01 : un StaffProfile (vide ou renseigné, statut=ACTIF par
      défaut) est créé dans la même transaction pour tout compte staff —
      l'invariant "tout compte géré par StaffViewSet a un profil RH" ne
      doit jamais souffrir d'exception.
    """
    if role_name not in ALLOWED_CREATE_ROLES:
        raise ValidationError(
            {"role": [f"Le rôle '{role_name}' n'est pas autorisé. Rôles autorisés : {', '.join(ALLOWED_CREATE_ROLES)}."]}
        )

    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError({"email": ["Cette adresse email est déjà utilisée."]})

    role = Role.objects.filter(name=role_name).first()
    if not role:
        raise ValidationError({"role": [f"Le rôle '{role_name}' est introuvable."]})

    temp_pass = generate_temporary_password()

    with transaction.atomic():
        user = User.objects.create_user(
            username=email,
            email=email,
            password=temp_pass,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role,
            tenant=tenant,
            must_change_password=True,
            is_active=True,
            subjects_taught=subjects_taught or [],
        )

        StaffProfile.objects.create(
            user=user,
            date_naissance=date_naissance,
            sexe=sexe,
            date_embauche=date_embauche,
            type_contrat=type_contrat,
            numero_cnss=numero_cnss,
            type_compte_paie=type_compte_paie,
            numero_compte_paie=numero_compte_paie,
        )

        audit_log(
            user=created_by,
            tenant=tenant,
            action="staff:create",
            target_model="User",
            target_id=str(user.id),
            ip_address=ip_address,
        )

    return user, temp_pass
