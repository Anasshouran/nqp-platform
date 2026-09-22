from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AlertType(models.TextChoices):
    THRESHOLD_BREACH = 'THRESHOLD_BREACH', _('تجاوز العتبة الإحصائية')
    SINGLE_EVENT = 'SINGLE_EVENT', _('حدث فردي')
    LAB_POSITIVE = 'LAB_POSITIVE', _('نتيجة مختبر إيجابية')
    CLUSTER_DETECTION = 'CLUSTER_DETECTION', _('اكتشاف تجمع')
    VECTOR_SURGE = 'VECTOR_SURGE', _('ارتفاع مؤشرات النواقل')
    FOOD_EVENT = 'FOOD_EVENT', _('حادث تلوث غذائي')
    PORT_RISK = 'PORT_RISK', _('خطر في نقطة دخول')
    INTERNATIONAL_ALERT = 'INTERNATIONAL_ALERT', _('إنذار دولي')
    COMMUNITY_REPORT = 'COMMUNITY_REPORT', _('بلاغ مجتمعي')
    UNUSUAL_DEATH = 'UNUSUAL_DEATH', _('وفاة غير معتادة')
    MASS_SYMPTOMS = 'MASS_SYMPTOMS', _('أعراض جماعية')
    ANIMAL_DIE_OFF = 'ANIMAL_DIE_OFF', _('نفوق حيوانات')


class AlertLevel(models.TextChoices):
    LEVEL_0 = 'LEVEL_0', _('جاهزية طبيعية')
    LEVEL_1 = 'LEVEL_1', _('مراقبة معززة')
    LEVEL_2 = 'LEVEL_2', _('استجابة محددة')
    LEVEL_3 = 'LEVEL_3', _('استجابة شاملة')


class AlertStatus(models.TextChoices):
    NEW = 'NEW', _('جديد')
    UNDER_REVIEW = 'UNDER_REVIEW', _('قيد المراجعة')
    ACKNOWLEDGED = 'ACKNOWLEDGED', _('تم الإقرار')
    INVESTIGATING = 'INVESTIGATING', _('قيد التحقيق')
    RESPONDING = 'RESPONDING', _('قيد الاستجابة')
    ESCALATED = 'ESCALATED', _('تم التصعيد')
    CLOSED = 'CLOSED', _('مغلق')
    FALSE_ALARM = 'FALSE_ALARM', _('إنذار كاذب')


class AlertEvaluationStatus(models.TextChoices):
    PENDING = 'PENDING', _('بانتظار التقييم')
    UNDER_EVALUATION = 'UNDER_EVALUATION', _('قيد التقييم')
    ACCEPTED = 'ACCEPTED', _('مقبول')
    REJECTED = 'REJECTED', _('مرفوض')
    NEEDS_MORE_INFO = 'NEEDS_MORE_INFO', _('يحتاج لمعلومات إضافية')
    ESCALATED_TO_OUTBREAK = 'ESCALATED_TO_OUTBREAK', _('تم تصعيده لتفشي')


