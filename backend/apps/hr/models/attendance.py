"""سجلات الحضور والانصراف اليومية.

سجل واحد لكل (موظف، يوم). الحالة يُثبتها موظف الموارد البشرية من مصدره
(جهاز البصمة/الوردية/التقرير)؛ لا يُسجَّل الموظف حضوره بنفسه، فالسجل
قابل للمراجعة والاعتماد من طرف ثالث.

المرجعية: `EmployeeProfile` للموظف، و`EmployeeTimeline` لتسجيل تغيّر الحالة
الإدارية (إجازة/تعليق) فيُستدعى في العرض لا في السجل نفسه، حتى
يبقى السجل واقعةً لا استنتاجاً.
"""

from datetime import date, datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class AttendanceStatus(models.TextChoices):
    """حضور الموظف في يوم واحد."""

    PRESENT = 'PRESENT', 'حاضر'
    ABSENT = 'ABSENT', 'غائب'
    LATE = 'LATE', 'متأخر'
    EARLY_LEAVE = 'EARLY_LEAVE', 'انصراف مبكر'
    REMOTE = 'REMOTE', 'عمل عن بُعد'
    ON_LEAVE = 'ON_LEAVE', 'إجازة'
    OFF_DAY = 'OFF_DAY', 'يوم راحة'


#: الحالات التي تُشتَق من التوقيت ولا تُقبل ساعة دخول/خروج فيها.
NO_PUNCH_STATUSES = {AttendanceStatus.ABSENT, AttendanceStatus.ON_LEAVE, AttendanceStatus.OFF_DAY}
#: الحالات التي تعني «الموظف كان في العمل».
WORKED_STATUSES = {
    AttendanceStatus.PRESENT, AttendanceStatus.LATE,
    AttendanceStatus.EARLY_LEAVE, AttendanceStatus.REMOTE,
}
#: الحالات التي تُقبل دون اعتماد (واقعة بطبيعتها).
SELF_EVIDENCED = {AttendanceStatus.ON_LEAVE, AttendanceStatus.OFF_DAY}


class AttendanceRecord(BaseModel):
    """حضور وانصراف موظف في يوم واحد."""

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name='الموظف',
    )
    date = models.DateField(verbose_name='التاريخ')

    status = models.CharField(
        max_length=20, choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT, verbose_name='الحالة',
    )
    check_in = models.TimeField(null=True, blank=True, verbose_name='وقت الحضور')
    check_out = models.TimeField(null=True, blank=True, verbose_name='وقت الانصراف')
    overtime_minutes = models.PositiveIntegerField(
        default=0, verbose_name='دقائق العمل الإضافي',
    )
    shift_code = models.CharField(
        max_length=40, blank=True, verbose_name='رمز الوردية',
        help_text='يُحفظ كنص لتفادي تعديل الجداول؛ يُنظَّم كمناوبات في مرحلة لاحقة.',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    #: مرجع خارجي (جهاز البصمة/نظام الجداول) لتفادي الازدواج عند الاستيراد.
    external_ref = models.CharField(
        max_length=80, blank=True, verbose_name='مرجع خارجي',
    )

    # دورة الاعتماد (نفس نمط طلب النقل: مُدخل بلا اعتماد)
    is_approved = models.BooleanField(default=False, verbose_name='معتمد')
    approved_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='attendance_approved',
        verbose_name='المعتمد',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='attendance_recorded',
        verbose_name='سجّل بواسطة',
    )

    class Meta:
        ordering = ['-date', 'employee__full_name_ar']
        verbose_name = 'سجل حضور'
        verbose_name_plural = 'سجلات الحضور والانصراف'
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'], name='uniq_attendance_employee_date',
                violation_error_message='يوجد سجل حضور لهذا الموظف في هذا التاريخ',
            ),
        ]
        indexes = [
            models.Index(fields=['date', 'status']),
            models.Index(fields=['employee', '-date']),
            models.Index(fields=['is_approved', '-date']),
        ]

    def __str__(self):
        return f'{self.employee} — {self.date} ({self.get_status_display()})'

    # ------------------------------------------------------------------
    # قواعد
    # ------------------------------------------------------------------
    def worked_minutes(self):
        """دقائق العمل الفعلية من أوقات الدخول/الخروج.

        لا يمكن طرح `datetime.time` مباشرة (لا تدعم `__sub__` بين وقتَين)،
        فنُمرّر اليومين إلى `datetime` أولًا ثم نقص. التوقيت الليلي الذي
        يمرّ منتصف الليل (18:00 → 06:00) يُحسب صحيحاً لأن التفاضل سالب
        على التواريخ فنضيف يوماً.
        """
        if not (self.check_in and self.check_out):
            return 0
        start = datetime.combine(date.today(), self.check_in)
        end = datetime.combine(date.today(), self.check_out)
        if end <= start:
            end += timedelta(days=1)
        return int((end - start).total_seconds() // 60)

    def total_minutes(self):
        return self.worked_minutes() + (self.overtime_minutes or 0)

    def clean(self):
        errors = {}
        if self.status in NO_PUNCH_STATUSES and (self.check_in or self.check_out):
            errors['check_in'] = f'حالة «{self.get_status_display()}» لا تقبل أوقات حضور/انصراف'
        if self.status in WORKED_STATUSES and not self.check_in:
            errors['check_in'] = 'هذه الحالة تتطلّب وقت حضور'
        if self.check_in and self.check_out and self.check_out <= self.check_in:
            errors['check_out'] = 'وقت الانصراف يجب أن يكون بعد وقت الحضور'
        if errors:
            raise ValidationError(errors)

    def can_approve(self, actor):
        """من يوثّق حضور يوم لا يوثّقه لنفسه: creator != approver.

        هذا الشرط على مستوى السجل لا على الدور، فيبقى قائماً حتى لو أُتيحت
        صلاحية الاعتماد لمُدخل بالخطأ.
        """
        if self.is_approved:
            return False
        if self.recorded_by_id and actor and actor.pk == self.recorded_by_id:
            return False
        return True
