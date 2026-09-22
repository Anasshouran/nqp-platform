import hashlib
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def _current_year():
    return timezone.now().year


class ServiceType(models.TextChoices):
    QUARANTINE = 'QUARANTINE', 'رسوم الحجر الصحي'
    FOOD_CONTROL = 'FOOD_CONTROL', 'رقابة الأغذية'
    INSPECTION = 'INSPECTION', 'التفتيش'
    SAMPLING = 'SAMPLING', 'أخذ العينات'
    LAB = 'LAB', 'المختبر'
    CERTIFICATE = 'CERTIFICATE', 'الشهادات'
    PEST_CONTROL = 'PEST_CONTROL', 'مكافحة النواقل'
    OTHER = 'OTHER', 'خدمات أخرى'


class Currency(models.TextChoices):
    SDG = 'SDG', 'جنيه سوداني'
    USD = 'USD', 'دولار أمريكي'


class InvoiceSource(models.TextChoices):
    FOOD_SHIPMENT = 'FOOD_SHIPMENT', 'شحنة (رقابة أغذية)'
    LAB_SAMPLE = 'LAB_SAMPLE', 'عينة مختبر'
    MANUAL = 'MANUAL', 'عميل مباشر'


class InvoiceStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    ISSUED = 'ISSUED', 'صادرة'
    PENDING_PAYMENT = 'PENDING_PAYMENT', 'بانتظار الدفع'
    PARTIAL = 'PARTIAL', 'مسددة جزئياً'
    PAID = 'PAID', 'مدفوعة'
    RECONCILED = 'RECONCILED', 'تسويت'
    CANCELLED = 'CANCELLED', 'ملغاة'
    REFUNDED = 'REFUNDED', 'مسترَدّة'
    OVERDUE = 'OVERDUE', 'متأخرة'


class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'نقدي'
    BANK_CARD = 'BANK_CARD', 'شبكة بنكية'
    BANK_TRANSFER = 'BANK_TRANSFER', 'تحويل بنكي'
    ELECTRONIC = 'ELECTRONIC', 'إلكتروني'


class GatewayStatus(models.TextChoices):
    PENDING = 'PENDING', 'قيد الانتظار'
    CONFIRMED = 'CONFIRMED', 'مؤكد'
    FAILED = 'FAILED', 'فشل'


class ReconciliationChannel(models.TextChoices):
    PAYMENT_GATEWAY = 'PAYMENT_GATEWAY', 'بوابة الدفع'
    BANK = 'BANK', 'البنك'


class ReconciliationStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    MATCHED = 'MATCHED', 'مطابق'
    DISCREPANCY = 'DISCREPANCY', 'يوجد فرق'
    RESOLVED = 'RESOLVED', 'تم التسوية'


class RefundStatus(models.TextChoices):
    REQUESTED = 'REQUESTED', 'مطلوب'
    APPROVED = 'APPROVED', 'معتمد'
    EXECUTED = 'EXECUTED', 'منفذ'
    REJECTED = 'REJECTED', 'مرفوض'


class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'إنشاء'
    UPDATE = 'UPDATE', 'تعديل'
    APPROVE = 'APPROVE', 'اعتماد'
    CANCEL = 'CANCEL', 'إلغاء'
    REFUND = 'REFUND', 'استرداد'
    REVERSE = 'REVERSE', 'عكس'
    RECONCILE = 'RECONCILE', 'تسوية'
    EXEMPT = 'EXEMPT', 'إعفاء'
    MARK_PAID = 'MARK_PAID', 'تحصيل'


