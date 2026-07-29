from django.db import transaction

from apps.pedagogy.models import Attendance, SchoolClass, Student
from apps.pedagogy.services.school_year_service import assert_school_year_open


class AttendanceError(Exception):
    """
    Erreur métier de saisie de présence porteuse d'un code HTTP et d'un payload
    optionnel.

    - status_code : 409 (présences déjà enregistrées), 422 (présence verrouillée /
      élève hors classe)
    - errors : dict optionnel inséré dans la réponse
    """

    def __init__(self, message: str, status_code: int, errors: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors


def _guardian_phone(student: Student) -> str | None:
    """
    Retourne le téléphone du responsable joignable de l'élève :
    contact d'urgence en priorité, sinon le premier responsable enregistré.
    """
    guardian = (
        student.guardians.filter(is_contact_urgence=True).first()
        or student.guardians.first()
    )
    return guardian.telephone if guardian else None


@transaction.atomic
def create_batch_attendance(*, tenant, classe: SchoolClass, date, records, created_by):
    """
    Enregistre en lot les présences d'une classe pour une date donnée.

    - 409 si au moins un élève de la classe possède déjà une présence à cette date.
    - 422 si un student_id du lot n'appartient pas à la classe (ou au tenant).

    Retourne (created_attendances, sms_queued_for) où sms_queued_for est la liste
    des student_id (str) marqués ABSENT et disposant d'un responsable joignable.
    """
    assert_school_year_open(classe.school_year)

    student_ids = [r["student_id"] for r in records]

    students = {
        str(s.id): s
        for s in Student.objects.filter(
            tenant=tenant, id__in=student_ids, classe_actuelle=classe
        )
    }

    for sid in student_ids:
        if str(sid) not in students:
            raise AttendanceError(
                "Un ou plusieurs élèves n'appartiennent pas à cette classe.",
                status_code=422,
                errors={"student_id": str(sid)},
            )

    already = Attendance.objects.filter(
        tenant=tenant, classe=classe, date=date, student_id__in=student_ids
    ).exists()
    if already:
        formatted = date.strftime("%d/%m/%Y")
        raise AttendanceError(
            f"Les présences du {formatted} pour cette classe ont déjà été "
            "enregistrées. Utilisez PATCH pour les modifier.",
            status_code=409,
        )

    created = []
    for record in records:
        student = students[str(record["student_id"])]
        created.append(
            Attendance.objects.create(
                tenant=tenant,
                student=student,
                classe=classe,
                date=date,
                status=record["status"],
                minutes_late=record.get("minutes_late"),
                created_by=created_by,
            )
        )

    sms_queued_for = []
    for attendance in created:
        if attendance.status == Attendance.Status.ABSENT:
            if _guardian_phone(attendance.student):
                sms_queued_for.append(str(attendance.student_id))

    return created, sms_queued_for


def update_attendance_record(*, attendance: Attendance, status=None, minutes_late=...):
    """
    Corrige une présence individuelle (endpoint PATCH générique).

    Lève AttendanceError 422 si la présence est verrouillée (is_locked=True).
    """
    assert_school_year_open(attendance.classe.school_year)

    if attendance.is_locked:
        raise AttendanceError(
            "Cette présence est verrouillée et ne peut plus être modifiée.",
            status_code=422,
        )

    update_fields = []
    if status is not None:
        attendance.status = status
        update_fields.append("status")
    if minutes_late is not ...:
        attendance.minutes_late = minutes_late
        update_fields.append("minutes_late")

    if update_fields:
        update_fields.append("updated_at")
        attendance.save(update_fields=update_fields)

    return attendance


def justify_attendance(*, attendance: Attendance, justification_text: str):
    """
    Justifie une absence (endpoint PATCH .../justify/) : passe le statut à
    ABSENT_JUSTIFIE et enregistre le motif.

    Lève AttendanceError 422 si la présence est verrouillée (is_locked=True).
    """
    assert_school_year_open(attendance.classe.school_year)

    if attendance.is_locked:
        raise AttendanceError(
            "Modification impossible : cet enregistrement est verrouillé "
            "(plus de 24h)",
            status_code=422,
        )

    attendance.status = Attendance.Status.ABSENT_JUSTIFIE
    attendance.justification_text = justification_text
    attendance.save(update_fields=["status", "justification_text", "updated_at"])
    return attendance
