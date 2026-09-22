from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class HealthEventType(models.TextChoices):
    CLUSTER = 'CLUSTER', _('تجمع حالات مرضية')
    UNUSUAL_DEATH = 'UNUSUAL_DEATH', _('وفاة غير معتادة')
    MASS_SYMPTOMS = 'MASS_SYMPTOMS', _('أعراض جماعية')
    FOOD_CONTAMINATION = 'FOOD_CONTAMINATION', _('حادث تلوث غذائي')
    WATER_CONTAMINATION = 'WATER_CONTAMINATION', _('حادث تلوث مياه')
    ANIMAL_DIE_OFF = 'ANIMAL_DIE_OFF', _('نفوق حيوانات غير معتاد')
    PORT_RISK = 'PORT_RISK', _('خطر صحي في منفذ')
    CHEMICAL_EXPOSURE = 'CHEMICAL_EXPOSURE', _('تعرض كيميائي')
    RADIATION_EXPOSURE = 'RADIATION_EXPOSURE', _('تعرض إشعاعي')
    VECTOR_SURGE = 'VECTOR_SURGE', _('ارتفاع نشاط نواقل')
    UNKNOWN_DISEASE = 'UNKNOWN_DISEASE', _('مرض غير معروف')
    HEALTHCARE_ASSOCIATED = 'HEALTHCARE_ASSOCIATED', _('عدوى مرتبطة بالرعاية الصحية')
    VACCINE_ADVERSE = 'VACCINE_ADVERSE', _('أثر عكسي للقاح')
    OTHER = 'OTHER', _('حدث صحي آخر')


class HealthEventStatus(models.TextChoices):
    REPORTED = 'REPORTED', _('مبلغ عنه')
    UNDER_VERIFICATION = 'UNDER_VERIFICATION', _('قيد التحقق')
    VERIFIED = 'VERIFIED', _('تم التحقق')
    INVESTIGATING = 'INVESTIGATING', _('قيد التحقيق')
    RESPONDING = 'RESPONDING', _('قيد الاستجابة')
    CLOSED = 'CLOSED', _('مغلق')
    FALSE_ALARM = 'FALSE_ALARM', _('إنذار كاذب')
    ESCALATED = 'ESCALATED', _('تم التصعيد لتفشي')


class EventSource(models.TextChoices):
    HEALTH_WORKER = 'HEALTH_WORKER', _('موظف صحي')
    COMMUNITY = 'COMMUNITY', _('مجتمع')
    SCHOOL = 'SCHOOL', _('مدرسة')
    INSTITUTION = 'INSTITUTION', _('مؤسسة')
    COMMUNITY_LEADER = 'COMMUNITY_LEADER', _('قائد مجتمع')
    HEALTH_FACILITY = 'HEALTH_FACILITY', _('مرفق صحي')
    PHONE_HOTLINE = 'PHONE_HOTLINE', _('خط ساخن')
    MEDIA = 'MEDIA', _('إعلام')
    SOCIAL_MEDIA = 'SOCIAL_MEDIA', _('تواصل اجتماعي')
    AFYATNA_APP = 'AFYATNA_APP', _('تطبيق عافيتنا')
    VECTOR_CONTROL = 'VECTOR_CONTROL', _('مكافحة النواقل')
    FOOD_SAFETY = 'FOOD_SAFETY', _('رقابة الأغذية')
    LABORATORY = 'LABORATORY', _('مختبر')
    PORT_HEALTH = 'PORT_HEALTH', _('صحة المنافذ')
    INTERNATIONAL = 'INTERNATIONAL', _('بلاغ دولي')
    OTHER = 'OTHER', _('أخرى')


