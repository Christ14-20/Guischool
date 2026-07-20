from django.db import transaction

from apps.pedagogy.models import MatriculeSequence, SchoolYear
from apps.superadmin.models import Tenant


def generate_matricule(tenant: Tenant, school_year: SchoolYear) -> str:
    """
    Génère un matricule unique au format {ANNEE}-{SEQ:05d}.

    Le compteur est propre à chaque (tenant, school_year) et remis à zéro
    chaque année. Le verrou SELECT ... FOR UPDATE sur MatriculeSequence
    empêche toute collision en cas d'inscriptions concurrentes.

    L'ANNEE utilisée est l'année de début de la SchoolYear (label "2025-2026"
    → préfixe "2025"), pour rester stable même si le label change de forme.
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
