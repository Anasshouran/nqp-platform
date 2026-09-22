import hashlib
import secrets

from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.utils import timezone

from core.models import BaseModel

# مفاتيح عدّادات معدل الطلبات في Django Cache (Redis عند التفعيل، LocMem محلياً)
_RATE_KEY_MIN = 'nqp:rl:{carrier_id}:min:{epoch}'
_RATE_KEY_DAY = 'nqp:rl:{carrier_id}:day:{date}'


class ComplianceClass(models.TextChoices):
    """تصنيف الامتثال الصحي لشركة النقل (يظهر في لوحة الشركاء وتقارير الالتزام)."""

    NA = 'N', 'غير مصنف'
    BRONZE = 'B', 'برونزي'
    SILVER = 'S', 'فضي'
    GOLD = 'G', 'ذهبي'


class CarrierRegistrationStatus(models.TextChoices):
    """حالة تسجيل شركة النقل في بوابة الشركاء وسير عمل المراجعة."""

    PENDING = 'PENDING', 'قيد المراجعة'
    APPROVED = 'APPROVED', 'معتمدة'
    REJECTED = 'REJECTED', 'مرفوضة'
    SUSPENDED = 'SUSPENDED', 'موقوفة'


class CarrierCompanyType(models.TextChoices):
    """نوع شركة النقل (تُدار في شاشة إضافة شركة طيران)."""

    NATIONAL = 'NATIONAL', 'شركة طيران وطنية'
    REGIONAL = 'REGIONAL', 'شركة طيران إقليمية'
    INTERNATIONAL = 'INTERNATIONAL', 'شركة طيران دولية'
    CARGO = 'CARGO', 'شركة شحن جوي/بحري'
    MARITIME = 'MARITIME', 'شركة ملاحة بحرية'
    LAND = 'LAND', 'شركة نقل بري'
    PRIVATE = 'PRIVATE', 'خاصة'
    OTHER = 'OTHER', 'أخرى'


