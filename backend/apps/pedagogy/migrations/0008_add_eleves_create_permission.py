from django.db import migrations


def add_eleves_create_permission(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="eleves:create",
        defaults={
            "name": "Créer / inscrire un élève",
            "module": "eleves",
        },
    )

    for role_name in ("DIRECTOR", "STUDENT_STUDIES"):
        role = Role.objects.filter(name=role_name).first()
        if role:
            role.permissions.add(perm)


def remove_eleves_create_permission(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm = Permission.objects.filter(codename="eleves:create").first()
    if not perm:
        return

    for role in Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]):
        role.permissions.remove(perm)

    perm.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0007_student_enrollment_matriculesequence_and_more"),
        ("authentication", "0002_add_read_teachers_permission"),
    ]

    operations = [
        migrations.RunPython(
            add_eleves_create_permission, remove_eleves_create_permission
        ),
    ]
