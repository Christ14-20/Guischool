# SCHÉMA DE DONNÉES DÉTAILLÉ — MVP EDUGUINÉE 3.0
## Spécification des modèles Django, prête à coder

**Périmètre :** couvre exactement les épics 2 à 7 du backlog MVP (Multi-tenant/Super Admin, Structure pédagogique, Élèves, Présences, Notes/Bulletins, Finance). Les entités hors MVP (Paie, Transport/Cantine/Internat, Examens officiels, Signature numérique...) ne sont **pas** incluses ici — elles seront ajoutées en V2 sans casser ce socle si les conventions ci-dessous sont respectées.

**Convention de lecture :** chaque modèle est donné dans une syntaxe proche de Django (`models.py`), directement adaptable. `PK` = clé primaire, `FK` = clé étrangère, `U` = contrainte unique, `IDX` = indexé.

---

## 0. Conventions transverses

Ces règles s'appliquent à **tous** les modèles métier du projet, pas seulement au MVP — les respecter dès maintenant évite une migration douloureuse en V2.

### 0.1 Clé primaire

Toutes les tables métier utilisent un **UUID** en clé primaire (jamais un auto-increment entier), pour permettre à terme une éventuelle réplication ou un export sans collision entre tenants.

### 0.2 Classe abstraite de base

