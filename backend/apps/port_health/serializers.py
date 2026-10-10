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
    entry_point_code = serializers.CharField(source='entry_point.code', read_only=True)
    entry_point_name_ar = serializers.CharField(source='entry_point.name_ar', read_only=True)
    entry_point_name_en = serializers.CharField(source='entry_point.name_en', read_only=True)
    entry_point_id = serializers.UUIDField(source='entry_point.id', read_only=True)

    class Meta:
        model = SeaPort
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'location', 'capacity',
            'authorities', 'description', 'is_active',
            'entry_point_id', 'entry_point_code', 'entry_point_name_ar', 'entry_point_name_en',
        ]
        read_only_fields = ['id']


class BerthSerializer(serializers.ModelSerializer):
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    port_entry_point_id = serializers.UUIDField(source='port.entry_point.id', read_only=True)
    port_entry_point_code = serializers.CharField(source='port.entry_point.code', read_only=True)

    class Meta:
        model = Berth
        fields = ['id', 'port', 'port_name', 'port_entry_point_id', 'port_entry_point_code', 'code', 'name_ar', 'max_draft', 'is_active']
        read_only_fields = ['id']


class VesselSerializer(serializers.ModelSerializer):
    """Vessel representation.

    ``company`` is the canonical ownership link to the ShippingCompany
    (``carriers.Carrier``); ``shipping_company`` is the retained legacy free-text
    column (Phase 1A.1 keeps it until every consumer has migrated).
    """
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)

    class Meta:
        model = Vessel
        fields = [
            'id', 'vessel_name', 'imo_number', 'flag_state', 'shipping_company',
            'company', 'company_name',
            'vessel_type', 'gross_tonnage', 'last_port_of_call',
            'arrival_date', 'departure_date', 'status', 'notes',
        ]
        # Vessel-level arrival/departure/status mirror a *visit*. The canonical
        # lifecycle lives on VesselVisit, so these are derived/legacy and must
        # not be written directly (see VesselVisitSerializer for the rule).
        read_only_fields = ['id', 'arrival_date', 'departure_date', 'status']

    def to_internal_value(self, data):
        """Reject writes to the vessel-level lifecycle mirrors outright.

        DRF drops read-only fields silently, so `PATCH {"status": "DEPARTED"}`
        would answer 200 while doing nothing. An explicit 400 is safer and
        matches `VesselVisitSerializer`. The canonical lifecycle is the Port
        Call (`VesselVisit`) plus the sovereign departure service.
        """
        errors = {}
        for field in ('status', 'departure_date', 'arrival_date'):
            if field in data:
                errors[field] = (
                    'حالة السفينة وتواريخ الوصول/المغادرة مشتقّة من الزيارة '
                    '(نداء الميناء) ولا تُعدّل مباشرة.'
                )
        if errors:
            from rest_framework import serializers as _serializers

            raise _serializers.ValidationError(errors)
        return super().to_internal_value(data)


class VesselVisitSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)
    vessel_imo = serializers.CharField(source='vessel.imo_number', read_only=True)
    port_name = serializers.CharField(source='port.name_ar', read_only=True)
    berth_code = serializers.CharField(source='berth.code', read_only=True, default=None)

    class Meta:
        model = VesselVisit
        fields = [
            'id', 'vessel', 'vessel_name', 'vessel_imo',
            'port', 'port_name', 'berth', 'berth_code',
            'arrival_date', 'departure_date', 'status',
        ]
        # `status` and `departure_date` are domain outcomes, not editable data:
        # departure goes through apps.shipping.services.record_vessel_departure,
        # which enforces clearance, safety blocks and port authorisation.
        read_only_fields = ['id', 'status', 'departure_date']

    def to_internal_value(self, data):
        """Reject attempts to set the departure fields directly.

        DRF silently drops read-only fields, which would make
        `PATCH {"status": "DEPARTED"}` return 200 while doing nothing. An
        explicit error is safer and self-explanatory.
        """
        errors = {}
        for field in ('status', 'departure_date'):
            if field in data:
                errors[field] = (
                    'لا يمكن تعديل حالة الزيارة أو تاريخ المغادرة مباشرة؛ '
                    'المغادرة تُسجَّل عبر إجراء المغادرة الرسمي.'
                )
        if errors:
            from rest_framework import serializers as _serializers
            raise _serializers.ValidationError(errors)
        return super().to_internal_value(data)


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
    """Maritime Declaration of Health.

    Phase 1D-6B: ``status`` and the review metadata are **server-owned**.
    They change only through the explicit lifecycle actions
    (``submit-review`` / ``approve`` / ``reject``) on the viewset. Identity and
    content fields stay writable.
    """
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.full_name', read_only=True, default=None,
    )

    class Meta:
        model = HealthDeclaration
        fields = [
            'id', 'vessel', 'vessel_name', 'visit', 'captain_name', 'declaration_date',
            'illness_on_board', 'deaths_on_board', 'reported_diseases',
            'visited_ports', 'status', 'notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status',
            'reviewed_by', 'reviewed_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]

    def to_internal_value(self, data):
        """Reject any attempt to write the server-owned lifecycle fields.

        DRF silently drops read-only fields, which would answer ``200`` while
        doing nothing. An explicit 400 is safer and self-explanatory.
        """
        errors = {}
        for field in ('status', 'reviewed_by', 'reviewed_at', 'rejection_reason'):
            if field in data:
                errors[field] = (
                    'حالة الإقرار وبيانات المراجعة تُضبط عبر إجراءات '
                    '(submit-review/approve/reject) فقط.'
                )
        if errors:
            raise serializers.ValidationError(errors)
        return super().to_internal_value(data)


class ShipInspectionSerializer(serializers.ModelSerializer):
    """Port-health ship inspection.

    Phase 1D-6B: ``overall_status`` is **server-derived** from the eight zone
    fields (see the viewset). A client may submit zones and findings, never the
    verdict, so an inconsistent pair such as ``NON_COMPLIANT + PASSED`` cannot be
    produced through the API.
    """
    inspector = serializers.HiddenField(default=serializers.CurrentUserDefault())
    inspector_name = serializers.CharField(source='inspector.full_name', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)

    #: The eight zone fields the verdict is derived from.
    ZONE_FIELDS = (
        'accommodation_status', 'kitchen_status', 'storeroom_status',
        'clinic_status', 'water_tank_status', 'toilet_status',
        'ventilation_status', 'cleanliness_status',
    )

    class Meta:
        model = ShipInspection
        fields = [
            'id', 'vessel', 'vessel_name', 'visit', 'inspection_date', 'inspector', 'inspector_name',
            'accommodation_status', 'kitchen_status', 'storeroom_status', 'clinic_status',
            'water_tank_status', 'toilet_status', 'ventilation_status', 'cleanliness_status',
            'findings', 'overall_status', 'certificate_issued',
        ]
        read_only_fields = ['id', 'inspection_date', 'certificate_issued', 'overall_status']

    def to_internal_value(self, data):
        errors = {}
        if 'overall_status' in data:
            errors['overall_status'] = (
                'النتيجة العامة تُستنتج آلياً من مناطق الفحص الثماني ولا تُرسل من العميل.'
            )
        if errors:
            raise serializers.ValidationError(errors)
        return super().to_internal_value(data)

    def validate(self, attrs):
        """Fail-closed zone truth table (frozen Phase 1D-6A policy).

        Rule 1 (highest precedence): any ``NON_COMPLIANT`` -> ``FAILED``.
        Rule 2: no ``NON_COMPLIANT`` and all eight ``COMPLIANT`` -> ``PASSED``.
        Rule 3: any ``NOT_APPLICABLE`` with no ``NON_COMPLIANT`` -> HTTP 400.
        Rule 4: anything else (future/unknown value) -> HTTP 400.

        ``CONDITIONAL`` stays a valid *model* state but is never produced by
        this algorithm; a re-inspection is recorded as a new row.
        """
        instance = self.instance
        values = {}
        for field in self.ZONE_FIELDS:
            if field in attrs:
                values[field] = attrs[field]
            elif instance is not None:
                values[field] = getattr(instance, field)
        if not values:
            return attrs

        unknown = sorted({v for v in values.values() if v not in dict(ShipInspection.Compliance.choices)})
        if unknown:
            raise serializers.ValidationError({
                'zones': f'قيم مناطق فحص غير معروفة: {", ".join(map(str, unknown))}.'
            })

        if any(v == ShipInspection.Compliance.NON_COMPLIANT for v in values.values()):
            return attrs  # Rule 1 -> FAILED, decided below; no ambiguity
        if any(v == ShipInspection.Compliance.NOT_APPLICABLE for v in values.values()):
            raise serializers.ValidationError({
                'zones': (
                    'تحديد أي منطقة كـ «غير متاح» غير مدعوم حالياً لأن استنتاج النتيجة '
                    'يتطلب تصنيفاً قاطعاً لكل المناطق الثماني.'
                )
            })
        if all(v == ShipInspection.Compliance.COMPLIANT for v in values.values()):
            return attrs  # Rule 2 -> PASSED
        # Rule 4: fail closed on any combination not explicitly covered.
        raise serializers.ValidationError({
            'zones': 'تركيبة مناطق فحص غير معروفة؛ تم رفضها احتياطياً.'
        })


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
    port_entry_point_id = serializers.UUIDField(source='port.entry_point.id', read_only=True)
    port_entry_point_code = serializers.CharField(source='port.entry_point.code', read_only=True)
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True, default=None)

    class Meta:
        model = PortEmergency
        fields = [
            'id', 'port', 'port_name', 'port_entry_point_id', 'port_entry_point_code',
            'vessel', 'vessel_name', 'title',
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
