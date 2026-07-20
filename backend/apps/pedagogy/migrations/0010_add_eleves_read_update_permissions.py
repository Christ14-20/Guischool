from django.db import migrations


PERMISSIONS = [
    ("eleves:read", "Consulter les élèves"),
    ("eleves:update", "Modifier / réinscrire / archiver un élève"),
]


def add_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    for codename, name in PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "module": "eleves"},
        )
        for role_name in ("DIRECTOR", "STUDENT_STUDIES"):
            role = Role.objects.filter(name=role_name).first()
            if role:
                role.permissions.add(perm)


def remove_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    for codename, _ in PERMISSIONS:
        perm = Permission.objects.filter(codename=codename).first()
        if not perm:
            continue
        for role in Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]):
            role.permissions.remove(perm)
        perm.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0009_guardian"),
        ("authentication", "0002_add_read_teachers_permission"),
    ]

    operations = [
        migrations.RunPython(add_permissions, remove_permissions),
    ]
