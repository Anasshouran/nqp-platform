from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class VectorSurveillanceLinkStatus(models.TextChoices):
    PENDING = 'PENDING', _('معلق')
    UNDER_REVIEW = 'UNDER_REVIEW', _('قيد المراجعة')
    CONFIRMED_LINK = 'CONFIRMED_LINK', _('رابط مؤكد')
    REJECTED = 'REJECTED', _('مرفوض')
    MONITORING = 'MONITORING', _('تحت المراقبة')


class VectorSurveillanceLink(BaseModel):
    """ربط بين الترصد الوبائي ومكافحة النواقل - جوهر التكامل."""

    # الطرفان
    health_case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='vector_links',
        verbose_name=_('الحالة الصحية'),
    )
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='vector_links',
        verbose_name=_('التفشي'),
    )
    health_event = models.ForeignKey(
        'surveillance.HealthEvent',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='vector_links',
        verbose_name=_('الحدث الصحي'),
    )

    vector_focus = models.ForeignKey(
        'vector_control.VectorFocus',
        on_delete=models.CASCADE,
        related_name='surveillance_links',
        verbose_name=_('بؤرة الناقل'),
    )
    vector_survey = models.ForeignKey(
        'vector_control.VectorSurvey',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_links',
        verbose_name=_('مسح النواقل'),
    )
    vector_sample = models.ForeignKey(
        'vector_control.VectorSample',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_links',
        verbose_name=_('عينة الناقل'),
    )
    vector_lab_result = models.ForeignKey(
        'vector_control.VectorLabResult',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_links',
        verbose_name=_('نتيجة مختبر الناقل'),
    )

    # نوع الربط
    link_type = models.CharField(
        max_length=20,
        choices=[
            ('CASE_FOCUS', _('حالة - بؤرة')),
            ('OUTBREAK_FOCUS', _('تفشي - بؤرة')),
            ('EVENT_FOCUS', _('حدث - بؤرة')),
            ('CASE_SURVEY', _('حالة - مسح')),
            ('OUTBREAK_SURVEY', _('تفشي - مسح')),
            ('SAMPLE_MATCH', _('مطابقة عينة')),
            ('SPATIAL_TEMPORAL', _('مكاني/زماني')),
        ],
        verbose_name=_('نوع الربط'),
    )

    # التحليل
    distance_km = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, verbose_name=_('المسافة (كم)')
    )
    temporal_gap_days = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_('الفجوة الزمنية (أيام)')
    )
    spatial_overlap = models.BooleanField(default=False, verbose_name=_('تداخل مكاني'))
    vector_species_match = models.BooleanField(default=False, verbose_name=_('مطابقة نوع الناقل'))
    pathogen_detected_in_vector = models.BooleanField(default=False, verbose_name=_('ممرض مكتشف بالناقل'))

    # تقييم الارتباط
    association_strength = models.CharField(
        max_length=15,
        choices=[
            ('STRONG', _('قوي')),
            ('MODERATE', _('متوسط')),
            ('WEAK', _('ضعيف')),
            ('UNLIKELY', _('غير محتمل')),
        ],
        default='MODERATE',
        verbose_name=_('قوة الارتباط'),
    )
    status = models.CharField(
        max_length=20, choices=VectorSurveillanceLinkStatus.choices,
        default=VectorSurveillanceLinkStatus.PENDING, verbose_name=_('الحالة')
    )

    # الملاحظات
    epidemiological_notes = models.TextField(blank=True, verbose_name=_('ملاحظات وبائية'))
    entomological_notes = models.TextField(blank=True, verbose_name=_('ملاحظات حشرية'))
    lab_notes = models.TextField(blank=True, verbose_name=_('ملاحظات مختبر'))

    # المسؤولون
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_vector_links',
        verbose_name=_('أنشأه'),
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_vector_links',
        verbose_name=_('راجعه'),
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت المراجعة'))

    # الإجراءات المقترحة
    recommended_actions = models.JSONField(default=list, blank=True, verbose_name=_('الإجراءات المقترحة'))
    actions_taken = models.JSONField(default=list, blank=True, verbose_name=_('الإجراءات المتخذة'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('رابط ترصد-نواقل')
        verbose_name_plural = _('روابط ترصد-النواقل')
        indexes = [
            models.Index(fields=['health_case', 'vector_focus']),
            models.Index(fields=['outbreak', 'vector_focus']),
            models.Index(fields=['status', 'association_strength']),
            models.Index(fields=['vector_focus', 'link_type']),
        ]
        unique_together = [
            ['health_case', 'vector_focus', 'link_type'],
            ['outbreak', 'vector_focus', 'link_type'],
            ['health_event', 'vector_focus', 'link_type'],
        ]

    def __str__(self):
        if self.health_case:
            return f'{self.health_case.case_number} ↔ {self.vector_focus.focus_number}'
        elif self.outbreak:
            return f'{self.outbreak.outbreak_number} ↔ {self.vector_focus.focus_number}'
        elif self.health_event:
            return f'{self.health_event.event_number} ↔ {self.vector_focus.focus_number}'
        return f'Link {self.pk}'

    def confirm_link(self, user, strength='MODERATE', notes=''):
        """تأكيد الرابط."""
        self.status = VectorSurveillanceLinkStatus.CONFIRMED_LINK
        self.association_strength = strength
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        if notes:
            self.epidemiological_notes = notes
        self.save(update_fields=['status', 'association_strength', 'reviewed_by', 'reviewed_at', 'epidemiological_notes'])

    def reject_link(self, user, reason=''):
        """رفض الرابط."""
        self.status = VectorSurveillanceLinkStatus.REJECTED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        if reason:
            self.epidemiological_notes = reason
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'epidemiological_notes'])