class Carrier(BaseModel):
    name = models.CharField(max_length=200, verbose_name='الاسم')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    company_type = models.CharField(
        max_length=20, choices=CarrierCompanyType.choices, default=CarrierCompanyType.NATIONAL, verbose_name='نوع الشركة'
    )
    country = models.ForeignKey(
        'travelers.Country', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='carriers', verbose_name='الدولة',
    )
    ports = models.ManyToManyField(
        'masterdata.EntryPoint', related_name='carriers', blank=True, verbose_name='المنافذ'
    )
    iata_code = models.CharField(max_length=3, unique=True, null=True, blank=True, verbose_name='كود IATA')
    icao_code = models.CharField(max_length=4, unique=True, null=True, blank=True, verbose_name='كود ICAO')
    contact_info = models.JSONField(default=dict, blank=True, verbose_name='معلومات الاتصال')
    email = models.EmailField(blank=True, verbose_name='البريد الرسمي')
    phone = models.CharField(max_length=30, blank=True, verbose_name='رقم الهاتف')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    logo_url = models.URLField(blank=True, verbose_name='الشعار (رابط)')

    # ----------------------------
    # حوكمة البوابة المؤسسية — بيانات اعتماد العميل (Client Credentials)
    # ----------------------------
    client_id = models.CharField(max_length=40, unique=True, null=True, blank=True, verbose_name='معرّف العميل (Client ID)')
    client_secret_encrypted = models.BinaryField(null=True, blank=True, verbose_name='سر العميل (مُشفّر)')
    client_secret_created_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ إنشاء سر العميل')

    # ----------------------------
    # التحكم بالوصول (Access Control)
    # ----------------------------
    allowed_ips = models.JSONField(default=list, blank=True, verbose_name='عناوين IP المسموحة')
    rate_limit_per_minute = models.PositiveIntegerField(default=120, verbose_name='حد الطلبات في الدقيقة')
    rate_limit_daily = models.PositiveIntegerField(default=10000, verbose_name='حد الطلبات اليومي')
    api_scopes = models.JSONField(default=list, blank=True, verbose_name='صلاحيات API (Scopes)')

    # ----------------------------
    # حالة التسجيل والمراجعة (Registration / Review Workflow)
    # ----------------------------
    registration_status = models.CharField(
        max_length=20,
        choices=CarrierRegistrationStatus.choices,
        default=CarrierRegistrationStatus.APPROVED,
        verbose_name='حالة التسجيل',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reviewed_carriers', verbose_name='راجعها',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ المراجعة')
    review_notes = models.TextField(blank=True, verbose_name='ملاحظات المراجعة')
    compliance_class = models.CharField(
        max_length=10, choices=ComplianceClass.choices, default=ComplianceClass.NA, verbose_name='تصنيف الامتثال'
    )

    # ----------------------------
    # مراقبة وخطأ البوابة
    # ----------------------------
    api_error_count = models.PositiveIntegerField(default=0, verbose_name='عدد أخطاء API')
    last_api_error_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر خطأ API')
    last_health_event_sync_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر مزامنة حدث صحي')

    api_key = models.CharField(max_length=80, unique=True, null=True, blank=True, verbose_name='بصمة مفتاح API (SHA-256)')
    api_key_display = models.CharField(max_length=40, blank=True, default='', verbose_name='معاينة المفتاح (معرّف للعرض فقط)')
    api_key_created_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ إنشاء المفتاح')
    last_api_use_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر استخدام للمفتاح')
    last_api_use_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP لآخر استخدام')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'شركة نقل'
        verbose_name_plural = 'شركات النقل'

    def __str__(self):
        return self.name

    def generate_api_key(self):
        """يولّد مفتاحاً جديداً ويعيد النص الكامل مرة واحدة فقط.

        يُخزَّن في قاعدة البيانات بصمة SHA-256 للمفتاح فقط (مع معاينة مقنّعة
        للعرض)، ولا يُحفَظ النص الكامل أبداً — من يتعرض لقاعدة البيانات لا
        يملك المفاتيح، ومن يصل لواجهة العرض لا يرى إلا معاينة.
        """
        key = 'nqp_' + secrets.token_urlsafe(40)
        self.api_key = self.hash_key(key)
        self.api_key_display = self.preview_key(key)
        self.api_key_created_at = timezone.now()
        return key

    @staticmethod
    def hash_key(key):
        return hashlib.sha256(key.encode('utf-8')).hexdigest()

    @staticmethod
    def preview_key(key):
        return f'{key[:7]}••••{key[-4:]}'

    @property
    def has_api_key(self):
        return bool(self.api_key)


