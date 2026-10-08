"""خدمة سجلات الحضور: الإدخال والاعتماد.

مقصود فصل الاعتماد عن الإدخال في دالة واحدة: `approve_record` ترفض
المُسجِّل نفسه، فلا يمكن لأحد أن يوثّق حضوره ويوثّقه في السجل نفسه مهما
تغيّرت الأدوار.
"""

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import AttendanceRecord


@transaction.atomic
def approve_record(record, actor, note=''):
    """اعتماد سجل حضور.

    يُعاد السجل من قاعدة البيانات بـ`select_for_update` حتى لا يعتمد
    شخصان السجل نفسه بالتزامن (كان ترتيبٌ واحد يُبطل الآخر بصمت).
    """
    locked = AttendanceRecord.objects.select_for_update().filter(pk=record.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'السجل غير موجود'})
    if not locked.can_approve(actor):
        raise ValidationError({'detail': 'لا يمكن اعتماد هذا السجل'})
    locked.is_approved = True
    locked.approved_by = actor
    locked.approved_at = timezone.now()
    if note:
        locked.notes = f'{locked.notes}\n[اعتماد] {note}'.strip() if locked.notes else f'[اعتماد] {note}'
    locked.save(update_fields=['is_approved', 'approved_by', 'approved_at', 'notes', 'updated_at'])
    return locked


@transaction.atomic
def unapprove_record(record, actor, note=''):
    """سحب اعتماد سجل (تصحيح بعد الاعتماد)."""
    locked = AttendanceRecord.objects.select_for_update().filter(pk=record.pk).first()
    if locked is None:
        raise ValidationError({'detail': 'السجل غير موجود'})
    if not locked.is_approved:
        raise ValidationError({'detail': 'السجل غير معتمد'})
    locked.is_approved = False
    locked.approved_by = None
    locked.approved_at = None
    locked.save(update_fields=['is_approved', 'approved_by', 'approved_at', 'updated_at'])
    return locked
