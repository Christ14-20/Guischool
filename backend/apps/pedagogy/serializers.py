from rest_framework import serializers
from rest_framework.exceptions import NotFound
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, AcademicPeriod, Subject, ClassSubject,
    Student, Guardian, Enrollment, Attendance, Evaluation, Grade,
    YearEndDecision,
)
from apps.pedagogy.services.school_year_service import (
    validate_no_period_overlap,
)


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "cycle", "name", "order_index"]
        read_only_fields = ["id"]


class LevelNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "name"]


class UserNestedSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)


class ClassSerializer(serializers.ModelSerializer):
    level = LevelNestedSerializer(read_only=True)
    level_id = serializers.UUIDField(write_only=True)
    main_teacher = UserNestedSerializer(read_only=True, allow_null=True)
    main_teacher_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    current_headcount = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = [
            "id",
            "name",
            "level",
            "level_id",
            "capacity",
            "current_headcount",
            "room",
            "main_teacher",
            "main_teacher_id",
            "school_year",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_current_headcount(self, obj) -> int:
        return obj.current_headcount

    def validate(self, attrs):
        if attrs.get("school_year") and attrs.get("level"):
            if attrs["school_year"].tenant_id != attrs["level"].tenant_id:
                raise serializers.ValidationError(
                    {"level_id": "Le niveau ne correspond pas au même établissement"}
                )
        return attrs

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant

        level_id = validated_data.pop("level_id")
        level = Level.objects.filter(
            id=level_id, tenant=self.context["request"].tenant
        ).first()
        if level is None:
            # SCHOOLYEAR-V2-02 (correctif) : level_id d'un autre tenant (ou
            # inexistant) provoquait un Level.DoesNotExist non catché -> 500.
            # Isolation multi-tenant stricte : 404, jamais un crash.
            raise NotFound("Ressource non trouvée")
        validated_data["level"] = level

        main_teacher_id = validated_data.pop("main_teacher_id", None)
        if main_teacher_id:
            from apps.authentication.models import User
            validated_data["main_teacher"] = User.objects.filter(
                id=main_teacher_id, tenant=self.context["request"].tenant
            ).first()

        return super().create(validated_data)


class SchoolYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolYear
        fields = [
            "id",
            "label",
            "start_date",
            "end_date",
            "status",
            "is_current",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "is_current", "created_at", "updated_at"]

    def validate_label(self, value):
        if self.instance:
            qs = SchoolYear.objects.filter(
                tenant=self.context["request"].tenant, label__iexact=value
            ).exclude(id=self.instance.id)
        else:
            qs = SchoolYear.objects.filter(
                tenant=self.context["request"].tenant, label__iexact=value
            )
        if qs.exists():
            raise serializers.ValidationError(
                "Une année scolaire avec ce libellé existe déjà"
            )
        return value

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] >= attrs["end_date"]:
                raise serializers.ValidationError(
                    {"end_date": "La date de fin doit être postérieure à la date de début"}
                )
        return attrs

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)


class SchoolYearDetailSerializer(serializers.ModelSerializer):
    periods = serializers.SerializerMethodField()

    class Meta:
        model = SchoolYear
        fields = [
            "id",
            "label",
            "start_date",
            "end_date",
            "status",
            "is_current",
            "periods",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "is_current", "periods", "created_at", "updated_at"]

    def get_periods(self, obj):
        periods = obj.periods.all()
        return AcademicPeriodSerializer(periods, many=True).data


class AcademicPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            "id",
            "school_year",
            "name",
            "type",
            "start_date",
            "end_date",
            "order",
            "is_closed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_closed", "created_at", "updated_at"]


class AcademicPeriodCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            "name",
            "type",
            "start_date",
            "end_date",
            "order",
        ]

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] >= attrs["end_date"]:
                raise serializers.ValidationError(
                    {"end_date": "La date de fin doit être postérieure à la date de début"}
                )

        school_year = self.context["school_year"]
        validate_no_period_overlap(
            school_year,
            attrs["start_date"],
            attrs["end_date"],
            exclude_period_id=getattr(self.instance, "id", None),
        )
        return attrs

    def create(self, validated_data):
        validated_data["school_year"] = self.context["school_year"]
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "code", "name", "category", "is_official", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        tenant = self.context["request"].tenant
        if Subject.objects.filter(tenant=tenant, code__iexact=value).exists():
            raise serializers.ValidationError("Un sujet avec ce code existe déjà")
        return value

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)


class SubjectNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "code", "name"]


class GuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = [
            "id", "lien", "nom_complet", "telephone", "email", "is_contact_urgence",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_telephone(self, value):
        from core.utils import is_valid_guinea_phone
        if not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Format attendu : +224XXXXXXXXX")
        return value

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        validated_data["student"] = self.context["student"]
        return super().create(validated_data)


class GuardianNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = ["id", "lien", "nom_complet", "telephone"]


class ClassNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = ["id", "name"]


class StudentCreateSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=100)
    prenom = serializers.CharField(max_length=150)
    date_naissance = serializers.DateField()
    lieu_naissance = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    sexe = serializers.ChoiceField(choices=Student.Sexe.choices)
    classe_id = serializers.UUIDField()
    school_year_id = serializers.UUIDField(required=False, allow_null=True)
    type_inscription = serializers.ChoiceField(
        choices=Enrollment.TypeInscription.choices
    )
    guardian = GuardianSerializer()

    def validate_classe_id(self, value):
        tenant = self.context["request"].tenant
        classe = SchoolClass.objects.filter(id=value, tenant=tenant).first()
        if classe is None:
            raise serializers.ValidationError("Classe introuvable")
        self._classe = classe
        return value

    def validate_school_year_id(self, value):
        if value is None:
            return value
        tenant = self.context["request"].tenant
        school_year = SchoolYear.objects.filter(id=value, tenant=tenant).first()
        if school_year is None:
            raise serializers.ValidationError("Année scolaire introuvable")
        self._school_year = school_year
        return value

    def validate(self, attrs):
        from apps.pedagogy.services.school_year_service import resolve_school_year

        request = self.context["request"]
        self._school_year = resolve_school_year(
            tenant=request.tenant,
            user=request.user,
            explicit=getattr(self, "_school_year", None),
        )
        return attrs


class EnrollmentNestedSerializer(serializers.ModelSerializer):
    classe = ClassNestedSerializer(read_only=True)
    school_year = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id", "type_inscription", "classe", "school_year", "date_inscription",
        ]

    def get_school_year(self, obj):
        return {"id": str(obj.school_year_id), "label": obj.school_year.label}


class StudentListSerializer(serializers.ModelSerializer):
    classe_actuelle = ClassNestedSerializer(read_only=True)
    guardian_phone = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id", "matricule", "nom", "prenom", "classe_actuelle", "statut",
            "guardian_phone",
        ]

    def get_guardian_phone(self, obj):
        guardian = (
            obj.guardians.filter(is_contact_urgence=True).first()
            or obj.guardians.first()
        )
        return guardian.telephone if guardian else None


class StudentDetailSerializer(serializers.ModelSerializer):
    classe_actuelle = ClassNestedSerializer(read_only=True)
    guardians = GuardianNestedSerializer(many=True, read_only=True)
    enrollments = EnrollmentNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "matricule", "nom", "prenom", "date_naissance", "lieu_naissance",
            "sexe", "statut", "photo", "classe_actuelle", "guardians", "enrollments",
            "created_at",
        ]


class StudentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["nom", "prenom", "date_naissance", "lieu_naissance", "sexe", "photo"]


class ReinscriptionSerializer(serializers.Serializer):
    classe_id = serializers.UUIDField()
    school_year_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_classe_id(self, value):
        tenant = self.context["request"].tenant
        classe = SchoolClass.objects.filter(id=value, tenant=tenant).first()
        if classe is None:
            raise serializers.ValidationError("Classe introuvable")
        self._classe = classe
        return value

    def validate_school_year_id(self, value):
        if value is None:
            return value
        tenant = self.context["request"].tenant
        school_year = SchoolYear.objects.filter(id=value, tenant=tenant).first()
        if school_year is None:
            raise serializers.ValidationError("Année scolaire introuvable")
        self._school_year = school_year
        return value

    def validate(self, attrs):
        from apps.pedagogy.services.school_year_service import resolve_school_year

        request = self.context["request"]
        self._school_year = resolve_school_year(
            tenant=request.tenant,
            user=request.user,
            explicit=getattr(self, "_school_year", None),
        )
        return attrs


