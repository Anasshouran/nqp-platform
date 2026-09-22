from django.contrib import admin

from .models import (
    CertificateVerification,
    InventoryTransaction,
    VaccinationCertificate,
    VaccinationRecord,
    VaccinationRule,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)


@admin.register(Vaccine)
class VaccineAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'route', 'series', 'required', 'is_active', 'order']
    list_filter = ['required', 'is_active', 'route']
    search_fields = ['code', 'name_ar', 'name_en']
    ordering = ['order', 'name_ar']


@admin.register(VaccineBatch)
class VaccineBatchAdmin(admin.ModelAdmin):
    list_display = ['lot_number', 'vaccine', 'manufacturer', 'expiry_date', 'available_quantity', 'status']
    list_filter = ['status', 'vaccine']
    search_fields = ['lot_number', 'manufacturer']


@admin.register(VaccinationSite)
class VaccinationSiteAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'kind', 'entry_point', 'location', 'is_active']
    list_filter = ['kind', 'is_active']
    search_fields = ['name_ar', 'name_en', 'location']


@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'vaccine', 'dose_number', 'dose_type', 'administered_at', 'status']
    list_filter = ['status', 'dose_type', 'vaccine']
    search_fields = ['traveler__passport_number', 'vaccine__name_ar', 'batch__lot_number']


@admin.register(VaccinationRule)
class VaccinationRuleAdmin(admin.ModelAdmin):
    list_display = ['title_ar', 'vaccine', 'required', 'doses_required', 'validity_days']
    list_filter = ['required']
    search_fields = ['title_ar', 'vaccine__name_ar']


@admin.register(VaccinationCertificate)
class VaccinationCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'traveler', 'vaccine', 'status', 'issued_at', 'valid_until']
    list_filter = ['status']
    search_fields = ['certificate_number', 'traveler__passport_number', 'traveler__first_name']


@admin.register(CertificateVerification)
class CertificateVerificationAdmin(admin.ModelAdmin):
    list_display = ['certificate', 'success', 'verified_by', 'created_at']
    list_filter = ['success']


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ['batch', 'type', 'quantity', 'created_by', 'created_at']
    list_filter = ['type']
    search_fields = ['batch__lot_number', 'note']