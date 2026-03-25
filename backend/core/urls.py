from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    # API versionnées
    path('api/v1/superadmin/', include('apps.superadmin.api.urls')),
]
