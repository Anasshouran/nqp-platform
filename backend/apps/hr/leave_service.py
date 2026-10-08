"""خدمة الإجازات: الاحتساب، الحجز، والقرار.

قاعدة الأرقام: أيام الطلب تُحسب **مرة واحدة** عند الإنشاء (`days` محفوظ)
ولا يُعاد اشتقاقها عند كل قراءة. إعادة الاشتقاق عند القراءة تجعل اعتماد
طلب شهر كامل ينزلق يوماً إن أُدرجت إجازة رسمية بعد إنشائه، فيتحوّل اعتُمد
على رقمين مختلفين.

الأرصدة مشتقّة من الطلبات (انظر `LeaveBalance.available_days`)، فمسار
`SELECT ... FOR UPDATE` هنا يحمي *ترتيب* الحجز والقرار: طلبان في نفس اللحظة
لا يريان رصيداً واحداً فيصرفانه مرتين.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import (
    EmployeeTimeline,
    EmployeeTimelineEvent,
    LeaveBalance,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveStatusLog,
)


def count_days(start, end, is_half_day=False):
    """عدد أيام إجازة شاملة الطرفين، أو نصف يوم."""
    if not (start and end):
        return 0
    if end < start:
        raise ValidationError({'end_date': 'تاريخ النهاية لا يسبق تاريخ البداية'})
    span = (end - start).days + 1
    if is_half_day:
        return round(span * 0.5, 1)
    return span


def record_status(leave, from_status, to_status, actor, note=''):
    return LeaveStatusLog.objects.create(
        request=leave, from_status=from_status or '', to_status=to_status,
        note=note, changed_by=actor,
    )


def _assert_document_present(leave):
    if leave.leave_type.requires_document and not leave.document:
        raise ValidationError(
            {'document': f'نوع الإجازة «{leave.leave_type.name_ar}» يطلب مستنداً'}
        )


def _assert_no_overlap(leave):
    if leave.overlaps():
        raise ValidationError(
            {'start_date': 'تتداخل هذه الإجازة مع طلب قائم لنفس الموظف في هذه المدة'}
        )


def _assert_within_balance(leave, balance=None):
    """يتحقّق أن الرصيد يكفي، محسوباً مع الحجز القائم.

    الطلب الحالي محجوز أثناء الفحص (إن كان مُقدَّماً)، فلا يُحتسب مرتين.
    """
    if not balance:
        return
    if not balance.leave_type.default_entitlement_days and not balance.entitled_days:
        # نوع بلا سقف (إجازة مرضية مثلاً): لا فحص رصيد.
        return
    pending = balance.pending_days()
    if leave.status == LeaveRequestStatus.SUBMITTED:
        pending -= leave.days
    available = (
        balance.entitled_days + balance.carried_over_days
        - balance.taken_days() - pending
    )
    if leave.days > available:
        raise ValidationError({
            'end_date': (
                f'الرصيد المتاح {available} يوم، والمطلوب {leave.days}. '
                'راجع الاستحقاق أو اعتمد طلباً آخر أولاً.'
            ),
        })


@transaction.atomic
def submit_leave(leave, actor):
    """إرسال الطلب: يتحقق من المستند والتداخل والرصيد، ثم يحجز الأيام."""
    if not leave.can_submit(actor):
        raise ValidationError({'detail': 'لا يمكن إرسال هذا الطلب'})

    locked = LeaveRequest.objects.select_for_update().filter(pk=leave.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'الطلب غير موجود'})

    _assert_document_present(locked)
    _assert_no_overlap(locked)
    balance = LeaveBalance.objects.filter(
        employee=locked.employee, leave_type=locked.leave_type, year=locked.year,
    ).first()
    _assert_within_balance(locked, balance)

    from_status = locked.status
    locked.status = LeaveRequestStatus.SUBMITTED
    locked.save(update_fields=['status', 'updated_at'])
    record_status(locked, from_status, LeaveRequestStatus.SUBMITTED, actor)
    return locked


@transaction.atomic
def approve_leave(leave, actor, note=''):
    """اعتماد الطلب: يثبّت الإجازة ويسجّل حدثَي البداية والنهاية."""
    if not leave.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن اعتماد هذا الطلب في حالته الحالية'})

    from apps.hr.scoping import user_within_hr_scope
    if not user_within_hr_scope(leave.employee.user, actor):
        raise ValidationError({'detail': 'الموظف خارج نطاقك الإداري'})

    locked = LeaveRequest.objects.select_for_update().filter(pk=leave.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'الطلب غير موجود'})

    _assert_no_overlap(locked)
    _assert_document_present(locked)
    balance = LeaveBalance.objects.select_for_update().filter(
        employee=locked.employee, leave_type=locked.leave_type, year=locked.year,
    ).first()
    # الطلب مُقدَّم فيحجز أيامه؛ عند الاعتماد تنتقل من محجوز إلى مأخوذ، فلا
    # يُحسب مرتين (نطرحه من المحجوز قبل الفحص).
    _assert_within_balance(locked, balance)

    from_status = locked.status
    locked.status = LeaveRequestStatus.APPROVED
    locked.decided_by = actor
    locked.decided_at = timezone.now()
    locked.decision_note = note
    locked.save(update_fields=[
        'status', 'decided_by', 'decided_at', 'decision_note', 'updated_at',
    ])

    EmployeeTimeline.objects.create(
        employee=locked.employee,
        event=EmployeeTimelineEvent.LEAVE_START,
        title=locked.leave_type.name_ar,
        start_date=locked.start_date,
        end_date=locked.end_date,
        reason=locked.reason,
        created_by=actor,
    )
    if locked.leave_type.suspends_assignment and locked.end_date >= timezone.localdate():
        # إجازة بلا راتب: يُوقَف التعيين الهيكلي حتى نهايتها. نُبقيه
        # مُعلَّماً بلا تاريخ نهاية لأن مدته غير معروفة مسبقاً؛ يُعاد تفعيله
        # يدوياً أو في مهمة دورية مع التحويلات.
        from apps.organization.models import OrgAssignment
        OrgAssignment.objects.filter(
            user=locked.employee.user, is_active=True,
        ).update(is_active=False)

    record_status(locked, from_status, LeaveRequestStatus.APPROVED, actor, note)
    return locked


@transaction.atomic
def reject_leave(leave, actor, reason, note=''):
    """رفض الطلب: يُفرَّغ الحجز ولا يمسّ التعيينات."""
    if not leave.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن رفض هذا الطلب في حالته الحالية'})
    if not reason:
        raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})

    locked = LeaveRequest.objects.select_for_update().filter(pk=leave.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'الطلب غير موجود'})

    from_status = locked.status
    locked.status = LeaveRequestStatus.REJECTED
    locked.decided_by = actor
    locked.decided_at = timezone.now()
    locked.rejection_reason = reason
    locked.decision_note = note
    locked.save(update_fields=[
        'status', 'decided_by', 'decided_at', 'rejection_reason', 'decision_note', 'updated_at',
    ])
    record_status(locked, from_status, LeaveRequestStatus.REJECTED, actor, reason)
    return locked


@transaction.atomic
def cancel_leave(leave, actor, note=''):
    """إلغاء طلب مُقدَّم: يُفرَّغ أيامه المحجوزة."""
    if not leave.can_cancel(actor):
        raise ValidationError({'detail': 'لا يمكن إلغاء هذا الطلب في حالته الحالية'})

    locked = LeaveRequest.objects.select_for_update().filter(pk=leave.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'الطلب غير موجود'})

    from_status = locked.status
    locked.status = LeaveRequestStatus.CANCELLED
    locked.decision_note = note
    locked.save(update_fields=['status', 'decision_note', 'updated_at'])
    record_status(locked, from_status, LeaveRequestStatus.CANCELLED, actor, note)
    return locked
