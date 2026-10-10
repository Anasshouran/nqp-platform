from django.db import models

from core.models import BaseModel


class Organization(BaseModel):
    """منظمة أو نظم خارجي شريك/مرسل/مستهلك للبيانات.

    استُحدثت لتحل محل `ExternalEntity` الذي كان يحمل 3 حقول. تضيف
    النوع، البلد، بيانات الاتصال، وحالة نشاط مزامنة. `api_key`
    يُخزّن مشفّراً باستخدام `apps.who.models.WHOIntegration.set_client_secret`
    نفس الخوارزمية — لا plaintext على الإطلاق.

    التوافق مع `ExternalEntity`: لا migration حذف؛ يُعاد تعريف الجدول
    ويُنقل `name`→`name_en`/`name_ar` و`api_key`→`api_key_encrypted`.
    """

    class OrgType(models.TextChoices):
        INTERNATIONAL = 'INTERNATIONAL', 'دولية'
        GOVERNMENT = 'GOVERNMENT', 'حكومية'
        LABORATORY = 'LABORATORY', 'مختبر'
        HOSPITAL = 'HOSPITAL', 'مستشفى'
        PARTNER = 'PARTNER', 'شريك'
        OTHER = 'OTHER', 'أخرى'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'نشط'
        PENDING = 'PENDING', 'معلق'
        INACTIVE = 'INACTIVE', 'غير نشط'

    code = models.CharField(max_length=50, unique=True, verbose_name='الكود')
    name_en = models.CharField(max_length=120, verbose_name='الاسم (إنجليزي)')
    name_ar = models.CharField(max_length=120, verbose_name='الاسم (عربي)')
    org_type = models.CharField(max_length=20, choices=OrgType.choices, verbose_name='النوع')
    country = models.CharField(max_length=2, blank=True, verbose_name='الكود الدولي ISO')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة')

    # بيانات الاتصال — كلها nullable، تُستقبل من ملف الإعداد أو لوحة الإدارة.
    technical_contact_name = models.CharField(max_length=100, blank=True, verbose_name='جهة الاتصال')
    technical_contact_email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    technical_contact_phone = models.CharField(max_length=30, blank=True, verbose_name='الهاتف')

    # ملاحظة: `api_key` لم يعد plaintext — يُستخدم `EncryptedCredentialValue`.
    api_key_encrypted = models.TextField(blank=True, verbose_name='مفتاح API (مشفّر)')

    # حالة المزامنة الأخيرة (تُحدّث من `apps.who` أو webhook handler).
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر مزامنة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_en']
        verbose_name = 'منظمة خارجية'
        verbose_name_plural = 'المنظمات الخارجية'
        # الجدول الأصلي `integration_externalentity` يُحتفظ به عمداً
        # لعدم تكسير التعارف القديمة والمسار `/integration/entities/`.
        db_table = 'integration_externalentity'

    def __str__(self):
        return f'{self.name_en} ({self.get_org_type_display()})'

    @property
    def display_name(self) -> str:
        """الاسم العرضي حسب لغة الواجهة (fallback إلى الإنجليزية)."""
        return self.name_en or self.name_ar


class DeveloperApp(BaseModel):
    """تطبيق خارجي مسجل في بوابة المطورين للحصول على مفتاح API."""

    name = models.CharField(max_length=100, verbose_name='اسم التطبيق')
    description = models.TextField(blank=True, verbose_name='الوصف')
    api_key = models.CharField(max_length=64, unique=True, editable=False, verbose_name='مفتاح API')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'تطبيق مطور'
        verbose_name_plural = 'تطبيقات المطورين'

    def save(self, *args, **kwargs):
        if not self.api_key:
            self.api_key = self._generate_key()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_key():
        import secrets

        return f'nqp_{secrets.token_hex(24)}'

    def __str__(self):
        return self.name