```python
# core/models.py
import uuid
from django.db import models

class TenantScopedModel(models.Model):
    """Classe abstraite : toute entité rattachée à une école en hérite."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "superadmin.Tenant", on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set", db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TimestampedModel(models.Model):
    """Pour les entités non rattachées à un tenant (ex. Plan global)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

**Règle non négociable :** chaque `ViewSet` doit filtrer son `get_queryset()` sur `tenant=self.request.tenant` (injecté par le middleware d'Épic 1 — AUTH-03). Un test d'isolation est écrit pour **chaque** nouveau modèle avant qu'il ne soit considéré comme terminé.

### 0.3 Suppression logique, jamais physique

Aucune entité pédagogique ou financière n'est supprimée en base (`Student`, `Payment`, `Grade`...). On utilise systématiquement un champ `statut`/`status` avec une valeur d'archivage. Seules les entités de configuration pure sans historique (ex. un brouillon de `FeeCategory` jamais utilisé) peuvent être supprimées.

### 0.4 Montants et devises

Tous les montants financiers sont stockés en `DecimalField(max_digits=12, decimal_places=2)`, jamais en `FloatField` (risque d'arrondi). En V1, une seule devise (GNF) : pas de champ devise sur `Payment`, il sera ajouté en V2 avec le multi-devises.

### 0.5 Enums

Utilisation systématique de `models.TextChoices` plutôt que des chaînes libres, pour la validation et l'auto-documentation.

---

## 1. App `superadmin` — Tenant, Plan

### 1.1 `Tenant`

```python
class Tenant(TimestampedModel):
    class Status(models.TextChoices):
        TRIAL = "TRIAL", "Essai"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspendue"
        CANCELLED = "CANCELLED", "Résiliée"

    class SchoolType(models.TextChoices):
        PRIMAIRE = "PRIMAIRE", "Primaire"
        COLLEGE = "COLLEGE", "Collège"
        LYCEE = "LYCEE", "Lycée"
        MIXTE = "MIXTE", "Mixte"

    name = models.CharField(max_length=150, unique=True)                     # U
    slug = models.SlugField(max_length=100, unique=True, db_index=True)      # U, IDX
    code_minedu = models.CharField(max_length=50, unique=True, null=True, blank=True)
    school_type = models.CharField(max_length=20, choices=SchoolType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL, db_index=True)
    plan = models.ForeignKey("superadmin.Plan", on_delete=models.PROTECT, related_name="tenants")

    # Contact principal
    contact_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)   # validé +224XXXXXXXXX au niveau serializer
    contact_email = models.EmailField(unique=True)

    # Localisation
    region = models.CharField(max_length=100, blank=True)
    prefecture = models.CharField(max_length=100, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    quartier = models.CharField(max_length=150, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    logo = models.URLField(blank=True)
    settings = models.JSONField(default=dict, blank=True)   # configuration libre (V2)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]
```

> **Note V1 :** pas de champ `campus` séparé — le MVP suppose 1 campus = 1 tenant. Le multi-campus (Épic hors-MVP) s'ajoutera via un modèle `Campus` avec FK sur `Tenant`, puis propagation de `campus_id` sur `Class`/`Student`/`User`, sans casser ce schéma.

### 1.2 `Plan`

```python
class Plan(TimestampedModel):
    name = models.CharField(max_length=50, unique=True)          # "Starter", "Pro"
    max_students = models.PositiveIntegerField()
    max_staff = models.PositiveIntegerField()
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
```

**Règle métier associée :** middleware/service qui vérifie `Tenant.plan.max_students` avant toute création de `Student` (compte les élèves au statut `ACTIF`) et retourne une erreur `400` explicite si la limite est atteinte.

---

## 2. App `authentication` — User, Role, Permission

### 2.1 `Role` et `Permission`

```python
class Permission(TimestampedModel):
    codename = models.CharField(max_length=100, unique=True)   # "can_create_student"
    name = models.CharField(max_length=150)
    module = models.CharField(max_length=50)                   # "eleves", "notes", "finances"...


class Role(TimestampedModel):
    class RoleName(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Administrateur"
        DIRECTOR = "DIRECTOR", "Directeur"
        SECRETAIRE = "SECRETAIRE", "Secrétaire"
        TEACHER = "TEACHER", "Enseignant"
        PARENT = "PARENT", "Parent"
        CUSTOM = "CUSTOM", "Personnalisé"

    name = models.CharField(max_length=30, choices=RoleName.choices, unique=True)
    description = models.CharField(max_length=255, blank=True)
    permissions = models.ManyToManyField(Permission, related_name="roles", blank=True)
```

> **MVP :** 5 rôles fixes créés en fixture (`SUPER_ADMIN`, `DIRECTOR`, `SECRETAIRE`, `TEACHER`, `PARENT`). `CUSTOM` est prévu dans l'enum mais son usage réel (constructeur de rôle) est différé en V2.

### 2.2 `User`

```python
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "superadmin.Tenant", on_delete=models.CASCADE,
        related_name="users", null=True, blank=True, db_index=True
    )  # null pour SUPER_ADMIN (utilisateur plateforme, hors tenant)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)         # +224XXXXXXXXX
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    custom_permissions = models.JSONField(default=list, blank=True)  # liste de codenames, si role=CUSTOM

    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)   # forcé après création par Super Admin

    # Champs spécifiques enseignant (dénormalisés pour simplicité MVP, normaliser en V2 si besoin)
    subjects_taught = models.JSONField(default=list, blank=True)  # ["MATH", "PC"] — codes matières

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        indexes = [models.Index(fields=["tenant", "role"])]

    def can(self, codename: str) -> bool:
        if self.role.permissions.filter(codename=codename).exists():
            return True
        return codename in self.custom_permissions
```

> **Un `User` PARENT n'est pas un `Guardian`** : `Guardian` (défini en section 3) est l'entité métier "responsable légal d'un élève", tandis que `User` avec `role=PARENT` est le compte de connexion. Le lien se fait via `Guardian.user` (FK nullable — un Guardian peut exister sans compte actif tant que le parent ne s'est pas connecté).

---
## 3. App `pedagogy` — Structure scolaire, Élèves, Présences, Notes

### 3.1 `SchoolYear` et `AcademicPeriod`

```python
class SchoolYear(TenantScopedModel):
    class Status(models.TextChoices):
        PREPARATION = "PREPARATION", "Préparation"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Clôturée"

    label = models.CharField(max_length=20)          # "2025-2026"
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PREPARATION)
    is_current = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tenant", "label"], name="uniq_schoolyear_label_per_tenant"),
        ]

    def clean(self):
        # Un seul is_current=True par tenant — à valider dans le service, pas seulement en base
        pass


class AcademicPeriod(TenantScopedModel):
    class PeriodType(models.TextChoices):
        TRIMESTRE = "TRIMESTRE", "Trimestre"
        SEMESTRE = "SEMESTRE", "Semestre"

    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name="periods")
    name = models.CharField(max_length=50)           # "Trimestre 1"
    type = models.CharField(max_length=20, choices=PeriodType.choices, default=PeriodType.TRIMESTRE)
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.PositiveSmallIntegerField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["school_year", "order"], name="uniq_period_order_per_year"),
        ]
