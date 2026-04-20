from django.contrib import admin
from .models import Plan, Tenant, Subscription

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "max_students", "max_staff", "price_monthly", "price_annual")
    list_editable = ("max_students", "max_staff", "price_monthly", "price_annual")

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "type", "status", "plan", "created_at")
    list_filter = ("type", "status", "plan")
    search_fields = ("name", "slug", "code_minedu")
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("tenant", "plan", "status", "start_date", "end_date")
    list_filter = ("status", "plan")
    search_fields = ("tenant__name",)
