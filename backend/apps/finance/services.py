"""الخدمات المالية — محرك الرسوم، دورة حياة الفاتورة، الإيصالات، سجل التدقيق.

مرجع التشغيل: اللائحة المالية لمنصة الحجر الصحي القومي.
لا يُحذف أي سجل مالي نهائياً؛ كل تحوّل يُسجَّل في FinancialAuditLog.
"""
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .models import (
    AuditAction,
    Cancellation,
    Fee,
    GatewayStatus,
    Invoice,
    InvoiceSource,
    InvoiceStatus,
    PaymentAttempt,
    PaymentMethod,
    Receipt,
    Reconciliation,
    ReconciliationChannel,
    ReconciliationStatus,
    Refund,
    RefundStatus,
    ServiceType,
    _current_year,
)


class FinanceServiceError(Exception):
    """خطأ قاعدة مالية — يصل للمستخدم كرسالة مفهومة."""


# ---------------------------------------------------------------------------
#  ترقيم
# ---------------------------------------------------------------------------

def _unique_code(prefix, model, field):
    year = _current_year()
    pattern = f'{prefix}-{year}-'
    existing = set(
        model.objects.filter(**{f'{field}__startswith': pattern}).values_list(field, flat=True)
    )
    seq = 1
    while True:
        code = f'{pattern}{seq:05d}'
        if code not in existing:
            return code
        seq += 1


def next_invoice_number():
    return _unique_code('INV', Invoice, 'invoice_number')


def next_receipt_number():
    return _unique_code('RCPT', Receipt, 'receipt_number')


# ---------------------------------------------------------------------------
#  محرك الرسوم
# ---------------------------------------------------------------------------

_FEE_TYPE_TO_SERVICE = {
    'WEIGHT': 'FOOD_CONTROL',
    'UNLOADING': 'FOOD_CONTROL',
    'MONITORING': 'FOOD_CONTROL',
    'CERTIFICATE': 'CERTIFICATE',
    'INSPECTION': 'INSPECTION',
    'SAMPLE': 'SAMPLING',
    'ANALYSIS': 'LAB',
    'ADMIN': 'OTHER',
    'DESTRUCTION': 'OTHER',
    'ADJUSTMENT': 'OTHER',
}


def fee_catalog(service_type=None, year=None, active_only=True):
    """قائمة بنود الرسوم المعتمدة (Master Data) للمناداة من الواجهة."""
    qs = Fee.objects.all()
    if service_type:
        qs = qs.filter(service_type=service_type)
    if year:
        qs = qs.filter(year=year)
    if active_only:
        qs = qs.filter(is_active=True, effective_from__lte=date.today()).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=date.today())
        )
    return qs.order_by('service_type', 'code', 'id')


def resolve_fee_for_line(line: dict) -> "Fee | None":
    """يربط بند الحسبة (من خوارزمية الشحنات) ببند Master Data إن وُجد."""
    code = (line.get('fee_code') or line.get('code') or '').strip()
    if code:
        fee = Fee.objects.filter(code=code, is_active=True).first()
        if fee:
            return fee
    name = (line.get('name') or line.get('name_ar') or '').strip()
    if name:
        matched = Fee.objects.filter(name_ar=name, is_active=True).first()
        if matched:
            return matched
    service = _FEE_TYPE_TO_SERVICE.get((line.get('fee_type') or '').upper())
    if service:
        return Fee.objects.filter(service_type=service, is_active=True).first()
    return None


