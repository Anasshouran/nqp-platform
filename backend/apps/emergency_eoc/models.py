from django.conf import settings
from django.db import models

from core.models import BaseModel


class EmergencyAlert(BaseModel):
    class AlertType(models.TextChoices):
        RED_ALERT = 'RED_ALERT', 'إنذار أحمر'
        OUTBREAK = 'OUTBREAK', 'تفشٍ'

    class AlertStatus(models.TextChoices):
        NEW = 'NEW', 'جديد'
        PROCESSING = 'PROCESSING', 'قيد المعالجة'
        RESOLVED = 'RESOLVED', 'تم الحل'

    traveler = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name='المسافر',
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name='المنفذ',
    )
    alert_type = models.CharField(max_length=30, choices=AlertType.choices, verbose_name='النوع')
    description = models.TextField(blank=True, verbose_name='الوصف')
    location_geo = models.JSONField(default=dict, blank=True, verbose_name='الموقع الجغرافي')
    status = models.CharField(
        max_length=20, choices=AlertStatus.choices, default=AlertStatus.NEW, verbose_name='الحالة'
    )
    triggered_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإطلاق')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإنهاء')

    class Meta:
        ordering = ['-triggered_at']
        verbose_name = 'إنذار طوارئ'
        verbose_name_plural = 'إنذارات الطوارئ'

    def __str__(self):
        return f'{self.alert_type} - {self.status}'


class KillSwitch(BaseModel):
    port = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.CASCADE, related_name='kill_switches', verbose_name='المنفذ'
    )
    activated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='kill_switches',
        verbose_name='مفعل من',
    )
    reason = models.TextField(verbose_name='السبب')
    activated_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التفعيل')
    deactivated_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإلغاء')

    class Meta:
        ordering = ['-activated_at']
        verbose_name = 'مفتاح إيقاف'
        verbose_name_plural = 'مفاتيح الإيقاف'

    def __str__(self):
        return f'{self.port.code} - {self.activated_at}'


class ResponsePlan(BaseModel):
    name = models.CharField(max_length=200, verbose_name='الاسم')
    description = models.TextField(blank=True, verbose_name='الوصف')
    steps = models.JSONField(default=list, blank=True, verbose_name='الخطوات')
    required_resources = models.JSONField(default=dict, blank=True, verbose_name='الموارد المطلوبة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'خطة استجابة'
        verbose_name_plural = 'خطط الاستجابة'

    def __str__(self):
        return self.name


class EmergencyEvent(BaseModel):
    class EventStatus(models.TextChoices):
        IDENTIFIED = 'IDENTIFIED', 'تم التحديد'
        VERIFIED = 'VERIFIED', 'تم التحقق'
        RESPONDING = 'RESPONDING', 'قيد الاستجابة'
        CONTROLLED = 'CONTROLLED', 'تحت السيطرة'
        CLOSED = 'CLOSED', 'مغلق'
        REJECTED = 'REJECTED', 'مرفوض'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MODERATE = 'MODERATE', 'متوسط'
        HIGH = 'HIGH', 'عالي'
        CRITICAL = 'CRITICAL', 'حرج'

    class SourceType(models.TextChoices):
        SCREENING = 'SCREENING', 'فحص'
        LAB = 'LAB', 'مختبر'
        CLINIC = 'CLINIC', 'عيادة'
        PUBLIC = 'PUBLIC', 'عام'
        COMMUNITY = 'COMMUNITY', 'مجتمع'
        EBS = 'EBS', 'ترصد قائم على الأحداث'
        RUMOR = 'RUMOR', 'إشاعة'
        OTHER = 'OTHER', 'أخرى'

    event_number = models.CharField(max_length=20, unique=True, default='', verbose_name='رقم الحدث')
    title = models.CharField(max_length=200, verbose_name='العنوان')
    description = models.TextField(verbose_name='الوصف')
    event_type = models.CharField(max_length=100, blank=True, verbose_name='نوع الحدث')
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_events',
        verbose_name='المرض',
    )
    syndrome = models.CharField(max_length=100, blank=True, verbose_name='المتلازمة')
    case_count = models.PositiveIntegerField(default=0, verbose_name='عدد الحالات')
    death_count = models.PositiveIntegerField(default=0, verbose_name='عدد الوفيات')
    source_type = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.OTHER, verbose_name='المصدر')
    source_id = models.UUIDField(null=True, blank=True, verbose_name='معرف المصدر')
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MODERATE, verbose_name='الخطورة')
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.IDENTIFIED, verbose_name='الحالة'
    )
    location_port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_events',
        verbose_name='المنفذ',
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_events',
        verbose_name='المحلية',
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_events',
        verbose_name='الوحدة الصحية',
    )
    affected_travelers = models.ManyToManyField(
        'travelers.Traveler', related_name='emergency_events', blank=True, verbose_name='المسافرون المتأثرون'
    )
    response_plan = models.ForeignKey(
        ResponsePlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        verbose_name='خطة الاستجابة',
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_events',
        verbose_name='المُبلغ',
    )
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت البلاغ')
    summary = models.TextField(blank=True, verbose_name='الملخص')
    lessons_learned = models.TextField(blank=True, verbose_name='الدروس المستفادة')
    recommendations = models.TextField(blank=True, verbose_name='التوصيات')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'حدث طوارئ'
        verbose_name_plural = 'أحداث الطوارئ'

    def __str__(self):
        return f'{self.event_number} - {self.title}'


