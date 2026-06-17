from django.contrib import admin
from .models import Plan, Tenant, Subscription, TenantNetwork

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "max_students", "max_staff", "price_monthly", "price_annual")
    list_editable = ("max_students", "max_staff", "price_monthly", "price_annual")

@admin.register(TenantNetwork)
class TenantNetworkAdmin(admin.ModelAdmin):
    list_display = ("name", "admin_network", "created_at")
    search_fields = ("name", "admin_network__email")

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "type", "status", "plan", "network", "education_system", "created_at")
    list_filter = ("type", "status", "plan", "network", "education_system")
    search_fields = ("name", "slug", "code_minedu", "nif")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets = (
        (None, {"fields": ("name", "slug", "logo", "type", "status", "plan", "network")}),
        ("Identité légale", {"fields": ("code_minedu", "nif", "registre_commerce")}),
        ("Localisation", {"fields": ("timezone", "date_format", "first_day_week", "default_lang", "default_currency")}),
        ("Éducation", {"fields": ("education_system", "active_levels", "exams_prepared")}),
        ("Modules", {"fields": (
            "has_internat", "has_transport", "has_cantine", "has_bibliotheque", "has_labo",
            "has_official_exams", "has_payroll", "has_whatsapp", "has_offline_advanced",
            "has_predictive_analytics",
        )}),
        ("Contact", {"fields": ("address", "phone", "email", "settings")}),
    )

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("tenant", "plan", "status", "start_date", "end_date")
    list_filter = ("status", "plan")
    search_fields = ("tenant__name",)
