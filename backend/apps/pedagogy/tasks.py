"""
apps/pedagogy/tasks.py

Tâches Celery asynchrones pour le module pédagogie.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="apps.pedagogy.tasks.send_enrollment_confirmation_sms")
def send_enrollment_confirmation_sms(student_id: str, guardian_phone: str):
    """
    Confirmation d'inscription par SMS au responsable.

    Délègue à apps.communication.services.notify_enrollment qui construit
    le message et appelle send_sms.delay.
    """
    from apps.communication.services import notify_enrollment

    notify_enrollment(student_id=student_id, guardian_phone=guardian_phone, tenant_id=None)


@shared_task(name="apps.pedagogy.tasks.send_absence_notification_sms")
def send_absence_notification_sms(student_id: str, guardian_phone: str):
    """
    Notification d'absence par SMS au responsable.

    Délègue à apps.communication.services.notify_absence qui construit
    le message et appelle send_sms.delay.
    """
    from apps.communication.services import notify_absence

    notify_absence(student_id=student_id, guardian_phone=guardian_phone, tenant_id=None)


@shared_task(name="apps.pedagogy.tasks.lock_stale_attendances")
def lock_stale_attendances():
    """
    Verrouille automatiquement les présences créées il y a plus de 24 heures.

    Tâche périodique (Celery Beat / DatabaseScheduler) : une fois verrouillée
    (is_locked=True), une présence ne peut plus être corrigée via l'API ; seul
    un administrateur peut la déverrouiller depuis le Django Admin (limite V1).
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.pedagogy.models import Attendance

    cutoff = timezone.now() - timedelta(hours=24)
    locked_count = Attendance.objects.filter(
        is_locked=False, created_at__lt=cutoff
    ).update(is_locked=True)

    logger.info("lock_stale_attendances — %s présence(s) verrouillée(s)", locked_count)
    return locked_count


@shared_task(
    name="apps.pedagogy.tasks.generate_bulletin_pdf",
    bind=True,
)
def generate_bulletin_pdf(self, student_id: str, period_id: str):
    """
    Génération du bulletin PDF (GRADE-MVP-03, implémentée par INFRA-V2-01 —
    le wiring MinIO manquant, pas WeasyPrint lui-même, était le blocage
    initial : receipts/factures utilisaient déjà WeasyPrint avec succès).

    Même pattern que apps.finance.tasks.generate_invoice_pdf : HTML→PDF via
    WeasyPrint, upload via default_storage. Données via
    grade_service.compute_student_moyenne(), déjà utilisé par l'endpoint
    /students/{id}/moyenne/ — même source de vérité, pas de recalcul
    dupliqué.

    Pas de champ modèle pour stocker l'URL (contrairement à Invoice.pdf_url) :
    le résultat n'est consommé que via le polling GET /tasks/{task_id}/status/
    (TaskResult.result), conforme à la convention §8 du contrat d'API déjà
    respectée par le stub que cette implémentation remplace.
    """
    import io

    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from django.template.loader import render_to_string
    from django.utils import timezone
    from weasyprint import HTML

    from apps.pedagogy.models import AcademicPeriod, Student
    from apps.pedagogy.services.grade_service import arrondi_academique, compute_student_moyenne

    try:
        student = Student.objects.select_related("tenant", "classe_actuelle").get(id=student_id)
    except Student.DoesNotExist:
        logger.error("generate_bulletin_pdf — élève %s introuvable", student_id)
        return {"error": "Élève introuvable"}

    try:
        period = AcademicPeriod.objects.select_related("school_year").get(id=period_id)
    except AcademicPeriod.DoesNotExist:
        logger.error("generate_bulletin_pdf — période %s introuvable", period_id)
        return {"error": "Période introuvable"}

    result = compute_student_moyenne(student, period)
    par_matiere = [
        {
            "subject_name": item["subject_name"],
            "subject_code": item["subject_code"],
            "moyenne": arrondi_academique(item["moyenne"]),
            "coefficient": item["coefficient"],
        }
        for item in result["par_matiere"]
    ]
    moyenne_generale = (
        arrondi_academique(result["moyenne_generale"])
        if result["moyenne_generale"] is not None else None
    )

    html = render_to_string("pedagogy/bulletin.html", {
        "student": student,
        "period": period,
        "moyenne_generale": moyenne_generale,
        "mention": result["mention"],
        "par_matiere": par_matiere,
    })
    pdf_buffer = io.BytesIO()
    HTML(string=html).write_pdf(pdf_buffer)

    filename = f"bulletins/{student.id}/{period.id}.pdf"
    saved_path = default_storage.save(filename, ContentFile(pdf_buffer.getvalue()))
    pdf_url = default_storage.url(saved_path)

    logger.info("PDF généré pour le bulletin — élève %s, période %s", student.id, period.id)
    return {
        "pdf_url": pdf_url,
        "generated_at": timezone.now().isoformat(),
        "status": "done",
    }
