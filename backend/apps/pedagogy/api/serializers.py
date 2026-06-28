"""
apps/pedagogy/api/serializers.py
Serializers pour : SchoolYear, Level, Class, Subject,
                   Student, Enrollment, Grade, YearEndDecision.
"""
import re
from rest_framework import serializers
from apps.pedagogy.models import (
    SchoolYear, Level, Class, Subject, ClassSubject, Filiere,
    Attendance, Evaluation, Student, Enrollment, Grade, YearEndDecision,
    TimetableSlot, MixedClass, MixedClassLevel, ClassGroup, SubGroup,
)


GUINEE_PHONE_REGEX = re.compile(r"^\+224[0-9]{8,9}$")


# ── Module pédagogie de base ──────────────────────────────────────

class FiliereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filiere
        fields = ["id", "tenant", "code", "name", "cycle", "matieres_dominantes"]
        read_only_fields = ["id", "tenant"]


class SchoolYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolYear
        fields = ["id", "tenant", "label", "start_date", "end_date", "status", "is_current"]
        read_only_fields = ["id", "tenant"]


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = [
            "id", "tenant", "cycle", "name", "code_officiel_minedu",
            "age_min", "age_max", "diplome_final", "duree_annees",
            "evaluation_type", "order_index",
        ]
        read_only_fields = ["id", "tenant"]


class MixedClassLevelSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source="level.name", read_only=True)

    class Meta:
        model = MixedClassLevel
        fields = ["id", "level", "level_name", "capacite", "ordre"]
        read_only_fields = ["id"]


class MixedClassSerializer(serializers.ModelSerializer):
    niveaux = MixedClassLevelSerializer(many=True, read_only=True)
    classe_name = serializers.CharField(source="classe_physique.name", read_only=True)

    class Meta:
        model = MixedClass
        fields = ["id", "classe_physique", "classe_name", "type_mixte", "repartition", "niveaux", "created_at"]
        read_only_fields = ["id", "created_at"]


class ClassSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source="level.name", read_only=True)
    filiere_name = serializers.CharField(source="filiere.name", read_only=True)
    current_count = serializers.SerializerMethodField()
    mixed_levels = serializers.SerializerMethodField()

    # Champs pour la création d'une classe mixte
    extra_levels = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )
    mix_type = serializers.ChoiceField(
        choices=MixedClass.MIX_TYPE_CHOICES, required=False, write_only=True
    )
    repartition = serializers.JSONField(required=False, write_only=True)

    class Meta:
        model = Class
        fields = [
            "id", "tenant", "school_year", "level", "level_name",
            "filiere", "filiere_name", "name", "capacity", "room",
            "main_teacher", "current_count", "is_mixed", "mixed_levels",
            "extra_levels", "mix_type", "repartition",
        ]
        read_only_fields = ["id", "tenant", "level_name", "filiere_name", "current_count", "mixed_levels"]

    def get_current_count(self, obj):
        return obj.current_enrollment_count()

    def get_mixed_levels(self, obj):
        if not obj.is_mixed:
            return []
        try:
            mc = obj.mixed_config
            return MixedClassLevelSerializer(mc.niveaux.all(), many=True).data
        except MixedClass.DoesNotExist:
            return []

    def validate(self, attrs):
        is_mixed = attrs.get("is_mixed", False)
        extra_levels = attrs.get("extra_levels", [])
        if is_mixed and not extra_levels:
            raise serializers.ValidationError(
                {"extra_levels": "Une classe mixte doit avoir au moins un niveau supplémentaire."}
            )
        if extra_levels and len(extra_levels) > 2:
            raise serializers.ValidationError(
                {"extra_levels": "Maximum 2 niveaux supplémentaires (3 niveaux total)."}
            )
        if extra_levels:
            level_id = attrs.get("level")
            if level_id and level_id in extra_levels:
                raise serializers.ValidationError(
                    {"extra_levels": "Le niveau principal ne peut pas être aussi dans les niveaux supplémentaires."}
                )
        return attrs

    def create(self, validated_data):
        extra_levels = validated_data.pop("extra_levels", [])
        mix_type = validated_data.pop("mix_type", "ALTERNATE_DAY")
        repartition = validated_data.pop("repartition", {})

        classe = Class.objects.create(**validated_data)

        if extra_levels:
            mixed_class = MixedClass.objects.create(
                classe_physique=classe,
                type_mixte=mix_type,
                repartition=repartition,
            )
            for i, level_id in enumerate(extra_levels):
                MixedClassLevel.objects.create(
                    mixed_class=mixed_class,
                    level_id=level_id,
                    ordre=i + 1,
                )

        return classe


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "tenant", "code", "name", "category", "is_official"]
        read_only_fields = ["id", "tenant"]


class TimetableSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    mixed_level_name = serializers.CharField(source="mixed_level.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            "id", "tenant", "classe", "group", "group_name",
            "teacher", "subject", "subject_name",
            "room", "day_of_week", "start_time", "end_time",
            "is_recurring", "specific_date", "mixed_level", "mixed_level_name",
        ]
        read_only_fields = ["id", "tenant", "subject_name", "mixed_level_name", "group_name"]


