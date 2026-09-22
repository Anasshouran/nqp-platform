from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AuditAction(models.TextChoices):
    CREATE = 'CREATE', _('إنشاء')
    UPDATE = 'UPDATE', _('تحديث')
    DELETE = 'DELETE', _('حذف')
    TRANSITION = 'TRANSITION', _('انتقال حالة')
    ASSIGN = 'ASSIGN', _('تعيين')
    UNASSIGN = 'UNASSIGN', _('إلغاء تعيين')
    ACKNOWLEDGE = 'ACKNOWLEDGE', _('إقرار')
    ESCALATE = 'ESCALATE', _('تصعيد')
    CLOSE = 'CLOSE', _('إغلاق')
    EXPORT = 'EXPORT', _('تصدير')
    IMPORT = 'IMPORT', _('استيراد')
    PRINT = 'PRINT', _('طباعة')
    VIEW = 'VIEW', _('عرض')
    BULK_UPDATE = 'BULK_UPDATE', _('تحديث مجمع')
    BULK_DELETE = 'BULK_DELETE', _('حذف مجمع')
    LOGIN = 'LOGIN', _('دخول')
    LOGOUT = 'LOGOUT', _('خروج')
    FAILED_LOGIN = 'FAILED_LOGIN', _('فشل دخول')
    PERMISSION_CHANGE = 'PERMISSION_CHANGE', _('تغيير صلاحيات')
    CONFIG_CHANGE = 'CONFIG_CHANGE', _('تغيير إعدادات')


class SurveillanceAuditLog(BaseModel):
    """سجل تدقيق شامل لنظام الترصد."""

    # المستخدم
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_audit_logs',
        verbose_name=_('المستخدم'),
    )
    user_role = models.CharField(max_length=50, blank=True, verbose_name=_('دور المستخدم'))
    user_sector = models.CharField(max_length=100, blank=True, verbose_name=_('قطاع المستخدم'))

    # الإجراء
    action = models.CharField(max_length=20, choices=AuditAction.choices, verbose_name=_('الإجراء'))
    action_description = models.TextField(blank=True, verbose_name=_('وصف الإجراء'))

    # الكائن المتأثر
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='surveillance_audit_logs',
        verbose_name=_('نوع المحتوى'),
    )
    object_id = models.UUIDField(null=True, blank=True, verbose_name=_('معرف الكائن'))
    content_object = GenericForeignKey('content_type', 'object_id')

    # تمثيل نصي للكائن
    object_repr = models.CharField(max_length=500, blank=True, verbose_name=_('تمثيل الكائن'))

    # التغييرات
    changes = models.JSONField(default=dict, blank=True, verbose_name=_('التغييرات'))
    old_values = models.JSONField(default=dict, blank=True, verbose_name=_('القيم القديمة'))
    new_values = models.JSONField(default=dict, blank=True, verbose_name=_('القيم الجديدة'))

    # السياق
    request_id = models.UUIDField(null=True, blank=True, verbose_name=_('معرف الطلب'))
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name=_('عنوان IP'))
    user_agent = models.TextField(blank=True, verbose_name=_('وكيل المستخدم'))
    session_key = models.CharField(max_length=40, blank=True, verbose_name=_('مفتاح الجلسة'))

    # معلومات إضافية
    metadata = models.JSONField(default=dict, blank=True, verbose_name=_('معلومات إضافية'))
    severity = models.CharField(
        max_length=10,
        choices=[
            ('LOW', _('منخفض')),
            ('MEDIUM', _('متوسط')),
            ('HIGH', _('عالي')),
            ('CRITICAL', _('حرج')),
        ],
        default='MEDIUM',
        verbose_name=_('الخطورة'),
    )
    tags = models.JSONField(default=list, blank=True, verbose_name=_('الوسوم'))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('سجل تدقيق ترصد')
        verbose_name_plural = _('سجلات تدقيق الترصد')
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['request_id']),
            models.Index(fields=['severity', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user} - {self.get_action_display()} - {self.object_repr}'

    @classmethod
    def log_action(cls, user, action, obj=None, description='', changes=None, request=None, **kwargs):
        """طريقة مساعدة لتسجيل إجراء."""
        log = cls(
            user=user,
            action=action,
            action_description=description,
            changes=changes or {},
            **kwargs
        )

        if obj:
            log.content_type = ContentType.objects.get_for_model(obj)
            log.object_id = obj.pk
            log.object_repr = str(obj)[:500]

        if request:
            log.request_id = getattr(request, 'id', None)
            log.ip_address = request.META.get('REMOTE_ADDR')
            log.user_agent = request.META.get('HTTP_USER_AGENT', '')
            log.session_key = request.session.session_key or ''

        log.save()
        return log