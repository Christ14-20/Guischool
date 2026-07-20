from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.pedagogy.models import SchoolYear, AcademicPeriod


def set_current_school_year(school_year: SchoolYear) -> SchoolYear:
    """
    Définit une année scolaire comme 'courante' (is_current=True) de manière atomique.
    Passe is_current=False sur toutes les autres années du même tenant.
    """
    with transaction.atomic():
        SchoolYear.objects.filter(tenant=school_year.tenant, is_current=True).exclude(
            id=school_year.id
        ).update(is_current=False)
        school_year.is_current = True
        school_year.save(update_fields=["is_current", "updated_at"])
    return school_year


def validate_no_period_overlap(
    school_year: SchoolYear,
    start_date,
    end_date,
    exclude_period_id=None,
):
    """
    Vérifie qu'une période ne chevauche pas une période existante dans la même année scolaire.
    Lève DRFValidationError en cas de chevauchement.
    """
    qs = AcademicPeriod.objects.filter(school_year=school_year)
    if exclude_period_id:
        qs = qs.exclude(id=exclude_period_id)

    overlapping = qs.filter(
        Q(start_date__lte=end_date, end_date__gte=start_date)
    ).first()

    if overlapping:
        raise DRFValidationError(
            {
                "non_field_errors": [
                    f"Cette période chevauche {overlapping.name} existant "
                    f"({overlapping.start_date} - {overlapping.end_date})"
                ]
            }
        )


def close_period(period: AcademicPeriod) -> AcademicPeriod:
    """
    Clôture une période académique.
    TODO Épic 6 : avant clôture, vérifier qu'aucune évaluation n'est non verrouillée
    sur cette période. Si des évaluations sont encore ouvertes, lever une erreur 422
    avec le message du contrat d'API §3 :
        "{n} évaluation(s) non verrouillée(s) empêchent la clôture"
    """
    period.is_closed = True
    period.save(update_fields=["is_closed", "updated_at"])
    return period


def check_period_is_open(period: AcademicPeriod) -> bool:
    """
    TODO Épic 4/5/6 : utilitaire de vérification de période ouverte.
    Actuellement non appelé — retourne True.
    À brancher sur les endpoints de saisie (présences, notes, inscriptions)
    pour bloquer toute écriture si is_closed=True.
    """
    return not period.is_closed


def check_year_is_open(school_year: SchoolYear) -> bool:
    """
    TODO Épic 4/5/6 : utilitaire de vérification d'année scolaire ouverte.
    Actuellement non appelé — retourne True.
    À brancher sur les endpoints de saisie.
    """
    return school_year.status == SchoolYear.Status.ACTIVE
