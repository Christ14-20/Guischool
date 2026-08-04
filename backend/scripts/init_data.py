"""
scripts/init_data.py

Script d'initialisation des données de base.
Usage (depuis le dossier backend/, quel que soit l'OS) : python scripts/init_data.py

Crée dans l'ordre :
  1. Le Plan "Starter" par défaut (stub — sera complété en Épic 2)
  2. Les 6 Rôles MVP
  2bis. Rattachement des permissions métier aux rôles (voir note ci-dessous)
  3. Les Permissions auth de base (Épic 1)
  4. Le compte Super Admin initial

À exécuter une seule fois sur un projet vierge, ou après une réinitialisation de la DB.

Note (bug trouvé en marge, sur une machine fraîchement clonée) : les migrations de
données qui attachent des permissions métier aux rôles (authentication
0002/0003/0005/0006/0007, pedagogy 0002/0008/0010/0012/0014/0016/0020/0021) créent
bien chaque `Permission` de façon inconditionnelle, mais n'attachent la permission
au `Role` correspondant QUE si ce rôle existe déjà en base au moment où `migrate`
s'exécute (`Role.objects.filter(name=...).first()` + `if role:`). Comme ce script
est l'unique endroit qui crée les 6 rôles MVP, et qu'il s'exécute nécessairement
APRÈS `migrate` (les rôles n'existent pas encore pendant les migrations sur un
projet vierge), TOUTES ces migrations no-opent silencieusement sur un premier
`migrate` — chaque rôle démarre avec zéro permission métier tant que l'étape 2bis
ci-dessous n'a pas tourné. L'étape 2bis referme cette fenêtre en rejouant, de façon
idempotente, le mapping rôle → permissions historique (les `Permission` existent
déjà en base grâce aux migrations ; il ne reste qu'à les attacher aux rôles).
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
    {"name": "ACCOUNTANT",      "label": "Comptable"},
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


# ── 2bis. Rattachement des permissions métier aux rôles ────────────────────────
# Reconstruit à partir des migrations de données authentication/0002,0003,0005,
# 0006,0007 et pedagogy/0002,0008,0010,0012,0014,0016,0020,0021 — voir la note
# en tête de fichier. Idempotent : ManyToManyField.add() ignore les doublons.
ROLE_PERMISSIONS = {
    "DIRECTOR": [
        "authentication:read:teachers",
        "staff:create", "staff:read", "staff:update", "staff:disable",
        "finance:read", "finance:create", "finance:update", "finance:validate",
        "communication:send",
        "pedagogy:create:schoolyear", "pedagogy:create:period",
        "eleves:create", "eleves:read", "eleves:update",
        "attendance:create", "attendance:justify",
        "notes:create:evaluation", "notes:read", "notes:lock", "notes:validate",
        "pedagogy:update:schoolyear", "pedagogy:close:schoolyear",
        "pedagogy:override:schoolyear",
    ],
    "STUDENT_STUDIES": [
        "authentication:read:teachers",
        "staff:read",
        "finance:read",
        "communication:send",
        "pedagogy:create:schoolyear", "pedagogy:create:period",
        "eleves:create", "eleves:read", "eleves:update",
        "attendance:create", "attendance:justify",
        "notes:create:evaluation", "notes:read", "notes:lock",
    ],
    "TEACHER": [
        "communication:send",
        "attendance:create",
        "notes:create:evaluation", "notes:read", "notes:lock",
    ],
    "ACCOUNTANT": [
        "finance:read", "finance:create", "finance:update",
        "communication:send",
        # eleves:read : sans ça, GET /students/?search= (utilisé pour
        # rechercher l'élève à qui assigner un frais ou pour qui
        # enregistrer un paiement) renvoie 403 — un ACCOUNTANT ne pouvait
        # physiquement pas utiliser ces deux écrans malgré finance:create.
        "eleves:read",
    ],
    "PARENT": [
        "notes:read",
    ],
}

for role_name, codenames in ROLE_PERMISSIONS.items():
    role = Role.objects.filter(name=role_name).first()
    if not role:
        continue
    perms = Permission.objects.filter(codename__in=codenames)
    missing = set(codenames) - set(perms.values_list("codename", flat=True))
    if missing:
        print(f"[WARN] Permissions introuvables pour {role_name} (avez-vous lancé `migrate` ?) : {sorted(missing)}")
    role.permissions.add(*perms)
    print(f"[OK] Permissions attachées à {role_name} ({perms.count()}/{len(codenames)})")


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
