from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
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


class SchoolClass(TenantScopedModel):
    school_year = models.ForeignKey(
        SchoolYear, on_delete=models.CASCADE, related_name="classes"
    )
    level = models.ForeignKey(
        Level, on_delete=models.PROTECT, related_name="classes"
    )
    name = models.CharField(max_length=50)
    capacity = models.PositiveSmallIntegerField(default=60)
    room = models.CharField(max_length=50, blank=True)
    main_teacher = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classes_as_main_teacher",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school_year", "name"],
                name="uniq_class_name_per_year",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.school_year.label})"

    @property
    def current_headcount(self) -> int:
        """
        Retourne le nombre d'élèves actifs dans cette classe.
        ÉPIC 3 : retourne 0 — le modèle Student n'existe pas encore.
        ÉPIC 4 : remplacer par :
            return self.students.filter(status=Student.Status.ACTIF).count()
        TODO Épic 4 : brancher le vrai calcul Student
        """
        return 0


class Subject(TenantScopedModel):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, blank=True)
    is_official = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "code"],
                name="uniq_subject_code_per_tenant",
            ),
        ]
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class ClassSubject(TenantScopedModel):
    class_obj = models.ForeignKey(
        SchoolClass, on_delete=models.CASCADE, related_name="class_subjects"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.PROTECT, related_name="class_subjects"
    )
    coefficient = models.DecimalField(
        max_digits=3, decimal_places=1, default=Decimal("1"),
        validators=[MinValueValidator(Decimal("0.0")), MaxValueValidator(Decimal("99.9"))],
    )
    weekly_hours = models.DecimalField(
        max_digits=3, decimal_places=1, default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0.0")), MaxValueValidator(Decimal("99.9"))],
    )
    teacher = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_subjects_taught",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["class_obj", "subject"],
                name="uniq_subject_per_class",
            ),
        ]

    def __str__(self):
        return f"{self.class_obj.name} / {self.subject.code}"


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
