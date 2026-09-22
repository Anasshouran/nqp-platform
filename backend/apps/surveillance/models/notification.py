from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class NotificationType(models.TextChoices):
    CASE_REGISTERED = 'CASE_REGISTERED', _('حالة مسجلة')
    CASE_CONFIRMED = 'CASE_CONFIRMED', _('حالة مؤكدة')
    CASE_DECEASED = 'CASE_DECEASED', _('حالة وفاة')
    CONTACT_ADDED = 'CONTACT_ADDED', _('مخالط مضاف')
    CONTACT_SYMPTOMATIC = 'CONTACT_SYMPTOMATIC', _('مخالط بأعراض')
    CONTACT_CONVERTED = 'CONTACT_CONVERTED', _('مخالط تحول لحالة')
    CONTACT_MISSED = 'CONTACT_MISSED', _('متابعة مخالط فائتة')
    ALERT_GENERATED = 'ALERT_GENERATED', _('إنذار مولد')
    ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED', _('إنذار مقر')
    ALERT_ESCALATED = 'ALERT_ESCALATED', _('إنذار مصعد')
    ALERT_CLOSED = 'ALERT_CLOSED', _('إنذار مغلق')
    OUTBREAK_CONFIRMED = 'OUTBREAK_CONFIRMED', _('تفشي مؤكد')
    OUTBREAK_CONTROLLED = 'OUTBREAK_CONTROLLED', _('تفشي تحت السيطرة')
    OUTBREAK_CLOSED = 'OUTBREAK_CLOSED', _('تفشي مغلق')
    LAB_RESULT_POSITIVE = 'LAB_RESULT_POSITIVE', _('نتيجة مختبر إيجابية')
    LAB_RESULT_CRITICAL = 'LAB_RESULT_CRITICAL', _('نتيجة مختبر حرجة')
    SPECIMEN_COLLECTED = 'SPECIMEN_COLLECTED', _('عينة مجمعة')
    SPECIMEN_RECEIVED = 'SPECIMEN_RECEIVED', _('عينة مستلمة')
    SPECIMEN_REJECTED = 'SPECIMEN_REJECTED', _('عينة مرفوضة')
    INVESTIGATION_STARTED = 'INVESTIGATION_STARTED', _('تحقيق بدأ')
    INVESTIGATION_COMPLETED = 'INVESTIGATION_COMPLETED', _('تحقيق مكتمل')
    EVENT_REPORTED = 'EVENT_REPORTED', _('حدث مبلغ عنه')
    EVENT_VERIFIED = 'EVENT_VERIFIED', _('حدث محقق')
    REPORT_DUE = 'REPORT_DUE', _('تقرير مستحق')
    REPORT_OVERDUE = 'REPORT_OVERDUE', _('تقرير متأخر')
    THRESHOLD_BREACH = 'THRESHOLD_BREACH', _('تجاوز عتبة')
    VECTOR_FOCUS_HIGH = 'VECTOR_FOCUS_HIGH', _('بؤرة ناقل عالية الخطورة')
    SYSTEM = 'SYSTEM', _('نظامي')


class NotificationPriority(models.TextChoices):
    LOW = 'LOW', _('منخفضة')
    NORMAL = 'NORMAL', _('عادية')
    HIGH = 'HIGH', _('عالية')
    URGENT = 'URGENT', _('عاجلة')
    CRITICAL = 'CRITICAL', _('حرجة')


class NotificationChannel(models.TextChoices):
    IN_APP = 'IN_APP', _('داخل التطبيق')
    PUSH = 'PUSH', _('إشعار فوري (Push)')
    EMAIL = 'EMAIL', _('بريد إلكتروني')
    SMS = 'SMS', _('رسالة نصية')
    WHATSAPP = 'WHATSAPP', _('واتساب')
    WEBHOOK = 'WEBHOOK', _('ويب هوك')


