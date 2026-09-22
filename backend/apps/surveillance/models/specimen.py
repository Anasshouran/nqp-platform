from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class SpecimenType(models.TextChoices):
    BLOOD = 'BLOOD', _('دم')
    SERUM = 'SERUM', _('مصل')
    PLASMA = 'PLASMA', _('بلازما')
    SWAB_NASOPHARYNGEAL = 'SWAB_NASOPHARYNGEAL', _('مسحة بلعومية أنفية')
    SWAB_OROPHARYNGEAL = 'SWAB_OROPHARYNGEAL', _('مسحة بلعومية فموية')
    SWAB_NASAL = 'SWAB_NASAL', _('مسحة أنفية')
    SWAB_RECTAL = 'SWAB_RECTAL', _('مسحة مستقيمية')
    SWAB_WOUND = 'SWAB_WOUND', _('مسحة جرح')
    URINE = 'URINE', _('بول')
    STOOL = 'STOOL', _('براز')
    SPUTUM = 'SPUTUM', _('بلغم')
    CSF = 'CSF', _('سائل دماغي شوكي')
    TISSUE = 'TISSUE', _('أنسجة')
    BONE_MARROW = 'BONE_MARROW', _('نخاع عظمي')
    OTHER = 'OTHER', _('أخرى')


class SpecimenStatus(models.TextChoices):
    ORDERED = 'ORDERED', _('مطلوبة')
    COLLECTED = 'COLLECTED', _('تم الجمع')
    IN_TRANSIT = 'IN_TRANSIT', _('قيد النقل')
    RECEIVED = 'RECEIVED', _('تم الاستلام')
    ACCEPTED = 'ACCEPTED', _('مقبولة')
    REJECTED = 'REJECTED', _('مرفوضة')
    PROCESSING = 'PROCESSING', _('قيد المعالجة')
    TESTED = 'TESTED', _('مفحوصة')
    RESULT_READY = 'RESULT_READY', _('النتيجة جاهزة')
    RESULT_REPORTED = 'RESULT_REPORTED', _('النتيجة مُبلغة')
    ARCHIVED = 'ARCHIVED', _('مؤرشفة')
    DISPOSED = 'DISPOSED', _('متخلص منها')


class SpecimenPriority(models.TextChoices):
    ROUTINE = 'ROUTINE', _('روتينية')
    URGENT = 'URGENT', _('عاجلة')
    STAT = 'STAT', _('فورية/طارئة')


