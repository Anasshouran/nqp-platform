"""خدمة تقييم الأداء: الإرسال، الاعتماد، وإغلاق الدورة.

`total_score` و`rating` مشتقّان (انظر `PerformanceReview.compute_total`)
ولا يُكتبان من العميل. الاعتماد يثبّت الدرجة المحسوبة وقت الاعتماد،
لأن تعديل مؤشر لاحقاً يجب ألا يغيّر تقييماً اعتُمد.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import (
    CycleStatus,
    PerformanceCycle,
    PerformanceReview,
    ReviewStatus,
)


def _lock(review):
    locked = PerformanceReview.objects.select_for_update().filter(pk=review.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'التقييم غير موجود'})
    return locked


@transaction.atomic
def submit_review(review, actor):
    """إرسال التقييم للاعتماد. لا يُرسل ناقصاً: كل مؤشر يجب أن يحمل درجة."""
    if not review.can_submit(actor):
        raise ValidationError({'detail': 'لا يمكن إرسال هذا التقييم'})
    if review.cycle.status != CycleStatus.OPEN:
        raise ValidationError({'detail': 'دورة التقييم ليست مفتوحة'})

    locked = _lock(review)
    total = locked.compute_total()
    if total is None:
        raise ValidationError({'detail': 'التقييم ناقص: كل مؤشر يحتاج درجة قبل الإرسال'})

    from_status = locked.status
    locked.status = ReviewStatus.SUBMITTED
    locked.total_score = total
    locked.rating = locked.rating_for(total)
    locked.save(update_fields=['status', 'total_score', 'rating', 'updated_at'])
    return locked, from_status


@transaction.atomic
def approve_review(review, actor, note=''):
    if not review.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن اعتماد هذا التقييم في حالته'})
    from apps.hr.scoping import user_within_hr_scope
    if not user_within_hr_scope(review.employee.user, actor):
        raise ValidationError({'detail': 'الموظف خارج نطاقك الإداري'})

    locked = _lock(review)
    # نعيد الحساب عند الاعتماد لا نثق بقيمة مخزّنة: مؤشر أو درجة قد تكون
    # عُدّلت بعد الإرسال.
    total = locked.compute_total()
    if total is None:
        raise ValidationError({'detail': 'التقييم ناقص عند الاعتماد'})

    from_status = locked.status
    locked.status = ReviewStatus.APPROVED
    locked.total_score = total
    locked.rating = locked.rating_for(total)
    locked.decided_by = actor
    locked.decided_at = timezone.now()
    locked.decision_note = note
    locked.save(update_fields=[
        'status', 'total_score', 'rating', 'decided_by', 'decided_at',
        'decision_note', 'updated_at',
    ])
    return locked, from_status


@transaction.atomic
def reject_review(review, actor, reason, note=''):
    if not review.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن رفض هذا التقييم في حالته'})
    if not reason:
        raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})

    locked = _lock(review)
    from_status = locked.status
    locked.status = ReviewStatus.REJECTED
    locked.decided_by = actor
    locked.decided_at = timezone.now()
    locked.rejection_reason = reason
    locked.decision_note = note
    locked.save(update_fields=[
        'status', 'decided_by', 'decided_at', 'rejection_reason',
        'decision_note', 'updated_at',
    ])
    return locked, from_status


@transaction.atomic
def return_review(review, actor, note=''):
    """إعادة التقييم للمُقيِّم لتصحيحه (حالة `RETURNED` لا نهائية)."""
    if review.status != ReviewStatus.SUBMITTED:
        raise ValidationError({'detail': 'الإعادة للتقييم من الحالة المُقدَّمة فقط'})
    locked = _lock(review)
    from_status = locked.status
    locked.status = ReviewStatus.RETURNED
    locked.decision_note = note
    locked.save(update_fields=['status', 'decision_note', 'updated_at'])
    return locked, from_status


@transaction.atomic
def open_cycle(cycle, actor):
    """فتح الدورة: من مسودة إلى مفتوحة.

    `status` غير قابل للكتابة في الـAPI، فالفتح قرار صريح بإرادة المعتمد
    بعد تجهيز المؤشرات. لا نطلب مجموع أوزان 100 هنا لأن المؤشرات تضاف
    وتصحّح ما دامت الدورة قابلة للتعديل (ما دامت `is_editable`)،
    والشرط يُفرض عند الإغلاق.
    """
    if cycle.status != CycleStatus.DRAFT:
        raise ValidationError({'detail': 'لا تُفتح دورة ليست مسودة'})
    if not cycle.kpis.exists():
        raise ValidationError({'detail': 'عرّف مؤشراً واحداً على الأقل قبل الفتح'})
    cycle.status = CycleStatus.OPEN
    cycle.save(update_fields=['status', 'updated_at'])
    return cycle


def close_cycle(cycle, actor, note=''):
    """إغلاق الدورة: مجموع أوزان المؤشرات 100 وكل التقييمات معتمدة."""
    reviews = list(cycle.reviews.all())
    ok, why = cycle.can_close(*reviews)
    if not ok:
        raise ValidationError({'detail': why})
    cycle.status = CycleStatus.CLOSED
    cycle.notes = f'{cycle.notes}\n[إغلاق] {note}'.strip() if note else cycle.notes
    cycle.save(update_fields=['status', 'notes', 'updated_at'])
    return cycle