class ArchiverSerializer(serializers.Serializer):
    motif = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class ClassSubjectSerializer(serializers.ModelSerializer):
    subject = SubjectNestedSerializer(read_only=True)
    teacher = UserNestedSerializer(read_only=True, allow_null=True)
    subject_id = serializers.UUIDField(write_only=True)
    teacher_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ClassSubject
        fields = [
            "id", "class_obj_id", "subject", "subject_id", "coefficient", "weekly_hours",
            "teacher", "teacher_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "class_obj_id", "created_at", "updated_at"]

    def validate(self, attrs):
        class_obj = self.context.get("class_obj")
        if class_obj and "subject_id" in attrs:
            subject_id = attrs["subject_id"]
            if ClassSubject.objects.filter(
                class_obj=class_obj, subject_id=subject_id
            ).exists():
                raise serializers.ValidationError(
                    {"subject_id": "Cette matière est déjà assignée à cette classe"}
                )
        return attrs

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        validated_data["class_obj"] = self.context["class_obj"]

        subject_id = validated_data.pop("subject_id")
        validated_data["subject"] = Subject.objects.get(
            id=subject_id, tenant=self.context["request"].tenant
        )

        teacher_id = validated_data.pop("teacher_id", None)
        if teacher_id:
            from apps.authentication.models import User
            validated_data["teacher"] = User.objects.filter(
                id=teacher_id, tenant=self.context["request"].tenant
            ).first()

        return super().create(validated_data)


class AttendanceRecordInputSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=Attendance.Status.choices)
    minutes_late = serializers.IntegerField(min_value=0, required=False, allow_null=True)


class AttendanceBatchSerializer(serializers.Serializer):
    classe_id = serializers.UUIDField()
    date = serializers.DateField()
    records = AttendanceRecordInputSerializer(many=True, allow_empty=False)


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["id", "student_id", "date", "status", "is_locked"]
        read_only_fields = fields


class AttendanceUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Attendance.Status.choices, required=False
    )
    minutes_late = serializers.IntegerField(
        min_value=0, required=False, allow_null=True
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Au moins un champ (status ou minutes_late) est requis."
            )
        return attrs


class AttendanceJustifySerializer(serializers.Serializer):
    justification_text = serializers.CharField()


# ── Épic 6 — Notes, Évaluations, Bulletins ────────────────────────────────────


class EvaluationSerializer(serializers.ModelSerializer):
    class_obj = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all()
    )
    subject = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all())
    period = serializers.PrimaryKeyRelatedField(
        queryset=AcademicPeriod.objects.all()
    )
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = [
            "id", "class_obj", "subject", "period", "teacher",
            "type", "title", "max_score", "coefficient", "date",
            "is_locked", "is_published", "student_count",
        ]
        read_only_fields = ["id", "teacher", "is_locked", "is_published", "student_count"]

    def get_student_count(self, obj) -> int:
        return obj.class_obj.current_headcount


class EvaluationCreateSerializer(serializers.ModelSerializer):
    class_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), source="class_obj", write_only=True
    )
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), source="subject", write_only=True
    )
    period_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicPeriod.objects.all(), source="period", write_only=True
    )

    class Meta:
        model = Evaluation
        fields = [
            "class_id", "subject_id", "period_id", "type", "title",
            "max_score", "coefficient", "date",
        ]

    def validate(self, attrs):
        class_obj = attrs.get("class_obj")
        subject = attrs.get("subject")
        period = attrs.get("period")
        if period and class_obj and period.school_year_id != class_obj.school_year_id:
            raise serializers.ValidationError(
                {"period_id": "La période n'appartient pas à l'année de la classe."}
            )
        return attrs


class GradeItemSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    score = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    is_absent = serializers.BooleanField(required=False, default=False)


