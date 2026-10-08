"""M2-A — اختبارات نطاق نقاط الجوال المنفَّذة (profile/certs/requirements/
declarations/notifications/sync) + العزل والتقليل والتحقق.

الموضوعات (Gates A/C/D/E): ملكية خادم، لا IDOR، لا حقول مخاطرة/داخلية،
لا تسريب نص إشعار، لا 2xx لموارد غيره، بلا كتابة قابلة لإعادة التشغيل في
هذه الموجة (declarations POST = 501) باستثناء تحديث قراءة مطابق ومحدد.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.notifications.models import NotificationLog
from apps.vaccination.models import VaccinationCertificate, Vaccine

from .conftest import MOBILE_DEFERRED_ENDPOINTS, MOBILE_OBJECT_ENDPOINTS

pytestmark = pytest.mark.django_db


@pytest.fixture
def vaccine(db):
    return Vaccine.objects.create(code='YF', name_ar='الحمى الصفراء', name_en='Yellow Fever')


@pytest.fixture
def cert_a(traveler_a, vaccine):
    _user, record = traveler_a
    return VaccinationCertificate.objects.create(
        traveler=record,
        vaccine=vaccine,
        certificate_number='AFY-VAC-A-0001',
        status=VaccinationCertificate.Status.ACTIVE,
        valid_until=date.today() + timedelta(days=365),
    )


@pytest.fixture
def cert_b(traveler_b, vaccine):
    _user, record = traveler_b
    return VaccinationCertificate.objects.create(
        traveler=record,
        vaccine=vaccine,
        certificate_number='AFY-VAC-B-0001',
        status=VaccinationCertificate.Status.ACTIVE,
        valid_until=date.today() + timedelta(days=365),
    )


@pytest.fixture
def declare_a(traveler_a):
    _user, record = traveler_a
    record.medical_history = {
        'health_declaration': {
            'status': 'SUBMITTED',
            'symptoms': ['COUGH'],
            'risk_score': 87,  # داخلية — يجب ألا تظهر في الجوال
            'risk_level': 'HIGH',  # داخلية — يجب ألا تظهر في الجوال
            'submitted_at': '2026-10-01T08:00:00+00:00',
        }
    }
    record.save(update_fields=['medical_history'])
    return record


@pytest.fixture
def notifications(traveler_a, traveler_b):
    user_a, _ = traveler_a
    user_b, _ = traveler_b
    NotificationLog.objects.create(
        user=user_a, channel='push', recipient='x', subject='تذكير أ',
        body='internal body a', status=NotificationLog.NotificationStatus.SENT,
    )
    NotificationLog.objects.create(
        user=user_a, channel='email', recipient='x', subject='تذكير أ2',
        body='internal body a2', status=NotificationLog.NotificationStatus.SENT,
    )
    NotificationLog.objects.create(
        user=user_b, channel='push', recipient='y', subject='تذكير ب',
        body='internal body b', status=NotificationLog.NotificationStatus.SENT,
    )
    return user_a, user_b


# ------------------------------------------------------------------ profile --
def test_profile_returns_own_mobile_safe_fields(client_a, traveler_a):
    _user, _record = traveler_a
    resp = client_a.get('/api/v1/mobile/profile/')
    assert resp.status_code == 200
    body = resp.json()
    assert body['status'] == 'success'
    data = body['data']
    assert set(data.keys()) == {'id', 'full_name', 'email', 'phone', 'national_id', 'user_type'}
    assert data['full_name']
    # لا RBAC/تدقيق/أذونات
    for forbidden in ('role', 'permissions', 'user_roles', 'audit', 'is_staff'):
        assert forbidden not in data


# ------------------------------------------------------------ certificates ---
def test_certificates_list_own_only(client_a, cert_a, cert_b):
    resp = client_a.get('/api/v1/mobile/certificates/')
    assert resp.status_code == 200
    rows = resp.json()['data']
    ids = {row['id'] for row in rows}
    assert str(cert_a.id) in ids
    assert str(cert_b.id) not in ids  # عزل: لا شهادة غيره
    assert all(str(row['id']) == str(cert_a.id) for row in rows)


def test_certificate_detail_own(client_a, cert_a):
    resp = client_a.get(f'/api/v1/mobile/certificates/{cert_a.id}/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['certificate_number'] == cert_a.certificate_number
    assert data['vaccine_name'] == 'الحمى الصفراء'
    assert 'signature' not in data and 'qr_token' not in data


@pytest.mark.parametrize('method,path_template', MOBILE_OBJECT_ENDPOINTS)
def test_certificate_foreign_object_404(client_b, cert_a, method, path_template):
    """كائن غيره → 404 (إخفاء) — IDOR مغلق."""
    path = path_template.replace('00000000-0000-0000-0000-000000000001', str(cert_a.id))
    resp = getattr(client_b, method)(path)
    assert resp.status_code == 404


# --------------------------------------------------------- requirements ------
def test_requirements_projection_no_fabrication(traveler_a, client_a):
    user_a, _ = traveler_a
    from apps.carriers.models import HealthNotice
    HealthNotice.objects.create(
        title='متطلب دخول حقيقي', description='من المصدر الرسمي',
        category=HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
        priority=HealthNotice.NoticePriority.HIGH,
    )
    resp = client_a.get('/api/v1/mobile/requirements/')
    assert resp.status_code == 200
    rows = resp.json()['data']
    assert rows, 'يجب ظهور متطلبات صحية حقيقية'
    row = rows[0]
    # حقول الإسقاط المعمول بها فقط
    assert set(row.keys()) == {
        'code', 'title_ar', 'title_en', 'description_ar', 'priority', 'category',
        'effective_from', 'effective_until', 'published_at',
    }
    assert row['title_ar'] == 'متطلب دخول حقيقي'
    assert row['title_en'] == ''  # لا ترجمة مخترعة


# ---------------------------------------------------------- declarations -----
def test_declarations_minimal_no_risk_fields(client_a, declare_a):
    resp = client_a.get('/api/v1/mobile/declarations/')
    assert resp.status_code == 200
    payload = str(resp.json()).lower()
    rows = resp.json()['data']
    assert rows and rows[0]['declared'] is True
    assert rows[0]['symptoms'] == ['COUGH']
    # لا حقول مخاطرة داخلية إطلاقاً
    for risky in ('risk_score', 'risk_level', 'risk_assessment', 'screening', 'surveillance'):
        assert risky not in payload


def test_declarations_reflects_undeclared_state(client_a, traveler_a):
    resp = client_a.get('/api/v1/mobile/declarations/')
    assert resp.status_code == 200
    rows = resp.json()['data']
    assert len(rows) == 1
    assert rows[0]['declared'] is False
    assert rows[0]['symptoms'] == []
    assert rows[0]['status'] == ''


# --------------------------------------------------------- notifications -----
def test_notifications_own_only(client_a, notifications):
    user_a, _ = notifications
    count_a = NotificationLog.objects.filter(user=user_a).count()
    assert count_a >= 2
    resp = client_a.get('/api/v1/mobile/notifications/')
    assert resp.status_code == 200
    rows = resp.json()['data']
    assert len(rows) == count_a
    assert all('internal body' not in str(row) for row in rows)  # لا نص قناة/مستلم
    assert all('recipient' not in row for row in rows)


def test_notification_read_is_own_and_server_timestamped(client_a, client_b, notifications):
    user_a, user_b = notifications
    a_entry = NotificationLog.objects.filter(user=user_a).first()
    b_entry = NotificationLog.objects.filter(user=user_b).first()

    # ب لا يقرأ إشعار أ
    foreign = client_b.patch(f'/api/v1/mobile/notifications/{a_entry.id}/read/')
    assert foreign.status_code == 404
    a_entry.refresh_from_db()
    assert a_entry.is_read is False

    # أ يقرأ إشعاره — timestamps خادم
    own = client_a.patch(f'/api/v1/mobile/notifications/{a_entry.id}/read/')
    assert own.status_code == 200
    a_entry.refresh_from_db()
    assert a_entry.is_read is True
    assert a_entry.read_at is not None
    assert own.json()['data']['is_read'] is True
    assert own.json()['data']['read_at']

    # المكالمة الثانية مطابقة (idempotent-deterministic) — لا خطأ/تغيير مزدوج
    again = client_a.patch(f'/api/v1/mobile/notifications/{a_entry.id}/read/')
    assert again.status_code == 200
    assert again.json()['data']['is_read'] is True


# ------------------------------------------------------------------- sync ----
def test_sync_status_reflects_unread(client_a, notifications):
    user_a, _ = notifications
    unread = NotificationLog.objects.filter(user=user_a, is_read=False).count()
    resp = client_a.get('/api/v1/mobile/sync/status/')
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['server_time']
    assert data['contract_version'] == 'v1'
    assert data['unread_notifications'] == unread
    assert set(data.keys()) <= {
        'last_synced_at', 'pending_count', 'server_time',
        'server_version', 'contract_version', 'unread_notifications',
    }


# ------------------------------------------------------ deferred (محدد) -------
def test_deferred_endpoints_have_no_implementation(client_a):
    for method, path in MOBILE_DEFERRED_ENDPOINTS:
        resp = getattr(client_a, method)(path)
        assert resp.status_code == 501, (method, path)
        assert resp.json()['message']['code'] == 'NOT_IMPLEMENTED'