class CarrierMember(BaseModel):
    """عضو فريق شركة النقل (ممثل البوابة في المنصة) — يربط مستخدم المنصة بالشركة."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='carrier_memberships', verbose_name='المستخدم'
    )
    carrier = models.ForeignKey(
        Carrier, on_delete=models.CASCADE, related_name='members', verbose_name='شركة النقل'
    )
    is_primary = models.BooleanField(default=False, verbose_name='الممثل الرئيسي')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        verbose_name = 'عضو شركة النقل'
        verbose_name_plural = 'أعضاء شركات النقل'
        ordering = ['carrier', '-is_primary', 'user__full_name']
        constraints = [
            models.UniqueConstraint(fields=['user', 'carrier'], name='uq_carriermember_user_carrier')
        ]

    def __str__(self):
        return f'{self.user} - {self.carrier.name}'


class CarrierApiUsageLog(BaseModel):
    """سجل تدقيق مؤسسي لكل استدعاء بوابة (كل طلب API يُسجَّل لأغراض المراجعة والامتثال)."""

    carrier = models.ForeignKey(
        Carrier, on_delete=models.CASCADE, related_name='api_usage_logs', verbose_name='شركة النقل'
    )
    endpoint = models.CharField(max_length=255, verbose_name='الموارد (Endpoint)')
    method = models.CharField(max_length=10, verbose_name='الطريقة (Method)')
    status_code = models.PositiveIntegerField(default=0, verbose_name='رمز الاستجابة')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    user_agent = models.TextField(blank=True, verbose_name='وكيل المستخدم')
    latency_ms = models.PositiveIntegerField(default=0, verbose_name='زمن الاستجابة (مللي ثانية)')
    is_rate_limited = models.BooleanField(default=False, verbose_name='تم خفض الحد')
    error_message = models.TextField(blank=True, verbose_name='رسالة الخطأ')
    request_payload = models.JSONField(default=dict, blank=True, verbose_name='الحمولة المرسلة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل استخدام API'
        verbose_name_plural = 'سجلات استخدام API'


class CarrierRegistrationRequest(BaseModel):
    """طلب تسجيل شركة نقل في البوابة المؤسسية — يُراجع من قبل مسؤول المنصة قبل الاعتماد."""

    class RegistrationStatus(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار المراجعة'
        APPROVED = 'APPROVED', 'مقبول'
        REJECTED = 'REJECTED', 'مرفوض'

    carrier = models.ForeignKey(
        Carrier, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='registration_requests', verbose_name='شركة النقل الناتجة',
    )
    company_name = models.CharField(max_length=200, verbose_name='اسم الشركة')
    iata_code = models.CharField(max_length=3, blank=True, verbose_name='كود IATA')
    icao_code = models.CharField(max_length=4, blank=True, verbose_name='كود ICAO')
    contact_name = models.CharField(max_length=150, verbose_name='اسم جهة الاتصال')
    email = models.EmailField(verbose_name='البريد')
    phone = models.CharField(max_length=30, blank=True, verbose_name='رقم الجوال')
    address = models.CharField(max_length=255, blank=True, verbose_name='العنوان')
    documents = models.JSONField(default=list, blank=True, verbose_name='مستندات الإثبات (روابط)')
    requested_scopes = models.JSONField(default=list, blank=True, verbose_name='الصلاحيات المطلوبة')
    status = models.CharField(
        max_length=20, choices=RegistrationStatus.choices, default=RegistrationStatus.PENDING,
        verbose_name='الحالة',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='carrier_registration_submissions', verbose_name='قدّم الطلب',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='carrier_registration_reviews', verbose_name='راجعها',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ المراجعة')
    review_notes = models.TextField(blank=True, verbose_name='ملاحظات المراجعة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'طلب تسجيل شركة نقل'
        verbose_name_plural = 'طلبات تسجيل شركات النقل'

    def __str__(self):
        return f'{self.company_name} ({self.get_status_display()})'


class NoticeAcknowledgement(BaseModel):
    """تأكيد اطلاع شركة النقل على إشعار صحي."""

    carrier = models.ForeignKey(
        Carrier, on_delete=models.CASCADE, related_name='notice_acknowledgements', verbose_name='شركة النقل'
    )
    notice = models.ForeignKey(
        'HealthNotice', on_delete=models.CASCADE, related_name='acknowledgements', verbose_name='الإشعار'
    )
    acknowledged_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ الاطلاع')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['carrier', 'notice'], name='unique_carrier_notice_ack'),
        ]
        verbose_name = 'إقرار إشعار'
        verbose_name_plural = 'إقرارات الإشعارات'

    def __str__(self):
        return f'{self.carrier.name} → {self.notice.title}'


class Flight(BaseModel):
    class FlightType(models.TextChoices):
        AIR = 'AIR', 'جوي'
        SEA = 'SEA', 'بحري'
        LAND = 'LAND', 'بري'

    class FlightStatus(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'مجدولة'
        MANIFEST_UPLOADED = 'MANIFEST_UPLOADED', 'تم رفع الكشف'
        IN_TRANSIT = 'IN_TRANSIT', 'في الطريق'
        ARRIVED = 'ARRIVED', 'وصلت'
        CANCELLED = 'CANCELLED', 'ملغاة'

    flight_number = models.CharField(max_length=20, verbose_name='رقم الرحلة')
    carrier = models.ForeignKey(
        Carrier, on_delete=models.PROTECT, related_name='flights', verbose_name='شركة النقل'
    )
    flight_type = models.CharField(
        max_length=10, choices=FlightType.choices, default=FlightType.AIR, verbose_name='النوع'
    )
    aircraft_type = models.CharField(max_length=30, blank=True, verbose_name='نوع الطائرة/الوسيلة')
    crew_count = models.PositiveIntegerField(default=0, verbose_name='عدد أفراد الطاقم')
    previous_origin_code = models.CharField(max_length=10, blank=True, verbose_name='رمز آخر محطة سابقة')
    origin_code = models.CharField(max_length=10, verbose_name='رمز المغادرة')
    origin_country = models.ForeignKey(
        'travelers.Country',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='flights_origin',
        verbose_name='دولة المغادرة',
    )
    destination_port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.PROTECT,
        related_name='flights',
        verbose_name='المنفذ الوجهة',
    )
    scheduled_departure = models.DateTimeField(null=True, blank=True, verbose_name='موعد المغادرة')
    scheduled_arrival = models.DateTimeField(verbose_name='موعد الوصول')
    status = models.CharField(
        max_length=20, choices=FlightStatus.choices, default=FlightStatus.SCHEDULED, verbose_name='الحالة'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-scheduled_arrival']
        verbose_name = 'رحلة'
        verbose_name_plural = 'الرحلات'

    def __str__(self):
        return self.flight_number


class PassengerManifest(BaseModel):
    class ManifestStatus(models.TextChoices):
        UPLOADED = 'UPLOADED', 'تم الرفع'
        PROCESSING = 'PROCESSING', 'قيد المعالجة'
        COMPLETED = 'COMPLETED', 'مكتمل'
        FAILED = 'FAILED', 'فشل'

    flight = models.ForeignKey(
        Flight, on_delete=models.CASCADE, related_name='manifests', verbose_name='الرحلة'
    )
    file = models.FileField(upload_to='manifests/%Y/%m/', null=True, blank=True, verbose_name='الملف')
    status = models.CharField(
        max_length=20, choices=ManifestStatus.choices, default=ManifestStatus.UPLOADED, verbose_name='الحالة'
    )
    total_passengers = models.PositiveIntegerField(default=0, verbose_name='عدد المسافرين')
    error_report = models.JSONField(default=dict, blank=True, verbose_name='تقرير الأخطاء')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المعالجة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'كشف المسافرين'
        verbose_name_plural = 'كشوف المسافرين'

    def __str__(self):
        return f'{self.flight.flight_number} - {self.id}'


class ManifestPassengerGender(models.TextChoices):
    """جنس المسافر في الكشف — قيم إضافية للتحليل الوبائي والربط بدولة القادمين."""

    UNSPECIFIED = 'X', 'غير محدد'
    MALE = 'M', 'ذكر'
    FEMALE = 'F', 'أنثى'


class ManifestPassenger(BaseModel):
    manifest = models.ForeignKey(
        PassengerManifest, on_delete=models.CASCADE, related_name='passengers', verbose_name='الكشف'
    )
    passport_number = models.CharField(max_length=20, verbose_name='رقم جواز السفر')
    first_name = models.CharField(max_length=100, verbose_name='الاسم الأول')
    last_name = models.CharField(max_length=100, verbose_name='اسم العائلة')
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='تاريخ الميلاد')
    nationality = models.ForeignKey(
        'travelers.Country',
        on_delete=models.PROTECT,
        related_name='manifest_passengers',
        verbose_name='الجنسية',
    )
    seat_number = models.CharField(max_length=10, blank=True, verbose_name='رقم المقعد')
    gender = models.CharField(
        max_length=1, choices=ManifestPassengerGender.choices, default=ManifestPassengerGender.UNSPECIFIED,
        verbose_name='الجنس',
    )
    previous_country = models.ForeignKey(
        'travelers.Country', on_delete=models.PROTECT, null=True, blank=True,
        related_name='manifest_passengers_previous', verbose_name='دولة المغادرة السابقة',
    )
    is_crew = models.BooleanField(default=False, verbose_name='أحد أفراد الطاقم')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الجوال')
    traveler = models.ForeignKey(
        'travelers.Traveler',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='manifest_entries',
        verbose_name='المسافر المطابق',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مسافر في الكشف'
        verbose_name_plural = 'مسافرو الكشف'

    def __str__(self):
        return f'{self.passport_number} - {self.first_name} {self.last_name}'


class HealthNotice(BaseModel):
    class NoticeCategory(models.TextChoices):
        FLIGHT_SUSPENSION = 'FLIGHT_SUSPENSION', 'تعليق رحلات'
        ENTRY_REQUIREMENTS = 'ENTRY_REQUIREMENTS', 'متطلبات الدخول'
        EPIDEMIC_ALERT = 'EPIDEMIC_ALERT', 'إنذار وبائي'
        GENERAL = 'GENERAL', 'إعلان عام'

    class NoticePriority(models.TextChoices):
        HIGH = 'HIGH', 'عالي'
        MEDIUM = 'MEDIUM', 'متوسط'
        LOW = 'LOW', 'منخفض'

    title = models.CharField(max_length=200, verbose_name='العنوان')
    description = models.TextField(verbose_name='الوصف')
    category = models.CharField(max_length=30, choices=NoticeCategory.choices, verbose_name='الفئة')
    priority = models.CharField(max_length=10, choices=NoticePriority.choices, default=NoticePriority.MEDIUM, verbose_name='الأولوية')
    published_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ النشر')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['-published_at']
        verbose_name = 'إشعار صحي'
        verbose_name_plural = 'الإشعارات الصحية'

    def __str__(self):
        return self.title



class FlightHealthEvent(BaseModel):
    """المستوى الثالث في بوابة التكامل: حدث صحي على متن الرحلة (PHA — واجب الإبلاغ خلال 15 دقيقة).

    تدفق الحالة (Status Flow):
        REPORTED → UNDER_REVIEW → ACTION_REQUIRED → RESOLVED → CLOSED
    خطة الطوارئ (EOC) تُربط تلقائياً عند وجود تصعيد، ويُسجَّل كل انتقال في سجل التدقيق المؤسسي.
    """

    class HealthEventCategory(models.TextChoices):
        SUSPECTED_INFECTION = 'SUSPECTED_INFECTION', 'اشتباه إصابة معدية'
        CONFIRMED_INFECTION = 'CONFIRMED_INFECTION', 'إصابة مؤكدة'
        SYMPTOM_ALERT = 'SYMPTOM_ALERT', 'إنذار أعراض'
        INFLIGHT_DEATH = 'INFLIGHT_DEATH', 'وفاة على المتن'
        MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY', 'طوارئ طبية'
        EXPOSURE_RISK = 'EXPOSURE_RISK', 'خطر تعرّض/مخالطة'
        OTHER = 'OTHER', 'أخرى'

    class Severity(models.TextChoices):
        LOW = 'LOW', 'منخفضة'
        MEDIUM = 'MEDIUM', 'متوسطة'
        HIGH = 'HIGH', 'عالية'
        CRITICAL = 'CRITICAL', 'حرجة'

    class EventStatus(models.TextChoices):
        REPORTED = 'REPORTED', 'تم الإبلاغ'
        UNDER_REVIEW = 'UNDER_REVIEW', 'قيد المراجعة'
        ACTION_REQUIRED = 'ACTION_REQUIRED', 'إجراء مطلوب'
        RESOLVED = 'RESOLVED', 'تمت المعالجة'
        CLOSED = 'CLOSED', 'مغلق'

    flight = models.ForeignKey(
        Flight, on_delete=models.CASCADE, related_name='health_events', verbose_name='الرحلة'
    )
    category = models.CharField(
        max_length=25, choices=HealthEventCategory.choices, default=HealthEventCategory.SUSPECTED_INFECTION,
        verbose_name='الفئة',
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM, verbose_name='الخطورة'
    )
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.REPORTED, verbose_name='الحالة'
    )
    description = models.TextField(verbose_name='الوصف')
    affected_count = models.PositiveIntegerField(default=1, verbose_name='عدد الحالات المؤثرة')
    is_crew_related = models.BooleanField(default=False, verbose_name='تخصّ الطاقم')
    symptoms = models.JSONField(default=list, blank=True, verbose_name='الأعراض')
    reporter_name = models.CharField(max_length=150, blank=True, verbose_name='اسم المُبلّغ')
    reporter_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reported_flight_health_events', verbose_name='المُبلّغ (مستخدم)',
    )
    reported_via = models.CharField(max_length=20, default='API', verbose_name='قناة الإبلاغ')
    reported_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإبلاغ')

    # --- التحضير والاستجابة (Response / Staging) ---
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='assigned_flight_health_events', verbose_name='مُسند إلى',
    )
    assigned_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإسناد')
    quarantine_state = models.CharField(
        max_length=20, blank=True, verbose_name='حالة الحجر/العزل',
        help_text='PENDING / IN_QUARANTINE / ISOLATED / RELEASED',
    )
    health_facility = models.CharField(max_length=200, blank=True, verbose_name='المرفق الصحي المعالج')
    destination_port = models.ForeignKey(
        'masterdata.EntryPoint', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='flight_health_events', verbose_name='منفذ الوصول المعني',
    )
    resolution_notes = models.TextField(blank=True, verbose_name='ملاحظات المعالجة')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المعالجة')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    # --- ربط خطة الطوارئ (EOC) — الحوكمة التصعيدية ---
    emergency_event = models.ForeignKey(
        'emergency_eoc.EmergencyEvent', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='flight_health_events', verbose_name='حدث الطوارئ المرتبط (EOC)',
    )
    escalated_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التصعيد')
    transmitted_to_eoc_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت إرسال الإخطار إلى EOC')

    class Meta:
        ordering = ['-reported_at']
        verbose_name = 'حدث صحي للرحلة'
        verbose_name_plural = 'الأحداث الصحية للرحلات'

    def __str__(self):
        return f'{self.flight.flight_number} - {self.get_category_display()} {self.get_severity_display()}'

    def transition_to(self, new_status, user=None, note=''):
        """انتقال منضبط بين مراحل الحدث مع تسجيل في سجل التدقيق."""
        if new_status == self.status:
            return False
        allowed = {
            self.EventStatus.REPORTED: {self.EventStatus.UNDER_REVIEW, self.EventStatus.RESOLVED, self.EventStatus.CLOSED},
            self.EventStatus.UNDER_REVIEW: {
                self.EventStatus.ACTION_REQUIRED, self.EventStatus.RESOLVED, self.EventStatus.CLOSED,
            },
            self.EventStatus.ACTION_REQUIRED: {self.EventStatus.RESOLVED, self.EventStatus.CLOSED},
            self.EventStatus.RESOLVED: {self.EventStatus.CLOSED},
            self.EventStatus.CLOSED: set(),
        }
        if new_status not in allowed[self.status]:
            raise ValueError('انتقال غير مسموح به في هذا المسار')
        if new_status == self.EventStatus.RESOLVED:
            self.resolved_at = timezone.now()
        if new_status == self.EventStatus.CLOSED:
            self.closed_at = timezone.now()
        FlightHealthEventLog.objects.create(
            event=self, from_status=self.status, to_status=new_status, changed_by=user, note=note,
        )
        self.status = new_status
        self.save(update_fields=['status', 'resolved_at', 'closed_at', 'updated_at'])
        return True

    def escalate_to_eoc(self, user=None, summary=''):
        """تصعيد الحدث إلى خطة الطوارئ (EOC) مع ربط الحدث المركزي."""
        from apps.emergency_eoc.models import EmergencyEvent as EocEvent

        severity_map = {
            self.Severity.LOW: EocEvent.Severity.LOW,
            self.Severity.MEDIUM: EocEvent.Severity.MODERATE,
            self.Severity.HIGH: EocEvent.Severity.HIGH,
            self.Severity.CRITICAL: EocEvent.Severity.CRITICAL,
        }
        ev = EocEvent.objects.create(
            title=f'حدث صحي على متن الرحلة {self.flight.flight_number}',
            description=(summary or self.description)[:2000],
            severity=severity_map.get(self.severity, EocEvent.Severity.MODERATE),
            reported_by=user,
        )
        self.emergency_event = ev
        self.escalated_at = timezone.now()
        self.transmitted_to_eoc_at = timezone.now()
        self.save(update_fields=['emergency_event', 'escalated_at', 'transmitted_to_eoc_at', 'updated_at'])
        return self.emergency_event


class FlightHealthEventLog(BaseModel):
    """سجل تدقيق مؤسسي لكل انتقال حالة في الحدث الصحي للرحلة (PHA)."""

    event = models.ForeignKey(
        FlightHealthEvent, on_delete=models.CASCADE, related_name='status_logs', verbose_name='الحدث'
    )
    from_status = models.CharField(max_length=20, verbose_name='من حالة')
    to_status = models.CharField(max_length=20, verbose_name='إلى حالة')
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='flight_health_transitions', verbose_name='غيّرها',
    )
    note = models.TextField(blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل انتقال حدث صحي'
        verbose_name_plural = 'سجلات انتقال الأحداث الصحية'

    def __str__(self):
        return f'{self.event} : {self.from_status} → {self.to_status}'