class SurveillanceAlert(BaseModel):
    """إنذار مبكر (EWARS) ناتج عن تجاوز عتبة أو حدث فردي أو نتيجة مختبر."""

    alert_number = models.CharField(
        max_length=30, unique=True, blank=True, verbose_name=_('رقم الإنذار')
    )
    alert_type = models.CharField(
        max_length=25, choices=AlertType.choices, default=AlertType.THRESHOLD_BREACH,
        verbose_name=_('نوع الإنذار')
    )
    level = models.CharField(
        max_length=10, choices=AlertLevel.choices, default=AlertLevel.LEVEL_1,
        verbose_name=_('المستوى')
    )
    evaluation_status = models.CharField(
        max_length=25, choices=AlertEvaluationStatus.choices, default=AlertEvaluationStatus.PENDING,
        verbose_name=_('حالة التقييم')
    )
    status = models.CharField(
        max_length=20, choices=AlertStatus.choices, default=AlertStatus.NEW,
        verbose_name=_('الحالة')
    )

    # المعلومات الأساسية
    title = models.CharField(max_length=250, verbose_name=_('العنوان'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # المرض والموقع
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_surveillance_alerts',
        verbose_name=_('المرض'),
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_surveillance_alerts',
        verbose_name=_('القطاع'),
    )
    locality = models.ForeignKey(
        'organization.Locality',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_surveillance_alerts',
        verbose_name=_('المحلية'),
    )
    port = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_surveillance_alerts',
        verbose_name=_('المنفذ'),
    )
    health_facility = models.ForeignKey(
        'masterdata.HealthFacility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_surveillance_alerts',
        verbose_name=_('الوحدة الصحية'),
    )

    # الحالات المرتبطة
    cases = models.ManyToManyField(
        'surveillance.HealthCase', blank=True, related_name='alerts', verbose_name=_('الحالات')
    )
    case_count = models.PositiveIntegerField(default=0, verbose_name=_('عدد الحالات'))
    case_numbers = models.JSONField(default=list, blank=True, verbose_name=_('أرقام الحالات'))

    # الحدث المرتبط
    event = models.ForeignKey(
        'surveillance.HealthEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name=_('الحدث الصحي'),
    )

    # التفشي (إذا تم تصعيده)
    outbreak = models.ForeignKey(
        'surveillance.Outbreak',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='origin_alerts',
        verbose_name=_('التفشي'),
    )

    # بيانات التحفيز (trigger data)
    trigger = models.JSONField(default=dict, blank=True, verbose_name=_('بيانات التحفيز'))
    trigger_rule = models.ForeignKey(
        'surveillance.AlertRule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_alerts',
        verbose_name=_('قاعدة التحفيز'),
    )

    # التقييم
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluated_alerts',
        verbose_name=_('قيّمه'),
    )
    evaluated_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت التقييم'))
    evaluation_notes = models.TextField(blank=True, verbose_name=_('ملاحظات التقييم'))
    risk_assessment = models.JSONField(default=dict, blank=True, verbose_name=_('تقييم المخاطر'))

    # الاستجابة
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_alerts',
        verbose_name=_('مُسند إلى'),
    )
    response_plan = models.ForeignKey(
        'emergency_eoc.ResponsePlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name=_('خطة الاستجابة'),
    )
    response_actions = models.JSONField(default=list, blank=True, verbose_name=_('إجراءات الاستجابة'))

    # الإغلاق
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nqp_resolved_alerts',
        verbose_name=_('أُغلق بواسطة'),
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الإغلاق'))
    closure_reason = models.TextField(blank=True, verbose_name=_('سبب الإغلاق'))

    # الإشعارات
    notified_roles = models.JSONField(default=list, blank=True, verbose_name=_('أدوار الإشعار'))
    notification_sent = models.BooleanField(default=False, verbose_name=_('تم الإرسال'))

    # التوقيت
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت التوليد'))
    acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الإقرار'))
    responded_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت بدء الاستجابة'))

    class Meta:
        ordering = ['-generated_at']
        verbose_name = _('إنذار ترصد مبكر')
        verbose_name_plural = _('إنذارات الترصد المبكر')
        indexes = [
            models.Index(fields=['alert_number']),
            models.Index(fields=['alert_type', 'status']),
            models.Index(fields=['level', 'status']),
            models.Index(fields=['evaluation_status']),
            models.Index(fields=['disease', 'generated_at']),
            models.Index(fields=['port', 'generated_at']),
            models.Index(fields=['sector', 'generated_at']),
            models.Index(fields=['status', 'generated_at']),
        ]

    def __str__(self):
        return f'{self.alert_number} - {self.get_level_display()} - {self.get_status_display()}'

    def save(self, *args, **kwargs):
        if not self.alert_number:
            self.alert_number = self.generate_alert_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_alert_number():
        """توليد رقم إنذار: ALT-YYYY-SECTOR-XXXXXX"""
        from django.db import transaction
        from django.utils import timezone

        year = timezone.now().year
        prefix = f'ALT-{year}'
        with transaction.atomic():
            last_alert = SurveillanceAlert.objects.filter(alert_number__startswith=prefix).order_by('-alert_number').first()
            if last_alert:
                try:
                    last_num = int(last_alert.alert_number.split('-')[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
        return f'{prefix}-{new_num:06d}'

    def acknowledge(self, user, note=''):
        """إقرار الإنذار."""
        self.status = AlertStatus.ACKNOWLEDGED
        self.acknowledged_at = timezone.now()
        if note:
            self.evaluation_notes = note
        self.save(update_fields=['status', 'acknowledged_at', 'evaluation_notes'])

    def start_response(self, user):
        """بدء الاستجابة."""
        self.status = AlertStatus.RESPONDING
        self.responded_at = timezone.now()
        self.assigned_to = user
        self.save(update_fields=['status', 'responded_at', 'assigned_to'])

    def escalate_to_outbreak(self, user, outbreak_data):
        """التصعيد لتفشي."""
        from apps.surveillance.services.workflows import OutbreakWorkflowService
        return OutbreakWorkflowService.create_from_alert(self, user, outbreak_data)

    def close(self, user, reason=''):
        """إغلاق الإنذار."""
        self.status = AlertStatus.CLOSED
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.closure_reason = reason
        self.save(update_fields=['status', 'resolved_at', 'resolved_by', 'closure_reason'])


class AlertRule(BaseModel):
    """قاعدة توليد الإنذارات (قابلة للتهيئة لكل مرض)."""

    class RuleType(models.TextChoices):
        THRESHOLD = 'THRESHOLD', _('عتبة عددية')
        RATE_CHANGE = 'RATE_CHANGE', _('تغير المعدل')
        CLUSTER = 'CLUSTER', _('تجمع مكاني/زماني')
        SINGLE_CASE = 'SINGLE_CASE', _('حالة واحدة لمرض محدد')
        LAB_CONFIRMATION = 'LAB_CONFIRMATION', _('تأكيد مختبري')
        VECTOR_INDEX = 'VECTOR_INDEX', _('مؤشر ناقل')
        ZERO_REPORTING = 'ZERO_REPORTING', _('إبلاغ صفري')

    name = models.CharField(max_length=200, verbose_name=_('اسم القاعدة'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))
    rule_type = models.CharField(max_length=20, choices=RuleType.choices, verbose_name=_('نوع القاعدة'))

    # المرض المطبق عليه
    disease = models.ForeignKey(
        'laboratory.Disease',
        on_delete=models.CASCADE,
        related_name='alert_rules',
        verbose_name=_('المرض'),
    )
    # يمكن تطبيقها على جميع الأمراض إذا كان null
    is_global = models.BooleanField(default=False, verbose_name=_('عامة لجميع الأمراض'))

    # المعاملات
    threshold_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name=_('قيمة العتبة')
    )
    window_days = models.PositiveIntegerField(default=7, verbose_name=_('نافذة الرصد (أيام)'))
    baseline_weeks = models.PositiveIntegerField(default=8, verbose_name=_('أسابيع خط الأساس'))
    min_cases_for_alert = models.PositiveIntegerField(default=1, verbose_name=_('الحد الأدنى للحالات'))

    # إعدادات التجمع
    spatial_radius_km = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, verbose_name=_('نصف القطر المكاني (كم)')
    )
    temporal_window_days = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_('النافذة الزمنية (أيام)')
    )

    # المستوى المولد
    alert_level = models.CharField(
        max_length=10, choices=AlertLevel.choices, default=AlertLevel.LEVEL_1,
        verbose_name=_('مستوى الإنذار')
    )

    # الأدوار المُبلغة
    notify_roles = models.JSONField(default=list, blank=True, verbose_name=_('أدوار الإشعار'))
    notify_emails = models.JSONField(default=list, blank=True, verbose_name=_('إيميلات الإشعار'))

    # الحالة
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))
    is_system = models.BooleanField(default=False, verbose_name=_('قاعدة نظامية'))

    # إحصائيات
    last_triggered = models.DateTimeField(null=True, blank=True, verbose_name=_('آخر تفعيل'))
    trigger_count = models.PositiveIntegerField(default=0, verbose_name=_('عدد التفعيلات'))

    class Meta:
        ordering = ['disease__name_ar', 'name']
        verbose_name = _('قاعدة إنذار')
        verbose_name_plural = _('قواعد الإنذار')

    def __str__(self):
        return f'{self.name} ({self.disease.name_ar if self.disease else "عام"})'


