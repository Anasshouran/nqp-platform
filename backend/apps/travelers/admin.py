from django.contrib import admin

from .models import Country, Traveler, TravelerDocument, TravelerStatusLog


class TravelerDocumentInline(admin.TabularInline):
    model = TravelerDocument
    extra = 0


class TravelerStatusLogInline(admin.TabularInline):
    model = TravelerStatusLog
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'note', 'changed_by', 'created_at']
    can_delete = False


@admin.register(Traveler)
class TravelerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'passport_number', 'nationality', 'registration_status', 'created_at']
    list_filter = ['registration_status', 'nationality']
    search_fields = ['passport_number', 'first_name', 'last_name', 'email', 'phone']
    inlines = [TravelerDocumentInline, TravelerStatusLogInline]


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'name_ar']
    search_fields = ['code', 'name', 'name_ar']


@admin.register(TravelerDocument)
class TravelerDocumentAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'document_type', 'uploaded_at']
    list_filter = ['document_type']
    search_fields = ['traveler__passport_number']


@admin.register(TravelerStatusLog)
class TravelerStatusLogAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'to_status', 'created_at']
    list_filter = ['to_status']
    search_fields = ['traveler__passport_number', 'note']
