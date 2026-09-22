from django.contrib import admin

from .models import Carrier, Flight, HealthNotice, ManifestPassenger, PassengerManifest


@admin.register(Carrier)
class CarrierAdmin(admin.ModelAdmin):
    list_display = ['name', 'iata_code', 'icao_code', 'is_active']
    search_fields = ['name', 'iata_code', 'icao_code']


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ['flight_number', 'carrier', 'origin_code', 'destination_port', 'scheduled_arrival', 'status']
    list_filter = ['status', 'flight_type']
    search_fields = ['flight_number']


@admin.register(PassengerManifest)
class PassengerManifestAdmin(admin.ModelAdmin):
    list_display = ['flight', 'status', 'total_passengers', 'processed_at']
    list_filter = ['status']


@admin.register(ManifestPassenger)
class ManifestPassengerAdmin(admin.ModelAdmin):
    list_display = ['passport_number', 'first_name', 'last_name', 'nationality']
    search_fields = ['passport_number', 'first_name', 'last_name']


@admin.register(HealthNotice)
class HealthNoticeAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'priority', 'is_active', 'published_at']
    list_filter = ['category', 'priority', 'is_active']
    search_fields = ['title']
