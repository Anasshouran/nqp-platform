"""F-M1-3 — تنفيذ اختبارات حمولة التحقق الأدنى (§20/§21).

القاعدة الآلية المطلوبة:
  * SENSITIVE_HEALTH → مخصص لغرض معتمد (المصنَّف في VERIFICATION_FIELDS).
  * SECURITY_SENSITIVE/INTERNAL لا تدخل استجابات المسافر.
  * حقل ممنوع جديد (مثل passport_number/vaccine_name) في مستقبل المخطط ⇒ فشل فوري.
"""

from __future__ import annotations

import pytest

from ..classification import CLASSIFICATION_LEVELS
from ..verification import (
    VERIFICATION_FIELDS,
    VERIFICATION_FORBIDDEN_FIELDS,
    is_verification_field_allowed,
    verification_classification,
)

pytestmark = pytest.mark.django_db


def test_verification_fields_use_only_approved_classifications():
    for name, (_purpose, level) in VERIFICATION_FIELDS.items():
        assert level in CLASSIFICATION_LEVELS, (name, level)
        assert level != 'INTERNAL', f'{name} لا يُصنَّف INTERNAL أبداً في الجوال'


def test_sensitive_health_fields_have_explicit_approved_purpose():
    for name, (purpose, level) in VERIFICATION_FIELDS.items():
        if level == 'SENSITIVE_HEALTH':
            assert purpose and len(purpose) > 10, f'{name} يفتقر لغرض معتمد'


def test_no_forbidden_field_is_in_allowed_set():
    for field in VERIFICATION_FORBIDDEN_FIELDS:
        assert not is_verification_field_allowed(field), (
            f'حقل ممنوع {field} أصبح مقبولاً — يتطلب اعتماداً صريحاً'
        )


def test_allowed_set_is_consistent():
    for name in VERIFICATION_FIELDS:
        assert is_verification_field_allowed(name)
        assert verification_classification(name) is not None


def test_security_sensitive_requires_minimal_semantics():
    assert verification_classification('signature') == 'SECURITY_SENSITIVE'
    assert verification_classification('certificate_number') == 'SECURITY_SENSITIVE'


def test_forbidden_set_catches_known_pii_and_health_fields():
    """حارس ثابت: PII والبيانات الصحية المعروفة محظورة في تحقق الجوال."""
    for field in ('passport_number', 'traveler_id', 'vaccine_name_ar', 'risk_score', 'issued_at'):
        assert field in VERIFICATION_FORBIDDEN_FIELDS, field