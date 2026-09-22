import uuid

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from core.models import BaseModel


LAB_ROLE_CODES = [
    'LAB_DIRECTOR',
    'LAB_MANAGER',
    'LAB_TECHNICIAN',
    'LAB_RECEPTIONIST',
    'LAB_COORDINATOR',
]


class Disease(BaseModel):
    class IhrCategory(models.TextChoices):
        PHEIC = 'PHEIC', 'حالة طوارئ صحية عامة'
        TARGETED_ERADICATION = 'TARGETED_ERADICATION', 'استئصال مستهدف'
        SURVEILLANCE_ONLY = 'SURVEILLANCE_ONLY', 'ترصد فقط'
        NOT_IHR = 'NOT_IHR', 'غير مدرج'

    icd_11_code = models.CharField(max_length=20, unique=True, verbose_name='كود ICD-11')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, verbose_name='الاسم بالإنجليزية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    incubation_period_min = models.IntegerField(null=True, blank=True, verbose_name='فترة الحضانة الدنيا')
    incubation_period_max = models.IntegerField(null=True, blank=True, verbose_name='فترة الحضانة القصوى')
    transmission_methods = models.JSONField(default=list, blank=True, verbose_name='طرق الانتقال')
    is_public_health_emergency = models.BooleanField(default=False, verbose_name='طوارئ صحية عامة')
    ihr_category = models.CharField(
        max_length=30, choices=IhrCategory.choices, default=IhrCategory.NOT_IHR, verbose_name='فئة IHR'
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['icd_11_code']
        verbose_name = 'مرض'
        verbose_name_plural = 'الأمراض'

    def __str__(self):
        return f'{self.icd_11_code} - {self.name_ar}'


class DiseaseCaseDefinition(BaseModel):
    class CaseType(models.TextChoices):
        SUSPECTED = 'SUSPECTED', 'مشتبه'
        PROBABLE = 'PROBABLE', 'محتمل'
        CONFIRMED = 'CONFIRMED', 'مؤكد'
        NOT_A_CASE = 'NOT_A_CASE', 'ليس حالة'

    disease = models.ForeignKey(
        Disease, on_delete=models.CASCADE, related_name='case_definitions', verbose_name='المرض'
    )
    case_type = models.CharField(max_length=20, choices=CaseType.choices, verbose_name='نوع الحالة')
    clinical_criteria = models.JSONField(default=dict, blank=True, verbose_name='المعايير السريرية')
    lab_criteria = models.JSONField(default=dict, blank=True, verbose_name='المعايير المخبرية')
    epidemiological_criteria = models.JSONField(default=dict, blank=True, verbose_name='المعايير الوبائية')
    version = models.PositiveIntegerField(default=1, verbose_name='الإصدار')

    class Meta:
        ordering = ['-version']
        verbose_name = 'تعريف حالة'
        verbose_name_plural = 'تعاريف الحالات'

    def __str__(self):
        return f'{self.disease.icd_11_code} - {self.case_type}'


class TreatmentProtocol(BaseModel):
    class SeverityLevel(models.TextChoices):
        MILD = 'MILD', 'بسيط'
        MODERATE = 'MODERATE', 'متوسط'
        SEVERE = 'SEVERE', 'شديد'
        CRITICAL = 'CRITICAL', 'حرج'

    disease = models.ForeignKey(
        Disease, on_delete=models.CASCADE, related_name='protocols', verbose_name='المرض'
    )
    name = models.CharField(max_length=200, verbose_name='الاسم')
    severity_level = models.CharField(max_length=20, choices=SeverityLevel.choices, verbose_name='المستوى')
    medications = models.JSONField(default=list, blank=True, verbose_name='الأدوية')
    supportive_care = models.JSONField(default=list, blank=True, verbose_name='الرعاية الداعمة')
    duration_days = models.PositiveIntegerField(null=True, blank=True, verbose_name='المدة بالأيام')
    version = models.PositiveIntegerField(default=1, verbose_name='الإصدار')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['-version']
        verbose_name = 'بروتوكول علاج'
        verbose_name_plural = 'بروتوكولات العلاج'

    def __str__(self):
        return f'{self.disease.icd_11_code} - {self.name}'


class LabSection(BaseModel):
    class SectionKind(models.TextChoices):
        RECEPTION = 'RECEPTION', 'استقبال العينات'
        MICROBIOLOGY = 'MICROBIOLOGY', 'الأمراض المعدية والأحياء الدقيقة'
        MOLECULAR = 'MOLECULAR', 'الأحياء الجزيئية'
        FOOD = 'FOOD', 'سلامة الأغذية'
        WATER = 'WATER', 'المياه والبيئة'
        REFERENCE = 'REFERENCE', 'المختبر المرجعي'

    code = models.CharField(max_length=30, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    kind = models.CharField(
        max_length=30, choices=SectionKind.choices, default=SectionKind.MICROBIOLOGY, verbose_name='النوع'
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'code']
        verbose_name = 'قسم معمل'
        verbose_name_plural = 'أقسام المعمل'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class Laboratory(BaseModel):
    """معمل قطاعي (مثيل المعمل ضمن كل قطاع) تابع للإدارة القومية للمعامل."""

    sector = models.OneToOneField(
        'organization.Sector',
        on_delete=models.CASCADE,
        related_name='laboratory',
        verbose_name='القطاع',
    )
    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='directed_laboratories',
        null=True,
        blank=True,
        verbose_name='مدير المعمل',
    )
    phone = models.CharField(max_length=50, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    address = models.TextField(blank=True, verbose_name='العنوان')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        verbose_name = 'معمل قطاعي'
        verbose_name_plural = 'المعامل القطاعية'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class SampleNumberCounter(BaseModel):
    year = models.PositiveIntegerField(verbose_name='السنة')
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.CASCADE,
        related_name='sample_counters',
        null=True,
        blank=True,
        verbose_name='القطاع',
    )
    last_sequence = models.PositiveIntegerField(default=0, verbose_name='آخر تسلسل')

    class Meta:
        unique_together = [('year', 'sector')]
        verbose_name = 'عداد أرقام العينات'
        verbose_name_plural = 'عدادات أرقام العينات'

    @classmethod
    def next_number(cls, sector=None):
        year = timezone.now().year
        with transaction.atomic():
            counter, _ = cls.objects.select_for_update().get_or_create(
                year=year, sector=sector, defaults={'last_sequence': 0}
            )
            counter.last_sequence += 1
            counter.save(update_fields=['last_sequence', 'updated_at'])
            prefix = f'NQL-{sector.code}-{year}-' if sector else f'NQL-{year}-'
            return f'{prefix}{counter.last_sequence:06d}'


class LabTestCatalog(BaseModel):
    code = models.CharField(max_length=60, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=250, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=250, blank=True, verbose_name='الاسم بالإنجليزية')
    section = models.ForeignKey(
        LabSection, on_delete=models.PROTECT, related_name='test_catalog', verbose_name='القسم'
    )
    sort_order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['sort_order', 'code']
        verbose_name = 'فحص متاح'
        verbose_name_plural = 'الفحوص المتاحة'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class LabSample(BaseModel):
    class SampleStatus(models.TextChoices):
        REGISTERED = 'REGISTERED', 'مسجلة'
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        ACCEPTED = 'ACCEPTED', 'مقبولة'
        CONDITIONALLY_ACCEPTED = 'CONDITIONALLY_ACCEPTED', 'قبول مشروط'
        PROCESSING = 'PROCESSING', 'قيد التحليل'
        UNDER_TESTING = 'UNDER_TESTING', 'قيد التحليل'
        READY_FOR_APPROVAL = 'READY_FOR_APPROVAL', 'جاهزة للاعتماد'
        COMPLETED = 'COMPLETED', 'مكتملة'
        REJECTED = 'REJECTED', 'مرفوضة'

    class SampleType(models.TextChoices):
        BLOOD = 'BLOOD', 'دم'
        SWAB = 'SWAB', 'مسحة'
        URINE = 'URINE', 'بول'
        STOOL = 'STOOL', 'براز'
        TISSUE = 'TISSUE', 'أنسجة'
        FOOD = 'FOOD', 'غذاء'
        WATER = 'WATER', 'مياه'
        ENVIRONMENTAL = 'ENVIRONMENTAL', 'بيئية'
        OTHER = 'OTHER', 'أخرى'

    class Source(models.TextChoices):
        CLINIC = 'CLINIC', 'عيادة الحجر الصحي'
        AIRPORT = 'AIRPORT', 'مطار'
        SEAPORT = 'SEAPORT', 'ميناء'
        LAND_PORT = 'LAND_PORT', 'معبر بري'
        FOOD_SURVEILLANCE = 'FOOD_SURVEILLANCE', 'رقابة الأغذية'
        SURVEILLANCE = 'SURVEILLANCE', 'الترصد'
        REFERRAL = 'REFERRAL', 'إحالة طبية'
        OTHER = 'OTHER', 'أخرى'

    class Priority(models.TextChoices):
        ROUTINE = 'ROUTINE', 'عادي'
        HIGH = 'HIGH', 'عالي'
        URGENT = 'URGENT', 'عاجل'

    class ReceptionStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        ACCEPTED = 'ACCEPTED', 'مقبولة'
        CONDITIONALLY_ACCEPTED = 'CONDITIONALLY_ACCEPTED', 'قبول مشروط'
        REJECTED = 'REJECTED', 'مرفوضة'

    visit = models.ForeignKey(
        'clinic.ClinicVisit',
        on_delete=models.CASCADE,
        related_name='samples',
        null=True,
        blank=True,
        verbose_name='الزيارة',
    )
    lab_request = models.ForeignKey(
        'clinic.LabRequest',
        on_delete=models.SET_NULL,
        related_name='nql_samples',
        null=True,
        blank=True,
        verbose_name='طلب الفحص',
    )
    sample_number = models.CharField(
        max_length=30, unique=True, null=True, blank=True, verbose_name='رقم العينة'
    )
    sample_barcode = models.CharField(max_length=50, unique=True, verbose_name='باركود العينة')
    sample_type = models.CharField(
        max_length=30, choices=SampleType.choices, default=SampleType.SWAB, verbose_name='نوع العينة'
    )
    source = models.CharField(
        max_length=30, choices=Source.choices, default=Source.CLINIC, verbose_name='مصدر العينة'
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.ROUTINE, verbose_name='الأولوية'
    )
    section = models.ForeignKey(
        LabSection,
        on_delete=models.PROTECT,
        related_name='samples',
        null=True,
        blank=True,
        verbose_name='القسم المعين',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        related_name='lab_samples',
        null=True,
        blank=True,
        verbose_name='القطاع',
    )
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        related_name='lab_samples',
        null=True,
        blank=True,
        verbose_name='نقطة الدخول',
    )
    collector = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='collected_samples',
        verbose_name='جامع العينة',
    )
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت السحب')
    received_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاستلام')
    reception_status = models.CharField(
        max_length=30,
        choices=ReceptionStatus.choices,
        default=ReceptionStatus.RECEIVED,
        verbose_name='حالة الاستلام',
    )
    reception_checklist = models.JSONField(default=dict, blank=True, verbose_name='قائمة فحص القبول')
    reception_note = models.TextField(blank=True, verbose_name='ملاحظات الاستلام')
    rejection_reason = models.CharField(max_length=120, blank=True, verbose_name='سبب الرفض')
    reception_decision_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='lab_reception_decisions',
        null=True,
        blank=True,
        verbose_name='قرار الاستلام',
    )
    reception_decision_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت قرار الاستلام')
    storage_location = models.CharField(max_length=120, blank=True, verbose_name='موقع التخزين')
    status = models.CharField(
        max_length=30, choices=SampleStatus.choices, default=SampleStatus.REGISTERED, verbose_name='الحالة'
    )
    public_result_code = models.CharField(
        max_length=12, unique=True, null=True, blank=True, verbose_name='رمز النتيجة العام'
    )
    public_issued_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت إتاحة النتيجة')

    class Meta:
        ordering = ['-collected_at']
        verbose_name = 'عينة مخبرية'
        verbose_name_plural = 'العينات المخبرية'

    def __str__(self):
        return self.sample_number or self.sample_barcode

    def save(self, *args, **kwargs):
        if not self.sample_barcode:
            self.sample_barcode = f'LAB-{uuid.uuid4().hex[:8].upper()}'
        if self.sector_id is None and self.entry_point_id:
            self.sector_id = self.entry_point.sector_id if self.entry_point_id else None
        if not self.sample_number:
            self.sample_number = SampleNumberCounter.next_number(self.sector if self.sector_id else None)
        super().save(*args, **kwargs)

    def record_movement(self, action, department, user=None, note='', location='', metadata=None):
        return SampleMovement.objects.create(
            sample=self,
            action=action,
            department=department,
            location=location,
            user=user,
            note=note,
            metadata=metadata or {},
        )

    def publish_result(self):
        """يولّد رمز تحقق عام عند اكتمال النتائج (مرة واحدة فقط)."""
        import secrets
        import string

        if self.public_result_code:
            return self.public_result_code
        charset = string.ascii_uppercase + string.digits
        for _ in range(20):
            code = 'LNC-' + ''.join(secrets.choice(charset) for _ in range(6))
            if not LabSample.objects.filter(public_result_code=code).exists():
                self.public_result_code = code
                self.public_issued_at = timezone.now()
                self.save(update_fields=['public_result_code', 'public_issued_at', 'updated_at'])
                return code
        return None