class Notification(BaseModel):
    """إشعار للمستخدم."""

    notification_type = models.CharField(
        max_length=30, choices=NotificationType.choices, verbose_name=_('نوع الإشعار')
    )
    priority = models.CharField(
        max_length=10, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL,
        verbose_name=_('الأولوية')
    )

    # المستلم
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='surveillance_notifications',
        verbose_name=_('المستلم'),
    )
    recipient_role = models.CharField(max_length=50, blank=True, verbose_name=_('دور المستلم'))

    # المحتوى
    title = models.CharField(max_length=300, verbose_name=_('العنوان'))
    message = models.TextField(verbose_name=_('الرسالة'))
    action_url = models.CharField(max_length=500, blank=True, verbose_name=_('رابط الإجراء'))
    action_label = models.CharField(max_length=100, blank=True, verbose_name=_('نص الإجراء'))

    # الكائن المرجعي
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('نوع المحتوى'),
    )
    object_id = models.UUIDField(null=True, blank=True, verbose_name=_('معرف الكائن'))

    # القنوات
    channels = models.JSONField(
        default=list, blank=True, verbose_name=_('القنوات'),
        help_text=_('مثال: ["IN_APP", "PUSH", "EMAIL"]')
    )

    # حالة الإرسال
    sent_channels = models.JSONField(default=dict, blank=True, verbose_name=_('القنوات المرسلة'))
    failed_channels = models.JSONField(default=dict, blank=True, verbose_name=_('القنوات الفاشلة'))

    # القراءة
    is_read = models.BooleanField(default=False, verbose_name=_('مقروء'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت القراءة'))

    # التوقيت
    scheduled_at = models.DateTimeField(null=True, blank=True, verbose_name=_('مجدول لـ'))
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الإرسال'))

    # التجميع
    group_key = models.CharField(max_length=100, blank=True, verbose_name=_('مفتاح التجميع'))
    is_digest = models.BooleanField(default=False, verbose_name=_('ملخص يومي'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('إشعار')
        verbose_name_plural = _('الإشعارات')
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['notification_type', '-created_at']),
            models.Index(fields=['recipient', 'notification_type']),
            models.Index(fields=['group_key']),
        ]

    def __str__(self):
        return f'{self.recipient} - {self.get_notification_type_display()}'

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationTemplate(BaseModel):
    """قالب إشعار قابل للتخصيص."""

    notification_type = models.CharField(
        max_length=30, choices=NotificationType.choices, unique=True, verbose_name=_('نوع الإشعار')
    )
    name_ar = models.CharField(max_length=200, verbose_name=_('الاسم بالعربية'))
    name_en = models.CharField(max_length=200, blank=True, verbose_name=_('الاسم بالإنجليزية'))

    # القوالب لكل قناة
    in_app_title_template = models.CharField(max_length=300, verbose_name=_('عنوان داخل التطبيق'))
    in_app_message_template = models.TextField(verbose_name=_('رسالة داخل التطبيق'))

    push_title_template = models.CharField(max_length=300, blank=True, verbose_name=_('عنوان Push'))
    push_message_template = models.TextField(blank=True, verbose_name=_('رسالة Push'))

    email_subject_template = models.CharField(max_length=300, blank=True, verbose_name=_('موضوع البريد'))
    email_body_template = models.TextField(blank=True, verbose_name=_('جسم البريد'))

    sms_template = models.TextField(blank=True, verbose_name=_('قالب SMS'))
    whatsapp_template = models.TextField(blank=True, verbose_name=_('قالب WhatsApp'))

    # المتغيرات المتاحة
    available_variables = models.JSONField(
        default=list, blank=True, verbose_name=_('المتغيرات المتاحة'),
        help_text=_('مثال: ["case_number", "disease_name", "patient_name", "facility_name"]')
    )

    # القنوات الافتراضية
    default_channels = models.JSONField(
        default=list, blank=True, verbose_name=_('القنوات الافتراضية')
    )

    # الأدوار المستهدفة افتراضياً
    default_roles = models.JSONField(default=list, blank=True, verbose_name=_('الأدوار الافتراضية'))

    # الشروط
    condition_expression = models.TextField(blank=True, verbose_name=_('شرط التفعيل (Python expression)'))

    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))

    class Meta:
        verbose_name = _('قالب إشعار')
        verbose_name_plural = _('قوالب الإشعارات')

    def __str__(self):
        return f'{self.get_notification_type_display()} - {self.name_ar}'

    def render(self, context):
        """تطبيق القالب مع السياق."""
        from django.template import Template, Context
        t = Template(self.in_app_message_template)
        return t.render(Context(context))


class NotificationPreference(BaseModel):
    """تفضيلات الإشعارات للمستخدم."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='surveillance_notification_preferences',
        verbose_name=_('المستخدم'),
    )

    # تفعيل/تعطيل حسب النوع
    enabled_types = models.JSONField(
        default=list, blank=True, verbose_name=_('الأنواع المفعلة'),
        help_text=_('قائمة بأنواع الإشعارات المفعلة، فارغة = الكل')
    )
    disabled_types = models.JSONField(
        default=list, blank=True, verbose_name=_('الأنواع المعطلة')
    )

    # القنوات المفضلة
    preferred_channels = models.JSONField(
        default=list, blank=True, verbose_name=_('القنوات المفضلة'),
        help_text=_('مثال: ["IN_APP", "PUSH", "EMAIL"]')
    )

    # أوقات عدم الإزعاج
    do_not_disturb_start = models.TimeField(null=True, blank=True, verbose_name=_('بدء عدم الإزعاج'))
    do_not_disturb_end = models.TimeField(null=True, blank=True, verbose_name=_('نهاية عدم الإزعاج'))
    timezone = models.CharField(max_length=50, default='Africa/Khartoum', verbose_name=_('المنطقة الزمنية'))

    # ملخص يومي
    daily_digest_enabled = models.BooleanField(default=True, verbose_name=_('ملخص يومي مفعل'))
    daily_digest_time = models.TimeField(default='08:00', verbose_name=_('وقت الملخص اليومي'))

    # إنذارات حرجة (تجاوز عدم الإزعاج)
    critical_override_dnd = models.BooleanField(default=True, verbose_name=_('الحرجة تتجاوز عدم الإزعاج'))

    # إشعارات الدور
    role_based_enabled = models.BooleanField(default=True, verbose_name=_('إشعارات الدور مفعلة'))
    assigned_only = models.BooleanField(default=False, verbose_name=_('المُسندة لي فقط'))

    class Meta:
        verbose_name = _('تفضيلات إشعارات')
        verbose_name_plural = _('تفضيلات الإشعارات')

    def __str__(self):
        return f'تفضيلات {self.user}'

    def is_type_enabled(self, notification_type):
        if self.enabled_types and notification_type not in self.enabled_types:
            return False
        if notification_type in self.disabled_types:
            return False
        return True

    def should_send_via(self, channel):
        if not self.preferred_channels:
            return True
        return channel in self.preferred_channels