from django.db import models
from core.models import TenantScopedModel


class Level(TenantScopedModel):
    class Cycle(models.TextChoices):
        PRIMAIRE = "PRIMAIRE", "Primaire"
        COLLEGE = "COLLEGE", "Collège"
        LYCEE = "LYCEE", "Lycée"

    cycle = models.CharField(max_length=20, choices=Cycle.choices)
    name = models.CharField(max_length=50)
    order_index = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["order_index"]

    def __str__(self):
        return self.name


class SchoolYear(TenantScopedModel):
    class Status(models.TextChoices):
        PREPARATION = "PREPARATION", "Préparation"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Clôturée"

    label = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PREPARATION
    )
    is_current = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "label"],
                name="uniq_schoolyear_label_per_tenant",
            ),
        ]

    def __str__(self):
        return f"{self.label} ({self.get_status_display()})"


class AcademicPeriod(TenantScopedModel):
    class PeriodType(models.TextChoices):
        TRIMESTRE = "TRIMESTRE", "Trimestre"
        SEMESTRE = "SEMESTRE", "Semestre"

    school_year = models.ForeignKey(
        SchoolYear, on_delete=models.CASCADE, related_name="periods"
    )
    name = models.CharField(max_length=50)
    type = models.CharField(
        max_length=20, choices=PeriodType.choices, default=PeriodType.TRIMESTRE
    )
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.PositiveSmallIntegerField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["school_year", "order"],
                name="uniq_period_order_per_year",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.school_year.label})"
