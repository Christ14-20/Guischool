from django.db import migrations


def add_read_teachers_permission(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="authentication:read:teachers",
        defaults={
            "name": "Lister les enseignants de l'établissement",
            "module": "authentication",
        },
    )

    for role_name in ("DIRECTOR", "STUDENT_STUDIES"):
        role = Role.objects.filter(name=role_name).first()
        if role:
            role.permissions.add(perm)


def remove_read_teachers_permission(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm = Permission.objects.filter(codename="authentication:read:teachers").first()
    if not perm:
        return

    for role in Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]):
        role.permissions.remove(perm)

    perm.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_read_teachers_permission, remove_read_teachers_permission),
    ]
