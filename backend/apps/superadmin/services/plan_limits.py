from rest_framework.exceptions import ValidationError


def _limit_exceeded(limit, current_count):
    return limit and current_count >= limit


def ensure_student_limit_available(tenant):
    plan = getattr(tenant, "plan", None)
    if not plan:
        return

    current_count = tenant.students.count()
    if _limit_exceeded(plan.max_students, current_count):
        raise ValidationError({
            "max_students": (
                f"Limite du plan atteinte : {current_count}/{plan.max_students} élèves. "
                "Veuillez changer de plan avant de créer un nouvel élève."
            )
        })


def ensure_campus_limit_available(tenant):
    plan = getattr(tenant, "plan", None)
    if not plan:
        return

    current_count = tenant.campuses.count()
    if _limit_exceeded(plan.max_campuses, current_count):
        raise ValidationError({
            "max_campuses": (
                f"Limite du plan atteinte : {current_count}/{plan.max_campuses} campus. "
                "Veuillez changer de plan avant de créer un nouveau campus."
            )
        })
