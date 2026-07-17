"""
apps/superadmin/urls.py — TENANT-02 / TENANT-03 / TENANT-04

Routage des endpoints de super administration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.superadmin.views import PlanViewSet, TenantViewSet

router = DefaultRouter()
router.register(r"plans", PlanViewSet, basename="superadmin-plans")
router.register(r"schools", TenantViewSet, basename="superadmin-schools")

urlpatterns = [
    path("", include(router.urls)),
]
