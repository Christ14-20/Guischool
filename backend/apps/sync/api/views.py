from uuid import UUID
from datetime import datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.sync.models import SyncQueueItem, SyncConflict
from apps.sync.api.serializers import (
    SyncPushSerializer,
    SyncPushItemSerializer,
    SyncPullSerializer,
    SyncStatusSerializer,
)
from apps.sync.services import resolve_conflict


class SyncPushView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=SyncPushSerializer,
        responses={200: SyncPushSerializer},
    )
    def post(self, request):
        serializer = SyncPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]
        tenant = request.tenant
        results = []

        for item in items:
            model_name = item["model_name"]
            action = item["action"]
            object_id = item["object_id"]
            payload = item.get("payload", {})
            client_version = item.get("version", 1)

            # Determine priority
            from apps.sync.services import get_priority_for_model
            priority = get_priority_for_model(model_name)

            # Save to queue
            queue_item = SyncQueueItem.objects.create(
                tenant=tenant,
                user=request.user if request.user.is_authenticated else None,
                action=action,
                model_name=model_name,
                object_id=object_id,
                payload=payload,
                priority=priority,
                version=client_version,
                status="PENDING",
            )

            # Attempt conflict detection
            conflict = self._detect_conflict(model_name, object_id, client_version, payload)
            if conflict:
                resolution = resolve_conflict(
                    model_name=model_name,
                    server_version=conflict["server_version"],
                    local_version=client_version,
                    server_data=conflict.get("server_data", {}),
                    client_data=payload,
                    is_validated_grade=conflict.get("is_validated_grade", False),
                )
                server_wins = resolution["resolution"] == "SERVER_WINS"

                SyncConflict.objects.create(
                    queue_item=queue_item,
                    model_name=model_name,
                    object_id=object_id,
                    local_version=client_version,
                    server_version=conflict["server_version"],
                    resolution=resolution["resolution"],
                    server_data=conflict.get("server_data", {}),
                    client_data=payload,
                    resolved_at=datetime.now() if resolution["resolution"] != "MANUAL" else None,
                )

                if server_wins:
                    queue_item.status = "SYNCED"
                    queue_item.save()
                    results.append({
                        "object_id": object_id,
                        "model_name": model_name,
                        "status": "conflict_server_wins",
                        "version": conflict["server_version"],
                        "server_data": conflict.get("server_data", {}),
                    })
                else:
                    queue_item.status = "PROCESSING"
                    queue_item.save()
                    results.append({
                        "object_id": object_id,
                        "model_name": model_name,
                        "status": "conflict_client_wins",
                        "version": client_version,
                        "server_data": conflict.get("server_data", {}),
                    })
            else:
                queue_item.status = "PROCESSING"
                queue_item.save()
                results.append({
                    "object_id": object_id,
                    "model_name": model_name,
                    "status": "accepted",
                    "version": client_version,
                })

        return Response({"results": results, "total": len(results)})

    def _detect_conflict(self, model_name, object_id, client_version, payload):
        """Check if a conflict exists between client and server data."""
        # This fetches the current server object and compares versions
        # For now, a simplified version check
        try:
            from django.apps import apps
            model = apps.get_model(app_label="pedagogy", model_name=model_name)
            if model is None and hasattr(apps, "get_model"):
                for app_label in ["finance", "superadmin", "authentication", "support", "monitoring"]:
                    model = apps.get_model(app_label=app_label, model_name=model_name)
                    if model:
                        break
            if model is None:
                return None

            obj = model.objects.filter(id=object_id).first()
            if obj is None:
                return None

            server_version = getattr(obj, "version", 1)
            if server_version <= client_version:
                return None  # No conflict

            if hasattr(obj, "is_validated") and obj.is_validated and model_name == "Grade":
                return {
                    "server_version": server_version,
                    "server_data": getattr(obj, "payload", {}),
                    "is_validated_grade": True,
                }

            return {
                "server_version": server_version,
                "server_data": getattr(obj, "payload", {}),
                "is_validated_grade": False,
            }
        except Exception:
            return None


class SyncPullView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[SyncPullSerializer],
        responses={200: SyncPushSerializer},
    )
    def get(self, request):
        since = request.query_params.get("since")
        model_name = request.query_params.get("model_name")
        tenant = request.tenant

        if not since:
            return Response(
                {"error": "Paramètre 'since' requis (format ISO 8601)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        except ValueError:
            return Response(
                {"error": "Format de date invalide. Utilisez ISO 8601 (ex: 2026-01-01T00:00:00Z)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect changed objects from all apps
        changes = []
        app_models = {
            "pedagogy": ["SchoolYear", "Level", "Filiere", "Class", "MixedClass", "Subject",
                         "ClassSubject", "ClassGroup", "SubGroup", "TimetableSlot",
                         "Attendance", "Evaluation", "Enrollment", "Grade", "YearEndDecision"],
            "finance": ["FeeCategory", "Payment", "Invoice", "StudentFee"],
        }

        if model_name:
            # Filter only the requested model
            for app_label, models in app_models.items():
                if model_name in models:
                    app_models[app_label] = [model_name]
                else:
                    app_models[app_label] = []

        from django.apps import apps as django_apps

        for app_label, model_names in app_models.items():
            for name in model_names:
                try:
                    model = django_apps.get_model(app_label=app_label, model_name=name)
                    if not model:
                        continue
                    filter_kwargs = {"updated_at__gte": since_dt}
                    if hasattr(model, "tenant"):
                        filter_kwargs["tenant"] = tenant
                    objects = model.objects.filter(**filter_kwargs).values("id", "updated_at")
                    for obj in objects:
                        changes.append({
                            "model_name": name,
                            "object_id": str(obj["id"]),
                            "updated_at": obj["updated_at"].isoformat() if obj.get("updated_at") else None,
                        })
                except (LookupError, AttributeError):
                    continue

        return Response({
            "changes": changes,
            "total": len(changes),
            "since": since,
        })


class SyncStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SyncStatusSerializer})
    def get(self, request):
        tenant = request.tenant
        queue = SyncQueueItem.objects.filter(tenant=tenant)

        return Response({
            "total": queue.count(),
            "pending": queue.filter(status="PENDING").count(),
            "processing": queue.filter(status="PROCESSING").count(),
            "synced": queue.filter(status="SYNCED").count(),
            "failed": queue.filter(status="FAILED").count(),
            "by_priority": {
                "payment": queue.filter(priority=0).count(),
                "attendance": queue.filter(priority=1).count(),
                "grade": queue.filter(priority=2).count(),
                "message": queue.filter(priority=3).count(),
            },
            "conflicts": SyncConflict.objects.filter(queue_item__tenant=tenant, resolution="PENDING").count(),
        })
