"""اختبارات واجهة مراجعة خرائط ICD-11 — نقاط النهاية، سير العمل، الصلاحيات والبحث.

ملاحظة: `resp.data` يعيد البيانات غير المغلّفة التي يُنشئها الـ view مباشرة.
نقاط CRUD العادية ترجع `Response(serializer.data)` (بلا مفتاح data)، بينما
نقاط الإجراءات اليدوية (propose/review/approve/reject/search) ترجع مغلّفاً
{status, message, data} صراحةً.
"""

import pytest
from unittest import mock

import httpx
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from apps.laboratory.models import Disease
from apps.who.models import WHOICDMapping, WHOIntegration
from apps.who.clients.base_client import WHOClientError

pytestmark = pytest.mark.django_db

User = get_user_model()

MAPPING_URL = '/api/v1/who/mappings/'
SEARCH_URL = '/api/v1/who/icd/search/'

ALL_PERMS = [
    'who_mappings:view',
    'who_mappings:add',
    'who_mappings:edit',
    'who_mappings:review',
    'who_mappings:approve',
    'who_mappings:reject',
    'who_mappings:search',
]
VIEW_ONLY = ['who_mappings:view']


@pytest.fixture
def disease():
    return Disease.objects.create(
        icd_11_code='1A00',
        name_ar='كوليرا',
        name_en='Cholera',
        description='عدوى بكتيرية حادة.',
        ihr_category=Disease.IhrCategory.SURVEILLANCE_ONLY,
        is_active=True,
    )


@pytest.fixture
def integration():
    integration = WHOIntegration.objects.create(
        name='WHO Sandbox',
        environment='SANDBOX',
        base_url='https://sandbox.who.example.org',
        client_id='nqp-client',
        authentication_type='OAUTH2',
        is_active=True,
    )
    integration.set_client_secret('sandbox-secret-value')
    integration.save(update_fields=['client_secret_encrypted'])
    return integration


