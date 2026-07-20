from django.urls import path

from apps.pedagogy.views import GuardianViewSet, StudentViewSet

urlpatterns = [
    path(
        "",
        StudentViewSet.as_view({"post": "create"}),
        name="student-list",
    ),
    path(
        "<uuid:student_pk>/guardians/",
        GuardianViewSet.as_view({"get": "list", "post": "create"}),
        name="student-guardians",
    ),
]
