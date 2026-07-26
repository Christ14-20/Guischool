"""
Migration 0005 — FIN-MVP-01

Crée les permissions finance et les attribue aux rôles :
- finance:read    → ACCOUNTANT, DIRECTOR, STUDENT_STUDIES
- finance:create  → ACCOUNTANT, DIRECTOR
- finance:update  → ACCOUNTANT, DIRECTOR
- finance:validate → DIRECTOR uniquement
"""

from django.db import migrations


def add_finance_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    perms_data = [
        {"codename": "finance:read", "name": "Consulter les informations financières", "module": "finance"},
        {"codename": "finance:create", "name": "Créer des catégories de frais et frais", "module": "finance"},
        {"codename": "finance:update", "name": "Modifier des éléments financiers", "module": "finance"},
        {"codename": "finance:validate", "name": "Valider des opérations financières", "module": "finance"},
    ]

    perms = {}
    for p in perms_data:
        perm, _ = Permission.objects.get_or_create(
            codename=p["codename"],
            defaults={"name": p["name"], "module": p["module"]},
        )
        perms[p["codename"]] = perm

    # ACCOUNTANT : read + create + update
    accountant = Role.objects.filter(name="ACCOUNTANT").first()
    if accountant:
        for c in ("finance:read", "finance:create", "finance:update"):
            accountant.permissions.add(perms[c])

    # DIRECTOR : toutes les permissions finance
    director = Role.objects.filter(name="DIRECTOR").first()
    if director:
        for perm in perms.values():
            director.permissions.add(perm)

    # STUDENT_STUDIES : lecture seule
    ss = Role.objects.filter(name="STUDENT_STUDIES").first()
    if ss:
        ss.permissions.add(perms["finance:read"])


def remove_finance_permissions(apps, schema_editor):
    Permission = apps.get_model("authentication", "Permission")
    Role = apps.get_model("authentication", "Role")

    codenames = ["finance:read", "finance:create", "finance:update", "finance:validate"]
    for role in Role.objects.filter(
        name__in=["ACCOUNTANT", "DIRECTOR", "STUDENT_STUDIES"]
    ):
        for codename in codenames:
            perm = Permission.objects.filter(codename=codename).first()
            if perm:
                role.permissions.remove(perm)

    Permission.objects.filter(codename__in=codenames).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0004_add_accountant_role"),
    ]

    operations = [
        migrations.RunPython(add_finance_permissions, remove_finance_permissions),
    ]
