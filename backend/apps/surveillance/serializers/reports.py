from rest_framework import serializers

from apps.surveillance.models.report import (
    DailySurveillanceReport,
    WeeklySurveillanceReport,
    MonthlySurveillanceReport,
    OutbreakReport,
    InvestigationReport,
    ReportLine,
    ReportStatus,
)


class ReportLineSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)

    class Meta:
        model = ReportLine
        fields = ['id', 'disease', 'disease_name', 'syndrome', 'case_definition',
                  'new_cases', 'new_suspected', 'new_probable', 'new_confirmed',
                  'deaths', 'recovered', 'contacts', 'specimens_collected',
                  'specimens_tested', 'specimens_positive',
                  'age_group_breakdown', 'sex_breakdown', 'nationality_breakdown',
                  'location_breakdown', 'notes']
        read_only_fields = ['id']


class DailyReportSerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True, default=None)
    lines = ReportLineSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DailySurveillanceReport
        fields = ['id', 'report_number', 'title', 'description',
                  'period_start', 'period_end', 'epidemiological_week',
                  'epidemiological_year', 'sector', 'sector_name',
                  'locality', 'locality_name', 'health_facility', 'port',
                  'outbreak', 'investigation', 'status', 'status_display',
                  'prepared_by', 'prepared_by_name', 'reviewed_by', 'approved_by',
                  'submitted_at', 'reviewed_at', 'approved_at', 'published_at',
                  'executive_summary', 'key_findings', 'recommendations',
                  'attachments', 'data_quality_score', 'indicators', 'lines',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'report_number', 'created_at', 'updated_at']


class DailyReportWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySurveillanceReport
        fields = ['title', 'description', 'period_start', 'period_end',
                  'sector', 'locality', 'health_facility', 'port',
                  'executive_summary', 'key_findings', 'recommendations']
        extra_kwargs = {
            'sector': {'required': False, 'allow_null': True},
            'port': {'required': False, 'allow_null': True},
        }


class WeeklyReportSerializer(DailyReportSerializer):
    class Meta(DailyReportSerializer.Meta):
        model = WeeklySurveillanceReport


class MonthlyReportSerializer(DailyReportSerializer):
    class Meta(DailyReportSerializer.Meta):
        model = MonthlySurveillanceReport


class OutbreakReportSerializer(DailyReportSerializer):
    sub_type_display = serializers.CharField(source='get_sub_type_display', read_only=True)

    class Meta(DailyReportSerializer.Meta):
        model = OutbreakReport
        fields = DailyReportSerializer.Meta.fields + [
            'sub_type', 'sub_type_display', 'situation_summary',
            'epidemiological_curve_data', 'case_breakdown',
            'response_summary', 'laboratory_summary', 'vector_control_summary',
            'risk_assessment', 'next_steps'
        ]


class InvestigationReportSerializer(DailyReportSerializer):
    sub_type_display = serializers.CharField(source='get_sub_type_display', read_only=True)

    class Meta(DailyReportSerializer.Meta):
        model = InvestigationReport
        fields = DailyReportSerializer.Meta.fields + [
            'sub_type', 'sub_type_display', 'hypothesis', 'methodology',
            'results', 'discussion', 'conclusion', 'references'
        ]


class ReportSubmitSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')


class ReportApproveSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')