class ClassGroupSerializer(serializers.ModelSerializer):
    enseignant_name = serializers.SerializerMethodField()

    class Meta:
        model = ClassGroup
        fields = [
            "id", "tenant", "classe_mere", "type", "name", "capacite",
            "enseignant", "enseignant_name", "horaire_specifique",
        ]
        read_only_fields = ["id", "tenant", "enseignant_name"]

    def get_enseignant_name(self, obj):
        if not obj.enseignant:
            return None
        return f"{obj.enseignant.last_name} {obj.enseignant.first_name}".strip() or str(obj.enseignant)


class SubGroupSerializer(serializers.ModelSerializer):
    enseignant_name = serializers.SerializerMethodField()
    class_names = serializers.SerializerMethodField()

    class Meta:
        model = SubGroup
        fields = [
            "id", "tenant", "type", "name", "classes", "class_names",
            "capacite", "enseignant", "enseignant_name",
        ]
        read_only_fields = ["id", "tenant", "enseignant_name", "class_names"]

    def get_enseignant_name(self, obj):
        if not obj.enseignant:
            return None
        return f"{obj.enseignant.last_name} {obj.enseignant.first_name}".strip() or str(obj.enseignant)

    def get_class_names(self, obj):
        return [c.name for c in obj.classes.all()]


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = [
            "id", "tenant", "classe", "subject", "teacher", "type",
            "title", "max_score", "coefficient", "date", "deadline",
            "is_published", "is_locked", "created_at",
        ]
        read_only_fields = ["id", "tenant", "created_at"]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            "id", "tenant", "student", "classe", "subject", "date",
            "status", "minutes_late", "justification", "justified_by",
            "created_by", "created_at",
        ]
        read_only_fields = ["id", "tenant", "created_at"]


# ── Module 4.5 — Élèves & Notes ────────────────────────────────────

class StudentListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes."""
    classe_name = serializers.CharField(source="classe_actuelle.name", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "matricule", "nom", "prenom", "sexe",
            "statut", "classe_name", "tuteur_nom", "tuteur_telephone",
        ]
        read_only_fields = ["id", "matricule", "classe_name"]


class StudentDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour création et détail."""
    classe_name = serializers.CharField(source="classe_actuelle.name", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "tenant", "matricule", "nom", "prenom", "date_naissance",
            "lieu_naissance", "sexe", "photo",
            "tuteur_nom", "tuteur_telephone", "tuteur_email",
            "tuteur_lien", "contact_provisoire",
            "classe_actuelle", "classe_name",
            "annee_inscription", "statut",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "matricule", "created_at", "updated_at", "classe_name", "created_by"]

    def validate_tuteur_telephone(self, value):
        if not GUINEE_PHONE_REGEX.match(value):
            raise serializers.ValidationError("Format requis : +224XXXXXXXXX")
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    classe_name = serializers.CharField(source="classe.name", read_only=True)
    annee_scolaire_label = serializers.CharField(source="annee_scolaire.label", read_only=True)
    niveau_mixte_name = serializers.CharField(source="niveau_mixte.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id", "eleve", "classe", "classe_name",
            "annee_scolaire", "annee_scolaire_label",
            "type_inscription", "date_inscription",
            "inscrit_par", "frais_payes", "observations",
            "niveau_mixte", "niveau_mixte_name",
        ]
        read_only_fields = ["id", "date_inscription", "inscrit_par", "classe_name", "annee_scolaire_label", "niveau_mixte_name"]


class GradeSerializer(serializers.ModelSerializer):
    note_convertie = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    matiere_name = serializers.CharField(source="matiere.name", read_only=True)
    annee_scolaire_label = serializers.CharField(source="annee_scolaire.label", read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id", "tenant", "eleve", "matiere", "matiere_name",
            "annee_scolaire", "annee_scolaire_label", "periode",
            "type_note", "note", "note_sur", "note_convertie", "coefficient",
            "saisie_par", "valide", "justification_modification",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "tenant", "note_convertie", "saisie_par", "created_at", "updated_at",
            "matiere_name", "annee_scolaire_label"
        ]


class GradeValidateSerializer(serializers.Serializer):
    justification = serializers.CharField(required=False, allow_blank=True)


class YearEndDecisionSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.SerializerMethodField()
    decision_display = serializers.CharField(source="get_decision_display", read_only=True)
    mention_display = serializers.CharField(source="get_mention_display", read_only=True)
    annee_scolaire_label = serializers.CharField(source="annee_scolaire.label", read_only=True)
    classe_origine_name = serializers.CharField(source="classe_origine.name", read_only=True)
    classe_destination_name = serializers.CharField(source="classe_destination.name", read_only=True)

    class Meta:
        model = YearEndDecision
        fields = [
            "id", "eleve", "eleve_nom", "annee_scolaire", "annee_scolaire_label",
            "classe_origine", "classe_origine_name", "decision", "decision_display",
            "classe_destination", "classe_destination_name", "moyenne_annuelle",
            "mention", "mention_display", "prise_par",
            "date_decision", "commentaire",
        ]
        read_only_fields = [
            "id", "date_decision", "prise_par", "eleve_nom",
            "annee_scolaire_label", "classe_origine_name", "classe_destination_name"
        ]

    def get_eleve_nom(self, obj):
        return f"{obj.eleve.nom} {obj.eleve.prenom}"


class BulkPromotionSerializer(serializers.Serializer):
    """Traitement groupé : passer/faire redoubler toute une classe."""
    classe_id = serializers.IntegerField()
    annee_scolaire_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=["ADMIS", "REDOUBLE"])
    commentaire = serializers.CharField(required=False, allow_blank=True)
