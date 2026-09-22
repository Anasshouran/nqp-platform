import uuid
from django.conf import settings
from django.db import models
from core.models import BaseModel
from apps.masterdata.models import EntryPoint


class ServiceWindow(BaseModel):
    """نافذة خدمة — نقطة خدمة في المنفذ."""

    class WindowType(models.TextChoices):
        SINGLE = 'SINGLE', 'نافذة واحدة'
        MULTI = 'MULTI', 'عدة نوافذ'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='اسم النافذة بالعربية')
    station = models.ForeignKey(
        EntryPoint, on_delete=models.CASCADE, related_name='service_windows', verbose_name='المنفذ',
    )
    window_type = models.CharField(
        max_length=10, choices=WindowType.choices, default=WindowType.SINGLE, verbose_name='نوع النافذة',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'نافذة خدمة'
        verbose_name_plural = 'نوافذ الخدمة'

    def __str__(self):
        return f'{self.name_ar} ({self.station})'


class WindowCommodity(BaseModel):
    """سلعة مدعومة داخل نافذة خدمة."""

    window = models.ForeignKey(
        ServiceWindow, on_delete=models.CASCADE, related_name='commodities', verbose_name='النافذة',
    )
    code = models.CharField(max_length=40, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'سلعة النافذة'
        verbose_name_plural = 'سلع النوافذ'

    def __str__(self):
        return self.name_ar


class ShipmentTransaction(BaseModel):
    """معاملة شحنة داخل نافذة خدمة."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد المعالجة'
        CLOSED = 'CLOSED', 'مغلقة'

    shipment = models.ForeignKey(
        'food_quarantine.FoodShipment', on_delete=models.CASCADE,
        related_name='window_transactions', verbose_name='الشحنة',
    )
    window = models.ForeignKey(
        ServiceWindow, on_delete=models.CASCADE,
        related_name='transactions', verbose_name='النافذة',
    )
    commodity = models.ForeignKey(
        WindowCommodity, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transactions', verbose_name='السلعة',
    )
    clerk = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='window_clerk_transactions', verbose_name='موظّف النافذة',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة',
    )
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التسجيل')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-assigned_at']
        verbose_name = 'معاملة شحنة'
        verbose_name_plural = 'معاملات الشحنات'

    def __str__(self):
        return f'{self.window} — {self.shipment}'


class TransactionCommodity(BaseModel):
    """بند سلعة داخل معاملة شحنة."""

    transaction = models.ForeignKey(
        ShipmentTransaction, on_delete=models.CASCADE,
        related_name='commodity_lines', verbose_name='المعاملة',
    )
    commodity = models.ForeignKey(
        WindowCommodity, on_delete=models.CASCADE,
        related_name='transaction_lines', verbose_name='السلعة',
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='الكمية')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    decision = models.CharField(max_length=20, blank=True, verbose_name='القرار')
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت القرار')

    class Meta:
        ordering = ['commodity__order']
        verbose_name = 'بند معاملة'
        verbose_name_plural = 'بنود المعاملات'

    def __str__(self):
        return f'{self.commodity} × {self.quantity}'


class CommodityDecision(BaseModel):
    """قرار صادر عن النافذة على بند سلعة."""

    class DecisionType(models.TextChoices):
        APPROVED = 'APPROVED', 'مطابق'
        REJECTED = 'REJECTED', 'مرفوض'
        HOLD = 'HOLD', 'موقوف'

    line = models.ForeignKey(
        TransactionCommodity, on_delete=models.CASCADE,
        related_name='decisions', verbose_name='بند السلعة',
    )
    decision = models.CharField(max_length=20, choices=DecisionType.choices, verbose_name='القرار')
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='commodity_decisions', verbose_name='مُصدر القرار',
    )
    decided_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت القرار')
    reason = models.TextField(blank=True, verbose_name='السبب')

    class Meta:
        ordering = ['-decided_at']
        verbose_name = 'قرار سلعة'
        verbose_name_plural = 'قرارات السلع'

    def __str__(self):
        return f'{self.line} → {self.decision}'


class WindowAssignment(BaseModel):
    """تعيين موظّف على نافذة مع scope سلعي."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='window_assignments', verbose_name='المستخدم',
    )
    window = models.ForeignKey(
        ServiceWindow, on_delete=models.CASCADE,
        related_name='assignments', verbose_name='النافذة',
    )
    commodities = models.ManyToManyField(
        WindowCommodity, blank=True, related_name='assignments', verbose_name='السلع المدعومة',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التعيين')

    class Meta:
        ordering = ['-assigned_at']
        verbose_name = 'تعيين نافذة'
        verbose_name_plural = 'تعيينات النوافذ'

    def __str__(self):
        return f'{self.user} → {self.window}'


class WindowAuditLog(BaseModel):
    """سجل تدقيق لحركات النافذة."""

    window = models.ForeignKey(
        ServiceWindow, on_delete=models.CASCADE,
        related_name='audit_logs', verbose_name='النافذة',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='window_audit_logs', verbose_name='المستخدم',
    )
    action = models.CharField(max_length=60, verbose_name='الإجراء')
    detail = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='الوقت')

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'سجل تدقيق النافذة'
        verbose_name_plural = 'سجلات تدقيق النوافذ'

    def __str__(self):
        return f'{self.window} — {self.action}'
