"""
apps/pedagogy/services/enrollment_service.py
Logique métier : inscription, réinscription, validations métier.
"""
import re
from django.core.exceptions import ValidationError


GUINEE_PHONE_REGEX = re.compile(r"^\+224[0-9]{8,9}$")


def validate_enrollment_data(student_data: dict, classe, annee_scolaire) -> None:
    """
    Valide les données d'inscription selon les règles métier :
    - Année scolaire OUVERTE ou EN_COURS
    - Capacité classe non atteinte
    - Téléphone tuteur format +224...
    - Pas de doublon nom/prénom/date_naissance dans l'école
    """
    from apps.pedagogy.models import Student

    # 1. Année scolaire active
    if annee_scolaire.status not in ("OUVERTE", "EN_COURS"):
        raise ValidationError(
            "L'inscription n'est possible que sur une année scolaire OUVERTE ou EN_COURS."
        )

    # 2. Capacité classe
    if classe.is_full():
        raise ValidationError(
            f"La classe '{classe.name}' a atteint sa capacité maximale ({classe.capacity} élèves)."
        )

    # 3. Téléphone tuteur
    phone = student_data.get("tuteur_telephone", "")
    if not GUINEE_PHONE_REGEX.match(phone):
        raise ValidationError(
            {"tuteur_telephone": "Le téléphone tuteur doit être au format +224XXXXXXXXX."}
        )

    # 4. Doublon élève (même nom + prénom + date_naissance dans la même école)
    tenant_id = classe.tenant_id
    doublon_qs = Student.objects.filter(
        tenant_id=tenant_id,
        nom__iexact=student_data.get("nom", ""),
        prenom__iexact=student_data.get("prenom", ""),
        date_naissance=student_data.get("date_naissance"),
    )
    if doublon_qs.exists():
        raise ValidationError(
            "Un élève avec le même nom, prénom et date de naissance existe déjà dans cette école."
        )


def check_reinscription_conditions(student, annee_scolaire_cible) -> None:
    """
    Vérifie les conditions pour réinscrire un élève :
    - Statut ACTIF, ADMIS ou REDOUBLE
    - Année cible OUVERTE
    - Décision de fin d'année précédente validée
    """
    from apps.pedagogy.models import YearEndDecision, Enrollment

    if student.statut not in ("ACTIF",):
        raise ValidationError(
            f"L'élève ne peut pas être réinscrit (statut : {student.statut})."
        )
    if annee_scolaire_cible.status != "OUVERTE":
        raise ValidationError("L'année scolaire cible doit être en statut OUVERTE.")

    # Vérifier décision de l'année précédente
    last_decision = YearEndDecision.objects.filter(
        eleve=student
    ).order_by("-date_decision").first()

    if last_decision and last_decision.decision not in ("ADMIS", "REDOUBLE", "ORIENTE"):
        raise ValidationError(
            f"La décision de fin d'année ({last_decision.get_decision_display()}) "
            "ne permet pas la réinscription."
        )
