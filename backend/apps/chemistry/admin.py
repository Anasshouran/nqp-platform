from django.contrib import admin

from .models import ChemistryAnalysisSession, ChemistryEquipment, ChemistryReagent, ChemistryTest, QCRecord


@admin.register(ChemistryTest)
class ChemistryTestAdmin(admin.ModelAdmin):
    list_display = ['product', 'test_type', 'priority', 'status', 'received_at']
    list_filter = ['test_type', 'priority', 'status']
    search_fields = ['product']


@admin.register(ChemistryEquipment)
class ChemistryEquipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'serial_number', 'status']
    list_filter = ['status']
    search_fields = ['name', 'serial_number']


@admin.register(ChemistryReagent)
class ChemistryReagentAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'lot_number', 'quantity', 'status']
    list_filter = ['status']
    search_fields = ['name', 'lot_number']


@admin.register(QCRecord)
class QCRecordAdmin(admin.ModelAdmin):
    list_display = ['control_sample', 'test_type', 'status', 'result', 'performed_at']
    list_filter = ['status']
    search_fields = ['control_sample']


@admin.register(ChemistryAnalysisSession)
class ChemistryAnalysisSessionAdmin(admin.ModelAdmin):
    list_display = ['test_type', 'analyst', 'result_value', 'compliance', 'started_at']
    list_filter = ['compliance', 'status']
    search_fields = ['test_type']
