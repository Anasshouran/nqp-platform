from rest_framework import serializers

from .models import (
    InventoryMovement,
    OpChemicalLine,
    VectorAlert,
    VectorAttachment,
    VectorAuditLog,
    VectorCase,
    VectorChemical,
    VectorControlOperation,
    VectorEquipment,
    VectorFocus,
    VectorFollowUp,
    VectorInspection,
    VectorInventoryItem,
    VectorLabResult,
    VectorRegistry,
    VectorReport,
    VectorSample,
    VectorSite,
    VectorSurvey,
    VectorTeam,
    VectorUnit,
)


class VectorRegistrySerializer(serializers.ModelSerializer):
    vector_type_display = serializers.CharField(source='get_vector_type_display', read_only=True)

    class Meta:
        model = VectorRegistry
        fields = [
            'id', 'vector_type', 'vector_type_display', 'species', 'name_ar',
            'description', 'disease_risk', 'is_active',
        ]
        read_only_fields = ['id']


class VectorUnitSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True)

    class Meta:
        model = VectorUnit
        fields = ['id', 'code', 'name_ar', 'kind', 'kind_display', 'sector', 'sector_name', 'description', 'is_active']
        read_only_fields = ['id']


class VectorSiteSerializer(serializers.ModelSerializer):
    site_type_display = serializers.CharField(source='get_site_type_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)

    class Meta:
        model = VectorSite
        fields = [
            'id', 'entry_point', 'entry_point_name', 'site_type', 'site_type_display',
            'name_ar', 'area_m2', 'latitude', 'longitude', 'notes', 'is_active',
        ]
        read_only_fields = ['id']


class VectorTeamSerializer(serializers.ModelSerializer):
    team_type_display = serializers.CharField(source='get_team_type_display', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)
    leader_name = serializers.CharField(source='leader.full_name', read_only=True, default=None)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = VectorTeam
        fields = [
            'id', 'code', 'name_ar', 'team_type', 'team_type_display', 'sector', 'sector_name',
            'entry_point', 'entry_point_name', 'leader', 'leader_name', 'members', 'members_count', 'is_active',
        ]
        read_only_fields = ['id']

    def get_members_count(self, obj):
        return obj.members.count()


class VectorReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default=None)
    vector_name = serializers.CharField(source='vector.name_ar', read_only=True, default=None)
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True, default=None)
    assessed_by_name = serializers.CharField(source='assessed_by.full_name', read_only=True, default=None)

    class Meta:
        model = VectorReport
        fields = [
            'id', 'report_number', 'report_type', 'report_type_display', 'source', 'source_display',
            'entry_point', 'entry_point_name', 'site', 'site_name', 'vector', 'vector_name',
            'severity', 'severity_display', 'problem_description', 'reported_by', 'reported_by_name',
            'reported_at', 'gps_latitude', 'gps_longitude', 'status', 'status_display',
            'assessment_note', 'assessed_by', 'assessed_by_name', 'assessed_at', 'closed_at',
        ]
        read_only_fields = ['id', 'report_number', 'status', 'assessed_by', 'assessed_at', 'closed_at']


class VectorFocusSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    water_source_display = serializers.CharField(source='get_water_source_display', read_only=True)
    origin_display = serializers.CharField(source='get_origin_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default=None)
    vector_name = serializers.CharField(source='vector.name_ar', read_only=True, default=None)
    vector_type = serializers.CharField(source='vector.vector_type', read_only=True, default=None)
    sector_code = serializers.CharField(source='entry_point.sector.code', read_only=True, default=None)
    opened_by_name = serializers.CharField(source='opened_by.full_name', read_only=True, default=None)
    closed_by_name = serializers.CharField(source='closed_by.full_name', read_only=True, default=None)
    has_open_operations = serializers.SerializerMethodField()

    class Meta:
        model = VectorFocus
        fields = [
            'id', 'focus_number', 'entry_point', 'entry_point_name', 'site', 'site_name',
            'vector', 'vector_name', 'vector_type', 'severity', 'severity_display',
            'status', 'status_display', 'water_source', 'water_source_display',
            'environment', 'focus_size', 'description', 'gps_latitude', 'gps_longitude',
            'origin', 'origin_display', 'source_report', 'opened_by', 'opened_by_name',
            'opened_at', 'closed_by', 'closed_by_name', 'closed_at', 'closure_reason',
            'sector_code', 'has_open_operations',
        ]
        read_only_fields = ['id', 'focus_number', 'opened_at', 'closed_at', 'has_open_operations']

    def get_has_open_operations(self, obj):
        return obj.control_operations.exclude(
            status__in=[VectorControlOperation.Status.CLOSED, VectorControlOperation.Status.DRAFT]
        ).exists()


class VectorInspectionSerializer(serializers.ModelSerializer):
    purpose_display = serializers.CharField(source='get_purpose_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    findings_severity_display = serializers.CharField(source='get_findings_severity_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default=None)
    team_name = serializers.CharField(source='team.name_ar', read_only=True, default=None)
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)
    found_vectors = serializers.SerializerMethodField()

    class Meta:
        model = VectorInspection
        fields = [
            'id', 'inspection_number', 'entry_point', 'entry_point_name', 'site', 'site_name',
            'team', 'team_name', 'inspector', 'inspector_name', 'visit_datetime', 'purpose', 'purpose_display',
            'adult_mosquito', 'larvae', 'flies', 'rodents', 'cockroaches', 'other_vectors',
            'found_vectors', 'foci_count', 'hazards_found', 'notes', 'gps_latitude', 'gps_longitude',
            'findings_severity', 'findings_severity_display', 'linked_focus', 'status', 'status_display',
        ]
        read_only_fields = ['id', 'inspection_number', 'status']
        extra_kwargs = {'inspector': {'required': False}}

    def get_found_vectors(self, obj):
        return [
            key for key in ('adult_mosquito', 'larvae', 'flies', 'rodents', 'cockroaches', 'other_vectors')
            if getattr(obj, key)
        ]


class VectorSurveySerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    density_display = serializers.CharField(source='get_density_display', read_only=True)
    proposed_risk_display = serializers.CharField(source='get_proposed_risk_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default=None)
    vector_name = serializers.CharField(source='vector.name_ar', read_only=True)
    vector_type = serializers.CharField(source='vector.vector_type', read_only=True)
    team_name = serializers.CharField(source='team.name_ar', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)

    class Meta:
        model = VectorSurvey
        fields = [
            'id', 'survey_number', 'entry_point', 'entry_point_name', 'site', 'site_name',
            'vector', 'vector_name', 'vector_type', 'method', 'method_display', 'area',
            'team', 'team_name', 'survey_date', 'house_index', 'breteau_index', 'container_index',
            'breeding_sites', 'density', 'density_display', 'proposed_risk', 'proposed_risk_display',
            'environmental_conditions', 'notes', 'suggested_focus', 'status', 'status_display',
            'approved_by', 'approved_by_name', 'approved_at',
        ]
        read_only_fields = ['id', 'survey_number', 'status', 'approved_by', 'approved_at']

    def validate(self, attrs):
        density = attrs.get('density')
        if density and not attrs.get('proposed_risk'):
            attrs['proposed_risk'] = density
        return attrs


class VectorSampleSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    focus_number = serializers.CharField(source='focus.focus_number', read_only=True, default=None)
    vector_name = serializers.CharField(source='vector.name_ar', read_only=True, default=None)
    collector_name = serializers.CharField(source='collector.full_name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True, default=None)
    has_result = serializers.SerializerMethodField()

    class Meta:
        model = VectorSample
        fields = [
            'id', 'sample_number', 'entry_point', 'entry_point_name', 'focus', 'focus_number',
            'inspection', 'survey', 'vector', 'vector_name', 'stage', 'stage_display',
            'specimen_count', 'collection_method', 'collector', 'collector_name', 'collected_at',
            'condition_note', 'status', 'status_display', 'received_at', 'received_by', 'received_by_name',
            'rejection_reason', 'has_result',
        ]
        read_only_fields = ['id', 'sample_number', 'status', 'received_at', 'received_by']
        extra_kwargs = {'collector': {'required': False}}

    def get_has_result(self, obj):
        return hasattr(obj, 'lab_result')


class VectorLabResultSerializer(serializers.ModelSerializer):
    result_display = serializers.CharField(source='get_result_display', read_only=True)
    method_display = serializers.CharField(source='get_identification_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sample_number = serializers.CharField(source='sample.sample_number', read_only=True)
    entry_point_name = serializers.CharField(source='sample.entry_point.name_ar', read_only=True)
    vector_name = serializers.CharField(source='sample.vector.name_ar', read_only=True, default=None)
    analyst_name = serializers.CharField(source='analyst.full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)

    class Meta:
        model = VectorLabResult
        fields = [
            'id', 'sample', 'sample_number', 'entry_point_name', 'vector_name', 'species_identified',
            'identification_method', 'method_display', 'result', 'result_display', 'findings',
            'analyst', 'analyst_name', 'analyzed_at', 'status', 'status_display',
            'approved_by', 'approved_by_name', 'approved_at', 'rejection_reason',
        ]
        read_only_fields = ['id', 'status', 'analyzed_at', 'approved_by', 'approved_at']


class VectorChemicalSerializer(serializers.ModelSerializer):
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    hazard_class_display = serializers.CharField(source='get_hazard_class_display', read_only=True)
    target_display = serializers.CharField(source='get_target_display', read_only=True)
    in_stock_total = serializers.SerializerMethodField()

    class Meta:
        model = VectorChemical
        fields = [
            'id', 'name_ar', 'active_ingredient', 'concentration', 'form', 'form_display',
            'hazard_class', 'hazard_class_display', 'target', 'target_display', 'unit',
            'min_stock', 'supplier', 'is_restricted', 'notes', 'is_active', 'in_stock_total',
        ]
        read_only_fields = ['id']

    def get_in_stock_total(self, obj):
        return sum(float(i.quantity) for i in obj.inventory_items.all())


class VectorEquipmentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_team_name = serializers.CharField(source='assigned_team.name_ar', read_only=True, default=None)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)

    class Meta:
        model = VectorEquipment
        fields = [
            'id', 'code', 'name_ar', 'kind', 'kind_display', 'model', 'quantity', 'status', 'status_display',
            'assigned_team', 'assigned_team_name', 'entry_point', 'entry_point_name', 'notes', 'is_active',
        ]
        read_only_fields = ['id', 'code']


class VectorInventoryItemSerializer(serializers.ModelSerializer):
    chemical_name = serializers.CharField(source='chemical.name_ar', read_only=True)
    chemical_unit = serializers.CharField(source='chemical.unit', read_only=True)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = VectorInventoryItem
        fields = [
            'id', 'chemical', 'chemical_name', 'chemical_unit', 'entry_point', 'entry_point_name',
            'batch_number', 'expiry_date', 'quantity', 'unit', 'received_date', 'notes', 'low_stock',
        ]
        read_only_fields = ['id']

    def get_low_stock(self, obj):
        return obj.low_stock


class InventoryMovementSerializer(serializers.ModelSerializer):
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    item_label = serializers.CharField(source='item.__str__', read_only=True)
    operation_number = serializers.CharField(source='operation.op_number', read_only=True, default=None)
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True, default=None)

    class Meta:
        model = InventoryMovement
        fields = [
            'id', 'item', 'item_label', 'movement_type', 'movement_type_display', 'quantity', 'unit',
            'operation', 'operation_number', 'reference', 'performed_by', 'performed_by_name',
            'performed_at', 'notes',
        ]
        read_only_fields = ['id', 'performed_at', 'performed_by']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('الكمية يجب أن تكون موجبة')
        return value


class OpChemicalLineSerializer(serializers.ModelSerializer):
    chemical_name = serializers.CharField(source='chemical.name_ar', read_only=True)
    operation_number = serializers.CharField(source='operation.op_number', read_only=True)

    class Meta:
        model = OpChemicalLine
        fields = [
            'id', 'operation', 'operation_number', 'chemical', 'chemical_name', 'item',
            'dosage', 'concentration', 'quantity_used', 'unit', 'area_covered',
        ]
        read_only_fields = ['id']


class VectorControlOperationSerializer(serializers.ModelSerializer):
    operation_type_display = serializers.CharField(source='get_operation_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    focus_number = serializers.CharField(source='focus.focus_number', read_only=True, default=None)
    focus_severity = serializers.CharField(source='focus.severity', read_only=True, default=None)
    report_number = serializers.CharField(source='report.report_number', read_only=True, default=None)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    site_name = serializers.CharField(source='site.name_ar', read_only=True, default=None)
    vector_name = serializers.CharField(source='vector.name_ar', read_only=True, default=None)
    team_name = serializers.CharField(source='team.name_ar', read_only=True, default=None)
    leader_name = serializers.CharField(source='leader.full_name', read_only=True, default=None)
    review_by_name = serializers.CharField(source='review_by.full_name', read_only=True, default=None)
    chemical_lines = OpChemicalLineSerializer(many=True, read_only=True)
    chemicals_summary = serializers.SerializerMethodField()

    class Meta:
        model = VectorControlOperation
        fields = [
            'id', 'op_number', 'focus', 'focus_number', 'focus_severity', 'report', 'report_number',
            'entry_point', 'entry_point_name', 'site', 'site_name', 'vector', 'vector_name',
            'operation_type', 'operation_type_display', 'area_m2', 'team', 'team_name', 'leader', 'leader_name',
            'application_method', 'planned_at', 'started_at', 'ended_at', 'status', 'status_display',
            'result_effective', 'effectiveness_percent', 'equipment_used', 'notes',
            'review_by', 'review_by_name', 'reviewed_at', 'chemical_lines', 'chemicals_summary',
        ]
        read_only_fields = [
            'id', 'op_number', 'status', 'started_at', 'ended_at', 'review_by', 'reviewed_at', 'chemical_lines',
        ]

    def get_chemicals_summary(self, obj):
        return [
            {'chemical_name': l.chemical.name_ar, 'quantity_used': float(l.quantity_used), 'unit': l.unit}
            for l in obj.chemical_lines.all()
        ]


class VectorFollowUpSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    focus_number = serializers.CharField(source='focus.focus_number', read_only=True)
    operation_number = serializers.CharField(source='operation.op_number', read_only=True, default=None)
    team_name = serializers.CharField(source='team.name_ar', read_only=True, default=None)
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True, default=None)

    class Meta:
        model = VectorFollowUp
        fields = [
            'id', 'followup_number', 'focus', 'focus_number', 'operation', 'operation_number',
            'visit_datetime', 'team', 'team_name', 'performed_by', 'performed_by_name',
            'findings', 'controlled', 'recommend_retreatment', 'new_foci_count', 'notes',
            'status', 'status_display', 'closed_at',
        ]
        read_only_fields = ['id', 'followup_number', 'status', 'closed_at']


class VectorCaseSerializer(serializers.ModelSerializer):
    classification_display = serializers.CharField(source='get_classification_display', read_only=True)
    focus_number = serializers.CharField(source='focus.focus_number', read_only=True)

    class Meta:
        model = VectorCase
        fields = [
            'id', 'case_number', 'focus', 'focus_number', 'disease', 'classification',
            'classification_display', 'detected_at', 'patient_ref', 'outcome', 'notes',
        ]
        read_only_fields = ['id', 'case_number']


class VectorAlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    focus_number = serializers.CharField(source='focus.focus_number', read_only=True, default=None)
    operation_number = serializers.CharField(source='operation.op_number', read_only=True, default=None)

    class Meta:
        model = VectorAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'severity', 'severity_display',
            'title_ar', 'body', 'focus', 'focus_number', 'operation', 'operation_number',
            'chemical', 'item', 'is_read', 'created_for', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class VectorAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True, default=None)

    class Meta:
        model = VectorAttachment
        fields = ['id', 'content_type', 'object_id', 'file', 'caption', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class VectorAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)

    class Meta:
        model = VectorAuditLog
        fields = ['id', 'action', 'model_name', 'object_id', 'user', 'user_name', 'details', 'created_at']
        read_only_fields = ['id', 'created_at']


class DashboardOverviewSerializer(serializers.Serializer):
    reports_new = serializers.IntegerField()
    reports_total = serializers.IntegerField()
    inspections_today = serializers.IntegerField()
    surveys_this_month = serializers.IntegerField()
    foci_active = serializers.IntegerField()
    foci_critical = serializers.IntegerField()
    operations_active = serializers.IntegerField()
    operations_completed = serializers.IntegerField()
    samples_pending = serializers.IntegerField()
    lab_results_pending = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    unread_alerts = serializers.IntegerField()
    avg_effectiveness = serializers.FloatField(allow_null=True)
    by_severity = serializers.DictField(child=serializers.IntegerField())


class MapFocusSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    focus_number = serializers.CharField()
    entry_point = serializers.UUIDField()
    entry_point_name = serializers.CharField()
    site_name = serializers.CharField(allow_null=True)
    vector_name = serializers.CharField(allow_null=True)
    severity = serializers.CharField()
    severity_display = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, allow_null=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, allow_null=True)
    sector_code = serializers.CharField(allow_null=True)
    sector_name = serializers.CharField(allow_null=True, default=None)