class HealthEvent(BaseModel):
    """حدث صحي - ترصد قائم على الأحداث (Event-Based Surveillance - EBS)."""

    event_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم الحدث')
    )
    event_type = models.CharField(
        max_length=30, choices=HealthEventType.choices, verbose_name=_('نوع الحدث')
    )

    # الوصف
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    description = models.TextField(verbose_name=_('الوصف'))

    # الموقع
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_events',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_events',
        verbose_name=_('المحلية'),
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_events',
        verbose_name=_('المنفذ'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_events',
        verbose_name=_('الوحدة الصحية'),
    )
    specific_location = models.CharField(max_length=300, blank=True, verbose_name=_('الموقع المحدد'))
    gps_latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name=_('خط العرض')
    )
    gps_longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name=_('خط الطول')
    )

    # الحالات المتأثرة
    affected_count = models.PositiveIntegerField(default=0, verbose_name=_('عدد المتأثرين'))
    suspected_cases_count = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المشتبهة'))
    confirmed_cases_count = models.PositiveIntegerField(default=0, verbose_name=_('الحالات المؤكدة'))
    deaths_count = models.PositiveIntegerField(default=0, verbose_name=_('الوفيات'))

    # المرض المشتبه
    suspected_disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_events',
        verbose_name=_('المرض المشتبه'),
    )
    syndrome = models.CharField(max_length=100, blank=True, verbose_name=_('المتلازمة'))

    # المصدر
    source = models.CharField(max_length=25, choices=EventSource.choices, verbose_name=_('مصدر البلاغ'))
    source_details = models.TextField(blank=True, verbose_name=_('تفاصيل المصدر'))
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_health_events',
        verbose_name=_('المُبلغ'),
    )
    reporter_contact = models.CharField(max_length=200, blank=True, verbose_name=_('معلومات التواصل'))

    # التواريخ
    event_date = models.DateField(verbose_name=_('تاريخ الحدث'))
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت الإبلاغ'))
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت التحقق'))

    # الحالة
    status = models.CharField(
        max_length=25, choices=HealthEventStatus.choices, default=HealthEventStatus.REPORTED,
        verbose_name=_('الحالة')
    )
    priority = models.CharField(
        max_length=10,
        choices=[
            ('LOW', _('منخفضة')),
            ('MEDIUM', _('متوسطة')),
            ('HIGH', _('عالية')),
            ('URGENT', _('عاجلة')),
        ],
        default='MEDIUM',
        verbose_name=_('الأولوية'),
    )

    # التحقيق
    investigation = models.ForeignKey(
        'surveillance.Investigation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_events',
        verbose_name=_('التحقيق'),
    )

    # التفشي (إذا تم التصعيد)
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_events',
        verbose_name=_('التفشي'),
    )

    # المرفقات
    attachments = models.JSONField(default=list, blank=True, verbose_name=_('المرفقات'))
    images = models.JSONField(default=list, blank=True, verbose_name=_('الصور'))

    # تقييم المخاطر
    risk_assessment = models.JSONField(default=dict, blank=True, verbose_name=_('تقييم المخاطر'))
    public_health_risk = models.CharField(
        max_length=10,
        choices=[
            ('LOW', _('منخفض')),
            ('MODERATE', _('متوسط')),
            ('HIGH', _('عالي')),
            ('VERY_HIGH', _('عالٍ جداً')),
        ],
        default='MODERATE',
        verbose_name=_('خطر الصحة العامة'),
    )

    # ملاحظات
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    internal_notes = models.TextField(blank=True, verbose_name=_('ملاحظات داخلية'))

    class Meta:
        ordering = ['-reported_at']
        verbose_name = _('حدث صحي')
        verbose_name_plural = _('الأحداث الصحية')
        indexes = [
            models.Index(fields=['event_number']),
            models.Index(fields=['event_type', 'status']),
            models.Index(fields=['sector', 'status']),
            models.Index(fields=['status', 'reported_at']),
            models.Index(fields=['suspected_disease']),
            models.Index(fields=['priority', 'status']),
        ]

    def __str__(self):
        return f'{self.event_number} - {self.title}'

    def save(self, *args, **kwargs):
        if not self.event_number:
            self.event_number = self.generate_event_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_event_number():
        """توليد رقم حدث: EV-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'EV-{year}'
        with transaction.atomic():
            last_event = HealthEvent.objects.filter(event_number__startswith=prefix).order_by('-event_number').first()
            if last_event:
                try:
                    last_num = int(last_event.event_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def verify(self, user):
        """التحقق من الحدث."""
        self.status = HealthEventStatus.VERIFIED
        self.verified_at = timezone.now()
        self.save(update_fields=['status', 'verified_at'])

    def escalate_to_outbreak(self, user):
        """التصعيد لتفشي."""
        self.status = HealthEventStatus.ESCALATED
        self.save(update_fields=['status'])


class EventReport(BaseModel):
    """بلاغ/تقرير إضافي عن حدث."""

    class ReportType(models.TextChoices):
        INITIAL = 'INITIAL', _('بلاغ أولي')
        FOLLOW_UP = 'FOLLOW_UP', _('متابعة')
        LAB_RESULT = 'LAB_RESULT', _('نتيجة مختبر')
        SITUATION_UPDATE = 'SITUATION_UPDATE', _('تحديث موقف')
        CLOSURE = 'CLOSURE', _('إغلاق')

    event = models.ForeignKey(
        HealthEvent, on_delete=models.CASCADE, related_name='reports', verbose_name=_('الحدث')
    )
    report_type = models.CharField(
        max_length=20, choices=ReportType.choices, default=ReportType.FOLLOW_UP, verbose_name=_('نوع التقرير')
    )
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    content = models.TextField(verbose_name=_('المحتوى'))
    new_information = models.TextField(blank=True, verbose_name=_('معلومات جديدة'))
    cases_update = models.JSONField(default=dict, blank=True, verbose_name=_('تحديث الحالات'))
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='event_reports',
        verbose_name=_('المُبلغ'),
    )
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت الإبلاغ'))
    attachments = models.JSONField(default=list, blank=True, verbose_name=_('المرفقات'))

    class Meta:
        ordering = ['-reported_at']
        verbose_name = _('تقرير حدث')
        verbose_name_plural = _('تقارير الأحداث')

    def __str__(self):
        return f'{self.event.event_number} - {self.get_report_type_display()}'