class LabResult(BaseModel):
    class Result(models.TextChoices):
        POSITIVE = 'POSITIVE', 'إيجابي'
        NEGATIVE = 'NEGATIVE', 'سلبي'
        INCONCLUSIVE = 'INCONCLUSIVE', 'غير حاسم'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', 'قيد الاعتماد'
        APPROVED = 'APPROVED', 'معتمد'

    sample = models.ForeignKey(
        LabSample, on_delete=models.CASCADE, related_name='results', verbose_name='العينة'
    )
    disease = models.ForeignKey(
        Disease, on_delete=models.PROTECT, related_name='lab_results', verbose_name='المرض'
    )
    result = models.CharField(max_length=20, choices=Result.choices, verbose_name='النتيجة')
    value = models.FloatField(null=True, blank=True, verbose_name='القيمة')
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='entered_results',
        verbose_name='المدخل',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='approved_results',
        verbose_name='المعتمد',
    )
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING, verbose_name='حالة الاعتماد'
    )
    result_date = models.DateTimeField(auto_now_add=True, verbose_name='وقت النتيجة')

    class Meta:
        ordering = ['-result_date']
        verbose_name = 'نتيجة مخبرية'
        verbose_name_plural = 'النتائج المخبرية'

    def __str__(self):
        return f'{self.sample.sample_number or self.sample.sample_barcode} - {self.result}'


