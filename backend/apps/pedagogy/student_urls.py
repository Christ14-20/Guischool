from django.urls import path

from apps.pedagogy.views import GuardianViewSet, StudentViewSet

urlpatterns = [
    path(
        "",
        StudentViewSet.as_view({"get": "list", "post": "create"}),
        name="student-list",
    ),
    path(
        "<uuid:pk>/",
        StudentViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="student-detail",
    ),
    path(
        "<uuid:pk>/reinscription/",
        StudentViewSet.as_view({"post": "reinscription"}),
        name="student-reinscription",
    ),
    path(
        "<uuid:pk>/archiver/",
        StudentViewSet.as_view({"post": "archiver"}),
        name="student-archiver",
    ),
    path(
        "<uuid:pk>/moyenne/",
        StudentViewSet.as_view({"get": "moyenne"}),
        name="student-moyenne",
    ),
    path(
        "<uuid:pk>/bulletin/",
        StudentViewSet.as_view({"post": "bulletin"}),
        name="student-bulletin",
    ),
    path(
        "<uuid:student_pk>/guardians/",
        GuardianViewSet.as_view({"get": "list", "post": "create"}),
        name="student-guardians",
    ),
]
