from django.urls import path

from apps.pedagogy.views import GuardianViewSet

urlpatterns = [
    path(
        "<uuid:student_pk>/guardians/",
        GuardianViewSet.as_view({"get": "list", "post": "create"}),
        name="student-guardians",
    ),
]