class SampleMovement(BaseModel):
    class Action(models.TextChoices):
        RECEIVED = 'RECEIVED', 'استلام'
        ACCEPTED = 'ACCEPTED', 'قبول'
        CONDITIONALLY_ACCEPTED = 'CONDITIONALLY_ACCEPTED', 'قبول مشروط'
        REJECTED = 'REJECTED', 'رفض'
        ASSIGNED = 'ASSIGNED', 'توزيع'
        RESULT_ENTERED = 'RESULT_ENTERED', 'إدخال نتيجة'
        SUBMITTED = 'SUBMITTED', 'إرسال للمراجعة'
        REVIEWED = 'REVIEWED', 'مراجعة'
        APPROVED = 'APPROVED', 'اعتماد'
        RETURNED = 'RETURNED', 'إعادة للفني'
        REVISED = 'REVISED', 'تعديل'
        CRITICAL_ACK = 'CRITICAL_ACK', 'إقرار نتيجة حرجة'
        STORED = 'STORED', 'تخزين'
        DISPOSED = 'DISPOSED', 'تخلص'

    sample = models.ForeignKey(
        LabSample, on_delete=models.CASCADE, related_name='movements', verbose_name='العينة'
    )
    action = models.CharField(max_length=30, choices=Action.choices, verbose_name='الإجراء')
    department = models.CharField(max_length=120, blank=True, verbose_name='القسم')
    location = models.CharField(max_length=120, blank=True, verbose_name='الموقع')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='المستخدم'
    )
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='بيانات إضافية')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'سجل تتبع العينة'
        verbose_name_plural = 'سجل تتبع العينات'

    def __str__(self):
        return f'{self.sample.sample_number} - {self.action}'


