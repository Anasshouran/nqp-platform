"""M1.5 — حد التفويض بين المسافرين (NG-02 / NG-06).

السلوك المتوقَّع (سياسة الإفصاح المعتمدة):
* أصل العزل موجود اليوم على ``/api/v1/travelers/`` (الواجهة التي ستُستهلَك
  من مساحات الجوال لاحقاً): المسافر أ لا يرى سجل المسافر ب → 404 (لا كشف
  بـ 403 لتأكيد الوجود).
* نقاط النهاية المحمولة في مساحة الجوال لا تُرجِع أبداً 2xx بمورد مسافر آخر
  (في M1 كلها 501 — أي رجوع 2xx هنا يعني تسريباً أو تنفيذاً مبكراً بلا عقد).
"""

from __future__ import annotations

import pytest

from .conftest import MOBILE_OBJECT_ENDPOINTS

pytestmark = pytest.mark.django_db


def test_traveler_a_reads_own_record(client_a, traveler_a):
    _user, record = traveler_a
    response = client_a.get(f'/api/v1/travelers/{record.pk}/')
    assert response.status_code == 200
    body = response.json()  # الغلاف يتكوّن وقت العرض (EnvelopeRenderer)
    assert body['status'] == 'success'
    assert body['data']['passport_number'] == record.passport_number


def test_traveler_b_cannot_read_traveler_a_record(client_b, traveler_a):
    """العزل على الواجهة القائمة: 404 (إخفاء) لا 403 (تأكيد وجود)."""
    _user, record = traveler_a
    response = client_b.get(f'/api/v1/travelers/{record.pk}/')
    assert response.status_code == 404, response.data


def test_traveler_list_denied_without_permission(traveler_a, client_a):
    """RBAC فاشل-آمن: مسافر بلا ``travelers:view`` لا يقرأ قائمة عامة إطلاقاً."""
    response = client_a.get('/api/v1/travelers/')
    assert response.status_code == 403, response.data


def test_traveler_type_user_with_view_permission_stays_scoped(
    client_a, traveler_a, traveler_b, grant_permissions
):
    """F-M1-2 (P1.5): منح ``travelers:view`` لحساب TRAVELER لم يعد يوسّع النطاق.

    العزل إلزامي حسب نوع الحساب: TRAVELER → سجلاته فقط، مهما حُملت صلاحيات.
    """
    user_a, record_a = traveler_a
    _user_b, record_b = traveler_b
    grant_permissions(user_a, codes=('travelers:view',))

    response = client_a.get('/api/v1/travelers/')
    assert response.status_code == 200
    ids = {item['id'] for item in response.json()['data']['results']}
    assert str(record_a.pk) in ids
    assert str(record_b.pk) not in ids


@pytest.mark.parametrize('method,path', MOBILE_OBJECT_ENDPOINTS)
def test_object_endpoint_never_returns_foreign_data_2xx(client_b, method, path):
    """خرق IDOR عبر أجهزة كائنات: أي 2xx من مسار كائن بموارد غيره = فشل.

    M2-A: كائن خارج الملكية → 404 (إخفاء). مسار trips/{id} المؤجل → 501 كحد أعلى.
    """
    foreign = path
    response = getattr(client_b, method)(foreign, format='json')
    assert response.status_code not in (200, 201), (foreign, response.status_code)
    assert response.status_code in (401, 403, 404, 405, 501), (
        foreign,
        response.status_code,
        response.data,
    )