def fee_engine(shipment=None, manual_lines=None, currency='SDG'):
    """يُنتج بنود الفاتورة من Master Data أو من الحسبة الخوارزمية الحالية.

    - الشحنة: بند الحسبة يُربط ببند Master Data (fee_id) متى ما وُجد، وإلا
      يُسجَّل كبند ذي مبلغ محسوب قابل للاعتماد لاحقاً.
    - يدوي: بنود من المنداة مباشرة (fee_id / code / المبلغ).
    """
    if shipment is not None:
        from apps.food_quarantine.services import compute_fee_breakdown

        breakdown = compute_fee_breakdown(shipment)
        lines = []
        for raw in breakdown.get('lines', []):
            fee = resolve_fee_for_line(raw)
            amount = raw.get('fee') or 0
            lines.append({
                'fee_id': str(fee.id) if fee else None,
                'fee_code': fee.code if fee else '',
                'name': raw.get('name') or (fee.name_ar if fee else ''),
                'quantity': 1,
                'unit': fee.unit if fee else '',
                'unit_amount': str(amount),
                'amount': str(amount),
                'currency': currency,
                'mapped': bool(fee),
            })
        return {
            'exempt': breakdown.get('exempt', False),
            'basis': breakdown.get('basis', ''),
            'lines': lines,
            'total': breakdown.get('total', '0'),
        }

    # مندادة يدوية
    lines = []
    subtotal = 0
    for item in manual_lines or []:
        amount = DecimalOf(item)
        price = amount
        fee = None
        if item.get('fee_id'):
            fee = Fee.objects.filter(id=item['fee_id'], is_active=True).first()
            if fee:
                price = fee_amount_for(fee, currency)
        elif item.get('code'):
            fee = Fee.objects.filter(code=item['code'], is_active=True).first()
            if fee:
                price = fee_amount_for(fee, currency)
        qty = int(item.get('quantity') or 1)
        lines.append({
            'fee_id': str(fee.id) if fee else None,
            'fee_code': fee.code if fee else '',
            'name': (fee.name_ar if fee else '') or item.get('name', ''),
            'quantity': qty,
            'unit': fee.unit if fee else '',
            'unit_amount': str(price),
            'amount': str(price * qty),
            'currency': currency,
        })
        subtotal += price * qty
    return {'lines': lines, 'total': str(subtotal)}


def build_invoice_lines(shipment=None, manual_items=None, currency='SDG'):
    """يمرّر بنود الحسبة الخوارزمية أو المنداة اليدوية عبر محرك الرسوم."""
    if manual_items:
        return fee_engine(manual_lines=manual_items, currency=currency)
    if shipment is not None:
        return fee_engine(shipment=shipment, currency=currency)
    return {'exempt': False, 'basis': '', 'lines': [], 'total': '0'}


def create_shipment_invoice(shipment, user, request=None, item_lines=None,
                            currency='SDG', due_days=14):
    """فاتورة شحنة (FOOD_SHIPMENT) — بند واحد من محرك الرسوم → PENDING_PAYMENT."""
    engine = build_invoice_lines(shipment=shipment, manual_items=item_lines, currency=currency)
    lines = engine.get('lines') or []
    if not lines:
        raise FinanceServiceError('أضف بنود الرسوم.')
    total = Decimal(str(engine.get('total') or '0'))
    invoice = Invoice.objects.create(
        invoice_number=next_invoice_number(),
        source_type=InvoiceSource.FOOD_SHIPMENT,
        food_shipment=shipment,
        request_ref=getattr(shipment, 'manifest_number', ''),
        service_type=ServiceType.FOOD_CONTROL,
        applicant_name=getattr(shipment, 'supplier_name', '') or getattr(shipment, 'clearing_agent', ''),
        items=lines,
        gross_amount=total,
        net_amount=total,
        currency=currency,
        status=InvoiceStatus.DRAFT,
        issued_by=user,
        issued_at=timezone.now(),
        due_date=(timezone.now() + timedelta(days=due_days)).date(),
    )
    issue_invoice(invoice, user, due_days=due_days, request=request)
    return invoice


def create_sample_invoice(sample, user, request=None, currency='SDG', due_days=14):
    """فاتورة عينة مختبر (LAB_SAMPLE) — بنود من معاملات التحليل بأسعارها.

    - الصفر: تُصدر وتُسدد آلياً بمبلغ 0 ويُدوِّن السبب في ملاحظات التحصيل.
    - غير الصفر: تتحول إلى PENDING_PAYMENT لتحصيلها لاحقاً.
    """
    tests = sample.tests.select_related('parameter').order_by('created_at')
    if not tests.exists():
        raise FinanceServiceError('أضف معاملات التحليل للعينة قبل إصدار الفاتورة.')
    lines = []
    total = Decimal('0')
    for t in tests:
        price = t.parameter.price if t.parameter.price is not None else Decimal('0')
        fee = resolve_fee_for_line({
            'code': t.parameter.code,
            'name': t.parameter.name_ar,
            'fee_type': 'ANALYSIS',
        })
        total += price
        lines.append({
            'fee_id': str(fee.id) if fee else None,
            'fee_code': fee.code if fee else t.parameter.code,
            'name': fee.name_ar if fee else t.parameter.name_ar,
            'quantity': 1,
            'unit': t.parameter.unit if t.parameter.unit else '',
            'unit_amount': str(price),
            'amount': str(price),
            'currency': currency,
            'parameter': str(t.parameter_id),
        })
    invoice = Invoice.objects.create(
        invoice_number=next_invoice_number(),
        source_type=InvoiceSource.LAB_SAMPLE,
        food_sample=sample,
        request_ref=getattr(sample, 'sample_number', ''),
        service_type=ServiceType.LAB,
        applicant_name=getattr(sample, 'requesting_department', ''),
        items=lines,
        gross_amount=total,
        net_amount=total,
        currency=currency,
        status=InvoiceStatus.DRAFT,
        issued_by=user,
        issued_at=timezone.now(),
        due_date=(timezone.now() + timedelta(days=due_days)).date(),
    )
    if total == 0:
        issue_invoice(invoice, user, due_days=due_days, request=request)
        confirm_payment(invoice, user, PaymentMethod.CASH, amount=Decimal('0'),
                        notes='صفر الرسوم (إعفاء تلقائي)', request=request)
        return invoice, True
    issue_invoice(invoice, user, due_days=due_days, request=request)
    return invoice, False


