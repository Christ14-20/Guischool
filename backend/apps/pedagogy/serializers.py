from rest_framework import serializers
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, AcademicPeriod, Subject, ClassSubject,
    Student, Guardian, Enrollment,
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
        validated_data["level"] = Level.objects.get(
            id=level_id, tenant=self.context["request"].tenant
        )

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
    school_year_id = serializers.UUIDField()
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
        tenant = self.context["request"].tenant
        school_year = SchoolYear.objects.filter(id=value, tenant=tenant).first()
        if school_year is None:
            raise serializers.ValidationError("Année scolaire introuvable")
        self._school_year = school_year
        return value


class StudentDetailSerializer(serializers.ModelSerializer):
    classe_actuelle = ClassNestedSerializer(read_only=True)
    guardians = GuardianNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "matricule", "nom", "prenom", "date_naissance", "lieu_naissance",
            "sexe", "statut", "photo", "classe_actuelle", "guardians",
            "created_at",
        ]


class ClassSubjectSerializer(serializers.ModelSerializer):
    subject = SubjectNestedSerializer(read_only=True)
    teacher = UserNestedSerializer(read_only=True, allow_null=True)
    subject_id = serializers.UUIDField(write_only=True)
    teacher_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ClassSubject
        fields = [
            "id", "subject", "subject_id", "coefficient", "weekly_hours",
            "teacher", "teacher_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

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
