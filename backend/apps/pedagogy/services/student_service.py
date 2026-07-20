from django.db import transaction

from apps.pedagogy.models import (
    MatriculeSequence,
    SchoolYear,
    SchoolClass,
    Student,
    Guardian,
    Enrollment,
)
from apps.superadmin.models import Tenant


class EnrollmentError(Exception):
    """
    Erreur métier d'inscription porteuse d'un code HTTP et d'un payload optionnel.

    - status_code : 409 (doublon), 422 (capacité / année non ouverte / plan)
    - errors : dict optionnel (ex. duplicate_candidate) inséré dans la réponse
    """

    def __init__(self, message: str, status_code: int, errors: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors


def generate_matricule(tenant: Tenant, school_year: SchoolYear) -> str:
    """
    Génère un matricule unique au format {ANNEE}-{SEQ:05d}.

    Le compteur est propre à chaque (tenant, school_year) et remis à zéro
    chaque année. Le verrou SELECT ... FOR UPDATE sur MatriculeSequence
    empêche toute collision en cas d'inscriptions concurrentes.
    """
    annee = school_year.start_date.year

    with transaction.atomic():
        sequence, _ = MatriculeSequence.objects.select_for_update().get_or_create(
            tenant=tenant,
            school_year=school_year,
            defaults={"last_seq": 0},
        )
        sequence.last_seq += 1
        sequence.save(update_fields=["last_seq", "updated_at"])
        seq = sequence.last_seq

    return f"{annee}-{seq:05d}"


def find_duplicate_candidate(tenant, nom, prenom, date_naissance):
    """
    Recherche un élève existant avec nom + prénom + date de naissance identiques
    (insensible à la casse pour nom/prénom). Retourne le premier Student trouvé
    ou None. Ne bloque pas : sert d'avertissement (409) contournable par force=true.
    """
    return (
        Student.objects.filter(
            tenant=tenant,
            nom__iexact=nom,
            prenom__iexact=prenom,
            date_naissance=date_naissance,
        )
        .order_by("created_at")
        .first()
    )


@transaction.atomic
def enroll_student(
    *,
    tenant,
    created_by,
    nom,
    prenom,
    date_naissance,
    sexe,
    classe: SchoolClass,
    school_year: SchoolYear,
    type_inscription: str,
    guardian_data: dict,
    lieu_naissance: str = "",
    force: bool = False,
) -> Student:
    """
    Inscription transactionnelle : Student + Guardian + Enrollment initial.

    Validations (dans l'ordre du contrat §4) :
    - année scolaire ouverte (422)          → check_year_is_open
    - doublon probable (409, sauf force)    → find_duplicate_candidate
    - limite de plan atteinte (422)         → Tenant.get_student_count
    - capacité de classe atteinte (422)     → SchoolClass.current_headcount

    Le téléphone du tuteur est validé en amont par le serializer (400).
    """
    from apps.pedagogy.services.school_year_service import check_year_is_open

    if not check_year_is_open(school_year):
        raise EnrollmentError(
            "L'inscription n'est possible que sur une année scolaire ouverte",
            status_code=422,
        )

    if not force:
        candidate = find_duplicate_candidate(tenant, nom, prenom, date_naissance)
        if candidate is not None:
            raise EnrollmentError(
                "Un élève avec des informations similaires existe déjà",
                status_code=409,
                errors={
                    "duplicate_candidate": {
                        "id": str(candidate.id),
                        "matricule": candidate.matricule,
                        "similarity": "nom+prenom+date_naissance identiques",
                    }
                },
            )

    plan = tenant.plan
    if plan and tenant.get_student_count() >= plan.max_students:
        raise EnrollmentError(
            f"La limite d'élèves du plan est atteinte ({plan.max_students})",
            status_code=422,
        )

    if classe.current_headcount >= classe.capacity:
        raise EnrollmentError(
            f"La classe {classe.name} a atteint sa capacité maximale "
            f"({classe.current_headcount}/{classe.capacity})",
            status_code=422,
        )

    matricule = generate_matricule(tenant, school_year)

    student = Student.objects.create(
        tenant=tenant,
        matricule=matricule,
        nom=nom,
        prenom=prenom,
        date_naissance=date_naissance,
        lieu_naissance=lieu_naissance,
        sexe=sexe,
        classe_actuelle=classe,
        annee_inscription=school_year,
        created_by=created_by,
    )

    Guardian.objects.create(
        tenant=tenant,
        student=student,
        lien=guardian_data["lien"],
        nom_complet=guardian_data["nom_complet"],
        telephone=guardian_data["telephone"],
        email=guardian_data.get("email", ""),
        is_contact_urgence=guardian_data.get("is_contact_urgence", True),
    )

    Enrollment.objects.create(
        tenant=tenant,
        student=student,
        classe=classe,
        school_year=school_year,
        type_inscription=type_inscription,
        inscrit_par=created_by,
    )

    return student
