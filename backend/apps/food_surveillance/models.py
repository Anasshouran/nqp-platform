from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class RiskLevel(models.TextChoices):
    LOW = 'LOW', 'منخفض'
    MEDIUM = 'MEDIUM', 'متوسط'
    HIGH = 'HIGH', 'عالٍ'
    CRITICAL = 'CRITICAL', 'حرج'


class FoodAlert(BaseModel):
    """إنذار مبكر للسلامة الغذائية."""

    class AlertReason(models.TextChoices):
        REPEATED_NON_CONFORMITY = 'REPEATED_NON_CONFORMITY', 'تكرار عدم المطابقة'
        LAB_TREND = 'LAB_TREND', 'اتجاه مخبري'
        FOODBORNE_OUTBREAK = 'FOODBORNE_OUTBREAK', 'تفشٍ مرض منقول بالغذاء'
        IMPORT_RISK = 'IMPORT_RISK', 'مخاطر استيراد'
        EXPORT_REJECTION = 'EXPORT_REJECTION', 'رفض تصدير'
        RECALL = 'RECALL', 'سحب منتج'
        CUSTOM = 'CUSTOM', 'سبب مخصص'

    class AlertStatus(models.TextChoices):
        NEW = 'NEW', 'جديد'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'تم الاطلاع'
        INVESTIGATING = 'INVESTIGATING', 'قيد التحقيق'
        ACTIONED = 'ACTIONED', 'تم اتخاذ إجراء'
        CLOSED = 'CLOSED', 'مغلق'

    alert_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name='رقم الإنذار')
    title = models.CharField(max_length=200, verbose_name='العنوان')
    reason = models.CharField(max_length=30, choices=AlertReason.choices, verbose_name='السبب')
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.MEDIUM, verbose_name='مستوى الخطر')
    product = models.CharField(max_length=200, blank=True, verbose_name='المنتج')
    origin_country = models.CharField(max_length=100, blank=True, verbose_name='بلد المنشأ')
    supplier = models.CharField(max_length=255, blank=True, verbose_name='المورد')
    description = models.TextField(blank=True, verbose_name='الوصف')
    recommended_action = models.CharField(max_length=255, blank=True, verbose_name='الإجراء المقترح')
    status = models.CharField(
        max_length=20, choices=AlertStatus.choices, default=AlertStatus.NEW, verbose_name='الحالة'
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_alerts_raised',
        verbose_name='مُنشئ الإنذار',
    )
    raised_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإنشاء')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-raised_at']
        verbose_name = 'إنذار غذائي'
        verbose_name_plural = 'الإنذارات الغذائية'

    def __str__(self):
        return f'{self.alert_number or self.title} - {self.title}'

    def save(self, *args, **kwargs):
        if not self.alert_number:
            self.alert_number = f'SURV-ALERT-{self.pk}'
        super().save(*args, **kwargs)


class FoodEstablishment(BaseModel):
    """منشأة غذائية تدار ضمن الترصد (مطعم، مصنع، مخزن...)."""

    class EstablishmentType(models.TextChoices):
        RESTAURANT = 'RESTAURANT', 'مطعم'
        FACTORY = 'FACTORY', 'مصنع'
        WAREHOUSE = 'WAREHOUSE', 'مخزن'
        SUPPLIER = 'SUPPLIER', 'مورد'
        DISTRIBUTOR = 'DISTRIBUTOR', 'موزع'
        RETAILER = 'RETAILER', 'منفذ بيع'

    name_ar = models.CharField(max_length=255, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    establishment_type = models.CharField(
        max_length=20, choices=EstablishmentType.choices, verbose_name='النوع'
    )
    region = models.CharField(max_length=100, blank=True, verbose_name='المنطقة')
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_establishments',
        verbose_name='المنفذ المرتبط',
    )
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.LOW, verbose_name='مستوى المخاطر')
    last_inspection_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تفتيش')
    violations_count = models.PositiveIntegerField(default=0, verbose_name='عدد المخالفات')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'منشأة غذائية'
        verbose_name_plural = 'المنشآت الغذائية'

    def __str__(self):
        return self.name_ar


class RiskAssessment(BaseModel):
    """تقييم مخاطر موثق لكيان (منتج/دولة/مورد/شحنة/منشأة)."""

    class AssessmentType(models.TextChoices):
        PRODUCT = 'PRODUCT', 'منتج'
        COUNTRY = 'COUNTRY', 'دولة'
        SUPPLIER = 'SUPPLIER', 'مورد'
        SHIPMENT = 'SHIPMENT', 'شحنة'
        ESTABLISHMENT = 'ESTABLISHMENT', 'منشأة'

    assessment_type = models.CharField(max_length=20, choices=AssessmentType.choices, verbose_name='نوع التقييم')
    target_name = models.CharField(max_length=255, verbose_name='الكيان المستهدف')
    score = models.PositiveSmallIntegerField(default=0, verbose_name='النتيجة 0-100')
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.LOW, verbose_name='مستوى المخاطر')
    justification = models.TextField(blank=True, verbose_name='التبرير')
    recommendation = models.TextField(blank=True, verbose_name='التوصية')
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_risk_assessments',
        verbose_name='المُقيّم',
    )
    assessed_at = models.DateTimeField(default=timezone.now, verbose_name='تاريخ التقييم')

    class Meta:
        ordering = ['-assessed_at']
        verbose_name = 'تقييم مخاطر غذائية'
        verbose_name_plural = 'تقييمات المخاطر الغذائية'

    def __str__(self):
        return f'{self.get_assessment_type_display()} - {self.target_name} ({self.score})'