class AlertEvaluation(BaseModel):
    """سجل تقييم الإنذار."""

    alert = models.ForeignKey(
        SurveillanceAlert, on_delete=models.CASCADE, related_name='evaluations', verbose_name=_('الإنذار')
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alert_evaluations',
        verbose_name=_('المقيّم'),
    )
    previous_status = models.CharField(max_length=30, choices=AlertEvaluationStatus.choices, verbose_name=_('الحالة السابقة'))
    new_status = models.CharField(max_length=30, choices=AlertEvaluationStatus.choices, verbose_name=_('الحالة الجديدة'))
    decision = models.CharField(
        max_length=20,
        choices=[
            ('ACCEPT', _('قبول')),
            ('REJECT', _('رفض')),
            ('REQUEST_INFO', _('طلب معلومات')),
            ('ESCALATE', _('تصعيد')),
            ('MONITOR', _('مراقبة')),
        ],
        verbose_name=_('القرار'),
    )
    risk_level = models.CharField(
        max_length=10,
        choices=[
            ('LOW', _('منخفض')),
            ('MODERATE', _('متوسط')),
            ('HIGH', _('عالي')),
            ('CRITICAL', _('حرج')),
        ],
        default='MODERATE',
        verbose_name=_('مستوى الخطورة'),
    )
    justification = models.TextField(verbose_name=_('التبرير'))
    recommended_actions = models.JSONField(default=list, blank=True, verbose_name=_('الإجراءات المقترحة'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت التقييم'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('تقييم إنذار')
        verbose_name_plural = _('تقييمات الإنذارات')

    def __str__(self):
        return f'{self.alert.alert_number} - {self.get_decision_display()}'


class AlertNotification(BaseModel):
    """سجل إشعارات الإنذار."""

    class Channel(models.TextChoices):
        PUSH = 'PUSH', _('إشعار فوري')
        EMAIL = 'EMAIL', _('بريد إلكتروني')
        SMS = 'SMS', _('رسالة نصية')
        WHATSAPP = 'WHATSAPP', _('واتساب')
        WEBHOOK = 'WEBHOOK', _('ويب هوك')
        IN_APP = 'IN_APP', _('داخل التطبيق')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('معلق')
        SENT = 'SENT', _('مرسل')
        DELIVERED = 'DELIVERED', _('مُستلم')
        FAILED = 'FAILED', _('فشل')
        READ = 'READ', _('مقروء')

    alert = models.ForeignKey(
        SurveillanceAlert, on_delete=models.CASCADE, related_name='notification_logs', verbose_name=_('الإنذار')
    )
    channel = models.CharField(max_length=15, choices=Channel.choices, verbose_name=_('القناة'))
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alert_notifications',
        verbose_name=_('المستلم'),
    )
    recipient_role = models.CharField(max_length=50, blank=True, verbose_name=_('دور المستلم'))
    recipient_contact = models.CharField(max_length=200, blank=True, verbose_name=_('معلومات الاتصال'))

    subject = models.CharField(max_length=300, blank=True, verbose_name=_('الموضوع'))
    message = models.TextField(verbose_name=_('الرسالة'))

    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING, verbose_name=_('الحالة')
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الإرسال'))
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت الاستلام'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت القراءة'))
    error_message = models.TextField(blank=True, verbose_name=_('رسالة الخطأ'))

    external_id = models.CharField(max_length=100, blank=True, verbose_name=_('معرف خارجي'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('إشعار إنذار')
        verbose_name_plural = _('إشعارات الإنذارات')

    def __str__(self):
        return f'{self.alert.alert_number} - {self.get_channel_display()} - {self.get_status_display()}'