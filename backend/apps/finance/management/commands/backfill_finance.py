from django.core.management.base import BaseCommand
from django.db import transaction

from apps.finance.models import (
    Invoice,
    InvoiceSource,
    InvoiceStatus,
    PaymentAttempt,
    PaymentMethod,
    GatewayStatus,
    Receipt,
)
from apps.food_quarantine.models import FoodInvoice, SampleInvoice


def _map_method(method):
    try:
        return PaymentMethod(method)
    except ValueError:
        return PaymentMethod.CASH


class Command(BaseCommand):
    help = 'نقل الفواتير/التحصيل القائمة (رقابة الأغذية + العينات) إلى نموذج الحسابات الموحد.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='عرض الحسابات دون إنشاء')

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        invoices_created = 0
        payments_created = 0
        receipts_created = 0
        skipped = 0

        for fi in FoodInvoice.objects.select_related('shipment', 'issued_by', 'paid_by'):
            if Invoice.objects.filter(invoice_number=fi.invoice_number).exists():
                skipped += 1
                continue
            is_paid = fi.status == FoodInvoice.PaymentStatus.PAID
            invoice = Invoice(
                invoice_number=fi.invoice_number,
                source_type=InvoiceSource.FOOD_SHIPMENT,
                food_shipment=fi.shipment,
                request_ref=getattr(fi.shipment, 'manifest_number', '') or '',
                service_type='FOOD_CONTROL',
                items=fi.items,
                gross_amount=fi.total_amount,
                discount_amount=0,
                net_amount=fi.total_amount,
                currency='SDG',
                status=InvoiceStatus.PAID if is_paid else InvoiceStatus.PENDING_PAYMENT,
                issued_by=fi.issued_by,
                issued_at=fi.issued_at if fi.issued_at else fi.created_at,
                due_date=None,
                receipt_number=fi.receipt_number,
            )
            if dry_run:
                invoices_created += 1
                continue
            invoice.save()

            if is_paid and fi.paid_by:
                payment = PaymentAttempt.objects.create(
                    invoice=invoice,
                    method=_map_method(fi.payment_method) if fi.payment_method else PaymentMethod.CASH,
                    amount=fi.total_amount,
                    currency='SDG',
                    gateway_ref=fi.payment_reference,
                    gateway_status=GatewayStatus.CONFIRMED,
                    collected_by=fi.paid_by,
                    collected_at=fi.paid_at or fi.updated_at,
                    notes=fi.paid_notes,
                )
                payments_created += 1
                Receipt.objects.create(
                    receipt_number=fi.receipt_number,
                    invoice=invoice,
                    payment=payment,
                    amount=fi.total_amount,
                    currency='SDG',
                    issued_by=fi.paid_by,
                    issued_at=fi.paid_at or fi.updated_at,
                )
                receipts_created += 1
            invoices_created += 1

        for si in SampleInvoice.objects.select_related('sample', 'issued_by', 'paid_by'):
            if Invoice.objects.filter(invoice_number=si.invoice_number).exists():
                skipped += 1
                continue
            is_paid = si.status == SampleInvoice.PaymentStatus.PAID
            invoice = Invoice(
                invoice_number=si.invoice_number,
                source_type=InvoiceSource.LAB_SAMPLE,
                food_sample=si.sample,
                request_ref=getattr(si.sample, 'sample_barcode', '') or '',
                service_type='LAB',
                items=si.items,
                gross_amount=si.total_amount,
                discount_amount=0,
                net_amount=si.total_amount,
                currency=(si.currency or 'SDG').upper(),
                status=InvoiceStatus.PAID if is_paid else InvoiceStatus.PENDING_PAYMENT,
                issued_by=si.issued_by,
                issued_at=si.issued_at if si.issued_at else si.created_at,
                due_date=None,
                receipt_number=si.receipt_number,
            )
            if dry_run:
                invoices_created += 1
                continue
            invoice.save()

            if is_paid and si.paid_by:
                payment = PaymentAttempt.objects.create(
                    invoice=invoice,
                    method=_map_method(getattr(si, 'payment_method', '')) or PaymentMethod.CASH,
                    amount=si.total_amount,
                    currency=(si.currency or 'SDG').upper(),
                    gateway_ref=si.payment_reference,
                    gateway_status=GatewayStatus.CONFIRMED,
                    collected_by=si.paid_by,
                    collected_at=si.paid_at or si.updated_at,
                    notes='',
                )
                payments_created += 1
                Receipt.objects.create(
                    receipt_number=si.receipt_number,
                    invoice=invoice,
                    payment=payment,
                    amount=si.total_amount,
                    currency=(si.currency or 'SDG').upper(),
                    issued_by=si.paid_by,
                    issued_at=si.paid_at or si.updated_at,
                )
                receipts_created += 1
            invoices_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'فواتير موحدة: {invoices_created}، دفعات: {payments_created}، '
            f'إيصالات: {receipts_created}، تخطّى (موجود): {skipped}'
        ))