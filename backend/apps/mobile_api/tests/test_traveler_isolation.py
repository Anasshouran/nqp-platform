"""PHASE 1.5 — مصفوفة عزل المسافر (F-M1-2) + اختبارات IDOR.

القاعدة المُلزمة (§11/§12):
    permission ≠ ownership.
حساب TRAVELER يرى/يعدّل سجلاته فقط — الصلاحيات (view/edit/...) لا توسّع المدى.
المؤسسة/الموظفون يحتفظون بمدى أوسع عبر RBAC الحالي (Test H).

الاعتماد: apps/mobile_api/tests/conftest (traveler_a/b, client_a/b, country,
grant_permissions, anonymous_client).
"""

from __future__ import annotations

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.travelers.models import Traveler

from .conftest import bearer

pytestmark = pytest.mark.django_db

User = get_user_model()


# --- Test A: Traveler A lists travelers → only A -----------------------------
def test_a_traveler_list_shows_only_own_records(client_a, traveler_a, traveler_b, grant_permissions):
    user_a, record_a = traveler_a
    _user_b, record_b = traveler_b
    grant_permissions(user_a, codes=('travelers:view',))

    response = client_a.get('/api/v1/travelers/')
    assert response.status_code == 200
    rows = response.json()['data']['results']
    ids = {row['id'] for row in rows}
    assert str(record_a.pk) in ids
    assert str(record_b.pk) not in ids


# --- Test B: A retrieves B → 404 (hide, not 403) -----------------------------
def test_b_traveler_a_cannot_retrieve_b_record(client_a, traveler_b):
    _user_b, record_b = traveler_b
    response = client_a.get(f'/api/v1/travelers/{record_b.pk}/')
    assert response.status_code == 404


# --- Test C: A modifies B → 403/404 ------------------------------------------
def test_c_traveler_a_cannot_update_b_record(client_a, traveler_a, traveler_b, grant_permissions):
    user_a, _record_a = traveler_a
    _user_b, record_b = traveler_b
    # حتى مع travellers:edit — الصلاحية لا تمنح الملكية.
    grant_permissions(user_a, codes=('travelers:edit',))
    response = client_a.patch(
        f'/api/v1/travelers/{record_b.pk}/',
        {'last_name': 'مُستَولى عليه'},
        format='json',
    )
    assert response.status_code in (403, 404)
    assert response.status_code != 200


def test_c2_traveler_a_cannot_delete_b_record(client_a, traveler_a, traveler_b, grant_permissions):
    user_a, _record_a = traveler_a
    _user_b, record_b = traveler_b
    grant_permissions(user_a, codes=('travelers:delete',))
    response = client_a.delete(f'/api/v1/travelers/{record_b.pk}/')
    assert response.status_code in (403, 404)
    assert Traveler.objects.filter(pk=record_b.pk).exists()


# --- Test D: A retrieves B's trip → no 2xx (unified trip surface is M2) -------
def test_d_traveler_a_cannot_read_b_trip_via_mobile_api(client_a, traveler_b):
    _user_b, record_b = traveler_b
    response = client_a.get(f'/api/v1/mobile/trips/{record_b.pk}/')
    assert response.status_code in (401, 403, 404, 501)
    assert response.status_code != 200


# --- Test E: A retrieves B's certificate → no 2xx + staff surface 403 ---------
def test_e_traveler_a_cannot_read_b_certificate_via_mobile_api(client_a, traveler_b):
    _user_b, record_b = traveler_b
    response = client_a.get(f'/api/v1/mobile/certificates/{record_b.pk}/')
    assert response.status_code in (401, 403, 404, 501)
    assert response.status_code != 200


def test_e2_certificates_staff_surface_denied_for_traveler(client_a):
    """سطح شهادات الموظفين (vaccination) مرفوض لرمز مسافر — لا تسريب أفقي."""
    response = client_a.get('/api/v1/vaccination/certificates/')
    assert response.status_code in (403, 404), response.data


