"""M1.5 → P1.5 — الحد الداخلي: بيانات الموظفين/العمليات لا تصل بمقاعد الجوال.

سياسة الإفصاح المعتمدة:
* سطح داخلي يستخدم مخطط مصادقة مختلف (مفتاح شركة ناقل) → 401 لمن لا يحمله.
* سطح داخلي محميّ بـ RBAC (PermissionAction) → 403 لرمز مسافر بلا صلاحية.
* مساحة الجوال لا تُصدِّر أي مكوّن INTERNAL في مخططها (test_classification.py).

SEC-M0-1 (P1.5): ``/api/v1/screening/`` لم يعد مفتوحاً لأي رمز مصادَق عليه —
RBAC (screening:*) + نطاق port إلزاميان الآن؛ اختبار ``test_screening_denied_for_traveler_token``
مُحوَّل من xfail إلى اختبار عادي (القدر المُثبت: 403).
"""

from __future__ import annotations

import pytest

from .conftest import MOBILE_PROTECTED_ENDPOINTS  # noqa: F401  (يحمّل الإصلاحات)

pytestmark = pytest.mark.django_db


def test_db_admin_denied_for_traveler_token(client_a):
    """مدير قاعدة البيانات (داخلي) → 403 لرمز مسافر."""
    response = client_a.get('/api/v1/dbadmin/dashboard/overview/')
    assert response.status_code == 403, response.data


def test_emergency_alerts_denied_for_traveler_token(client_a):
    """تنبيهات الطوارئ (inner surface, resource=surveillance) → 403 لرمز مسافر."""
    response = client_a.get('/api/v1/emergency/alerts/')
    assert response.status_code == 403, response.data


def test_carrier_integration_requires_api_key(client_a):
    """بوابة تكامل الناقلين (X-API-Key) → 401 لمن يحمل JWT مسافر بلا مفتاح.

    مخطط مصادقة مختلف تماماً عن مساحة الجوال: رمز الجوال لا يُحقن هويته أبداً.
    """
    response = client_a.get('/api/v1/carriers/integration/health-notices/')
    assert response.status_code == 401, response.data


def test_carrier_flights_rbac_denied_for_traveler_token(client_a):
    """رحلات الناقلين (RBAC flights:view) → 403 لرمز مسافر."""
    response = client_a.get('/api/v1/carriers/flights/')
    assert response.status_code == 403, response.data


def test_internal_surfaces_require_auth_anonymous(anonymous_client):
    for path in (
        '/api/v1/dbadmin/dashboard/overview/',
        '/api/v1/emergency/alerts/',
        '/api/v1/screening/',
        '/api/v1/carriers/integration/health-notices/',
    ):
        response = anonymous_client.get(path)
        assert response.status_code in (401, 403), (path, response.status_code)


def test_screening_denied_for_traveler_token(client_a):
    """SEC-M0-1 (P1.5): الفحص محمي بـ RBAC الآن — رمز مسافر بلا‎ screening:view → 403.

    المصادقة (JWT) وحدها لا تكفي: التفويض مطلوب صراحةً.
    """
    response = client_a.get('/api/v1/screening/')
    assert response.status_code in (403, 404), response.data


def test_mobile_namespace_never_mounts_internal_apps():
    """ضمان تصميمي: مساحة الجوال لا تُعرِّف أي مسار لأطباق داخلية."""
    from django.urls import get_resolver

    def _walk(urlpatterns, prefix=''):
        leaves = []
        for entry in urlpatterns:
            if hasattr(entry, 'url_patterns'):
                leaves += _walk(entry.url_patterns, prefix + str(entry.pattern))
            else:
                leaves.append(prefix + str(entry.pattern))
        return leaves

    mobile_leaves = [
        p for p in _walk(get_resolver().url_patterns)
        if p.startswith('api/v1/mobile/')
    ]
    assert mobile_leaves, 'يجب أن تكون مساحة الجوال مسجّلة'
    internal_markers = ('screening', 'dbadmin', 'emergency', 'it-management', 'risk')
    for leaf in mobile_leaves:
        for marker in internal_markers:
            assert f'/{marker}' not in leaf, f'مسار داخلي داخل مساحة الجوال: {leaf}'
