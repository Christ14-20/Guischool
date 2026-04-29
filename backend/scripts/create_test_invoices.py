from apps.pedagogy.models import Student, SchoolYear
from apps.authentication.models import User
from apps.finance.models import Invoice, FeeCategory, StudentFee
from django.utils import timezone

def run():
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        print("No superuser found")
        return
    
    tenant = user.tenant
    student = Student.objects.filter(tenant=tenant).first()
    school_year = SchoolYear.objects.filter(tenant=tenant).first()
    
    if not student or not school_year:
        print(f"Data missing: Student={student}, Year={school_year}")
        return

    # Create an invoice
    inv, created = Invoice.objects.get_or_create(
        tenant=tenant,
        student=student,
        school_year=school_year,
        defaults={
            'total_due': 2500000,
            'total_paid': 500000,
            'balance': 2000000,
            'status': 'PENDING'
        }
    )
    
    if created:
        print(f"Created test invoice for {student.first_name} {student.last_name}")
    else:
        print(f"Invoice already exists for {student.first_name}")

if __name__ == "__main__":
    import django
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
    run()
