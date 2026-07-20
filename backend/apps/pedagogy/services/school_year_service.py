from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.pedagogy.models import Level, SchoolYear, AcademicPeriod, Subject


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
    Une année scolaire est « ouverte » à la saisie (inscriptions, notes, présences)
    tant qu'elle n'est pas clôturée (cf. Backlog STRUCT-01 : blocage uniquement si CLOSED).
    Les statuts PREPARATION et ACTIVE autorisent donc les inscriptions.
    """
    return school_year.status != SchoolYear.Status.CLOSED


STANDARD_LEVELS = [
    ("CP1", Level.Cycle.PRIMAIRE, 1),
    ("CP2", Level.Cycle.PRIMAIRE, 2),
    ("CE1", Level.Cycle.PRIMAIRE, 3),
    ("CE2", Level.Cycle.PRIMAIRE, 4),
    ("CM1", Level.Cycle.PRIMAIRE, 5),
    ("CM2", Level.Cycle.PRIMAIRE, 6),
    ("6ème", Level.Cycle.COLLEGE, 7),
    ("5ème", Level.Cycle.COLLEGE, 8),
    ("4ème", Level.Cycle.COLLEGE, 9),
    ("3ème", Level.Cycle.COLLEGE, 10),
    ("2nde", Level.Cycle.LYCEE, 11),
    ("1ère", Level.Cycle.LYCEE, 12),
    ("Terminale", Level.Cycle.LYCEE, 13),
]


STANDARD_SUBJECTS = [
    ("FR", "Français", "Langue"),
    ("MATH", "Mathématiques", "Scientifique"),
    ("PC", "Physique-Chimie", "Scientifique"),
    ("SVT", "Sciences de la Vie et de la Terre", "Scientifique"),
    ("HG", "Histoire-Géographie", "Humaines"),
    ("ANG", "Anglais", "Langue"),
    ("EPS", "Éducation Physique et Sportive", "Sport"),
    ("EMC", "Enseignement Moral et Civique", "Civique"),
    ("PHILO", "Philosophie", "Humaines"),
    ("TIC", "Technologies de l'Information", "Technique"),
]


def seed_standard_subjects_for_tenant(tenant) -> list[Subject]:
    """
    Crée les ~10 matières standards guinéennes pour un tenant donné.
    Appelé automatiquement à la création d'une école (create_school).
    Ignore les matières déjà existantes (idempotent).
    Retourne la liste des matières créées.
    """
    created = []
    for code, name, category in STANDARD_SUBJECTS:
        subject, was_created = Subject.objects.get_or_create(
            tenant=tenant,
            code=code,
            defaults={"name": name, "category": category, "is_official": True},
        )
        if was_created:
            created.append(subject)
    return created


def seed_standard_levels_for_tenant(tenant) -> list[Level]:
    """
    Crée les 13 niveaux standards guinéens pour un tenant donné.
    Appelé automatiquement à la création d'une école (create_school).
    Ignore les niveaux déjà existants (idempotent).
    Retourne la liste des niveaux créés.
    """
    created = []
    for name, cycle, order in STANDARD_LEVELS:
        level, was_created = Level.objects.get_or_create(
            tenant=tenant,
            name=name,
            defaults={"cycle": cycle, "order_index": order},
        )
        if was_created:
            created.append(level)
    return created