class CrisisTeamMember(BaseModel):
    class Role(models.TextChoices):
        INCIDENT_COMMANDER = 'INCIDENT_COMMANDER', 'قائد الحادث'
        LOGISTICS = 'LOGISTICS', 'اللوجستيات'
        MEDICAL_TEAM = 'MEDICAL_TEAM', 'فريق طبي'
        COMMUNICATIONS = 'COMMUNICATIONS', 'الاتصالات'

    event = models.ForeignKey(
        EmergencyEvent, on_delete=models.CASCADE, related_name='team_members', verbose_name='الحدث'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='crisis_roles',
        verbose_name='المستخدم',
    )
    role = models.CharField(max_length=30, choices=Role.choices, verbose_name='الدور')

    class Meta:
        unique_together = ['event', 'user', 'role']
        verbose_name = 'عضو فريق أزمة'
        verbose_name_plural = 'أعضاء فريق الأزمات'

    def __str__(self):
        return f'{self.user} - {self.role}'


class ReportableDisease(BaseModel):
    """مرض واجب الإبلاغ — تهيئة زمن الإبلاغ ونمط الترصد وعتبة الإنذار المبكر."""

    class NotificationTimeline(models.TextChoices):
        IMMEDIATE = 'IMMEDIATE', 'فوري'
        WITHIN_24H = 'WITHIN_24H', 'خلال 24 ساعة'
        WEEKLY = 'WEEKLY', 'أسبوعي'

    class SurveillanceMode(models.TextChoices):
        CASE_BASED = 'CASE_BASED', 'ترصد قائم على الحالات'
        AGGREGATE = 'AGGREGATE', 'ترصد تجميعي'
        SYNDROME = 'SYNDROME', 'ترصد بالمتلازمات'

    disease = models.OneToOneField(
        'laboratory.Disease',
        on_delete=models.CASCADE,
        related_name='reportable',
        verbose_name='المرض',
    )
    notification_timeline = models.CharField(
        max_length=20, choices=NotificationTimeline.choices, default=NotificationTimeline.WITHIN_24H,
        verbose_name='زمن الإبلاغ',
    )
    surveillance_mode = models.CharField(
        max_length=20, choices=SurveillanceMode.choices, default=SurveillanceMode.CASE_BASED,
        verbose_name='نمط الترصد',
    )
    ewars_threshold = models.PositiveIntegerField(default=2, verbose_name='عتبة الإنذار المبكر')
    window_days = models.PositiveIntegerField(default=7, verbose_name='نافذة الرصد (أيام)')
    baseline_weeks = models.PositiveIntegerField(default=8, verbose_name='أسابيع خط الأساس')
    notified_roles = models.JSONField(default=list, blank=True, verbose_name='أدوار الإشعار')
    is_enabled = models.BooleanField(default=True, verbose_name='مفعّل')

    class Meta:
        ordering = ['disease__name_ar']
        verbose_name = 'مرض واجب الإبلاغ'
        verbose_name_plural = 'الأمراض واجبة الإبلاغ'

    def __str__(self):
        return str(self.disease.name_ar or self.disease.name_en)


