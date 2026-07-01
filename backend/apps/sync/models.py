import uuid

from django.db import models


class SyncQueueItem(models.Model):
    PRIORITY_CHOICES = [
        (0, "PAYMENT"),
        (1, "ATTENDANCE"),
        (2, "GRADE"),
        (3, "MESSAGE"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("SYNCED", "Synced"),
        ("FAILED", "Failed"),
    ]

    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("superadmin.Tenant", on_delete=models.CASCADE)
    user = models.ForeignKey(
        "authentication.User", null=True, blank=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    payload = models.JSONField()
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING"
    )
    version = models.IntegerField(default=1)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.model_name} [{self.status}]"


class SyncConflict(models.Model):
    RESOLUTION_CHOICES = [
        ("PENDING", "Pending"),
        ("SERVER_WINS", "Server Wins"),
        ("CLIENT_WINS", "Client Wins"),
        ("MANUAL", "Manual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue_item = models.OneToOneField(
        SyncQueueItem, on_delete=models.CASCADE, related_name="conflict"
    )
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    local_version = models.IntegerField()
    server_version = models.IntegerField()
    resolution = models.CharField(
        max_length=20, choices=RESOLUTION_CHOICES, default="PENDING"
    )
    server_data = models.JSONField(blank=True, default=dict)
    client_data = models.JSONField(blank=True, default=dict)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Conflict {self.model_name} #{self.object_id} [{self.resolution}]"
