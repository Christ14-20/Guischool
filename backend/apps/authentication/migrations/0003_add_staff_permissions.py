from django.db import migrations


def add_staff_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    permissions_data = [
        {"codename": "staff:create", "name": "Créer un compte personnel", "module": "staff"},
        {"codename": "staff:read", "name": "Lister et consulter le personnel", "module": "staff"},
        {"codename": "staff:update", "name": "Modifier un compte personnel", "module": "staff"},
        {"codename": "staff:disable", "name": "Activer/désactiver un compte personnel", "module": "staff"},
    ]

    perms = {}
    for p in permissions_data:
        perm, _ = Permission.objects.get_or_create(
            codename=p["codename"],
            defaults={"name": p["name"], "module": p["module"]},
        )
        perms[p["codename"]] = perm

    # DIRECTOR : toutes les permissions staff
    director = Role.objects.filter(name="DIRECTOR").first()
    if director:
        for perm in perms.values():
            director.permissions.add(perm)

    # STUDENT_STUDIES : lecture uniquement
    ss = Role.objects.filter(name="STUDENT_STUDIES").first()
    if ss:
        ss.permissions.add(perms["staff:read"])


def remove_staff_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    codenames = ["staff:create", "staff:read", "staff:update", "staff:disable"]
    for role in Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]):
        for codename in codenames:
            perm = Permission.objects.filter(codename=codename).first()
            if perm:
                role.permissions.remove(perm)

    Permission.objects.filter(codename__in=codenames).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0002_add_read_teachers_permission"),
    ]

    operations = [
        migrations.RunPython(add_staff_permissions, remove_staff_permissions),
    ]
