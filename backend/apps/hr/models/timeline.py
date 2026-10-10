"""سجل مسار الموظف الوظيفي.

يُلتقط التغييرات الجوهرية في مسار الموظف: التوظيف، الترقية، النقل، الإجازة،
التعليق، الإنهاء، إعادة التعيين، انتهاء فترة الاختبار. يستخدم لبناء السيرة
الوظيفية ولحساب الفترات المحاسبية.

التدقيق والنطاق: النموذج يرتبط بـ `EmployeeProfile` عبر `employee`،
ولذلك يقيَّد مجاله بالواجهة عبر `HRScopedMixin` بمسار `employee__user`.
"""
from django.db import models
from django.utils import timezone

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class EmployeeTimelineEvent(models.TextChoices):
    """نقاط مهمة في مسار الموظف."""

    HIRE = 'HIRE', 'توظيف'
    PROMOTION = 'PROMOTION', 'ترقية'
    TRANSFER = 'TRANSFER', 'نقل'
    DEMOTION = 'DEMOTION', 'خفض'
    LEAVE_START = 'LEAVE_START', 'بداية الإجازة'
    LEAVE_END = 'LEAVE_END', 'انتهاء الإجازة'
    SUSPENSION = 'SUSPENSION', 'تعليق'
    TERMINATION = 'TERMINATION', 'إنهاء الخدمة'
    REINSTATE = 'REINSTATE', 'إعادة تعيين'
    PROBATION_END = 'PROBATION_END', 'نهاية فترة الاختبار'
    CONTRACT_RENEWAL = 'CONTRACT_RENEWAL', 'تجديد العقد'


class EmployeeTimeline(BaseModel):
    """مدخل في المسار الوظيفي لموظف ما."""

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name='timeline',
        verbose_name='الموظف',
    )

    event = models.CharField(
        max_length=30,
        choices=EmployeeTimelineEvent.choices,
        verbose_name='الحدث',
    )
    title = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='العنوان (للأحداث غير القياسية)',
    )

    # الحقل/المنصب/القطاع القديم والجديد كسلاسل نصية (نسخة تاريخية
    # للاحتفاظ بالإحداث حتى لو حُذف الكيان لاحقاً)
    old_position = models.CharField(
        max_length=150, blank=True, verbose_name='المنصب السابق'
    )
    new_position = models.CharField(
        max_length=150, blank=True, verbose_name='المنصب الجديد'
    )
    old_department = models.CharField(
        max_length=100, blank=True, verbose_name='القسم السابق'
    )
    new_department = models.CharField(
        max_length=100, blank=True, verbose_name='القسم الجديد'
    )
    old_sector = models.CharField(
        max_length=50, blank=True, verbose_name='القطاع السابق'
    )
    new_sector = models.CharField(
        max_length=50, blank=True, verbose_name='القطاع الجديد'
    )
    old_entry_point = models.CharField(
        max_length=100, blank=True, verbose_name='نقطة الدخول السابقة'
    )
    new_entry_point = models.CharField(
        max_length=100, blank=True, verbose_name='نقطة الدخول الجديدة'
    )

    start_date = models.DateField(default=timezone.localdate, verbose_name='تاريخ البداية')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ النهاية')
    reason = models.CharField(max_length=255, blank=True, verbose_name='السبب/الملاحظات')

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee_timeline_entries',
        verbose_name='أنشئ بواسطة',
    )

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'أحداث المسار الوظيفي'
        verbose_name_plural = 'الأحداث الوظيفية'
        indexes = [
            models.Index(fields=['employee', '-start_date']),
            models.Index(fields=['employee', 'event']),
        ]

    def __str__(self):
        extra = f' → {self.new_position}' if self.new_position else ''
        return f'{self.employee} {self.get_event_display()}{extra} ({self.start_date})'
