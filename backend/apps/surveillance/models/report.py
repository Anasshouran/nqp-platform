from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class ReportType(models.TextChoices):
    DAILY = 'DAILY', _('يومي')
    WEEKLY = 'WEEKLY', _('أسبوعي')
    MONTHLY = 'MONTHLY', _('شهري')
    OUTBREAK = 'OUTBREAK', _('تفشي')
    INVESTIGATION = 'INVESTIGATION', _('تحقيق')
    ANNUAL = 'ANNUAL', _('سنوي')
    ADHOC = 'ADHOC', _('خاص/طلب')


class ReportStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('مسودة')
    SUBMITTED = 'SUBMITTED', _('مقدم')
    UNDER_REVIEW = 'UNDER_REVIEW', _('قيد المراجعة')
    APPROVED = 'APPROVED', _('معتمد')
    PUBLISHED = 'PUBLISHED', _('منشور')
    REJECTED = 'REJECTED', _('مرفوض')


class ReportFrequency(models.TextChoices):
    DAILY = 'DAILY', _('يومي')
    WEEKLY = 'WEEKLY', _('أسبوعي')
    MONTHLY = 'MONTHLY', _('شهري')
    QUARTERLY = 'QUARTERLY', _('ربع سنوي')
    ANNUAL = 'ANNUAL', _('سنوي')


