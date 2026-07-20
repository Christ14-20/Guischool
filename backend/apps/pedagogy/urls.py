from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.pedagogy.views import SchoolYearViewSet, PeriodViewSet

router = DefaultRouter()
router.register(r"schoolyears", SchoolYearViewSet, basename="schoolyear")

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
]
