"""M1.5/M1.6 — أساس عقد التصنيف.

القاعدة المُلزمة:

    INTERNAL data must never accidentally enter a mobile response.

يتحقق الاختبار من:
1. كل حقل في مخطط ``/api/v1/mobile/`` يملك تصنيفاً معتمداً في
   ``apps.mobile_api.classification`` (عدا البنية العامة للغلاف).
2. أي حقل يُصنَّف INTERNAL أو يقع في قائمة الحظر لا يظهر في المخطط إطلاقاً.
3. مستويات التصنيف الخمسة هي المسموحة فقط.
"""

from __future__ import annotations

import pytest
from drf_spectacular.generators import SchemaGenerator

from ..classification import (
    CLASSIFICATION_LEVELS,
    MOBILE_FORBIDDEN_FIELDS,
    MOBILE_RESPONSE_FIELDS,
    classification_of,
)

pytestmark = pytest.mark.django_db

MOBILE_PATH_PREFIX = '/api/v1/mobile/'
# البنية العامة للغلاف تُعامَل كـ PUBLIC ضمنياً (معرَّفة في العقد نفسه).
ENVELOPE_STRUCTURAL_FIELDS = {'status', 'data', 'message'}


def _get_schema() -> dict:
    return SchemaGenerator().get_schema(request=None, public=True) or {}


def _collect_mobile_components(schema: dict) -> dict[str, dict]:
    """يجمع المكوّنات المرجعية من مسارات الجوال فقط (يتبع $ref)."""
    components: dict[str, dict] = {}
    schemas = (schema.get('components') or {}).get('schemas') or {}

    def _resolve(node):
        if isinstance(node, dict):
            ref = node.get('$ref')
            if isinstance(ref, str) and ref.startswith('#/components/schemas/'):
                name = ref.rsplit('/', 1)[-1]
                if name not in components and name in schemas:
                    components[name] = schemas[name]
                    _resolve(schemas[name])
            for value in node.values():
                _resolve(value)
        elif isinstance(node, list):
            for item in node:
                _resolve(item)

    mobile_paths = {
        path: ops
        for path, ops in (schema.get('paths') or {}).items()
        if path.startswith(MOBILE_PATH_PREFIX)
    }
    assert mobile_paths, 'لا توجد مسارات /api/v1/mobile/ في المخطط — فشل توليد العقد'
    _resolve(mobile_paths)
    return components


def test_schema_contains_mobile_namespace():
    schema = _get_schema()
    mobile_paths = [p for p in schema.get('paths', {}) if p.startswith(MOBILE_PATH_PREFIX)]
    assert len(mobile_paths) >= 10, f'مسارات الجوال غير كافية في المخطط: {mobile_paths}'


def test_every_mobile_schema_field_has_approved_classification():
    schema = _get_schema()
    components = _collect_mobile_components(schema)
    unclassified = []
    for name, spec in components.items():
        if spec.get('type') != 'object':
            continue
        props = spec.get('properties') or {}
        for field in props:
            if field in ENVELOPE_STRUCTURAL_FIELDS:
                continue  # بنية الغلاف مُعرَّفة في العقد كـ PUBLIC ضمنياً
            level = classification_of(name, field)
            if level is None:
                unclassified.append(f'{name}.{field}')
            elif level not in CLASSIFICATION_LEVELS:
                unclassified.append(f'{name}.{field} -> مستوى غير معتمد {level}')
    assert not unclassified, (
        'حقول بلا تصنيف معتمد (أضِفها إلى classification.MOBILE_RESPONSE_FIELDS): '
        f'{unclassified}'
    )


