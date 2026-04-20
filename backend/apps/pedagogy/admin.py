from django.contrib import admin
from .models import (
    SchoolYear, Level, Class, Subject, ClassSubject, TimetableSlot,
    Attendance, Evaluation, Student, Enrollment, Grade, YearEndDecision
)

@admin.register(SchoolYear)
class SchoolYearAdmin(admin.ModelAdmin):
    list_display = ("label", "tenant", "start_date", "end_date", "status", "is_current")
    list_filter = ("tenant", "status", "is_current")
    search_fields = ("label",)

@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ("name", "cycle", "tenant", "order_index")
    list_filter = ("tenant", "cycle")
    search_fields = ("name",)

class ClassSubjectInline(admin.TabularInline):
    model = ClassSubject
    extra = 1

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "school_year", "tenant", "capacity", "main_teacher")
    list_filter = ("tenant", "school_year", "level")
    search_fields = ("name",)
    inlines = [ClassSubjectInline]

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "tenant", "is_official")
    list_filter = ("tenant", "category", "is_official")
    search_fields = ("code", "name")

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("matricule", "nom", "prenom", "tenant", "classe_actuelle", "statut")
    list_filter = ("tenant", "statut", "classe_actuelle", "sexe")
    search_fields = ("matricule", "nom", "prenom", "tuteur_telephone")
    readonly_fields = ("matricule", "created_at", "updated_at")

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("eleve", "classe", "annee_scolaire", "type_inscription", "frais_payes", "date_inscription")
    list_filter = ("annee_scolaire", "type_inscription", "frais_payes", "classe__tenant")
    search_fields = ("eleve__nom", "eleve__prenom", "eleve__matricule")

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ("eleve", "matiere", "periode", "note", "note_sur", "note_convertie", "valide")
    list_filter = ("periode", "type_note", "valide", "annee_scolaire", "tenant")
    search_fields = ("eleve__nom", "eleve__prenom", "matiere__name")
    readonly_fields = ("note_convertie", "created_at", "updated_at")

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "classe", "subject", "date", "status")
    list_filter = ("status", "date", "tenant", "classe")
    search_fields = ("student__nom", "student__prenom")

@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ("title", "classe", "subject", "type", "date", "is_published")
    list_filter = ("type", "is_published", "date", "tenant")
    search_fields = ("title",)

@admin.register(TimetableSlot)
class TimetableSlotAdmin(admin.ModelAdmin):
    list_display = ("classe", "subject", "teacher", "day_of_week", "start_time", "end_time")
    list_filter = ("day_of_week", "tenant", "classe")

@admin.register(YearEndDecision)
class YearEndDecisionAdmin(admin.ModelAdmin):
    list_display = ("eleve", "annee_scolaire", "decision", "mention", "moyenne_annuelle")
    list_filter = ("decision", "mention", "annee_scolaire")
    search_fields = ("eleve__nom", "eleve__prenom")
