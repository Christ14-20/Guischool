"""apps/pedagogy/api/urls.py — Routes /pedagogy/* + /students/* + /grades/* + /year-end-decisions/*"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.pedagogy.api.views import (
    SchoolYearViewSet, LevelViewSet, FiliereViewSet, ClassViewSet, SubjectViewSet,
    TimetableSlotViewSet, EvaluationViewSet, AttendanceViewSet,
    StudentViewSet, GradeViewSet, YearEndDecisionViewSet, BulkPromotionView,
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

# Module 4.5 — Élèves & Notes
router.register("students", StudentViewSet, basename="student")
router.register("grades", GradeViewSet, basename="grade")
router.register("year-end-decisions", YearEndDecisionViewSet, basename="year-end-decision")
router.register("promotions", BulkPromotionView, basename="bulk-promotion")

urlpatterns = [
    path("", include(router.urls)),
]
