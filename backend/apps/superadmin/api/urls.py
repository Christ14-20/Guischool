"""apps/superadmin/api/urls.py — Routes /superadmin/*"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.superadmin.api.views import SchoolViewSet, PlanViewSet, SuperadminUserViewSet, CampusViewSet

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("plans", PlanViewSet, basename="plan")
router.register("users", SuperadminUserViewSet, basename="superadmin-user")

# ── Routes campus imbriquées sous /superadmin/schools/{school_pk}/campuses/ ──
campus_router = DefaultRouter()
campus_router.register("campuses", CampusViewSet, basename="campus")

urlpatterns = [
    path("", include(router.urls)),
    # GET/POST  /superadmin/schools/{school_pk}/campuses/
    # GET/PATCH /superadmin/schools/{school_pk}/campuses/{pk}/
    path("schools/<uuid:school_pk>/", include(campus_router.urls)),
]