```

**Validation applicative obligatoire (service, pas seulement contrainte DB) :** pas de chevauchement de dates entre deux `AcademicPeriod` d'une même `SchoolYear`.

### 3.2 `Level`, `Class`, `Subject`, `ClassSubject`

```python
class Level(TenantScopedModel):
    class Cycle(models.TextChoices):
        PRIMAIRE = "PRIMAIRE", "Primaire"
        COLLEGE = "COLLEGE", "Collège"
        LYCEE = "LYCEE", "Lycée"

    cycle = models.CharField(max_length=20, choices=Cycle.choices)
    name = models.CharField(max_length=50)          # "6ème", "Terminale"
    order_index = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["order_index"]


class Class(TenantScopedModel):
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name="classes")
    level = models.ForeignKey(Level, on_delete=models.PROTECT, related_name="classes")
    name = models.CharField(max_length=50)          # "6ème A"
    capacity = models.PositiveSmallIntegerField(default=60)
    room = models.CharField(max_length=50, blank=True)
    main_teacher = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="classes_as_main_teacher"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["school_year", "name"], name="uniq_class_name_per_year"),
        ]

    @property
    def current_headcount(self) -> int:
        return self.students.filter(status=Student.Status.ACTIF).count()


class Subject(TenantScopedModel):
    code = models.CharField(max_length=20)          # "MATH", "FR"
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, blank=True)
    is_official = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uniq_subject_code_per_tenant"),
        ]


class ClassSubject(TenantScopedModel):
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="class_subjects")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="class_subjects")
    coefficient = models.DecimalField(max_digits=3, decimal_places=1, default=1)
    weekly_hours = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    teacher = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="class_subjects_taught"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["class_obj", "subject"], name="uniq_subject_per_class"),
        ]
```

### 3.3 `Student`, `Guardian`, `Enrollment`

```python
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

    matricule = models.CharField(max_length=20, db_index=True)   # "{ANNEE}-{SEQ:05d}"
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=150)
    date_naissance = models.DateField()
    lieu_naissance = models.CharField(max_length=150, blank=True)
    sexe = models.CharField(max_length=1, choices=Sexe.choices)
    photo = models.URLField(blank=True)
    classe_actuelle = models.ForeignKey(
        Class, on_delete=models.SET_NULL, null=True, blank=True, related_name="students"
    )
    annee_inscription = models.ForeignKey(
        SchoolYear, on_delete=models.PROTECT, related_name="students_first_enrolled"
    )
    statut = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIF, db_index=True)
    created_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, related_name="students_created"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tenant", "matricule"], name="uniq_matricule_per_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "statut"]),
            models.Index(fields=["nom", "prenom", "date_naissance"]),  # accélère la détection de doublon
        ]


class Guardian(TenantScopedModel):
    class Lien(models.TextChoices):
        PERE = "PERE", "Père"
        MERE = "MERE", "Mère"
        TUTEUR = "TUTEUR", "Tuteur"
        AUTRE = "AUTRE", "Autre"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="guardians")
    user = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="guardian_profiles"
    )  # rempli quand le parent active son compte
    lien = models.CharField(max_length=10, choices=Lien.choices)
    nom_complet = models.CharField(max_length=200)
    telephone = models.CharField(max_length=20)      # regex +224XXXXXXXXX validée au niveau serializer
    email = models.EmailField(blank=True)
    is_contact_urgence = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["telephone"])]


class Enrollment(TenantScopedModel):
    class TypeInscription(models.TextChoices):
        NOUVELLE = "NOUVELLE_INSCRIPTION", "Nouvelle inscription"
        REINSCRIPTION = "REINSCRIPTION", "Réinscription"
        TRANSFERT = "TRANSFERT_ENTRANT", "Transfert entrant"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    classe = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="enrollments")
    school_year = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="enrollments")
    type_inscription = models.CharField(max_length=25, choices=TypeInscription.choices)
    date_inscription = models.DateField(auto_now_add=True)
    inscrit_par = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, related_name="enrollments_created"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "school_year"], name="uniq_enrollment_per_year"),
        ]
