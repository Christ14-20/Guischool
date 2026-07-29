"""
Migration 0007 — COMM-MVP-01

Crée la permission communication:send et l'attribue aux rôles qui peuvent
déclencher des envois SMS :

- communication:send → DIRECTOR, STUDENT_STUDIES, ACCOUNTANT, TEACHER
"""

from django.db import migrations


def add_communication_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="communication:send",
        defaults={
            "name": "Envoyer des notifications SMS",
            "module": "communication",
        },
    )

    for role_name in ("DIRECTOR", "STUDENT_STUDIES", "ACCOUNTANT", "TEACHER"):
        role = Role.objects.filter(name=role_name).first()
        if role:
            role.permissions.add(perm)


def remove_communication_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    for role in Role.objects.filter(
        name__in=["DIRECTOR", "STUDENT_STUDIES", "ACCOUNTANT", "TEACHER"]
    ):
        perm = Permission.objects.filter(codename="communication:send").first()
        if perm:
            role.permissions.remove(perm)

    Permission.objects.filter(codename="communication:send").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0006_add_payment_permissions"),
    ]

    operations = [
        migrations.RunPython(add_communication_permissions, remove_communication_permissions),
    ]
