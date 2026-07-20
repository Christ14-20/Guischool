from django.db import migrations


PERMISSIONS = [
    ("attendance:justify", "Justifier une absence"),
]

ROLES = ("DIRECTOR", "STUDENT_STUDIES")


def add_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    for codename, name in PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "module": "attendance"},
        )
        for role_name in ROLES:
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
        for role in Role.objects.filter(name__in=ROLES):
            role.permissions.remove(perm)
        perm.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0013_periodictask_lock_stale_attendances"),
        ("authentication", "0002_add_read_teachers_permission"),
    ]

    operations = [
        migrations.RunPython(add_permissions, remove_permissions),
    ]
