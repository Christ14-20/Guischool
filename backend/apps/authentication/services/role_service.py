"""
apps/authentication/services/role_service.py — ROLES-V2-01

Service métier pour la gestion des rôles tenant-scopés : bootstrap des 5
rôles de base pour un nouveau tenant, et CRUD des rôles (de base ou
personnalisés) exposé par RoleViewSet.

Cf. apps/authentication/models.py::Role pour le contexte de la bascule
global → tenant-scopé (ROLES-V2-01) et migrations 0012/0013 pour le
backfill des tenants existants.
"""

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.authentication.models import Role, Permission
from apps.monitoring.services import audit_log


BASE_ROLE_NAMES = ["DIRECTOR", "STUDENT_STUDIES", "TEACHER", "ACCOUNTANT", "PARENT"]

# Rôles jamais assignables à un membre du staff via création/changement de
# rôle : DIRECTOR (réservé au bootstrap Super Admin, cf. tenant_service.py),
# SUPER_ADMIN (rôle plateforme, jamais tenant-scopé), PARENT (jamais créé
# via ce flux aujourd'hui — aucun code non-test ne crée d'utilisateur PARENT).
EXCLUDED_FROM_STAFF_ASSIGNMENT = {"DIRECTOR", "SUPER_ADMIN", "PARENT"}

# Socle anti-verrouillage (décision produit) : un tenant ne peut jamais
# retirer ces permissions du rôle DIRECTOR, pour ne jamais pouvoir se
# bloquer lui-même hors de la gestion de son école. roles:update seul est
# le point vraiment critique — tant qu'il reste présent, toute autre
# permission retirée par erreur reste réparable depuis l'éditeur de rôles
# lui-même. staff:update/staff:create couvrent l'administration du
# personnel en attendant cette réparation.
DIRECTOR_PERMISSION_FLOOR = {"roles:update", "staff:update", "staff:create"}


def bootstrap_tenant_roles(tenant) -> dict[str, Role]:
    """
    Clone, pour un tenant fraîchement créé, ses 5 rôles de base non-
    SUPER_ADMIN à partir des rôles-modèles système (tenant=NULL) — copie
    "snapshot" du label/description/permissions, pas un lien vivant.

    Même logique que la migration de données 0013_backfill_tenant_roles
    (dupliquée plutôt qu'importée : les migrations ne doivent pas dépendre
    de code applicatif qui peut évoluer indépendamment du schéma historique).

    Appelée depuis tenant_service.create_school(), dans la même transaction
    que la création du tenant — chaque tenant a son jeu complet de rôles dès
    sa création, jamais de création paresseuse.
    """
    templates = {
        r.name: r
        for r in Role.objects.filter(tenant__isnull=True, name__in=BASE_ROLE_NAMES)
    }

    roles = {}
    for name, template in templates.items():
        clone = Role.objects.create(
            tenant=tenant,
            name=name,
            label=template.label,
            description=template.description,
        )
        clone.permissions.set(template.permissions.all())
        roles[name] = clone

    return roles


def assignable_roles_queryset(tenant):
    """
    Rôles d'un tenant assignables à un membre du staff via
    POST /auth/staff/ ou PATCH /auth/staff/{id}/change-role/ — tous les
    rôles du tenant (de base ou personnalisés) sauf DIRECTOR/SUPER_ADMIN/PARENT.
    """
    return Role.objects.filter(tenant=tenant).exclude(
        name__in=EXCLUDED_FROM_STAFF_ASSIGNMENT
    )


def create_custom_role(*, tenant, created_by, label, description="", codenames=None, ip_address=""):
    label = (label or "").strip()
    if not label:
        raise ValidationError({"label": ["Le nom du rôle est obligatoire."]})

    codenames = codenames or []
    _validate_codenames(codenames)

    if Role.objects.filter(tenant=tenant, name="CUSTOM", label=label).exists():
        raise ValidationError({"label": ["Un rôle avec ce nom existe déjà."]})

    with transaction.atomic():
        role = Role.objects.create(
            tenant=tenant, name="CUSTOM", label=label, description=description
        )
        role.permissions.set(Permission.objects.filter(codename__in=codenames))

        audit_log(
            user=created_by,
            tenant=tenant,
            action="roles:create",
            target_model="Role",
            target_id=str(role.id),
            ip_address=ip_address,
        )

    return role


def update_role(*, role, updated_by, label=None, description=None, codenames=None, ip_address=""):
    """
    Met à jour un rôle. `label`/`description` sont refusés (400) sur un rôle
    de base — identité fixe, cf. docstring Role. `codenames`, quand fourni,
    remplace intégralement l'ensemble de permissions (même sémantique que
    PATCH /auth/staff/{id}/custom-permissions/) et est soumis au socle
    anti-verrouillage quand role.name == "DIRECTOR".
    """
    is_base = role.name != "CUSTOM"

    if is_base and (label is not None or description is not None):
        raise ValidationError(
            {"label": ["Le nom et la description d'un rôle de base ne sont pas modifiables."]}
        )

    if label is not None:
        label = label.strip()
        if not label:
            raise ValidationError({"label": ["Le nom du rôle est obligatoire."]})
        if (
            Role.objects.filter(tenant=role.tenant, name="CUSTOM", label=label)
            .exclude(id=role.id)
            .exists()
        ):
            raise ValidationError({"label": ["Un rôle avec ce nom existe déjà."]})

    with transaction.atomic():
        if label is not None:
            role.label = label
        if description is not None:
            role.description = description
        if label is not None or description is not None:
            role.save(update_fields=["label", "description"])

        if codenames is not None:
            _validate_codenames(codenames)
            new_codenames = set(codenames)

            if role.name == "DIRECTOR":
                missing = DIRECTOR_PERMISSION_FLOOR - new_codenames
                if missing:
                    raise ValidationError(
                        {
                            "permissions": [
                                "Le rôle DIRECTOR doit conserver au minimum : "
                                + ", ".join(sorted(missing))
                                + "."
                            ]
                        }
                    )

            role.permissions.set(Permission.objects.filter(codename__in=codenames))

        audit_log(
            user=updated_by,
            tenant=role.tenant,
            action="roles:update",
            target_model="Role",
            target_id=str(role.id),
            ip_address=ip_address,
        )

    return role


def delete_role(*, role, deleted_by, ip_address=""):
    if role.name != "CUSTOM":
        raise ValidationError({"detail": "Les rôles de base ne peuvent pas être supprimés."})

    staff_count = role.users.count()
    if staff_count:
        raise ValidationError(
            {
                "detail": (
                    f"Ce rôle est assigné à {staff_count} membre(s) du personnel — "
                    "réassignez-les avant de le supprimer."
                )
            }
        )

    role_id = str(role.id)
    role.delete()

    audit_log(
        user=deleted_by,
        tenant=role.tenant,
        action="roles:delete",
        target_model="Role",
        target_id=role_id,
        ip_address=ip_address,
    )


def _validate_codenames(codenames):
    existing = set(Permission.objects.filter(codename__in=codenames).values_list("codename", flat=True))
    unknown = set(codenames) - existing
    if unknown:
        raise ValidationError(
            {"permissions": [f"Codenames inconnus : {', '.join(sorted(unknown))}."]}
        )
