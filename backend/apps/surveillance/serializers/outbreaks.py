from rest_framework import serializers

from apps.surveillance.models.outbreak import (
    Outbreak,
    OutbreakCase,
    OutbreakResponseAction,
    OutbreakResponseTeam,
    OutbreakStatus,
)


class OutbreakResponseActionSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OutbreakResponseAction
        fields = ['id', 'action_type', 'action_type_display', 'title', 'description',
                  'location', 'port', 'health_facility', 'responsible_team',
                  'assigned_to', 'assigned_to_name', 'planned_start', 'planned_end',
                  'actual_start', 'actual_end', 'status', 'status_display',
                  'progress_percent', 'outcome', 'effectiveness', 'resources_used',
                  'budget', 'follow_up_required', 'follow_up_date', 'follow_up_notes',
                  'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class OutbreakResponseTeamSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.full_name', read_only=True, default=None)

    class Meta:
        model = OutbreakResponseTeam
        fields = ['id', 'name', 'team_type', 'lead', 'lead_name', 'members',
                  'description', 'contact_info', 'is_active']
        read_only_fields = ['id']


class OutbreakCaseSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = OutbreakCase
        fields = ['id', 'outbreak', 'case', 'case_number', 'role', 'role_display',
                  'generation', 'linked_to', 'exposure_setting', 'confirmed_at',
                  'added_by']
        read_only_fields = ['id']


class OutbreakSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    disease_icd = serializers.CharField(source='disease.icd_11_code', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    port_name = serializers.CharField(source='port.name_ar', read_only=True, default=None)
    lead_name = serializers.CharField(source='lead_epidemiologist.full_name', read_only=True, default=None)
    coordinator_name = serializers.CharField(source='response_coordinator.full_name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    cfr = serializers.DecimalField(source='case_fatality_rate', max_digits=8, decimal_places=4,
                                    read_only=True, default=None)

    class Meta:
        model = Outbreak
        fields = ['id', 'outbreak_number', 'disease', 'disease_name', 'disease_icd',
                  'mode', 'name', 'description', 'sector', 'sector_name',
                  'locality', 'locality_name', 'port', 'port_name', 'health_facility',
                  'affected_area_description', 'gps_coordinates',
                  'onset_date', 'detection_date', 'confirmation_date',
                  'peak_date', 'end_date', 'status', 'status_display',
                  'severity', 'severity_display', 'source_of_infection',
                  'transmission_route', 'risk_factors', 'total_cases',
                  'confirmed_cases', 'probable_cases', 'suspected_cases',
                  'deaths', 'recovered', 'contacts', 'attack_rate', 'case_fatality_rate',
                  'cfr', 'origin_alert', 'lead_epidemiologist', 'lead_name',
                  'response_coordinator', 'coordinator_name', 'response_plan',
                  'investigation_report', 'response_report', 'closure_report',
                  'lessons_learned', 'ihr_notified', 'ihr_notification_date',
                  'who_notified', 'who_report_ref', 'notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'outbreak_number', 'detection_date', 'total_cases',
                            'confirmed_cases', 'probable_cases', 'suspected_cases',
                            'deaths', 'recovered', 'attack_rate', 'case_fatality_rate',
                            'created_at', 'updated_at']


class OutbreakWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Outbreak
        fields = ['disease', 'mode', 'name', 'description', 'sector', 'locality',
                  'port', 'health_facility', 'affected_area_description',
                  'gps_coordinates', 'onset_date', 'severity',
                  'source_of_infection', 'transmission_route', 'risk_factors',
                  'lead_epidemiologist', 'response_coordinator', 'response_plan']
        extra_kwargs = {
            'disease': {'required': True},
            'name': {'required': True},
            'sector': {'required': False, 'allow_null': True},
            'port': {'required': False, 'allow_null': True},
            'lead_epidemiologist': {'required': False},
            'risk_factors': {'required': False},
        }
        validators = []


class OutbreakStatusSerializer(serializers.Serializer):
    STATUS_CHOICES = [
        ('UNDER_EVALUATION', 'قيد التقييم'),
        ('CONFIRMED', 'تأكيد'),
        ('ACTIVE_RESPONSE', 'تفعيل الاستجابة'),
        ('MONITORING', 'مراقبة'),
        ('CONTROLLED', 'تحت السيطرة'),
        ('CLOSED', 'إغلاق'),
        ('REJECTED', 'رفض'),
    ]
    new_status = serializers.ChoiceField(choices=STATUS_CHOICES)


class OutbreakActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutbreakResponseAction
        fields = ['action_type', 'title', 'description', 'location', 'port',
                  'health_facility', 'responsible_team', 'assigned_to',
                  'planned_start', 'planned_end', 'budget']
        extra_kwargs = {
            'port': {'required': False, 'allow_null': True},
            'health_facility': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        outbreak = self.context['outbreak']
        validated_data['outbreak'] = outbreak
        validated_data['created_by'] = self.context['request'].user
        return OutbreakResponseAction.objects.create(**validated_data)