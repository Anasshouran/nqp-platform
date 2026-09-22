from rest_framework import serializers

from django.contrib.auth import get_user_model

from .models import (
    Berth,
    CargoInspection,
    CrewMember,
    FoodWaterInspection,
    HealthCertificate,
    HealthDeclaration,
    IsolationRecord,
    Passenger,
    PortEmergency,
    SanitationCertificate,
    SeaPort,
    ShipInspection,
    SurveillanceCase,
    VectorControl,
    Vessel,
    VesselVisit,
    WasteInspection,
)


class PortHealthDashboardSerializer(serializers.Serializer):
    seaports = serializers.IntegerField()
    vessels = serializers.IntegerField()
    arrived_vessels = serializers.IntegerField()
    inspections = serializers.IntegerField()
    pending_certificates = serializers.IntegerField()
    suspected_cases = serializers.IntegerField()
    active_isolation = serializers.IntegerField()
    open_emergencies = serializers.IntegerField()


User = get_user_model()


class SeaPortSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeaPort
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'location', 'capacity',
            'authorities', 'description', 'is_active',
        ]
        read_only_fields = ['id']


class BerthSerializer(serializers.ModelSerializer):
    port_name = serializers.CharField(source='port.name_ar', read_only=True)

    class Meta:
        model = Berth
        fields = ['id', 'port', 'port_name', 'code', 'name_ar', 'max_draft', 'is_active']
        read_only_fields = ['id']


class VesselSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vessel
        fields = [
            'id', 'vessel_name', 'imo_number', 'flag_state', 'shipping_company',
            'vessel_type', 'gross_tonnage', 'last_port_of_call',
            'arrival_date', 'departure_date', 'status', 'notes',
        ]
        read_only_fields = ['id']


class VesselVisitSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    berth_code = serializers.CharField(source='berth.code', read_only=True, default=None)

    class Meta:
        model = VesselVisit
        fields = [
            'id', 'vessel', 'vessel_name', 'port', 'port_name', 'berth', 'berth_code',
            'arrival_date', 'departure_date', 'status',
        ]
        read_only_fields = ['id']


class CrewMemberSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = CrewMember
        fields = [
            'id', 'vessel', 'vessel_name', 'full_name', 'nationality',
            'passport_number', 'job_title', 'health_status',
            'temperature', 'symptoms', 'notes',
        ]
        read_only_fields = ['id']


class PassengerSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = Passenger
        fields = [
            'id', 'vessel', 'vessel_name', 'full_name', 'nationality',
            'passport_number', 'cabin_number', 'health_status',
            'temperature', 'symptoms', 'notes',
        ]
        read_only_fields = ['id']


class HealthDeclarationSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = HealthDeclaration
        fields = [
            'id', 'vessel', 'vessel_name', 'visit', 'captain_name', 'declaration_date',
            'illness_on_board', 'deaths_on_board', 'reported_diseases',
            'visited_ports', 'status', 'notes',
        ]
        read_only_fields = ['id']


class ShipInspectionSerializer(serializers.ModelSerializer):
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = ShipInspection
        fields = [
            'id', 'vessel', 'vessel_name', 'visit', 'inspection_date', 'inspector', 'inspector_name',
            'accommodation_status', 'kitchen_status', 'storeroom_status', 'clinic_status',
            'water_tank_status', 'toilet_status', 'ventilation_status', 'cleanliness_status',
            'findings', 'overall_status', 'certificate_issued',
        ]
        read_only_fields = ['id', 'inspection_date', 'certificate_issued']


class FoodWaterInspectionSerializer(serializers.ModelSerializer):
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = FoodWaterInspection
        fields = [
            'id', 'vessel', 'vessel_name', 'inspection_date', 'inspector', 'inspector_name',
            'food_safety_status', 'food_expiry_status', 'storage_temp_status',
            'drinking_water_status', 'ice_status', 'samples_collected', 'sample_status', 'findings',
        ]
        read_only_fields = ['id', 'inspection_date']


class SanitationCertificateSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = SanitationCertificate
        fields = [
            'id', 'certificate_number', 'certificate_type', 'vessel', 'vessel_name',
            'inspection', 'issue_date', 'expiry_date', 'status', 'qr_code',
        ]
        read_only_fields = ['id']


class IsolationRecordSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = IsolationRecord
        fields = [
            'id', 'vessel', 'vessel_name', 'person_name', 'person_type',
            'start_date', 'end_date', 'status', 'notes',
        ]
        read_only_fields = ['id']


class SurveillanceCaseSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = SurveillanceCase
        fields = [
            'id', 'vessel', 'vessel_name', 'disease_name', 'person_name',
            'report_date', 'status', 'international_alert', 'notes',
        ]
        read_only_fields = ['id', 'report_date']


class VectorControlSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = VectorControl
        fields = [
            'id', 'vessel', 'vessel_name', 'control_type', 'inspection_date',
            'evidence_found', 'treatment_applied', 'campaign_name', 'notes',
        ]
        read_only_fields = ['id', 'inspection_date']


class CargoInspectionSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = CargoInspection
        fields = [
            'id', 'vessel', 'vessel_name', 'declaration_number', 'cargo_type',
            'country_of_origin', 'description', 'status', 'laboratory_result', 'decision',
        ]
        read_only_fields = ['id']


class WasteInspectionSerializer(serializers.ModelSerializer):
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = WasteInspection
        fields = [
            'id', 'vessel', 'vessel_name', 'inspection_date', 'inspector', 'inspector_name',
            'medical_waste_status', 'food_waste_status', 'wastewater_status',
            'safe_disposal_status', 'findings',
        ]
        read_only_fields = ['id', 'inspection_date']


class PortEmergencySerializer(serializers.ModelSerializer):
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True, default=None)

    class Meta:
        model = PortEmergency
        fields = [
            'id', 'port', 'port_name', 'vessel', 'vessel_name', 'title',
            'description', 'severity', 'status', 'vessel_restricted', 'reported_at',
        ]
        read_only_fields = ['id', 'reported_at']


class HealthCertificateSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    class Meta:
        model = HealthCertificate
        fields = [
            'id', 'certificate_number', 'certificate_type', 'vessel', 'vessel_name',
            'inspection', 'issue_date', 'expiry_date', 'status', 'notes',
        ]
        read_only_fields = ['id']
