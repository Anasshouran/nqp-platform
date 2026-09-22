from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class InvestigationStatus(models.TextChoices):
    OPEN = 'OPEN', _('مفتوح')
    IN_PROGRESS = 'IN_PROGRESS', _('قيد التنفيذ')
    COMPLETED = 'COMPLETED', _('مكتمل')
    CLOSED = 'CLOSED', _('مغلق')
    SUSPENDED = 'SUSPENDED', _('معلق')


class InvestigationPriority(models.TextChoices):
    LOW = 'LOW', _('منخفضة')
    MEDIUM = 'MEDIUM', _('متوسطة')
    HIGH = 'HIGH', _('عالية')
    URGENT = 'URGENT', _('عاجلة')


class InvestigationAxisType(models.TextChoices):
    DISEASE_HISTORY = 'DISEASE_HISTORY', _('تاريخ المرض')
    TRAVEL = 'TRAVEL', _('السفر')
    CONTACT = 'CONTACT', _('المخالطة')
    EXPOSURE = 'EXPOSURE', _('التعرض')
    ENVIRONMENT = 'ENVIRONMENT', _('البيئة')
    FOOD = 'FOOD', _('الغذاء')
    WATER = 'WATER', _('المياه')
    VECTOR = 'VECTOR', _('النواقل')
    LOCATIONS = 'LOCATIONS', _('أماكن الوجود')
    SOURCE = 'SOURCE', _('مصادر العدوى المحتملة')


