from django.test import TestCase

from apps.accounts.models import User
from apps.finance.models import Fee, Invoice, PaymentAttempt, Receipt
from apps.finance.models import FinancialAuditLog, InvoiceStatus
from apps.finance.services import (
    FinanceServiceError,
    balance_due,
    cancel_invoice,
    confirm_payment,
    issue_invoice,
    mark_overdue,
    next_invoice_number,
    paid_amount,
    reconcile_invoice,
    refund_invoice,
    run_overdue_sweep,
)


class FinanceModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='acct@test.sd', password='pass-1234-A', is_staff=True, is_superuser=True
        )

    def _make_invoice(self, status='DRAFT', user=None, due_days=None, net_amount='100.00'):
        return Invoice.objects.create(
            invoice_number=next_invoice_number(),
            source_type='MANUAL',
            items=[{'name': 'رسم', 'amount': str(net_amount)}],
            gross_amount=str(net_amount),
            net_amount=str(net_amount),
            currency='SDG',
            status=status,
            issued_by=user or self.user,
        )

    def test_fee_repr_and_deactivate(self):
        fee = Fee.objects.create(
            code='QT-0001', name_ar='رسم فحص', service_type='INSPECTION',
            amount_sdg='100.00', effective_from='2025-01-01', is_active=True,
        )
        self.assertFalse(fee.is_active is False)
        fee.is_active = False
        fee.save(update_fields=['is_active'])
        self.assertFalse(Fee.objects.get(id=fee.id).is_active)

    def test_invoice_and_receipt_flow(self):
        invoice = Invoice.objects.create(
            invoice_number='INV-2026-0001',
            source_type='MANUAL',
            items=[{'name': 'رسم', 'amount': '100.00'}],
            gross_amount='100.00',
            net_amount='100.00',
            status='ISSUED',
            issued_by=self.user,
        )
        payment = PaymentAttempt.objects.create(
            invoice=invoice, method='CASH', amount='100.00',
            gateway_status='CONFIRMED', collected_by=self.user,
        )
        receipt = Receipt.objects.create(
            receipt_number='RCPT-0001', invoice=invoice, payment=payment,
            amount='100.00', issued_by=self.user,
        )
        invoice.status = 'PAID'
        invoice.receipt_number = receipt.receipt_number
        invoice.save(update_fields=['status', 'receipt_number'])
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')
        self.assertIn(receipt.receipt_number, invoice.receipt_number)
        # رمز تحقق الايصال يُولَّد تلقائياً دون أن يكون نصاً خاماً
        self.assertEqual(len(receipt.verification_code), 64)

    def test_lifecycle_issue_pay(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user, due_days=14)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PENDING_PAYMENT)
        self.assertIsNotNone(invoice.due_date)
        invoice, payment, receipt = confirm_payment(invoice, self.user, 'CASH')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PAID)
        self.assertEqual(invoice.receipt_number, receipt.receipt_number)
        self.assertEqual(FinancialAuditLog.objects.filter(invoice=invoice).count(), 3)

    def test_segregation_reviewer_cannot_match_collector(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        invoice, _, _ = confirm_payment(invoice, self.user, 'BANK_CARD')
        # المحصل نفسه لا يَمرّر مراجعة فاتورته
        with self.assertRaises(FinanceServiceError):
            reconcile_invoice(invoice, self.user, collector_id=self.user.id)
        # مراجع مختلف عن المحصل يجوز
        other = User.objects.create_user(email='other@test.sd', password='pass-1234-A')
        reconcile_invoice(invoice, other, collector_id=self.user.id)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.RECONCILED)

    def test_cancel_and_refund(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        cancel_invoice(invoice, self.user, 'خطأ في تقديم الطلب')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.CANCELLED)
        # لا يمكن إلغاء فاتورة صارمة مرة أخرى
        with self.assertRaises(FinanceServiceError):
            cancel_invoice(invoice, self.user, 'سبب لاحق')

    def test_refund_after_paid(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH')
        invoice, refund = refund_invoice(invoice, self.user, 'استرداد للعميل')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.REFUNDED)
        self.assertGreater(refund.amount, 0)

    def test_overdue_sweep(self):
        one = self._make_invoice()
        two = self._make_invoice()
        issue_invoice(one, self.user, due_days=-1)
        issue_invoice(two, self.user, due_days=30)
        one.status = 'PENDING_PAYMENT'
        one.save(update_fields=['status'])
        two.status = 'PENDING_PAYMENT'
        two.save(update_fields=['status'])
        updated = run_overdue_sweep()
        self.assertEqual(updated, 1)
        one.refresh_from_db()
        two.refresh_from_db()
        self.assertEqual(one.status, InvoiceStatus.OVERDUE)
        self.assertEqual(two.status, InvoiceStatus.PENDING_PAYMENT)

    def test_partial_payment_marks_partial(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH', amount='40.00')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PARTIAL)
        self.assertEqual(paid_amount(invoice), 40)
        self.assertEqual(balance_due(invoice), 60)
        self.assertEqual(invoice.payments.count(), 1)
        self.assertEqual(invoice.receipts.count(), 1)

    def test_full_completes_partial_to_paid(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH', amount='40.00')
        confirm_payment(invoice, self.user, 'BANK_CARD', amount='60.00', gateway_ref='POS-X')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PAID)
        self.assertEqual(paid_amount(invoice), 100)
        self.assertEqual(balance_due(invoice), 0)
        self.assertEqual(invoice.payments.count(), 2)
        self.assertEqual(invoice.receipts.count(), 2)

    def test_overpayment_rejected(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH', amount='60.00')
        invoice.refresh_from_db()
        with self.assertRaises(FinanceServiceError) as ctx:
            confirm_payment(invoice, self.user, 'CASH', amount='50.00')
        self.assertIn('يتجاوز', str(ctx.exception))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PARTIAL)
        self.assertEqual(paid_amount(invoice), 60)

    def test_zero_or_negative_payment_rejected(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        with self.assertRaises(FinanceServiceError):
            confirm_payment(invoice, self.user, 'CASH', amount='0')
        with self.assertRaises(FinanceServiceError):
            confirm_payment(invoice, self.user, 'CASH', amount='-10.00')

    def test_cancel_with_partial_collection_rejected(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH', amount='30.00')
        invoice.refresh_from_db()
        with self.assertRaises(FinanceServiceError) as ctx:
            cancel_invoice(invoice, self.user, 'test')
        self.assertIn('مبالغ محصلة', str(ctx.exception))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PARTIAL)

    def test_overdue_sweep_includes_partial(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user, due_days=-1)
        invoice.status = 'PENDING_PAYMENT'
        invoice.save(update_fields=['status'])
        confirm_payment(invoice, self.user, 'CASH', amount='40.00')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PARTIAL)
        run_overdue_sweep()
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.OVERDUE)
        self.assertEqual(paid_amount(invoice), 40)

    def test_refund_partial_refunds_collected(self):
        invoice = self._make_invoice()
        issue_invoice(invoice, self.user)
        confirm_payment(invoice, self.user, 'CASH', amount='25.00')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PARTIAL)
        _, refund = refund_invoice(invoice, self.user, 'استرداد جزئي')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.REFUNDED)
        self.assertEqual(refund.amount, 25)

    def test_unique_numbering(self):
        numbers = []
        for _ in range(5):
            inv = self._make_invoice()
            numbers.append(inv.invoice_number)
        self.assertEqual(len(set(numbers)), 5)

    def test_printendpoint_serves_printable_receipt(self):
        from rest_framework.reverse import reverse
        from rest_framework.test import APIClient

        invoice = self._make_invoice()
        invoice.applicant_name = 'شركة الأمل'
        invoice.applicant_phone = '0912345678'
        invoice.save(update_fields=['applicant_name', 'applicant_phone'])
        issue_invoice(invoice, self.user, due_days=14)
        receipt = invoice.receipts.first()
        self.assertIsNone(receipt)
        invoice, _, receipt = confirm_payment(invoice, self.user, 'BANK_CARD', gateway_ref='POS-7781')
        client = APIClient()
        client.force_authenticate(self.user)
        res = client.get(reverse('receipt-print', kwargs={'pk': receipt.id}))
        self.assertEqual(res.status_code, 200)
        data = res.data['data']
        self.assertEqual(data['receipt']['number'], receipt.receipt_number)
        self.assertEqual(data['receipt']['verification_code'], receipt.verification_code)
        self.assertEqual(data['payment']['gateway_ref'], 'POS-7781')
        self.assertEqual(data['payment']['method_code'], 'BANK_CARD')
        self.assertEqual(data['invoice']['number'], invoice.invoice_number)
        self.assertEqual(data['customer']['name'], 'شركة الأمل')

    def _paid_invoice(self, method='CASH', gateway_ref='', amount='100.00', net_amount=None):
        invoice = self._make_invoice(net_amount=(net_amount or amount))
        issue_invoice(invoice, self.user, due_days=14)
        return confirm_payment(
            invoice, self.user, method, gateway_ref=gateway_ref, amount=amount,
        )

    def test_build_reconciliation_sums_and_matches(self):
        from datetime import date

        from apps.finance.models import ReconciliationChannel
        from apps.finance.services import build_reconciliation

        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-1', amount='50.00', net_amount='50.00')
        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-2', amount='30.00', net_amount='30.00')
        # نقدي لا يدخل قناة البوابة
        self._paid_invoice(method='CASH', amount='400.00', net_amount='400.00')

        built = build_reconciliation(
            date(2020, 1, 1), date(2100, 1, 1), ReconciliationChannel.PAYMENT_GATEWAY,
        )
        self.assertEqual(built['matched_count'], 2)
        self.assertEqual(float(built['system_total']), 80.0)
        self.assertEqual(len(built['matches']), 2)

    def test_reconciliation_duplicate_reference_detected(self):
        from datetime import date

        from apps.finance.models import ReconciliationChannel
        from apps.finance.services import build_reconciliation

        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-DUP', amount='10.00')
        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-DUP', amount='20.00')

        built = build_reconciliation(
            date(2020, 1, 1), date(2100, 1, 1), ReconciliationChannel.PAYMENT_GATEWAY,
        )
        self.assertEqual(built['discrepancy_count'], 1)
        self.assertEqual(built['discrepancies'][0]['type'], 'duplicate_reference')

    def test_create_and_seal_reconciliation(self):
        from datetime import date

        from apps.finance.models import ReconciliationChannel, ReconciliationStatus
        from apps.finance.services import (
            create_reconciliation,
            resolve_reconciliation,
            seal_reconciliation,
        )

        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-11', amount='100.00')
        rec = create_reconciliation(
            self.user, '2020-01-01', '2100-01-01', ReconciliationChannel.PAYMENT_GATEWAY,
            channel_total='100.00',
        )
        self.assertEqual(rec.status, ReconciliationStatus.MATCHED)
        self.assertEqual(float(rec.system_total), 100.0)
        self.assertEqual(float(rec.difference), 0.0)

        other = User.objects.create_user(email='rev@test.sd', password='pass-1234-A')
        sealed = seal_reconciliation(rec, other, channel_total='100.00')
        # الإغلاق المتوازن يُثبَّت على "مطابق" ثم يُحسَم نهائياً بحركة منفصلة
        self.assertEqual(sealed.status, ReconciliationStatus.MATCHED)

        sealed2 = resolve_reconciliation(sealed, other)
        self.assertEqual(sealed2.status, ReconciliationStatus.RESOLVED)

    def test_seal_respects_segregation(self):
        from datetime import date

        from apps.finance.models import ReconciliationChannel, ReconciliationStatus
        from apps.finance.services import create_reconciliation, seal_reconciliation

        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-21', amount='100.00')
        rec = create_reconciliation(
            self.user, '2020-01-01', '2100-01-01', ReconciliationChannel.PAYMENT_GATEWAY,
        )
        self.assertEqual(rec.status, ReconciliationStatus.DRAFT)
        # نفس المستخدم (منشئ التسوية) لا يغلّقها (فصل الاختصاص)
        with self.assertRaises(FinanceServiceError):
            seal_reconciliation(rec, self.user)

    def _report_helpers(self):
        from rest_framework.reverse import reverse
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(self.user)
        return reverse, client

    def test_report_endpoints_return_data(self):
        reverse, client = self._report_helpers()
        self._paid_invoice(method='BANK_CARD', gateway_ref='POS-91', amount='100.00')
        self._paid_invoice(method='CASH', amount='50.00')

        for name in ('by-channel', 'matrix', 'arrears-aging', 'variation'):
            res = client.get(reverse(f'finance-report-{name}'))
            self.assertEqual(res.status_code, 200, name)

        by_channel = client.get(reverse('finance-report-by-channel')).data['data']
        self.assertEqual(float(by_channel['total']), 150.0)
        methods = {r['method'] for r in by_channel['items']}
        self.assertTrue({'BANK_CARD', 'CASH'} <= methods)

    def test_report_export_csv(self):
        reverse, client = self._report_helpers()
        self._paid_invoice(method='CASH', amount='50.00')
        res = client.get(reverse('finance-report-export'))
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        self.assertIn('القطاع', res.content.decode('utf-8'))
        self.assertIn('المنفذ', res.content.decode('utf-8'))
        self.assertIn('الخدمة', res.content.decode('utf-8'))