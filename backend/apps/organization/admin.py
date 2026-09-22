from django.contrib import admin

from .models import Department, Locality, OrgAssignment, OrgPosition, Sector, Station


@admin.register(OrgPosition)
class OrgPositionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'level', 'parent', 'order', 'is_active']
    list_filter = ['level', 'is_active']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'name_en', 'region', 'phone', 'email', 'color', 'order', 'is_active']
    list_filter = ['is_active', 'region']
    search_fields = ['code', 'name_ar', 'name_en', 'email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'sector', 'manager_position', 'order', 'is_active']
    list_filter = ['is_active', 'sector']
    search_fields = ['code', 'name_ar', 'name_en']


@admin.register(Locality)
class LocalityAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'sector', 'location', 'order', 'is_active']
    list_filter = ['is_active', 'sector']
    search_fields = ['code', 'name_ar', 'name_en', 'location']


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'department', 'sector', 'location', 'order', 'is_active']
    list_filter = ['is_active', 'sector', 'department']
    search_fields = ['code', 'name_ar', 'name_en', 'location']


@admin.register(OrgAssignment)
class OrgAssignmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'position', 'sector', 'department', 'station', 'is_primary', 'is_active']
    list_filter = ['is_active', 'is_primary']
    search_fields = ['user__email', 'user__full_name']
