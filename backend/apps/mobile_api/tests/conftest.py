"""مشترك لاختبارات عقد ``/api/v1/mobile/`` (M1.5).

يوثّق الحدود (boundaries) المُختبَرة:
* حد المصادقة (authN): كل مسار محميّ يرفض بدون JWT.
* حد التفويض (authZ): المسافر أ لا يرى موارد المسافر ب (عبر الواجهة القائمة
  التي ستُستهلَك لاحقاً من مساحة الجوال).
* حد الداخلي (internal): رمز مسافر/جوال لا يصل إلى الأسطح الداخلية.
* غلاف الاستجابة + التصنيف + تجزئة العقد.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.travelers.models import Country, Traveler

User = get_user_model()

# (HTTP method, path) — مسارات محميّة في مساحة الجوال (تتطلب JWT).
# تضم نقاط M2-A المنفَّذة ونقاط التنفيذ المؤجل.
MOBILE_IMPLEMENTED_ENDPOINTS = [
    ('get', '/api/v1/mobile/profile/'),
    ('get', '/api/v1/mobile/requirements/'),
    ('get', '/api/v1/mobile/certificates/'),
    ('get', '/api/v1/mobile/declarations/'),
    ('get', '/api/v1/mobile/notifications/'),
    ('patch', '/api/v1/mobile/notifications/00000000-0000-0000-0000-000000000001/read/'),
    ('get', '/api/v1/mobile/sync/status/'),
]
# نقاط كائنات قد تُفحص بعزل (المستخدم بلا وصول لموارد غيره).
MOBILE_OBJECT_ENDPOINTS = [
    ('get', '/api/v1/mobile/certificates/00000000-0000-0000-0000-000000000001/'),
]
# نقاط التنفيذ المؤجل (SUDAPASS Q8 أو فجوة نطاق موثقة).
MOBILE_DEFERRED_ENDPOINTS = [
    ('get', '/api/v1/mobile/trips/'),
    ('get', '/api/v1/mobile/trips/00000000-0000-0000-0000-000000000001/'),
    ('post', '/api/v1/mobile/declarations/'),
]
MOBILE_PROTECTED_ENDPOINTS = MOBILE_IMPLEMENTED_ENDPOINTS + MOBILE_OBJECT_ENDPOINTS + MOBILE_DEFERRED_ENDPOINTS

# مسارات الدخول نفسها — مسموح دون JWT (وليس منفذاً لبيانات مسافر).
MOBILE_ANONYMOUS_ENDPOINTS = [
    ('post', '/api/v1/mobile/auth/login/'),
    ('post', '/api/v1/mobile/auth/refresh/'),
]

ALL_MOBILE_ENDPOINTS = MOBILE_ANONYMOUS_ENDPOINTS + MOBILE_PROTECTED_ENDPOINTS


def bearer(user) -> str:
    """يولّد رمز **وصول** (access) JWT لمستخدم دون المرور بواجهة الدخول."""
    refresh = RefreshToken.for_user(user)
    return f'Bearer {str(refresh.access_token)}'


def client_for(user) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=bearer(user))
    return client


def travel_user(email: str, passport: str, first: str, last: str):
    """مستخدم مسافر + سجل Traveler مرتبط (يُستخدم لاختبارات العزل)."""
    user = User.objects.create_user(
        email=email,
        password='StrongPass123!',
        full_name=f'{first} {last}',
        user_type=User.UserType.TRAVELER,
    )
    return user


@pytest.fixture
def country(db):
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def traveler_a(db, country):
    user = travel_user('m0-traveler-a@nqp.gov.sd', 'PA1111111', 'أحمد', 'علي')
    record = Traveler.objects.create(
        passport_number='PA1111111',
        first_name='أحمد',
        last_name='علي',
        date_of_birth='1990-01-01',
        nationality=country,
        user=user,
    )
    return user, record


@pytest.fixture
def traveler_b(db, country):
    user = travel_user('m0-traveler-b@nqp.gov.sd', 'PB2222222', 'سارة', 'محمود')
    record = Traveler.objects.create(
        passport_number='PB2222222',
        first_name='سارة',
        last_name='محمود',
        date_of_birth='1992-02-02',
        nationality=country,
        user=user,
    )
    return user, record


@pytest.fixture
def client_a(traveler_a):
    return client_for(traveler_a[0])


@pytest.fixture
def client_b(traveler_b):
    return client_for(traveler_b[0])


@pytest.fixture
def anonymous_client():
    return APIClient()