class LabEquipment(BaseModel):
    class EquipmentStatus(models.TextChoices):
        OPERATIONAL = 'OPERATIONAL', 'تشغيلية'
        UNDER_MAINTENANCE = 'UNDER_MAINTENANCE', 'قيد الصيانة'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'خارج الخدمة'

    name_ar = models.CharField(max_length=255, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    model_number = models.CharField(max_length=120, blank=True, verbose_name='الطراز')
    serial_number = models.CharField(max_length=120, blank=True, verbose_name='الرقم التسلسلي')
    section = models.ForeignKey(
        LabSection, on_delete=models.SET_NULL, related_name='equipment', null=True, blank=True,
        verbose_name='القسم'
    )
    sector = models.ForeignKey(
        'organization.Sector', on_delete=models.SET_NULL, related_name='lab_equipment',
        null=True, blank=True, verbose_name='القطاع'
    )
    status = models.CharField(
        max_length=30, choices=EquipmentStatus.choices, default=EquipmentStatus.OPERATIONAL,
        verbose_name='الحالة'
    )
    last_calibrated = models.DateField(null=True, blank=True, verbose_name='آخر معايرة')
    next_calibration_due = models.DateField(null=True, blank=True, verbose_name='تاريخ المعايرة القادم')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='created_equipment',
        null=True, blank=True, verbose_name='المسجل'
    )

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'جهاز مخبري'
        verbose_name_plural = 'الأجهزة المخبرية'

    def __str__(self):
        return self.name_ar

    @property
    def calibration_overdue(self):
        return bool(self.next_calibration_due and self.next_calibration_due < timezone.localdate())

    @property
    def calibration_due_soon(self):
        if not self.next_calibration_due:
            return False
        days = (self.next_calibration_due - timezone.localdate()).days
        return 0 <= days <= 30


