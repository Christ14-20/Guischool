from django.db import migrations


def add_schoolyear_lifecycle_permissions(apps, schema_editor):
    """
    SCHOOLYEAR-V2-01 : ajoute les permissions manquantes sur des actions
    sensibles qui n'étaient jusqu'ici protégées que par IsAuthenticated
    (set-current, close) — correction de sécurité découverte en marge du
    ticket, pas un ajout de périmètre fonctionnel.
    """
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    permissions_data = [
        ("pedagogy:update:schoolyear", "Définir l'année scolaire courante", "pedagogy"),
        ("pedagogy:close:schoolyear", "Clôturer une année scolaire", "pedagogy"),
    ]

    created_perms = []
    for codename, name, module in permissions_data:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "module": module},
        )
        created_perms.append(perm)

    director = Role.objects.filter(name="DIRECTOR").first()
    if director:
        director.permissions.add(*created_perms)


def remove_schoolyear_lifecycle_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")
    codenames = ["pedagogy:update:schoolyear", "pedagogy:close:schoolyear"]
    perms = Permission.objects.filter(codename__in=codenames)
    for role in Role.objects.all():
        role.permissions.remove(*perms)
    perms.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0019_yearenddecision_non_nullable"),
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            add_schoolyear_lifecycle_permissions,
            remove_schoolyear_lifecycle_permissions,
        ),
    ]