```

**Validations de service (`students/services.py`), pas de contrainte DB directe :**
- Détection de doublon : recherche `nom` + `prenom` + `date_naissance` avant création → avertissement (pas un blocage) sauf si `matricule` strictement identique.
- Capacité de classe : `classe.current_headcount >= classe.capacity` → blocage avec message explicite.
- Génération du `matricule` : séquence par `(tenant, school_year)`, remise à zéro chaque année — table de compteur dédiée ou `SELECT ... FOR UPDATE` sur un modèle `MatriculeSequence(tenant, school_year, last_seq)` pour éviter les collisions en cas d'inscriptions concurrentes.

### 3.4 `Evaluation`, `Grade`

```python
class Evaluation(TenantScopedModel):
    class Type(models.TextChoices):
        CC = "CC", "Contrôle Continu"
        DS = "DS", "Devoir Surveillé"

    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="evaluations")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="evaluations")
    period = models.ForeignKey(AcademicPeriod, on_delete=models.PROTECT, related_name="evaluations")
    teacher = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="evaluations_created")
    type = models.CharField(max_length=10, choices=Type.choices)
    title = models.CharField(max_length=150)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    coefficient = models.DecimalField(max_digits=3, decimal_places=1, default=1)
    date = models.DateField()
    is_locked = models.BooleanField(default=False)     # verrouillé par l'enseignant
    is_published = models.BooleanField(default=False)  # validé par le Directeur


class Grade(TenantScopedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="grades")
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name="grades")
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # null si "ABS"
    is_absent = models.BooleanField(default=False)
    note_convertie = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # calculée à la sauvegarde
    comment = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="grades_entered")
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="grades_validated"
    )
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "evaluation"], name="uniq_grade_per_student_evaluation"),
            models.CheckConstraint(
                check=models.Q(note_convertie__gte=0) & models.Q(note_convertie__lte=20),
                name="grade_note_convertie_range"
            ),
        ]
        indexes = [models.Index(fields=["student", "evaluation"])]

    def save(self, *args, **kwargs):
        if self.score is not None and self.evaluation.max_score:
            self.note_convertie = (self.score / self.evaluation.max_score) * 20
        super().save(*args, **kwargs)
```

**Règle de modification post-validation (service, pas DB) :** si `Grade.is_validated=True`, toute modification passe obligatoirement par un endpoint dédié exigeant un champ `justification` (stocké dans `AuditLog`, voir §5), et réservé au rôle `DIRECTOR`.

### 3.5 `Attendance`

```python
class Attendance(TenantScopedModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Présent"
        ABSENT = "ABSENT", "Absent"
        ABSENT_JUSTIFIE = "ABSENT_JUSTIFIE", "Absent justifié"
        RETARD = "RETARD", "Retard"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendances")
    classe = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    minutes_late = models.PositiveSmallIntegerField(null=True, blank=True)
    justification_text = models.TextField(blank=True)
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="attendances_recorded")
    is_locked = models.BooleanField(default=False)   # verrouillé après 24h

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "date"], name="uniq_attendance_per_student_per_day"),
        ]
        indexes = [models.Index(fields=["classe", "date"])]
```

### 3.6 `YearEndDecision` (version simplifiée MVP)

```python
class YearEndDecision(TenantScopedModel):
    class Decision(models.TextChoices):
        ADMIS = "ADMIS", "Admis"
        REDOUBLE = "REDOUBLE", "Redouble"
        EXCLU = "EXCLU", "Exclu"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="year_end_decisions")
    school_year = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="year_end_decisions")
    classe_origine = models.ForeignKey(Class, on_delete=models.PROTECT, related_name="decisions_from")
    classe_destination = models.ForeignKey(
        Class, on_delete=models.SET_NULL, null=True, blank=True, related_name="decisions_to"
    )
    decision = models.CharField(max_length=15, choices=Decision.choices)
    moyenne_annuelle = models.DecimalField(max_digits=5, decimal_places=2)   # snapshot immuable
    prise_par = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="decisions_taken")
    date_decision = models.DateField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "school_year"], name="uniq_decision_per_student_per_year"),
        ]
```

---
## 4. App `finance` — Frais, Paiements, Factures

### 4.1 `FeeCategory`, `StudentFee`

```python
class FeeCategory(TenantScopedModel):
    class Type(models.TextChoices):
        INSCRIPTION = "INSCRIPTION", "Inscription"
        SCOLARITE = "SCOLARITE", "Scolarité"

    name = models.CharField(max_length=150)          # "Scolarité 2025-2026"
    type = models.CharField(max_length=20, choices=Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_mandatory = models.BooleanField(default=True)
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, related_name="fee_categories")


