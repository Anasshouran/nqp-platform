from django.contrib import admin

from .models import HealthScreening


@admin.register(HealthScreening)
class HealthScreeningAdmin(admin.ModelAdmin):
    list_display = ['traveler', 'port', 'officer', 'body_temperature', 'screened_at']
    search_fields = ['traveler__full_name', 'port__name_ar']
