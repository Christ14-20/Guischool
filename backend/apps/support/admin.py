from django.contrib import admin
from .models import SupportTicket, TicketMessage, SchoolOnboardingRequest

class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 1
    readonly_fields = ("timestamp",)

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id_short", "category", "priority", "status", "tenant", "user", "created_at")
    list_filter = ("category", "priority", "status", "tenant")
    search_fields = ("description", "user__email")
    readonly_fields = ("created_at", "updated_at")
    inlines = [TicketMessageInline]

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = "ID"

@admin.register(SchoolOnboardingRequest)
class SchoolOnboardingRequestAdmin(admin.ModelAdmin):
    list_display = ("school_name", "tracking_code", "school_type", "status", "created_at")
    list_filter = ("status", "school_type")
    search_fields = ("school_name", "tracking_code", "admin_email")
    readonly_fields = ("tracking_code", "created_at", "updated_at")