class Fee(BaseModel):
    """بند رسوم (Master Data) — يُعتمد بقرار/منشور مالي ولا يُحذف نهائياً."""

    code = models.CharField(max_length=64, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=250, verbose_name='الاسم بالعربية')
    service_type = models.CharField(
        max_length=20, choices=ServiceType.choices, verbose_name='نوع الخدمة'
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name='وحدة القياس')
    amount_sdg = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='القيمة (SDG)'
    )
    amount_usd = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='القيمة (USD)'
    )
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.SDG, verbose_name='العملة')
    effective_from = models.DateField(verbose_name='تاريخ السريان')
    effective_to = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    approved_by = models.CharField(
        max_length=150, null=True, blank=True, verbose_name='الجهة المعتمدة'
    )
    legal_reference = models.CharField(
        max_length=150, blank=True, verbose_name='المرجع القانوني'
    )
    year = models.PositiveIntegerField(default=_current_year, verbose_name='السنة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['year', 'service_type', 'code', 'id']
        verbose_name = 'بند رسوم'
        verbose_name_plural = 'بنود الرسوم (Master Data)'

    def __str__(self):
        return f'{self.name_ar} ({self.year})'


class Invoice(BaseModel):
    """فاتورة إلكترونية — دورة حياة كاملة وفق اللائحة (لا حذف نهائي)."""

    invoice_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الفاتورة')
    source_type = models.CharField(
        max_length=20, choices=InvoiceSource.choices, default=InvoiceSource.MANUAL, verbose_name='المصدر'
    )
    food_shipment = models.ForeignKey(
        'food_quarantine.FoodShipment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_invoices',
        verbose_name='الشحنة',
    )
    food_sample = models.ForeignKey(
        'food_quarantine.FoodSample',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_invoices',
        verbose_name='العينة',
    )
    request_ref = models.CharField(max_length=50, blank=True, verbose_name='رقم الطلب/المرجع')
    service_type = models.CharField(
        max_length=20, choices=ServiceType.choices, blank=True, verbose_name='نوع الخدمة'
    )
    applicant_name = models.CharField(max_length=150, blank=True, verbose_name='اسم مقدم الطلب')
    applicant_id_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الهوية')
    applicant_phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    items = models.JSONField(default=list, verbose_name='بنود الفاتورة')
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الإجمالي')
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='خصم')
    discount_reason = models.CharField(max_length=200, blank=True, verbose_name='سبب الخصم')
    net_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='الصافي')
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.SDG, verbose_name='العملة')
    status = models.CharField(
        max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT, verbose_name='الحالة'
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='finance_issued_invoices',
        verbose_name='المُصدر',
    )
    issued_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الإصدار')
    due_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستحقاق')
    receipt_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الإيصال')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_reviewed_invoices',
        verbose_name='المراجع المالي',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_reconciled_invoices',
        verbose_name='من قام بالتسوية',
    )
    reconciled_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التسوية')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'فاتورة'
        verbose_name_plural = 'الفواتير'

    def __str__(self):
        return self.invoice_number


class PaymentAttempt(BaseModel):
    """محاولة تحصيل — تحمل مرجعًا وحالة منبوذة لبوابة الدفع."""

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='payments', verbose_name='الفاتورة'
    )
    method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, verbose_name='طريقة الدفع'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='المبلغ')
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.SDG, verbose_name='العملة'
    )
    gateway_ref = models.CharField(max_length=100, blank=True, verbose_name='مرجع بوابة الدفع')
    gateway_status = models.CharField(
        max_length=20, choices=GatewayStatus.choices, default=GatewayStatus.PENDING, verbose_name='حالة البوابة'
    )
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_collected_payments',
        verbose_name='المحصل',
    )
    collected_at = models.DateTimeField(default=timezone.now, verbose_name='وقت التحصيل')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عملية دفع'
        verbose_name_plural = 'عمليات الدفع'

    def __str__(self):
        return f'{self.invoice.invoice_number} — {self.amount} {self.currency}'


class Receipt(BaseModel):
    """إيصال إلكتروني استناداً لعملية دفع موثقة."""

    receipt_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الإيصال')
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='receipts', verbose_name='الفاتورة'
    )
    payment = models.ForeignKey(
        PaymentAttempt, on_delete=models.PROTECT, related_name='receipts', verbose_name='عملية الدفع'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='المبلغ')
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.SDG, verbose_name='العملة'
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='finance_issued_receipts',
        verbose_name='المُصدر',
    )
    issued_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الإصدار')
    verification_code = models.CharField(max_length=64, blank=True, verbose_name='رمز التحقق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إيصال'
        verbose_name_plural = 'الإيصالات'

    def __str__(self):
        return self.receipt_number

    def save(self, *args, **kwargs):
        if not self.verification_code:
            seed = f'{self.receipt_number}|{self.amount}|{self.currency}'
            self.verification_code = hashlib.sha256(seed.encode()).hexdigest()
        super().save(*args, **kwargs)


class Cancellation(BaseModel):
    """إلغاء فاتورة — لا حذف، تُحوَّل الحالة إلى CANCELLED مع الاحتفاظ بالسجل."""

    invoice = models.OneToOneField(
        Invoice, on_delete=models.CASCADE, related_name='cancellation', verbose_name='الفاتورة'
    )
    reason = models.TextField(verbose_name='سبب الإلغاء')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='finance_cancellations_requested',
        verbose_name='طالب الإلغاء',
    )
    requested_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الطلب')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_cancellations_approved',
        verbose_name='الجهة المعتمدة',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إلغاء'
        verbose_name_plural = 'الإلغاءات'

    def __str__(self):
        return f'إلغاء {self.invoice.invoice_number}'