class StudentFee(TenantScopedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="fees")
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.PROTECT, related_name="student_fees")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_reason = models.CharField(max_length=255, blank=True)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2)   # recalculé à chaque paiement

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "fee_category"], name="uniq_fee_per_student_category"),
        ]
        indexes = [models.Index(fields=["student", "balance_due"])]
```

### 4.2 `Payment`

```python
class Payment(TenantScopedModel):
    class Method(models.TextChoices):
        CASH = "CASH", "Espèces"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        COMPLETED = "COMPLETED", "Complété"
        FAILED = "FAILED", "Échoué"
        CANCELLED = "CANCELLED", "Annulé"

    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="payments")
    student_fee = models.ForeignKey(
        StudentFee, on_delete=models.PROTECT, related_name="payments", null=True, blank=True
    )  # peut être un paiement global non affecté à une catégorie précise
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    method = models.CharField(max_length=20, choices=Method.choices)
    reference = models.CharField(max_length=100, blank=True)        # référence opérateur Mobile Money
    idempotency_key = models.CharField(max_length=100, unique=True, db_index=True)  # anti double-débit
    received_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments_recorded"
    )  # null si paiement Mobile Money initié par le parent lui-même
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    receipt_pdf_url = models.URLField(blank=True)
    sms_notification_sent = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["tenant", "status", "payment_date"])]
```

### 4.3 `OrangeMoneyTransaction` (table technique dédiée au webhook/réconciliation)

```python
class OrangeMoneyTransaction(TenantScopedModel):
    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiée"
        CONFIRMED = "CONFIRMED", "Confirmée"
        FAILED = "FAILED", "Échouée"

    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="orange_money_details")
    provider_transaction_id = models.CharField(max_length=100, unique=True)
    provider_status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    raw_webhook_payload = models.JSONField(default=dict, blank=True)   # traçabilité brute pour debug/réconciliation
    reconciled_at = models.DateTimeField(null=True, blank=True)
