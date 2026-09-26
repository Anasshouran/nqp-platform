import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel

_FERNET_KEY = None


def _fernet():
    """مفتاح Fernet مشتق من SECRET_KEY لتشفير بيانات الاعتماد الحساسة."""
    global _FERNET_KEY
    if _FERNET_KEY is None:
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        _FERNET_KEY = Fernet(base64.urlsafe_b64encode(digest))
    return _FERNET_KEY


class WHOIntegration(BaseModel):
    """إعدادات الاتصال بمنصة منظمة الصحة العالمية (DEV/SANDBOX/PROD)."""

    class Environment(models.TextChoices):
        DEV = 'DEV', 'تطويري'
        SANDBOX = 'SANDBOX', 'تجريبي'
        PRODUCTION = 'PRODUCTION', 'إنتاجي'

    class AuthType(models.TextChoices):
        OAUTH2 = 'OAUTH2', 'OAuth2'
        API_KEY = 'API_KEY', 'مفتاح API'
        NONE = 'NONE', 'بدون'

    name = models.CharField(max_length=100, unique=True, verbose_name='الاسم')
    environment = models.CharField(max_length=20, choices=Environment.choices, default=Environment.SANDBOX, verbose_name='البيئة')
    base_url = models.URLField(verbose_name='رابط الأساس')
    client_id = models.CharField(max_length=255, blank=True, verbose_name='معرف العميل')
    client_secret_encrypted = models.TextField(blank=True, verbose_name='السر المشفر')
    authentication_type = models.CharField(max_length=20, choices=AuthType.choices, default=AuthType.OAUTH2, verbose_name='نوع المصادقة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    last_sync_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر مزامنة')
    last_success_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر نجاح')
    last_error = models.TextField(blank=True, verbose_name='آخر خطأ')

    class Meta:
        verbose_name = 'تكامل WHO'
        verbose_name_plural = 'تكاملات WHO'

    def __str__(self):
        return f'{self.name} ({self.get_environment_display()})'

    @property
    def client_secret(self):
        """فك تشفير السر — يُستخدم فقط لحظة الاتصال."""
        if not self.client_secret_encrypted:
            return ''
        try:
            return _fernet().decrypt(self.client_secret_encrypted.encode()).decode()
        except InvalidToken:
            return ''

    def set_client_secret(self, value):
        self.client_secret_encrypted = _fernet().encrypt(value.encode()).decode()


class WHOSyncLog(BaseModel):
    """سجل كل عملية مزامنة/إرسال مع منظمة الصحة العالمية."""

    class Operation(models.TextChoices):
        EVENT_SUBMIT = 'EVENT_SUBMIT', 'إرسال حدث'
        DISEASE_SYNC = 'DISEASE_SYNC', 'مزامنة أمراض'
        SPAR_SYNC = 'SPAR_SYNC', 'مزامنة SPAR'
        ALERT_SYNC = 'ALERT_SYNC', 'مزامنة تنبيهات'
        TEST_CONNECTION = 'TEST_CONNECTION', 'اختبار اتصال'
        STATUS_CHECK = 'STATUS_CHECK', 'فحص الحالة'

    class Direction(models.TextChoices):
        OUTBOUND = 'OUTBOUND', 'صادر'
        INBOUND = 'INBOUND', 'وارد'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار'
        PROCESSING = 'PROCESSING', 'قيد المعالجة'
        SUCCESS = 'SUCCESS', 'نجح'
        FAILED = 'FAILED', 'فشل'
        RETRY = 'RETRY', 'إعادة محاولة'
        CANCELLED = 'CANCELLED', 'ملغي'

    integration = models.ForeignKey(
        WHOIntegration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sync_logs',
        verbose_name='التكامل',
    )
    operation = models.CharField(max_length=30, choices=Operation.choices, verbose_name='العملية')
    direction = models.CharField(max_length=10, choices=Direction.choices, default=Direction.OUTBOUND, verbose_name='الاتجاه')
    resource_type = models.CharField(max_length=50, blank=True, verbose_name='نوع المورد')
    local_ref = models.CharField(max_length=100, blank=True, verbose_name='مرجع محلي')
    remote_ref = models.CharField(max_length=100, blank=True, verbose_name='مرجع خارجي')
    request_id = models.CharField(max_length=100, blank=True, verbose_name='رقم الطلب')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة')
    http_status = models.IntegerField(null=True, blank=True, verbose_name='رمز HTTP')
    request_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الطلب')
    response_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الاستجابة')
    error_message = models.TextField(blank=True, verbose_name='رسالة الخطأ')
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت البدء')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإكمال')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'سجل مزامنة WHO'
        verbose_name_plural = 'سجلات مزامنة WHO'

    def __str__(self):
        return f'{self.operation} - {self.status}'