def pending_statuses():
    return [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED,
            InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]


def latest_payment(invoice):
    return invoice.payments.order_by('-collected_at').first()


def paid_amount(invoice) -> Decimal:
    """إجمالي المحصل فعلياً (كل العمليات غير الفاشلة)."""
    total = invoice.payments.exclude(gateway_status=GatewayStatus.FAILED).aggregate(
        t=Sum('amount')
    )['t']
    return Decimal(str(total or 0))


def balance_due(invoice) -> Decimal:
    """الرصيد المتبقي للسداد."""
    return Decimal(str(invoice.net_amount or 0)) - paid_amount(invoice)


def DecimalOf(item):
    raw = item.get('unit_amount') or item.get('amount') or item.get('price') or item.get('fee') or 0
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError):
        return Decimal('0')


def fee_amount_for(fee: Fee, currency='SDG') -> Decimal:
    if currency == 'USD' and fee.amount_usd is not None:
        return fee.amount_usd
    if fee.amount_sdg is not None:
        return fee.amount_sdg
    if fee.amount_usd is not None:
        return fee.amount_usd
    return Decimal('0')


# ---------------------------------------------------------------------------
#  سجل التدقيق المالي
# ---------------------------------------------------------------------------

def audit(request_or_user=None, action=None, resource_type='', resource_id='',
          invoice=None, field_name='', old_value='', new_value='', **metadata):
    """يسجّل كل عملية مالية (من، الدور، قبل، بعد، IP، التوقيت)."""
    from .models import FinancialAuditLog

    user = None
    ip = None
    if request_or_user is not None:
        if hasattr(request_or_user, 'user'):
            user = request_or_user.user
            if hasattr(request_or_user, 'META'):
                ip = request_or_user.META.get('REMOTE_ADDR')
        elif hasattr(request_or_user, 'is_authenticated'):
            user = request_or_user

    return FinancialAuditLog.objects.create(
        actor=user,
        actor_role=(getattr(user, 'role_code', '') or '') if user and not user.is_anonymous else '',
        action=action,
        resource_type=resource_type,
        resource_id=resource_id or (str(invoice.id) if invoice else ''),
        invoice=invoice,
        invoice_ref=getattr(invoice, 'invoice_number', '') if invoice else '',
        field_name=field_name,
        old_value=str(old_value) if old_value not in (None, '', b'') else '',
        new_value=str(new_value) if new_value not in (None, '', b'') else '',
        ip_address=ip,
        metadata=metadata,
    )


def _action(value):
    try:
        return AuditAction(value)
    except ValueError:
        return AuditAction.UPDATE


# ---------------------------------------------------------------------------
#  دورة حياة الفاتورة
# ---------------------------------------------------------------------------

_ALLOWED_FROM = {
    InvoiceStatus.DRAFT: {InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED},
    InvoiceStatus.ISSUED: {InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.PARTIAL, InvoiceStatus.CANCELLED, InvoiceStatus.OVERDUE},
    InvoiceStatus.PENDING_PAYMENT: {InvoiceStatus.PAID, InvoiceStatus.PARTIAL, InvoiceStatus.CANCELLED, InvoiceStatus.OVERDUE},
    InvoiceStatus.PAID: {InvoiceStatus.RECONCILED, InvoiceStatus.REFUNDED},
    InvoiceStatus.RECONCILED: {InvoiceStatus.REFUNDED},
    InvoiceStatus.OVERDUE: {InvoiceStatus.PAID, InvoiceStatus.PARTIAL, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED},
    InvoiceStatus.PARTIAL: {InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.REFUNDED},
}

