from django.contrib import admin

from .models import ClinicReferral, ClinicVisit, EMRRecord, LabRequest, Medication, Prescription


@admin.register(ClinicReferral)
class ClinicReferralAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'port', 'status', 'created_at']
    list_filter = ['status']


@admin.register(ClinicVisit)
class ClinicVisitAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'doctor', 'visit_status', 'opened_at', 'closed_at']
    list_filter = ['visit_status']


@admin.register(EMRRecord)
class EMRRecordAdmin(admin.ModelAdmin):
    list_display = ['visit', 'created_at']


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ['name', 'generic_name', 'unit']
    search_fields = ['name', 'generic_name']


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['visit', 'medication', 'dosage', 'frequency', 'duration_days']
    list_filter = ['medication']


@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ['barcode', 'visit', 'sample_type', 'priority', 'status']
    list_filter = ['priority', 'status']
