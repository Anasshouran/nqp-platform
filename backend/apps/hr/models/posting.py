"""طلبات النقل/الترقية الداخلية (Internal postings).

النموذج يغطي دورة الطلب الكاملة: يكتبه موظف HR نيابةً عن الموظف أو الموظف
نفسه، ثم يعتمدها معتمدٌ منفصل. عند الاعتماد تُغلق التعيينات الهيكلية القديمة
ويُفتح تعيّن جديد ويُسجَّل حدث في `EmployeeTimeline`، فتبقى جهة الحقيقة في
`OrgAssignment` كما في بقية الموديولات.

فصل المهام: `HR_MANAGER`/`HR_SPECIALIST` يملكان `add`/`edit` ولا يملكان
`approve`/`reject`؛ `HR_APPROVER` يملك الاعتماد ولا يملك الإدخال. لذلك
`approve()` يرفض دائماً أن يعتمد المعتمد طلباً أنشأه بنفسه، حتى لو أُتيحت
الصلاحيتان معاً في إسناد خاطئ.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import BaseModel

from apps.accounts.models import EmployeeProfile, User


class PostingKind(models.TextChoices):
    """نوع التغيير الوظيفي المطلوب."""

    TRANSFER = 'TRANSFER', 'نقل'
    PROMOTION = 'PROMOTION', 'ترقية'
    DEMOTION = 'DEMOTION', 'خفض'


class PostingStatus(models.TextChoices):
    """دورة حالة طلب النقل."""

    DRAFT = 'DRAFT', 'مسودة'
    SUBMITTED = 'SUBMITTED', 'مُقدَّم'
    APPROVED = 'APPROVED', 'معتمد'
    REJECTED = 'REJECTED', 'مرفوض'
    CANCELLED = 'CANCELLED', 'ملغى'


#: الحالات التي يُسمح بالانتقال منها (عند الإرسال أو الإلغاء).
OPEN_STATUSES = {PostingStatus.DRAFT, PostingStatus.SUBMITTED}
#: الحالات النهائية: لا يقبلها أي انتقال بعدها.
FINAL_STATUSES = {PostingStatus.APPROVED, PostingStatus.REJECTED, PostingStatus.CANCELLED}


class PostingRequest(BaseModel):
    """طلب نقل/ترقية/خفض لموظف."""

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name='posting_requests',
        verbose_name='الموظف',
    )

    kind = models.CharField(
        max_length=20, choices=PostingKind.choices, verbose_name='نوع الطلب',
    )
    status = models.CharField(
        max_length=20, choices=PostingStatus.choices,
        default=PostingStatus.DRAFT, verbose_name='الحالة',
    )

    # الوجهة المطلوبة. تُترك فارغة-means "نفس المكان" (تغيير صفة فقط).
    target_position = models.ForeignKey(
        'organization.OrgPosition',
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_requests', verbose_name='المنصب المطلوب',
    )
    target_department = models.ForeignKey(
        'organization.Department',
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_requests', verbose_name='القسم المطلوب',
    )
    target_sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_requests', verbose_name='القطاع المطلوب',
    )
    target_entry_point = models.ForeignKey(
        'masterdata.EntryPoint',
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_requests', verbose_name='نقطة الدخول المطلوبة',
    )

    effective_date = models.DateField(
        null=True, blank=True, verbose_name='تاريخ النفاذ المطلوب',
    )
    reason = models.TextField(blank=True, verbose_name='المبرِّر')

    # من رفع الطلب: موظف HR نيابةً، أو الموظف نفسه (خدمة ذاتية).
    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='posting_requests_filed',
        verbose_name='مقدّم الطلب',
    )
    is_self_service = models.BooleanField(
        default=False, verbose_name='طلب ذاتي',
        help_text='true إذا رفع الموظف الطلب بنفسه بدل HR.',
    )

    # قرار الاعتماد
    decided_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT, null=True, blank=True,
        related_name='posting_requests_decided',
        verbose_name='المعتمد',
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ القرار')
    decision_note = models.TextField(blank=True, verbose_name='ملاحظات القرار')
    rejection_reason = models.TextField(blank=True, verbose_name='سبب الرفض')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'طلب نقل/ترقية'
        verbose_name_plural = 'طلبات النقل والترقية'
        indexes = [
            models.Index(fields=['employee', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f'{self.employee} — {self.get_kind_display()} ({self.get_status_display()})'

    # ------------------------------------------------------------------
    # قواعد الحالة
    # ------------------------------------------------------------------
    def has_target(self):
        """هل حُدِّدت وجهة فعلاً؟"""
        return any((
            self.target_position_id, self.target_department_id,
            self.target_sector_id, self.target_entry_point_id,
        ))

    def is_open(self):
        return self.status in OPEN_STATUSES

    def is_editable(self):
        """قابل للتعديل؟

        `DRAFT` فقط. بعد `SUBMITTED` يكون الطلب معروضاً على المعتمد، وتعديل
        وجهته بعد العرض يجعل ما وافق عليه ليس ما اعتُمد. لذلك `SUBMITTED`
        مقفل للتعديل ويُغلق بقرار (اعتماد/رفض/إلغاء) لا بPATCH.
        """
        return self.status == PostingStatus.DRAFT

    def clean(self):
        if self.status == PostingStatus.REJECTED and not self.rejection_reason:
            raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})
        if self.status in (PostingStatus.APPROVED, PostingStatus.REJECTED) and not self.decided_by_id:
            raise ValidationError({'decided_by': 'المعتمد مطلوب'})
        if self.kind != PostingKind.TRANSFER and not self.has_target():
            raise ValidationError(
                {'target_position': 'الترقية والخفض يتطلّبان هدفاً (منصباً أو قسماً)'}
            )
        if self.decided_at and timezone.is_naive(self.decided_at):
            self.decided_at = timezone.make_aware(self.decided_at)

    def can_submit(self, actor):
        """هل يستطيع `actor` إرسال هذا الطلب للاعتماد؟

        الطلب الذاتي يقدّمه صاحب الملف فقط؛ طلب HR يقدّمه من يراه ضمن نطاقه.
        """
        if not self.is_open():
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)

    def can_decide(self, actor):
        """هل يستطيع `actor` اعتماد/رفض هذا الطلب؟

        يفشل مغلقاً إذا كان الطلب في حالة نهائية أو كان المعتمد هو صاحبه
        (فصل المهام على مستوى السجل، لا الدور فقط).
        """
        if self.status != PostingStatus.SUBMITTED:
            return False
        if getattr(actor, 'pk', None) and actor.pk == self.requested_by_id:
            return False
        return True

    def can_cancel(self, actor):
        if self.status != PostingStatus.SUBMITTED:
            return False
        if self.is_self_service:
            return self.employee.user_id == getattr(actor, 'pk', None)
        from apps.hr.scoping import user_within_hr_scope
        return user_within_hr_scope(self.employee.user, actor)
