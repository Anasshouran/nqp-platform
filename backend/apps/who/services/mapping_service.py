"""خدمة اقتراحات ربط الأمراض بكيانات/أكواد ICD-11 — قراءة-آمنة.

لا تُعدّل هذه الخدمة حقول Disease أبداً (لا icd_11_code ولا الأسماء) ولا
تمنح موافقة تلقائية؛ كل ما تفعله هو تسجيل/تحديث اقتراح ربط في WHOICDMapping.
"""

from decimal import Decimal

from django.db import transaction

from apps.laboratory.models import Disease
from apps.who.models import WHOICDMapping


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
    is_current: bool = True,
) -> WHOICDMapping:
    """إنشاء/تحديث اقتراح ربط دون لمس بيانات المرض ودون موافقة تلقائية.

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