class Investigation(BaseModel):
    """تحقيق وبائي مرتبط بحالة أو حدث."""

    investigation_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم التحقيق')
    )
    case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investigations',
        verbose_name=_('الحالة'),
    )
    event = models.ForeignKey(
        'surveillance.HealthEvent',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investigations',
        verbose_name=_('الحدث'),
    )
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investigations',
        verbose_name=_('التفشي'),
    )

    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    hypothesis = models.TextField(blank=True, verbose_name=_('الفرضية'))
    priority = models.CharField(
        max_length=10, choices=InvestigationPriority.choices, default=InvestigationPriority.MEDIUM,
        verbose_name=_('الأولوية')
    )

    # منهجية التحقيق
    method = models.JSONField(default=list, blank=True, verbose_name=_('المنهجية'))
    case_definition_used = models.ForeignKey(
        'laboratory.DiseaseCaseDefinition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('تعريف الحالة المستخدم'),
    )

    # النتائج
    findings = models.TextField(blank=True, verbose_name=_('النتائج'))
    source_of_infection = models.TextField(blank=True, verbose_name=_('مصدر العدوى المحتمل'))
    transmission_route = models.TextField(blank=True, verbose_name=_('طريقة الانتقال'))
    risk_assessment = models.TextField(blank=True, verbose_name=_('تقييم المخاطر'))

    # التوصيات والإجراءات
    recommendations = models.TextField(blank=True, verbose_name=_('التوصيات'))
    actions_taken = models.JSONField(default=list, blank=True, verbose_name=_('الإجراءات المتخذة'))
    prevention_measures = models.TextField(blank=True, verbose_name=_('إجراءات الوقاية'))

    # الفريق
    lead_investigator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_lead_investigations',
        verbose_name=_('رئيس التحقيق'),
    )
    team = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='nqp_surveillance_investigations', blank=True, verbose_name=_('الفريق')
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_investigations',
        verbose_name=_('المشرف'),
    )

    # الحالة والتواريخ
    status = models.CharField(
        max_length=20, choices=InvestigationStatus.choices, default=InvestigationStatus.OPEN,
        verbose_name=_('الحالة')
    )
    started_at = models.DateField(auto_now_add=True, verbose_name=_('تاريخ البدء'))
    completed_at = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الاكتمال'))
    closed_at = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الإغلاق'))

    # مستندات
    attachments = models.JSONField(default=list, blank=True, verbose_name=_('المرفقات'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-started_at']
        verbose_name = _('تحقيق وبائي')
        verbose_name_plural = _('التحقيقات الوبائية')
        indexes = [
            models.Index(fields=['investigation_number']),
            models.Index(fields=['case', 'status']),
            models.Index(fields=['event', 'status']),
            models.Index(fields=['outbreak', 'status']),
            models.Index(fields=['lead_investigator', 'status']),
            models.Index(fields=['status', 'started_at']),
        ]

    def __str__(self):
        return f'{self.investigation_number} - {self.title}'

    def save(self, *args, **kwargs):
        if not self.investigation_number:
            self.investigation_number = self.generate_investigation_number()
        if self.status in (InvestigationStatus.COMPLETED, InvestigationStatus.CLOSED) and not self.completed_at:
            self.completed_at = timezone.localdate()
        if self.status == InvestigationStatus.CLOSED and not self.closed_at:
            self.closed_at = timezone.localdate()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_investigation_number():
        """توليد رقم تحقيق: INV-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'INV-{year}'
        with transaction.atomic():
            last_inv = Investigation.objects.filter(investigation_number__startswith=prefix).order_by('-investigation_number').first()
            if last_inv:
                try:
                    last_num = int(last_inv.investigation_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'


class InvestigationAxis(BaseModel):
    """محور من محاور التحقيق (10 محاور قياسية)."""

    investigation = models.ForeignKey(
        Investigation, on_delete=models.CASCADE, related_name='axes', verbose_name=_('التحقيق')
    )
    axis_type = models.CharField(
        max_length=20, choices=InvestigationAxisType.choices, verbose_name=_('نوع المحور')
    )
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))
    findings = models.TextField(blank=True, verbose_name=_('النتائج'))
    evidence = models.JSONField(default=list, blank=True, verbose_name=_('الأدلة/المستندات'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('الترتيب'))
    is_completed = models.BooleanField(default=False, verbose_name=_('مكتمل'))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الاكتمال'))
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_investigation_axes',
        verbose_name=_('أكمله'),
    )

    class Meta:
        ordering = ['order', 'axis_type']
        verbose_name = _('محور تحقيق')
        verbose_name_plural = _('محاور التحقيق')
        unique_together = ['investigation', 'axis_type']

    def __str__(self):
        return f'{self.investigation.investigation_number} - {self.get_axis_type_display()}'

    def save(self, *args, **kwargs):
        if self.is_completed and not self.completed_at:
            self.completed_at = timezone.now()
            self.completed_by = self.completed_by or self.investigation.lead_investigator
        super().save(*args, **kwargs)


class InvestigationFinding(BaseModel):
    """نتيجة/اكتشاف محدد في التحقيق."""

    class FindingType(models.TextChoices):
        SOURCE_IDENTIFIED = 'SOURCE_IDENTIFIED', _('مصدر محدد')
        TRANSMISSION_CHAIN = 'TRANSMISSION_CHAIN', _('سلسلة انتقال')
        RISK_FACTOR = 'RISK_FACTOR', _('عامل خطر')
        CLUSTER = 'CLUSTER', _('تجمع')
        ANOMALY = 'ANOMALY', _('شذوذ')
        OTHER = 'OTHER', _('أخرى')

    investigation = models.ForeignKey(
        Investigation, on_delete=models.CASCADE, related_name='detailed_findings', verbose_name=_('التحقيق')
    )
    axis = models.ForeignKey(
        InvestigationAxis, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='axis_findings', verbose_name=_('المحور')
    )
    finding_type = models.CharField(
        max_length=20, choices=FindingType.choices, default=FindingType.OTHER, verbose_name=_('نوع الاكتشاف')
    )
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    description = models.TextField(verbose_name=_('الوصف'))
    evidence = models.JSONField(default=list, blank=True, verbose_name=_('الأدلة الداعمة'))
    confidence_level = models.CharField(
        max_length=20,
        choices=[
            ('LOW', _('منخفض')),
            ('MEDIUM', _('متوسط')),
            ('HIGH', _('عالي')),
            ('CONFIRMED', _('مؤكد')),
        ],
        default='MEDIUM',
        verbose_name=_('مستوى الثقة'),
    )
    related_cases = models.ManyToManyField(
        'surveillance.HealthCase', blank=True, related_name='investigation_findings',
        verbose_name=_('الحالات ذات الصلة')
    )
    related_contacts = models.ManyToManyField(
        'surveillance.ContactTrace', blank=True, related_name='investigation_findings',
        verbose_name=_('المخالطون ذوو الصلة')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_investigation_findings',
        verbose_name=_('سجل بواسطة'),
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('نتيجة تحقيق')
        verbose_name_plural = _('نتائج التحقيق')

    def __str__(self):
        return f'{self.investigation.investigation_number} - {self.title}'