class VectorAlertRule(BaseModel):
    """قواعد إنذار متقاطعة: ترصد + نواقل."""

    name = models.CharField(max_length=200, verbose_name=_('اسم القاعدة'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # شروط الترصد
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vector_alert_rules',
        verbose_name=_('المرض'),
    )
    syndrome = models.CharField(max_length=100, blank=True, verbose_name=_('المتلازمة'))
    case_threshold = models.PositiveIntegerField(default=1, verbose_name=_('عتبة الحالات'))
    case_window_days = models.PositiveIntegerField(default=7, verbose_name=_('نافذة الحالات (أيام)'))

    # شروط النواقل
    vector_type = models.ForeignKey(
        'vector_control.VectorRegistry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alert_rules',
        verbose_name=_('نوع الناقل'),
    )
    vector_index_threshold = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, verbose_name=_('عتبة مؤشر الناقل')
    )
    focus_severity = models.CharField(
        max_length=10,
        choices=[
            ('LOW', _('منخفض')),
            ('MEDIUM', _('متوسط')),
            ('HIGH', _('عالي')),
            ('CRITICAL', _('حرج')),
        ],
        blank=True,
        verbose_name=_('خطورة البؤرة'),
    )
    focus_window_days = models.PositiveIntegerField(default=14, verbose_name=_('نافذة البؤر (أيام)'))

    # الشروط المكانية
    spatial_radius_km = models.DecimalField(
        max_digits=8, decimal_places=2, default=5.0, verbose_name=_('نصف القطر المكاني (كم)')
    )

    # الإنذار المولد
    alert_type = models.CharField(
        max_length=25,
        choices=[
            ('VECTOR_SURGE', _('ارتفاع نواقل')),
            ('THRESHOLD_BREACH', _('تجاوز عتبة')),
        ],
        default='VECTOR_SURGE',
        verbose_name=_('نوع الإنذار'),
    )
    alert_level = models.CharField(
        max_length=10,
        choices=[
            ('LEVEL_1', _('مستوى 1')),
            ('LEVEL_2', _('مستوى 2')),
            ('LEVEL_3', _('مستوى 3')),
        ],
        default='LEVEL_1',
        verbose_name=_('مستوى الإنذار'),
    )

    # الإشعارات
    notify_roles = models.JSONField(default=list, blank=True, verbose_name=_('أدوار الإشعار'))

    # الحالة
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))
    last_evaluated = models.DateTimeField(null=True, blank=True, verbose_name=_('آخر تقييم'))
    trigger_count = models.PositiveIntegerField(default=0, verbose_name=_('عدد التفعيلات'))

    class Meta:
        verbose_name = _('قاعدة إنذار متقاطعة')
        verbose_name_plural = _('قواعد الإنذار المتقاطعة')

    def __str__(self):
        return self.name