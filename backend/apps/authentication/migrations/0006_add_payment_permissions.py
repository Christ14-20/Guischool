"""
Migration 0006 — FIN-MVP-02

Ajoute la permission finance:create (déjà existante dans 0005)
nécessaire pour enregistrer un paiement espèces.
Seuls les rôles ACCOUNTANT et DIRECTOR peuvent créer des paiements.
"""

from django.db import migrations


def add_payment_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    # Les permissions finance:read, finance:create, etc. existent déjà.
    # On s'assure que ACCOUNTANT et DIRECTOR ont finance:create.
    for role_name in ("ACCOUNTANT", "DIRECTOR"):
        role = Role.objects.filter(name=role_name).first()
        if role:
            perm = Permission.objects.filter(codename="finance:create").first()
            if perm:
                role.permissions.add(perm)


def remove_payment_permissions(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0005_add_finance_permissions"),
    ]

    operations = [
        migrations.RunPython(add_payment_permissions, remove_payment_permissions),
    ]