class Specimen(BaseModel):
    """عينة مرتبطة بحالة ترصد."""

    specimen_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم العينة')
    )
    case = models.ForeignKey(
        'surveillance.HealthCase',
        on_delete=models.CASCADE,
        related_name='specimens',
        verbose_name=_('الحالة'),
    )
    investigation = models.ForeignKey(
        'surveillance.Investigation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        verbose_name=_('التحقيق'),
    )
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        verbose_name=_('التفشي'),
    )

    # نوع العينة
    specimen_type = models.CharField(
        max_length=30, choices=SpecimenType.choices, verbose_name=_('نوع العينة')
    )
    specimen_type_other = models.CharField(max_length=100, blank=True, verbose_name=_('نوع آخر'))

    # الجمع
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_specimens',
        verbose_name=_('جامع العينة'),
    )
    collected_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الجمع'))
    collection_method = models.CharField(max_length=200, blank=True, verbose_name=_('طريقة الجمع'))
    collection_site = models.CharField(max_length=200, blank=True, verbose_name=_('موقع الجمع'))
    volume_quantity = models.CharField(max_length=50, blank=True, verbose_name=_('الكمية/الحجم'))
    container_type = models.CharField(max_length=100, blank=True, verbose_name=_('نوع الحاوية'))
    transport_medium = models.CharField(max_length=100, blank=True, verbose_name=_('وسط النقل'))

    # الحالة
    status = models.CharField(
        max_length=20, choices=SpecimenStatus.choices, default=SpecimenStatus.ORDERED,
        verbose_name=_('الحالة')
    )
    priority = models.CharField(
        max_length=10, choices=SpecimenPriority.choices, default=SpecimenPriority.ROUTINE,
        verbose_name=_('الأولوية')
    )

    # المختبر
    laboratory = models.ForeignKey(
        'laboratory.Laboratory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_specimens',
        verbose_name=_('المختبر'),
    )
    lab_sample = models.ForeignKey(
        'laboratory.LabSample',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_specimens',
        verbose_name=_('عينة المختبر'),
    )

    # النقل
    shipped_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الإرسال'))
    shipped_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipped_specimens',
        verbose_name=_('أرسل بواسطة'),
    )
    received_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الاستلام'))
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_specimens',
        verbose_name=_('استلم بواسطة'),
    )
    rejection_reason = models.TextField(blank=True, verbose_name=_('سبب الرفض'))

    # النتيجة
    result_summary = models.TextField(blank=True, verbose_name=_('ملخص النتيجة'))
    result_reported_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت إبلاغ النتيجة'))
    result_reported_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_specimen_results',
        verbose_name=_('أبلغ لـ'),
    )

    # ملاحظات
    clinical_info = models.TextField(blank=True, verbose_name=_('معلومات سريرية'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-collected_at', '-created_at']
        verbose_name = _('عينة')
        verbose_name_plural = _('العينات')
        indexes = [
            models.Index(fields=['specimen_number']),
            models.Index(fields=['case', 'status']),
            models.Index(fields=['laboratory', 'status']),
            models.Index(fields=['status', 'collected_at']),
            models.Index(fields=['outbreak']),
        ]

    def __str__(self):
        return f'{self.specimen_number} - {self.get_specimen_type_display()}'

    def save(self, *args, **kwargs):
        if not self.specimen_number:
            self.specimen_number = self.generate_specimen_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_specimen_number():
        """توليد رقم عينة: SP-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'SP-{year}'
        with transaction.atomic():
            last_specimen = Specimen.objects.filter(specimen_number__startswith=prefix).order_by('-specimen_number').first()
            if last_specimen:
                try:
                    last_num = int(last_specimen.specimen_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def create_lab_sample(self, user=None):
        """إنشاء عينة مختبر مرتبطة (LabSample في تطبيق laboratory)."""
        if self.lab_sample:
            return self.lab_sample

        from apps.laboratory.models import LabSample, LabSection

        # تحديد القسم بناءً على نوع العينة
        section = None
        if self.specimen_type in [SpecimenType.SWAB_NASOPHARYNGEAL, SpecimenType.SWAB_OROPHARYNGEAL,
                                  SpecimenType.SWAB_NASAL, SpecimenType.SPUTUM]:
            section = LabSection.objects.filter(kind=LabSection.SectionKind.MICROBIOLOGY).first()
        elif self.specimen_type in [SpecimenType.BLOOD, SpecimenType.SERUM, SpecimenType.PLASMA]:
            section = LabSection.objects.filter(kind=LabSection.SectionKind.MICROBIOLOGY).first()

        lab_sample = LabSample.objects.create(
            sample_type=self._map_specimen_type_to_lab(),
            source=LabSample.Source.SURVEILLANCE,
            priority=self._map_priority_to_lab(),
            collector=user or self.collected_by,
            collected_at=self.collected_at or timezone.now(),
            sector=self.case.sector,
            entry_point=self.case.port,
            notes=self.clinical_info,
        )
        self.lab_sample = lab_sample
        self.status = SpecimenStatus.RECEIVED
        self.received_at = timezone.now()
        self.received_by = user
        self.save(update_fields=['lab_sample', 'status', 'received_at', 'received_by'])
        return lab_sample

    def _map_specimen_type_to_lab(self):
        mapping = {
            SpecimenType.BLOOD: 'BLOOD',
            SpecimenType.SERUM: 'BLOOD',
            SpecimenType.PLASMA: 'BLOOD',
            SpecimenType.SWAB_NASOPHARYNGEAL: 'SWAB',
            SpecimenType.SWAB_OROPHARYNGEAL: 'SWAB',
            SpecimenType.SWAB_NASAL: 'SWAB',
            SpecimenType.SWAB_RECTAL: 'SWAB',
            SpecimenType.SWAB_WOUND: 'SWAB',
            SpecimenType.URINE: 'URINE',
            SpecimenType.STOOL: 'STOOL',
            SpecimenType.SPUTUM: 'SWAB',
            SpecimenType.CSF: 'OTHER',
            SpecimenType.TISSUE: 'TISSUE',
            SpecimenType.BONE_MARROW: 'OTHER',
            SpecimenType.OTHER: 'OTHER',
        }
        return mapping.get(self.specimen_type, 'OTHER')

    def _map_priority_to_lab(self):
        mapping = {
            SpecimenPriority.ROUTINE: 'ROUTINE',
            SpecimenPriority.URGENT: 'HIGH',
            SpecimenPriority.STAT: 'URGENT',
        }
        return mapping.get(self.priority, 'ROUTINE')


class SpecimenMovement(BaseModel):
    """تتبع حركة العينة."""

    class Action(models.TextChoices):
        COLLECTED = 'COLLECTED', _('تم الجمع')
        PACKAGED = 'PACKAGED', _('تم التعبئة')
        SHIPPED = 'SHIPPED', _('تم الإرسال')
        IN_TRANSIT = 'IN_TRANSIT', _('قيد النقل')
        RECEIVED = 'RECEIVED', _('تم الاستلام')
        ACCEPTED = 'ACCEPTED', _('تم القبول')
        REJECTED = 'REJECTED', _('تم الرفض')
        ASSIGNED = 'ASSIGNED', _('تم التوزيع')
        PROCESSING = 'PROCESSING', _('قيد المعالجة')
        TESTED = 'TESTED', _('تم الفحص')
        RESULT_ENTERED = 'RESULT_ENTERED', _('تم إدخال النتيجة')
        RESULT_VERIFIED = 'RESULT_VERIFIED', _('تم التحقق من النتيجة')
        RESULT_REPORTED = 'RESULT_REPORTED', _('تم إبلاغ النتيجة')
        ARCHIVED = 'ARCHIVED', _('أُرشفت')
        DISPOSED = 'DISPOSED', _('تم التخلص')

    specimen = models.ForeignKey(
        Specimen, on_delete=models.CASCADE, related_name='movements', verbose_name=_('العينة')
    )
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name=_('الإجراء'))
    from_location = models.CharField(max_length=200, blank=True, verbose_name=_('من موقع'))
    to_location = models.CharField(max_length=200, blank=True, verbose_name=_('إلى موقع'))
    handler = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimen_movements',
        verbose_name=_('المسؤول'),
    )
    performed_at = models.DateTimeField(default=timezone.now, verbose_name=_('وقت الإجراء'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('بيانات إضافية'))

    class Meta:
        ordering = ['performed_at']
        verbose_name = _('حركة عينة')
        verbose_name_plural = _('حركات العينات')

    def __str__(self):
        return f'{self.specimen.specimen_number} - {self.get_action_display()}'


class SpecimenLabResult(BaseModel):
    """نتيجة فحص العينة في المختبر - ربط مع LabResult في تطبيق laboratory."""

    specimen = models.OneToOneField(
        Specimen, on_delete=models.CASCADE, related_name='lab_result_detail', verbose_name=_('العينة')
    )
    lab_result = models.OneToOneField(
        'laboratory.LabResult',
        on_delete=models.CASCADE,
        related_name='surveillance_specimen_result',
        null=True,
        blank=True,
        verbose_name=_('نتيجة المختبر'),
    )
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.PROTECT,
        related_name='specimen_lab_results',
        verbose_name=_('المرض'),
    )
    test_name = models.CharField(max_length=250, verbose_name=_('اسم الفحص'))
    test_method = models.CharField(max_length=250, blank=True, verbose_name=_('طريقة الفحص'))

    # النتيجة
    result_value = models.CharField(max_length=250, blank=True, verbose_name=_('قيمة النتيجة'))
    result_qualitative = models.CharField(
        max_length=20,
        choices=[
            ('POSITIVE', _('إيجابي')),
            ('NEGATIVE', _('سلبي')),
            ('INCONCLUSIVE', _('غير حاسم')),
            ('BORDERLINE', _('حدي')),
        ],
        verbose_name=_('النتيجة النوعية'),
    )
    reference_range = models.CharField(max_length=250, blank=True, verbose_name=_('المدى المرجعي'))
    unit = models.CharField(max_length=50, blank=True, verbose_name=_('الوحدة'))

    # التفسير
    interpretation = models.TextField(blank=True, verbose_name=_('التفسير'))
    clinical_significance = models.TextField(blank=True, verbose_name=_('الأهمية السريرية'))

    # الجودة
    is_critical = models.BooleanField(default=False, verbose_name=_('نتيجة حرجة'))
    critical_notified_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت إشعار الحرجة'))
    critical_notified_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='critical_specimen_results',
        verbose_name=_('أُبلغوا بالنتيجة الحرجة')
    )

    # التدقيق
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entered_specimen_results',
        verbose_name=_('المدخل'),
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_specimen_results',
        verbose_name=_('المحقق'),
    )
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت التحقق'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('نتيجة عينة مختبر')
        verbose_name_plural = _('نتائج العينات المختبرية')

    def __str__(self):
        return f'{self.specimen.specimen_number} - {self.test_name}: {self.result_qualitative}'

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            # تحديث حالة العينة
            self.specimen.status = SpecimenStatus.RESULT_READY
            self.specimen.result_summary = f'{self.test_name}: {self.result_qualitative}'
            self.specimen.save(update_fields=['status', 'result_summary'])

            # تحديث تصنيف الحالة إذا كانت إيجابية لمرض وبائي
            if self.result_qualitative == 'POSITIVE' and self.disease.is_public_health_emergency:
                from apps.surveillance.services.workflows import CaseWorkflowService
                CaseWorkflowService.on_critical_lab_result(self.specimen.case, self)