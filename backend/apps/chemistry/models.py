from django.conf import settings
from django.db import models

from core.models import BaseModel


class ChemistryTest(BaseModel):
    class TestType(models.TextChoices):
        MOISTURE = 'MOISTURE', 'رطوبة'
        FAT = 'FAT', 'دهون'
        PROTEIN = 'PROTEIN', 'بروتين'
        ASH = 'ASH', 'رماد'
        AFLATOXIN = 'AFLATOXIN', 'أفلاتوكسين'
        PESTICIDE = 'PESTICIDE', 'مبيدات'
        HEAVY_METAL = 'HEAVY_METAL', 'معادن ثقيلة'
        MICROBIOLOGICAL = 'MICROBIOLOGICAL', 'حيوية'

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'طبيعي'
        URGENT = 'URGENT', 'عاجل'
        CRITICAL = 'CRITICAL', 'حرج'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        IN_ANALYSIS = 'IN_ANALYSIS', 'قيد التحليل'
        RESULT_ENTERED = 'RESULT_ENTERED', 'دخلت النتيجة'
        SUBMITTED = 'SUBMITTED', 'مرسلة للمراجعة'
        RETURNED = 'RETURNED', 'مرتجعة'
        APPROVED = 'APPROVED', 'معتمدة'

    class SLAUnit(models.TextChoices):
        HOURS = 'HOURS', 'ساعات'
        DAYS = 'DAYS', 'أيام'

    sample = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.CASCADE,
        related_name='chemistry_tests',
        verbose_name='المسافر',
    )
    product = models.CharField(max_length=200, verbose_name='المنتج')
    test_type = models.CharField(max_length=30, choices=TestType.choices, verbose_name='نوع الاختبار')
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL, verbose_name='الأولوية')
    sla_unit = models.CharField(max_length=10, choices=SLAUnit.choices, default=SLAUnit.DAYS, verbose_name='وحدة SLA')
    sla_value = models.PositiveIntegerField(default=2, verbose_name='قيمة SLA')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة')
    assigned_analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_chemistry_tests',
        verbose_name='المحلل المنسوب',
    )
    received_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الاستلام')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت البدء')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الانتهاء')
    specification_version = models.CharField(max_length=20, blank=True, verbose_name='نسخة المواصفة')
    specification_limit = models.FloatField(null=True, blank=True, verbose_name='الحد الأقصى للمواصفة')
    result_value = models.FloatField(null=True, blank=True, verbose_name='قيمة النتيجة')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    compliance_status = models.CharField(
        max_length=20, blank=True,
        choices=[('COMPLIANT', 'مطابق'), ('NON_COMPLIANT', 'غير مطابق'), ('PENDING', 'في الانتظار')],
        verbose_name='حالة الامتثال',
    )
    analyst_comment = models.TextField(blank=True, verbose_name='تعليق المحلل')
    returned_reason = models.TextField(blank=True, verbose_name='سبب الإرجاع')
    qc_required = models.BooleanField(default=True, verbose_name='يحتاج QC')
    qc_passed = models.BooleanField(null=True, blank=True, verbose_name='Passed QC')

    class Meta:
        ordering = ['-received_at']
        verbose_name = 'اختبار كيميائي'
        verbose_name_plural = 'الاختبارات الكيميائية'

    def __str__(self):
        return f'{self.sample.passport_number} - {self.get_test_type_display()}'


class ChemistryEquipment(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'متاح'
        IN_USE = 'IN_USE', 'في الاستخدام'
        MAINTENANCE = 'MAINTENANCE', 'صيانة'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'منهك الخدمة'

    name = models.CharField(max_length=100, verbose_name='اسم الجهاز')
    type = models.CharField(max_length=100, verbose_name='نوع الجهاز')
    manufacturer = models.CharField(max_length=100, blank=True, verbose_name='المصنّع')
    model = models.CharField(max_length=100, blank=True, verbose_name='الموديل')
    serial_number = models.CharField(max_length=100, unique=True, verbose_name='رقم السلسلة')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE, verbose_name='الحالة')
    location = models.CharField(max_length=200, blank=True, verbose_name='الموقع')
    last_calibration = models.DateField(null=True, blank=True, verbose_name='آخر معايرة')
    next_calibration = models.DateField(null=True, blank=True, verbose_name='المعايرة القادمة')
    calibration_status = models.CharField(max_length=20, blank=True, verbose_name='حالة المعايرة')
    assigned_analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_equipment',
        verbose_name='المحلل المنسوب',
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'جهاز مخبري'
        verbose_name_plural = 'الأجهزة المخبرية'

    def __str__(self):
        return f'{self.name} ({self.serial_number})'


