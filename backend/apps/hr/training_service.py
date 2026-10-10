"""خدمة التدريب: الاشتراك، الاعتماد، والإتمام.

قاعدة الاجتياز: `TrainingEnrollment.is_completed()` تشتق الإتمام من
الدرجة مقابل `pass_score`، فلا يكتب HR حالة «مكتمل» يدوياً ثم ينسى أن
الدرجة أقل من الشرط.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import EnrollmentStatus, EnrollmentStatusLog, TrainingEnrollment


def record_status(enrollment, from_status, to_status, actor, note=''):
    return EnrollmentStatusLog.objects.create(
        enrollment=enrollment, from_status=from_status or '', to_status=to_status,
        note=note, changed_by=actor,
    )


def _assert_plan_active(enrollment):
    if not enrollment.plan.is_active:
        raise ValidationError({'plan': 'الدورة غير نشطة — لا يُقبل فيها اشتراك'})


@transaction.atomic
def submit_enrollment(enrollment, actor):
    """إرسال طلب الاشتراك للاعتماد."""
    if not enrollment.can_submit(actor):
        raise ValidationError({'detail': 'لا يمكن إرسال هذا الطلب'})

    locked = TrainingEnrollment.objects.select_for_update().filter(pk=enrollment.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'التسجيل غير موجود'})

    _assert_plan_active(locked)
    from_status = locked.status
    locked.status = EnrollmentStatus.REQUESTED
    if locked.requested_date is None:
        locked.requested_date = timezone.localdate()
    locked.save(update_fields=['status', 'requested_date', 'updated_at'])
    record_status(locked, from_status, EnrollmentStatus.REQUESTED, actor)
    return locked


@transaction.atomic
def approve_enrollment(enrollment, actor, note=''):
    """اعتماد الاشتراك — ينقله من `REQUESTED` إلى `APPROVED`."""
    if not enrollment.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن اعتماد هذا الطلب في حالته'})
    from apps.hr.scoping import user_within_hr_scope
    if not user_within_hr_scope(enrollment.employee.user, actor):
        raise ValidationError({'detail': 'الموظف خارج نطاقك الإداري'})

    locked = TrainingEnrollment.objects.select_for_update().filter(pk=enrollment.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'التسجيل غير موجود'})

    from_status = locked.status
    locked.status = EnrollmentStatus.APPROVED
    locked.decided_by = actor
    locked.decided_at = timezone.now()
    locked.decision_note = note
    locked.save(update_fields=['status', 'decided_by', 'decided_at', 'decision_note', 'updated_at'])
    record_status(locked, from_status, EnrollmentStatus.APPROVED, actor, note)
    # نُعيد النسخة المقفلة لا `enrollment` القديمة: الخدمات تقرأ `enrollment`
    # قبل القفل، فمن أعادتها لقارئٍ بقيت حالته `DRAFT` في الذاكرة.
    return locked


@transaction.atomic
def reject_enrollment(enrollment, actor, reason, note=''):
    if not enrollment.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن رفض هذا الطلب في حالته'})
    if not reason:
        raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})

    from_status = enrollment.status
    enrollment.status = EnrollmentStatus.REJECTED
    enrollment.decided_by = actor
    enrollment.decided_at = timezone.now()
    enrollment.rejection_reason = reason
    enrollment.decision_note = note
    enrollment.save(update_fields=[
        'status', 'decided_by', 'decided_at', 'rejection_reason', 'decision_note', 'updated_at',
    ])
    record_status(enrollment, from_status, EnrollmentStatus.REJECTED, actor, reason)
    return enrollment


@transaction.atomic
def cancel_enrollment(enrollment, actor, note=''):
    """إلغاء اشتراك قائم. الإلغاء يفرّئ القيد الجزئي فالاشتراك الجديد
    لنفس الدورة لن يصطدم بـ`uniq_active_enrollment_per_employee_plan`."""
    if not enrollment.can_cancel(actor):
        raise ValidationError({'detail': 'لا يمكن إلغاء هذا التسجيل في حالته'})

    locked = TrainingEnrollment.objects.select_for_update().filter(pk=enrollment.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'التسجيل غير موجود'})

    from_status = locked.status
    locked.status = EnrollmentStatus.CANCELLED
    locked.decision_note = note
    locked.save(update_fields=['status', 'decision_note', 'updated_at'])
    record_status(locked, from_status, EnrollmentStatus.CANCELLED, actor, note)
    return locked


@transaction.atomic
def record_completion(enrollment, actor, score=None, certificate_ref=''):
    """تسجيل درجة الدورة وإتمامها أو رسوبها.

    الحالة تُشتق من `is_completed()` لا من مُدخل: من يسجّل درجة أقل من
    الشرط لا يستطيع أن يدّعي الإتمام.
    """
    if enrollment.status not in (EnrollmentStatus.APPROVED, EnrollmentStatus.IN_PROGRESS):
        raise ValidationError({'detail': 'لا يُسجَّل الإتمام إلا على اشتراك معتمد'})
    from apps.hr.scoping import user_within_hr_scope
    if not user_within_hr_scope(enrollment.employee.user, actor):
        raise ValidationError({'detail': 'الموظف خارج نطاقك الإداري'})

    locked = TrainingEnrollment.objects.select_for_update().filter(pk=enrollment.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'التسجيل غير موجود'})

    if score is not None:
        locked.score = score
    from_status = locked.status
    passed = locked.is_completed()
    locked.status = EnrollmentStatus.COMPLETED if passed else EnrollmentStatus.FAILED
    if certificate_ref:
        locked.certificate_ref = certificate_ref
    locked.save(update_fields=[
        'status', 'score', 'certificate_ref', 'updated_at',
    ])
    note = 'اجتاز' if passed else 'لم يجتز شرط الاجتياز'
    record_status(locked, from_status, locked.status, actor, note)
    return locked
