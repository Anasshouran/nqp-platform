from django.conf import settings
from django.db import models

from core.models import BaseModel


class NotificationTemplate(BaseModel):
    class Channel(models.TextChoices):
        EMAIL = 'email', 'بريد إلكتروني'
        SMS = 'sms', 'رسالة نصية'
        PUSH = 'push', 'إشعار'
        WEBSOCKET = 'websocket', 'WebSocket'

    name = models.CharField(max_length=100, unique=True, verbose_name='الاسم')
    subject = models.CharField(max_length=255, verbose_name='الموضوع')
    body_text = models.TextField(verbose_name='النص')
    body_html = models.TextField(blank=True, verbose_name='نص HTML')
    sms_body = models.CharField(max_length=160, blank=True, verbose_name='نص الرسالة النصية')
    channel = models.CharField(max_length=20, choices=Channel.choices, verbose_name='القناة')

    class Meta:
        ordering = ['name']
        verbose_name = 'قالب إشعار'
        verbose_name_plural = 'قوالب الإشعارات'

    def __str__(self):
        return self.name


class NotificationLog(BaseModel):
    class NotificationStatus(models.TextChoices):
        SENT = 'sent', 'أُرسلت'
        FAILED = 'failed', 'فشلت'
        PENDING = 'pending', 'قيد الإرسال'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='المستخدم',
    )
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        verbose_name='القالب',
    )
    channel = models.CharField(max_length=20, verbose_name='القناة')
    recipient = models.CharField(max_length=255, verbose_name='المستلم')
    subject = models.CharField(max_length=255, blank=True, verbose_name='الموضوع')
    body = models.TextField(blank=True, verbose_name='النص')
    status = models.CharField(
        max_length=20, choices=NotificationStatus.choices, default=NotificationStatus.PENDING, verbose_name='الحالة'
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإرسال')
    is_read = models.BooleanField(default=False, verbose_name='مقروء')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت القراءة')
    error_message = models.TextField(blank=True, verbose_name='رسالة الخطأ')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل إشعار'
        verbose_name_plural = 'سجلات الإشعارات'

    def __str__(self):
        return f'{self.recipient} - {self.channel} - {self.status}'


class DeviceToken(BaseModel):
    class Platform(models.TextChoices):
        IOS = 'ios', 'iOS'
        ANDROID = 'android', 'Android'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_tokens',
        verbose_name='المستخدم',
    )
    device_token = models.CharField(max_length=255, unique=True, verbose_name='رمز الجهاز')
    platform = models.CharField(max_length=20, choices=Platform.choices, verbose_name='المنصة')

    class Meta:
        verbose_name = 'رمز جهاز'
        verbose_name_plural = 'رموز الأجهزة'

    def __str__(self):
        return f'{self.user} - {self.platform}'


class WebPushSubscription(BaseModel):
    endpoint = models.CharField(max_length=512, unique=True, verbose_name='نقطة دفع المتصفح')
    p256dh = models.CharField(max_length=256, verbose_name='مفتاح العميل (p256dh)')
    auth = models.CharField(max_length=64, verbose_name='سرّ المصادقة')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='web_push_subscriptions',
        verbose_name='المستخدم',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'اشتراك إشعار ويب'
        verbose_name_plural = 'اشتراكات إشعارات الويب'

    def __str__(self):
        return self.endpoint[-40:] if len(self.endpoint) > 40 else self.endpoint

    def as_dict(self) -> dict:
        return {
            'endpoint': self.endpoint,
            'keys': {'p256dh': self.p256dh, 'auth': self.auth},
        }
