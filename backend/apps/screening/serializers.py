from rest_framework import serializers

from apps.masterdata.models import EntryPoint as Port
from apps.travelers.models import Traveler

from .models import HealthScreening


class HealthScreeningSerializer(serializers.ModelSerializer):
    traveler = serializers.PrimaryKeyRelatedField(queryset=Traveler.objects.all())
    port = serializers.PrimaryKeyRelatedField(queryset=Port.objects.all())
    officer = serializers.HiddenField(default=serializers.CurrentUserDefault())
    traveler_name = serializers.CharField(source='traveler.full_name', read_only=True)
    passport_number = serializers.CharField(source='traveler.passport_number', read_only=True)

    class Meta:
        model = HealthScreening
        fields = [
            'id', 'traveler', 'traveler_name', 'passport_number', 'port', 'officer',
            'body_temperature', 'oxygen_saturation', 'systolic_bp', 'diastolic_bp',
            'observed_symptoms', 'officer_notes', 'screened_at',
        ]
        read_only_fields = ['id', 'screened_at']


class ScanQrSerializer(serializers.Serializer):
    qr_data = serializers.CharField()