class Refund(BaseModel):
    invoice = models.OneToOneField(
        Invoice, on_delete=models.CASCADE, related_name='refund', verbose_name='الفاتورة'
    )
    reason = models.TextField(verbose_name='سبب الاسترداد')
    amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='المبلغ المسترَد')
    status = models.CharField(
        max_length=20, choices=RefundStatus.choices, default=RefundStatus.REQUESTED, verbose_name='الحالة'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='finance_refunds_requested',
        verbose_name='طالب الاسترداد',
    )
    requested_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الطلب')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_refunds_approved',
        verbose_name='الجهة المعتمدة',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')
    executed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التنفيذ')
    reversal_reference = models.CharField(max_length=100, blank=True, verbose_name='مرجع العكس')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'استرداد'
        verbose_name_plural = 'الاستردادات'

    def __str__(self):
        return f'استرداد {self.invoice.invoice_number}'


class Reconciliation(BaseModel):
    """مطابقة دورية: نظام NQP ↔ بوابة الدفع/البنك ↔ السجلات المحاسبية."""

    period_start = models.DateField(verbose_name='بداية الفترة')
    period_end = models.DateField(verbose_name='نهاية الفترة')
    channel = models.CharField(
        max_length=20, choices=ReconciliationChannel.choices, verbose_name='القناة'
    )
    system_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='إجمالي النظام')
    channel_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='إجمالي القناة')
    difference = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الفرق')
    status = models.CharField(
        max_length=20, choices=ReconciliationStatus.choices, default=ReconciliationStatus.DRAFT,
        verbose_name='الحالة',
    )
    matched_count = models.PositiveIntegerField(default=0, verbose_name='عدد المطابقات')
    discrepancy_count = models.PositiveIntegerField(default=0, verbose_name='عدد الفروقات')
    matches = models.JSONField(default=list, verbose_name='المدفوعات المطابقة')
    discrepancies = models.JSONField(default=list, verbose_name='الفروقات')
    investigation_notes = models.TextField(blank=True, verbose_name='ملاحظات التحقيق')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_created_reconciliations',
        verbose_name='من أنشأ التسوية',
    )
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_reconciliations',
        verbose_name='من قام بالتسوية',
    )
    reconciled_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التسوية')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تسوية'
        verbose_name_plural = 'التسويات والمطابقات'

    def __str__(self):
        return f'تسوية {self.period_start} → {self.period_end}'


class FinancialAuditLog(BaseModel):
    """سجل تدقيق مالي — كل عملية موثقة (من، الدور، ماذا، قبل/بعد، IP، التوقيت)."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_audit_logs',
        verbose_name='المستخدم',
    )
    actor_role = models.CharField(max_length=100, blank=True, verbose_name='الدور')
    action = models.CharField(max_length=20, choices=AuditAction.choices, verbose_name='الإجراء')
    resource_type = models.CharField(max_length=60, verbose_name='نوع المورد')
    resource_id = models.CharField(max_length=80, blank=True, verbose_name='معرف المورد')
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='الفاتورة',
    )
    invoice_ref = models.CharField(max_length=50, blank=True, verbose_name='مرجع الفاتورة')
    field_name = models.CharField(max_length=80, blank=True, verbose_name='الحقل')
    old_value = models.TextField(blank=True, verbose_name='القيمة قبل')
    new_value = models.TextField(blank=True, verbose_name='القيمة بعد')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='بيانات إضافية')
    occurred_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الحدث')

    class Meta:
        ordering = ['-occurred_at']
        verbose_name = 'سجل تدقيق مالي'
        verbose_name_plural = 'سجل التدقيق المالي (Audit Trail)'

    def __str__(self):
        return f'{self.actor} — {self.action} {self.resource_type}'