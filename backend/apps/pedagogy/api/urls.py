"""apps/pedagogy/api/urls.py — Routes /pedagogy/* + /students/* + /grades/* + /year-end-decisions/*"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.pedagogy.api.views import (
    SchoolYearViewSet, LevelViewSet, FiliereViewSet, ClassViewSet, SubjectViewSet,
    TimetableSlotViewSet, EvaluationViewSet, AttendanceViewSet,
    StudentViewSet, GradeViewSet, YearEndDecisionViewSet, BulkPromotionView,
    MixedClassViewSet, ClassGroupViewSet, SubGroupViewSet,
)

router = DefaultRouter()

# Module pédagogie de base
router.register("pedagogy/schoolyears", SchoolYearViewSet, basename="schoolyear")
router.register("pedagogy/levels", LevelViewSet, basename="level")
router.register("pedagogy/filieres", FiliereViewSet, basename="filiere")
router.register("pedagogy/classes", ClassViewSet, basename="class")
router.register("pedagogy/subjects", SubjectViewSet, basename="subject")
router.register("pedagogy/timetable", TimetableSlotViewSet, basename="timetable")
router.register("pedagogy/evaluations", EvaluationViewSet, basename="evaluation")
router.register("pedagogy/attendances", AttendanceViewSet, basename="attendance")

# Classes mixtes
router.register("pedagogy/mixed-classes", MixedClassViewSet, basename="mixed-class")

# Groupes et sous-groupes
router.register("pedagogy/groups", ClassGroupViewSet, basename="group")
router.register("pedagogy/subgroups", SubGroupViewSet, basename="subgroup")

# Module 4.5 — Élèves & Notes
router.register("students", StudentViewSet, basename="student")
router.register("grades", GradeViewSet, basename="grade")
router.register("year-end-decisions", YearEndDecisionViewSet, basename="year-end-decision")
router.register("promotions", BulkPromotionView, basename="bulk-promotion")

# Nested: /pedagogy/classes/{id}/groups/
nested_groups = ClassGroupViewSet.as_view({
    "get": "list",
    "post": "create",
})
nested_group_detail = ClassGroupViewSet.as_view({
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
})

urlpatterns = [
    path("", include(router.urls)),
    path("pedagogy/classes/<int:classe_pk>/groups/", nested_groups, name="class-group-list"),
    path("pedagogy/classes/<int:classe_pk>/groups/<int:pk>/", nested_group_detail, name="class-group-detail"),
]
