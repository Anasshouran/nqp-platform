"""أنواع الإجازات، أرصدة الموظف، وطلبات الإجازة.

الأرصدة تُشتق ولا تُخزَّن: `entitled + carried_over - taken - pending`،
حيث `taken` و`pending` مجموعان محسوبان من الطلبات المعتمدة والمُقدَّمة على
السنة والنوع نفسيهما. تخزين المتبقي ينشئ مصدرَ حقيقةٍ ثانياً ينحرف عن
الطلبات بمجرد أي تعديل، فيُحذف. ما يُخزَّن هو ما لا يُستنتج: الاستحقاق
الممنوح والمُرحَّل من سنة لأخرى.

الحجز (reservation) عند الإرسال يمنع طلبَين من إنفاق الرصيد نفسه: أيام
«مُقدَّمة» تُحسب محجوزة، فتُخفَّض عند الاعتماد وتُفرَّغ عند الرفض أو
الإلغاء.
"""

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class LeaveType(BaseModel):
    """نوع إجازة قابل للاختيار."""

    code = models.CharField(max_length=30, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالإنجليزية')

    is_paid = models.BooleanField(default=True, verbose_name='مدفوعة')
    requires_document = models.BooleanField(
        default=False, verbose_name='تطلب مستنداً',
        help_text='مثل الإجازة المرضية: لا يُعتمد الطلب بلا مرفق.',
    )
    max_consecutive_days = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name='أقصى عدد أيام متتالية',
    )
    #: رصيد سنوي افتراضي لمن لا يُمنح له استحقاق صريح. `null` = بلا سقف.
    default_entitlement_days = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        verbose_name='أيام سنوية افتراضية',
    )
    #: يوقف التعيين الهيكلي لأجلها (إجازة بلا راتب مثلاً).
    suspends_assignment = models.BooleanField(
        default=False, verbose_name='توقف التعيين الهيكلي',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'نوع إجازة'
        verbose_name_plural = 'أنواع الإجازات'

    def __str__(self):
        return self.name_ar


class LeaveRequestStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'مسودة'
    SUBMITTED = 'SUBMITTED', 'مُقدَّم'
    APPROVED = 'APPROVED', 'معتمد'
    REJECTED = 'REJECTED', 'مرفوض'
    CANCELLED = 'CANCELLED', 'ملغى'


OPEN_STATUSES = {LeaveRequestStatus.DRAFT, LeaveRequestStatus.SUBMITTED}
FINAL_STATUSES = {
    LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED, LeaveRequestStatus.CANCELLED,
}
#: الحالات التي تحجز من الرصيد (لا تُحسبها «مأخوذة» بعد).
RESERVING_STATUSES = {LeaveRequestStatus.SUBMITTED, LeaveRequestStatus.APPROVED}


class LeaveBalance(BaseModel):
    """استحقاق موظف لنوع إجازة في سنة معيّنة.

    `entitled_days` و`carried_over_days` استحقاق ممنوح يدخله HR؛
    `taken_days` و`pending_days` محسوبان من الطلبات.
    """

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name='leave_balances',
        verbose_name='الموظف',
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name='balances',
        verbose_name='نوع الإجازة',
    )
    year = models.PositiveSmallIntegerField(verbose_name='السنة')

    entitled_days = models.DecimalField(
        max_digits=6, decimal_places=1, default=0, verbose_name='أيام مستحقة',
    )
    carried_over_days = models.DecimalField(
        max_digits=6, decimal_places=1, default=0, verbose_name='أيام مرحَّلة من العام الماضي',
    )
    note = models.CharField(max_length=255, blank=True, verbose_name='ملاحظة')

    class Meta:
        ordering = ['-year', 'leave_type__order']
        verbose_name = 'رصيد إجازة'
        verbose_name_plural = 'أرصدة الإجازات'
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leave_type', 'year'],
                name='uniq_leave_balance_employee_type_year',
                violation_error_message='يوجد رصيد لهذا الموظف في هذا النوع لهذه السنة',
            ),
        ]

    def __str__(self):
        return f'{self.employee} — {self.leave_type} {self.year}'

    def taken_days(self):
        """أيام محسوبة من الطلبات المعتمدة."""
        return _sum_days(
            self.employee, self.leave_type, self.year,
            statuses={LeaveRequestStatus.APPROVED},
        )

    def pending_days(self):
        """أيام محجوزة من طلبات مُقدَّمة لم تُعتمد بعد."""
        return _sum_days(
            self.employee, self.leave_type, self.year,
            statuses={LeaveRequestStatus.SUBMITTED},
        )

    def available_days(self):
        """المتاح للاستحقاق = مستحق + مرحَّل − مأخوذ − محجوز.

        قد يكون سالباً: نفترض أن الموظف استنفد رصيده ثم قُدّم طلب سابق
        اعتماده، وهو وضع يُراجَع إدارياً لا أن تُقصّ أيامه بصمت.
        """
        return (self.entitled_days + self.carried_over_days
                - self.taken_days() - self.pending_days())


