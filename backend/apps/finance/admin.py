from django.contrib import admin

from .models import (
    Fee,
    Invoice,
    PaymentAttempt,
    Receipt,
    Cancellation,
    Refund,
    Reconciliation,
    FinancialAuditLog,
)


class FeeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_ar', 'service_type', 'amount_sdg', 'amount_usd', 'year', 'is_active']
    list_filter = ['service_type', 'currency', 'year', 'is_active']
    search_fields = ['name_ar', 'code', 'legal_reference']
    list_editable = ['is_active']


class PaymentAttemptInline(admin.TabularInline):
    model = PaymentAttempt
    extra = 0
    readonly_fields = ['id', 'collected_at']


class ReceiptInline(admin.TabularInline):
    model = Receipt
    extra = 0
    readonly_fields = ['id', 'issued_at', 'verification_code']


class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 'source_type', 'request_ref', 'net_amount',
        'currency', 'status', 'issued_by', 'issued_at',
    ]
    list_filter = ['status', 'source_type', 'currency']
    search_fields = ['invoice_number', 'request_ref', 'applicant_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [PaymentAttemptInline, ReceiptInline]


class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'method', 'amount', 'currency', 'gateway_status', 'collected_by', 'collected_at']
    list_filter = ['method', 'gateway_status', 'currency']
    search_fields = ['invoice__invoice_number', 'gateway_ref']


class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'invoice', 'amount', 'currency', 'issued_by', 'issued_at']
    search_fields = ['receipt_number', 'invoice__invoice_number']
    readonly_fields = ['verification_code']


class CancellationAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'reason', 'requested_by', 'requested_at', 'approved_by', 'approved_at']
    search_fields = ['invoice__invoice_number']


class RefundAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'status', 'requested_by', 'approved_by', 'executed_at']
    list_filter = ['status']
    search_fields = ['invoice__invoice_number', 'reason']


class ReconciliationAdmin(admin.ModelAdmin):
    list_display = [
        'period_start', 'period_end', 'channel', 'system_total',
        'channel_total', 'difference', 'status', 'reconciled_by',
    ]
    list_filter = ['channel', 'status']


class FinancialAuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'resource_type', 'invoice_ref', 'field_name', 'occurred_at']
    list_filter = ['action', 'resource_type']
    search_fields = ['invoice_ref', 'resource_id', 'new_value', 'old_value']
    readonly_fields = ['actor', 'action', 'resource_type', 'resource_id', 'invoice', 'invoice_ref',
                       'field_name', 'old_value', 'new_value', 'ip_address', 'occurred_at']


admin.site.register(Fee, FeeAdmin)
admin.site.register(Invoice, InvoiceAdmin)
admin.site.register(PaymentAttempt, PaymentAttemptAdmin)
admin.site.register(Receipt, ReceiptAdmin)
admin.site.register(Cancellation, CancellationAdmin)
admin.site.register(Refund, RefundAdmin)
admin.site.register(Reconciliation, ReconciliationAdmin)
admin.site.register(FinancialAuditLog, FinancialAuditLogAdmin)