def test_no_internal_or_forbidden_field_enters_mobile_schema():
    schema = _get_schema()
    offending = []

    def _walk(node, where=''):
        if isinstance(node, dict):
            for key, value in node.items():
                if key == 'properties' and isinstance(value, dict):
                    for field in value:
                        level = classification_of(where.rstrip('/').rsplit('/', 1)[-1], field)
                        if level == 'INTERNAL' or field in MOBILE_FORBIDDEN_FIELDS:
                            offending.append(f'{where}: {field} ({level or "forbidden"})')
                _walk(value, where)
        elif isinstance(node, list):
            for item in node:
                _walk(item, where)

    mobile_subset = {
        p: ops for p, ops in (schema.get('paths') or {}).items()
        if p.startswith(MOBILE_PATH_PREFIX)
    }
    _walk(mobile_subset)
    # + فحص المكوّنات نفسها
    for name, spec in _collect_mobile_components(schema).items():
        for field in (spec.get('properties') or {}):
            level = classification_of(name, field)
            if level == 'INTERNAL' or field in MOBILE_FORBIDDEN_FIELDS:
                offending.append(f'{name}.{field} ({level or "forbidden"})')
    assert not offending, f'حقول ممنوعة داخل مساحة الجوال: {offending}'


def test_classification_registry_uses_only_approved_levels():
    assert tuple(sorted(CLASSIFICATION_LEVELS)) == (
        'INTERNAL',
        'PERSONAL',
        'PUBLIC',
        'SECURITY_SENSITIVE',
        'SENSITIVE_HEALTH',
    )
    for key, level in MOBILE_RESPONSE_FIELDS.items():
        assert level in CLASSIFICATION_LEVELS, (key, level)


def test_registry_covers_sensitive_health_and_security_domains():
    """ضمان وجود تمثيل فعلي للفئات الحساسة — لا سجل فارغ يجتاز الفحص."""
    levels_used = {level for level in MOBILE_RESPONSE_FIELDS.values()}
    assert 'SENSITIVE_HEALTH' in levels_used
    assert 'SECURITY_SENSITIVE' in levels_used
    assert 'INTERNAL' not in levels_used  # INTERNAL ممنوع من مساحة الجوال أصلاً


def test_every_sensitive_health_field_has_approved_purpose():
    """§10/§21: كل حقل SENSITIVE_HEALTH في مساحة الجوال يملك غرضاً معتمداً."""
    from ..classification import SENSITIVE_HEALTH_FIELD_PURPOSES

    missing = [
        key
        for key, level in MOBILE_RESPONSE_FIELDS.items()
        if level == 'SENSITIVE_HEALTH' and key not in SENSITIVE_HEALTH_FIELD_PURPOSES
    ]
    assert not missing, f'حقول SENSITIVE_HEALTH بلا غرض معتمد: {missing}'
    # ولا غرض مُسجَّل لعقار غير مصنَّف SENSITIVE_HEALTH (لا قيود ميتة)
    stale = [
        key for key in SENSITIVE_HEALTH_FIELD_PURPOSES
        if MOBILE_RESPONSE_FIELDS.get(key) != 'SENSITIVE_HEALTH'
    ]
    assert not stale, f'أغراض معتمدة لحقول غير مصنَّفة SENSITIVE_HEALTH: {stale}'


def test_scrubbing_boundary_sensitive_health_never_raw_in_telemetry():
    """الحاجز المطلوب صراحةً في العقد §14/§18: SENSITIVE_HEALTH → SCRUBBED.

    هنا نُثبِّت قاعدة التصنيف نفسها؛ وحدة القياس على مكتبة القياس (M1.10)
    تُختبَر في ``mobile/tests`` على جانب العميل، أما الخادم فلا يُرسِل
    حقول مصنَّفة أبداً إلى القياس (انظر test_no_internal_... أعلاه).
    """
    from ..classification import classification_of as cf

    assert cf('MobileCertificate', 'vaccine_name') == 'SENSITIVE_HEALTH'
    assert cf('MobileCertificate', 'status') == 'SENSITIVE_HEALTH'
    assert cf('MobileDeclaration', 'status') == 'SENSITIVE_HEALTH'
    # حقول الأمان الحسّاسة مُصنَّفة SECURITY_SENSITIVE (تُعامل كحد أدنى)
    assert cf('MobileAuthLoginResponse', 'access_token') == 'SECURITY_SENSITIVE'