def _login(client, email, password='StrongPass123!'):
    login = client.post('/api/v1/auth/login/', {'email': email, 'password': password}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


@pytest.fixture
def auth(grant_permissions):
    def _auth(codes=ALL_PERMS, email='reviewer@nqp.gov.sd'):
        user = User.objects.create_user(
            email=email, password='StrongPass123!', full_name='مراجع WHO'
        )
        grant_permissions(user, codes=codes)
        return _login(APIClient(), user.email), user

    return _auth


def proposal_payload(disease_id, **overrides):
    payload = {
        'disease': str(disease_id),
        'who_release': '2026-01',
        'foundation_uri': 'https://id.who.int/icd/entity/257068234',
        'mms_uri': 'https://id.who.int/icd/release/11/2026-01/mms/1A00',
        'icd_11_code': '1A00',
        'title_en': 'Cholera',
        'title_ar': 'الكوليرا',
        'match_type': WHOICDMapping.MatchType.EXACT,
        'confidence': '0.98',
        'source_query': 'cholera',
    }
    payload.update(overrides)
    return payload


def create_proposal(client, disease_id, **overrides):
    """إنشاء اقتراح عبر API وإرجاع بيانات الاقتراح من استجابة CRUD الخام."""
    resp = client.post(MAPPING_URL, proposal_payload(disease_id, **overrides), format='json')
    assert resp.status_code == 201
    return resp.data


# ------------------------------------------------------------------
# القوائم والإنشاء والتحديث (API)
# ------------------------------------------------------------------


def test_list_mappings_requires_auth():
    resp = APIClient().get(MAPPING_URL)
    assert resp.status_code in (401, 403)


def test_create_proposal_produces_pending_proposal(auth, disease):
    client, _ = auth()
    data = create_proposal(client, disease.id)
    assert data['mapping_status'] == WHOICDMapping.MappingStatus.PROPOSED
    assert data['is_current'] is False
    assert data['reviewed_by'] is None
    assert data['reviewed_at'] is None
    assert data['disease_name_ar'] == 'كوليرا'

    db_mapping = WHOICDMapping.objects.get(id=data['id'])
    assert db_mapping.mapping_status == WHOICDMapping.MappingStatus.PROPOSED
    assert db_mapping.is_current is False
    disease.refresh_from_db()
    assert disease.icd_11_code == '1A00'


def test_propose_endpoint_same_behavior(auth, disease):
    client, _ = auth()
    resp = client.post(f'{MAPPING_URL}propose/', proposal_payload(disease.id), format='json')
    assert resp.status_code == 201
    assert resp.data['data']['mapping_status'] == WHOICDMapping.MappingStatus.PROPOSED
    assert resp.data['data']['is_current'] is False


def test_client_cannot_force_approval_or_resolve_status(auth, disease):
    client, _ = auth()
    payload = proposal_payload(disease.id, mapping_status='APPROVED', is_current=True)
    resp = client.post(MAPPING_URL, payload, format='json')
    assert resp.status_code == 201
    assert resp.data['mapping_status'] == WHOICDMapping.MappingStatus.PROPOSED
    assert resp.data['is_current'] is False


def test_create_requires_disease(auth):
    client, _ = auth()
    payload = proposal_payload('00000000-0000-0000-0000-000000000000')
    resp = client.post(MAPPING_URL, payload, format='json')
    assert resp.status_code == 400


def test_confidence_bounds_enforced(auth, disease):
    client, _ = auth()
    for bad in ['1.5', '2', '-0.01']:
        resp = client.post(MAPPING_URL, proposal_payload(disease.id, confidence=bad), format='json')
        assert resp.status_code == 400, bad
    assert client.post(MAPPING_URL, proposal_payload(disease.id, confidence='1.0000'), format='json').status_code == 201
    assert client.post(MAPPING_URL, proposal_payload(disease.id, confidence='0.0000'), format='json').status_code == 201


def test_invalid_match_type_rejected(auth, disease):
    client, _ = auth()
    resp = client.post(MAPPING_URL, proposal_payload(disease.id, match_type='BOGUS'), format='json')
    assert resp.status_code == 400


def test_retrieve_and_list(auth, disease):
    client, _ = auth()
    created = create_proposal(client, disease.id)
    detail = client.get(f"{MAPPING_URL}{created['id']}/")
    assert detail.status_code == 200
    assert detail.data['id'] == created['id']

    listing = client.get(MAPPING_URL)
    assert listing.status_code == 200
    assert listing.data['count'] == 1
    assert listing.data['results'][0]['id'] == created['id']


def test_list_filters_and_search(auth, disease):
    client, _ = auth()
    create_proposal(client, disease.id, icd_11_code='1A00')
    create_proposal(client, disease.id, icd_11_code='1C81', title_en='Colorectal cancer', notes='ثاني')

    filtered = client.get(MAPPING_URL, {'icd_11_code': '1C81'})
    assert filtered.data['count'] == 1
    assert filtered.data['results'][0]['icd_11_code'] == '1C81'

    searched = client.get(MAPPING_URL, {'search': 'colorectal'})
    assert searched.data['count'] == 1


def test_update_proposal_editable_before_decision(auth, disease):
    client, _ = auth()
    created = create_proposal(client, disease.id)
    updated = client.patch(
        f"{MAPPING_URL}{created['id']}/", {'title_en': 'Updated Cholera'}, format='json'
    )
    assert updated.status_code == 200
    assert updated.data['title_en'] == 'Updated Cholera'
    assert updated.data['mapping_status'] == WHOICDMapping.MappingStatus.PROPOSED


def test_approved_mapping_not_editable(auth, disease):
    client, _ = auth()
    created = create_proposal(client, disease.id)
    client.post(f"{MAPPING_URL}{created['id']}/review/")
    client.post(f"{MAPPING_URL}{created['id']}/approve/")
    resp = client.patch(f"{MAPPING_URL}{created['id']}/", {'title_en': 'Hacked'}, format='json')
    assert resp.status_code == 400


# ------------------------------------------------------------------
# سير العمل: مراجعة / اعتماد / رفض
# ------------------------------------------------------------------


def test_full_workflow_approve(auth, disease):
    client, user = auth()
    created = create_proposal(client, disease.id)

    approved_before_review = client.post(f"{MAPPING_URL}{created['id']}/approve/")
    assert approved_before_review.status_code == 400

    reviewed = client.post(f"{MAPPING_URL}{created['id']}/review/")
    assert reviewed.status_code == 200
    assert reviewed.data['data']['mapping_status'] == WHOICDMapping.MappingStatus.REVIEW

    approved = client.post(f"{MAPPING_URL}{created['id']}/approve/")
    assert approved.status_code == 200
    data = approved.data['data']
    assert data['mapping_status'] == WHOICDMapping.MappingStatus.APPROVED
    assert data['is_current'] is True
    assert str(data['reviewed_by']) == str(user.id)

    db_mapping = WHOICDMapping.objects.get(id=created['id'])
    assert db_mapping.reviewed_at is not None
    disease.refresh_from_db()
    assert disease.icd_11_code == '1A00'
    assert disease.name_en == 'Cholera'


def test_reject_workflow_no_auto_approval(auth, disease):
    client, _ = auth()
    created = create_proposal(client, disease.id)
    client.post(f"{MAPPING_URL}{created['id']}/review/")
    rejected = client.post(f"{MAPPING_URL}{created['id']}/reject/")
    assert rejected.status_code == 200
    assert rejected.data['data']['mapping_status'] == WHOICDMapping.MappingStatus.REJECTED
    assert rejected.data['data']['is_current'] is False

    reapprove = client.post(f"{MAPPING_URL}{created['id']}/approve/")
    assert reapprove.status_code == 400

    rescue = client.patch(f"{MAPPING_URL}{created['id']}/", {'title_en': 'Try again'}, format='json')
    assert rescue.status_code == 400

    disease.refresh_from_db()
    assert disease.icd_11_code == '1A00'


def test_approving_new_mapping_demotes_previous_current(auth, disease):
    client, _ = auth()
    first = create_proposal(client, disease.id, icd_11_code='1A00')
    client.post(f"{MAPPING_URL}{first['id']}/review/")
    client.post(f"{MAPPING_URL}{first['id']}/approve/")

    second = create_proposal(client, disease.id, icd_11_code='1C81')
    client.post(f"{MAPPING_URL}{second['id']}/review/")
    client.post(f"{MAPPING_URL}{second['id']}/approve/")

    qs = WHOICDMapping.objects.filter(disease=disease, who_release='2026-01')
    assert qs.count() == 2
    assert qs.filter(is_current=True).count() == 1

    first_obj = WHOICDMapping.objects.get(id=first['id'])
    second_obj = WHOICDMapping.objects.get(id=second['id'])
    assert first_obj.is_current is False
    assert second_obj.is_current is True


def test_rejected_then_new_proposal_can_approve(auth, disease):
    client, _ = auth()
    old = create_proposal(client, disease.id, icd_11_code='1A00')
    client.post(f"{MAPPING_URL}{old['id']}/review/")
    client.post(f"{MAPPING_URL}{old['id']}/reject/")

    fresh = create_proposal(client, disease.id, icd_11_code='1C81')
    client.post(f"{MAPPING_URL}{fresh['id']}/review/")
    approved = client.post(f"{MAPPING_URL}{fresh['id']}/approve/")
    assert approved.data['data']['mapping_status'] == WHOICDMapping.MappingStatus.APPROVED
    assert approved.data['data']['is_current'] is True
    assert WHOICDMapping.objects.filter(disease=disease, who_release='2026-01', is_current=True).count() == 1


# ------------------------------------------------------------------
# الصلاحيات
# ------------------------------------------------------------------


@pytest.fixture
def review_mapping(disease):
    return WHOICDMapping.objects.create(
        disease=disease,
        who_release='2026-01',
        is_current=False,
        mapping_status=WHOICDMapping.MappingStatus.PROPOSED,
    )


def test_viewer_cannot_create_or_review(auth, review_mapping):
    client, _ = auth(codes=VIEW_ONLY, email='viewer@nqp.gov.sd')
    assert client.get(MAPPING_URL).status_code == 200
    assert client.post(MAPPING_URL, proposal_payload(review_mapping.disease_id), format='json').status_code == 403
    assert client.post(f"{MAPPING_URL}{review_mapping.id}/review/").status_code == 403
    assert client.post(f"{MAPPING_URL}{review_mapping.id}/approve/").status_code == 403
    assert client.post(f"{MAPPING_URL}{review_mapping.id}/reject/").status_code == 403
    assert client.get(SEARCH_URL, {'q': 'cholera'}).status_code == 403


def test_editor_cannot_approve_or_reject(auth, disease):
    client, _ = auth(
        codes=['who_mappings:view', 'who_mappings:add', 'who_mappings:edit', 'who_mappings:search'],
        email='editor@nqp.gov.sd',
    )
    created = create_proposal(client, disease.id)
    assert client.post(f"{MAPPING_URL}{created['id']}/review/").status_code == 403
    assert client.post(f"{MAPPING_URL}{created['id']}/approve/").status_code == 403
    assert client.post(f"{MAPPING_URL}{created['id']}/reject/").status_code == 403


# ------------------------------------------------------------------
# بحث ICD-11 (قراءة فقط، لا إنشاء ولا حفظ)
# ------------------------------------------------------------------


def test_icd_search_requires_q(auth):
    client, _ = auth()
    resp = client.get(SEARCH_URL)
    assert resp.status_code == 400


def test_icd_search_success(auth, integration):
    client, _ = auth()
    fake_results = [
        {'id': 'https://id.who.int/icd/entity/257068234', 'title': 'Cholera'},
        {'id': 'https://id.who.int/icd/entity/HPO_0002027', 'title': 'Cholera'},
    ]
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.return_value = fake_results
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 200
    assert resp.data['data'][0]['title'] == 'Cholera'
    assert WHOICDMapping.objects.count() == 0


def test_icd_search_happy_empty(auth, integration):
    client, _ = auth()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.return_value = []
        resp = client.get(SEARCH_URL, {'q': 'zzzz'})
    assert resp.status_code == 200
    assert resp.data['data'] == []


def test_icd_search_no_active_integration(auth):
    client, _ = auth()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 400
    FakeClient.assert_not_called()
    assert 'client_secret' not in resp.data.get('message', '')


def test_icd_search_who_client_error(auth, integration):
    client, _ = auth()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.side_effect = WHOClientError('token expired')
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 502
    assert resp.data['status'] == 'error'
    assert 'client_secret' not in resp.data.get('message', '')
    assert WHOICDMapping.objects.count() == 0


def test_icd_search_http_error(auth, integration):
    client, _ = auth()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.side_effect = httpx.ConnectError('refused')
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 502


def test_icd_search_read_only_no_mapping_created(auth, integration):
    client, _ = auth()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.return_value = [{'id': 'x', 'title': 'Cholera'}]
        client.get(SEARCH_URL, {'q': 'cholera'})
    assert WHOICDMapping.objects.count() == 0
    assert Disease.objects.count() == 0


# ------------------------------------------------------------------
# مصدر الاعتمادادات: Environment (settings) لا قاعدة البيانات
# ------------------------------------------------------------------


def test_icd_search_rejects_only_when_no_active_integration(auth):
    """غياب credentials داخل DB لا يمنع الطلب — العطل الوحيد هو غياب تكامل فعّال."""
    client, _ = auth()
    WHOIntegration.objects.all().delete()
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 400
    FakeClient.assert_not_called()


def test_icd_search_ignores_inactive_integration(auth, integration):
    client, _ = auth()
    integration.is_active = False
    integration.save(update_fields=['is_active'])
    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        resp = client.get(SEARCH_URL, {'q': 'cholera'})
    assert resp.status_code == 400
    FakeClient.assert_not_called()


@override_settings(
    WHO_ICD_BASE_URL='https://settings-base.example',
    WHO_ICD_TOKEN_URL='https://settings-token.example/connect/token',
    WHO_ICD_CLIENT_ID='settings-client-id',
    WHO_ICD_CLIENT_SECRET='settings-secret-placeholder',
)
def test_icd_search_with_empty_db_credentials_uses_settings_credentials(auth, integration):
    """تكامل فعّال بلا أسرار في DB: المرور يصل ICD11Client الذي يقرأ من settings."""
    client, _ = auth()
    integration.client_id = ''
    integration.set_client_secret('')
    integration.save(update_fields=['client_id', 'client_secret_encrypted'])

    with mock.patch('apps.who.views.ICD11Client') as FakeClient:
        FakeClient.return_value.search.return_value = [
            {'id': 'https://id.who.int/icd/entity/257068234', 'title': 'Cholera'},
        ]
        resp = client.get(SEARCH_URL, {'q': 'cholera'})

    assert resp.status_code == 200
    assert resp.data['data'][0]['title'] == 'Cholera'
    FakeClient.assert_called_once()
    kwargs = FakeClient.call_args.kwargs
    assert kwargs['client_id'] == ''
    assert kwargs['client_secret'] == ''
    assert 'settings-secret-placeholder' not in str(resp.data)


@override_settings(
    WHO_ICD_CLIENT_ID='settings-client-id',
    WHO_ICD_CLIENT_SECRET='settings-secret-placeholder',
)
def test_icd_search_end_to_end_credentials_source_is_settings(auth, integration, monkeypatch):
    """بدون أي mocking للـ client: HTTP مموّه، والأسرار تأتي من settings لا من DB."""
    client, _ = auth()
    integration.client_id = ''
    integration.set_client_secret('')
    integration.save(update_fields=['client_id', 'client_secret_encrypted'])

    token_response = mock.Mock(status_code=200)
    token_response.json.return_value = {'access_token': 'settings-issued-token'}
    search_response = mock.Mock(status_code=200)
    search_response.json.return_value = {'destinationEntities': [{'title': 'Cholera'}]}

    with mock.patch('httpx.post', return_value=token_response) as post, \
            mock.patch('httpx.get', return_value=search_response) as get:
        resp = client.get(SEARCH_URL, {'q': 'cholera'})

    assert resp.status_code == 200
    assert resp.data['data'][0]['title'] == 'Cholera'
    assert post.call_args.kwargs['auth'] == ('settings-client-id', 'settings-secret-placeholder')
    assert 'settings-secret-placeholder' not in str(resp.data)


@override_settings(WHO_ICD_CLIENT_ID='', WHO_ICD_CLIENT_SECRET='')
def test_icd_search_returns_502_when_no_credentials_anywhere(auth, integration):
    """لا credentials في DB ولا في settings: خطأ واضح 502 بلا طلب ناقص إلى WHO."""
    client, _ = auth()
    integration.client_id = ''
    integration.set_client_secret('')
    integration.save(update_fields=['client_id', 'client_secret_encrypted'])

    with mock.patch('httpx.post') as post, mock.patch('httpx.get') as get:
        resp = client.get(SEARCH_URL, {'q': 'cholera'})

    assert resp.status_code == 502
    assert post.call_count == 0
    assert get.call_count == 0
    assert resp.data['message'] == 'فشل الاتصال بخدمة ICD-11.'