# --- Test F: pagination / search / filter → no cross-user leakage -------------
def test_f_pagination_and_search_do_not_leak(client_a, traveler_a, traveler_b, grant_permissions):
    user_a, record_a = traveler_a
    _user_b, record_b = traveler_b
    grant_permissions(user_a, codes=('travelers:view',))

    # search by B's passport must not surface B
    response = client_a.get('/api/v1/travelers/', {'search': record_b.passport_number})
    assert response.status_code == 200
    rows = response.json()['data']['results']
    assert str(record_b.pk) not in {row['id'] for row in rows}

    # pagination (page_size=1) → scoped
    response = client_a.get('/api/v1/travelers/', {'page_size': 1, 'page': 1})
    rows = response.json()['data']['results']
    assert rows and rows[0]['id'] == str(record_a.pk)

    # filter by any registration_status → still only own rows
    response = client_a.get('/api/v1/travelers/', {'registration_status': record_b.registration_status})
    rows = response.json()['data']['results']
    assert all(row['id'] == str(record_a.pk) for row in rows)


# --- Test G: unauthenticated → 401 -------------------------------------------
def test_g_unauthenticated_requests_are_rejected(anonymous_client, traveler_a):
    _user_a, record_a = traveler_a
    # القائمة: مؤمَّنة → 401 (مصادقة مطلوبة)
    assert anonymous_client.get('/api/v1/travelers/').status_code == 401
    # التفاصيل: إخفاء (hide) لغير المرتبط بجلسة — لا تأكيد وجود:
    response = anonymous_client.get(f'/api/v1/travelers/{record_a.pk}/')
    assert response.status_code in (401, 404)


# --- Test H: staff/privileged behavior unchanged ------------------------------
def test_h_staff_user_keeps_privileged_access(traveler_a, traveler_b, grant_permissions):
    staff = User.objects.create_user(
        email='officer-p15@nqp.gov.sd', password='StrongPass123!', full_name='ضابط',
        is_staff=True,
    )
    _user_a, record_a = traveler_a
    _user_b, record_b = traveler_b
    grant_permissions(staff, codes=('travelers:view',))

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=bearer(staff))

    response = client.get('/api/v1/travelers/')
    assert response.status_code == 200
    ids = {row['id'] for row in response.json()['data']['results']}
    # الموظف يحتفظ بمدى المؤسسة (لا نُقيّده)
    assert str(record_a.pk) in ids
    assert str(record_b.pk) in ids

    response = client.get(f'/api/v1/travelers/{record_a.pk}/')
    assert response.status_code == 200


# --- IDOR negatives: tampered id ----------------------------------------------
def test_tampered_object_id_is_404(client_a, traveler_a):
    _user_a, _record_a = traveler_a
    response = client_a.get(f'/api/v1/travelers/{uuid.uuid4()}/')
    assert response.status_code == 404


def test_own_record_still_accessible_after_fix(client_a, traveler_a):
    _user_a, record_a = traveler_a
    response = client_a.get(f'/api/v1/travelers/{record_a.pk}/')
    assert response.status_code == 200
    assert response.json()['data']['passport_number'] == record_a.passport_number


def test_traveler_can_update_own_record_via_self_service(client_a, traveler_a):
    """الخدمة الذاتية لسجل المسافر نفسه تبقى متاحة (لا كسر للوظيفة)."""
    _user_a, record_a = traveler_a
    response = client_a.patch(
        f'/api/v1/travelers/{record_a.pk}/personal-info/',
        {
            'first_name': 'أحمد',
            'last_name': 'مُعدَّل',
            'date_of_birth': '1990-01-01',
            'nationality': 'SD',
        },
        format='json',
    )
    # الخدمة الذاتية لسجله لا تُفشِل بالملكية (قد تُفشِل بالتحقق — ليس 404/403)
    assert response.status_code in (200, 202, 400), response.data
    assert response.status_code not in (403, 404)