_FINAL = {InvoiceStatus.PAID, InvoiceStatus.RECONCILED, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED}


def can_transition(current, target) -> bool:
    current_status = InvoiceStatus(current)
    target_status = InvoiceStatus(target)
    if current_status == target_status:
        return False
    if current_status in _FINAL and target_status != InvoiceStatus.REFUNDED:
        return False
    return target_status in _ALLOWED_FROM.get(current_status, set())


def issue_invoice(invoice, user, due_days=14, request=None):
    """DRAFT → ISSUED (مع استحقاق) ؛ ثم تُصبح بانتظار الدفع تلقائياً."""
    if invoice.status != InvoiceStatus.DRAFT:
        raise FinanceServiceError('الفاتورة ليست في حالة مسودة.')
    old = invoice.status
    invoice.status = InvoiceStatus.ISSUED
    invoice.issued_by = user
    invoice.issued_at = timezone.now()
    invoice.due_date = (timezone.now() + timedelta(days=due_days)).date()
    invoice.save(update_fields=['status', 'issued_by', 'issued_at', 'due_date'])
    audit(request, AuditAction.CREATE, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='issue_invoice')
    invoice.status = InvoiceStatus.PENDING_PAYMENT
    invoice.save(update_fields=['status'])
    audit(request, AuditAction.UPDATE, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=InvoiceStatus.ISSUED,
          new_value=InvoiceStatus.PENDING_PAYMENT, event='awaiting_payment')
    return invoice


def confirm_payment(invoice, user, method, amount=None, gateway_ref='',
                    notes='', gateway_status=GatewayStatus.CONFIRMED, request=None):
    """تحصيل الدفعة وإصدار الإيصال — كامل → PAID، جزئي → PARTIAL."""
    if invoice.status not in (InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.OVERDUE, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL):
        raise FinanceServiceError('لا يمكن التحصيل على هذه الحالة.')
    try:
        method_value = PaymentMethod(method)
    except ValueError:
        raise FinanceServiceError('طريقة دفع غير صالحة.')
    bal = balance_due(invoice)
    amount = amount if amount is not None else bal
    amount = Decimal(str(amount))
    if amount <= 0:
        raise FinanceServiceError('المبلغ يجب أن يكون أكبر من صفر.')
    if amount > bal:
        raise FinanceServiceError('المبلغ المدخل يتجاوز المتبقي.')
    payment = PaymentAttempt.objects.create(
        invoice=invoice,
        method=method_value,
        amount=amount,
        currency=invoice.currency,
        gateway_ref=gateway_ref,
        gateway_status=gateway_status,
        collected_by=user,
        collected_at=timezone.now(),
        notes=notes,
    )
    receipt_number = next_receipt_number()
    receipt = Receipt.objects.create(
        receipt_number=receipt_number,
        invoice=invoice,
        payment=payment,
        amount=amount,
        currency=invoice.currency,
        issued_by=user,
        issued_at=timezone.now(),
    )
    old = invoice.status
    remaining = balance_due(invoice)
    if remaining <= 0:
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PARTIAL
    invoice.receipt_number = receipt_number
    invoice.save(update_fields=['status', 'receipt_number'])
    audit(request, AuditAction.MARK_PAID, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='confirm_payment', method=method_value, receipt=receipt_number, amount=str(amount))
    return invoice, payment, receipt


def reconcile_invoice(invoice, user, collector_id=None, request=None):
    """PAID → RECONCILED — الفصل بين التحصيل والمراجعة."""
    if invoice.status != InvoiceStatus.PAID:
        raise FinanceServiceError('التسوية تتطلب فاتورة مدفوعة.')
    if collector_id and str(collector_id) == str(user.id):
        raise FinanceServiceError('لا يجوز للمحصل نفسه اعتماد مراجعة الفاتورة (فصل الاختصاصات).')
    old = invoice.status
    invoice.status = InvoiceStatus.RECONCILED
    invoice.reviewed_by = user
    invoice.reviewed_at = timezone.now()
    invoice.reconciled_by = user
    invoice.reconciled_at = timezone.now()
    invoice.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'reconciled_by', 'reconciled_at'])
    audit(request, AuditAction.RECONCILE, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='reconcile')
    return invoice


