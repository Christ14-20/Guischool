"""apps/superadmin/api/urls.py — Routes /superadmin/*"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.superadmin.api.views import SchoolViewSet, PlanViewSet

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("plans", PlanViewSet, basename="plan")

urlpatterns = [
    path("", include(router.urls)),
]