class HealthCase(BaseModel):
    """سجل الحالة الموحّد للترصد الصحي (حالة مشتبهة/محتملة/مؤكدة/منفية)."""

    class CaseType(models.TextChoices):
        SUSPECTED = 'SUSPECTED', 'مشتبه'
        PROBABLE = 'PROBABLE', 'محتمل'
        CONFIRMED = 'CONFIRMED', 'مؤكد'
        NOT_A_CASE = 'NOT_A_CASE', 'منفي'

    class Status(models.TextChoices):
        UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'قيد التحقيق'
        ISOLATED = 'ISOLATED', 'معزول'
        UNDER_TREATMENT = 'UNDER_TREATMENT', 'قيد العلاج'
        RECOVERED = 'RECOVERED', 'تعافى'
        DEAD = 'DEAD', 'وفاة'
        LOST_FOLLOWUP = 'LOST_FOLLOWUP', 'فقد المتابعة'
        CLOSED = 'CLOSED', 'مغلق'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفض'
        MODERATE = 'MODERATE', 'متوسط'
        HIGH = 'HIGH', 'عالي'
        CRITICAL = 'CRITICAL', 'حرج'

    class Sex(models.TextChoices):
        MALE = 'M', 'ذكر'
        FEMALE = 'F', 'أنثى'
        UNKNOWN = 'U', 'غير محدد'

    class Source(models.TextChoices):
        SCREENING = 'SCREENING', 'فحص نقاط الدخول'
        LAB = 'LAB', 'مختبر'
        CLINIC = 'CLINIC', 'عيادة'
        EVENT = 'EVENT', 'حدث صحي'
        EBS = 'EBS', 'ترصد قائم على الأحداث'
        COMMUNITY = 'COMMUNITY', 'مجتمع'
        PUBLIC = 'PUBLIC', 'إبلاغ عام'
        MANUAL = 'MANUAL', 'إدخال يدوي'

    case_number = models.CharField(max_length=30, unique=True, default='', verbose_name='رقم الحالة')
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name='المرض',
    )
    case_type = models.CharField(
        max_length=20, choices=CaseType.choices, default=CaseType.SUSPECTED, verbose_name='نوع الحالة'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UNDER_INVESTIGATION, verbose_name='الحالة'
    )
    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.MODERATE, verbose_name='الخطورة'
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.MANUAL, verbose_name='مصدر الرصد'
    )
    traveler = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_cases',
        verbose_name='المسافر',
    )
    person_name = models.CharField(max_length=200, blank=True, verbose_name='اسم الشخص')
    person_age = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='العمر')
    person_sex = models.CharField(max_length=1, choices=Sex.choices, default=Sex.UNKNOWN, verbose_name='الجنس')
    nationality = models.CharField(max_length=120, blank=True, verbose_name='الجنسية')
    occupation = models.CharField(max_length=120, blank=True, verbose_name='المهنة')
    phone = models.CharField(max_length=30, blank=True, verbose_name='رقم الجوال')
    passport_number = models.CharField(max_length=40, blank=True, verbose_name='رقم الجواز')
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_cases',
        verbose_name='المنفذ',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_cases',
        verbose_name='القطاع',
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_cases',
        verbose_name='المحلية',
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='health_cases',
        verbose_name='الوحدة الصحية',
    )
    event = models.ForeignKey(
        EmergencyEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name='الحدث الصحي',
    )
    lab_result = models.ForeignKey(
        'laboratory.LabResult',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name='نتيجة المختبر',
    )
    case_definition = models.ForeignKey(
        'laboratory.DiseaseCaseDefinition',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cases',
        verbose_name='تعريف الحالة',
    )
    onset_date = models.DateField(null=True, blank=True, verbose_name='تاريخ بدء الأعراض')
    reported_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الإبلاغ')
    confirmation_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التأكيد')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    risk_factors = models.JSONField(default=list, blank=True, verbose_name='عوامل الخطر')
    exposure_history = models.TextField(blank=True, verbose_name='سجل التعرض')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_cases',
        verbose_name='المُبلغ',
    )

    class Meta:
        ordering = ['-reported_date', '-created_at']
        verbose_name = 'حالة ترصد'
        verbose_name_plural = 'حالات الترصد'

    def __str__(self):
        return f'{self.case_number} - {self.person_name or self.traveler or self.pk}'


