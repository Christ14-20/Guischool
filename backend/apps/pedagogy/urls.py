from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.pedagogy.views import (
    SchoolYearViewSet, PeriodViewSet, LevelViewSet, ClassViewSet,
    SubjectViewSet, ClassSubjectViewSet, AttendanceViewSet,
)

router = DefaultRouter()
router.register(r"schoolyears", SchoolYearViewSet, basename="schoolyear")
router.register(r"levels", LevelViewSet, basename="level")
router.register(r"classes", ClassViewSet, basename="class")
router.register(r"subjects", SubjectViewSet, basename="subject")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "school-years/<uuid:school_year_pk>/periods/",
        PeriodViewSet.as_view({"get": "list", "post": "create"}),
        name="schoolyear-periods",
    ),
    path(
        "periods/<uuid:pk>/close/",
        PeriodViewSet.as_view({"patch": "close"}),
        name="period-close",
    ),
    path(
        "classes/<uuid:class_pk>/subjects/",
        ClassSubjectViewSet.as_view({"get": "list", "post": "create"}),
        name="class-subjects",
    ),
    path(
        "attendances/",
        AttendanceViewSet.as_view({"get": "list", "post": "create"}),
        name="attendance-list",
    ),
    path(
        "attendances/<uuid:pk>/",
        AttendanceViewSet.as_view({"patch": "partial_update"}),
        name="attendance-detail",
    ),
]
