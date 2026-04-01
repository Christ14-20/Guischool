"""
apps/pedagogy/services/grading_service.py
Logique métier : calcul de moyenne, classement, validation notes.
"""
from decimal import Decimal
from django.db.models import QuerySet


def compute_average(student_id, annee_scolaire_id, periode=None) -> dict:
    """
    Calcule la moyenne générale d'un élève pour une période/année donnée.
    La moyenne n'est JAMAIS stockée — toujours calculée à la demande.
    Formule : Σ(note_convertie × coefficient) / Σ(coefficients)
    """
    from apps.pedagogy.models import Grade

    qs = Grade.objects.filter(
        eleve_id=student_id,
        annee_scolaire_id=annee_scolaire_id,
        valide=True,
    )
    if periode:
        qs = qs.filter(periode=periode)

    total_weighted = Decimal("0")
    total_coeff = Decimal("0")

    for grade in qs:
        total_weighted += grade.note_convertie * grade.coefficient
        total_coeff += grade.coefficient

    if total_coeff == 0:
        return {"moyenne": None, "nb_matieres": 0, "message": "Aucune note validée."}

    moyenne = round(total_weighted / total_coeff, 2)
    return {
        "moyenne": float(moyenne),
        "nb_matieres": qs.values("matiere").distinct().count(),
        "total_coeff": float(total_coeff),
    }


def compute_class_ranking(classe_id, annee_scolaire_id, periode=None) -> list:
    """
    Classement des élèves d'une classe pour une période donnée.
    Retourne une liste triée par moyenne décroissante.
    """
    from apps.pedagogy.models import Student, Enrollment

    enrollments = Enrollment.objects.filter(
        classe_id=classe_id,
        annee_scolaire_id=annee_scolaire_id,
        eleve__statut="ACTIF",
    ).select_related("eleve")

    rankings = []
    for enrollment in enrollments:
        result = compute_average(enrollment.eleve_id, annee_scolaire_id, periode)
        rankings.append({
            "eleve_id": str(enrollment.eleve_id),
            "nom": enrollment.eleve.nom,
            "prenom": enrollment.eleve.prenom,
            "matricule": enrollment.eleve.matricule,
            **result,
        })

    # Trier par moyenne décroissante (None → fin de liste)
    rankings.sort(key=lambda x: x["moyenne"] or -1, reverse=True)
    for i, r in enumerate(rankings, start=1):
        r["rang"] = i if r["moyenne"] is not None else None

    return rankings


def validate_grade(grade_id, user_id, justification: str = "") -> dict:
    """
    Valide une note (brouillon → validée).
    Réservé à ADMIN_SCHOOL. Justification obligatoire si note déjà validée.
    """
    from apps.pedagogy.models import Grade
    from apps.authentication.models import User

    grade = Grade.objects.get(id=grade_id)
    if grade.valide:
        if not justification:
            return {"ok": False, "error": "Justification obligatoire pour modifier une note validée."}
        grade.justification_modification = justification

    grade.valide = True
    grade.saisie_par_id = user_id
    grade.save(update_fields=["valide", "justification_modification", "saisie_par_id", "updated_at"])
    return {"ok": True, "grade_id": str(grade_id)}
