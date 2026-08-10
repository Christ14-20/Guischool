"""
apps/authentication/migrations/0013_backfill_tenant_roles.py — ROLES-V2-01

Convertit les 6 lignes Role globales (tenant=NULL) en rôles-modèles système
et clone, pour chaque tenant existant, ses 5 rôles de base non-SUPER_ADMIN
(DIRECTOR, STUDENT_STUDIES, TEACHER, ACCOUNTANT, PARENT) — copie "snapshot"
du label/description/permissions au moment de la migration, pas un lien
vivant : un futur changement du template ne doit jamais rétroactivement
modifier un tenant déjà provisionné.

Chaque utilisateur existant pointant vers la ligne globale correspondante
est repointé vers le clone de son propre tenant. SUPER_ADMIN n'est jamais
cloné — ses utilisateurs (tenant=NULL eux-mêmes) restent sur la ligne
globale, à vie.

Réversible : repointe les users vers les templates puis supprime les clones.
"""

from django.db import migrations


BASE_ROLE_NAMES = ["DIRECTOR", "STUDENT_STUDIES", "TEACHER", "ACCOUNTANT", "PARENT"]


def clone_roles_for_tenants(apps, schema_editor):
    Tenant = apps.get_model("superadmin", "Tenant")
    Role = apps.get_model("authentication", "Role")
    User = apps.get_model("authentication", "User")

    templates = {
        r.name: r
        for r in Role.objects.filter(tenant__isnull=True, name__in=BASE_ROLE_NAMES)
    }

    for tenant in Tenant.objects.all():
        for name, template in templates.items():
            clone = Role.objects.create(
                tenant=tenant,
                name=name,
                label=template.label,
                description=template.description,
            )
            clone.permissions.set(template.permissions.all())

            User.objects.filter(
                tenant=tenant, role__tenant__isnull=True, role__name=name
            ).update(role=clone)


def revert_clone_roles_for_tenants(apps, schema_editor):
    Tenant = apps.get_model("superadmin", "Tenant")
    Role = apps.get_model("authentication", "Role")
    User = apps.get_model("authentication", "User")

    templates = {
        r.name: r
        for r in Role.objects.filter(tenant__isnull=True, name__in=BASE_ROLE_NAMES)
    }

    for tenant in Tenant.objects.all():
        for name, template in templates.items():
            User.objects.filter(
                tenant=tenant, role__tenant=tenant, role__name=name
            ).update(role=template)

        Role.objects.filter(tenant=tenant, name__in=BASE_ROLE_NAMES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0012_role_tenant_field"),
    ]

    operations = [
        migrations.RunPython(
            clone_roles_for_tenants, reverse_code=revert_clone_roles_for_tenants
        ),
    ]
