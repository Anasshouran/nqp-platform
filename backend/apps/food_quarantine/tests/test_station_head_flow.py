import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role

from ..models import AuditLog, FoodInspection, FoodShipment

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def port(db):
    from apps.masterdata.models import EntryPoint as Port
    from apps.travelers.models import Country

    return Port.objects.create(
        state=_ep_state(),
        code='SDKRT',
        name_ar='مطار الخرطوم',
        name_en='Khartoum Airport',
        kind=Port.Kind.AIRPORT,
    )


@pytest.fixture
def station_head_role(db):
    return Role.objects.create(code='STATION_HEAD', name='Station Head', name_ar='رئيس القسم')


@pytest.fixture
def inspector_role(db):
    return Role.objects.create(code='FOOD_INSPECTOR', name='Food Inspector', name_ar='مفتش أغذية')


@pytest.fixture
def inspector(db, inspector_role):
    return User.objects.create_user(
        email='inspector-sh@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مفتش رقابة الأغذية',
        role=inspector_role,
    )


@pytest.fixture
def inspector2(db, inspector_role):
    return User.objects.create_user(
        email='inspector2-sh@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مفتش ثانٍ',
        role=inspector_role,
    )


@pytest.fixture
def head_client(api_client, db, station_head_role):
    user = User.objects.create_user(
        email='head@nqp.gov.sd',
        password='StrongPass123!',
        full_name='د. سامي عمر',
        role=station_head_role,
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
def inspector_client(api_client, db, inspector):
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': inspector.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


def _shipment(db, port, inspector, manifest='IMP-2026-00888', status=FoodShipment.ShipmentStatus.AWAITING_INSPECTION):
    return FoodShipment.objects.create(
        manifest_number=manifest,
        port=port,
        supplier_name='شركة النيل للصناعات الغذائية',
        origin_country='Egypt',
        arrival_date='2026-08-22',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
        status=status,
        fees_paid=True,
        assigned_inspector=inspector,
    )


def _inspect(client, shipment, decision):
    return client.post(
        f'/api/v1/food/shipments/{shipment.pk}/inspection/',
        {'decision': decision, 'temperature': 5, 'notes': 'ملاحظات'},
        format='json',
    )


def test_review_approve(head_client, db, port, inspector):
    shipment = _shipment(db, port, inspector)
    assert _inspect(head_client, shipment, FoodInspection.Decision.NON_COMPLIANT).status_code == 201
    inspection = FoodInspection.objects.get(shipment=shipment)
    res = head_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'APPROVE', 'notes': 'تقرير سليم'},
        format='json',
    )
    assert res.status_code == 200
    inspection.refresh_from_db()
    assert inspection.supervisor_status == FoodInspection.SupervisorStatus.APPROVED
    assert inspection.reviewed_by is not None and inspection.reviewed_at is not None
    assert AuditLog.objects.filter(object_id=str(inspection.pk), action=AuditLog.Action.UPDATE).exists()


def test_review_return_requires_notes(head_client, db, port, inspector):
    shipment = _shipment(db, port, inspector)
    _inspect(head_client, shipment, FoodInspection.Decision.NON_COMPLIANT)
    inspection = FoodInspection.objects.get(shipment=shipment)
    res = head_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'RETURN'},
        format='json',
    )
    assert res.status_code == 400


def test_review_return_resets_shipment(head_client, db, port, inspector):
    shipment = _shipment(db, port, inspector)
    _inspect(head_client, shipment, FoodInspection.Decision.NON_COMPLIANT)
    inspection = FoodInspection.objects.get(shipment=shipment)
    res = head_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'RETURN', 'notes': 'لم توثق درجة الحرارة بدقة'},
        format='json',
    )
    assert res.status_code == 200
    inspection.refresh_from_db()
    shipment.refresh_from_db()
    assert inspection.supervisor_status == FoodInspection.SupervisorStatus.RETURNED
    assert inspection.supervisor_notes == 'لم توثق درجة الحرارة بدقة'
    assert shipment.status == FoodShipment.ShipmentStatus.AWAITING_INSPECTION


def test_double_review_rejected(head_client, db, port, inspector):
    shipment = _shipment(db, port, inspector)
    _inspect(head_client, shipment, FoodInspection.Decision.COMPLIANT)
    inspection = FoodInspection.objects.get(shipment=shipment)
    first = head_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'APPROVE'},
        format='json',
    )
    second = head_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'APPROVE'},
        format='json',
    )
    assert first.status_code == 200
    assert second.status_code == 400