class SampleTest(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد الانتظار'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        DRAFT = 'DRAFT', 'مسودة'
        SUBMITTED = 'SUBMITTED', 'مُرسلة للمراجعة'
        REVIEWED = 'REVIEWED', 'راجعها رئيس القسم'
        APPROVED = 'APPROVED', 'اعتمدها مدير المختبر'
        COMPLETED = 'COMPLETED', 'مكتمل'

    class Outcome(models.TextChoices):
        POSITIVE = 'POSITIVE', 'إيجابي'
        NEGATIVE = 'NEGATIVE', 'سلبي'
        INCONCLUSIVE = 'INCONCLUSIVE', 'غير حاسم'
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'

    sample = models.ForeignKey(
        LabSample, on_delete=models.CASCADE, related_name='tests', verbose_name='العينة'
    )
    disease = models.ForeignKey(
        Disease, on_delete=models.PROTECT, related_name='sample_tests', null=True, blank=True,
        verbose_name='المرض/الفحص السريري'
    )
    test_name = models.CharField(max_length=255, verbose_name='اسم الفحص')
    method = models.CharField(max_length=255, blank=True, verbose_name='الطريقة')
    instrument = models.ForeignKey(
        LabEquipment, on_delete=models.SET_NULL, related_name='tests', null=True, blank=True,
        verbose_name='الجهاز'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='nql_assigned_tests',
        null=True, blank=True, verbose_name='الفني المسؤول'
    )
    priority = models.CharField(
        max_length=10, choices=LabSample.Priority.choices, default=LabSample.Priority.ROUTINE,
        verbose_name='الأولوية'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة'
    )
    version = models.PositiveIntegerField(default=1, verbose_name='الإصدار')
    result_value = models.FloatField(null=True, blank=True, verbose_name='القيمة')
    result_text = models.CharField(max_length=255, blank=True, verbose_name='النتيجة النصية')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    reference_range = models.CharField(max_length=100, blank=True, verbose_name='المرجع')
    outcome = models.CharField(max_length=30, choices=Outcome.choices, blank=True, verbose_name='النتيجة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    is_critical = models.BooleanField(default=False, verbose_name='نتيجة حرجة')
    critical_acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='crit_ack_lab_tests',
        null=True, blank=True, verbose_name='مقر النتيجة الحرجة'
    )
    critical_acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإقرار')
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='nql_entered_tests',
        null=True, blank=True, verbose_name='الفني'
    )
    entered_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإدخال')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='nql_reviewed_tests',
        null=True, blank=True, verbose_name='المراجع'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='nql_approved_tests',
        null=True, blank=True, verbose_name='المعتمد'
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')
    lab_result = models.OneToOneField(
        LabResult, on_delete=models.SET_NULL, related_name='nql_test', null=True, blank=True,
        verbose_name='النتيجة المدمجة'
    )

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'فحص مخبري'
        verbose_name_plural = 'الفحوص المخبرية'

    def __str__(self):
        return f'{self.sample.sample_number} - {self.test_name}'

    def result_label(self):
        return SampleTest.Outcome(self.outcome).label if self.outcome else ''

    def should_be_critical(self):
        if self.outcome == SampleTest.Outcome.NON_COMPLIANT:
            return True
        if self.outcome == SampleTest.Outcome.POSITIVE and self.disease and self.disease.is_public_health_emergency:
            return True
        if self.outcome == SampleTest.Outcome.POSITIVE:
            return True
        return False


