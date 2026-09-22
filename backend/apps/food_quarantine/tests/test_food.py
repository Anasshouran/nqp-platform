import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import EntryPoint as Port

from ..models import FoodShipment, FoodInspection, SampleTest, SamplingPolicy, FoodSample

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, db):
    user = User.objects.create_user(
        email='food@nqp.gov.sd', password='StrongPass123!', full_name='مفتش أغذية'
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


@pytest.fixture
def sampling_policy(db):
    return SamplingPolicy.objects.create(
        name_ar='وارد — لكل 500 كغ',
        scope=SamplingPolicy.ShipmentScope.IMPORT,
        benchmark=SamplingPolicy.Benchmark.WEIGHT,
        threshold=500,
        samples_per_unit=1,
        max_samples=50,
        default_reason=FoodSample.SamplingReason.ROUTINE,
        order=1,
        is_active=True,
    )


def create_shipment(auth_client, manifest, port='SDKRT', extra=None):
    payload = {
        'manifest_number': manifest,
        'port': port,
        'supplier_name': 'شركة الأغذية المحدودة',
        'origin_country': 'Egypt',
        'arrival_date': '2026-08-01',
        'shipment_type': 'IMPORT',
    }
    if extra:
        payload.update(extra)
    resp = auth_client.post('/api/v1/food/shipments/', payload, format='json')
    assert resp.status_code == 201, resp.content
    return resp.json()['data']['id']


def test_full_ops_cycle(auth_client, port, sampling_policy):
    """الدورة التشغيلية الكاملة: تسجيل ← عينات ← رسوم ← تحصيل ← تفتيش ← عينة ← قرار ← شهادة."""
    shipment_id = create_shipment(
        auth_client, 'MAN-2026-0001',
        extra={'items': [{'product_name': 'أرز', 'weight_kg': 2000, 'package_count': 40, 'package_type': 'جوال'}]},
    )
    shipment = FoodShipment.objects.get(id=shipment_id)
    # سياسة العينات مطبقة عند الإنشاء (2000 كغ / 500 = 4 عينات)
    assert shipment.samples_required == 4

    # 1) عرض تفاصيل الرسوم لحظياً
    preview = auth_client.get(f'/api/v1/food/shipments/{shipment_id}/fee-preview/')
    assert preview.status_code == 200
    assert float(preview.json()['data']['total']) > 0

    # 2) إرسال الطلب (كاتب)
    submit = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/submit/', format='json')
    assert submit.status_code == 200
    assert submit.json()['data']['status'] == 'FEES_DUE'

    # 3) مراجعة مدير القسم
    review = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/review/',
        {'decision': 'APPROVE'}, format='json',
    )
    assert review.status_code == 200
    assert FoodShipment.objects.get(id=shipment_id).status == FoodShipment.ShipmentStatus.AWAITING_INSPECTION

    # 4) الفاتورة تُفتح تلقائياً من تفاصيل الرسوم دون بند يدوي
    invoice = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/invoice/', format='json')
    assert invoice.status_code == 201
    inv = invoice.json()['data']
    assert inv['status'] == 'PENDING_PAYMENT'
    # التعريفة الجسّمية: وارد 2 طن = وزن 45,000 + إنزال 55,000 + دعم شهادة 10,000
    expected_total = 45000 + 55000 + 10000
    assert float(inv['total_amount']) == pytest.approx(expected_total)

    # 5) الدفع وإصدار الإيصال
    pay = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/pay/', format='json')
    assert pay.status_code == 200
    assert pay.json()['data']['status'] == 'PAID'
    assert pay.json()['data']['receipt_number'].startswith('RCPT-')
    assert FoodShipment.objects.get(id=shipment_id).fees_paid is True

    # 6) التفتيش → يحتاج تحليل
    inspection = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/inspection/',
        {'decision': 'NEEDS_ANALYSIS', 'temperature': -18, 'notes': 'سلمي'},
        format='json',
    )
    assert inspection.status_code == 201
    assert FoodShipment.objects.get(id=shipment_id).status == FoodShipment.ShipmentStatus.UNDER_INSPECTION

    # 7) سحب عينة بعد التفتيش
    sample = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/samples/',
        {'sample_type': 'FOOD_PRODUCT', 'sampling_reason': 'ROUTINE', 'bench': 'MICROBIOLOGY'},
        format='json',
    )
    assert sample.status_code == 201
    assert sample.json()['data']['sample_barcode'].startswith('FS-')
    assert FoodShipment.objects.get(id=shipment_id).status == FoodShipment.ShipmentStatus.AWAITING_LAB_RESULTS

    # 8) إحالة القرار ثم القرار النهائي + الشهادة
    to_decision = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/to-decision/', format='json')
    assert to_decision.status_code == 200
    assert FoodShipment.objects.get(id=shipment_id).status == FoodShipment.ShipmentStatus.AWAITING_DECISION

    decide = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/decide/',
        {'decision': 'COMPLIANT', 'reason': 'مطابقة للمواصفات'}, format='json',
    )
    assert decide.status_code == 201
    assert decide.json()['data']['certificate_number'].startswith('FCER-')

    shipment = FoodShipment.objects.get(id=shipment_id)
    assert shipment.status == FoodShipment.ShipmentStatus.RELEASED
    assert shipment.final_decision == FoodShipment.FinalDecision.COMPLIANT

    # 9) استمارة الكشف الموحّدة
    form = auth_client.get(f'/api/v1/food/shipments/{shipment_id}/export-form/')
    assert form.status_code == 200
    data = form.json()['data']
    assert set(data.keys()) >= {'shipment', 'items', 'inspection', 'samples', 'decision', 'certificate'}
    assert data['shipment']['manifest_number'] == 'MAN-2026-0001'
    assert data['inspection']['decision'] == 'NEEDS_ANALYSIS'
    assert len(data['samples']) == 1
    assert data['certificate']['certificate_number'].startswith('FCER-')


