from django.db import migrations


def add_schoolyear_override_permission(apps, schema_editor):
    """
    SCHOOLYEAR-V2-02 : permission dédiée pour surcharger explicitement
    l'année scolaire courante résolue par défaut (resolve_school_year).
    DIRECTOR uniquement, extensible plus tard via custom_permissions
    (STAFF-V2-03) sans ajouter de nouveau rôle.
    """
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="pedagogy:override:schoolyear",
        defaults={
            "name": "Choisir une année scolaire différente de l'année courante",
            "module": "pedagogy",
        },
    )

    director = Role.objects.filter(name="DIRECTOR").first()
    if director:
        director.permissions.add(perm)


def remove_schoolyear_override_permission(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")
    perms = Permission.objects.filter(codename="pedagogy:override:schoolyear")
    for role in Role.objects.all():
        role.permissions.remove(*perms)
    perms.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0020_add_schoolyear_lifecycle_permissions"),
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            add_schoolyear_override_permission,
            remove_schoolyear_override_permission,
        ),
    ]