class CaseStatusLog(BaseModel):
    """أرشيف انتقالات نوع/حالة الحالة."""

    class Field(models.TextChoices):
        CASE_TYPE = 'case_type', 'نوع الحالة'
        STATUS = 'status', 'الحالة'

    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='status_logs', verbose_name='الحالة'
    )
    field = models.CharField(max_length=20, choices=Field.choices, verbose_name='الحقل')
    old_value = models.CharField(max_length=50, blank=True, verbose_name='القيمة السابقة')
    new_value = models.CharField(max_length=50, verbose_name='القيمة الجديدة')
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='case_status_logs',
        verbose_name='من قبل',
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التغيير')

    class Meta:
        ordering = ['-changed_at']
        verbose_name = 'سجل انتقال حالة'
        verbose_name_plural = 'سجلات انتقالات الحالات'

    def __str__(self):
        return f'{self.case.case_number} - {self.field}: {self.old_value} → {self.new_value}'


class SurveillanceAlert(BaseModel):
    """إنذار مبكر (EWARS) ناتج عن تجاوز عتبة أو حدث فردي أو نتيجة مختبر."""

    class AlertType(models.TextChoices):
        EWARS_THRESHOLD = 'EWARS_THRESHOLD', 'تجاوز عتبة'
        SINGLE_EVENT = 'SINGLE_EVENT', 'حدث فردي'
        LAB_POSITIVE = 'LAB_POSITIVE', 'نتيجة مختبر إيجابية'
        CONFIRMED_OUTBREAK = 'CONFIRMED_OUTBREAK', 'تفشٍ مؤكد'

    class Level(models.TextChoices):
        LEVEL_0 = 'LEVEL_0', 'جاهزية طبيعية'
        LEVEL_1 = 'LEVEL_1', 'مراقبة معززة'
        LEVEL_2 = 'LEVEL_2', 'استجابة محددة'
        LEVEL_3 = 'LEVEL_3', 'استجابة شاملة'

    class Status(models.TextChoices):
        NEW = 'NEW', 'جديد'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'تم الإقرار'
        RESPONDING = 'RESPONDING', 'قيد الاستجابة'
        CLOSED = 'CLOSED', 'مغلق'

    alert_number = models.CharField(max_length=30, unique=True, default='', verbose_name='رقم الإنذار')
    alert_type = models.CharField(
        max_length=20, choices=AlertType.choices, default=AlertType.EWARS_THRESHOLD, verbose_name='النوع'
    )
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.LEVEL_1, verbose_name='المستوى')
    title = models.CharField(max_length=250, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_alerts',
        verbose_name='المرض',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_alerts',
        verbose_name='القطاع',
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_alerts',
        verbose_name='المحلية',
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_alerts',
        verbose_name='المنفذ',
    )
    event = models.ForeignKey(
        EmergencyEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_alerts',
        verbose_name='الحدث',
    )
    cases = models.ManyToManyField(HealthCase, related_name='alerts', blank=True, verbose_name='الحالات')
    trigger = models.JSONField(default=dict, blank=True, verbose_name='بيانات الإثارة')
    case_count = models.PositiveIntegerField(default=0, verbose_name='عدد الحالات')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, verbose_name='الحالة')
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التوليد')
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_surveillance_alerts',
        verbose_name='أُغلق بواسطة',
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-generated_at']
        verbose_name = 'إنذار ترصد مبكر'
        verbose_name_plural = 'إنذارات الترصد المبكر'

    def __str__(self):
        return f'{self.alert_number} - {self.level} - {self.status}'