def test_inspector_cannot_review(inspector_client, db, port, inspector):
    shipment = _shipment(db, port, inspector)
    assert _inspect(inspector_client, shipment, FoodInspection.Decision.COMPLIANT).status_code == 201
    inspection = FoodInspection.objects.get(shipment=shipment)
    res = inspector_client.post(
        f'/api/v1/food/inspections/{inspection.pk}/review/',
        {'action': 'APPROVE'},
        format='json',
    )
    assert res.status_code == 403
    inspection.refresh_from_db()
    assert inspection.supervisor_status == FoodInspection.SupervisorStatus.PENDING


def test_inspectors_workload(head_client, db, port, inspector, inspector2):
    _shipment(db, port, inspector, manifest='IMP-2026-00881')
    _shipment(db, port, inspector, manifest='IMP-2026-00882')
    res = head_client.get('/api/v1/food/shipments/inspectors/')
    assert res.status_code == 200
    rows = {r['id']: r for r in res.data['data']}
    assert str(inspector.pk) in rows and str(inspector2.pk) in rows
    assert rows[str(inspector.pk)]['open_tasks'] == 2
    assert rows[str(inspector2.pk)]['open_tasks'] == 0
    assert rows[str(inspector.pk)]['status'] in ('AVAILABLE', 'BUSY')


def test_supervisor_stats(head_client, db, port, inspector):
    _shipment(db, port, inspector, manifest='IMP-2026-00883', status=FoodShipment.ShipmentStatus.HOLD)
    _shipment(db, port, inspector, manifest='IMP-2026-00884', status=FoodShipment.ShipmentStatus.AWAITING_DECISION)
    s = _shipment(db, port, inspector, manifest='IMP-2026-00885')
    _inspect(head_client, s, FoodInspection.Decision.NON_COMPLIANT)
    res = head_client.get('/api/v1/food/shipments/supervisor-stats/')
    assert res.status_code == 200
    data = res.data['data']
    assert data['pending_review'] >= 1
    assert data['awaiting_decision'] >= 1
    assert data['holds_rejections'] >= 1
    assert data['active_inspectors_today'] >= 1


def test_decide_requires_reason_and_audits(head_client, db, port, inspector):
    shipment = _shipment(db, port, inspector, manifest='IMP-2026-00886', status=FoodShipment.ShipmentStatus.AWAITING_DECISION)
    no_reason = head_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/decide/',
        {'decision': FoodShipment.FinalDecision.REJECTED},
        format='json',
    )
    assert no_reason.status_code == 400
    ok = head_client.post(
        f'/api/v1/food/shipments/{shipment.pk}/decide/',
        {
            'decision': FoodShipment.FinalDecision.REJECTED,
            'reason': 'نتيجة مختبرية إيجابية أعلى من الحدود المسموحة',
        },
        format='json',
    )
    assert ok.status_code == 201
    shipment.refresh_from_db()
    assert shipment.status == FoodShipment.ShipmentStatus.REJECTED
    assert ok.data['data']['certificate_number'].startswith('FCER-')
    assert AuditLog.objects.filter(detail__event='final_decision').exists()


def test_department_head_dashboard(head_client, db, port, inspector):
    s = _shipment(db, port, inspector, manifest='IMP-2026-00887', status=FoodShipment.ShipmentStatus.AWAITING_DECISION)
    assert _inspect(head_client, s, FoodInspection.Decision.NON_COMPLIANT).status_code == 201
    res = head_client.get('/api/v1/food/shipments/department-head-dashboard/?period=DAY')
    assert res.status_code == 200
    d = res.data['data']
    assert d['kpis']['pending_decision'] >= 1
    assert d['details']['inspected'] >= 1
    assert d['details']['non_compliant_results'] >= 1
    assert any(p['id'] == str(s.pk) for p in d['pending_decisions'])
    assert len(d['recent_shipments']) >= 1
    assert 'inspection_fees' in d['finance'] and 'total' in d['finance']
    assert d['staff']['inspectors'] >= 1


def _ep_state():
    from apps.masterdata.models import Sector as MSector, State as MState

    sector, _c = MSector.objects.get_or_create(
        code='SEC_T', defaults={'name_ar': 'قطاع الاختبار'}
    )
    state, _c2 = MState.objects.get_or_create(
        code='ST_T', defaults={'name_ar': 'ولاية الاختبار', 'sector': sector}
    )
    return state