class ChemistryReagent(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'متوفر'
        LOW_STOCK = 'LOW_STOCK', ' منخفضة'
        EXPIRED = 'EXPIRED', 'منتهي'
        MAINTENANCE = 'MAINTENANCE', 'صيانة'

    name = models.CharField(max_length=100, verbose_name='اسم الكواشف')
    type = models.CharField(max_length=100, verbose_name='النوع')
    lot_number = models.CharField(max_length=50, verbose_name='رقم اللوت')
    expiry_date = models.DateField(verbose_name='تاريخ الانتهاء')
    quantity = models.FloatField(default=0, verbose_name='الكمية')
    unit = models.CharField(max_length=20, default='ml', verbose_name='الوحدة')
    minimum_stock = models.FloatField(default=100, verbose_name='الكمية الدنيا')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE, verbose_name='الحالة')
    location = models.CharField(max_length=200, blank=True, verbose_name='الموقع')
    assigned_test = models.CharField(max_length=30, blank=True, verbose_name='الاختبار المخصص')

    class Meta:
        ordering = ['name']
        verbose_name = 'كواشف'
        verbose_name_plural = 'الكواشف'

    def __str__(self):
        return f'{self.name} (LOT: {self.lot_number})'


class QCRecord(BaseModel):
    class QCStatus(models.TextChoices):
        PENDING = 'PENDING', 'في انتظار'
        PASSED = 'PASSED', 'ممر'
        FAILED = 'FAILED', 'فشل'

    sample = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.CASCADE,
        related_name='qc_records',
        verbose_name='العينة',
    )
    test_type = models.CharField(max_length=30, verbose_name='نوع الاختبار')
    control_sample = models.CharField(max_length=50, verbose_name='عينة التحكم')
    result = models.FloatField(null=True, blank=True, verbose_name='نتيجة التحكم')
    expected_range = models.CharField(max_length=100, blank=True, verbose_name='النطاق المتوقع')
    status = models.CharField(max_length=20, choices=QCStatus.choices, default=QCStatus.PENDING, verbose_name='الحالة')
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='performed_qc',
        verbose_name='نفذ',
    )
    performed_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التنفيذ')

    class Meta:
        ordering = ['-performed_at']
        verbose_name = 'سجل QC'
        verbose_name_plural = 'سجلات QC'

    def __str__(self):
        return f'QC {self.control_sample} - {self.get_status_display()}'


class ChemistryAnalysisSession(BaseModel):
    sample = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.CASCADE,
        related_name='analysis_sessions',
        verbose_name='المسافر',
    )
    test_type = models.CharField(max_length=30, verbose_name='نوع الاختبار')
    equipment_used = models.ForeignKey(
        ChemistryEquipment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analysis_sessions',
        verbose_name='الجهاز المستخدم',
    )
    reagent_used = models.CharField(max_length=100, blank=True, verbose_name='الكواشف المستخدمة')
    result_value = models.FloatField(null=True, blank=True, verbose_name='قيمة النتيجة')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    limit_value = models.FloatField(null=True, blank=True, verbose_name='قيمة الحد')
    compliance = models.CharField(max_length=20, blank=True, choices=[('COMPLIANT', 'مطابق'), ('NON_COMPLIANT', 'غير مطابق')], verbose_name='الامتثال')
    analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='analysis_sessions',
        verbose_name='المحلل',
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت البدء')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الانتهاء')
    status = models.CharField(max_length=20, default='IN_PROGRESS', verbose_name='الحالة')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'جلسة تحليل كيميائي'
        verbose_name_plural = 'جلسات التحليل الكيميائي'

    def __str__(self):
        return f'{self.test_type} - {self.sample.passport_number}'