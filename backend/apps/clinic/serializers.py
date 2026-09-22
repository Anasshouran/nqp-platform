from rest_framework import serializers

from apps.laboratory.models import Disease, LabResult
from apps.travelers.models import Traveler

from .models import (
    Clinic,
    ClinicReferral,
    ClinicStaff,
    ClinicType,
    ClinicVisit,
    EMRRecord,
    HealthCertificate,
    IsolationRecord,
    LabRequest,
    Medication,
    Prescription,
    TriageRecord,
)


class ClinicTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicType
        fields = ['id', 'code', 'name_ar', 'name_en', 'kind', 'services', 'order', 'is_active']


class ClinicStaffSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = ClinicStaff
        fields = ['id', 'clinic', 'user', 'user_name', 'role', 'is_active']
        read_only_fields = ['id', 'user_name']


class ClinicSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True)
    clinic_type_code = serializers.CharField(source='clinic_type.code', read_only=True)
    clinic_type_name = serializers.CharField(source='clinic_type.name_ar', read_only=True)
    staff = ClinicStaffSerializer(many=True, read_only=True)

    class Meta:
        model = Clinic
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'entry_point', 'entry_point_name',
            'sector', 'sector_name', 'clinic_type', 'clinic_type_code', 'clinic_type_name',
            'location', 'phone', 'email', 'services', 'order', 'is_active', 'staff',
        ]
        read_only_fields = ['id', 'staff']


class ClinicPatientSerializer(serializers.ModelSerializer):
    nationality_name = serializers.CharField(source='nationality.name_ar', read_only=True)

    class Meta:
        model = Traveler
        fields = [
            'id', 'passport_number', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'nationality', 'nationality_name', 'phone', 'email',
            'medical_file_no', 'qr_token', 'medical_history',
        ]
        read_only_fields = ['id', 'full_name', 'medical_file_no', 'qr_token']


class ClinicDashboardSerializer(serializers.Serializer):
    stats = serializers.DictField()
    open_visits = serializers.ListField(child=serializers.DictField())
    pending_referrals = serializers.ListField(child=serializers.DictField())


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ['id', 'name', 'generic_name', 'unit']


class ClinicReferralSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.full_name', read_only=True)
    passport_number = serializers.CharField(source='traveler.passport_number', read_only=True)
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name_ar', read_only=True)
    screening_id = serializers.CharField(read_only=True)
    nationality_name = serializers.CharField(source='traveler.nationality.name_ar', read_only=True, default='')
    date_of_birth = serializers.DateField(source='traveler.date_of_birth', read_only=True, default=None)

    body_temperature = serializers.SerializerMethodField()
    observed_symptoms = serializers.SerializerMethodField()
    officer_notes = serializers.SerializerMethodField()

    class Meta:
        model = ClinicReferral
        fields = [
            'id', 'screening_id', 'traveler', 'traveler_name', 'passport_number',
            'nationality_name', 'date_of_birth',
            'port', 'port_name', 'clinic', 'clinic_name', 'source', 'queue_no',
            'status', 'notes', 'created_at',
            'body_temperature', 'observed_symptoms', 'officer_notes',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def get_body_temperature(self, obj):
        return obj.screening.body_temperature if obj.screening else None

    def get_observed_symptoms(self, obj):
        return list(obj.screening.observed_symptoms or []) if obj.screening else []

    def get_officer_notes(self, obj):
        return obj.screening.officer_notes if obj.screening else ''


class ClinicVisitSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.full_name', read_only=True)
    passport_number = serializers.CharField(source='traveler.passport_number', read_only=True)
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name_ar', read_only=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = ClinicVisit
        fields = [
            'id', 'referral', 'clinic', 'clinic_name', 'phase', 'source',
            'traveler', 'traveler_name', 'passport_number',
            'doctor', 'doctor_name', 'visit_status', 'opened_at', 'closed_at',
        ]
        read_only_fields = ['id', 'visit_status', 'opened_at', 'closed_at']

    def get_source(self, instance):
        if instance.referral and instance.referral.source:
            return instance.referral.source
        return ClinicReferral.Source.SCREENING


class EMRRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMRRecord
        fields = ['id', 'visit', 'clinical_notes', 'vital_signs', 'physical_exam']
        read_only_fields = ['id']


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ['id', 'name', 'generic_name', 'unit', 'interactions']
        read_only_fields = ['id']


class PrescriptionSerializer(serializers.ModelSerializer):
    medication = serializers.PrimaryKeyRelatedField(queryset=Medication.objects.all())
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_unit = serializers.CharField(source='medication.unit', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'visit', 'medication', 'medication_name', 'medication_unit',
            'dosage', 'frequency', 'duration_days', 'instructions', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LabRequestSerializer(serializers.ModelSerializer):
    disease_code = serializers.SlugRelatedField(
        source='disease', slug_field='icd_11_code', queryset=Disease.objects.all(), write_only=True
    )
    disease = serializers.PrimaryKeyRelatedField(read_only=True)
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True)
    visit_traveler_name = serializers.CharField(source='visit.traveler.full_name', read_only=True)

    class Meta:
        model = LabRequest
        fields = [
            'id', 'visit', 'visit_traveler_name', 'sample_type', 'disease', 'disease_code',
            'disease_name', 'priority', 'barcode', 'status',
        ]
        read_only_fields = ['id', 'disease', 'disease_name', 'barcode', 'status']


class TriageRecordSerializer(serializers.ModelSerializer):
    triaged_by_name = serializers.CharField(source='triaged_by.full_name', read_only=True)

    class Meta:
        model = TriageRecord
        fields = [
            'id', 'visit', 'severity', 'temperature', 'heart_rate', 'respiratory_rate',
            'oxygen_saturation', 'systolic_bp', 'diastolic_bp', 'symptoms',
            'chief_complaint', 'routing', 'notes', 'triaged_by', 'triaged_by_name', 'triaged_at',
        ]
        read_only_fields = ['id', 'visit', 'triaged_by', 'triaged_at']


class ClinicEmrSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = EMRRecord
        fields = ['id', 'clinical_notes', 'vital_signs', 'physical_exam']


class IsolationRecordSerializer(serializers.ModelSerializer):
    started_by_name = serializers.CharField(source='started_by.full_name', read_only=True, default='')
    closed_by_name = serializers.CharField(source='closed_by.full_name', read_only=True, default='')
    traveler_name = serializers.CharField(source='visit.traveler.full_name', read_only=True, default='')
    passport_number = serializers.CharField(source='visit.traveler.passport_number', read_only=True, default='')
    clinic_name = serializers.CharField(source='visit.clinic.name_ar', read_only=True, default='')
    port_name = serializers.CharField(source='visit.referral.port.name', read_only=True, default='')

    class Meta:
        model = IsolationRecord
        fields = [
            'id', 'visit', 'isolation_type', 'status', 'health_status', 'severity',
            'required_days', 'start_date', 'expected_end_date', 'end_date',
            'notes', 'discharge_summary', 'started_by_name', 'closed_by_name',
            'started_at', 'closed_at', 'traveler_name', 'passport_number', 'clinic_name', 'port_name',
        ]
        read_only_fields = ['id', 'visit', 'status', 'health_status', 'started_at', 'closed_at']


class HealthCertificateSerializer(serializers.ModelSerializer):
    issued_by_name = serializers.CharField(source='issued_by.full_name', read_only=True, default='')
    traveler_name = serializers.CharField(source='visit.traveler.full_name', read_only=True, default='')
    passport_number = serializers.CharField(source='visit.traveler.passport_number', read_only=True, default='')
    clinic_name = serializers.CharField(source='visit.clinic.name_ar', read_only=True, default='')

    class Meta:
        model = HealthCertificate
        fields = [
            'id', 'visit', 'certificate_number', 'certificate_type', 'verdict',
            'decision', 'status', 'issued_by_name', 'issued_at',
            'valid_until', 'qr_token', 'verification_path',
            'traveler_name', 'passport_number', 'clinic_name',
        ]
        read_only_fields = [
            'id', 'visit', 'certificate_number', 'certificate_type', 'status',
            'issued_by_name', 'issued_at', 'qr_token', 'verification_path',
            'traveler_name', 'passport_number', 'clinic_name',
        ]


class ClinicVisitDetailSerializer(ClinicVisitSerializer):
    emr = ClinicEmrSummarySerializer(read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    lab_requests = LabRequestSerializer(many=True, read_only=True)
    triages = TriageRecordSerializer(many=True, read_only=True)
    isolation = IsolationRecordSerializer(read_only=True)
    health_certificate = HealthCertificateSerializer(read_only=True)
    allowed_transitions = serializers.SerializerMethodField()

    class Meta(ClinicVisitSerializer.Meta):
        fields = ClinicVisitSerializer.Meta.fields + [
            'emr', 'prescriptions', 'lab_requests', 'triages', 'isolation',
            'health_certificate', 'allowed_transitions',
        ]

    def get_allowed_transitions(self, instance):
        return [p.value for p in ClinicVisit.PHASE_ALLOWED_TRANSITIONS.get(instance.phase, set())]


class LabResultSummarySerializer(serializers.ModelSerializer):
    sample_barcode = serializers.CharField(source='sample.sample_barcode', read_only=True)
    sample_type = serializers.CharField(source='sample.sample_type', read_only=True)
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    entered_by_name = serializers.CharField(source='entered_by.full_name', read_only=True, default='')
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default='')

    class Meta:
        model = LabResult
        fields = [
            'id', 'sample', 'sample_barcode', 'sample_type', 'disease',
            'disease_name', 'result', 'value', 'entered_by_name',
            'approved_by_name', 'approval_status', 'result_date',
        ]
