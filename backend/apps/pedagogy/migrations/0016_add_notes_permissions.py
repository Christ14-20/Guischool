from django.db import migrations


def add_notes_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    permissions_data = [
        ("notes:create:evaluation", "Créer une évaluation", "notes"),
        ("notes:read", "Consulter les notes et évaluations", "notes"),
        ("notes:lock", "Verrouiller une évaluation", "notes"),
        ("notes:validate", "Valider une note ou modifier après validation", "notes"),
    ]

    created_perms = []
    for codename, name, module in permissions_data:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "module": module},
        )
        created_perms.append(perm)

    for role_name in ["DIRECTOR"]:
        role = Role.objects.filter(name=role_name).first()
        if role:
            role.permissions.add(*created_perms)

    student_studies = Role.objects.filter(name="STUDENT_STUDIES").first()
    if student_studies:
        student_studies.permissions.add(
            *[p for p in created_perms if p.codename != "notes:validate"]
        )

    teacher = Role.objects.filter(name="TEACHER").first()
    if teacher:
        teacher.permissions.add(
            *[p for p in created_perms if p.codename != "notes:validate"]
        )

    parent = Role.objects.filter(name="PARENT").first()
    if parent:
        read_perm = next((p for p in created_perms if p.codename == "notes:read"), None)
        if read_perm:
            parent.permissions.add(read_perm)


def remove_notes_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")
    codenames = [
        "notes:create:evaluation",
        "notes:read",
        "notes:lock",
        "notes:validate",
    ]
    perms = Permission.objects.filter(codename__in=codenames)
    for role in Role.objects.all():
        role.permissions.remove(*perms)
    perms.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("pedagogy", "0015_evaluation_grade"),
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_notes_permissions, remove_notes_permissions),
    ]
