from rest_framework import serializers

from apps.surveillance.models.case import (
    HealthCase,
    CaseSymptom,
    CaseExposure,
    CaseTravelHistory,
    CaseStatusLog,
    CaseClassification,
    CaseWorkflowState,
    CaseStatus,
    CaseSeverity,
    CaseSource,
)


class CaseStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default=None)

    class Meta:
        model = CaseStatusLog
        fields = ['id', 'field', 'old_value', 'new_value', 'note', 'changed_by', 'changed_by_name', 'changed_at']
        read_only_fields = fields


class CaseSymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseSymptom
        fields = ['id', 'symptom_code', 'symptom_name_ar', 'symptom_name_en',
                  'onset_date', 'severity', 'is_primary', 'notes']
        read_only_fields = ['id']


class CaseExposureSerializer(serializers.ModelSerializer):
    source_case_number = serializers.CharField(source='source_case.case_number', read_only=True, default=None)

    class Meta:
        model = CaseExposure
        fields = ['id', 'exposure_type', 'description', 'location', 'start_date',
                  'end_date', 'details', 'source_case', 'source_case_number']
        read_only_fields = ['id']


class CaseTravelHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseTravelHistory
        fields = ['id', 'country', 'region', 'arrival_date', 'departure_date',
                  'transport_mode', 'flight_ship_number', 'port_of_entry',
                  'purpose', 'notes']
        read_only_fields = ['id']


class HealthCaseListSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source='disease.name_ar', read_only=True, default=None)
    disease_icd = serializers.CharField(source='disease.icd_11_code', read_only=True, default=None)
    port_name = serializers.CharField(source='port.name_ar', read_only=True, default=None)
    port_code = serializers.CharField(source='port.code', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    outbreak_number = serializers.CharField(source='outbreak.outbreak_number', read_only=True, default=None)
    event_number = serializers.CharField(source='event.event_number', read_only=True, default=None)

    class Meta:
        model = HealthCase
        fields = ['id', 'case_number', 'disease', 'disease_name', 'disease_icd',
                  'case_type', 'workflow_state', 'status', 'severity', 'source',
                  'person_name', 'person_age', 'person_sex', 'nationality',
                  'port', 'port_name', 'port_code', 'sector', 'sector_name',
                  'locality', 'locality_name', 'onset_date', 'reported_date',
                  'confirmation_date', 'assigned_to', 'assigned_to_name',
                  'outbreak', 'outbreak_number', 'event', 'event_number',
                  'created_at', 'updated_at']
        read_only_fields = fields


class CaseExposureWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseExposure
        fields = ['exposure_type', 'description', 'location', 'start_date',
                  'end_date', 'details', 'source_case']


class CaseTravelHistoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseTravelHistory
        fields = ['country', 'region', 'arrival_date', 'departure_date',
                  'transport_mode', 'flight_ship_number', 'port_of_entry', 'purpose', 'notes']


class HealthCaseDetailSerializer(HealthCaseListSerializer):
    symptoms = CaseSymptomSerializer(source='case_symptoms', many=True, read_only=True)
    exposures = CaseExposureSerializer(source='case_exposures', many=True, read_only=True)
    travel_history = CaseTravelHistorySerializer(read_only=True, many=True)
    status_logs = CaseStatusLogSerializer(read_only=True, many=True)
    specimen_numbers = serializers.SerializerMethodField()
    contact_count = serializers.IntegerField(source='contacts.count', read_only=True)
    alert_count = serializers.IntegerField(source='alerts.count', read_only=True)
    age_band = serializers.SerializerMethodField()

    class Meta(HealthCaseListSerializer.Meta):
        fields = HealthCaseListSerializer.Meta.fields + [
            'occupation', 'phone', 'passport_number', 'national_id', 'health_file_number',
            'health_facility', 'lab_result', 'case_definition', 'closure_date',
            'risk_factors', 'exposure_history', 'clinical_notes', 'epidemiological_notes',
            'reported_by', 'assigned_to', 'traveler', 'symptoms', 'exposures',
            'travel_history', 'status_logs', 'specimen_numbers', 'contact_count',
            'alert_count', 'age_band',
        ]

    def get_specimen_numbers(self, obj):
        return list(obj.specimens.values_list('specimen_number', flat=True))

    def get_age_band(self, obj):
        if obj.person_age is None:
            return None
        age = obj.person_age
        if age < 1:
            return '0-11m'
        if age < 5:
            return '1-4'
        if age < 15:
            return '5-14'
        if age < 45:
            return '15-44'
        if age < 65:
            return '45-64'
        return '65+'


class HealthCaseWriteSerializer(serializers.ModelSerializer):
    symptoms = CaseSymptomSerializer(many=True, required=False)
    exposures = CaseExposureWriteSerializer(many=True, required=False, source='case_exposures')
    travel_history = CaseTravelHistoryWriteSerializer(many=True, required=False)

    class Meta:
        model = HealthCase
        fields = [
            'disease', 'case_type', 'workflow_state', 'status', 'severity', 'source',
            'traveler', 'person_name', 'person_age', 'person_sex', 'nationality',
            'occupation', 'phone', 'passport_number', 'national_id', 'health_file_number',
            'port', 'sector', 'locality', 'health_facility', 'event', 'outbreak',
            'lab_result', 'case_definition', 'onset_date', 'reported_date',
            'confirmation_date', 'closure_date', 'symptoms', 'risk_factors',
            'exposure_history', 'clinical_notes', 'epidemiological_notes',
            'reported_by', 'assigned_to', 'exposures', 'travel_history',
        ]
        extra_kwargs = {
            'person_name': {'required': False, 'allow_blank': True},
            'reported_by': {'required': False},
            'assigned_to': {'required': False},
        }
        validators = []

    def validate(self, attrs):
        person_name = attrs.get('person_name')
        traveler = attrs.get('traveler')
        if self.partial:
            person_name = person_name or getattr(self.instance, 'person_name', None)
            traveler = traveler or getattr(self.instance, 'traveler_id', None)
        if not person_name and not traveler:
            raise serializers.ValidationError('يجب تحديد اسم الشخص أو المسافر.')
        risks = attrs.get('risk_factors')
        attrs['risk_factors'] = risks or []
        return attrs

    def create(self, validated_data):
        symptom_data = validated_data.pop('symptoms', [])
        exposure_data = validated_data.pop('case_exposures', [])
        travel_data = validated_data.pop('travel_history', [])

        case = HealthCase.objects.create(**validated_data)
        for s in symptom_data:
            CaseSymptom.objects.create(case=case, **s)
        for e in exposure_data:
            CaseExposure.objects.create(case=case, **e)
        for t in travel_data:
            CaseTravelHistory.objects.create(case=case, **t)
        return case

    def update(self, instance, validated_data):
        symptom_data = validated_data.pop('symptoms', None)
        exposure_data = validated_data.pop('case_exposures', None)
        travel_data = validated_data.pop('travel_history', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if symptom_data is not None:
            instance.case_symptoms.all().delete()
            for s in symptom_data:
                CaseSymptom.objects.create(case=instance, **s)
        if exposure_data is not None:
            instance.case_exposures.all().delete()
            for e in exposure_data:
                CaseExposure.objects.create(case=instance, **e)
        if travel_data is not None:
            instance.travel_history.all().delete()
            for t in travel_data:
                CaseTravelHistory.objects.create(case=instance, **t)
        return instance


class CaseTransitionSerializer(serializers.Serializer):
    new_state = serializers.ChoiceField(choices=CaseWorkflowState.choices)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_new_state(self, value):
        return value


class CaseClassificationSerializer(serializers.Serializer):
    """خيارات تصنيف الحالات لـ metadata."""
    case_types = serializers.SerializerMethodField()

    def get_case_types(self, obj):
        return [{'value': k, 'label': str(v)} for k, v in CaseClassification.choices]