class StorageLocation(BaseModel):
    class LocationType(models.TextChoices):
        STORE = 'STORE', 'مخزن'
        ROOM = 'ROOM', 'غرفة'
        CABINET = 'CABINET', 'خزانة'
        SHELF = 'SHELF', 'رف'

    name = models.CharField(max_length=255, verbose_name='الاسم')
    location_type = models.CharField(
        max_length=20, choices=LocationType.choices, default=LocationType.ROOM, verbose_name='النوع'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, related_name='children', null=True, blank=True,
        verbose_name='الموقع الأب'
    )
    temperature = models.CharField(max_length=80, blank=True, verbose_name='درجة الحرارة')
    humidity = models.CharField(max_length=80, blank=True, verbose_name='الرطوبة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['name']
        verbose_name = 'موقع تخزين'
        verbose_name_plural = 'مواقع التخزين'

    def __str__(self):
        return self.name


class Reagent(BaseModel):
    class MaterialType(models.TextChoices):
        REAGENT = 'REAGENT', 'كاشف'
        SOLUTION = 'SOLUTION', 'محلول'
        REFERENCE_STANDARD = 'REFERENCE_STANDARD', 'مادة قياسية مرجعية'
        CULTURE_MEDIA = 'CULTURE_MEDIA', 'وسط زرعي'
        CHEMICAL = 'CHEMICAL', 'مادة كيميائية'
        CONSUMABLE = 'CONSUMABLE', 'مستهلك'
        CRM = 'CRM', 'مادة مرجعية معتمدة'

    class Grade(models.TextChoices):
        ANALYTICAL = 'ANALYTICAL', 'تحليلي'
        HPLC = 'HPLC', 'HPLC'
        REAGENT_GRADE = 'REAGENT_GRADE', 'كاشف'
        TECHNICAL = 'TECHNICAL', 'تقني'
        PHARMACEUTICAL = 'PHARMACEUTICAL', 'صيدلاني'
        MICROBIOLOGICAL = 'MICROBIOLOGICAL', 'ميكروبيولوجي'
        OTHER = 'OTHER', 'أخرى'

    class HazardClass(models.TextChoices):
        NONE = 'NONE', 'لا يوجد'
        TOXIC = 'TOXIC', 'سام'
        CORROSIVE = 'CORROSIVE', 'أكّال'
        FLAMMABLE = 'FLAMMABLE', 'قابل للاشتعال'
        OXIDIZER = 'OXIDIZER', 'مؤكسد'
        IRRITANT = 'IRRITANT', 'مهيج'
        OTHER = 'OTHER', 'أخرى'

    name_ar = models.CharField(max_length=255, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    material_type = models.CharField(
        max_length=30, choices=MaterialType.choices, default=MaterialType.REAGENT, verbose_name='النوع'
    )
    section = models.ForeignKey(
        LabSection, on_delete=models.SET_NULL, related_name='reagents', null=True, blank=True,
        verbose_name='القسم'
    )
    sector = models.ForeignKey(
        'organization.Sector', on_delete=models.SET_NULL, related_name='lab_reagents',
        null=True, blank=True, verbose_name='القطاع'
    )
    manufacturer = models.CharField(max_length=255, blank=True, verbose_name='الشركة المصنعة')
    catalog_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الكتالوج')
    cas_number = models.CharField(max_length=60, blank=True, verbose_name='رقم CAS')
    grade = models.CharField(max_length=30, choices=Grade.choices, default=Grade.REAGENT_GRADE, verbose_name='النقاء')
    unit = models.CharField(max_length=40, default='ml', verbose_name='الوحدة')
    min_stock = models.FloatField(default=0, verbose_name='الحد الأدنى')
    reorder_level = models.FloatField(default=0, verbose_name='حد إعادة الطلب')
    max_stock = models.FloatField(default=0, verbose_name='الحد الأقصى')
    hazard_class = models.CharField(
        max_length=20, choices=HazardClass.choices, default=HazardClass.NONE, verbose_name='فئة الخطورة'
    )
    storage = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, related_name='reagents', null=True, blank=True,
        verbose_name='موقع التخزين'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='created_reagents',
        null=True, blank=True, verbose_name='المسجل'
    )

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مادة مخبرية'
        verbose_name_plural = 'المواد المخبرية'

    def __str__(self):
        return self.name_ar

    @property
    def total_quantity(self):
        return sum((lot.quantity or 0) for lot in self.lots.all())


class ReagentLot(BaseModel):
    class LotStatus(models.TextChoices):
        VALID = 'VALID', 'صالح'
        EXPIRING_SOON = 'EXPIRING_SOON', 'ينتهي قريباً'
        EXPIRED = 'EXPIRED', 'منتهي'
        BLOCKED = 'BLOCKED', 'محظور'
        DISPOSED = 'DISPOSED', 'تم التخلص'

    reagent = models.ForeignKey(
        Reagent, on_delete=models.CASCADE, related_name='lots', verbose_name='المادة'
    )
    lot_number = models.CharField(max_length=120, verbose_name='رقم التشغيلة')
    batch_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الدفعة')
    manufacturing_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التصنيع')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    quantity = models.FloatField(default=0, verbose_name='الكمية')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    storage = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, related_name='lots', null=True, blank=True,
        verbose_name='موقع التخزين'
    )
    supplier = models.CharField(max_length=255, blank=True, verbose_name='المورد')
    certificate_ref = models.CharField(max_length=120, blank=True, verbose_name='مرجع الشهادة')
    received_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستلام')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='received_lots',
        null=True, blank=True, verbose_name='المستلم'
    )
    status = models.CharField(
        max_length=20, choices=LotStatus.choices, default=LotStatus.VALID, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-received_date']
        verbose_name = 'تشغيلة مادة'
        verbose_name_plural = 'تشغيلات المواد'

    def __str__(self):
        return f'{self.reagent.name_ar} - {self.lot_number}'

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.localdate())

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.localdate()).days

    def compute_status(self):
        if self.status in (self.LotStatus.BLOCKED, self.LotStatus.DISPOSED):
            return self.status
        if self.is_expired:
            return self.LotStatus.EXPIRED
        if self.days_to_expiry is not None and self.days_to_expiry <= 30:
            return self.LotStatus.EXPIRING_SOON
        return self.LotStatus.VALID

    def save(self, *args, **kwargs):
        next_status = self.compute_status()
        if next_status != self.status:
            self.status = next_status
        super().save(*args, **kwargs)


