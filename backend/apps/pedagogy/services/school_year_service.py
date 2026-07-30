from django.db import transaction
from django.db.models import Q
from rest_framework import status as drf_status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.pedagogy.models import Level, SchoolYear, AcademicPeriod, Subject


class SchoolYearError(APIException):
    """
    Erreur liée au cycle de vie d'une année scolaire (clôture, écriture refusée
    sur une année clôturée). Sous-classe de APIException (et non un simple
    Exception, contrairement à EnrollmentError/AttendanceError) afin que le
    handler DRF global (core.exceptions.custom_exception_handler) la formate
    automatiquement en 422 partout où assert_school_year_open() est appelée,
    sans avoir à dupliquer un bloc try/except à chacun des points d'écriture.
    """

    status_code = drf_status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = (
        "Cette année scolaire est clôturée : aucune écriture n'est autorisée."
    )
    default_code = "school_year_closed"


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


def assert_school_year_open(school_year: SchoolYear) -> None:
    """
    Point d'entrée central : lève SchoolYearError (422) si l'année scolaire
    est clôturée. Tout endpoint qui écrit une ressource rattachée directement
    ou indirectement à une SchoolYear doit passer par ici plutôt que
    réimplémenter la vérification (cf. les trois bugs de résolution d'année
    trouvés séparément en Épic 7 — SCHOOLYEAR-V2-01).
    """
    if not check_year_is_open(school_year):
        raise SchoolYearError()


def get_current_school_year(tenant) -> SchoolYear:
    """
    Point de résolution central de l'année scolaire courante d'un tenant
    (SCHOOLYEAR-V2-02). Toute vue qui a besoin de résoudre l'année courante
    par défaut doit passer par ici — jamais de requête `is_current=True`
    réimplémentée localement (cf. les trois bugs de résolution d'année
    trouvés séparément en Épic 7, avant SCHOOLYEAR-V2-01/02).

    Lève SchoolYearError (422) si aucune année n'est marquée courante,
    plutôt que de laisser un None se propager silencieusement.
    """
    school_year = SchoolYear.objects.filter(tenant=tenant, is_current=True).first()
    if school_year is None:
        raise SchoolYearError(
            "Aucune année scolaire courante n'est définie — contactez votre Directeur."
        )
    return school_year


def resolve_school_year(*, tenant, user, explicit: SchoolYear | None = None) -> SchoolYear:
    """
    Point de résolution central « défaut année courante + override » utilisé
    par tous les endpoints listés en SCHOOLYEAR-V2-02 dont le champ
    `school_year`/`school_year_id` devient optionnel.

    - `explicit` absent (None) → année courante (get_current_school_year,
      lève SchoolYearError 422 si aucune année n'est courante — c'est le seul
      chemin où l'absence d'année courante est bloquante).
    - `explicit` fourni et identique à l'année courante → accepté silencieusement,
      ce n'est pas un contournement réel (décision PO 2026-07-29).
    - `explicit` fourni et différent (ou aucune année courante définie du tout)
      → réservé aux utilisateurs disposant de la permission
      `pedagogy:override:schoolyear` (403 sinon). Un DIRECTOR habilité peut
      ainsi choisir explicitement une année même avant qu'aucune ne soit
      marquée courante (ex. configuration initiale) — l'absence d'année
      courante ne doit bloquer que la résolution du défaut, jamais un choix
      explicite déjà autorisé.

    La résolution de l'identifiant brut vers une instance SchoolYear (et son
    scoping tenant) reste à la charge de chaque serializer appelant, cohérent
    avec le style de validation déjà en place — cette fonction ne fait que la
    politique défaut/override, pas le lookup.
    """
    if explicit is None:
        return get_current_school_year(tenant)

    current = SchoolYear.objects.filter(tenant=tenant, is_current=True).first()
    if current is not None and explicit.id == current.id:
        return explicit

    if not user.can("pedagogy:override:schoolyear"):
        raise PermissionDenied(
            "Seul un Directeur peut choisir une année scolaire différente de "
            "l'année scolaire courante."
        )
    return explicit


def close_school_year(school_year: SchoolYear) -> SchoolYear:
    """
    Clôture une année scolaire (status -> CLOSED).

    Ne modifie jamais is_current : la bascule vers une autre année "courante"
    reste une action explicite et distincte du Directeur (set_current_school_year).
    Aucune contrainte sur is_current n'est imposée ici : une année abandonnée
    en PREPARATION, jamais rendue courante, doit pouvoir être clôturée.
    """
    if school_year.status == SchoolYear.Status.CLOSED:
        raise SchoolYearError("Cette année scolaire est déjà clôturée.")

    periods = list(AcademicPeriod.objects.filter(school_year=school_year))
    if not periods:
        raise SchoolYearError(
            "Aucune période académique n'est configurée pour cette année — "
            "vérifiez la configuration avant de clôturer."
        )

    unclosed = [p for p in periods if not p.is_closed]
    if unclosed:
        names = ", ".join(p.name for p in unclosed)
        raise SchoolYearError(
            f"{len(unclosed)} période(s) académique(s) ne sont pas encore "
            f"clôturée(s) ({names})."
        )

    school_year.status = SchoolYear.Status.CLOSED
    school_year.save(update_fields=["status", "updated_at"])
    return school_year


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