class WebhookEndpoint(BaseModel):
    """نقطة تلقي الويب هوك لتطبيق مطور مسجل."""

    app = models.ForeignKey(DeveloperApp, on_delete=models.CASCADE, related_name='webhooks', verbose_name='التطبيق')
    event_type = models.CharField(max_length=50, verbose_name='نوع الحدث')
    endpoint_url = models.URLField(verbose_name='رابط النقطة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['app', 'event_type']
        verbose_name = 'نقطة ويب هوك'
        verbose_name_plural = 'نقاط الويب هوك'

    def __str__(self):
        return f'{self.app.name} - {self.event_type}'


class IntegrationLog(BaseModel):
    """سجل مراقبة كل عملية تبادل مع نظام خارجي.

    حقول `Direction`/`Status`/`error_message`/`duration_ms`/`correlation_id`
    أُضيفت لمراقبة التبادل فعلياً: قبلها كان السجل يحمل `status_code` رقمياً
    فقط، فلا يمكن معرفة اتجاه الرسالة ولا نتيجتها ولا مدتها ولا ربط عمليتين
    ببعضهما. التسمية والحقول مختارة لتطابق `apps.who.models.WHOSyncLog`،
    وهو السجل الذي عالجت به تبادل منظمة الصحة.
    """

    class Direction(models.TextChoices):
        INBOUND = 'INBOUND', 'وارد'
        OUTBOUND = 'OUTBOUND', 'صادر'
        UNKNOWN = 'UNKNOWN', 'غير محدَّد'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'نجح'
        FAILED = 'FAILED', 'فشل'
        PENDING = 'PENDING', 'بانتظار'
        RETRY = 'RETRY', 'إعادة محاولة'
        UNKNOWN = 'UNKNOWN', 'غير محدَّد'

    integration_name = models.CharField(max_length=50, verbose_name='اسم التكامل')
    request_type = models.CharField(max_length=50, verbose_name='نوع الطلب')
    request_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الطلب')
    response_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الاستجابة')
    status_code = models.IntegerField(null=True, blank=True, verbose_name='رمز الحالة')
    request_timestamp = models.DateTimeField(auto_now_add=True, verbose_name='وقت الطلب')

    direction = models.CharField(
        max_length=10, choices=Direction.choices, default=Direction.UNKNOWN, verbose_name='الاتجاه'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UNKNOWN, verbose_name='الحالة'
    )
    error_message = models.TextField(blank=True, verbose_name='رسالة الخطأ')
    duration_ms = models.IntegerField(null=True, blank=True, verbose_name='المدة (مللي ثانية)')
    correlation_id = models.CharField(max_length=100, blank=True, verbose_name='معرّف الارتباط')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإكمال')

    class Meta:
        ordering = ['-request_timestamp']
        verbose_name = 'سجل تكامل'
        verbose_name_plural = 'سجلات التكامل'
        indexes = [
            models.Index(fields=['integration_name', '-request_timestamp'], name='intlog_name_ts_idx'),
            models.Index(fields=['status', '-request_timestamp'], name='intlog_status_ts_idx'),
            models.Index(fields=['correlation_id'], name='intlog_corr_idx'),
        ]

    def __str__(self):
        return f'{self.integration_name} - {self.request_type}'

    @property
    def is_successful(self) -> bool:
        """النجاح يُشتق من الحالة، لا من رمز HTTP وحده.

        الرمز يبقى `None` في التبادل الداخلي (مثل IHR) للنجاح، لذا الحالة
        هي المرجع، والرمز يُستخدم لتأكيدها لا لإنكارها.
        """
        return self.status == self.Status.SUCCESS


class EncryptedCredentialValue(BaseModel):
    """قيمة سرّية مشفّرة لإعدادات التكامل.

    يُورِّث نمط التشفير من `apps.who.models.WHOIntegration`
    (Fernet مشتق من SECRET_KEY) لضمان عدم كتابة plaintext
    في أي مكان جديد.
    """

    class KeyType(models.TextChoices):
        API_KEY = 'API_KEY', 'API Key'
        OAUTH_SECRET = 'OAUTH_SECRET', 'OAuth Secret'
        CERTIFICATE = 'CERTIFICATE', 'شهادة'
        TOKEN = 'TOKEN', 'Token'
        OTHER = 'OTHER', 'أخرى'

    integration = models.ForeignKey(
        'integration.Integration',
        on_delete=models.CASCADE,
        related_name='credentials',
        verbose_name='التكامل',
    )
    key_type = models.CharField(max_length=20, choices=KeyType.choices, verbose_name='النوع')
    key_name = models.CharField(max_length=80, verbose_name='اسم المفتاح')
    encrypted_value = models.TextField(verbose_name='القيمة المشفّرة')

    class Meta:
        ordering = ['key_type', 'key_name']
        constraints = [
            models.UniqueConstraint(
                fields=['integration', 'key_type', 'key_name'],
                name='unique_credential_per_integration',
            ),
        ]
        verbose_name = 'سر التكامل'
        verbose_name_plural = 'أسرار التكامل'

    def __str__(self):
        return f'{self.integration} · {self.key_name}'

    def reveal(self) -> str:
        """فك التشفير لحظة الاستخدام فقط."""
        from apps.who.models import _fernet
        try:
            return _fernet().decrypt(self.encrypted_value.encode()).decode()
        except Exception:
            return ''

    def set_value(self, value: str):
        from apps.who.models import _fernet
        self.encrypted_value = _fernet().encrypt(value.encode()).decode()


class ApiEndpoint(BaseModel):
    """إدخال في كتالوج الـ API الخارجي.

    يصف خدمة خارجية واحدة (e.g. ICD-11 search, IHR submit,
    laboratory results) مع الـ contract الأساسي.
    """

    class Protocol(models.TextChoices):
        REST = 'REST', 'REST'
        SOAP = 'SOAP', 'SOAP'
        SFTP = 'SFTP', 'SFTP'
        ODATA = 'ODATA', 'OData'
        GRPC = 'GRPC', 'gRPC'

    class Scope(models.TextChoices):
        DISEASE = 'DISEASE', 'Disease'
        SURVEILLANCE = 'SURVEILLANCE', 'Surveillance'
        VACCINATION = 'VACCINATION', 'Vaccination'
        IHR = 'IHR', 'IHR'
        LABORATORY = 'LABORATORY', 'Laboratory'
        HEALTH_EVENT = 'HEALTH_EVENT', 'Health Event'
        REFERENCE = 'REFERENCE', 'Reference Data'

    code = models.CharField(max_length=60, unique=True, verbose_name='الكود')
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='endpoints',
        verbose_name='المنظمة',
    )
    name_en = models.CharField(max_length=120, verbose_name='الاسم (إنجليزي)')
    name_ar = models.CharField(max_length=120, verbose_name='الاسم (عربي)')
    description = models.TextField(blank=True, verbose_name='الوصف')
    protocol = models.CharField(max_length=20, choices=Protocol.choices, default=Protocol.REST, verbose_name='البروتوكول')
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.REFERENCE, verbose_name='التصنيف')
    base_url = models.URLField(verbose_name='الرابط الأساسي')
    version = models.CharField(max_length=20, blank=True, verbose_name='الإصدار')
    auth_type = models.CharField(max_length=20, blank=True, verbose_name='نوع المصادقة')
    doc_url = models.URLField(blank=True, verbose_name='رابط التوثيق')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تحقق')

    class Meta:
        ordering = ['code']
        verbose_name = 'نقطة API'
        verbose_name_plural = 'نقاط API'

    def __str__(self):
        return f'{self.code} ({self.organization.name_en})'


