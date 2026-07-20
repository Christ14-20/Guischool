from django.db import migrations
from django.apps import apps as global_apps


def add_pedagogy_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    permissions_data = [
        ("pedagogy:create:schoolyear", "Créer une année scolaire", "pedagogy"),
        ("pedagogy:create:period", "Créer une période académique", "pedagogy"),
    ]

    created_perms = []
    for codename, name, module in permissions_data:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "module": module},
        )
        created_perms.append(perm)

    director_role = Role.objects.filter(name="DIRECTOR").first()
    if director_role:
        director_role.permissions.add(*created_perms)

    secretaire_role = Role.objects.filter(name="STUDENT_STUDIES").first()
    if secretaire_role:
        secretaire_role.permissions.add(*created_perms)


def remove_pedagogy_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    codenames = [
        "pedagogy:create:schoolyear",
        "pedagogy:create:period",
    ]
    perms = Permission.objects.filter(codename__in=codenames)

    Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]).first()
    for role in Role.objects.filter(name__in=["DIRECTOR", "STUDENT_STUDIES"]):
        role.permissions.remove(*perms)

    perms.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0001_initial"),
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_pedagogy_permissions, remove_pedagogy_permissions),
    ]
