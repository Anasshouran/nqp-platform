import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel


class ClinicType(BaseModel):
    """نوع وحدة العيادة في منظومة الحجر الصحي (QC-01 … QC-14)."""

    code = models.CharField(max_length=20, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    kind = models.CharField(
        max_length=20,
        choices=[
            ('AIRPORT', 'مطار'),
            ('SEAPORT', 'ميناء بحري'),
            ('LAND_PORT', 'منفذ بري'),
            ('GENERAL', 'عام'),
        ],
        blank=True,
        verbose_name='نوع المنفذ المناسب',
    )
    services = models.JSONField(default=list, blank=True, verbose_name='الخدمات المقدمة')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'code']
        verbose_name = 'نوع وحدة عيادة'
        verbose_name_plural = 'أنواع وحدات العيادات'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class Clinic(BaseModel):
    """وحدة/عيادة الحجر الصحي مرتبطة بمنفذ دخول وقطاع ونوع."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.PROTECT,
        related_name='clinics',
        verbose_name='منفذ الدخول',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.PROTECT,
        related_name='clinics',
        verbose_name='القطاع الإداري',
    )
    clinic_type = models.ForeignKey(
        ClinicType,
        on_delete=models.PROTECT,
        related_name='clinics',
        verbose_name='نوع الوحدة',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    services = models.JSONField(default=list, blank=True, verbose_name='الخدمات')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'وحدة عيادة'
        verbose_name_plural = 'وحدات العيادات'

    def __str__(self):
        return self.name_ar


class ClinicStaff(BaseModel):
    """ربط الكادر الطبي بوحدة العيادة (سجل الصلاحيات لكل وحدة)."""

    class Role(models.TextChoices):
        DOCTOR = 'DOCTOR', 'طبيب'
        NURSE = 'NURSE', 'ممرض'
        LABORATORY = 'LABORATORY', 'مختبر'
        REGISTRATION = 'REGISTRATION', 'تسجيل'
        ADMIN = 'ADMIN', 'إداري'

    clinic = models.ForeignKey(
        Clinic, on_delete=models.CASCADE, related_name='staff_members', verbose_name='الوحدة'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clinic_staff', verbose_name='المستخدم'
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.DOCTOR, verbose_name='الدور')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        unique_together = ['clinic', 'user']
        ordering = ['clinic__name_ar']
        verbose_name = 'عضو كادر العيادة'
        verbose_name_plural = 'كادر العيادات'

    def __str__(self):
        return f'{self.user.full_name} @ {self.clinic.name_ar}'


class ClinicReferral(BaseModel):
    class ReferralStatus(models.TextChoices):
        PENDING = 'PENDING', 'في الانتظار'
        PRE_ACCEPT = 'PRE_ACCEPT', 'قيد المراجعة'
        ACCEPTED = 'ACCEPTED', 'مقبول'
        REJECTED = 'REJECTED', 'مرفوض'
        COMPLETED = 'COMPLETED', 'مكتمل'

    class Source(models.TextChoices):
        SCREENING = 'SCREENING', 'فحص منفذ الدخول'
        WALK_IN = 'WALK_IN', 'حضور مباشر'
        TRANSFER = 'TRANSFER', 'تحويل خارجي'

    screening = models.ForeignKey(
        'screening.HealthScreening',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='clinic_referrals',
        verbose_name='الفحص',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.CASCADE, related_name='clinic_referrals', verbose_name='المسافر'
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.PROTECT, related_name='referrals', verbose_name='المنفذ'
    )
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals',
        verbose_name='وحدة العيادة',
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.SCREENING, verbose_name='المصدر'
    )
    queue_no = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='رقم الدور')
    status = models.CharField(
        max_length=20, choices=ReferralStatus.choices, default=ReferralStatus.PENDING, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإنشاء')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'إحالة عيادة'
        verbose_name_plural = 'إحالات العيادات'

    def __str__(self):
        return f'{self.traveler} - {self.status}'


class ClinicVisit(BaseModel):
    class VisitStatus(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        CLOSED = 'CLOSED', 'مغلقة'

    class Phase(models.TextChoices):
        REGISTERED = 'REGISTERED', 'مسجلة'
        TRIAGED = 'TRIAGED', 'تم الفرز'
        EXAMINED = 'EXAMINED', 'تم الفحص الطبي'
        LABORATORY = 'LABORATORY', 'مختبر'
        DECISION = 'DECISION', 'القرار الطبي'
        CERTIFICATE = 'CERTIFICATE', 'الشهادة'
        CLOSED = 'CLOSED', 'مغلقة'

    PHASE_ORDER = [p.value for p in Phase]
    PHASE_ALLOWED_TRANSITIONS = {
        Phase.REGISTERED: {Phase.TRIAGED},
        Phase.TRIAGED: {Phase.EXAMINED},
        Phase.EXAMINED: {Phase.LABORATORY, Phase.DECISION},
        Phase.LABORATORY: {Phase.DECISION},
        Phase.DECISION: {Phase.CERTIFICATE, Phase.CLOSED},
        Phase.CERTIFICATE: {Phase.CLOSED},
    }

    referral = models.ForeignKey(
        ClinicReferral,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visits',
        verbose_name='الإحالة',
    )
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visits',
        verbose_name='وحدة العيادة',
    )
    traveler = models.ForeignKey(
        'travelers.Traveler', on_delete=models.CASCADE, related_name='clinic_visits', verbose_name='المسافر'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='clinic_visits',
        verbose_name='الطبيب',
    )
    phase = models.CharField(
        max_length=20, choices=Phase.choices, default=Phase.REGISTERED, verbose_name='مرحلة المعالجة'
    )
    visit_status = models.CharField(
        max_length=10, choices=VisitStatus.choices, default=VisitStatus.OPEN, verbose_name='حالة الزيارة'
    )
    opened_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفتح')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-opened_at']
        verbose_name = 'زيارة عيادة'
        verbose_name_plural = 'زيارات العيادات'

    def __str__(self):
        return f'{self.traveler} - {self.visit_status}'


class EMRRecord(BaseModel):
    visit = models.OneToOneField(
        ClinicVisit, on_delete=models.CASCADE, related_name='emr', verbose_name='الزيارة'
    )
    clinical_notes = models.JSONField(default=dict, blank=True, verbose_name='الملاحظات السريرية')
    vital_signs = models.JSONField(default=dict, blank=True, verbose_name='العلامات الحيوية')
    physical_exam = models.JSONField(default=dict, blank=True, verbose_name='الفحص البدني')

    class Meta:
        verbose_name = 'سجل طبي إلكتروني'
        verbose_name_plural = 'السجلات الطبية الإلكترونية'

    def __str__(self):
        return f'EMR - {self.visit_id}'


class TriageRecord(BaseModel):
    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MEDIUM = 'MEDIUM', 'متوسط'
        HIGH = 'HIGH', 'مرتفع'
        EMERGENCY = 'EMERGENCY', 'طوارئ'

    class Routing(models.TextChoices):
        CLINIC = 'CLINIC', 'متابعة في العيادة'
        HOSPITAL = 'HOSPITAL', 'تحويل للمستشفى'
        ISOLATION = 'ISOLATION', 'حجر صحي / عزل'
        RELEASE = 'RELEASE', 'خروج'

    visit = models.ForeignKey(
        ClinicVisit, on_delete=models.CASCADE, related_name='triages', verbose_name='الزيارة'
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MEDIUM, verbose_name='درجة الخطورة'
    )
    temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    heart_rate = models.IntegerField(null=True, blank=True, verbose_name='نبض القلب')
    respiratory_rate = models.IntegerField(null=True, blank=True, verbose_name='معدل التنفس')
    oxygen_saturation = models.IntegerField(null=True, blank=True, verbose_name='تشبع الأكسجين')
    systolic_bp = models.IntegerField(null=True, blank=True, verbose_name='الضغط الانقباضي')
    diastolic_bp = models.IntegerField(null=True, blank=True, verbose_name='الضغط الانبساطي')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    chief_complaint = models.TextField(blank=True, verbose_name='الشكوى الرئيسية')
    routing = models.CharField(
        max_length=20, choices=Routing.choices, default=Routing.CLINIC, verbose_name='التوجيه'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات الفرز')
    triaged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='triage_records',
        verbose_name='أجرى الفرز',
    )
    triaged_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفرز')

    class Meta:
        ordering = ['-triaged_at']
        verbose_name = 'سجل فرز'
        verbose_name_plural = 'سجلات الفرز'

    def __str__(self):
        return f'{self.visit_id} - {self.severity}'


class Medication(BaseModel):
    name = models.CharField(max_length=100, verbose_name='الاسم')
    generic_name = models.CharField(max_length=100, blank=True, verbose_name='الاسم العام')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    interactions = models.JSONField(default=list, blank=True, verbose_name='التفاعلات')

    class Meta:
        ordering = ['name']
        verbose_name = 'دواء'
        verbose_name_plural = 'الأدوية'

    def __str__(self):
        return self.name


class Prescription(BaseModel):
    visit = models.ForeignKey(
        ClinicVisit, on_delete=models.CASCADE, related_name='prescriptions', verbose_name='الزيارة'
    )
    medication = models.ForeignKey(
        Medication, on_delete=models.PROTECT, related_name='prescriptions', verbose_name='الدواء'
    )
    dosage = models.CharField(max_length=50, verbose_name='الجرعة')
    frequency = models.CharField(max_length=50, verbose_name='التكرار')
    duration_days = models.PositiveIntegerField(verbose_name='مدة العلاج بالأيام')
    instructions = models.TextField(blank=True, verbose_name='التعليمات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'وصفة طبية'
        verbose_name_plural = 'الوصفات الطبية'

    def __str__(self):
        return f'{self.visit_id} - {self.medication.name}'


class LabRequest(BaseModel):
    class Priority(models.TextChoices):
        ROUTINE = 'ROUTINE', 'عادي'
        HIGH = 'HIGH', 'عالي'
        URGENT = 'URGENT', 'عاجل'

    visit = models.ForeignKey(
        ClinicVisit, on_delete=models.CASCADE, related_name='lab_requests', verbose_name='الزيارة'
    )
    sample_type = models.CharField(max_length=30, verbose_name='نوع العينة')
    disease = models.ForeignKey(
        'laboratory.Disease', on_delete=models.PROTECT, related_name='lab_requests', verbose_name='المرض'
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.ROUTINE, verbose_name='الأولوية'
    )
    barcode = models.CharField(max_length=50, unique=True, verbose_name='الباركود')
    status = models.CharField(max_length=20, default='REQUESTED', verbose_name='الحالة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'طلب مخبري'
        verbose_name_plural = 'الطلبات المخبرية'

    def __str__(self):
        return self.barcode

    def save(self, *args, **kwargs):
        if not self.barcode:
            self.barcode = f'LAB-{uuid.uuid4().hex[:8].upper()}'
        super().save(*args, **kwargs)


class IsolationRecord(BaseModel):
    class IsolationType(models.TextChoices):
        HOSPITAL = 'HOSPITAL', 'تحويل للمستشفى'
        CLINIC_ISOLATION = 'CLINIC_ISOLATION', 'عزل بالعيادة'
        QUARANTINE = 'QUARANTINE', 'حجر صحي إجباري'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'جاري'
        RELEASED = 'RELEASED', 'خروج'
        REMOVED = 'REMOVED', 'إنهاء/إلغاء'

    class HealthStatus(models.TextChoices):
        STABLE = 'STABLE', 'مستقر'
        IMPROVING = 'IMPROVING', 'أفضل'
        WORSENING = 'WORSENING', 'تدهور'
        CRITICAL = 'CRITICAL', 'حرج'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MEDIUM = 'MEDIUM', 'متوسط'
        HIGH = 'HIGH', 'مرتفع'
        CRITICAL = 'CRITICAL', 'حرج'

    visit = models.OneToOneField(
        ClinicVisit, on_delete=models.CASCADE, related_name='isolation', verbose_name='الزيارة'
    )
    isolation_type = models.CharField(
        max_length=20, choices=IsolationType.choices, default=IsolationType.CLINIC_ISOLATION, verbose_name='نوع العزل'
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة')
    health_status = models.CharField(
        max_length=10, choices=HealthStatus.choices, default=HealthStatus.STABLE, verbose_name='الحالة الصحية'
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM, verbose_name='درجة الخطورة'
    )
    required_days = models.PositiveIntegerField(default=14, verbose_name='المدة المطلوبة (أيام)')
    start_date = models.DateField(default=timezone.localdate, verbose_name='تاريخ البدء')
    expected_end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء المتوقع')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء الفعلي')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    discharge_summary = models.TextField(blank=True, verbose_name='ملخص الخروج')
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='started_isolation_records', verbose_name='أدخل بواسطة',
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='closed_isolation_records', verbose_name='أغلق بواسطة',
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت البدء')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'سجل عزل'
        verbose_name_plural = 'سجلات العزل'

    def __str__(self):
        return f'{self.visit} - {self.status}'


class HealthCertificate(BaseModel):
    class CertificateType(models.TextChoices):
        CLEARANCE = 'CLEARANCE', 'شهادة خلو من الأمراض'
        NEGATIVE = 'NEGATIVE', 'شهادة نتيجة سلبية'
        MEDICAL = 'MEDICAL', 'تقرير طبي'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'سارية'
        REVOKED = 'REVOKED', 'ملغاة'

    class Verdict(models.TextChoices):
        RELEASE = 'RELEASE', 'خروج/إجازة'
        HOSPITAL = 'HOSPITAL', 'تحويل للمستشفى'
        ISOLATION = 'ISOLATION', 'عزل/حجر صحي'

    visit = models.OneToOneField(
        ClinicVisit, on_delete=models.CASCADE, related_name='health_certificate', verbose_name='الزيارة'
    )
    certificate_number = models.CharField(max_length=40, unique=True, verbose_name='رقم الشهادة')
    certificate_type = models.CharField(
        max_length=20, choices=CertificateType.choices, default=CertificateType.CLEARANCE, verbose_name='نوع الشهادة'
    )
    verdict = models.CharField(
        max_length=20, choices=Verdict.choices, default=Verdict.RELEASE, verbose_name='التوصية النهائية'
    )
    decision = models.TextField(blank=True, verbose_name='مضمون القرار الطبي')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, verbose_name='الحالة')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='issued_health_certificates', verbose_name='أصدر بواسطة',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإصدار')
    valid_until = models.DateField(null=True, blank=True, verbose_name='صالحة حتى')
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name='رمز التحقق')
    verification_path = models.CharField(max_length=200, blank=True, verbose_name='مسار التحقق')

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'شهادة صحية'
        verbose_name_plural = 'الشهادات الصحية'

    def __str__(self):
        return self.certificate_number
