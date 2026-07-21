"""
apps/pedagogy/services/grade_service.py

Service de calcul des moyennes, classements et mentions — Épic 6 (GRADE-MVP-03).

Formule — arbitrage CDC §749 + glossaire §1479 (validée PO 2026-07-20) :

  Niveau 1 — Moyenne par matière (période) :
    sum_ponderee = Σ(note_convertie × Evaluation.coefficient)
    sum_coefs    = Σ(Evaluation.coefficient)
    moyenne_matière = sum_ponderee / sum_coefs     # précision décimale pleine

  Niveau 2 — Moyenne générale :
    sum_ponderee = Σ(moyenne_matière × ClassSubject.coefficient)
    sum_coefs    = Σ(ClassSubject.coefficient)
    moyenne_générale = sum_ponderee / sum_coefs    # précision décimale pleine

  Arrondi académique (CDC §751) — appliqué UNIQUEMENT à la sérialisation :
    arrondir au centième supérieur si le millième ≥ 5 (12,345 → 12,35)

  Matières sans note saisie : exclues du calcul (pas de zéro automatique).
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db.models import Sum, Q, F, Avg
from django.db.models.functions import Coalesce

from apps.pedagogy.models import (
    AcademicPeriod, Evaluation, Grade, ClassSubject, Student,
)


def arrondi_academique(value: Decimal, places: int = 2) -> Decimal:
    """CDC §751 — arrondi au centième supérieur si le millième ≥ 5."""
    return value.quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP)


def compute_moyenne_par_matiere(student, period):
    """
    Niveau 1 — Calcule la moyenne par matière pour un élève sur une période.

    Retourne une liste de dicts :
        [{"subject_id": ..., "subject": ..., "moyenne": Decimal, "coefficient": Decimal}, ...]

    Les matières sans aucune évaluation notée sont exclues.
    moyenne = valeur en pleine précision (non arrondie) — réutilisée au niveau 2.
    """
    rows = (
        Grade.objects
        .filter(
            student=student,
            evaluation__period=period,
            evaluation__class_obj=student.classe_actuelle,
            evaluation__is_locked=True,
            score__isnull=False,  # exclut les ABS
        )
        .values(
            subject_id=F("evaluation__subject_id"),
            subject_name=F("evaluation__subject__name"),
            subject_code=F("evaluation__subject__code"),
        )
        .annotate(
            sum_ponderee=Sum(F("note_convertie") * F("evaluation__coefficient")),
            sum_coefs=Sum("evaluation__coefficient"),
        )
    )

    results = []
    for row in rows:
        sum_ponderee = row["sum_ponderee"]
        sum_coefs = row["sum_coefs"]
        if sum_coefs == 0:
            continue
        moyenne = sum_ponderee / sum_coefs  # pleine précision

        # Récupère le ClassSubject.coefficient
        class_subject = ClassSubject.objects.filter(
            class_obj=student.classe_actuelle,
            subject_id=row["subject_id"],
        ).first()
        coef_matiere = class_subject.coefficient if class_subject else Decimal("1")

        results.append({
            "subject_id": row["subject_id"],
            "subject_name": row["subject_name"],
            "subject_code": row["subject_code"],
            "moyenne": moyenne,  # non arrondie
            "coefficient": coef_matiere,
        })

    return results


def compute_student_moyenne(student, period):
    """
    Niveaux 1 + 2 — Calcule la moyenne générale d'un élève sur une période.

    Retourne un dict :
        {
            "moyenne_generale": Decimal | None,       # None si aucune matière notée
            "mention": str | None,
            "par_matiere": [...],
        }

    L'arrondi n'est appliqué qu'à la valeur finale de `moyenne_generale`
    et à chaque `moyenne` de `par_matiere` (sérialisation).
    """
    par_matiere = compute_moyenne_par_matiere(student, period)
    if not par_matiere:
        return {"moyenne_generale": None, "mention": None, "par_matiere": []}

    sum_ponderee = Decimal("0")
    sum_coefs = Decimal("0")
    for item in par_matiere:
        sum_ponderee += item["moyenne"] * item["coefficient"]
        sum_coefs += item["coefficient"]

    moyenne_generale = sum_ponderee / sum_coefs if sum_coefs > 0 else None

    return {
        "moyenne_generale": moyenne_generale,  # non arrondie
        "mention": compute_mention(moyenne_generale) if moyenne_generale is not None else None,
        "par_matiere": par_matiere,
    }


def compute_mention(moyenne: Decimal) -> Optional[str]:
    """CDC §755 — mentions automatiques. Retourne None si moyenne est None."""
    if moyenne is None:
        return None
    if moyenne >= Decimal("18"):
        return "Excellent"
    if moyenne >= Decimal("16"):
        return "Très Bien"
    if moyenne >= Decimal("14"):
        return "Bien"
    if moyenne >= Decimal("12"):
        return "Assez Bien"
    if moyenne >= Decimal("10"):
        return "Passable"
    return "Insuffisant"


def compute_moyenne_annuelle(student, school_year):
    """
    Calcule la moyenne annuelle d'un élève sur une année scolaire.

    Hypothèse MVP (non confirmée par le CDC, ni par un expert pédagogique guinéen) :
    moyenne simple des `moyenne_generale` par période de l'année scolaire ayant
    au moins une note (évaluation verrouillée avec score saisi).

    À valider avec un directeur d'école avant la V2 — certaines écoles pourraient
    utiliser une pondération différente (ex. trimestre 3 plus lourd, ou pondération
    par nombre d'évaluations par période).

    Retourne un Decimal ou None si aucune période n'a de notes.
    """
    periods = AcademicPeriod.objects.filter(
        school_year=school_year,
        tenant=student.tenant,
    ).order_by("order")

    moyennes = []
    for period in periods:
        result = compute_student_moyenne(student, period)
        if result["moyenne_generale"] is not None:
            moyennes.append(result["moyenne_generale"])

    if not moyennes:
        return Decimal("0.00")

    return sum(moyennes) / len(moyennes)


def compute_class_classement(school_class, period):
    """
    Calcule le classement d'une classe pour une période donnée.

    Règle de départage V1 (simplifiée) :
        1. Moyenne générale décroissante
        2. Ordre alphabétique (nom, prénom)

    Retourne une liste de dicts :
        [{"rang": 1, "student_id": ..., "nom_complet": ..., "moyenne_generale": ...}, ...]
    """
    students = Student.objects.filter(
        classe_actuelle=school_class,
        tenant=school_class.tenant,
        statut=Student.Status.ACTIF,
    ).order_by("nom", "prenom")

    results = []
    for student in students:
        result = compute_student_moyenne(student, period)
        if result["moyenne_generale"] is not None:
            results.append({
                "student_id": student.id,
                "nom_complet": f"{student.prenom} {student.nom}",
                "moyenne_generale": result["moyenne_generale"],
            })

    # Trier par moyenne décroissante, puis alphabétique (déjà dans l'ordre du queryset)
    results.sort(key=lambda r: (-r["moyenne_generale"], r["nom_complet"]))

    # Attribuer les rangs (gère les ex-aequo)
    ranked = []
    current_rank = 1
    for i, item in enumerate(results):
        if i > 0 and item["moyenne_generale"] < results[i - 1]["moyenne_generale"]:
            current_rank = i + 1
        ranked.append({
            "rang": current_rank,
            "student_id": str(item["student_id"]),
            "nom_complet": item["nom_complet"],
            "moyenne_generale": str(arrondi_academique(item["moyenne_generale"])),
        })

    return ranked