class DataScope(BaseModel):
    """ما يسمح لـ NQP بتبادله مع منظمة معينة.

    لكل (منظمة، تكامل، scope) نحدد READ / WRITE.
    """

    class Direction(models.TextChoices):
        READ = 'READ', 'قراءة'
        WRITE = 'WRITE', 'كتابة'

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='scopes', verbose_name='المنظمة')
    endpoint = models.ForeignKey(ApiEndpoint, on_delete=models.CASCADE, related_name='scopes', verbose_name='نقطة API')
    direction = models.CharField(max_length=10, choices=Direction.choices, verbose_name='الاتجاه')
    resource = models.CharField(max_length=80, verbose_name='المورد')
    granted_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_scopes', verbose_name='الممنوح من')
    granted_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ المنح')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'endpoint', 'direction', 'resource'],
                name='unique_datascope_per_org_endpoint_direction_resource',
            ),
        ]
        verbose_name = 'نطاق بيانات'
        verbose_name_plural = 'نطاقات البيانات'

    def __str__(self):
        return f'{self.organization} · {self.endpoint} · {self.direction} · {self.resource}'


class Integration(BaseModel):
    """تكامل منظمة مع NQP — يربط المنظمة بخدمات محددة.

    هذا هو الكيان الرئيسي لشاشة "التكاملات".
    """

    class Env(models.TextChoices):
        DEV = 'DEV', 'تطويري'
        SANDBOX = 'SANDBOX', 'تجريبي'
        PRODUCTION = 'PRODUCTION', 'إنتاجي'

    class Status(models.TextChoices):
        NOT_CONFIGURED = 'NOT_CONFIGURED', 'غير مُعدّ'
        PENDING = 'PENDING', 'معلق'
        CONFIGURED = 'CONFIGURED', 'مُعدّ'
        VERIFIED = 'VERIFIED', 'موثَّق'
        FAILED = 'FAILED', 'فشل'
        DISABLED = 'DISABLED', 'معطّل'

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='integrations', verbose_name='المنظمة')
    endpoint = models.ForeignKey(ApiEndpoint, on_delete=models.CASCADE, related_name='integrations', verbose_name='نقطة API')
    environment = models.CharField(max_length=20, choices=Env.choices, default=Env.SANDBOX, verbose_name='البيئة')
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.NOT_CONFIGURED, verbose_name='الحالة')
    auth_type = models.CharField(max_length=20, blank=True, verbose_name='نوع المصادقة')
    base_url = models.URLField(blank=True, verbose_name='الرابط الأساسي')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر تحقق')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'endpoint'],
                name='unique_integration_per_org_endpoint',
            ),
        ]
        verbose_name = 'تكامل'
        verbose_name_plural = 'التكاملات'

    def __str__(self):
        return f'{self.organization.name_en} / {self.endpoint.code}'


