from rest_framework import serializers

from .models import (
    CaseStatusLog,
    ContactFollowUp,
    ContactTrace,
    CrisisTeamMember,
    EmergencyAlert,
    EmergencyEvent,
    HealthCase,
    Investigation,
    KillSwitch,
    ReportableDisease,
    ResponsePlan,
    SurveillanceAlert,
    WeeklyReportLine,
    WeeklySurveillanceReport,
)
from .services import (
    generate_alert_number,
    generate_contact_number,
    generate_investigation_number,
    generate_report_number,
)


class EmergencyAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyAlert
        fields = [
            'id', 'traveler', 'port', 'alert_type', 'description',
            'location_geo', 'status', 'triggered_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'triggered_at']


class KillSwitchSerializer(serializers.ModelSerializer):
    activated_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = KillSwitch
        fields = ['id', 'port', 'activated_by', 'reason', 'activated_at', 'deactivated_at']
        read_only_fields = ['id', 'activated_at']


class ResponsePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponsePlan
        fields = ['id', 'name', 'description', 'steps', 'required_resources', 'is_active']
        read_only_fields = ['id']


class EmergencyEventSerializer(serializers.ModelSerializer):
    team = serializers.SerializerMethodField()
    port_code = serializers.CharField(source='location_port.code', read_only=True)

    class Meta:
        model = EmergencyEvent
        fields = [
            'id', 'event_number', 'title', 'description', 'event_type', 'source_type',
            'source_id', 'severity', 'status', 'location_port', 'port_code',
            'affected_travelers', 'response_plan', 'reported_by', 'reported_at',
            'summary', 'lessons_learned', 'recommendations', 'closed_at', 'team',
        ]
        read_only_fields = ['id', 'event_number', 'status', 'reported_at', 'closed_at']

    def get_team(self, obj):
        return [
            {'user_id': str(m.user_id), 'role': m.role}
            for m in obj.team_members.select_related('user').all()
        ]


class CrisisTeamMemberSerializer(serializers.ModelSerializer):
    event = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CrisisTeamMember
        fields = ['id', 'event', 'user', 'role']
        read_only_fields = ['id']


class ReportableDiseaseSerializer(serializers.ModelSerializer):
    disease_id = serializers.UUIDField(source='disease.id', read_only=True)
    icd_11_code = serializers.CharField(source='disease.icd_11_code', read_only=True)
    name_ar = serializers.CharField(source='disease.name_ar', read_only=True)
    name_en = serializers.CharField(source='disease.name_en', read_only=True)
    symptoms = serializers.JSONField(source='disease.symptoms', read_only=True)
    case_definitions = serializers.SerializerMethodField()

    class Meta:
        model = ReportableDisease
        fields = [
            'id', 'disease_id', 'icd_11_code', 'name_ar', 'name_en', 'symptoms',
            'notification_timeline', 'surveillance_mode', 'ewars_threshold',
            'window_days', 'baseline_weeks', 'notified_roles', 'is_enabled',
            'case_definitions',
        ]

    def get_case_definitions(self, obj):
        return [
            {
                'id': str(cd.id),
                'case_type': cd.case_type,
                'clinical_criteria': cd.clinical_criteria,
                'lab_criteria': cd.lab_criteria,
                'epidemiological_criteria': cd.epidemiological_criteria,
                'version': cd.version,
            }
            for cd in obj.disease.case_definitions.all()
        ]


class HealthCaseSerializer(serializers.ModelSerializer):
    disease = serializers.UUIDField(source='disease.id', read_only=True)
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    port = serializers.UUIDField(source='port.id', read_only=True)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    sector = serializers.UUIDField(source='sector.id', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality = serializers.UUIDField(source='locality.id', read_only=True)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    health_facility = serializers.UUIDField(source='health_facility.id', read_only=True)
    facility_name = serializers.CharField(source='health_facility.name_ar', read_only=True, default=None)
    event = serializers.UUIDField(source='event.id', read_only=True)
    event_number = serializers.CharField(source='event.event_number', read_only=True, default=None)
    traveler_name = serializers.SerializerMethodField()

    class Meta:
        model = HealthCase
        fields = [
            'id', 'case_number', 'disease', 'disease_name', 'case_type', 'status',
            'severity', 'source', 'traveler', 'traveler_name', 'person_name',
            'person_age', 'person_sex', 'nationality', 'occupation', 'phone',
            'passport_number', 'port', 'port_code', 'sector', 'sector_name',
            'locality', 'locality_name', 'health_facility', 'facility_name',
            'event', 'event_number', 'lab_result', 'case_definition',
            'onset_date', 'reported_date', 'confirmation_date', 'symptoms',
            'risk_factors', 'exposure_history', 'notes', 'reported_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_traveler_name(self, obj):
        if not obj.traveler_id:
            return None
        return getattr(obj.traveler, 'full_name', None) or str(obj.traveler_id)


class HealthCaseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthCase
        fields = [
            'disease', 'case_type', 'status', 'severity', 'source', 'traveler',
            'person_name', 'person_age', 'person_sex', 'nationality', 'occupation',
            'phone', 'passport_number', 'port', 'sector', 'locality',
            'health_facility', 'event', 'lab_result', 'case_definition',
            'onset_date', 'reported_date', 'confirmation_date', 'symptoms',
            'risk_factors', 'exposure_history', 'notes',
        ]

    def validate_symptoms(self, value):
        return value or []

    def validate_risk_factors(self, value):
        return value or []


class CaseStatusLogSerializer(serializers.ModelSerializer):
    changed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default=None)

    class Meta:
        model = CaseStatusLog
        fields = ['id', 'field', 'old_value', 'new_value', 'note', 'changed_by', 'changed_by_name', 'changed_at']
        read_only_fields = fields


class SurveillanceAlertSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    port = serializers.UUIDField(source='port.id', read_only=True, default=None)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    event = serializers.UUIDField(source='event.id', read_only=True, default=None)
    event_number = serializers.CharField(source='event.event_number', read_only=True, default=None)
    case_numbers = serializers.SerializerMethodField()

    class Meta:
        model = SurveillanceAlert
        fields = [
            'id', 'alert_number', 'alert_type', 'level', 'title', 'description',
            'disease', 'disease_name', 'sector', 'sector_name', 'locality',
            'locality_name', 'port', 'port_code', 'event', 'event_number',
            'case_count', 'case_numbers', 'trigger', 'status', 'generated_at',
            'resolved_by', 'resolved_at',
        ]
        read_only_fields = fields

    def get_case_numbers(self, obj):
        return list(obj.cases.values_list('case_number', flat=True))


class SurveillanceAlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillanceAlert
        fields = ['status']
        read_only_fields = []


class ContactTraceSerializer(serializers.ModelSerializer):
    index_case = serializers.UUIDField(source='index_case.id', read_only=True)
    index_case_number = serializers.CharField(source='index_case.case_number', read_only=True)
    port = serializers.UUIDField(source='port.id', read_only=True, default=None)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    sector = serializers.UUIDField(source='sector.id', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    follow_ups = serializers.SerializerMethodField()

    class Meta:
        model = ContactTrace
        fields = [
            'id', 'contact_number', 'index_case', 'index_case_number',
            'person_name', 'age', 'sex', 'phone', 'relationship',
            'contact_type', 'last_exposure_date', 'follow_up_start',
            'follow_up_days', 'location', 'port', 'port_code', 'sector',
            'sector_name', 'status', 'notes', 'follow_ups', 'created_at',
        ]
        read_only_fields = fields

    def get_follow_ups(self, obj):
        return [
            {
                'id': str(fu.id),
                'check_date': fu.check_date,
                'temperature': fu.temperature,
                'symptoms': fu.symptoms,
                'status': fu.status,
                'notes': fu.notes,
                'checked_by': str(fu.checked_by_id) if fu.checked_by_id else None,
            }
            for fu in obj.follow_ups.all()
        ]


class ContactTraceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactTrace
        fields = [
            'index_case', 'person_name', 'age', 'sex', 'phone', 'relationship',
            'contact_type', 'last_exposure_date', 'follow_up_start',
            'follow_up_days', 'location', 'port', 'sector', 'status', 'notes',
        ]


class ContactFollowUpWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactFollowUp
        fields = ['temperature', 'symptoms', 'status', 'notes']


class ContactFollowUpSerializer(serializers.ModelSerializer):
    contact = serializers.UUIDField(source='contact.id', read_only=True)
    checked_by = serializers.PrimaryKeyRelatedField(read_only=True)
    checked_by_name = serializers.CharField(source='checked_by.full_name', read_only=True, default=None)

    class Meta:
        model = ContactFollowUp
        fields = [
            'id', 'contact', 'check_date', 'temperature', 'symptoms', 'status',
            'notes', 'checked_by', 'checked_by_name',
        ]
        read_only_fields = fields


class InvestigationSerializer(serializers.ModelSerializer):
    case = serializers.UUIDField(source='case.id', read_only=True, default=None)
    case_number = serializers.CharField(source='case.case_number', read_only=True, default=None)
    event = serializers.UUIDField(source='event.id', read_only=True, default=None)
    event_number = serializers.CharField(source='event.event_number', read_only=True, default=None)
    lead_name = serializers.CharField(source='lead_investigator.full_name', read_only=True, default=None)

    class Meta:
        model = Investigation
        fields = [
            'id', 'investigation_number', 'title', 'case', 'case_number',
            'event', 'event_number', 'hypothesis', 'method', 'findings',
            'recommendations', 'actions_taken', 'lead_investigator', 'lead_name',
            'status', 'started_at', 'completed_at',
        ]
        read_only_fields = fields


class InvestigationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investigation
        fields = [
            'title', 'case', 'event', 'hypothesis', 'method', 'findings',
            'recommendations', 'actions_taken', 'lead_investigator', 'status',
            'completed_at',
        ]


class WeeklyReportLineSerializer(serializers.ModelSerializer):
    disease = serializers.UUIDField(source='disease.id', read_only=True, default=None)
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)

    class Meta:
        model = WeeklyReportLine
        fields = ['id', 'disease', 'disease_name', 'syndrome', 'new_cases', 'new_suspected', 'deaths']


class WeeklyReportLineWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReportLine
        fields = ['disease', 'syndrome', 'new_cases', 'new_suspected', 'deaths']


class WeeklySurveillanceReportSerializer(serializers.ModelSerializer):
    port = serializers.UUIDField(source='port.id', read_only=True, default=None)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    health_facility = serializers.UUIDField(source='health_facility.id', read_only=True, default=None)
    facility_name = serializers.CharField(source='health_facility.name_ar', read_only=True, default=None)
    sector = serializers.UUIDField(source='sector.id', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True, default=None)
    lines = WeeklyReportLineSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklySurveillanceReport
        fields = [
            'id', 'report_number', 'period_start', 'period_end',
            'health_facility', 'facility_name', 'port', 'port_code', 'sector',
            'sector_name', 'is_on_time', 'data_quality_issues', 'notes',
            'submitted_by', 'submitted_by_name', 'submitted_at', 'reviewed_by',
            'reviewed_at', 'lines',
        ]
        read_only_fields = fields


class WeeklySurveillanceReportWriteSerializer(serializers.ModelSerializer):
    lines = WeeklyReportLineWriteSerializer(many=True, required=False, source='target_lines')

    class Meta:
        model = WeeklySurveillanceReport
        fields = [
            'period_start', 'period_end', 'health_facility', 'port', 'sector',
            'is_on_time', 'data_quality_issues', 'notes', 'lines',
        ]
        extra_kwargs = {
            'health_facility': {'required': False, 'allow_null': True},
            'port': {'required': False, 'allow_null': True},
            'sector': {'required': False, 'allow_null': True},
            'data_quality_issues': {'required': False},
        }
        validators = []

    def validate(self, attrs):
        if not (attrs.get('health_facility') or attrs.get('port')):
            raise serializers.ValidationError('يجب تحديد وحدة صحية أو نقطة دخول للبلاغ.')
        period_start = attrs.get('period_start')
        period_end = attrs.get('period_end')
        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError('نهاية الفترة لا يمكن أن تسبق بدايتها.')
        qs = WeeklySurveillanceReport.objects.filter(
            period_start=period_start,
            period_end=period_end,
            health_facility=attrs.get('health_facility'),
            port=attrs.get('port'),
        )
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('يوجد بلاغ أسبوعي مماثل لنفس الفترة والوحدة.')
        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop('target_lines', [])
        report = WeeklySurveillanceReport.objects.create(
            report_number=generate_report_number(), **validated_data
        )
        for line_data in lines_data:
            WeeklyReportLine.objects.create(report=report, **line_data)
        return report
