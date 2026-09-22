from django.db import models

from core.models import BaseModel


class ExternalEntity(BaseModel):
    name = models.CharField(max_length=100, unique=True, verbose_name='الاسم')
    api_key = models.CharField(max_length=255, blank=True, verbose_name='مفتاح API')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name']
        verbose_name = 'نظام خارجي'
        verbose_name_plural = 'الأنظمة الخارجية'

    def __str__(self):
        return self.name


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
    integration_name = models.CharField(max_length=50, verbose_name='اسم التكامل')
    request_type = models.CharField(max_length=50, verbose_name='نوع الطلب')
    request_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الطلب')
    response_payload = models.JSONField(default=dict, blank=True, verbose_name='بيانات الاستجابة')
    status_code = models.IntegerField(null=True, blank=True, verbose_name='رمز الحالة')
    request_timestamp = models.DateTimeField(auto_now_add=True, verbose_name='وقت الطلب')

    class Meta:
        ordering = ['-request_timestamp']
        verbose_name = 'سجل تكامل'
        verbose_name_plural = 'سجلات التكامل'

    def __str__(self):
        return f'{self.integration_name} - {self.request_type}'
