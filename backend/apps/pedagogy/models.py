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
        """Nombre d'élèves actifs rattachés à cette classe (classe_actuelle)."""
        return self.students.filter(statut=Student.Status.ACTIF).count()


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


class Student(TenantScopedModel):
    class Sexe(models.TextChoices):
        M = "M", "Masculin"
        F = "F", "Féminin"

    class Status(models.TextChoices):
        ACTIF = "ACTIF", "Actif"
        SUSPENDU = "SUSPENDU", "Suspendu"
        TRANSFERE = "TRANSFERE", "Transféré"
        SORTI = "SORTI", "Sorti"
        ARCHIVE = "ARCHIVE", "Archivé"

    matricule = models.CharField(max_length=20, db_index=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=150)
    date_naissance = models.DateField()
    lieu_naissance = models.CharField(max_length=150, blank=True)
    sexe = models.CharField(max_length=1, choices=Sexe.choices)
    photo = models.URLField(blank=True)
    classe_actuelle = models.ForeignKey(
        SchoolClass,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )
    annee_inscription = models.ForeignKey(
        SchoolYear,
        on_delete=models.PROTECT,
        related_name="students_first_enrolled",
    )
    statut = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIF, db_index=True
    )
    created_by = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="students_created",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "matricule"],
                name="uniq_matricule_per_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "statut"]),
            models.Index(fields=["nom", "prenom", "date_naissance"]),
        ]

    def __str__(self):
        return f"{self.matricule} — {self.prenom} {self.nom}"


class Enrollment(TenantScopedModel):
    class TypeInscription(models.TextChoices):
        NOUVELLE = "NOUVELLE_INSCRIPTION", "Nouvelle inscription"
        REINSCRIPTION = "REINSCRIPTION", "Réinscription"
        TRANSFERT = "TRANSFERT_ENTRANT", "Transfert entrant"

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="enrollments"
    )
    classe = models.ForeignKey(
        SchoolClass, on_delete=models.PROTECT, related_name="enrollments"
    )
    school_year = models.ForeignKey(
        SchoolYear, on_delete=models.PROTECT, related_name="enrollments"
    )
    type_inscription = models.CharField(
        max_length=25, choices=TypeInscription.choices
    )
    date_inscription = models.DateField(auto_now_add=True)
    inscrit_par = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="enrollments_created",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "school_year"],
                name="uniq_enrollment_per_year",
            ),
        ]

    def __str__(self):
        return f"{self.student.matricule} → {self.classe.name} ({self.school_year.label})"


class MatriculeSequence(TenantScopedModel):
    """
    Compteur de matricule par (tenant, school_year).

    Verrouillé via SELECT ... FOR UPDATE dans le service d'inscription
    pour éviter les collisions en cas d'inscriptions concurrentes.
    Le matricule final est au format {ANNEE}-{SEQ:05d}.
    """

    school_year = models.ForeignKey(
        SchoolYear, on_delete=models.CASCADE, related_name="matricule_sequences"
    )
    last_seq = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "school_year"],
                name="uniq_matricule_sequence_per_year",
            ),
        ]

    def __str__(self):
        return f"{self.school_year.label} → {self.last_seq}"


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