def cancel_invoice(invoice, user, reason, approver_id=None, request=None):
    """إلغاء فاتورة غير مسددة → CANCELLED (لا حذف)."""
    if invoice.status in _FINAL:
        raise FinanceServiceError('لا يمكن إلغاء فاتورة في حالة نهائية.')
    col = paid_amount(invoice)
    if col > 0:
        raise FinanceServiceError('لا يمكن إلغاء فاتورة بها مبالغ محصلة — استرد المبلغ أولاً.')
    approver = None
    if approver_id:
        from apps.accounts.models import User

        approver = User.objects.filter(id=approver_id).first()
    Cancellation.objects.create(
        invoice=invoice, reason=reason, requested_by=user,
        requested_at=timezone.now(), approved_by=approver,
        approved_at=timezone.now() if approver else None,
    )
    old = invoice.status
    invoice.status = InvoiceStatus.CANCELLED
    invoice.save(update_fields=['status'])
    audit(request, AuditAction.CANCEL, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='cancel_invoice', reason=reason)
    return invoice


def refund_invoice(invoice, user, reason, amount=None, approver_id=None, request=None):
    """استرداد فاتورة مسددة → REFUNDED (يُحتفظ بالسجل والدفع)."""
    if invoice.status not in (InvoiceStatus.PAID, InvoiceStatus.RECONCILED, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL):
        raise FinanceServiceError('الاسترداد يتطلب فاتورة مدفوعة.')
    amount = amount if amount is not None else paid_amount(invoice)
    amount = Decimal(str(amount))
    approver = None
    approved_at = None
    if approver_id:
        from apps.accounts.models import User

        approver = User.objects.filter(id=approver_id).first()
        approved_at = timezone.now()
    refund = Refund.objects.create(
        invoice=invoice, reason=reason, amount=amount,
        status=RefundStatus.EXECUTED if approver else RefundStatus.REQUESTED,
        requested_by=user, requested_at=timezone.now(),
        approved_by=approver, approved_at=approved_at,
        executed_at=timezone.now() if approver else None,
        notes='',
    )
    old = invoice.status
    invoice.status = InvoiceStatus.REFUNDED
    invoice.save(update_fields=['status'])
    audit(request, AuditAction.REFUND, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='refund_invoice', reason=reason, amount=str(amount), refund=refund.status)
    return invoice, refund


def mark_overdue(invoice, request=None):
    """نقل الفواتير المتأخرة إلى OVERDUE (عبر الأمر advance_overdue)."""
    if invoice.status not in (InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL):
        return None
    old = invoice.status
    invoice.status = InvoiceStatus.OVERDUE
    invoice.save(update_fields=['status'])
    audit(request, AuditAction.UPDATE, 'Invoice', resource_id=str(invoice.id),
          invoice=invoice, field_name='status', old_value=old, new_value=invoice.status,
          event='advance_overdue')
    return invoice


def advance_overdue_candidates(now=None):
    """الفواتير المستحقة التي تجاوزت تاريخ الاستحقاق ولم تُسدد."""
    now = now or timezone.now()
    return Invoice.objects.filter(
        status__in=[InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL],
        due_date__lt=now.date(),
    )


@transaction.atomic
def run_overdue_sweep(now=None):
    updated = 0
    for invoice in advance_overdue_candidates(now):
        mark_overdue(invoice)
        updated += 1
    return updated


# ---------------------------------------------------------------------------
#  المطابقة المالية (التسويات) — نظام NQP ↔ بوابة الدفع/البنك
# ---------------------------------------------------------------------------

def _channel_methods(channel):
    """طريقة/ طرق الدفع المقابلة لقناة التسوية."""
    if channel == ReconciliationChannel.BANK:
        return [PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_CARD]
    return [PaymentMethod.ELECTRONIC, PaymentMethod.BANK_CARD]


def _fmt_currency(amount, currency):
    return f'{amount} {currency}'