class BaseReport(BaseModel):
    """نموذج أساسي للتقارير."""

    report_number = models.CharField(max_length=30, unique=True, blank=True, verbose_name=_('رقم التقرير'))
    report_type = models.CharField(max_length=20, choices=ReportType.choices, verbose_name=_('نوع التقرير'))
    title = models.CharField(max_length=300, verbose_name=_('العنوان'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # الفترة
    period_start = models.DateField(verbose_name=_('بداية الفترة'))
    period_end = models.DateField(verbose_name=_('نهاية الفترة'))
    epidemiological_week = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_('الأسبوع الوبائي'))
    epidemiological_year = models.PositiveIntegerField(null=True, blank=True, verbose_name=_('السنة الوبائية'))

    # النطاق
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_surveillance_reports',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_surveillance_reports',
        verbose_name=_('المحلية'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_surveillance_reports',
        verbose_name=_('الوحدة الصحية'),
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_surveillance_reports',
        verbose_name=_('المنفذ'),
    )
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_reports',
        verbose_name=_('التفشي'),
    )
    investigation = models.ForeignKey(
        'surveillance.Investigation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_reports',
        verbose_name=_('التحقيق'),
    )

    # الحالة
    status = models.CharField(
        max_length=20, choices=ReportStatus.choices, default=ReportStatus.DRAFT, verbose_name=_('الحالة')
    )

    # الإعداد
    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_prepared_reports',
        verbose_name=_('أعده'),
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_reviewed_reports',
        verbose_name=_('راجعه'),
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_approved_reports',
        verbose_name=_('أعتمده'),
    )

    # التواريخ
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت التقديم'))
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت المراجعة'))
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الاعتماد'))
    published_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت النشر'))

    # المحتوى
    executive_summary = models.TextField(blank=True, verbose_name=_('الملخص التنفيذي'))
    key_findings = models.JSONField(default=list, blank=True, verbose_name=_('النتائج الرئيسية'))
    recommendations = models.JSONField(default=list, blank=True, verbose_name=_('التوصيات'))
    attachments = models.JSONField(default=list, blank=True, verbose_name=_('المرفقات'))

    # جودة البيانات
    data_quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name=_('درجة جودة البيانات %')
    )
    data_quality_issues = models.JSONField(default=list, blank=True, verbose_name=_('مشكلات جودة البيانات'))

    # مؤشرات
    indicators = models.JSONField(default=dict, blank=True, verbose_name=_('المؤشرات'))

    class Meta:
        abstract = True
        ordering = ['-period_end', '-created_at']

    def __str__(self):
        return f'{self.report_number} - {self.title}'

    def generate_report_number(self, prefix):
        """توليد رقم تقرير: DR-YYYY-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        base = f'{prefix}-{year}'
        model = self.__class__
        with transaction.atomic():
            last = model.objects.filter(report_number__startswith=base).order_by('-report_number').first()
            if last:
                try:
                    last_num = int(last.report_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{base}-{new_num:06d}'

    def submit(self, user):
        self.status = ReportStatus.SUBMITTED
        self.submitted_at = timezone.now()
        self.save(update_fields=['status', 'submitted_at'])

    def approve(self, user):
        self.status = ReportStatus.APPROVED
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_by', 'approved_at'])

    def publish(self, user):
        self.status = ReportStatus.PUBLISHED
        self.published_at = timezone.now()
        self.save(update_fields=['status', 'published_at'])

    def lines(self):
        """أسطر التقرير (عبر GenericForeignKey لأن التجريد لا يُنشئ جدولاً)."""
        content_type = ContentType.objects.get_for_model(self)
        return ReportLine.objects.filter(
            report_content_type=content_type, report_object_id=self.pk
        ).order_by('-created_at')


class DailySurveillanceReport(BaseReport):
    """التقرير اليومي للترصد."""

    class Meta:
        verbose_name = _('تقرير يومي')
        verbose_name_plural = _('التقارير اليومية')

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = self.generate_report_number('DR')
        self.report_type = ReportType.DAILY
        super().save(*args, **kwargs)


class WeeklySurveillanceReport(BaseReport):
    """التقرير الأسبوعي للترصد."""

    class Meta:
        verbose_name = _('تقرير أسبوعي')
        verbose_name_plural = _('التقارير الأسبوعية')

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = self.generate_report_number('WR')
        self.report_type = ReportType.WEEKLY
        super().save(*args, **kwargs)


class MonthlySurveillanceReport(BaseReport):
    """التقرير الشهري للترصد."""

    class Meta:
        verbose_name = _('تقرير شهري')
        verbose_name_plural = _('التقارير الشهرية')

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = self.generate_report_number('MR')
        self.report_type = ReportType.MONTHLY
        super().save(*args, **kwargs)


class OutbreakReport(BaseReport):
    """تقرير التفشي."""

    class ReportSubType(models.TextChoices):
        INITIAL = 'INITIAL', _('أولي')
        UPDATE = 'UPDATE', _('تحديث')
        FINAL = 'FINAL', _('نهائي')
        CLOSURE = 'CLOSURE', _('إغلاق')

    sub_type = models.CharField(
        max_length=15, choices=ReportSubType.choices, default=ReportSubType.INITIAL, verbose_name=_('النوع الفرعي')
    )
    situation_summary = models.TextField(blank=True, verbose_name=_('ملخص الموقف'))
    epidemiological_curve_data = models.JSONField(default=dict, blank=True, verbose_name=_('بيانات المنحنى الوبائي'))
    case_breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('توزيع الحالات'))
    response_summary = models.TextField(blank=True, verbose_name=_('ملخص الاستجابة'))
    laboratory_summary = models.TextField(blank=True, verbose_name=_('ملخص المختبر'))
    vector_control_summary = models.TextField(blank=True, verbose_name=_('ملخص مكافحة النواقل'))
    risk_assessment = models.TextField(blank=True, verbose_name=_('تقييم المخاطر'))
    next_steps = models.TextField(blank=True, verbose_name=_('الخطوات القادمة'))

    class Meta:
        verbose_name = _('تقرير تفشي')
        verbose_name_plural = _('تقارير التفشي')

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = self.generate_report_number('OBR')
        self.report_type = ReportType.OUTBREAK
        super().save(*args, **kwargs)


class InvestigationReport(BaseReport):
    """تقرير التحقيق."""

    class ReportSubType(models.TextChoices):
        PRELIMINARY = 'PRELIMINARY', _('مبدئي')
        INTERIM = 'INTERIM', _('مرحلي')
        FINAL = 'FINAL', _('نهائي')

    sub_type = models.CharField(
        max_length=15, choices=ReportSubType.choices, default=ReportSubType.PRELIMINARY, verbose_name=_('النوع الفرعي')
    )
    hypothesis = models.TextField(blank=True, verbose_name=_('الفرضية'))
    methodology = models.TextField(blank=True, verbose_name=_('المنهجية'))
    results = models.TextField(blank=True, verbose_name=_('النتائج'))
    discussion = models.TextField(blank=True, verbose_name=_('المناقشة'))
    conclusion = models.TextField(blank=True, verbose_name=_('الخلاصة'))
    references = models.TextField(blank=True, verbose_name=_('المراجع'))

    class Meta:
        verbose_name = _('تقرير تحقيق')
        verbose_name_plural = _('تقارير التحقيق')

    def save(self, *args, **kwargs):
        if not self.report_number:
            self.report_number = self.generate_report_number('INVR')
        self.report_type = ReportType.INVESTIGATION
        super().save(*args, **kwargs)


class ReportLine(BaseModel):
    """سطر في التقرير - عدّادات مرض/متلازمة."""

    report_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='+',
        verbose_name=_('نوع التقرير'),
    )
    report_object_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name=_('معرف التقرير'))
    report = GenericForeignKey('report_content_type', 'report_object_id')
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='report_lines',
        verbose_name=_('المرض'),
    )
    syndrome = models.CharField(max_length=100, blank=True, verbose_name=_('المتلازمة'))
    case_definition = models.ForeignKey(
        'laboratory.DiseaseCaseDefinition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='report_lines',
        verbose_name=_('تعريف الحالة'),
    )

    # العدّادات
    new_cases = models.PositiveIntegerField(default=0, verbose_name=_('حالات جديدة'))
    new_suspected = models.PositiveIntegerField(default=0, verbose_name=_('حالات مشتبهة جديدة'))
    new_probable = models.PositiveIntegerField(default=0, verbose_name=_('حالات محتملة جديدة'))
    new_confirmed = models.PositiveIntegerField(default=0, verbose_name=_('حالات مؤكدة جديدة'))
    deaths = models.PositiveIntegerField(default=0, verbose_name=_('الوفيات'))
    recovered = models.PositiveIntegerField(default=0, verbose_name=_('المتعافون'))
    contacts = models.PositiveIntegerField(default=0, verbose_name=_('المخالطون'))
    specimens_collected = models.PositiveIntegerField(default=0, verbose_name=_('العينات المجمعة'))
    specimens_tested = models.PositiveIntegerField(default=0, verbose_name=_('العينات المفحوصة'))
    specimens_positive = models.PositiveIntegerField(default=0, verbose_name=_('العينات الإيجابية'))

    # تفصيل ديموغرافي
    age_group_breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('التوزيع العمري'))
    sex_breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('التوزيع الجنسي'))
    nationality_breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('التوزيع حسب الجنسية'))

    # تفصيل جغرافي
    location_breakdown = models.JSONField(default=dict, blank=True, verbose_name=_('التوزيع الجغرافي'))

    # ملاحظات
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('سطر تقرير')
        verbose_name_plural = _('أسطر التقارير')
        unique_together = ['report_content_type', 'report_object_id', 'disease', 'syndrome']

    def __str__(self):
        disease_name = self.disease.name_ar if self.disease else self.syndrome
        report_label = self.report.report_number if self.report else '-'
        return f'{report_label} - {disease_name}'

    def total_cases(self):
        return self.new_suspected + self.new_probable + self.new_confirmed

    def positivity_rate(self):
        if self.specimens_tested > 0:
            return round((self.specimens_positive / self.specimens_tested) * 100, 2)
        return 0