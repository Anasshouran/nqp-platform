from rest_framework import serializers

from .models import (
    Fee,
    Invoice,
    PaymentAttempt,
    Receipt,
    Reconciliation,
    FinancialAuditLog,
)


class FeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fee
        fields = [
            'id', 'code', 'name_ar', 'service_type', 'unit',
            'amount_sdg', 'amount_usd', 'currency',
            'effective_from', 'effective_to', 'approved_by',
            'legal_reference', 'year', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'invoice', 'method', 'amount', 'currency',
            'gateway_ref', 'gateway_status', 'collected_by', 'collected_at', 'notes',
        ]
        read_only_fields = ['id', 'collected_by', 'collected_at']


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'invoice', 'payment', 'amount',
            'currency', 'issued_by', 'issued_at', 'verification_code',
        ]
        read_only_fields = ['id', 'issued_by', 'issued_at', 'verification_code']


class InvoiceSerializer(serializers.ModelSerializer):
    shed_status = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()

    payments = PaymentAttemptSerializer(many=True, read_only=True)
    receipts = ReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'source_type', 'food_shipment', 'food_sample',
            'request_ref', 'service_type', 'applicant_name', 'applicant_id_number', 'applicant_phone',
            'items', 'gross_amount', 'discount_amount', 'discount_reason', 'net_amount',
            'currency', 'status', 'issued_by', 'issued_at', 'due_date', 'receipt_number',
            'reviewed_by', 'reviewed_at', 'reconciled_by', 'reconciled_at',
            'paid_amount', 'balance_due',
            'payments', 'receipts', 'shed_status', 'created_at',
        ]
        read_only_fields = ['id', 'issued_by', 'issued_at', 'status', 'payments', 'receipts', 'shed_status', 'paid_amount', 'balance_due']

    def get_shed_status(self, obj):
        shipment = obj.food_shipment
        if not shipment:
            return None
        return shipment.status

    def get_paid_amount(self, obj):
        from .services import paid_amount as _paid_amount
        return str(_paid_amount(obj))

    def get_balance_due(self, obj):
        from .services import balance_due as _balance_due
        return str(_balance_due(obj))


class ReconciliationSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    reconciled_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Reconciliation
        fields = [
            'id', 'period_start', 'period_end', 'channel', 'system_total',
            'channel_total', 'difference', 'status', 'status_display',
            'matched_count', 'discrepancy_count', 'matches', 'discrepancies',
            'investigation_notes',
            'created_by', 'created_by_name', 'reconciled_by', 'reconciled_by_name', 'reconciled_at',
            'created_at',
        ]
        read_only_fields = ['id', 'reconciled_by', 'reconciled_at', 'status', 'created_by']

    def get_status_display(self, obj):
        from .models import ReconciliationStatus

        labels = dict(ReconciliationStatus.choices)
        return labels.get(obj.status, obj.status)

    def get_created_by_name(self, obj):
        actor = obj.created_by
        if not actor:
            return None
        return getattr(actor, 'full_name', '') or getattr(actor, 'email', '') or None

    def get_reconciled_by_name(self, obj):
        if not obj.reconciled_by:
            return None
        return getattr(obj.reconciled_by, 'full_name', '') or getattr(obj.reconciled_by, 'email', '')


class FinancialAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = FinancialAuditLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_role', 'action', 'resource_type',
            'resource_id', 'invoice_ref', 'field_name', 'old_value', 'new_value',
            'ip_address', 'occurred_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        name = getattr(obj.actor, 'name', '') or ''
        email = getattr(obj.actor, 'email', '') or ''
        return name or email