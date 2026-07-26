"""
Migration 0004 — FIN-MVP-00

Ajoute le rôle ACCOUNTANT (« Comptable ») à la table des rôles.
Le rôle est créé sans permission particulière ; les permissions finance
seront attribuées dans les migrations suivantes (FIN-MVP-01..04).
"""

from django.db import migrations


def add_accountant_role(apps, schema_editor):
    Role = apps.get_model("authentication", "Role")
    Role.objects.get_or_create(
        name="ACCOUNTANT",
        defaults={
            "label": "Comptable",
            "description": "Gestion financière de l'établissement.",
        },
    )


def remove_accountant_role(apps, schema_editor):
    Role = apps.get_model("authentication", "Role")
    Role.objects.filter(name="ACCOUNTANT").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0003_add_staff_permissions"),
    ]

    operations = [
        migrations.RunPython(add_accountant_role, remove_accountant_role),
    ]
