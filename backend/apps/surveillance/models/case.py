import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class CaseClassification(models.TextChoices):
    SUSPECTED = 'SUSPECTED', _('مشتبه بها')
    PROBABLE = 'PROBABLE', _('محتملة')
    CONFIRMED = 'CONFIRMED', _('مؤكدة')
    NOT_A_CASE = 'NOT_A_CASE', _('منفية/مستبعدة')


class CaseWorkflowState(models.TextChoices):
    OPEN = 'OPEN', _('مفتوحة')
    UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', _('قيد التحقيق')
    AWAITING_LAB = 'AWAITING_LAB', _('بانتظار المختبر')
    CONFIRMED = 'CONFIRMED', _('مؤكدة')
    CLOSED = 'CLOSED', _('مغلقة')


class CaseStatus(models.TextChoices):
    UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', _('قيد التحقيق')
    ISOLATED = 'ISOLATED', _('معزولة')
    UNDER_TREATMENT = 'UNDER_TREATMENT', _('قيد العلاج')
    RECOVERED = 'RECOVERED', _('تعافت')
    DEAD = 'DEAD', _('متوفاة')
    LOST_FOLLOWUP = 'LOST_FOLLOWUP', _('فقد المتابعة')
    CLOSED = 'CLOSED', _('مغلقة')


class CaseSeverity(models.TextChoices):
    LOW = 'LOW', _('منخفضة')
    MODERATE = 'MODERATE', _('متوسطة')
    HIGH = 'HIGH', _('عالية')
    CRITICAL = 'CRITICAL', _('حرجة')


class CaseSource(models.TextChoices):
    SCREENING = 'SCREENING', _('فحص نقاط الدخول')
    LAB = 'LAB', _('مختبر')
    CLINIC = 'CLINIC', _('عيادة')
    EVENT = 'EVENT', _('حدث صحي')
    EBS = 'EBS', _('ترصد قائم على الأحداث')
    COMMUNITY = 'COMMUNITY', _('مجتمع')
    PUBLIC = 'PUBLIC', _('إبلاغ عام')
    MANUAL = 'MANUAL', _('إدخال يدوي')
    VECTOR = 'VECTOR', _('مكافحة النواقل')
    FOOD = 'FOOD', _('رقابة الأغذية')


class Sex(models.TextChoices):
    MALE = 'M', _('ذكر')
    FEMALE = 'F', _('أنثى')
    UNKNOWN = 'U', _('غير محدد')


