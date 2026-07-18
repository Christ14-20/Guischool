"""
scripts/init_data.py

Script d'initialisation des données de base.
Usage : python manage.py shell < scripts/init_data.py

Crée dans l'ordre :
  1. Le Plan "Starter" par défaut (stub — sera complété en Épic 2)
  2. Les 5 Rôles MVP
  3. Les Permissions auth de base (Épic 1)
  4. Le compte Super Admin initial

À exécuter une seule fois sur un projet vierge, ou après une réinitialisation de la DB.
"""

import os
import sys
import django

# Permet d'exécuter le script directement avec `python scripts/init_data.py` depuis le dossier backend/
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.superadmin.models import Plan
from apps.authentication.models import Role, Permission, User


# ── 1. Plan stub par défaut ────────────────────────────────────────────────────
plan_starter, _ = Plan.objects.get_or_create(name="Starter")
print(f"[OK] Plan : {plan_starter.name}")


# ── 2. Rôles MVP ───────────────────────────────────────────────────────────────
ROLES = [
    {"name": "SUPER_ADMIN",     "label": "Super Administrateur"},
    {"name": "DIRECTOR",        "label": "Directeur"},
    {"name": "STUDENT_STUDIES", "label": "Directeur des études"},
    {"name": "TEACHER",         "label": "Enseignant"},
    {"name": "PARENT",          "label": "Parent d'élève"},
]

roles_created = []
for r in ROLES:
    role, created = Role.objects.get_or_create(
        name=r["name"],
        defaults={"label": r["label"]},
    )
    roles_created.append(role)
    status = "créé" if created else "existant"
    print(f"[OK] Rôle {role.name} ({status})")


# ── 3. Permissions auth de base ────────────────────────────────────────────────
# Codenames au format module:action[:scope] (décision A2)
AUTH_PERMISSIONS = [
    "auth:login",
    "auth:refresh",
    "auth:logout",
    "users:read:me",
    "users:update:me",
    "auth:permissions:read",
]

for codename in AUTH_PERMISSIONS:
    perm, created = Permission.objects.get_or_create(codename=codename)
    status = "créée" if created else "existante"
    print(f"[OK] Permission {codename} ({status})")


# ── 4. Compte Super Admin initial ──────────────────────────────────────────────
SUPER_ADMIN_EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", "admin@eduguinee.gn")
SUPER_ADMIN_PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD", "changeme123!")

super_admin_role = Role.objects.get(name="SUPER_ADMIN")

if not User.objects.filter(email=SUPER_ADMIN_EMAIL).exists():
    user = User.objects.create_superuser(
        username="superadmin",
        email=SUPER_ADMIN_EMAIL,
        password=SUPER_ADMIN_PASSWORD,
    )
    user.role = super_admin_role
    user.save()
    print(f"[OK] Super Admin créé : {SUPER_ADMIN_EMAIL}")
else:
    print(f"[SKIP] Super Admin {SUPER_ADMIN_EMAIL} existe déjà")

print("\n✅ Initialisation terminée.")
