"""
apps/communication/services.py — COMM-MVP-02

Helpers de construction de messages SMS pour chaque déclencheur.

Toutes ces fonctions construisent le message et appellent
send_sms.delay(...) de façon asynchrone.
"""

import logging

from .tasks import send_sms

logger = logging.getLogger(__name__)


def notify_absence(student_id: str, guardian_phone: str, tenant_id: str | None = None):
    from apps.pedagogy.models import Student

    try:
        student = Student.objects.get(id=student_id)
        class_name = student.classe_actuelle.name if student.classe_actuelle else "N/A"
        message = (
            f"Eduguinee: Votre enfant {student.prenom} {student.nom} "
            f"(classe {class_name}) a ete marque absent. "
            "Merci de justifier son absence aupres de l'ecole."
        )
        effective_tenant = str(student.tenant_id)
    except Student.DoesNotExist:
        message = "Eduguinee: Votre enfant a ete marque absent. Merci de justifier."
        effective_tenant = tenant_id

    send_sms.delay(
        recipient_phone=guardian_phone,
        message=message,
        trigger_type="ABSENCE",
        tenant_id=effective_tenant,
    )


def notify_enrollment(student_id: str, guardian_phone: str, tenant_id: str | None = None):
    from apps.pedagogy.models import Student

    try:
        student = Student.objects.get(id=student_id)
        class_name = student.classe_actuelle.name if student.classe_actuelle else "N/A"
        enrollment = student.enrollments.order_by("-date_inscription").first()
        year_label = enrollment.school_year.label if enrollment else ""
        message = (
            f"Eduguinee: Inscription confirmee pour {student.prenom} {student.nom} "
            f"(matricule {student.matricule}) en classe {class_name} "
            f"pour l'annee {year_label}. Bienvenue a l'ecole !"
        )
        effective_tenant = str(student.tenant_id)
    except Student.DoesNotExist:
        message = "Eduguinee: Inscription confirmee. Bienvenue !"
        effective_tenant = tenant_id

    send_sms.delay(
        recipient_phone=guardian_phone,
        message=message,
        trigger_type="INSCRIPTION",
        tenant_id=effective_tenant,
    )


def notify_payment(payment_id: str, tenant_id: str):
    from apps.finance.models import Payment

    try:
        payment = Payment.objects.select_related("student").get(id=payment_id)
        message = (
            f"Eduguinee: Paiement de {int(payment.amount):,} GNF recu pour "
            f"{payment.student.prenom} {payment.student.nom}. "
            f"Recu: {payment.receipt_number}. Merci."
        )
        guardian_phone = _get_guardian_phone(payment.student)
        if not guardian_phone:
            logger.info("Aucun guardian joignable pour le paiement %s", payment_id)
            return
    except Payment.DoesNotExist:
        logger.error("Payment %s introuvable pour notification SMS", payment_id)
        return

    send_sms.delay(
        recipient_phone=guardian_phone,
        message=message,
        trigger_type="PAIEMENT",
        tenant_id=tenant_id,
    )


def notify_grade_validated(grade_id: str, tenant_id: str):
    from apps.pedagogy.models import Grade

    try:
        grade = Grade.objects.select_related(
            "student", "evaluation__subject"
        ).get(id=grade_id)
        student = grade.student
        subject = grade.evaluation.subject if grade.evaluation else None
        subject_name = subject.name if subject else "Matiere"
        note_convertie = grade.note_convertie or 0
        message = (
            f"Eduguinee: Note de {student.prenom} {student.nom} en {subject_name}: "
            f"{note_convertie:.1f}/20. Consultez le bulletin sur l'app Eduguinee."
        )
        guardian_phone = _get_guardian_phone(student)
        if not guardian_phone:
            logger.info("Aucun guardian joignable pour la note %s", grade_id)
            return
    except Grade.DoesNotExist:
        logger.error("Grade %s introuvable pour notification SMS", grade_id)
        return

    send_sms.delay(
        recipient_phone=guardian_phone,
        message=message,
        trigger_type="NOTE_VALIDEE",
        tenant_id=tenant_id,
    )


def _get_guardian_phone(student):
    guardian = (
        student.guardians.filter(user__isnull=False).first()
        or student.guardians.first()
    )
    return guardian.telephone if guardian else None
