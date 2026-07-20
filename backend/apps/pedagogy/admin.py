from django.contrib import admin

from apps.pedagogy.models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """
    Administration des présences.

    En V1, le déverrouillage d'une présence (is_locked -> False) se fait
    exclusivement ici : décocher `is_locked` autorise à nouveau la correction
    via l'API (PATCH). Aucun endpoint public de déverrouillage n'est exposé.
    """

    list_display = ("student", "classe", "date", "status", "is_locked", "created_at")
    list_filter = ("status", "is_locked", "date")
    search_fields = ("student__matricule", "student__nom", "student__prenom")
    list_editable = ("is_locked",)
    list_select_related = ("student", "classe")
    ordering = ("-date",)
    readonly_fields = ("created_by", "created_at", "updated_at")
    actions = ["unlock_selected"]

    @admin.action(description="Déverrouiller les présences sélectionnées")
    def unlock_selected(self, request, queryset):
        updated = queryset.update(is_locked=False)
        self.message_user(request, f"{updated} présence(s) déverrouillée(s).")
