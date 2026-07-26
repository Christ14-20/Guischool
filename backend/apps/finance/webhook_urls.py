"""
apps/finance/webhook_urls.py

URLs pour les webhooks — hors /api/v1/ car appelés par des systèmes
externes (Orange Money) qui ne connaissent pas notre versioning.
"""

from django.urls import path
from . import views

urlpatterns = [
    path("orange-money/", views.orange_money_webhook, name="payment-om-webhook"),
]