def build_reconciliation(period_start, period_end, channel, request=None):
    """يبني تسوية جديدة لفترة/قناة: إجماليات النظام، المطابقات، والفروقات.

    - النظام = عمليات الدفع المؤكدة محلياً في الفترة على وسائل القناة.
    - القناة = السجل الوارد من بوابة الدفع/البنك (يُدخل يدوياً هنا).
    - المطابقة تعتمد على gateway_ref و المبلغ.
    لا حذف: تُحفظ التسوية، وتتبعها دورة DRAFT → MATCHED/DISCREPANCY → RESOLVED.
    """
    if period_start > period_end:
        raise FinanceServiceError('بداية الفترة يجب ألا تسبق نهايتها.')
    channel_value = ReconciliationChannel(channel)
    methods = _channel_methods(channel_value)

    payments = PaymentAttempt.objects.filter(
        collected_at__date__gte=period_start,
        collected_at__date__lte=period_end,
        method__in=methods,
        gateway_status=GatewayStatus.CONFIRMED,
    ).select_related('invoice', 'collected_by')

    system_total = sum((p.amount for p in payments), Decimal('0'))
    matches = []
    discrepancies = []

    known = {}
    dupes = {}
    for p in payments:
        key = p.gateway_ref.strip().upper() if p.gateway_ref and p.gateway_ref.strip() else ''
        if not key:
            discrepancies.append({
                'type': 'no_reference',
                'payment_id': str(p.id),
                'invoice_number': p.invoice.invoice_number if p.invoice else '',
                'receipt_number': getattr(p.invoice, 'receipt_number', '') or '',
                'amount': str(p.amount),
                'currency': p.currency,
                'collected_at': p.collected_at.isoformat(),
                'collected_by': getattr(p.collected_by, 'full_name', '') or '',
                'issue': 'لا يوجد مرجع بوابة دفع (يُعامل كمتأخر محلي بلا مرجع)',
            })
            continue
        if key in known:
            dupes.setdefault(key, []).append(p)
            continue
        known[key] = p

    for key, p in known.items():
        matches.append({
            'reference': key,
            'payment_id': str(p.id),
            'invoice_number': p.invoice.invoice_number if p.invoice else '',
            'receipt_number': getattr(p.invoice, 'receipt_number', '') or '',
            'amount': str(p.amount),
            'currency': p.currency,
            'collected_at': p.collected_at.isoformat(),
            'collected_by': getattr(p.collected_by, 'full_name', '') or '',
            'method': p.method,
        })

    for key, group in dupes.items():
        total = sum((p.amount for p in group), Decimal('0'))
        discrepancies.append({
            'type': 'duplicate_reference',
            'reference': key,
            'count': len(group),
            'payment_ids': [str(p.id) for p in group],
            'amount': str(total),
            'currency': group[0].currency,
            'issue': f'مرجع مكرر ({len(group)} حركات) — يتطلب تسوية يدوية',
        })

    return {
        'system_total': system_total,
        'channel_total': None,
        'difference': None,
        'matches': matches,
        'discrepancies': discrepancies,
        'matched_count': len(matches),
        'discrepancy_count': len(discrepancies),
    }


def create_reconciliation(user, period_start, period_end, channel, channel_total=None,
                          investigation_notes='', request=None):
    """يحفظ تسوية جديدة (DRAFT) مع إجماليات النظام المرجعية."""
    period_start_date = date(*map(int, period_start.split('-')))
    period_end_date = date(*map(int, period_end.split('-')))
    built = build_reconciliation(
        period_start_date, period_end_date,
        ReconciliationChannel(channel), request=request,
    )
    difference = None
    status = ReconciliationStatus.DRAFT
    channel_total_value = channel_total
    if channel_total_value is not None:
        channel_total_value = Decimal(str(channel_total_value))
        difference = built['system_total'] - channel_total_value
        status = ReconciliationStatus.MATCHED if difference == 0 else ReconciliationStatus.DISCREPANCY
    reconciliation = Reconciliation.objects.create(
        period_start=period_start_date,
        period_end=period_end_date,
        channel=ReconciliationChannel(channel),
        system_total=built['system_total'],
        channel_total=channel_total_value if channel_total_value is not None else Decimal('0'),
        difference=difference if difference is not None else Decimal('0'),
        status=status,
        matched_count=built['matched_count'],
        discrepancy_count=built['discrepancy_count'],
        matches=built['matches'],
        discrepancies=built['discrepancies'],
        investigation_notes=investigation_notes,
        created_by=user,
        reconciled_by=None,
        reconciled_at=None,
    )
    audit(request, AuditAction.CREATE, 'Reconciliation', resource_id=str(reconciliation.id),
          field_name='status', old_value='', new_value=status,
          event='create_reconciliation', channel=channel, from_date=period_start, to_date=period_end)
    return reconciliation


