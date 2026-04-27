"""
apps/pedagogy/models.py
Modèles : SchoolYear, Level, Class, Subject, ClassSubject,
          Attendance, Evaluation, Grade (module parent 4),
          Student, Enrollment, YearEndDecision (module 4.5)
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


# ─────────────────────────────────────────────────────────────────────
# Module Pédagogie de base (Section 4 CDC)
# ─────────────────────────────────────────────────────────────────────

class SchoolYear(models.Model):
    STATUS_CHOICES = [
        ("PREPARATION", "En préparation"),
        ("OUVERTE", "Ouverte aux inscriptions"),
        ("EN_COURS", "En cours"),
        ("CLOTURE_EN_COURS", "Clôture en cours"),
        ("CLOTUREE", "Clôturée"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="school_years")
    label = models.CharField(max_length=20, help_text="Ex: 2025-2026")
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PREPARATION")
    is_current = models.BooleanField(default=False)

    class Meta:
        unique_together = [("tenant", "label")]
        verbose_name = "Année scolaire"
        verbose_name_plural = "Années scolaires"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.tenant.name} — {self.label}"

    def save(self, *args, **kwargs):
        # Une seule année courante par tenant
        if self.is_current:
            SchoolYear.objects.filter(tenant=self.tenant, is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Level(models.Model):
    CYCLE_CHOICES = [
        ("PRIMAIRE", "Primaire"),
        ("COLLEGE", "Collège"),
        ("LYCEE", "Lycée"),
        ("SUPERIEUR", "Supérieur"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="levels")
    cycle = models.CharField(max_length=20, choices=CYCLE_CHOICES)
    name = models.CharField(max_length=50, help_text="Ex: 6ème, Terminale S")
    order_index = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = [("tenant", "cycle", "name")]
        ordering = ["cycle", "order_index"]
        verbose_name = "Niveau"

    def __str__(self):
        return f"{self.name} ({self.get_cycle_display()})"


class Class(models.Model):
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="classes")
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name="classes")
    level = models.ForeignKey(Level, on_delete=models.PROTECT, related_name="classes")
    name = models.CharField(max_length=100, help_text="Ex: 6ème A")
    capacity = models.PositiveSmallIntegerField(default=60)
    room = models.CharField(max_length=50, blank=True)
    main_teacher = models.ForeignKey(
        "authentication.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="main_classes",
    )

    class Meta:
        unique_together = [("tenant", "school_year", "name")]
        verbose_name = "Classe"
        ordering = ["school_year", "level__order_index", "name"]

    def __str__(self):
        return f"{self.name} ({self.school_year.label})"

    def current_enrollment_count(self):
        return self.enrollments.filter(annee_scolaire=self.school_year).count()

    def is_full(self):
        return self.current_enrollment_count() >= self.capacity


class Subject(models.Model):
    CATEGORY_CHOICES = [
        ("SCIENTIFIC", "Sciences"),
        ("LITERARY", "Littéraire"),
        ("ARTISTIC", "Artistique"),
        ("PHYSICAL", "Éducation physique"),
        ("CIVIC", "Éducation civique"),
        ("OTHER", "Autre"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="subjects")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="OTHER")
    is_official = models.BooleanField(default=True)

    class Meta:
        unique_together = [("tenant", "code")]
        verbose_name = "Matière"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class ClassSubject(models.Model):
    """Association matière ↔ classe avec coefficient et enseignant."""
    classe = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="class_subjects")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="class_subjects")
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1)
    weekly_hours = models.PositiveSmallIntegerField(default=0)
    teacher = models.ForeignKey(
        "authentication.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="taught_subjects",
    )

    class Meta:
        unique_together = [("classe", "subject")]
        verbose_name = "Matière de classe"

    def __str__(self):
        return f"{self.classe.name} — {self.subject.name} (coeff {self.coefficient})"


class TimetableSlot(models.Model):
    DAY_CHOICES = [(str(i), d) for i, d in enumerate(
        ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"], start=1
    )]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="timetable_slots")
    classe = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="timetable_slots")
    teacher = models.ForeignKey("authentication.User", on_delete=models.CASCADE, related_name="timetable_slots")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="timetable_slots")
    room = models.CharField(max_length=50, blank=True)
    day_of_week = models.CharField(max_length=1, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_recurring = models.BooleanField(default=True)
    specific_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Créneau horaire"


class Attendance(models.Model):
    STATUS_CHOICES = [
        ("PRESENT", "Présent"),
        ("ABSENT", "Absent"),
        ("ABSENT_JUSTIFIED", "Absent justifié"),
        ("LATE", "En retard"),
        ("EXCLUDED", "Exclu"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="attendances")
    student = models.ForeignKey("pedagogy.Student", on_delete=models.CASCADE, related_name="attendances")
    classe = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="attendances")
    subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL, related_name="attendances")
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    minutes_late = models.PositiveSmallIntegerField(default=0)
    justification = models.TextField(blank=True)
    justified_by = models.ForeignKey(
        "authentication.User", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="justified_attendances",
    )
    created_by = models.ForeignKey(
        "authentication.User", on_delete=models.PROTECT, related_name="created_attendances",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Présence"


class Evaluation(models.Model):
    TYPE_CHOICES = [
        ("CC", "Contrôle continu"),
        ("DS", "Devoir surveillé"),
        ("TP", "Travaux pratiques"),
        ("PARTICIPATION", "Participation"),
        ("ORAL", "Oral"),
        ("EXAMEN", "Examen"),
    ]
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="evaluations")
    classe = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="evaluations")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="evaluations")
    teacher = models.ForeignKey("authentication.User", on_delete=models.PROTECT, related_name="evaluations")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1)
    date = models.DateField()
    deadline = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Évaluation"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.title} — {self.classe.name}"


# ─────────────────────────────────────────────────────────────────────
# Module 4.5 : Gestion Élèves & Notes
# ─────────────────────────────────────────────────────────────────────

class Student(models.Model):
    SEXE_CHOICES = [("M", "Masculin"), ("F", "Féminin")]
    STATUS_CHOICES = [
        ("ACTIF", "Actif"),
        ("SUSPENDU", "Suspendu"),
        ("TRANSFERE", "Transféré"),
        ("SORTI", "Sorti"),
        ("ARCHIVE", "Archivé"),
    ]
    TUTEUR_LIEN_CHOICES = [
        ("PERE", "Père"),
        ("MERE", "Mère"),
        ("TUTEUR", "Tuteur légal"),
        ("AUTRE", "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="students")

    # Matricule unique par école/année
    matricule = models.CharField(max_length=20, blank=True, verbose_name="Matricule")

    # Informations personnelles
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=150)
    date_naissance = models.DateField()
    lieu_naissance = models.CharField(max_length=150, blank=True)
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES)
    photo = models.ImageField(upload_to="students/photos/", null=True, blank=True)

    # Tuteur légal
    tuteur_nom = models.CharField(max_length=200)
    tuteur_telephone = models.CharField(max_length=20, help_text="Format: +224XXXXXXXXX")
    tuteur_email = models.EmailField(blank=True)
    tuteur_lien = models.CharField(max_length=20, choices=TUTEUR_LIEN_CHOICES, default="PERE")
    contact_provisoire = models.BooleanField(default=False)

    # Scolarité
    classe_actuelle = models.ForeignKey(
        Class, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="students",
    )
    annee_inscription = models.ForeignKey(
        SchoolYear, on_delete=models.PROTECT, related_name="new_students",
    )
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIF")

    # Audit
    created_by = models.ForeignKey(
        "authentication.User", on_delete=models.PROTECT, related_name="created_students",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("tenant", "matricule")]
        verbose_name = "Élève"
        verbose_name_plural = "Élèves"
        ordering = ["nom", "prenom"]

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.matricule})"

    # ── Génération du matricule ─────────────────────────────────────
    def generate_matricule(self):
        """Format : {ANNEE_DEBUT}-{SEQ:05d} unique par tenant/année."""
        year = self.annee_inscription.start_date.year
        # Compter les élèves existants pour cette école + cette année
        count = Student.objects.filter(
            tenant=self.tenant,
            annee_inscription=self.annee_inscription,
        ).count() + 1
        return f"{year}-{count:05d}"

    def save(self, *args, **kwargs):
        if not self.matricule:
            self.matricule = self.generate_matricule()
            # Assurer l'unicité en cas de concurrence
            while Student.objects.filter(tenant=self.tenant, matricule=self.matricule).exists():
                seq = int(self.matricule.split("-")[1]) + 1
                year = self.annee_inscription.start_date.year
                self.matricule = f"{year}-{seq:05d}"
        super().save(*args, **kwargs)


class Enrollment(models.Model):
    TYPE_CHOICES = [
        ("NOUVELLE_INSCRIPTION", "Nouvelle inscription"),
        ("REINSCRIPTION", "Réinscription"),
        ("TRANSFERT_ENTRANT", "Transfert entrant"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    classe = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="enrollments")
    annee_scolaire = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="enrollments")
    type_inscription = models.CharField(max_length=25, choices=TYPE_CHOICES, default="NOUVELLE_INSCRIPTION")
    date_inscription = models.DateField(auto_now_add=True)
    inscrit_par = models.ForeignKey("authentication.User", on_delete=models.PROTECT, related_name="enrollments_made")
    frais_payes = models.BooleanField(default=False)
    observations = models.TextField(blank=True)

    class Meta:
        unique_together = [("eleve", "annee_scolaire")]
        verbose_name = "Inscription"
        ordering = ["-date_inscription"]

    def __str__(self):
        return f"{self.eleve} — {self.annee_scolaire.label} ({self.type_inscription})"


class Grade(models.Model):
    """
    Note d'un élève — stocke la valeur brute + barème.
    note_convertie est calculée automatiquement (toujours ramenée sur 20).
    """
    PERIODE_CHOICES = [
        ("TRIMESTRE_1", "1er Trimestre"),
        ("TRIMESTRE_2", "2e Trimestre"),
        ("TRIMESTRE_3", "3e Trimestre"),
        ("SEMESTRE_1", "1er Semestre"),
        ("SEMESTRE_2", "2e Semestre"),
        ("ANNUEL", "Annuel"),
    ]
    TYPE_NOTE_CHOICES = [
        ("INTERROGATION", "Interrogation"),
        ("DEVOIR", "Devoir"),
        ("COMPOSITION", "Composition"),
        ("EXAMEN", "Examen"),
        ("ORAL", "Oral"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE, related_name="grades")
    eleve = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="grades")
    matiere = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="grades")
    annee_scolaire = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="grades")
    periode = models.CharField(max_length=15, choices=PERIODE_CHOICES)
    type_note = models.CharField(max_length=15, choices=TYPE_NOTE_CHOICES, default="DEVOIR")

    note = models.DecimalField(max_digits=5, decimal_places=2, help_text="Valeur brute saisie")
    note_sur = models.PositiveSmallIntegerField(default=20, help_text="Barème (ex: 20, 40, 100)")
    note_convertie = models.DecimalField(
        max_digits=5, decimal_places=2, editable=False,
        help_text="Calculé automatiquement : (note/note_sur)×20",
    )
    coefficient = models.DecimalField(max_digits=4, decimal_places=2, default=1)

    saisie_par = models.ForeignKey("authentication.User", on_delete=models.PROTECT, related_name="graded_by")
    valide = models.BooleanField(default=False, help_text="False = brouillon")
    justification_modification = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Note"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.eleve} — {self.matiere.name} : {self.note}/{self.note_sur}"

    def clean(self):
        if self.note < 0:
            raise ValidationError({"note": "La note ne peut pas être négative."})
        if self.note > self.note_sur:
            raise ValidationError({"note": f"La note ({self.note}) dépasse le barème ({self.note_sur})."})

    def save(self, *args, **kwargs):
        # Calcul automatique note_convertie = (note / note_sur) × 20
        if self.note_sur and self.note_sur > 0:
            self.note_convertie = round((self.note / self.note_sur) * 20, 2)
        else:
            self.note_convertie = self.note
        self.full_clean()
        super().save(*args, **kwargs)


class YearEndDecision(models.Model):
    DECISION_CHOICES = [
        ("ADMIS", "Admis"),
        ("REDOUBLE", "Redoublant"),
        ("ORIENTE", "Orienté"),
        ("TRANSFERE", "Transféré"),
        ("EXCLU", "Exclu"),
    ]
    MENTION_CHOICES = [
        ("EXCELLENT", "Excellent"),
        ("TRES_BIEN", "Très Bien"),
        ("BIEN", "Bien"),
        ("ASSEZ_BIEN", "Assez Bien"),
        ("PASSABLE", "Passable"),
        ("INSUFFISANT", "Insuffisant"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="year_end_decisions")
    annee_scolaire = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="year_end_decisions")
    classe_origine = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="decisions_from")
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    classe_destination = models.ForeignKey(
        Class, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="decisions_to",
    )
    moyenne_annuelle = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Snapshot immuable calculé au moment de la décision",
    )
    mention = models.CharField(max_length=20, choices=MENTION_CHOICES, blank=True)
    prise_par = models.ForeignKey("authentication.User", on_delete=models.PROTECT, related_name="year_end_decisions")
    date_decision = models.DateField(auto_now_add=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        unique_together = [("eleve", "annee_scolaire")]
        verbose_name = "Décision de fin d'année"
        ordering = ["-date_decision"]

    def __str__(self):
        return f"{self.eleve} — {self.get_decision_display()} ({self.annee_scolaire.label})"

    @staticmethod
    def compute_mention(moyenne: float) -> str:
        """Calcule la mention selon les seuils par défaut (configurables par école)."""
        if moyenne >= 18:
            return "EXCELLENT"
        elif moyenne >= 16:
            return "TRES_BIEN"
        elif moyenne >= 14:
            return "BIEN"
        elif moyenne >= 12:
            return "ASSEZ_BIEN"
        elif moyenne >= 10:
            return "PASSABLE"
        return "INSUFFISANT"
