import os
import sys
import django

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
# Ajouter le dossier parent au path pour trouver 'apps'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from apps.pedagogy.models import Student, SchoolYear
from apps.authentication.models import User
from apps.finance.models import Invoice, FeeCategory, StudentFee
from django.utils import timezone

def run():
    student = Student.objects.first()
    school_year = SchoolYear.objects.first()
    
    if not student or not school_year:
        print(f"Data missing: Student={student}, Year={school_year}")
        return
    
    tenant = student.tenant

    # 1. Créer une catégorie de frais si elle n'existe pas
    fee_cat, _ = FeeCategory.objects.get_or_create(
        tenant=tenant,
        name="Scolarité Annuelle 2024-2025",
        defaults={
            'type': 'TUITION',
            'amount': 5000000,
            'is_mandatory': True,
            'school_year': school_year
        }
    )

    # 2. Assigner ce frais à l'élève (StudentFee)
    sf, created = StudentFee.objects.get_or_create(
        tenant=tenant,
        student=student,
        fee_category=fee_cat,
        defaults={
            'total_amount': 5000000,
            'balance_due': 5000000
        }
    )
    if created:
        print(f"Created StudentFee for {student.prenom}")
    else:
        print(f"StudentFee already exists for {student.prenom}")

    # 3. Création/Mise à jour d'une facture de test
    inv, created = Invoice.objects.get_or_create(
        tenant=tenant,
        student=student,
        school_year=school_year,
        defaults={
            'total_due': 5000000,
            'total_paid': 0,
            'balance': 5000000,
            'status': 'PENDING'
        }
    )
    
    if created:
        print(f"Created test invoice for {student.prenom} {student.nom}")
    else:
        inv.total_due = 5000000
        inv.balance = inv.total_due - inv.total_paid
        inv.save()
        print(f"Updated existing invoice for {student.prenom}")

if __name__ == "__main__":
    run()