```

> Cette séparation `Payment` (générique, réutilisable pour MTN/Wave en V2) / `OrangeMoneyTransaction` (spécifique à l'opérateur) est ce qui permettra d'ajouter MTN Mobile Money et Wave en V2 **sans toucher au modèle `Payment`** — seule une nouvelle table `MTNTransaction` s'ajoutera à côté.

### 4.4 `Invoice`

```python
class Invoice(TenantScopedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PAID = "PAID", "Payée"
        OVERDUE = "OVERDUE", "En retard"

    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="invoices")
    school_year = models.ForeignKey(SchoolYear, on_delete=models.PROTECT, related_name="invoices")
    total_due = models.DecimalField(max_digits=12, decimal_places=2)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    pdf_url = models.URLField(blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
```

---

## 5. App `monitoring` — Audit (minimal MVP)

```python
class AuditLog(TimestampedModel):
    tenant = models.ForeignKey(
        "superadmin.Tenant", on_delete=models.CASCADE, related_name="audit_logs", null=True, blank=True
    )
    user = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="audit_actions")
    action = models.CharField(max_length=100)            # "grade.validate", "payment.record", "student.create"...
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    justification = models.TextField(blank=True)          # obligatoire pour les actions sensibles (modif note validée...)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "timestamp"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
```

**Actions à journaliser obligatoirement dès le MVP** (appel explicite à `AuditLog.objects.create(...)` dans le code métier, pas seulement dans les signaux) :
`student.create`, `student.archive`, `grade.validate`, `grade.modify_after_validation` (avec `justification` obligatoire), `payment.record`, `payment.cancel`, `tenant.suspend`, `tenant.reactivate`, `year_end_decision.create`.

---

## 6. Diagramme relationnel simplifié

```mermaid
erDiagram
    Plan ||--o{ Tenant : "souscrit"
    Tenant ||--o{ User : "emploie"
    Tenant ||--o{ SchoolYear : "planifie"
    Tenant ||--o{ Student : "inscrit"

    Role ||--o{ User : "attribué à"
    Role }o--o{ Permission : "regroupe"

    SchoolYear ||--o{ AcademicPeriod : "découpée en"
    SchoolYear ||--o{ Class : "contient"
    Level ||--o{ Class : "catégorise"

    Class ||--o{ ClassSubject : "propose"
    Subject ||--o{ ClassSubject : "enseignée via"
    User ||--o{ ClassSubject : "enseigne (teacher)"

    Class ||--o{ Student : "accueille (classe_actuelle)"
    Student ||--o{ Guardian : "a pour responsable"
    Student ||--o{ Enrollment : "historique inscriptions"
    SchoolYear ||--o{ Enrollment : "concerne"
    Class ||--o{ Enrollment : "vers"

    Class ||--o{ Evaluation : "planifiée pour"
    Subject ||--o{ Evaluation : "porte sur"
    AcademicPeriod ||--o{ Evaluation : "durant"
    Evaluation ||--o{ Grade : "génère"
    Student ||--o{ Grade : "reçoit"

    Class ||--o{ Attendance : "enregistre"
    Student ||--o{ Attendance : "concerne"

    Student ||--o{ YearEndDecision : "fait l'objet de"
    Class ||--o{ YearEndDecision : "classe_origine/destination"

    FeeCategory ||--o{ StudentFee : "s'applique"
    Student ||--o{ StudentFee : "doit"
    StudentFee ||--o{ Payment : "réglé par"
    Student ||--o{ Payment : "paie"
    Payment ||--o| OrangeMoneyTransaction : "détails opérateur"
    Student ||--o{ Invoice : "facturé"
    SchoolYear ||--o{ Invoice : "de l'année"
```

*(Diagramme au format Mermaid — se rend directement dans GitHub, GitLab, Notion, Obsidian, ou tout éditeur compatible.)*

---

## 7. Contraintes et index — récapitulatif des points d'attention

| Modèle | Contrainte critique | Pourquoi |
|---|---|---|
| `Student` | `unique(tenant, matricule)` + index sur `(nom, prenom, date_naissance)` | Le matricule doit être unique par école ; la détection de doublon est une requête fréquente à l'inscription |
| `Enrollment` | `unique(student, school_year)` | Impossible d'inscrire deux fois le même élève sur la même année |
| `Grade` | `unique(student, evaluation)` + `CheckConstraint` sur `note_convertie` | Une seule note par élève et par évaluation ; jamais de note hors barème en base |
| `Attendance` | `unique(student, date)` | Un seul enregistrement de présence par élève et par jour (le détail par matière est un raffinement V2) |
| `Payment` | `unique(idempotency_key)` + `unique(receipt_number)` | Anti double-débit Mobile Money et unicité légale du numéro de reçu |
| `AuditLog` | Index sur `(tenant, timestamp)` et `(entity_type, entity_id)` | Les recherches d'audit se font presque toujours par période ou par entité précise |

**Sur la performance à moyen terme :** `Grade`, `Attendance` et `AuditLog` sont les tables qui grossiront le plus vite (des dizaines de milliers de lignes par école et par an). Prévoir dès le MVP un index composite sur `(tenant, created_at)` pour ces trois tables, même si le volume est faible au démarrage — c'est un coût nul à la création et très coûteux à ajouter après coup sur une table de production.

---

## 8. Ordre de création des migrations

L'ordre ci-dessous respecte les dépendances de clés étrangères et correspond à l'ordre des épics du backlog :

1. `superadmin` : `Plan` → `Tenant`
2. `authentication` : `Permission` → `Role` → `User`
3. `pedagogy` (structure) : `SchoolYear` → `AcademicPeriod` → `Level` → `Class` → `Subject` → `ClassSubject`
4. `pedagogy` (élèves) : `Student` → `Guardian` → `Enrollment`
5. `pedagogy` (évaluation) : `Evaluation` → `Grade` ; `Attendance` ; `YearEndDecision`
6. `finance` : `FeeCategory` → `StudentFee` → `Payment` → `OrangeMoneyTransaction` → `Invoice`
7. `monitoring` : `AuditLog` (peut être créé en parallèle dès l'étape 2, car sans dépendance forte)

> À chaque étape, écrire la migration **et** son test d'isolation multi-tenant dans le même commit (cf. QA-01 du backlog) — c'est le moment le moins cher pour l'écrire, et le plus cher à rattraper plus tard.

---

*Ce schéma est le socle du MVP. Les entités V2 (Campus, TenantNetwork, StudentMedical, Syllabus, PaymentScheduleTemplate, Scholarship, Payroll, Transport/Cantine/Internat, OfficialExam, Document/SignatureNumerique...) s'ajouteront par extension de ces tables ou par nouvelles tables liées, sans modification structurelle de ce qui est décrit ici — c'est précisément l'objectif de cette conception.*