def _sum_days(employee, leave_type, year, statuses):
    """مجموع أيام الطلبات بحالات معيّنة — مصدر واحد لـtaken/pending."""
    from django.db.models import Sum
    return LeaveRequest.objects.filter(
        employee=employee, leave_type=leave_type, year=year, status__in=statuses,
    ).aggregate(total=Sum('days'))['total'] or 0


class LeaveRequest(BaseModel):
    """طلب إجازة لموظف."""

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        verbose_name='الموظف',
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name='requests',
        verbose_name='نوع الإجازة',
    )
    status = models.CharField(
        max_length=20, choices=LeaveRequestStatus.choices,
        default=LeaveRequestStatus.DRAFT, verbose_name='الحالة',
    )

    start_date = models.DateField(verbose_name='من تاريخ')
    end_date = models.DateField(verbose_name='إلى تاريخ')
    year = models.PositiveSmallIntegerField(
        verbose_name='السنة',
        help_text='سنة بدء الإجازة، بها يُحتسب الرصيد.',
    )
    is_half_day = models.BooleanField(default=False, verbose_name='نصف يوم')
    #: أيام محسوبة وقت الإنشاء: لا يُعاد اشتقاقها عند كل قراءة، لأن تاريخ
    #: اعتماد الطلب يجب أن يبقى ثابتاً حتى لو أُضيفت إجازة رسمية لاحقاً.
    days = models.DecimalField(max_digits=6, decimal_places=1, verbose_name='عدد الأيام')

    reason = models.TextField(blank=True, verbose_name='المبرِّر')
    document = models.CharField(
        max_length=255, blank=True, verbose_name='المرفق',
        help_text='مطلوب للأنواع التي تستند مستنداً؛ يُربط بمخزن الملفات لاحقاً.',
    )
    substitute = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='leave_substitution',
        verbose_name='البديل أثناء الإجازة',
    )

    is_self_service = models.BooleanField(default=False, verbose_name='طلب ذاتي')
    requested_by = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='leave_requests_filed', verbose_name='مقدّم الطلب',
    )

    decided_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name='leave_requests_decided', verbose_name='المعتمد',
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ القرار')
    decision_note = models.TextField(blank=True, verbose_name='ملاحظات القرار')
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'طلب إجازة'
        verbose_name_plural = 'طلبات الإجازات'
        indexes = [
            models.Index(fields=['employee', 'year', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f'{self.employee} — {self.get_status_display()} ({self.start_date} → {self.end_date})'

    # ------------------------------------------------------------------
    def clean(self):
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'تاريخ النهاية لا يسبق تاريخ البداية'})
        if self.start_date and self.year and self.start_date.year != self.year:
            raise ValidationError({'year': 'السنة يجب أن تطابق سنة تاريخ البداية'})
        if self.status == LeaveRequestStatus.REJECTED and not self.rejection_reason:
            raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})
        if self.status in (LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED) and not self.decided_by_id:
            raise ValidationError({'decided_by': 'المعتمد مطلوب'})

    def overlaps(self, others=None):
        """هل يتقاطع مع طلب آخر غير ملغى/مرفوض لنفس الموظف؟

        يتقاطع `[a1,b1]` و`[a2,b2]` إذا `a1 <= b2` و`a2 <= b1` (أطراف
        شاملة: إجازة تبدأ يوم انتهاء أخرى تتعارض).
        """
        if others is None:
            others = LeaveRequest.objects.filter(
                employee=self.employee, year=self.year,
                status__in=RESERVING_STATUSES,
            ).exclude(pk=self.pk) if self.pk else LeaveRequest.objects.filter(
                employee=self.employee, year=self.year,
                status__in=RESERVING_STATUSES,
            )
        return any(
            other.start_date <= self.end_date and self.start_date <= other.end_date
            for other in others
        )

    def is_editable(self):
        return self.status == LeaveRequestStatus.DRAFT

    def can_submit(self, actor):
        if self.status != LeaveRequestStatus.DRAFT:
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)

    def can_decide(self, actor):
        if self.status != LeaveRequestStatus.SUBMITTED:
            return False
        if getattr(actor, 'pk', None) and actor.pk == self.requested_by_id:
            return False
        return True

    def can_cancel(self, actor):
        if self.status != LeaveRequestStatus.SUBMITTED:
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)


class LeaveStatusLog(BaseModel):
    """قيد في تاريخ حالة طلب إجازة."""

    request = models.ForeignKey(
        LeaveRequest, on_delete=models.CASCADE,
        related_name='status_logs', verbose_name='طلب الإجازة',
    )
    from_status = models.CharField(max_length=20, blank=True, verbose_name='الحالة السابقة')
    to_status = models.CharField(max_length=20, verbose_name='الحالة الجديدة')
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    changed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='leave_status_logs', verbose_name='من قام بالتغيير',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل حالة طلب الإجازة'
        verbose_name_plural = 'سجل حالات طلبات الإجازات'

    def __str__(self):
        return f'{self.request_id}: {self.from_status or "—"} → {self.to_status}'
