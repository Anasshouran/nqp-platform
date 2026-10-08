"""خطط التدريب والتسجيل فيها.

`TrainingPlan` هو الكتالوج (دورة تعليمية معرَّفة)، و`TrainingEnrollment`
ارتباط موظف بدورة. الفصل بينهما مقصود: الخطة مرجع إداري يُعاد استخدامه،
والتسجيل واقعة تخصّ موظفاً بعينه ولها دورة اعتماد.

معايير اجتياز الدورة (`pass_score`) تُخزَّن في التسجيل لا في الخطة، لأن
الدورة الواحدة قد يختلف شرطها بحسب مستوى الموظف أو الجهة ممثِّلة؛ وخزنها
في الخطة يجعل تغيّرها يمسّ كل التسجيلات القائمة.
"""

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class EnrollmentStatus(models.TextChoices):
    """حالة تسجيل الموظف في دورة."""

    DRAFT = 'DRAFT', 'مسودة'
    REQUESTED = 'REQUESTED', 'مطلوب'
    APPROVED = 'APPROVED', 'معتمد'
    IN_PROGRESS = 'IN_PROGRESS', 'جارٍ'
    COMPLETED = 'COMPLETED', 'مكتمل'
    FAILED = 'FAILED', 'راسب'
    CANCELLED = 'CANCELLED', 'ملغى'
    REJECTED = 'REJECTED', 'مرفوض'


OPEN_STATUSES = {EnrollmentStatus.DRAFT, EnrollmentStatus.REQUESTED, EnrollmentStatus.IN_PROGRESS}
FINAL_STATUSES = {
    EnrollmentStatus.COMPLETED, EnrollmentStatus.FAILED,
    EnrollmentStatus.CANCELLED, EnrollmentStatus.REJECTED,
}


class TrainingPlan(BaseModel):
    """دورة تدريبية في الكتالوج."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    description = models.TextField(blank=True, verbose_name='الوصف')

    provider = models.CharField(
        max_length=150, blank=True, verbose_name='الجهة المنفّذة',
        help_text='داخلية أو خارجية.',
    )
    delivery_mode = models.CharField(
        max_length=20,
        choices=[
            ('INTERNAL', 'داخلي'), ('EXTERNAL', 'خارجي'),
            ('ONLINE', 'عن بُعد'), ('ON_THE_JOB', 'تدريب ميداني'),
        ],
        default='INTERNAL', verbose_name='طريقة التدريب',
    )
    duration_hours = models.PositiveSmallIntegerField(
        default=0, verbose_name='عدد الساعات',
    )
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name='التكلفة',
    )
    is_mandatory = models.BooleanField(
        default=False, verbose_name='إلزامي',
        help_text='الدورات الإلزامية تُحتسب في خطة الفرد السنوية.',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'خطة تدريبية'
        verbose_name_plural = 'الخطط التدريبية'

    def __str__(self):
        return self.name_ar


class TrainingEnrollment(BaseModel):
    """تسجيل موظف في دورة تدريبية."""

    employee = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE,
        related_name='training_enrollments', verbose_name='الموظف',
    )
    plan = models.ForeignKey(
        TrainingPlan, on_delete=models.PROTECT,
        related_name='enrollments', verbose_name='الدورة',
    )
    status = models.CharField(
        max_length=20, choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.DRAFT, verbose_name='الحالة',
    )

    requested_date = models.DateField(null=True, blank=True, verbose_name='تاريخ طلب الاشتراك')
    start_date = models.DateField(null=True, blank=True, verbose_name='تاريخ البداية')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ النهاية')
    score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='الدرجة',
    )
    #: شرط الاجتياز لهذا التسجيل تحديداً (لا يُشترط أن يطابق الخطة).
    pass_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='درجة الاجتياز',
    )
    certificate_ref = models.CharField(
        max_length=80, blank=True, verbose_name='رقم الشهادة',
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    is_self_service = models.BooleanField(default=False, verbose_name='طلب ذاتي')
    requested_by = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='training_enrollments_filed', verbose_name='مقدّم الطلب',
    )
    decided_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name='training_enrollments_decided', verbose_name='المعتمد',
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ القرار')
    decision_note = models.TextField(blank=True, verbose_name='ملاحظات القرار')
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تسجيل تدريبي'
        verbose_name_plural = 'التسجيلات التدريبية'
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'plan'],
                condition=~models.Q(status__in=[EnrollmentStatus.CANCELLED, EnrollmentStatus.REJECTED]),
                name='uniq_active_enrollment_per_employee_plan',
                violation_error_message='مسجَّل في هذه الدورة بالفعل (تسجيل قائم غير ملغى)',
            ),
        ]
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['plan', 'status']),
        ]

    def __str__(self):
        return f'{self.employee} — {self.plan} ({self.get_status_display()})'

    def clean(self):
        if self.requested_date and self.end_date and self.end_date < self.requested_date:
            raise ValidationError({'end_date': 'تاريخ النهاية لا يسبق تاريخ البداية'})
        if self.score is not None and self.pass_score is not None and self.pass_score > 100:
            raise ValidationError({'pass_score': 'درجة الاجتياز لا تتجاوز 100'})

    def is_editable(self):
        return self.status in (EnrollmentStatus.DRAFT, EnrollmentStatus.REQUESTED)

    def is_completed(self):
        """هل اجتاز الموظف الدورة؟ يُشتق من الدرجة والشرط لا يُكتب يدوياً.

        الدرجة تُقارَن بـ`pass_score` عند التسجيل: تجاوزٌ يكفي. لا نتحقق
        هنا من اكتمال الحضور — مسؤولية منفصلة.
        """
        if self.score is None:
            return False
        if self.pass_score is None:
            return True  # لا شرط اجتياز = يُعدّ مجتازاً
        return self.score >= self.pass_score

    def can_submit(self, actor):
        if self.status != EnrollmentStatus.DRAFT:
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)

    def can_decide(self, actor):
        """اعتماد الاشتراك: لا يقرّر المعتمد طلبه، ولا يقرّر بعد اعتماده."""
        if self.status != EnrollmentStatus.REQUESTED:
            return False
        if getattr(actor, 'pk', None) and actor.pk == self.requested_by_id:
            return False
        return True

    def can_cancel(self, actor):
        if self.status not in (EnrollmentStatus.REQUESTED, EnrollmentStatus.APPROVED, EnrollmentStatus.IN_PROGRESS):
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)


class EnrollmentStatusLog(BaseModel):
    """قيد في تاريخ حالة تسجيل تدريبي."""

    enrollment = models.ForeignKey(
        TrainingEnrollment, on_delete=models.CASCADE,
        related_name='status_logs', verbose_name='التسجيل',
    )
    from_status = models.CharField(max_length=20, blank=True, verbose_name='الحالة السابقة')
    to_status = models.CharField(max_length=20, verbose_name='الحالة الجديدة')
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    changed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='training_status_logs', verbose_name='من قام بالتغيير',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل حالة التسجيل التدريبي'
        verbose_name_plural = 'سجل حالات التسجيلات التدريبية'

    def __str__(self):
        return f'{self.enrollment_id}: {self.from_status or "—"} → {self.to_status}'