class BulkGradeSerializer(serializers.Serializer):
    evaluation_id = serializers.UUIDField()
    grades = GradeItemSerializer(many=True, min_length=1)

    def validate_grades(self, value):
        if not value:
            raise serializers.ValidationError("Au moins une note est requise.")
        return value


class GradeSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    validated_by = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            "id", "student", "evaluation", "score", "is_absent", "note_convertie",
            "comment", "is_validated", "validated_by", "validated_at",
        ]
        read_only_fields = fields

    def get_student(self, obj):
        return {
            "id": obj.student.id,
            "nom_complet": f"{obj.student.prenom} {obj.student.nom}",
        }

    def get_validated_by(self, obj):
        if obj.validated_by is None:
            return None
        return {
            "id": obj.validated_by.id,
            "nom_complet": f"{obj.validated_by.prenom} {obj.validated_by.nom}",
        }


class GradeModifySerializer(serializers.Serializer):
    score = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    is_absent = serializers.BooleanField(required=False)
    comment = serializers.CharField(required=False, allow_blank=True)
    justification = serializers.CharField(required=True)


class YearEndDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = YearEndDecision
        fields = [
            "id", "student", "school_year", "decision",
            "classe_origine", "classe_destination",
            "moyenne_annuelle", "prise_par", "date_decision",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "classe_origine", "moyenne_annuelle",
            "prise_par", "date_decision", "created_at", "updated_at",
        ]

    def validate_decision(self, value):
        if value not in dict(YearEndDecision.Decision.choices):
            raise serializers.ValidationError(
                f"Décision invalide. Choisir parmi : {', '.join(dict(YearEndDecision.Decision.choices).keys())}"
            )
        return value

    def validate(self, attrs):
        student = attrs.get("student")
        school_year = attrs.get("school_year")
        decision = attrs.get("decision")
        classe_destination = attrs.get("classe_destination")

        if decision == YearEndDecision.Decision.ADMIS and not classe_destination:
            raise serializers.ValidationError(
                {"classe_destination": "Une classe de destination est requise pour une décision ADMIS."}
            )
        if decision == YearEndDecision.Decision.EXCLU and classe_destination:
            raise serializers.ValidationError(
                {"classe_destination": "Un élève exclu ne peut pas avoir de classe de destination."}
            )
        if classe_destination and classe_destination.tenant_id != student.tenant_id:
            raise serializers.ValidationError(
                {"classe_destination": "La classe de destination doit appartenir au même établissement que l'élève."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        validated_data["prise_par"] = self.context["request"].user
        student = validated_data["student"]
        validated_data["classe_origine"] = student.classe_actuelle

        from apps.pedagogy.services.grade_service import compute_moyenne_annuelle
        school_year = validated_data["school_year"]
        moyenne = compute_moyenne_annuelle(student, school_year)
        if moyenne is None:
            raise serializers.ValidationError(
                "Impossible de calculer une moyenne annuelle : aucune note saisie "
                "sur cette année scolaire pour cet élève."
            )
        validated_data["moyenne_annuelle"] = moyenne

        return super().create(validated_data)


class PromotionsBulkSerializer(serializers.Serializer):
    classe_origine_id = serializers.UUIDField()
    # Nom conservé tel quel (SCHOOLYEAR-V2-02, décision PO 2026-07-30) malgré
    # la confusion sémantique : ce champ ne désigne PAS une année cible
    # d'inscription. Il filtre les YearEndDecision déjà prises à traiter
    # (decisions_qs.filter(school_year=school_year_cible) dans promotions_bulk)
    # — c'est donc l'année qui se termine, celle dont on applique les
    # décisions, généralement déjà clôturée au moment de l'appel. Renommer ce
    # champ serait un changement de contrat à part, hors périmètre ici.
    # Optionnel : défaut = année courante (résolution identique aux autres
    # endpoints), override réservé à pedagogy:override:schoolyear — même si,
    # vu la sémantique ci-dessus, l'usage réel fournira le plus souvent une
    # valeur explicite (l'année à promouvoir n'est généralement plus courante).
    school_year_cible_id = serializers.UUIDField(required=False, allow_null=True)
    decisions_filter = serializers.ChoiceField(
        choices=["ADMIS", "ADMIS_REDOUBLE"],
        default="ADMIS",
    )
