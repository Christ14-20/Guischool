from django.contrib import admin
from .models import SMSLog


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ["recipient_phone", "trigger_type", "status", "sent_at"]
    list_filter = ["trigger_type", "status", "sent_at"]
    search_fields = ["recipient_phone", "provider_message_id"]
