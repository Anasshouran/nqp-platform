"""خدمة طلبات النقل: اعتماد الطلب ينفّذ النقل فعلاً.

الأثر الجانبي للاعتماد (داخل معاملة واحدة):
  1. تُغلق التعيينات الهيكلية القديمة بـ`end_date` و`is_active=False`.
  2. يُفتح `OrgAssignment` جديد بالوجهة المعتمدة.
  3. يُسجَّل `EmployeeTimeline` بنوع النقل/الترقية/الخفض.
  4. تُكتب قيود `PostingStatusLog`.

نُبقي هذه المخاطرة (إغلاق تعيينات موظف) داخل خدمة بدل الموديل حتى لا
يُستدعى تعديلٌ عابر من أي مسار آخر دون معاملة وقيود.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from apps.organization.models import OrgAssignment

from .models import EmployeeTimeline, EmployeeTimelineEvent, PostingKind, PostingStatus, PostingStatusLog

#: خريطة `PostingKind` → حدث المسار الوظيفي المقابل.
KIND_TO_TIMELINE_EVENT = {
    PostingKind.TRANSFER: EmployeeTimelineEvent.TRANSFER,
    PostingKind.PROMOTION: EmployeeTimelineEvent.PROMOTION,
    PostingKind.DEMOTION: EmployeeTimelineEvent.DEMOTION,
}


def _describe(assignment):
    """اسم العنصر المُعيَّن فيه، من أعمق مستوى إلى أعلى."""
    for attr in ('position', 'department', 'sector', 'entry_point'):
        if not getattr(assignment, f'{attr}_id', None):
            continue
        obj = getattr(assignment, attr, None)
        if obj is not None:
            return getattr(obj, 'name_ar', '') or str(obj)
    return ''


def record_status(posting, from_status, to_status, actor, note=''):
    return PostingStatusLog.objects.create(
        posting=posting,
        from_status=from_status or '',
        to_status=to_status,
        note=note,
        changed_by=actor,
    )


@transaction.atomic
def approve_posting(posting, actor, note=''):
    """اعتماد الطلب وتطبيقه على التعيينات الهيكلية والمسار الوظيفي."""
    if not posting.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن اعتماد هذا الطلب في حالته الحالية'})

    from apps.hr.scoping import user_within_hr_scope
    employee_user = posting.employee.user
    # المعتمد يجب أن يكون قادراً على رؤبة الموظف في نطاقه: يُرفض طلبٌ
    # لموظف خارج نطاقه حتى لو كانت الصلاحية ممنوحة.
    if not user_within_hr_scope(employee_user, actor):
        raise ValidationError({'detail': 'الموظف خارج نطاقك الإداري'})

    from_status = posting.status
    today = posting.effective_date or timezone.localdate()

    # 1) إغلاق التعيينات القائمة
    old = list(
        OrgAssignment.objects.filter(user=employee_user, is_active=True).select_related(
            'position', 'department', 'sector', 'entry_point',
        )
    )
    for a in old:
        a.is_active = False
        a.end_date = today
        a.save(update_fields=['is_active', 'end_date', 'updated_at'])

    # 2) فتح التعيين الجديد
    new = OrgAssignment.objects.create(
        user=employee_user,
        position=posting.target_position,
        department=posting.target_department,
        sector=posting.target_sector,
        entry_point=posting.target_entry_point,
        is_primary=True,
        start_date=today,
        is_active=True,
    )

    # 3) حدث المسار الوظيفي
    EmployeeTimeline.objects.create(
        employee=posting.employee,
        event=KIND_TO_TIMELINE_EVENT[posting.kind],
        title=posting.get_kind_display(),
        old_position=_describe(old[0]) if old else '',
        new_position=_describe(new),
        start_date=today,
        reason=posting.reason,
        created_by=actor,
    )

    # 4) القرار
    posting.status = PostingStatus.APPROVED
    posting.decided_by = actor
    posting.decided_at = timezone.now()
    posting.decision_note = note
    posting.save(update_fields=['status', 'decided_by', 'decided_at', 'decision_note', 'updated_at'])
    record_status(posting, from_status, PostingStatus.APPROVED, actor, note)
    return posting


def reject_posting(posting, actor, reason, note=''):
    """رفض الطلب: لا يمسّ التعيينات، ويسجّل السبب."""
    if not posting.can_decide(actor):
        raise ValidationError({'detail': 'لا يمكن رفض هذا الطلب في حالته الحالية'})
    if not reason:
        raise ValidationError({'rejection_reason': 'سبب الرفض مطلوب'})

    from_status = posting.status
    posting.status = PostingStatus.REJECTED
    posting.decided_by = actor
    posting.decided_at = timezone.now()
    posting.rejection_reason = reason
    posting.decision_note = note
    posting.save(update_fields=[
        'status', 'decided_by', 'decided_at', 'rejection_reason', 'decision_note', 'updated_at',
    ])
    record_status(posting, from_status, PostingStatus.REJECTED, actor, reason)
    return posting


def submit_posting(posting, actor):
    """إرسال الطلب من مسودة/مُقدَّم إلى حالة الاعتماد."""
    if not posting.can_submit(actor):
        raise ValidationError({'detail': 'لا يمكن إرسال هذا الطلب'})
    from_status = posting.status
    posting.status = PostingStatus.SUBMITTED
    posting.save(update_fields=['status', 'updated_at'])
    record_status(posting, from_status, PostingStatus.SUBMITTED, actor)
    return posting


def cancel_posting(posting, actor, note=''):
    """إلغاء طلب مُقدَّم قبل اعتماده."""
    if not posting.can_cancel(actor):
        raise ValidationError({'detail': 'لا يمكن إلغاء هذا الطلب في حالته الحالية'})
    from_status = posting.status
    posting.status = PostingStatus.CANCELLED
    posting.decision_note = note
    posting.save(update_fields=['status', 'decision_note', 'updated_at'])
    record_status(posting, from_status, PostingStatus.CANCELLED, actor, note)
    return posting
