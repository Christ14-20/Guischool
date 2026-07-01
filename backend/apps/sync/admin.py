from django.contrib import admin

from apps.sync.models import SyncConflict, SyncQueueItem


@admin.register(SyncQueueItem)
class SyncQueueItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "model_name",
        "action",
        "priority",
        "status",
        "retry_count",
        "created_at",
    ]
    list_filter = ["status", "priority", "model_name"]


@admin.register(SyncConflict)
class SyncConflictAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "model_name",
        "resolution",
        "local_version",
        "server_version",
        "created_at",
    ]
    list_filter = ["resolution", "model_name"]