class HealthCase(BaseModel):
    """سجل الحالة الموحّد للترصد الصحي الوطني."""

    case_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم الحالة')
    )
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('المرض'),
    )
    case_type = models.CharField(
        max_length=20,
        choices=CaseClassification.choices,
        default=CaseClassification.SUSPECTED,
        verbose_name=_('تصنيف الحالة'),
    )
    workflow_state = models.CharField(
        max_length=25,
        choices=CaseWorkflowState.choices,
        default=CaseWorkflowState.OPEN,
        verbose_name=_('حالة سير العمل'),
    )
    status = models.CharField(
        max_length=25,
        choices=CaseStatus.choices,
        default=CaseStatus.UNDER_INVESTIGATION,
        verbose_name=_('الحالة السريرية'),
    )
    severity = models.CharField(
        max_length=15,
        choices=CaseSeverity.choices,
        default=CaseSeverity.MODERATE,
        verbose_name=_('الخطورة'),
    )
    source = models.CharField(
        max_length=20,
        choices=CaseSource.choices,
        default=CaseSource.MANUAL,
        verbose_name=_('مصدر البلاغ'),
    )

    # بيانات الشخص
    traveler = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('المسافر'),
    )
    person_name = models.CharField(max_length=200, blank=True, verbose_name=_('اسم الشخص'))
    person_age = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_('العمر'))
    person_sex = models.CharField(
        max_length=1, choices=Sex.choices, default=Sex.UNKNOWN, verbose_name=_('الجنس')
    )
    nationality = models.CharField(max_length=120, blank=True, verbose_name=_('الجنسية'))
    occupation = models.CharField(max_length=120, blank=True, verbose_name=_('المهنة'))
    phone = models.CharField(max_length=30, blank=True, verbose_name=_('رقم الجوال'))
    passport_number = models.CharField(max_length=40, blank=True, verbose_name=_('رقم الجواز'))
    national_id = models.CharField(max_length=20, blank=True, verbose_name=_('الرقم الوطني'))
    health_file_number = models.CharField(max_length=50, blank=True, verbose_name=_('رقم الملف الصحي'))

    # الموقع
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('المنفذ'),
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('المحلية'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('الوحدة الصحية'),
    )

    # بيانات وبائية
    event = models.ForeignKey(
        'surveillance.HealthEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name=_('الحدث الصحي'),
    )
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name=_('التفشي'),
    )
    lab_result = models.ForeignKey(
        'laboratory.LabResult',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('نتيجة المختبر'),
    )
    case_definition = models.ForeignKey(
        'laboratory.DiseaseCaseDefinition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_cases',
        verbose_name=_('تعريف الحالة'),
    )

    # التواريخ
    onset_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ بدء الأعراض'))
    reported_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الإبلاغ'))
    confirmation_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ التأكيد'))
    closure_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الإغلاق'))

    # بيانات سريرية وبائية (JSON لل مرونة)
    symptoms = models.JSONField(default=list, blank=True, verbose_name=_('الأعراض'))
    risk_factors = models.JSONField(default=list, blank=True, verbose_name=_('عوامل الخطر'))
    exposure_history = models.TextField(blank=True, verbose_name=_('سجل التعرض'))
    clinical_notes = models.TextField(blank=True, verbose_name=_('ملاحظات سريرية'))
    epidemiological_notes = models.TextField(blank=True, verbose_name=_('ملاحظات وبائية'))

    # الإبلاغ
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_surveillance_cases',
        verbose_name=_('المُبلغ'),
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_surveillance_cases',
        verbose_name=_('مُسند إلى'),
    )

    class Meta:
        ordering = ['-reported_date', '-created_at']
        verbose_name = _('حالة ترصد')
        verbose_name_plural = _('حالات الترصد')
        indexes = [
            models.Index(fields=['case_number']),
            models.Index(fields=['disease', 'case_type']),
            models.Index(fields=['workflow_state', 'status']),
            models.Index(fields=['port', 'reported_date']),
            models.Index(fields=['sector', 'reported_date']),
            models.Index(fields=['outbreak']),
            models.Index(fields=['event']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f'{self.case_number} - {self.person_name or self.traveler or self.pk}'

    def save(self, *args, **kwargs):
        if not self.case_number:
            self.case_number = self.generate_case_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_case_number():
        """توليد رقم حالة: CS-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'CS-{year}'
        with transaction.atomic():
            last_case = HealthCase.objects.filter(case_number__startswith=prefix).order_by('-case_number').first()
            if last_case:
                try:
                    last_num = int(last_case.case_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('surveillance:case-detail', kwargs={'pk': self.pk})

    def transition_state(self, new_state: str, user, note: str = ''):
        """تغيير حالة سير العمل مع تسجيل التدقيق."""
        from apps.surveillance.services.workflows import CaseWorkflowService
        return CaseWorkflowService.transition(self, new_state, user, note)


class CaseSymptom(BaseModel):
    """أعراض الحالة - مفصلة لكل عرض."""

    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='case_symptoms', verbose_name=_('الحالة')
    )
    symptom_code = models.CharField(max_length=50, verbose_name=_('كود العرض'))
    symptom_name_ar = models.CharField(max_length=150, verbose_name=_('اسم العرض بالعربية'))
    symptom_name_en = models.CharField(max_length=150, blank=True, verbose_name=_('اسم العرض بالإنجليزية'))
    onset_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ بداية العرض'))
    severity = models.CharField(
        max_length=15,
        choices=CaseSeverity.choices,
        default=CaseSeverity.MODERATE,
        verbose_name=_('شدة العرض'),
    )
    is_primary = models.BooleanField(default=False, verbose_name=_('عرض رئيسي'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-is_primary', 'onset_date']
        verbose_name = _('عرض حالة')
        verbose_name_plural = _('أعراض الحالات')
        unique_together = ['case', 'symptom_code']

    def __str__(self):
        return f'{self.case.case_number} - {self.symptom_name_ar}'


class CaseExposure(BaseModel):
    """بيانات التعرض للحالة."""

    class ExposureType(models.TextChoices):
        CONTACT_CASE = 'CONTACT_CASE', _('مخالطة حالة')
        VECTOR = 'VECTOR', _('تعرض لناقل')
        FOOD = 'FOOD', _('تعرض غذائي')
        WATER = 'WATER', _('مصدر مياه')
        ANIMAL = 'ANIMAL', _('تعرض لحيوان')
        ENVIRONMENTAL = 'ENVIRONMENTAL', _('بيئي')
        HEALTHCARE = 'HEALTHCARE', _('رعاية صحية')
        LABORATORY = 'LABORATORY', _('مختبر')
        TRAVEL = 'TRAVEL', _('سفر')
        OTHER = 'OTHER', _('أخرى')

    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='case_exposures', verbose_name=_('الحالة')
    )
    exposure_type = models.CharField(
        max_length=20, choices=ExposureType.choices, verbose_name=_('نوع التعرض')
    )
    description = models.TextField(blank=True, verbose_name=_('الوصف'))
    location = models.CharField(max_length=200, blank=True, verbose_name=_('الموقع'))
    start_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ بداية التعرض'))
    end_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ نهاية التعرض'))
    details = models.JSONField(default=dict, blank=True, verbose_name=_('تفاصيل إضافية'))
    source_case = models.ForeignKey(
        HealthCase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exposed_cases',
        verbose_name=_('الحالة المصدرة'),
    )

    class Meta:
        ordering = ['-start_date']
        verbose_name = _('تعرض حالة')
        verbose_name_plural = _('تعرضات الحالات')

    def __str__(self):
        return f'{self.case.case_number} - {self.get_exposure_type_display()}'


class CaseTravelHistory(BaseModel):
    """تاريخ السفر للحالة."""

    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='travel_history', verbose_name=_('الحالة')
    )
    country = models.CharField(max_length=100, verbose_name=_('الدولة'))
    region = models.CharField(max_length=100, blank=True, verbose_name=_('المنطقة/المدينة'))
    arrival_date = models.DateField(verbose_name=_('تاريخ الوصول'))
    departure_date = models.DateField(null=True, blank=True, verbose_name=_('تاريخ المغادرة'))
    transport_mode = models.CharField(max_length=50, blank=True, verbose_name=_('وسيلة النقل'))
    flight_ship_number = models.CharField(max_length=50, blank=True, verbose_name=_('رقم الرحلة/السفينة'))
    port_of_entry = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='travel_history_cases',
        verbose_name=_('نقطة الدخول'),
    )
    purpose = models.CharField(max_length=100, blank=True, verbose_name=_('غرض السفر'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        ordering = ['-arrival_date']
        verbose_name = _('تاريخ سفر')
        verbose_name_plural = _('تاريخ السفر')

    def __str__(self):
        return f'{self.case.case_number} - {self.country} ({self.arrival_date})'


class CaseStatusLog(BaseModel):
    """أرشيف انتقالات نوع/حالة الحالة."""

    class Field(models.TextChoices):
        CASE_TYPE = 'case_type', _('نوع الحالة')
        WORKFLOW_STATE = 'workflow_state', _('حالة سير العمل')
        STATUS = 'status', _('الحالة السريرية')
        SEVERITY = 'severity', _('الخطورة')

    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='status_logs', verbose_name=_('الحالة')
    )
    field = models.CharField(max_length=20, choices=Field.choices, verbose_name=_('الحقل'))
    old_value = models.CharField(max_length=50, blank=True, verbose_name=_('القيمة السابقة'))
    new_value = models.CharField(max_length=50, verbose_name=_('القيمة الجديدة'))
    note = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_case_status_logs',
        verbose_name=_('من قبل'),
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت التغيير'))

    class Meta:
        ordering = ['-changed_at']
        verbose_name = _('سجل انتقال حالة')
        verbose_name_plural = _('سجلات انتقالات الحالات')

    def __str__(self):
        return f'{self.case.case_number} - {self.field}: {self.old_value} → {self.new_value}'