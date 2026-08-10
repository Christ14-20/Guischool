"""
apps/authentication/migrations/0014_add_roles_permissions.py — ROLES-V2-01

Crée les 4 permissions de gestion des rôles (roles:read/create/update/delete)
et les attache au rôle DIRECTOR — sur TOUTES les lignes nommées DIRECTOR
(le rôle-modèle système tenant=NULL ET chaque clone déjà provisionné par
la migration 0013 pour les tenants existants), pas seulement la première
trouvée.

Note (piège déjà rencontré une fois sur ce projet, cf. scripts/init_data.py) :
les anciennes migrations de ce type utilisaient `Role.objects.filter(name=...)
.first()`, qui ne visait qu'UNE ligne. C'était sans danger tant que Role était
global (une seule ligne par nom possible) ; depuis la bascule tenant-scopée
(migrations 0012/0013), il existe potentiellement une ligne DIRECTOR par
tenant + la ligne-modèle — `.first()` ici manquerait silencieusement tous
les tenants déjà provisionnés. On itère donc sur le queryset complet.
"""

from django.db import migrations


CODENAMES = [
    ("roles:read", "Consulter les rôles"),
    ("roles:create", "Créer un rôle personnalisé"),
    ("roles:update", "Modifier un rôle (permissions, label)"),
    ("roles:delete", "Supprimer un rôle personnalisé"),
]


def add_roles_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perms = []
    for codename, name in CODENAMES:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"name": name, "module": "roles"}
        )
        perms.append(perm)

    for role in Role.objects.filter(name="DIRECTOR"):
        role.permissions.add(*perms)


def remove_roles_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")

    codenames = [c for c, _ in CODENAMES]
    for role in apps.get_model("authentication", "Role").objects.filter(name="DIRECTOR"):
        role.permissions.remove(*Permission.objects.filter(codename__in=codenames))

    Permission.objects.filter(codename__in=codenames).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0013_backfill_tenant_roles"),
    ]

    operations = [
        migrations.RunPython(add_roles_permissions, remove_roles_permissions),
    ]