class ContactTrace(BaseModel):
    """مخالط لحالة مؤشرة — تتبع يومي خلال فترة الحضانة."""

    class ContactType(models.TextChoices):
        FAMILY = 'FAMILY', 'أسرة'
        WORK = 'WORK', 'عمل'
        SOCIAL = 'SOCIAL', 'اجتماعي'
        HEALTHCARE = 'HEALTHCARE', 'رعاية صحية'
        TRAVEL = 'TRAVEL', 'سفر'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        UNDER_MONITORING = 'UNDER_MONITORING', 'تحت المراقبة'
        COMPLETED = 'COMPLETED', 'أكمل المتابعة'
        SYMPTOMATIC = 'SYMPTOMATIC', 'يظهر أعراضاً'
        CONVERTED_CASE = 'CONVERTED_CASE', 'تحول إلى حالة'
        LOST = 'LOST', 'فقد'

    contact_number = models.CharField(max_length=30, unique=True, default='', verbose_name='رقم المخالط')
    index_case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, related_name='contacts', verbose_name='الحالة المؤشرة'
    )
    person_name = models.CharField(max_length=200, verbose_name='الاسم')
    age = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='العمر')
    sex = models.CharField(max_length=1, choices=HealthCase.Sex.choices, default=HealthCase.Sex.UNKNOWN, verbose_name='الجنس')
    phone = models.CharField(max_length=30, blank=True, verbose_name='رقم الجوال')
    relationship = models.CharField(max_length=200, blank=True, verbose_name='صلة القرابة/العلاقة')
    contact_type = models.CharField(
        max_length=20, choices=ContactType.choices, default=ContactType.FAMILY, verbose_name='نوع الاتصال'
    )
    last_exposure_date = models.DateField(null=True, blank=True, verbose_name='تاريخ آخر تعرض')
    follow_up_start = models.DateField(null=True, blank=True, verbose_name='بداية المتابعة')
    follow_up_days = models.PositiveIntegerField(default=14, verbose_name='مدة المتابعة (يوم)')
    location = models.CharField(max_length=200, blank=True, verbose_name='الموقع')
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_traces',
        verbose_name='المنفذ',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_traces',
        verbose_name='القطاع',
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UNDER_MONITORING, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مخالط'
        verbose_name_plural = 'المخالطون'

    def __str__(self):
        return f'{self.contact_number} - {self.person_name}'


class ContactFollowUp(BaseModel):
    """زيارة متابعة يومية لمخالط (حرارة/أعراض/تحويل إلى حالة)."""

    class Status(models.TextChoices):
        OK = 'OK', 'لا أعراض'
        SYMPTOMATIC = 'SYMPTOMATIC', 'يظهر أعراضاً'
        CONVERTED = 'CONVERTED', 'تحول إلى حالة'

    contact = models.ForeignKey(
        ContactTrace, on_delete=models.CASCADE, related_name='follow_ups', verbose_name='المخالط'
    )
    check_date = models.DateField(auto_now_add=True, verbose_name='تاريخ الفحص')
    temperature = models.FloatField(null=True, blank=True, verbose_name='درجة الحرارة')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OK, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_follow_ups',
        verbose_name='الفحص بواسطة',
    )

    class Meta:
        ordering = ['-check_date', '-created_at']
        verbose_name = 'متابعة مخالط'
        verbose_name_plural = 'متابعات المخالطين'

    def __str__(self):
        return f'{self.contact.contact_number} - {self.check_date} - {self.status}'