class IntegrationHealth(BaseModel):
    """حالة الاتصال الموثّقة لتكامل.

    لا يُعرض نتيجة اتصال إلّا إذا سجّل اختبار فعلي مسجّل
    هنا — وهذا هو الضامن للتصريح "🟢 API VERIFIED".
    """

    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='health_records', verbose_name='التكامل')
    check_type = models.CharField(max_length=60, verbose_name='نوع الفحص')
    passed = models.BooleanField(default=False, verbose_name='ناجح')
    detail = models.TextField(blank=True, verbose_name='التفاصيل')
    checked_by = models.CharField(max_length=100, blank=True, verbose_name='الفاحص')
    checked_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الفحص')

    class Meta:
        ordering = ['-checked_at']
        verbose_name = 'سجل صحة'
        verbose_name_plural = 'سجلات الصحة'

    def __str__(self):
        return f'{self.integration} · {self.check_type} · {"✓" if self.passed else "✕"}'


class WebhookSubscription(BaseModel):
    """اشتراك ويب هوك لمنظمة — بديل `WebhookEndpoint` الموجّه للتكاملات.

    يبقي `WebhookEndpoint` القديم لعدم كسيرته، ويستخدم هذا النموذج
    الجديد في البوابة.
    """

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='webhooks', verbose_name='المنظمة')
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name='webhooks', verbose_name='التكامل', null=True, blank=True)
    event_type = models.CharField(max_length=50, verbose_name='نوع الحدث')
    endpoint_url = models.URLField(verbose_name='رابط النقطة')
    secret = models.CharField(max_length=255, blank=True, verbose_name='السر')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    last_delivery_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر توصيل')
    failure_count = models.PositiveIntegerField(default=0, verbose_name='أعطال')

    class Meta:
        verbose_name = 'ويب هوك'
        verbose_name_plural = 'ويب هوك'

    def __str__(self):
        return f'{self.organization} · {self.event_type}'


class WebhookDelivery(BaseModel):
    """محاولة توصيل واحدة لويب هوك."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'معلق'
        SUCCESS = 'SUCCESS', 'نجح'
        FAILED = 'FAILED', 'فشل'

    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name='deliveries', verbose_name='الاشتراك')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة')
    http_status = models.IntegerField(null=True, blank=True, verbose_name='رمز HTTP')
    request_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الطلب')
    response_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الاستجابة')
    error_message = models.TextField(blank=True, verbose_name='الخطأ')
    duration_ms = models.IntegerField(null=True, blank=True, verbose_name='المدة')
    fired_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإرسال')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإكمال')

    class Meta:
        ordering = ['-fired_at']
        verbose_name = 'توصيل ويب هوك'
        verbose_name_plural = 'توصيلات ويب هوك'

    def __str__(self):
        return f'{self.subscription} · {self.status} · {self.fired_at.isoformat()}'


class AuditLog(BaseModel):
    """سجل مراجعة عمليات البوابة.

    Who → What → When → Where → Result.
    """

    class Result(models.TextChoices):
        SUCCESS = 'SUCCESS', 'نجح'
        FAILURE = 'FAILURE', 'فشل'
        BLOCKED = 'BLOCKED', 'محظور'

    user = models.CharField(max_length=100, blank=True, verbose_name='المستخدم')
    action = models.CharField(max_length=60, verbose_name='الإجراء')
    resource_type = models.CharField(max_length=60, verbose_name='نوع المورد')
    resource_id = models.CharField(max_length=100, blank=True, verbose_name='معرّف المورد')
    detail = models.JSONField(default=dict, blank=True, verbose_name='التفاصيل')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='العنوان')
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.SUCCESS, verbose_name='النتيجة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل مراجعة'
        verbose_name_plural = 'سجلات المراجعة'

    def __str__(self):
        return f'{self.user} · {self.action} · {self.result}'
