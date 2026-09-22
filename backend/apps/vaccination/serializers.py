from rest_framework import serializers

from apps.travelers.models import Traveler
from .models import (
    CertificateVerification,
    InventoryTransaction,
    VaccinationCertificate,
    VaccinationRecord,
    VaccinationRule,
    VaccinationSite,
    Vaccine,
    VaccineBatch,
)


class VaccineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vaccine
        fields = (
            'id', 'code', 'who_code', 'name_ar', 'name_en', 'route',
            'series', 'booster_required', 'interval_days', 'validity_days',
            'required', 'description', 'order', 'is_active', 'created_at',
        )
        read_only_fields = ['id', 'created_at']


class VaccineBatchSerializer(serializers.ModelSerializer):
    vaccine_name_ar = serializers.CharField(source='vaccine.name_ar', read_only=True)
    remaining_percent = serializers.SerializerMethodField()

    class Meta:
        model = VaccineBatch
        fields = (
            'id', 'vaccine', 'vaccine_name_ar', 'lot_number', 'manufacturer',
            'manufacture_date', 'expiry_date', 'received_quantity', 'available_quantity',
            'status', 'received_at', 'remaining_percent',
        )
        read_only_fields = ['id', 'received_at', 'available_quantity', 'remaining_percent']

    def get_remaining_percent(self, obj):
        if not obj.received_quantity:
            return 0
        return round(obj.available_quantity * 100 / obj.received_quantity, 1)


class VaccinationSiteSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default='')

    class Meta:
        model = VaccinationSite
        fields = (
            'id', 'name_ar', 'name_en', 'kind', 'entry_point', 'entry_point_name',
            'location', 'address', 'phone', 'is_active',
        )
        read_only_fields = ['id']


class TravelerBriefSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    country_name = serializers.CharField(source='nationality.name_ar', read_only=True, default='')

    class Meta:
        model = Traveler
        fields = ('id', 'full_name', 'passport_number', 'date_of_birth', 'nationality', 'country_name', 'medical_file_no', 'qr_token')
        read_only_fields = fields


class VaccinationRecordSerializer(serializers.ModelSerializer):
    traveler = TravelerBriefSerializer(read_only=True)
    traveler_id = serializers.UUIDField(write_only=True, required=False)
    vaccine_name_ar = serializers.CharField(source='vaccine.name_ar', read_only=True)
    vaccine_code = serializers.CharField(source='vaccine.code', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default='')
    lot_number = serializers.CharField(source='batch.lot_number', read_only=True, default='')
    vaccinator_name = serializers.SerializerMethodField()
    dose_type_label = serializers.CharField(source='get_dose_type_display', read_only=True)

    class Meta:
        model = VaccinationRecord
        fields = (
            'id', 'traveler', 'traveler_id', 'vaccine', 'vaccine_name_ar', 'vaccine_code',
            'batch', 'lot_number', 'dose_type', 'dose_type_label', 'dose_number',
            'administered_at', 'site', 'site_name', 'vaccinator', 'vaccinator_name',
            'recorded_by', 'notes', 'status', 'created_at',
        )
        read_only_fields = ['id', 'recorded_by', 'created_at']

    def get_vaccinator_name(self, obj):
        return getattr(obj.vaccinator, 'full_name', '') or ''

    def validate(self, attrs):
        vaccine = attrs.get('vaccine')
        if vaccine is None:
            raise serializers.ValidationError({'vaccine': 'اللقاح مطلوب'})
        return attrs


class VaccinationCertificateSerializer(serializers.ModelSerializer):
    traveler = TravelerBriefSerializer(read_only=True)
    vaccine_name_ar = serializers.CharField(source='vaccine.name_ar', read_only=True, default='')
    vaccine_code = serializers.CharField(source='vaccine.code', read_only=True, default='')
    issued_by_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = VaccinationCertificate
        fields = (
            'id', 'traveler', 'record', 'vaccine', 'vaccine_name_ar', 'vaccine_code',
            'certificate_number', 'status', 'status_label', 'issued_by', 'issued_by_name',
            'issued_at', 'valid_until', 'validity_days', 'qr_token', 'verification_path',
        )
        read_only_fields = fields

    def get_issued_by_name(self, obj):
        return getattr(obj.issued_by, 'full_name', '') or ''


class VaccinationRuleSerializer(serializers.ModelSerializer):
    vaccine_name_ar = serializers.CharField(source='vaccine.name_ar', read_only=True)

    class Meta:
        model = VaccinationRule
        fields = (
            'id', 'vaccine', 'vaccine_name_ar', 'title_ar', 'destination_region',
            'min_age_days', 'max_age_days', 'required', 'doses_required',
            'validity_days', 'note',
        )
        read_only_fields = ['id']


class InventoryTransactionSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(source='batch.lot_number', read_only=True)
    vaccine_name_ar = serializers.CharField(source='batch.vaccine.name_ar', read_only=True)
    type_label = serializers.CharField(source='get_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryTransaction
        fields = (
            'id', 'batch', 'batch_number', 'vaccine_name_ar', 'type', 'type_label',
            'quantity', 'reference_record', 'created_by', 'created_by_name', 'note', 'created_at',
        )
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        return getattr(obj.created_by, 'full_name', '') or ''


class CertificateVerificationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CertificateVerification
        fields = ('id', 'certificate', 'verified_by', 'verified_by_name', 'success', 'ip_address', 'note', 'created_at')
        read_only_fields = fields

    def get_verified_by_name(self, obj):
        return getattr(obj.verified_by, 'full_name', '') or ''


class VaccinationAssessmentSerializer(serializers.Serializer):
    assessment = serializers.ListField()
    records = serializers.ListField()
    certificates = serializers.ListField()


class VaccinationDashboardSerializer(serializers.Serializer):
    doses_today = serializers.IntegerField()
    doses_this_week = serializers.IntegerField()
    total_records = serializers.IntegerField()
    active_certificates = serializers.IntegerField()
    batches_count = serializers.IntegerField()
    expiring_soon_batches = serializers.ListField()
    by_vaccine = serializers.ListField()
    recent_records = serializers.ListField()