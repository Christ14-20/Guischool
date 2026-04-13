"""
apps/pedagogy/api/serializers.py
Serializers pour : SchoolYear, Level, Class, Subject,
                   Student, Enrollment, Grade, YearEndDecision.
"""
import re
from rest_framework import serializers
from apps.pedagogy.models import (
    SchoolYear, Level, Class, Subject, ClassSubject,
    Attendance, Evaluation, Student, Enrollment, Grade, YearEndDecision,
    TimetableSlot,
)


GUINEE_PHONE_REGEX = re.compile(r"^\+224[0-9]{8,9}$")


# ── Module pédagogie de base ──────────────────────────────────────

class SchoolYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolYear
        fields = ["id", "tenant", "label", "start_date", "end_date", "status", "is_current"]
        read_only_fields = ["id", "tenant"]


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "tenant", "cycle", "name", "order_index"]
        read_only_fields = ["id", "tenant"]


class ClassSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source="level.name", read_only=True)
    current_count = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            "id", "tenant", "school_year", "level", "level_name",
            "name", "capacity", "room", "main_teacher", "current_count",
        ]
        read_only_fields = ["id", "tenant", "level_name", "current_count"]

    def get_current_count(self, obj):
        return obj.current_enrollment_count()


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "tenant", "code", "name", "category", "is_official"]
        read_only_fields = ["id"]


class TimetableSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            "id", "tenant", "classe", "teacher", "subject", "subject_name",
            "room", "day_of_week", "start_time", "end_time",
            "is_recurring", "specific_date",
        ]
        read_only_fields = ["id", "subject_name"]


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = [
            "id", "tenant", "classe", "subject", "teacher", "type",
            "title", "max_score", "coefficient", "date", "deadline",
            "is_published", "is_locked", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            "id", "tenant", "student", "classe", "subject", "date",
            "status", "minutes_late", "justification", "justified_by",
            "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ── Module 4.5 — Élèves & Notes ────────────────────────────────────

class StudentListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes."""
    classe_name = serializers.CharField(source="classe_actuelle.name", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "matricule", "nom", "prenom", "sexe",
            "statut", "classe_name", "tuteur_telephone",
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
    class Meta:
        model = Enrollment
        fields = [
            "id", "eleve", "classe", "annee_scolaire",
            "type_inscription", "date_inscription",
            "inscrit_par", "frais_payes", "observations",
        ]
        read_only_fields = ["id", "date_inscription", "inscrit_par"]


class GradeSerializer(serializers.ModelSerializer):
    note_convertie = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id", "tenant", "eleve", "matiere", "annee_scolaire", "periode",
            "type_note", "note", "note_sur", "note_convertie", "coefficient",
            "saisie_par", "valide", "justification_modification",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "note_convertie", "saisie_par", "created_at", "updated_at"]


class GradeValidateSerializer(serializers.Serializer):
    justification = serializers.CharField(required=False, allow_blank=True)


class YearEndDecisionSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.SerializerMethodField()
    decision_display = serializers.CharField(source="get_decision_display", read_only=True)
    mention_display = serializers.CharField(source="get_mention_display", read_only=True)

    class Meta:
        model = YearEndDecision
        fields = [
            "id", "eleve", "eleve_nom", "annee_scolaire",
            "classe_origine", "decision", "decision_display",
            "classe_destination", "moyenne_annuelle",
            "mention", "mention_display", "prise_par",
            "date_decision", "commentaire",
        ]
        read_only_fields = ["id", "date_decision", "prise_par", "eleve_nom"]

    def get_eleve_nom(self, obj):
        return f"{obj.eleve.nom} {obj.eleve.prenom}"


class BulkPromotionSerializer(serializers.Serializer):
    """Traitement groupé : passer/faire redoubler toute une classe."""
    classe_id = serializers.IntegerField()
    annee_scolaire_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=["ADMIS", "REDOUBLE"])
    commentaire = serializers.CharField(required=False, allow_blank=True)
