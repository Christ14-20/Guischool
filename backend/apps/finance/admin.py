from django.contrib import admin
from .models import FeeCategory, StudentFee, Payment, Invoice

@admin.register(FeeCategory)
class FeeCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "amount", "tenant", "school_year", "is_mandatory")
    list_filter = ("type", "is_mandatory", "tenant", "school_year")
    search_fields = ("name",)

@admin.register(StudentFee)
class StudentFeeAdmin(admin.ModelAdmin):
    list_display = ("student", "fee_category", "total_amount", "balance_due", "tenant")
    list_filter = ("fee_category", "tenant")
    search_fields = ("student__nom", "student__prenom", "student__matricule")

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "student", "amount", "method", "payment_date", "status")
    list_filter = ("method", "status", "payment_date", "tenant")
    search_fields = ("receipt_number", "student__nom", "student__prenom", "reference")
    readonly_fields = ("receipt_number", "created_at")

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("student", "school_year", "total_due", "total_paid", "balance", "status")
    list_filter = ("status", "school_year", "tenant")
    search_fields = ("student__nom", "student__prenom")
    readonly_fields = ("created_at",)
