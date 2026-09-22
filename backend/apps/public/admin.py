from django.contrib import admin

from .models import ContactMessage, HealthCertificate, Service, ServiceCategory


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'is_read', 'created_at']
    list_filter = ['is_read']
    search_fields = ['name', 'email', 'subject', 'message']
    readonly_fields = ['created_at']


@admin.register(HealthCertificate)
class HealthCertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'traveler_name', 'passport_number', 'certificate_type', 'expiry_date', 'is_valid']
    list_filter = ['certificate_type', 'is_valid']
    search_fields = ['certificate_number', 'traveler_name', 'passport_number']


class ServiceInline(admin.TabularInline):
    model = Service
    extra = 0
    fields = ['code', 'name_ar', 'route', 'requires_auth', 'status', 'sort_order', 'is_active']


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'code', 'icon', 'sort_order', 'is_active']
    list_editable = ['sort_order', 'is_active']
    list_filter = ['sectors']
    search_fields = ['name_ar', 'name_en', 'code']
    prepopulated_fields = {'code': ('name_ar',)}
    filter_horizontal = ['sectors']
    inlines = [ServiceInline]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'category', 'route', 'audience', 'requires_auth', 'status', 'sort_order', 'is_active']
    list_filter = ['category', 'audience', 'requires_auth', 'status', 'is_active']
    search_fields = ['name_ar', 'name_en', 'code', 'description_ar']
    prepopulated_fields = {'code': ('name_ar',)}
