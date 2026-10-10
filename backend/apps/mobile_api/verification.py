"""F-M1-3 — حمولة التحقق الأدنى لعملية تحقق QR/شهادة عبر الجوال (§20).

المبادئ: تقليل البيانات، تحديد الغرض، التصنيف. أي حقل غير معتمد لا يُعرَّض
لمجرد أنه موجود اليوم (مثل vaccine_name_ar/vaccine_code في `public/verify`).

المرجع الكامل والجدول (field/purpose/classification/source/consumer/required/retention)
في ``docs/mobile/MINIMAL_VERIFICATION_PAYLOAD.md``.
"""

from __future__ import annotations

from .classification import CLASSIFICATION_LEVELS

# الحمولة الأدنى المعتمدة لاستجابة تحقق شهادة عبر الجوال.
VERIFICATION_FIELDS: dict[str, tuple[str, str]] = {
    # field: (purpose, classification)
    'verified': ('نتيجة قاطعة للاعتماد (صحيح/غير صحيح)', 'PUBLIC'),
    'signature_valid': ('سلامة التوقيع المقروء من QR', 'PUBLIC'),
    'verified_at': ('طابع زمني للتحقق — للتدقيق/النزاعات', 'PUBLIC'),
    'certificate_number': ('مرجع الشهادة للتواصل مع مصدر الإصدار', 'SECURITY_SENSITIVE'),
    'status': ('حالة دورة حياة الشهادة — تُظهر الصلاحية الصحية', 'SENSITIVE_HEALTH'),
    'valid_until': ('دليل نافذة السريان — غرض تحقق محدد', 'SENSITIVE_HEALTH'),
    'signature': ('التوقيع المقروء للتحقق (فقاعة echo اختيارية)', 'SECURITY_SENSITIVE'),
}

# حقول **ممنوعة** في أي استجابة تحقق جوال (تتطلب اعتماد صاحب المنتج لإضافتها).
VERIFICATION_FORBIDDEN_FIELDS: frozenset[str] = frozenset({
    'vaccine_name_ar',
    'vaccine_name',
    'vaccine_code',
    'issued_at',
    'passport_number',
    'passport_hash',
    'traveler_id',
    'traveler_name',
    'full_name',
    'nationality',
    'rejection_reason',
    'risk_score',
    'risk_assessment',
    'internal_notes',
    'staff_notes',
    'operator_notes',
})


def is_verification_field_allowed(name: str) -> bool:
    return name in VERIFICATION_FIELDS and name not in VERIFICATION_FORBIDDEN_FIELDS


def verification_classification(name: str) -> str | None:
    entry = VERIFICATION_FIELDS.get(name)
    if entry is None:
        return None
    _purpose, level = entry
    if level not in CLASSIFICATION_LEVELS:
        raise ValueError(f'تصنيف غير معتمد: {name} -> {level}')
    return level