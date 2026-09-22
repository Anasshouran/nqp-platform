import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.notifications.models import NotificationLog
from apps.masterdata.models import EntryPoint as Port

from ..models import AuditLog, FoodShipment, ShipmentAttachment

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db):
    user = User.objects.create_user(
        email='clerk@nqp.gov.sd', password='StrongPass123!', full_name='كاتب رقابة الأغذية'
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def port(db):
    from apps.travelers.models import Country

    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


def draft_payload(port, manifest='DRAFT-2026-0001', extra=None):
    payload = {
        'manifest_number': manifest,
        'port': port.code,
        'supplier_name': 'شركة الأمل للتجارة',
        'origin_country': 'Egypt',
        'arrival_date': '2026-08-20',
        'shipment_type': 'IMPORT',
        'as_draft': True,
        'transport_data': {'airline': 'الخطوط السعودية', 'awb': '176-88231'},
        'items': [{'product_name': 'تمور فاخرة', 'weight_kg': 500, 'package_count': 100}],
    }
    if extra:
        payload.update(extra)
    return payload


def test_create_draft_skips_sampling(auth_client, port):
    resp = auth_client.post('/api/v1/food/shipments/', draft_payload(port), format='json')
    assert resp.status_code == 201, resp.content
    data = resp.json()['data']
    assert data['status'] == 'DRAFT'
    assert data['samples_required'] == 0
    assert data['transport_data']['awb'] == '176-88231'


def test_direct_create_keeps_legacy_flow(auth_client, port):
    """بدون as_draft: نفس السلوك القديم (استلام + عينات تلقائية)."""
    payload = draft_payload(port, manifest='LEGACY-2026-0001')
    payload.pop('as_draft')
    resp = auth_client.post('/api/v1/food/shipments/', payload, format='json')
    assert resp.status_code == 201
    shipment = FoodShipment.objects.get(manifest_number='LEGACY-2026-0001')
    assert shipment.status == FoodShipment.ShipmentStatus.RECEIVED


def test_edit_and_submit_draft(auth_client, port):
    resp = auth_client.post('/api/v1/food/shipments/', draft_payload(port), format='json')
    sid = resp.json()['data']['id']

    # تعديل المسودة (بنود + بيانات)
    patch = auth_client.patch(
        f'/api/v1/food/shipments/{sid}/',
        {'supplier_name': 'شركة الأمل المعدلة', 'items': [{'product_name': 'أرز بسمتي', 'weight_kg': 1500}]},
        format='json',
    )
    assert patch.status_code == 200, patch.content
    shipment = FoodShipment.objects.get(id=sid)
    assert shipment.supplier_name == 'شركة الأمل المعدلة'
    assert shipment.items.count() == 1
    assert float(shipment.total_weight_kg) == 1500

    # إرسال المسودة للتحصيل
    submit = auth_client.post(f'/api/v1/food/shipments/{sid}/submit/', format='json')
    assert submit.status_code == 200
    data = submit.json()['data']
    assert data['status'] == 'FEES_DUE'

    # العينات حُسبت عند الإرسال (1500 كغ ضمن الحد الافتراضي)
    assert AuditLog.objects.filter(object_id=str(sid), action='UPDATE').exists()

    # بعد الإرسال: منع تعديل البنود والحذف
    edit = auth_client.patch(f'/api/v1/food/shipments/{sid}/', {'items': []}, format='json')
    assert edit.status_code == 400
    delete = auth_client.delete(f'/api/v1/food/shipments/{sid}/')
    assert delete.status_code == 400

    # لا يمكن إعادة الإرسال
    resubmit = auth_client.post(f'/api/v1/food/shipments/{sid}/submit/', format='json')
    assert resubmit.status_code == 400


def test_delete_draft_allowed(auth_client, port):
    resp = auth_client.post('/api/v1/food/shipments/', draft_payload(port, manifest='DRAFT-2026-DEL'), format='json')
    sid = resp.json()['data']['id']
    delete = auth_client.delete(f'/api/v1/food/shipments/{sid}/')
    assert delete.status_code == 200
    assert not FoodShipment.objects.filter(id=sid).exists()


def test_submit_requires_valid_state(auth_client, port):
    """submit على شحنة غير موجودة كمسودة/مستلمة يُرفض."""
    payload = draft_payload(port, manifest='DRAFT-2026-SUB')
    payload.pop('as_draft')
    resp = auth_client.post('/api/v1/food/shipments/', payload, format='json')
    sid = resp.json()['data']['id']
    # RECEIVED مقبول للإرسال (سلوك قديم)
    submit = auth_client.post(f'/api/v1/food/shipments/{sid}/submit/', format='json')
    assert submit.status_code == 200


def test_clerk_stats_endpoint(auth_client, port):
    auth_client.post('/api/v1/food/shipments/', draft_payload(port), format='json')
    auth_client.post('/api/v1/food/shipments/', draft_payload(port, manifest='DRAFT-2026-0002'), format='json')

    stats = auth_client.get('/api/v1/food/shipments/clerk-stats/')
    assert stats.status_code == 200
    body = stats.json()['data']
    assert body['stats']['drafts'] == 2
    assert body['stats']['imports_today'] >= 2
    assert len(body['recent']) >= 1
    assert body['recent'][0]['manifest_number']


def test_attachment_upload_list_delete(auth_client, port):
    resp = auth_client.post('/api/v1/food/shipments/', draft_payload(port), format='json')
    sid = resp.json()['data']['id']

    upload = auth_client.post(
        '/api/v1/food/shipment-attachments/',
        {
            'shipment': str(sid),
            'doc_type': 'HEALTH_CERT',
            'file': SimpleUploadedFile('health-cert.pdf', b'%PDF-1.4 fake', content_type='application/pdf'),
            'original_name': 'health-cert.pdf',
        },
        format='multipart',
    )
    assert upload.status_code == 201, upload.content
    att = upload.json()['data']
    assert att['doc_type_label'] == 'الشهادة الصحية'
    assert att['file_url']

    listing = auth_client.get('/api/v1/food/shipment-attachments/', {'shipment': str(sid)})
    assert listing.status_code == 200
    results = listing.json()['data']['results']
    assert len(results) == 1

    detail = auth_client.get(f'/api/v1/food/shipments/{sid}/')
    assert len(detail.json()['data']['attachments']) == 1

    remove = auth_client.delete(f"/api/v1/food/shipment-attachments/{att['id']}/")
    assert remove.status_code in (200, 204)
    assert ShipmentAttachment.objects.filter(shipment_id=sid).count() == 0


def test_submit_notifies_accountants(auth_client, port):
    from apps.accounts.models import Role

    accountant_role, _ = Role.objects.get_or_create(
        code='ACCOUNTANT', defaults={'name': 'Accountant', 'name_ar': 'محاسب'}
    )
    User.objects.create_user(
        email='acct@nqp.gov.sd',
        password='StrongPass123!',
        full_name='أمين الصندوق',
        role=accountant_role,
    )
    resp = auth_client.post('/api/v1/food/shipments/', draft_payload(port), format='json')
    sid = resp.json()['data']['id']
    auth_client.post(f'/api/v1/food/shipments/{sid}/submit/', format='json')
    assert NotificationLog.objects.filter(recipient='acct@nqp.gov.sd').exists()


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

