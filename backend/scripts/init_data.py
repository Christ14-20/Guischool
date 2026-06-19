"""
scripts/init_data.py
Script pour initialiser les rôles, permissions et plans par défaut.
Usage: python manage.py shell < scripts/init_data.py
"""
print("--- Initialisation des données Eduguinée 3.0 ---")

from apps.authentication.models import Role, Permission, User
from apps.superadmin.models import Plan, Tenant
from django.utils.text import slugify

# 1. Création des Permissions de base (exemples)
perms_data = [
    ("view_schools", "Voir les écoles", "Accès à la liste des écoles"),
    ("create_school", "Créer une école", "Capacité à enregistrer une nouvelle école"),
    ("suspend_school", "Suspendre une école", "Action de suspension"),
    ("view_reports", "Voir les rapports", "Accès aux statistiques"),
]
perms_objs = {}
for code, name, desc in perms_data:
    p, _ = Permission.objects.get_or_create(codename=code, defaults={"name": name, "description": desc})
    perms_objs[code] = p

# 2. Création des Rôles
roles_data = [
    "SUPER_ADMIN", "ADMIN_SCHOOL", "TEACHER", "STUDENT", "PARENT", "STAFF"
]
for rname in roles_data:
    role, created = Role.objects.get_or_create(name=rname)
    if created:
        print(f"Rôle '{rname}' créé.")
        if rname == "SUPER_ADMIN":
            role.permissions.add(*perms_objs.values())

# 3. Création des Plans
plans_data = [
    ("TRIAL", "individual", 1, 50, 5, 0, 0),
    ("STARTER", "standard", 1, 200, 20, 1500000, 0),
    ("PREMIUM", "network", 5, 1000, 100, 5000000, 25000),
]
for name, plan_type, max_campuses, max_s, max_st, price, price_per_student in plans_data:
    plan, created = Plan.objects.get_or_create(
        name=name,
        defaults={
            "plan_type": plan_type,
            "max_campuses": max_campuses,
            "max_students": max_s,
            "max_staff": max_st,
            "price_monthly": price,
            "price_annual": price * 10,
            "price_per_student": price_per_student,
            "modules_activated": ["auth", "pedagogy", "finance"],
            "modules_included": ["auth", "pedagogy", "finance"],
        }
    )
    if created:
        print(f"Plan '{name}' créé.")

# 4. Création du SuperAdmin par défaut (si n'existe pas)
if not User.objects.filter(is_superuser=True).exists():
    admin_user = User.objects.create_superuser(
        username="admin",
        email="admin@eduguinee.gn",
        password="adminpassword123",
        first_name="Super",
        last_name="Admin"
    )
    admin_user.role = Role.objects.get(name="SUPER_ADMIN")
    admin_user.save()
    print("Utilisateur SuperAdmin 'admin' créé (pwd: adminpassword123).")

print("--- Initialisation terminée ---")
