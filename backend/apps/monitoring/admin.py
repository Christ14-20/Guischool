from django.contrib import admin
from .models import AuditLog, SystemAlert

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "action", "entity_type", "entity_id", "tenant")
    list_filter = ("action", "entity_type", "tenant", "timestamp")
    search_fields = ("entity_id", "user__email", "action")
    readonly_fields = (
        "id", "tenant", "user", "action", "entity_type", "entity_id", 
        "old_value", "new_value", "ip_address", "timestamp"
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(SystemAlert)
class SystemAlertAdmin(admin.ModelAdmin):
    list_display = ("type", "level", "timestamp", "tenant", "is_resolved")
    list_filter = ("type", "level", "is_resolved", "tenant")
    search_fields = ("message",)
    readonly_fields = ("timestamp",)
