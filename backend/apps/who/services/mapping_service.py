"""خدمة اقتراحات ربط الأمراض بكيانات/أكواد ICD-11 — قراءة-آمنة.

لا تُعدّل هذه الخدمة حقول Disease أبداً (لا icd_11_code ولا الأسماء) ولا
تمنح موافقة تلقائية؛ الموافقة قرار بشري عبر approve_mapping فقط.
"""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.laboratory.models import Disease
from apps.who.models import WHOICDMapping


class MappingTransitionError(Exception):
    """انتقال حالة غير مسموح في سير عمل مراجعة خرائط ICD-11."""


ALLOWED_TRANSITIONS = {
    WHOICDMapping.MappingStatus.PENDING: {WHOICDMapping.MappingStatus.PROPOSED},
    WHOICDMapping.MappingStatus.PROPOSED: {WHOICDMapping.MappingStatus.REVIEW},
    WHOICDMapping.MappingStatus.REVIEW: {
        WHOICDMapping.MappingStatus.APPROVED,
        WHOICDMapping.MappingStatus.REJECTED,
    },
}


def _validate_transition(mapping: WHOICDMapping, target: str) -> None:
    """رفض الانتقالات غير المسموح بها (مثل REJECTED→APPROVED أو PROPOSED→APPROVED)."""
    current = mapping.mapping_status
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise MappingTransitionError(
            f'الانتقال غير مسموح من {current} إلى {target} في خرائط ICD-11.'
        )


def demote_current_mappings(disease: Disease, who_release: str) -> int:
    """إنزال الربط الحالي السابق إلى is_current=False ليُحفظ في التاريخ."""
    return WHOICDMapping.objects.filter(
        disease=disease,
        who_release=who_release,
        is_current=True,
    ).update(is_current=False)


def create_mapping_proposal(
    disease: Disease,
    who_release: str,
    foundation_uri: str = '',
    mms_uri: str = '',
    icd_11_code: str = '',
    title_en: str = '',
    title_ar: str = '',
    match_type: str = '',
    confidence=None,
    source_query: str = '',
    mapping_status: str = WHOICDMapping.MappingStatus.PENDING,
    notes: str = '',
    is_current: bool = False,
) -> WHOICDMapping:
    """إنشاء اقتراح ربط دون لمس بيانات المرض ودون موافقة تلقائية.

    عند إنشاء ربط حالي جديد لنفس المرض والإصدار، يُنزَّل الربط الحالي
    السابق إلى ``is_current=False`` داخل نفس المعاملة احتراماً للقيد
    ``uniq_current_who_mapping_per_release``.
    """
    if confidence is not None:
        confidence = Decimal(str(confidence))
    with transaction.atomic():
        if is_current:
            demote_current_mappings(disease, who_release)
        return WHOICDMapping.objects.create(
            disease=disease,
            who_release=who_release,
            foundation_uri=foundation_uri,
            mms_uri=mms_uri,
            icd_11_code=icd_11_code,
            title_en=title_en,
            title_ar=title_ar,
            mapping_status=mapping_status,
            confidence=confidence,
            match_type=match_type,
            source_query=source_query,
            is_current=is_current,
            notes=notes,
        )


def update_mapping_proposal(mapping: WHOICDMapping, **fields) -> WHOICDMapping:
    """تحديث اقتراح غير مكتمل الحسم (PENDING/PROPOSED).

    لا يُسمح بتغيير المرض (disease) ولا حسم الحالة (mapping_status/is_current)
    من هنا — الحسم عبر المراجعة/الاعتماد/الرفض فقط.
    """
    if mapping.mapping_status in (
        WHOICDMapping.MappingStatus.APPROVED,
        WHOICDMapping.MappingStatus.REJECTED,
    ):
        raise MappingTransitionError('لا يمكن تعديل اقتراح ربط محسوم.')
    editable = {
        'who_release': mapping.who_release,
        'foundation_uri': mapping.foundation_uri,
        'mms_uri': mapping.mms_uri,
        'icd_11_code': mapping.icd_11_code,
        'title_en': mapping.title_en,
        'title_ar': mapping.title_ar,
        'confidence': mapping.confidence,
        'match_type': mapping.match_type,
        'source_query': mapping.source_query,
        'notes': mapping.notes,
    }
    for field in editable:
        if field in fields and fields[field] is not None:
            setattr(mapping, field, fields[field])
    mapping.save(update_fields=list(editable) + ['updated_at'])
    mapping.refresh_from_db()
    return mapping


def submit_mapping_for_review(
    mapping: WHOICDMapping, user=None
) -> WHOICDMapping:
    """إرسال المقترح للمراجعة البشرية (PROPOSED → REVIEW)."""
    _validate_transition(mapping, WHOICDMapping.MappingStatus.REVIEW)
    mapping.mapping_status = WHOICDMapping.MappingStatus.REVIEW
    mapping.save(update_fields=['mapping_status', 'updated_at'])
    mapping.refresh_from_db()
    return mapping


def approve_mapping(mapping: WHOICDMapping, user=None) -> WHOICDMapping:
    """اعتماد بشري نهائي لاقتراح الربط (REVIEW → APPROVED).

    داخل معاملة واحدة: ينزل أي ربط حالي سابق لنفس المرض والإصدار، ثم
    يجعل هذا الاقتراح ``APPROVED`` و``is_current=True`` مع تسجيل المراجعة.
    لا يعدّل بيانات Disease مطلقاً.
    """
    _validate_transition(mapping, WHOICDMapping.MappingStatus.APPROVED)
    with transaction.atomic():
        demote_current_mappings(mapping.disease, mapping.who_release)
        mapping.mapping_status = WHOICDMapping.MappingStatus.APPROVED
        mapping.is_current = True
        mapping.reviewed_at = timezone.now()
        mapping.reviewed_by = user
        mapping.save(update_fields=[
            'mapping_status', 'is_current', 'reviewed_at', 'reviewed_by', 'updated_at',
        ])
    mapping.refresh_from_db()
    return mapping


def reject_mapping(mapping: WHOICDMapping, user=None) -> WHOICDMapping:
    """رفض بشري لاقتراح الربط (REVIEW → REJECTED) دون لمس Disease."""
    _validate_transition(mapping, WHOICDMapping.MappingStatus.REJECTED)
    mapping.mapping_status = WHOICDMapping.MappingStatus.REJECTED
    mapping.reviewed_at = timezone.now()
    mapping.reviewed_by = user
    mapping.save(update_fields=[
        'mapping_status', 'reviewed_at', 'reviewed_by', 'updated_at',
    ])
    mapping.refresh_from_db()
    return mapping