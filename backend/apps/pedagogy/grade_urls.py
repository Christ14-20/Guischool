from django.urls import path

from apps.pedagogy.views import GradeViewSet

urlpatterns = [
    path(
        "<uuid:pk>/valider/",
        GradeViewSet.as_view({"post": "valider"}),
        name="grade-valider",
    ),
    path(
        "<uuid:pk>/modifier-apres-validation/",
        GradeViewSet.as_view({"patch": "modifier_apres_validation"}),
        name="grade-modifier",
    ),
]