class Investigation(BaseModel):
    """تحقيق وبائي مرتبط بحالة أو حدث."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوح'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        COMPLETED = 'COMPLETED', 'مكتمل'
        CLOSED = 'CLOSED', 'مغلق'

    investigation_number = models.CharField(max_length=30, unique=True, default='', verbose_name='رقم التحقيق')
    case = models.ForeignKey(
        HealthCase, on_delete=models.CASCADE, null=True, blank=True,
        related_name='investigations', verbose_name='الحالة',
    )
    event = models.ForeignKey(
        EmergencyEvent, on_delete=models.CASCADE, null=True, blank=True,
        related_name='investigations', verbose_name='الحدث',
    )
    title = models.CharField(max_length=250, verbose_name='العنوان')
    hypothesis = models.TextField(blank=True, verbose_name='الفرضية')
    method = models.JSONField(default=list, blank=True, verbose_name='المنهجية')
    findings = models.TextField(blank=True, verbose_name='النتائج')
    recommendations = models.TextField(blank=True, verbose_name='التوصيات')
    actions_taken = models.JSONField(default=list, blank=True, verbose_name='الإجراءات المتخذة')
    lead_investigator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lead_investigations',
        verbose_name='رئيس التحقيق',
    )
    team = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='investigations', blank=True, verbose_name='الفريق')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة')
    started_at = models.DateField(auto_now_add=True, verbose_name='تاريخ البدء')
    completed_at = models.DateField(null=True, blank=True, verbose_name='تاريخ الاكتمال')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'تحقيق وبائي'
        verbose_name_plural = 'التحقيقات الوبائية'

    def __str__(self):
        return f'{self.investigation_number} - {self.title}'


class WeeklySurveillanceReport(BaseModel):
    """بلاغ أسبوعي عن وحدة إبلاغ (وحدة صحية أو نقطة دخول)."""

    report_number = models.CharField(max_length=30, unique=True, default='', verbose_name='رقم البلاغ')
    period_start = models.DateField(verbose_name='بداية الفترة')
    period_end = models.DateField(verbose_name='نهاية الفترة')
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weekly_reports',
        verbose_name='الوحدة الصحية',
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weekly_reports',
        verbose_name='نقطة الدخول',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weekly_reports',
        verbose_name='القطاع',
    )
    is_on_time = models.BooleanField(default=False, verbose_name='في الموعد')
    data_quality_issues = models.JSONField(default=list, blank=True, verbose_name='مشكلات جودة البيانات')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_weekly_reports',
        verbose_name='مقدم البلاغ',
    )
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإرسال')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_weekly_reports',
        verbose_name='المراجع',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')

    class Meta:
        unique_together = ['period_start', 'period_end', 'health_facility', 'port']
        ordering = ['-submitted_at']
        verbose_name = 'بلاغ أسبوعي'
        verbose_name_plural = 'البلاغات الأسبوعية'

    def __str__(self):
        return f'{self.report_number} - {self.period_start} / {self.period_end}'


class WeeklyReportLine(BaseModel):
    """سطر بلاغ أسبوعي: عدّادات مرض/متلازمة + حالات مشتبهة/وفيات."""

    report = models.ForeignKey(
        WeeklySurveillanceReport, on_delete=models.CASCADE, related_name='lines', verbose_name='البلاغ'
    )
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weekly_lines',
        verbose_name='المرض',
    )
    syndrome = models.CharField(max_length=100, blank=True, verbose_name='المتلازمة')
    new_cases = models.PositiveIntegerField(default=0, verbose_name='حالات جديدة')
    new_suspected = models.PositiveIntegerField(default=0, verbose_name='حالات مشتبهة')
    deaths = models.PositiveIntegerField(default=0, verbose_name='وفيات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سطر بلاغ أسبوعي'
        verbose_name_plural = 'أسطر البلاغات الأسبوعية'

    def __str__(self):
        return f'{self.report.report_number} - {self.disease or self.syndrome}'