def test_sample_requires_inspection_first(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-SMP')
    resp = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/samples/',
        {'sample_type': 'FOOD_PRODUCT'}, format='json',
    )
    assert resp.status_code == 400
    assert 'يجب التفتيش أولاً' in resp.json()['message']


def test_inspection_compliant_releases_directly(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-CMP', extra={'items': []})
    auth_client.post(f'/api/v1/food/shipments/{shipment_id}/invoice/', format='json')
    auth_client.post(f'/api/v1/food/shipments/{shipment_id}/pay/', format='json')

    inspection = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/inspection/',
        {'decision': 'COMPLIANT'}, format='json',
    )
    assert inspection.status_code == 201
    shipment = FoodShipment.objects.get(id=shipment_id)
    assert shipment.status == FoodShipment.ShipmentStatus.RELEASED
    assert shipment.final_decision == FoodShipment.FinalDecision.COMPLIANT


def test_non_compliant_goes_to_decision(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-NC')
    auth_client.post(f'/api/v1/food/shipments/{shipment_id}/invoice/', format='json')
    auth_client.post(f'/api/v1/food/shipments/{shipment_id}/pay/', format='json')

    inspection = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/inspection/',
        {'decision': 'NON_COMPLIANT'}, format='json',
    )
    assert inspection.status_code == 201
    shipment = FoodShipment.objects.get(id=shipment_id)
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_DECISION

    # القرار النهائي (حجز) مسموح بعد التفتيش غير المطابق
    decide = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/decide/',
        {'decision': 'HOLD', 'reason': 'بانتظار استكمال المستندات'}, format='json',
    )
    assert decide.status_code == 201
    assert FoodShipment.objects.get(id=shipment_id).status == FoodShipment.ShipmentStatus.HOLD


def test_release_requires_fees(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-0003')
    release = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/release/', format='json')
    assert release.status_code == 400


def test_decide_requires_fees(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-FEES')
    auth_client.post(f'/api/v1/food/shipments/{shipment_id}/invoice/', format='json')
    decide = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/decide/',
        {'decision': 'REJECTED'}, format='json',
    )
    assert decide.status_code == 400
    assert 'يجب تسديد الرسوم' in decide.json()['message']


def test_relief_message_exempts_all_fees(auth_client, port):
    shipment_id = create_shipment(
        auth_client, 'MAN-2026-REL', extra={'message_type': 'RELIEF'},
    )
    preview = auth_client.get(f'/api/v1/food/shipments/{shipment_id}/fee-preview/')
    assert preview.status_code == 200
    data = preview.json()['data']
    assert data['exempt'] is True
    assert float(data['total']) == 0

    invoice = auth_client.post(f'/api/v1/food/shipments/{shipment_id}/invoice/', format='json')
    assert invoice.status_code == 201
    assert float(invoice.json()['data']['total_amount']) == 0


def test_exempt_message_drops_certificate_fee(auth_client, port):
    shipment_id = create_shipment(
        auth_client, 'MAN-2026-EX', extra={'message_type': 'EXEMPT'},
    )
    preview = auth_client.get(f'/api/v1/food/shipments/{shipment_id}/fee-preview/')
    data = preview.json()['data']
    assert data['exempt'] is False
    types = {line['fee_type'] for line in data['lines']}
    assert 'CERTIFICATE' not in types


def test_shipment_exposes_port_type_and_name(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-0004')
    detail = auth_client.get(f'/api/v1/food/shipments/{shipment_id}/')
    assert detail.status_code == 200
    data = detail.json()['data']
    assert data['port_type'] == 'AIRPORT'
    assert data['port_name'] == 'مطار الخرطوم'


def test_filter_shipments_by_port_type(auth_client, port):
    from apps.travelers.models import Country

    land = Port.objects.create(
        state=_ep_state(),
        code='SRW',
        name_ar='معبر سرو',
        name_en='Saroo Border',
        kind=Port.Kind.LAND_PORT,
    )
    create_shipment(auth_client, 'MAN-2026-0005', port='SDKRT')
    create_shipment(auth_client, 'MAN-2026-0006', port='SRW')

    resp = auth_client.get('/api/v1/food/shipments/', {'port_type': 'LAND_PORT'})
    assert resp.status_code == 200
    results = resp.json()['data']['results']
    assert {r['manifest_number'] for r in results} == {'MAN-2026-0006'}

    resp = auth_client.get('/api/v1/food/shipments/', {'port_type': 'AIRPORT'})
    results = resp.json()['data']['results']
    assert {r['manifest_number'] for r in results} == {'MAN-2026-0005'}


def test_refer_shipment_from_border(auth_client, port):
    shipment_id = create_shipment(auth_client, 'MAN-2026-0007')

    refer = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/refer/',
        {'referred_from': 'LAND_BORDER_HEALTH', 'referral_reference': 'XING-2026-881'},
        format='json',
    )
    assert refer.status_code == 200
    data = refer.json()['data']
    assert data['referred_from'] == 'LAND_BORDER_HEALTH'
    assert data['referral_reference'] == 'XING-2026-881'

    again = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/refer/',
        {'referred_from': 'PORT_HEALTH'}, format='json',
    )
    assert again.status_code == 400

    invalid = auth_client.post(
        f'/api/v1/food/shipments/{shipment_id}/refer/',
        {'referred_from': 'BOGUS'}, format='json',
    )
    assert invalid.status_code == 400


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

