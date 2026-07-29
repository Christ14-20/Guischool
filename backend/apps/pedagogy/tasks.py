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
    STUB — Génération du bulletin PDF (GRADE-MVP-03).

    L'intégration WeasyPrint (HTML→PDF) nécessite des dépendances système
    (libpango, libcairo, libffi) qui ne sont pas garanties sur tous les
    environnements de développement. Cette tâche journalise l'intention et
    retourne une URL factice ; la génération réelle du PDF (template HTML,
    upload S3) sera livrée lors de la mise en place de l'infrastructure
    de stockage.

    Conforme à la convention §8 du contrat d'API :
    - 202 Accepted avec task_id déclenché par la view.
    - Le frontend pollue GET /tasks/{task_id}/status/.
    """
    logger.info(
        "STUB génération bulletin — élève %s, période %s "
        "(intégration WeasyPrint réelle à venir avec le setup S3)",
        student_id,
        period_id,
    )
    return {
        "pdf_url": f"https://storage.eduguinee.gn/bulletins/{student_id}/{period_id}.pdf",
        "generated_at": None,
        "status": "done",
    }
