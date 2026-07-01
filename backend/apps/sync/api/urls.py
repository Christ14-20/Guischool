from django.urls import path
from apps.sync.api.views import SyncPushView, SyncPullView, SyncStatusView

urlpatterns = [
    path("push/", SyncPushView.as_view(), name="sync-push"),
    path("pull/", SyncPullView.as_view(), name="sync-pull"),
    path("status/", SyncStatusView.as_view(), name="sync-status"),
]
