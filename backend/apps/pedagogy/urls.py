from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.pedagogy.views import (
    SchoolYearViewSet, PeriodViewSet, LevelViewSet, ClassViewSet,
    SubjectViewSet, ClassSubjectViewSet, AttendanceViewSet,
    EvaluationViewSet, GradeViewSet, YearEndDecisionViewSet,
    task_status, promotions_bulk,
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
    path(
        "attendances/<uuid:pk>/justify/",
        AttendanceViewSet.as_view({"patch": "justify"}),
        name="attendance-justify",
    ),
    # Épic 6 — Notes, Évaluations, Bulletins
    path(
        "evaluations/",
        EvaluationViewSet.as_view({"get": "list", "post": "create"}),
        name="evaluation-list",
    ),
    path(
        "evaluations/<uuid:pk>/",
        EvaluationViewSet.as_view({"get": "retrieve"}),
        name="evaluation-detail",
    ),
    path(
        "evaluations/<uuid:pk>/lock/",
        EvaluationViewSet.as_view({"patch": "lock"}),
        name="evaluation-lock",
    ),
    path(
        "grades/bulk/",
        GradeViewSet.as_view({"post": "bulk"}),
        name="grades-bulk",
    ),
    path(
        "grades/",
        GradeViewSet.as_view({"get": "list"}),
        name="grades-list",
    ),
    path(
        "grades/<uuid:pk>/",
        GradeViewSet.as_view({"get": "retrieve"}),
        name="grade-detail",
    ),
    path(
        "classes/<uuid:pk>/classement/",
        ClassViewSet.as_view({"get": "classement"}),
        name="class-classement",
    ),
    path(
        "tasks/<uuid:task_id>/status/",
        task_status,
        name="task-status",
    ),
    # GRADE-MVP-04 — Décision de fin de trimestre/année
    path(
        "year-end-decisions/",
        YearEndDecisionViewSet.as_view({"get": "list", "post": "create"}),
        name="year-end-decisions",
    ),
    path(
        "promotions/bulk/",
        promotions_bulk,
        name="promotions-bulk",
    ),
]
