from rest_framework import serializers

from apps.carriers.models import Flight
from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Traveler

from .models import (
    AircraftInspection,
    AirportScreening,
    AirportTerminal,
    CrewHealthRecord,
    ScreeningPoint,
)


class AirportDashboardSerializer(serializers.Serializer):
    kpis = serializers.DictField()
    upcoming_flights = serializers.ListField(child=serializers.DictField())
    suspected = serializers.ListField(child=serializers.DictField())
    tasks = serializers.ListField(child=serializers.DictField())
    alerts = serializers.ListField(child=serializers.DictField())
    report = serializers.DictField()


class PortSerializer(serializers.ModelSerializer):
    """إدارة منافذ الدخول (masterdata.EntryPoint) — المطار نوع AIRPORT."""
    state_name = serializers.CharField(source='state.name_ar', read_only=True)

    class Meta:
        model = Port
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'kind', 'state', 'state_name',
            'location', 'description', 'order', 'is_active',
        ]
        read_only_fields = ['id']


class PortWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Port
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'kind', 'state',
            'location', 'description', 'order', 'is_active',
        ]
        read_only_fields = ['id']


class AirportTerminalSerializer(serializers.ModelSerializer):
    port_name = serializers.CharField(source='port.name_ar', read_only=True)

    class Meta:
        model = AirportTerminal
        fields = ['id', 'port', 'port_name', 'terminal_code', 'name_ar', 'name_en', 'capacity', 'location_geo', 'is_active']
        read_only_fields = ['id']


class ScreeningPointSerializer(serializers.ModelSerializer):
    terminal_name = serializers.CharField(source='terminal.name_ar', read_only=True)

    class Meta:
        model = ScreeningPoint
        fields = ['id', 'terminal', 'terminal_name', 'point_code', 'point_type', 'location_geo', 'is_active']
        read_only_fields = ['id']


class AirportScreeningSerializer(serializers.ModelSerializer):
    traveler = serializers.SlugRelatedField(slug_field='passport_number', queryset=Traveler.objects.all())
    screening_point = serializers.SlugRelatedField(slug_field='point_code', queryset=ScreeningPoint.objects.all())
    flight = serializers.SlugRelatedField(slug_field='flight_number', queryset=Flight.objects.all(), required=False, allow_null=True)
    screened_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    traveler_name = serializers.CharField(source='traveler.full_name', read_only=True)
    point_name = serializers.CharField(source='screening_point.point_code', read_only=True)
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True, default=None)
    screened_by_name = serializers.CharField(source='screened_by.full_name', read_only=True)

    class Meta:
        model = AirportScreening
        fields = [
            'id', 'traveler', 'traveler_name', 'screening_point', 'point_name',
            'flight', 'flight_number', 'screening_type',
            'body_temperature', 'oxygen_saturation', 'symptoms',
            'risk_level', 'status', 'screened_by', 'screened_by_name', 'screened_at',
        ]
        read_only_fields = ['id', 'risk_level', 'status', 'screened_at']


class AircraftInspectionSerializer(serializers.ModelSerializer):
    flight = serializers.SlugRelatedField(slug_field='flight_number', queryset=Flight.objects.all())
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)

    class Meta:
        model = AircraftInspection
        fields = [
            'id', 'aircraft_registration', 'flight', 'flight_number', 'inspection_date',
            'inspector', 'inspector_name',
            'cleanliness_status', 'water_quality_status', 'toilets_status',
            'medical_waste_status', 'pest_control_status', 'rodent_control_status',
            'food_safety_status', 'findings', 'overall_status', 'certificate_issued',
        ]
        read_only_fields = ['id', 'inspection_date', 'overall_status', 'certificate_issued']


class CrewHealthRecordSerializer(serializers.ModelSerializer):
    flight = serializers.SlugRelatedField(slug_field='flight_number', queryset=Flight.objects.all())
    crew_name = serializers.CharField(source='crew.full_name', read_only=True)
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)

    class Meta:
        model = CrewHealthRecord
        fields = [
            'id', 'crew', 'crew_name', 'flight', 'flight_number', 'health_status',
            'temperature', 'symptoms', 'medical_clearance_date', 'next_clearance_date', 'notes',
        ]
        read_only_fields = ['id']
