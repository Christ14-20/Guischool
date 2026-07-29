"""
apps/communication/webhook_urls.py — COMM-MVP-01

URLs pour les webhooks Africa's Talking — hors /api/v1/.
"""

from django.urls import path
from . import views

urlpatterns = [
    path("africastalking/delivery/", views.africastalking_delivery_webhook, name="at-delivery-webhook"),
]