class DiseaseMaster(BaseModel):
    """خريطة أمراض المنصة مع مراجع ICD-11 وحالة الإبلاغ الدولية."""

    disease = models.OneToOneField(
        'laboratory.Disease',
        on_delete=models.CASCADE,
        related_name='who_master',
        verbose_name='المرض',
    )
    icd11_uri = models.URLField(blank=True, verbose_name='رابط ICD-11')
    who_disease_code = models.CharField(max_length=50, blank=True, verbose_name='كود WHO')
    is_notifiable = models.BooleanField(default=False, verbose_name='واجب الإبلاغ دولياً')
    reporting_timeline = models.CharField(max_length=20, blank=True, verbose_name='زمن الإبلاغ')
    mapped_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الربط')
    last_synced_at = models.DateTimeField(null=True, blank=True, verbose_name='آخر مزامنة')
    last_sync_status = models.CharField(max_length=20, blank=True, verbose_name='حالة المزامنة')

    class Meta:
        verbose_name = 'خريطة مرض WHO'
        verbose_name_plural = 'خرائط أمراض WHO'

    def __str__(self):
        return f'{self.disease} — notifiable={self.is_notifiable}'


class WHOICDMapping(BaseModel):
    """اقتراح ربط مرض محلي بكيان/كود ICD-11 — قراءة-آمنة: لا يعدّل بيانات Disease."""

    class MappingStatus(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار'
        PROPOSED = 'PROPOSED', 'مقترح'
        REVIEW = 'REVIEW', 'مراجعة'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'

    class MatchType(models.TextChoices):
        EXACT = 'EXACT', 'مطابقة تامة'
        SEMANTIC = 'SEMANTIC', 'مطابقة دلالية'
        UNSPECIFIED = 'UNSPECIFIED', 'غير محددة'
        MANUAL = 'MANUAL', 'يدوية'
        NO_MATCH = 'NO_MATCH', 'لا يوجد تطابق'

    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.CASCADE,
        related_name='who_icd_mappings',
        verbose_name='المرض',
    )
    who_release = models.CharField(max_length=32, verbose_name='إصدار WHO')
    foundation_uri = models.URLField(max_length=500, blank=True, verbose_name='رابط كيان الأساس')
    mms_uri = models.URLField(max_length=500, blank=True, verbose_name='رابط MMS')
    icd_11_code = models.CharField(max_length=64, blank=True, verbose_name='كود ICD-11')
    title_en = models.CharField(max_length=500, blank=True, verbose_name='العنوان بالإنجليزية')
    title_ar = models.CharField(max_length=500, blank=True, verbose_name='العنوان بالعربية')
    mapping_status = models.CharField(
        max_length=32, choices=MappingStatus.choices, default=MappingStatus.PENDING, verbose_name='حالة الربط'
    )
    confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True, verbose_name='درجة الثقة')
    match_type = models.CharField(max_length=32, choices=MatchType.choices, blank=True, verbose_name='نوع التطابق')
    source_query = models.CharField(max_length=255, blank=True, verbose_name='استعلام المصدر')
    is_current = models.BooleanField(default=True, verbose_name='الربط الحالي')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='who_icd_mapping_reviews',
        verbose_name='المراجع',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        verbose_name = 'خريطة ICD-11 من WHO'
        verbose_name_plural = 'خرائط ICD-11 من WHO'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['disease'], name='who_icd_disease_idx'),
            models.Index(fields=['who_release'], name='who_icd_release_idx'),
            models.Index(fields=['icd_11_code'], name='who_icd_code_idx'),
            models.Index(fields=['mapping_status'], name='who_icd_status_idx'),
            models.Index(fields=['is_current'], name='who_icd_current_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['disease', 'who_release', 'is_current'],
                condition=Q(is_current=True),
                name='uniq_current_who_mapping_per_release',
            ),
        ]

    def __str__(self):
        return f'{self.disease} — {self.icd_11_code or "—"} ({self.get_mapping_status_display()})'