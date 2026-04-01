"""apps/monitoring/api/urls.py"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.monitoring.api.views import AuditLogViewSet, SystemAlertViewSet

router = DefaultRouter()
router.register("auditlogs", AuditLogViewSet, basename="auditlog")
router.register("systemalerts", SystemAlertViewSet, basename="systemalert")

urlpatterns = [path("", include(router.urls))]
