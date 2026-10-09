"""M1.5 — حد المصادقة لمساحة ``/api/v1/mobile/``.

السلوك المتوقَّع (سياسة الإفصاح المعتمدة):
* مسار محميّ بلا JWT  → 401 + غلاف ``AUTH_REQUIRED`` ثنائية اللغة.
* مسار دخول (login/refresh) → مسموح دون JWT، ويرجع 501 صريحاً
  (لا رموز مُختلقة، لا انتحال هوية، لا تجاوز لمصادقة SUDAPASS).
"""

from __future__ import annotations

import pytest

from ..envelope import ERROR_MESSAGES
from .conftest import (
    ALL_MOBILE_ENDPOINTS,
    MOBILE_ANONYMOUS_ENDPOINTS,
    MOBILE_DEFERRED_ENDPOINTS,
    MOBILE_IMPLEMENTED_ENDPOINTS,
    MOBILE_OBJECT_ENDPOINTS,
    MOBILE_PROTECTED_ENDPOINTS,
)

pytestmark = pytest.mark.django_db


def _call(client, method, path):
    return getattr(client, method)(path, format='json')


def assert_error_envelope(body, expected_code: str):
    """يتحقق من الغلاف المعتمد: {status, data, message:{code, ar, en}}."""
    assert set(body.keys()) == {'status', 'data', 'message'}, body
    assert body['status'] == 'error'
    assert body['data'] is None
    msg = body['message']
    assert set(msg.keys()) == {'code', 'ar', 'en'}, msg
    assert msg['code'] == expected_code
    assert msg['ar'] and msg['en']
    assert msg['ar'] == ERROR_MESSAGES[expected_code][0]
    assert msg['en'] == ERROR_MESSAGES[expected_code][1]
    # لا تسرّب للمعلومات الداخلية
    for forbidden in ('detail', 'traceback', 'stack', 'sql', 'password'):
        assert forbidden not in str(body).lower()


@pytest.mark.parametrize('method,path', MOBILE_PROTECTED_ENDPOINTS)
def test_protected_mobile_endpoint_requires_jwt(anonymous_client, method, path):
    response = _call(anonymous_client, method, path)
    assert response.status_code == 401, (path, response.status_code, response.data)
    assert_error_envelope(response.data, 'AUTH_REQUIRED')


@pytest.mark.parametrize('method,path', MOBILE_ANONYMOUS_ENDPOINTS)
def test_login_paths_allowed_anonymous_but_return_explicit_501(anonymous_client, method, path):
    """لا يُختلَق إنتاج/هوية: 501 صريح وغلاف خطأ معتمد."""
    response = _call(anonymous_client, method, path)
    assert response.status_code == 501, (path, response.status_code, response.data)
    assert_error_envelope(response.data, 'NOT_IMPLEMENTED')
    body = str(response.data).lower()
    assert 'access_token' not in body and 'refresh_token' not in body


@pytest.mark.parametrize('method,path', MOBILE_IMPLEMENTED_ENDPOINTS)
def test_protected_mobile_endpoint_responds_for_authenticated_traveler(client_a, method, path):
    """M2-A: نقطة منفَّذة تستجيب (200) أو تكذب إخفاءً (404) لمستخدم مسجل — لا 401/501."""
    response = _call(client_a, method, path)
    assert response.status_code in (200, 404), (path, response.status_code, response.data)
    assert response.status_code not in (401, 501), (path, response.status_code)


@pytest.mark.parametrize('method,path', MOBILE_DEFERRED_ENDPOINTS)
def test_deferred_endpoint_returns_explicit_501(client_a, method, path):
    """نقاط التنفيذ المؤجل (SUDAPASS Q8 أو فجوة نطاق) → 501 صريح بلا بيانات مختلقة."""
    response = _call(client_a, method, path)
    assert response.status_code == 501, (path, response.status_code)
    assert_error_envelope(response.data, 'NOT_IMPLEMENTED')


@pytest.mark.parametrize('method,path', MOBILE_OBJECT_ENDPOINTS)
def test_object_endpoint_hides_foreign_resource(client_a, method, path):
    """مسار كائن بلا ملكية من مبدأ مسجل → 404 (إخفاء لا تأكيد)."""
    response = _call(client_a, method, path)
    assert response.status_code == 404, (path, response.status_code)
    assert_error_envelope(response.data, 'NOT_FOUND')


def test_method_not_allowed_uses_mobile_envelope(anonymous_client):
    response = anonymous_client.get('/api/v1/mobile/auth/login/', format='json')
    assert response.status_code == 405
    assert_error_envelope(response.data, 'METHOD_NOT_ALLOWED')


def test_expired_or_garbage_token_rejected(anonymous_client):
    response = anonymous_client.get(
        '/api/v1/mobile/profile/',
        HTTP_AUTHORIZATION='Bearer not-a-real-token',
        format='json',
    )
    assert response.status_code == 401
    assert_error_envelope(response.data, 'AUTH_INVALID')


def test_all_mobile_endpoints_listed_in_boundary_matrix():
    """ضمان عدم إغفال أي مسار جديد من مصفوفة الحدود عند إضافة نقاط لاحقاً."""
    from django.urls import get_resolver

    def _mobile_paths(urlpatterns, prefix=''):
        found = set()
        for entry in urlpatterns:
            if hasattr(entry, 'url_patterns'):
                found |= _mobile_paths(entry.url_patterns, prefix + str(entry.pattern))
            elif prefix + str(entry.pattern):
                found.add('/' + prefix + str(entry.pattern).lstrip('/'))
        return found

    resolver = get_resolver()
    registered = {
        p for p in _mobile_paths(resolver.url_patterns)
        if p.startswith('/api/v1/mobile/')
    }
    documented = {path for _, path in ALL_MOBILE_ENDPOINTS}
    # المسارات ذات الوسوم القيودية <uuid:pk> تُطبَّق يدوياً في المصفوفة
    unparameterized_registered = {p.replace('<uuid:pk>', '00000000-0000-0000-0000-000000000001') for p in registered}
    missing = documented - unparameterized_registered
    assert not missing, f'مسارات موثّقة في مصفوفة الحدود غير مسجّلة: {missing}'