@transaction.atomic
def seal_reconciliation(reconciliation, user, system_total=None, channel_total=None,
                        investigation_notes='', request=None):
    """يغلّق التسوية: DRAFT → MATCHED/DISCREPANCY → RESOLVED (مقارنة النسب وإجمالي النظام).

    - يجب ألا يكون محصّل السجلات هو من يغلقها (فصل الاختصاصات).
    - عند الإغلاق، تُرسَّخ أرقام النظام/القناة/الفرق النهائية.
    """
    if reconciliation.status == ReconciliationStatus.RESOLVED:
        raise FinanceServiceError('التسوية مغلقة بالفعل ونهائية (لا تُعاد فتحها).')
    if str(user.id) == str(reconciliation.created_by_id):
        raise FinanceServiceError('لا يجوز للشخص ذاته إغلاق التسوية التي بناها (فصل الاختصاصات).')

    system_total_value = (Decimal(str(system_total))
                          if system_total is not None else reconciliation.system_total)
    channel_total_value = (Decimal(str(channel_total))
                           if channel_total is not None else reconciliation.channel_total)
    difference = system_total_value - channel_total_value
    status = (ReconciliationStatus.MATCHED if difference == 0
              else ReconciliationStatus.DISCREPANCY)

    old_status = reconciliation.status
    reconciliation.system_total = system_total_value
    reconciliation.channel_total = channel_total_value
    reconciliation.difference = difference
    reconciliation.status = status
    reconciliation.investigation_notes = investigation_notes or reconciliation.investigation_notes
    reconciliation.reconciled_by = user
    reconciliation.reconciled_at = timezone.now()
    reconciliation.save(update_fields=[
        'system_total', 'channel_total', 'difference', 'status',
        'investigation_notes', 'reconciled_by', 'reconciled_at', 'updated_at',
    ])
    audit(request, AuditAction.RECONCILE, 'Reconciliation', resource_id=str(reconciliation.id),
          field_name='status', old_value=old_status, new_value=status,
          event='seal_reconciliation', system_total=str(system_total_value),
          channel_total=str(channel_total_value), difference=str(difference))
    return reconciliation


@transaction.atomic
def resolve_reconciliation(reconciliation, user, system_total=None, channel_total=None,
                           investigation_notes='', request=None):
    """يحسم التسوية النهائي (RESOLVED) مع خلفية قرار صيانة/تحقيق.

    - يفرض زوج (قناة × إجمالي النظام) نهائي ويتكامل مع إغلاق الفروقات.
    - يفرض فصل الاختصاص: المعاين/المحصل لا يقرر الحسم.
    """
    if reconciliation.status == ReconciliationStatus.RESOLVED:
        raise FinanceServiceError('التسوية نهائية بالفعل.')
    if str(user.id) == str(reconciliation.created_by_id):
        raise FinanceServiceError('لا يجوز لمراجع هذه التسوية الحسم النهائي (فصل الاختصاص).')

    system_total_value = (Decimal(str(system_total))
                          if system_total is not None else reconciliation.system_total)
    channel_total_value = (Decimal(str(channel_total))
                           if channel_total is not None else reconciliation.channel_total)
    difference = system_total_value - channel_total_value

    reconciliation.system_total = system_total_value
    reconciliation.channel_total = channel_total_value
    reconciliation.difference = difference
    reconciliation.status = ReconciliationStatus.RESOLVED
    reconciliation.investigation_notes = investigation_notes or reconciliation.investigation_notes
    reconciliation.reconciled_by = user
    reconciliation.reconciled_at = timezone.now()
    reconciliation.save(update_fields=[
        'system_total', 'channel_total', 'difference', 'status',
        'investigation_notes', 'reconciled_by', 'reconciled_at', 'updated_at',
    ])
    audit(request, AuditAction.APPROVE, 'Reconciliation', resource_id=str(reconciliation.id),
          field_name='status', old_value=ReconciliationStatus.DISCREPANCY, new_value=ReconciliationStatus.RESOLVED,
          event='resolve_reconciliation', system_total=str(system_total_value),
          channel_total=str(channel_total_value), difference=str(difference))
    return reconciliation