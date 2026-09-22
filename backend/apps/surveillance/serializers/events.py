from rest_framework import serializers

from apps.surveillance.models.event import HealthEvent, EventReport, HealthEventStatus


class EventReportSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default=None)

    class Meta:
        model = EventReport
        fields = ['id', 'event', 'report_type', 'title', 'content', 'new_information',
                  'cases_update', 'reported_by', 'reported_by_name', 'reported_at',
                  'attachments']
        read_only_fields = ['id', 'reported_at']


class HealthEventSerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    port_name = serializers.CharField(source='port.name_ar', read_only=True, default=None)
    facility_name = serializers.CharField(source='health_facility.name_ar', read_only=True, default=None)
    disease_name = serializers.CharField(source='suspected_disease.name_ar', read_only=True, default=None)
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default=None)
    outbreak_number = serializers.CharField(source='outbreak.outbreak_number', read_only=True, default=None)
    reports = EventReportSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.SerializerMethodField()
    total_reports = serializers.IntegerField(source='reports.count', read_only=True)

    class Meta:
        model = HealthEvent
        fields = ['id', 'event_number', 'event_type', 'title', 'description',
                  'sector', 'sector_name', 'locality', 'locality_name',
                  'port', 'port_name', 'health_facility', 'facility_name',
                  'specific_location', 'gps_latitude', 'gps_longitude',
                  'affected_count', 'suspected_cases_count', 'confirmed_cases_count',
                  'deaths_count', 'suspected_disease', 'disease_name', 'syndrome',
                  'source', 'source_details', 'reported_by', 'reported_by_name',
                  'reporter_contact', 'event_date', 'reported_at', 'verified_at',
                  'status', 'status_display', 'priority', 'priority_display',
                  'investigation', 'outbreak', 'outbreak_number',
                  'attachments', 'images', 'risk_assessment', 'public_health_risk',
                  'notes', 'internal_notes', 'reports', 'total_reports',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'event_number', 'reported_at', 'verified_at',
                            'created_at', 'updated_at']

    def get_priority_display(self, obj):
        labels = {'LOW': 'منخفضة', 'MEDIUM': 'متوسطة', 'HIGH': 'عالية', 'URGENT': 'عاجلة'}
        return labels.get(obj.priority, obj.priority)


class HealthEventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthEvent
        fields = ['event_type', 'title', 'description', 'sector', 'locality',
                  'port', 'health_facility', 'specific_location',
                  'gps_latitude', 'gps_longitude', 'suspected_disease', 'syndrome',
                  'source', 'source_details', 'event_date', 'priority',
                  'attachments', 'images', 'notes']
        extra_kwargs = {
            'sector': {'required': False, 'allow_null': True},
            'port': {'required': False, 'allow_null': True},
            'health_facility': {'required': False, 'allow_null': True},
            'suspected_disease': {'required': False, 'allow_null': True},
        }


class EventVerifySerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')


class EventEscalateSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')