class NonConformity(BaseModel):
    """إدارة عدم المطابقة الغذائية."""

    class NonConformityStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'قيد التحقيق'
        CORRECTIVE_ACTION = 'CORRECTIVE_ACTION', 'إجراء تصحيحي'
        RESOLVED = 'RESOLVED', 'تم الحل'
        CLOSED = 'CLOSED', 'مغلقة'

    class NonConformitySource(models.TextChoices):
        LAB = 'LAB', 'مختبر'
        IMPORT = 'IMPORT', 'استيراد'
        EXPORT = 'EXPORT', 'تصدير'
        ESTABLISHMENT = 'ESTABLISHMENT', 'منشأة'
        SURVEILLANCE = 'SURVEILLANCE', 'ترصد'

    nc_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name='رقم عدم المطابقة')
    shipment = models.ForeignKey(
        'food_quarantine.FoodShipment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='non_conformities',
        verbose_name='الشحنة',
    )
    sample = models.ForeignKey(
        'food_quarantine.FoodSample',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='non_conformities',
        verbose_name='العينة',
    )
    source = models.CharField(max_length=20, choices=NonConformitySource.choices, default=NonConformitySource.LAB, verbose_name='المصدر')
    product = models.CharField(max_length=200, blank=True, verbose_name='المنتج')
    origin_country = models.CharField(max_length=100, blank=True, verbose_name='بلد المنشأ')
    supplier = models.CharField(max_length=255, blank=True, verbose_name='المورد')
    status = models.CharField(
        max_length=25, choices=NonConformityStatus.choices, default=NonConformityStatus.OPEN, verbose_name='الحالة'
    )
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.MEDIUM, verbose_name='مستوى المخاطر')
    description = models.TextField(blank=True, verbose_name='الوصف')
    required_action = models.TextField(blank=True, verbose_name='الإجراء المطلوب')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_non_conformities',
        verbose_name='المُبلّغ',
    )
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت البلاغ')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'عدم مطابقة غذائية'
        verbose_name_plural = 'حالات عدم المطابقة الغذائية'

    def __str__(self):
        return f'{self.nc_number} - {self.product or "غير محدد"}'

    def save(self, *args, **kwargs):
        if not self.nc_number:
            self.nc_number = f'NC-{self.pk}'
        super().save(*args, **kwargs)


class CorrectiveAction(BaseModel):
    class CorrectiveActionStatus(models.TextChoices):
        PLANNED = 'PLANNED', 'مخطط'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        VERIFIED = 'VERIFIED', 'تم التحقق'
        COMPLETED = 'COMPLETED', 'مكتمل'

    non_conformity = models.ForeignKey(
        NonConformity, on_delete=models.CASCADE, related_name='corrective_actions', verbose_name='عدم المطابقة'
    )
    action = models.TextField(verbose_name='الإجراء')
    responsible = models.CharField(max_length=255, blank=True, verbose_name='المسؤول')
    due_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستحقاق')
    status = models.CharField(
        max_length=20, choices=CorrectiveActionStatus.choices, default=CorrectiveActionStatus.PLANNED, verbose_name='الحالة'
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإنجاز')
    by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_corrective_actions',
        verbose_name='المنفذ',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إجراء تصحيحي'
        verbose_name_plural = 'الإجراءات التصحيحية'

    def __str__(self):
        return f'{self.non_conformity.nc_number} - {self.action[:50]}'


class FoodRecall(BaseModel):
    class RecallStatus(models.TextChoices):
        DECIDED = 'DECIDED', 'قرار'
        NOTIFYING = 'NOTIFYING', 'إخطار الجهات'
        WITHDRAWING = 'WITHDRAWING', 'سحب المنتج'
        VERIFYING = 'VERIFYING', 'تحقق من السحب'
        CLOSED = 'CLOSED', 'مغلق'

    class RecallType(models.TextChoices):
        WITHDRAWAL = 'WITHDRAWAL', 'سحب احترازي'
        RECALL = 'RECALL', 'استدعاء'

    recall_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name='رقم السحب')
    product = models.CharField(max_length=200, verbose_name='المنتج')
    origin_country = models.CharField(max_length=100, blank=True, verbose_name='بلد المنشأ')
    recall_type = models.CharField(max_length=20, choices=RecallType.choices, default=RecallType.RECALL, verbose_name='نوع السحب')
    reasons = models.TextField(blank=True, verbose_name='الأسباب')
    status = models.CharField(max_length=20, choices=RecallStatus.choices, default=RecallStatus.DECIDED, verbose_name='الحالة')
    risk_level = models.CharField(max_length=20, choices=RiskLevel.choices, default=RiskLevel.HIGH, verbose_name='مستوى المخاطر')
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_recalls',
        verbose_name='مُصدر القرار',
    )
    decided_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت القرار')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سحب منتج غذائي'
        verbose_name_plural = 'سحبات المنتجات الغذائية'

    def __str__(self):
        return f'{self.recall_number} - {self.product}'

    def save(self, *args, **kwargs):
        if not self.recall_number:
            self.recall_number = f'RCL-{self.pk}'
        super().save(*args, **kwargs)