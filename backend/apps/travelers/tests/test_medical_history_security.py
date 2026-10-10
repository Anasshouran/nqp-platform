"""M2-D1 — حقول يملكها الخادم داخل medical_history (بيان M2-C2) + ملكية/تقليل بيانات.

الاختبارات تُثبت:
  * رفض مفتاح risk_score/risk_level/… داخل medical_history (حتى المتداخل) —
    لا يسمح للعميل بكتابة حقول القرار الداخلية (خيار A/C في M2-D1 §5).
  * الحفاظ على السجل الطبي المشروع (diabetes/hypertension) — خيار C.
  * معرفات الملكية زائدة لا تُربط على الإطلاق (لا تصعيد ملكية عبر حقل إضافي).
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.travelers.models import Traveler

pytestmark = pytest.mark.django_db


@pytest.fixture
def country(db):
    from apps.travelers.models import Country

    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


def register_payload(medical_history=None, **extra):
    payload = {
        'passport_number': extra.pop('passport_number', 'MD100001'),
        'first_name': 'منى',
        'last_name': 'سالم',
        'date_of_birth': '1992-04-04',
        'nationality': 'SD',
        'medical_history': medical_history,
    }
    payload.update(extra)
    return payload


def test_legitimate_medical_history_accepted(country):
    """سجل طبي مشروع يبقى مقبولاً — لا كسر لوظيفة التسجيل (خيار C)."""
    resp = APIClient().post(
        '/api/v1/travelers/',
        register_payload({'diabetes': False, 'hypertension': True}),
        format='json',
    )
    assert resp.status_code == 201, resp.data


def test_risk_score_rejected(country):
    """risk_score مملوك للخادم — يُرفض (خيار A)."""
    resp = APIClient().post(
        '/api/v1/travelers/',
        register_payload({'health_declaration': {'risk_score': 87}}),
        format='json',
    )
    assert resp.status_code == 400
    assert 'medical_history' in str(resp.data)


def test_risk_level_rejected_nested(country):
    resp = APIClient().post(
        '/api/v1/travelers/',
        register_payload({'health_declaration': {'symptoms': ['COUGH'], 'risk_level': 'HIGH'}}),
        format='json',
    )
    assert resp.status_code == 400


def test_other_server_owned_keys_rejected(country):
    for key in ('risk_assessment', 'screening_result', 'staff_assignment', 'officer_notes', 'decision'):
        resp = APIClient().post(
            '/api/v1/travelers/',
            register_payload({'health_declaration': {key: 'anything'}}),
            format='json',
        )
        assert resp.status_code == 400, key


def test_list_nested_protected_keys_rejected(country):
    resp = APIClient().post(
        '/api/v1/travelers/',
        register_payload({'arr': [{'risk_level': 'HIGH'}], 'ok': 1}),
        format='json',
    )
    assert resp.status_code == 400


def test_self_service_patch_cannot_inject_risk(country):
    """مسار الخدمة الذاتية (PATCH profile) يرفض حقول الخادم أيضاً."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email='md-trav@nqp.gov.sd', password='StrongPass123!', full_name='منى سالم',
        user_type=User.UserType.TRAVELER,
    )
    traveler = Traveler.objects.create(
        passport_number='MD200002', first_name='منى', last_name='سالم',
        date_of_birth='1992-04-04', nationality=country, user=user,
    )
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    resp = client.patch(
        f'/api/v1/travelers/{traveler.id}/profile/',
        {'medical_history': {'health_declaration': {'risk_score': 99}}},
        format='json',
    )
    assert resp.status_code == 400
    assert 'medical_history' in str(resp.data)

    traveler.refresh_from_db()
    assert traveler.medical_history == {}  # لا يُكتب شيء مرفوض


def test_ownership_extra_field_ignored(country):
    """user_id/owner_id في الجسد لا تُربط — لا تصعيد ملكية (ملكية خادم فقط)."""
    resp = APIClient().post(
        '/api/v1/travelers/',
        register_payload(
            {'diabetes': True},
            user_id='%s' % '00000000-0000-4000-8000-000000000001',
            owner_id='%s' % '00000000-0000-4000-8000-000000000002',
        ),
        format='json',
    )
    assert resp.status_code == 201
    created = Traveler.objects.get(passport_number='MD100001')
    assert created.user_id is None  # لا ربط بمستخدم عبر الجسد