class MaterialIssue(BaseModel):
    class IssueType(models.TextChoices):
        ISSUE = 'ISSUE', 'صرف'
        CONSUMPTION = 'CONSUMPTION', 'استهلاك'
        RETURN = 'RETURN', 'إرجاع'

    lot = models.ForeignKey(
        ReagentLot, on_delete=models.CASCADE, related_name='issues', null=True, blank=True,
        verbose_name='التشغيلة'
    )
    issue_type = models.CharField(
        max_length=15, choices=IssueType.choices, default=IssueType.CONSUMPTION, verbose_name='النوع'
    )
    quantity_used = models.FloatField(verbose_name='الكمية')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    purpose = models.CharField(max_length=255, blank=True, verbose_name='الغرض')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='material_issues',
        null=True, blank=True, verbose_name='المسؤول'
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الصرف')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'صرف مادة'
        verbose_name_plural = 'صرف المواد'

    def save(self, *args, **kwargs):
        creating = self._state.adding
        super().save(*args, **kwargs)
        if creating and self.lot and self.issue_type != self.IssueType.RETURN:
            self.lot.quantity = max(0.0, (self.lot.quantity or 0) - self.quantity_used)
            self.lot.save(update_fields=['quantity', 'updated_at'])


class QCRecord(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد المراجعة'
        PASSED = 'PASSED', 'مطابق'
        FAILED = 'FAILED', 'غير مطابق'

    class Severity(models.TextChoices):
        MINOR = 'MINOR', 'طفيف'
        MAJOR = 'MAJOR', 'جوهري'
        CRITICAL = 'CRITICAL', 'حرج'

    qc_number = models.CharField(max_length=60, unique=True, blank=True, verbose_name='رقم مراقبة الجودة')
    section = models.ForeignKey(
        LabSection, on_delete=models.SET_NULL, related_name='qc_records', null=True, blank=True,
        verbose_name='القسم'
    )
    sector = models.ForeignKey(
        'organization.Sector', on_delete=models.SET_NULL, related_name='lab_qc_records',
        null=True, blank=True, verbose_name='القطاع'
    )
    test = models.ForeignKey(
        SampleTest, on_delete=models.SET_NULL, related_name='qc_records', null=True, blank=True,
        verbose_name='الفحص'
    )
    control_type = models.CharField(max_length=120, verbose_name='نوع المراقب')
    lot_number = models.CharField(max_length=120, blank=True, verbose_name='رقم التشغيلة')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة'
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MINOR, verbose_name='الخطورة'
    )
    result_value = models.FloatField(null=True, blank=True, verbose_name='النتيجة')
    expected_value = models.FloatField(null=True, blank=True, verbose_name='القيمة المتوقعة')
    tolerance = models.FloatField(null=True, blank=True, verbose_name='التفاوت')
    qc_notes = models.TextField(blank=True, verbose_name='ملاحظات')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='reviewed_qc',
        null=True, blank=True, verbose_name='المراجع'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل مراقبة جودة'
        verbose_name_plural = 'سجلات مراقبة الجودة'

    def __str__(self):
        return self.qc_number

    def save(self, *args, **kwargs):
        if not self.qc_number:
            self.qc_number = f'QC-{timezone.now().year}-{uuid.uuid4().hex[:4].upper()}'
        super().save(*args, **kwargs)


