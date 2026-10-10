from rest_framework import serializers

from django.contrib.auth import get_user_model

from apps.shipping.models import (
    PortClearanceDecision,
    PreArrivalNotification,
    ShippingAgent,
    VesselCompanyRelationship,
    ShippingAuditLog,
)
from apps.carriers.models import Carrier

User = get_user_model()


class ShippingAgentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.UUIDField(source='company.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    ports_count = serializers.IntegerField(source='ports.count', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = ShippingAgent
        fields = [
            'id', 'company', 'company_id', 'company_name',
            'name', 'name_en', 'agent_type', 'license_number',
            'contact_name', 'email', 'phone', 'address',
            'status', 'valid_from', 'valid_until',
            'ports', 'ports_count', 'user', 'user_email', 'is_active',
            'is_valid', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShippingAgentCreateSerializer(ShippingAgentSerializer):
    class Meta(ShippingAgentSerializer.Meta):
        read_only_fields = ['id', 'created_at', 'updated_at']


class VesselCompanyRelationshipSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source='vessel.vessel_name', read_only=True)
    vessel_imo = serializers.CharField(source='vessel.imo_number', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.UUIDField(source='company.id', read_only=True)

    class Meta:
        model = VesselCompanyRelationship
        fields = [
            'id', 'vessel', 'vessel_name', 'vessel_imo',
            'company', 'company_name', 'company_id',
            'role', 'valid_from', 'valid_until',
            'is_primary', 'notes', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Validate VesselCompanyRelationship integrity constraints."""
        vessel = attrs.get('vessel') or (self.instance.vessel if self.instance else None)
        company = attrs.get('company') or (self.instance.company if self.instance else None)
        role = attrs.get('role', self.instance.role if self.instance else None)
        is_primary = attrs.get('is_primary', self.instance.is_primary if self.instance else False)
        valid_from = attrs.get('valid_from', self.instance.valid_from if self.instance else None)
        valid_until = attrs.get('valid_until', self.instance.valid_until if self.instance else None)
        is_active = attrs.get('is_active', self.instance.is_active if self.instance else True)

        if vessel and company and role:
            # Check date range coherence
            if valid_from and valid_until and valid_until < valid_from:
                raise serializers.ValidationError({
                    'valid_until': 'تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية.'
                })

            # Check for duplicate active primary relationship for same vessel+company+role
            if is_active and is_primary:
                existing_primary = VesselCompanyRelationship.objects.filter(
                    vessel=vessel,
                    company=company,
                    role=role,
                    is_primary=True,
                    is_active=True,
                )
                if self.instance:
                    existing_primary = existing_primary.exclude(pk=self.instance.pk)
                if existing_primary.exists():
                    raise serializers.ValidationError({
                        'is_primary': f'يوجد بالفعل علاقة أساسية نشطة لنفس السفينة والشركة والدور ({role}).'
                    })

        return attrs


class VesselCompanyRelationshipCreateSerializer(VesselCompanyRelationshipSerializer):
    class Meta(VesselCompanyRelationshipSerializer.Meta):
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Reuse the validation from parent
        return super().validate(attrs)


class PreArrivalNotificationSerializer(serializers.ModelSerializer):
    """Read/write serializer for the maritime pre-arrival notification.

    Ownership and geography are *resolved*, never accepted from the client:
    there is no ``company`` or ``entry_point`` field on the model, and the
    queryset the view hands us has already been narrowed to what the caller may
    touch.
    """

    vessel_name = serializers.CharField(source='vessel_visit.vessel.vessel_name', read_only=True)
    vessel_imo = serializers.CharField(source='vessel_visit.vessel.imo_number', read_only=True)
    company_id = serializers.UUIDField(source='vessel_visit.vessel.company_id', read_only=True)
    company_name = serializers.CharField(
        source='vessel_visit.vessel.company.name', read_only=True, default=None,
    )
    port_code = serializers.CharField(source='vessel_visit.port.code', read_only=True)
    port_name = serializers.CharField(source='vessel_visit.port.name_ar', read_only=True)
    entry_point_id = serializers.UUIDField(
        source='vessel_visit.port.entry_point_id', read_only=True, default=None,
    )
    arrival_date = serializers.DateField(source='vessel_visit.arrival_date', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)

    class Meta:
        model = PreArrivalNotification
        fields = [
            'id', 'vessel_visit',
            'vessel_name', 'vessel_imo', 'company_id', 'company_name',
            'port_code', 'port_name', 'entry_point_id', 'arrival_date',
            'status', 'submitted_by', 'submitted_by_name', 'submitted_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_notes', 'remarks', 'created_at', 'updated_at',
        ]
        # `status` is intentionally NOT read-only here; the view blocks direct
        # status writes, while the workflow actions are the only way it changes.
        read_only_fields = [
            'id', 'status', 'submitted_by', 'submitted_at',
            'reviewed_by', 'reviewed_at', 'review_notes', 'created_at', 'updated_at',
        ]

    def validate_vessel_visit(self, visit):
        """Reject visits the caller may not file against, and inactive ports.

        The view narrows `VesselVisit` to the caller's scope; if a client posts
        a foreign id the lookup still succeeds, so it is re-checked here.
        """
        from apps.shipping.views import assert_visit_filable

        assert_visit_filable(self.context['request'].user, visit)
        return visit


class PortClearanceDecisionSerializer(serializers.ModelSerializer):
    """Read-only projection of a government clearance decision.

    Every field is derived from ``vessel_visit`` or from the decision itself;
    there is no client-writable vessel/port/company/entry point.
    """

    vessel_name = serializers.CharField(source='vessel_visit.vessel.vessel_name', read_only=True)
    vessel_imo = serializers.CharField(source='vessel_visit.vessel.imo_number', read_only=True)
    company_id = serializers.UUIDField(source='vessel_visit.vessel.company_id', read_only=True)
    company_name = serializers.CharField(
        source='vessel_visit.vessel.company.name', read_only=True, default=None,
    )
    port_code = serializers.CharField(source='vessel_visit.port.code', read_only=True)
    port_name = serializers.CharField(source='vessel_visit.port.name_ar', read_only=True)
    entry_point_id = serializers.UUIDField(
        source='vessel_visit.port.entry_point_id', read_only=True, default=None,
    )
    decided_by_name = serializers.CharField(source='decided_by.full_name', read_only=True, default=None)

    class Meta:
        model = PortClearanceDecision
        fields = [
            'id', 'vessel_visit',
            'vessel_name', 'vessel_imo', 'company_id', 'company_name',
            'port_code', 'port_name', 'entry_point_id',
            'decision', 'reason', 'conditions',
            'decided_by', 'decided_by_name', 'decided_at',
            'is_current', 'supersedes', 'created_at', 'updated_at',
        ]
        # Clearance decisions are government records: never client-writable.
        read_only_fields = fields


class ShippingAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)

    class Meta:
        model = ShippingAuditLog
        fields = [
            'id', 'user', 'user_email', 'user_full_name',
            'company', 'company_name',
            'action', 'object_type', 'object_id', 'object_label',
            'detail', 'ip_address', 'created_at',
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Shipping company (Carrier) — member-facing projection
# ---------------------------------------------------------------------------
# Governance, review and integration configuration is administrative-only.
# These fields are deliberately absent so a company member can never read them,
# let alone write them:
#   api_key, api_key_display, client_id, client_secret_encrypted,
#   allowed_ips, rate_limit_per_minute, rate_limit_daily, api_scopes,
#   reviewed_by, reviewed_at, review_notes, registration_status,
#   compliance_class, last_api_use_*, api_error_count, last_health_event_sync_at

COMPANY_PUBLIC_FIELDS = [
    'id', 'name', 'name_en', 'company_type', 'country',
    'ports', 'entry_point_codes',
    'iata_code', 'icao_code',
    'email', 'phone', 'address', 'logo_url',
    'is_active',
    'vessels_count', 'agents_count',
    'created_at', 'updated_at',
]


class ShippingCompanySerializer(serializers.ModelSerializer):
    """Member-facing view of a shipping company (no governance/secrets)."""

    vessels_count = serializers.IntegerField(source='vessels.count', read_only=True)
    agents_count = serializers.IntegerField(source='shipping_agents.count', read_only=True)
    entry_point_codes = serializers.ListField(
        child=serializers.CharField(),
        source='ports.values_list',
        read_only=True,
    )

    class Meta:
        model = Carrier
        fields = COMPANY_PUBLIC_FIELDS
        read_only_fields = COMPANY_PUBLIC_FIELDS


class ShippingCompanyDetailSerializer(ShippingCompanySerializer):
    """Detail view — identical exposure to the list view.

    Previously this widened the payload with ``allowed_ips``, ``rate_limit_*``,
    ``api_scopes`` and review metadata. There is no approved self-service
    workflow that requires a member to read those, so detail and list are now
    deliberately equal: detail must not become a privilege-escalation surface.
    """

    class Meta(ShippingCompanySerializer.Meta):
        fields = ShippingCompanySerializer.Meta.fields


class ShippingCompanyAdminWriteSerializer(serializers.ModelSerializer):
    """Writable projection used **only** for platform administrators.

    Members never receive this serializer (see ``ShippingCompanySerializer``),
    so governance edits stay on the administrative path without widening what a
    company member can read or write.
    """

    vessels_count = serializers.IntegerField(source='vessels.count', read_only=True)
    agents_count = serializers.IntegerField(source='shipping_agents.count', read_only=True)

    class Meta:
        model = Carrier
        fields = [
            'id', 'name', 'name_en', 'company_type', 'country', 'ports',
            'iata_code', 'icao_code', 'email', 'phone', 'address', 'logo_url',
            'registration_status', 'compliance_class', 'is_active',
            'vessels_count', 'agents_count',
        ]
        read_only_fields = ['id', 'vessels_count', 'agents_count']