class NonConformity(BaseModel):
    class NcType(models.TextChoices):
        SAMPLE = 'SAMPLE', 'عينة'
        TEST = 'TEST', 'فحص'
        QC = 'QC', 'جودة'
        EQUIPMENT = 'EQUIPMENT', 'جهاز'
        REAGENT = 'REAGENT', 'مادة'
        METHOD = 'METHOD', 'طريقة'
        PERSONNEL = 'PERSONNEL', 'كادر'
        DOCUMENTATION = 'DOCUMENTATION', 'توثيق'
        RESULT = 'RESULT', 'نتيجة'
        SLA = 'SLA', 'مدة إنجاز'

    class Severity(models.TextChoices):
        MINOR = 'MINOR', 'طفيف'
        MAJOR = 'MAJOR', 'جوهري'
        CRITICAL = 'CRITICAL', 'حرج'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'قيد التحقيق'
        AWAITING_CAPA = 'AWAITING_CAPA', 'بانتظار الإجراء التصحيحي'
        CLOSED = 'CLOSED', 'مغلقة'

    nc_number = models.CharField(max_length=60, unique=True, blank=True, verbose_name='رقم عدم المطابقة')
    nc_type = models.CharField(max_length=20, choices=NcType.choices, default=NcType.SAMPLE, verbose_name='النوع')
    section = models.ForeignKey(
        LabSection, on_delete=models.SET_NULL, related_name='non_conformities', null=True, blank=True,
        verbose_name='القسم'
    )
    sector = models.ForeignKey(
        'organization.Sector', on_delete=models.SET_NULL, related_name='lab_non_conformities',
        null=True, blank=True, verbose_name='القطاع'
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MAJOR, verbose_name='الخطورة'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة'
    )
    title = models.CharField(max_length=255, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    reference_type = models.CharField(max_length=40, blank=True, verbose_name='نوع المرجع')
    reference_number = models.CharField(max_length=120, blank=True, verbose_name='رقم المرجع')
    root_cause = models.TextField(blank=True, verbose_name='السبب الجذري')
    capa_required = models.BooleanField(default=False, verbose_name='يتطلب إجراء تصحيحي/وقائي')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='nc_reported',
        null=True, blank=True, verbose_name='المبلغ'
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عدم مطابقة'
        verbose_name_plural = 'عدم المطابقة'

    def __str__(self):
        return self.nc_number

    def save(self, *args, **kwargs):
        if not self.nc_number:
            self.nc_number = f'NC-{timezone.now().year}-{uuid.uuid4().hex[:4].upper()}'
        super().save(*args, **kwargs)


class CapaRecord(BaseModel):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوح'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        VERIFICATION = 'VERIFICATION', 'قيد التحقق'
        CLOSED = 'CLOSED', 'مغلق'

    non_conformity = models.ForeignKey(
        NonConformity, on_delete=models.CASCADE, related_name='capas', verbose_name='عدم المطابقة'
    )
    title = models.CharField(max_length=255, verbose_name='العنوان')
    root_cause = models.TextField(blank=True, verbose_name='السبب الجذري')
    corrective_action = models.TextField(blank=True, verbose_name='الإجراء التصحيحي')
    preventive_action = models.TextField(blank=True, verbose_name='الإجراء الوقائي')
    responsible_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='capa_tasks',
        null=True, blank=True, verbose_name='المسؤول'
    )
    due_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستحقاق')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة'
    )
    verification_notes = models.TextField(blank=True, verbose_name='ملاحظات التحقق')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إجراء تصحيحي/وقائي'
        verbose_name_plural = 'الإجراءات التصحيحية/الوقائية'

    def __str__(self):
        return f'{self.non_conformity.nc_number} - {self.title}'


class CriticalResultNotification(BaseModel):
    test = models.ForeignKey(
        SampleTest, on_delete=models.CASCADE, related_name='critical_notifications', verbose_name='الفحص'
    )
    notified_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التنبيه')
    channel = models.CharField(max_length=50, blank=True, verbose_name='القناة')
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='crit_notifications',
        null=True, blank=True, verbose_name='المقر'
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإقرار')
    note = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-notified_at']
        verbose_name = 'تنبيه نتيجة حرجة'
        verbose_name_plural = 'تنبيهات النتائج الحرجة'

    def __str__(self):
        return f'{self.test.sample.sample_number} - {self.test.test_name}'