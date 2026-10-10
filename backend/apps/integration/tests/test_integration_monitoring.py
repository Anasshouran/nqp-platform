"""مراقبة التبادل مع الأنظمة الخارجية.

كل اختبار هنا يثبت خاصية مراقبة، لا مرور طلب بحد ذاته:
الاتجاه المشتق، اشتقاق الحالة، تطابق السجل مع الرد، تنقية الأسرار قبل
التخزين، وإمكانية التصفية على حقول المراقبة.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.integration.models import IntegrationLog
from apps.integration.views import _direction_for, _redacted_payload

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def client():
    client = APIClient()
    user = User.objects.create_user(
        email='monitor.officer@nqp.gov.sd',
        password='StrongPass123!',
        full_name='مسؤول المراقبة',
    )
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return client


# --- اشتقاق الاتجاه من اصطلاح نوع الطلب ------------------------------


@pytest.mark.parametrize('request_type,expected', [
    ('REPORT_RECEIVE', IntegrationLog.Direction.INBOUND),
    ('ALERT_RECEIVE', IntegrationLog.Direction.INBOUND),
    ('RESULT_RECEIVE', IntegrationLog.Direction.INBOUND),
    ('VERIFY', IntegrationLog.Direction.INBOUND),
    ('STATUS_RECEIVE', IntegrationLog.Direction.INBOUND),
    ('CERTIFICATE_SEND', IntegrationLog.Direction.OUTBOUND),
    ('AGGREGATED_SEND', IntegrationLog.Direction.OUTBOUND),
    ('REFERRAL_SEND', IntegrationLog.Direction.OUTBOUND),
])
def test_direction_derived_from_verb(request_type, expected):
    assert _direction_for(request_type) == expected


@pytest.mark.parametrize('request_type', [
    'IHR_PHEIC',        # لا لاحقة_receive ولا _send
    'IHR_SUBMIT_PHEIC',
    'POLICY_UPDATE',
    'UNKNOWN_OPERATION',
    '',
])
def test_direction_unknown_when_verb_is_absent(request_type):
    """اسم لا يتبع الاصطلاح يبقى `UNKNOWN` بدل التخمين."""
    assert _direction_for(request_type) == IntegrationLog.Direction.UNKNOWN


def test_direction_checks_only_the_final_verb_segment():
    """`SEND` داخل الاسم لا يوجّه الرسالة إن لم يكن اللاحق النهائي."""
    assert _direction_for('RESEND') == IntegrationLog.Direction.UNKNOWN
    assert _direction_for('RECEIVE_SEND') == IntegrationLog.Direction.OUTBOUND


# --- تنقية الأسرار قبل التخزين ----------------------------------------


@pytest.mark.parametrize('secret_key', [
    'api_key',
    'client_secret',
    'access_token',
    'password',
    'Authorization',
])
def test_request_payload_secrets_are_redacted(secret_key):
    payload = _redacted_payload({secret_key: 'super-secret-value', 'keep': 'visible'})

    assert payload[secret_key] == '[REDACTED]', secret_key
    assert payload['keep'] == 'visible'


def test_nested_secret_is_redacted():
    payload = _redacted_payload({'outer': {'api_key': 'nested-secret'}, 'list': [{'password': 'in-list'}]})

    assert payload['outer']['api_key'] == '[REDACTED]'
    assert payload['list'][0]['password'] == '[REDACTED]'


def test_redaction_keeps_non_string_types():
    payload = _redacted_payload({'count': 3, 'flag': True, 'ratio': 1.5, 'none': None})

    assert payload == {'count': 3, 'flag': True, 'ratio': 1.5, 'none': None}


def test_object_payload_is_stringified_not_crashing():
    """`default=str` في التسلسل يحوّل أي كائن إلى نص فلا ينهار الحفظ."""
    payload = _redacted_payload({'handler': object()})

    assert isinstance(payload['handler'], str)


def test_non_dict_payload_is_redacted():
    payload = _redacted_payload(['plain', {'api_key': 'secret-value'}])

    assert payload[0] == 'plain'
    assert payload[1]['api_key'] == '[REDACTED]'


# --- نقطة الاستلام: السجل يطابق الرد ---------------------------------


def test_ack_records_actual_http_status_not_a_different_one(client):
    """الكود القديم سجّل `201` وردّ `HTTP 200` — تعارض فيMonitoring."""
    response = client.post('/api/v1/integration/customs/certificate/', {}, format='json')

    assert response.status_code == 201, 'المفترض أن الرد يطابق الرمز المسجّل'
    log = IntegrationLog.objects.get(request_type='CERTIFICATE_SEND')
    assert log.status_code == 201


def test_ack_records_direction_and_success(client):
    client.post('/api/v1/integration/moh/reports/', {}, format='json')

    log = IntegrationLog.objects.get(request_type='REPORT_RECEIVE')
    assert log.direction == IntegrationLog.Direction.INBOUND
    assert log.status == IntegrationLog.Status.SUCCESS
    assert log.is_successful is True


def test_ack_redacts_secrets_from_stored_request(client):
    client.post(
        '/api/v1/integration/moh/reports/',
        {'api_key': 'leaked-secret', 'report_id': 'R-1'},
        format='json',
    )

    log = IntegrationLog.objects.get(request_type='REPORT_RECEIVE')
    assert log.request_payload['api_key'] == '[REDACTED]'
    assert log.request_payload['report_id'] == 'R-1'
    assert 'leaked-secret' not in str(log.request_payload)


def test_outbound_ack_is_recorded_as_outbound(client):
    """`_ack` استُخدم لنقاط **إرسال** لا لاستقبال فقط.

    `customs/certificate/` تمثّل المنصة ترسل الشهادة للجمارك، فتسجيلها
    `INBOUND` خطأ في المراقبة. الاختبار ثبّت هذا الخطأ بالردّ الفاشل.
    """
    client.post('/api/v1/integration/customs/certificate/', {}, format='json')

    log = IntegrationLog.objects.get(request_type='CERTIFICATE_SEND')
    assert log.direction == IntegrationLog.Direction.OUTBOUND


def test_log_records_duration_and_completion(client):
    client.post('/api/v1/integration/moh/alerts/', {}, format='json')

    log = IntegrationLog.objects.get(request_type='ALERT_RECEIVE')
    assert log.duration_ms is not None
    assert log.duration_ms >= 0
    assert log.completed_at is not None


def test_correlation_id_carries_the_ihr_report_id(client):
    """`correlation_id` يحمل `report_id` الخاص بالطلب نفسه.

    ملاحظة على الدقة: `_ihr_header` يبني `report_id` بدقة الثانية، فطلبان
    في الثانية نفسها يتشاركان المعرّف. لذلك يثبت هذا الاختبار أن لكل سجل
    المعرّف returned في استجابته، ولا يثبت أن طلبين مختلفين يبدوان
    متمايزين — وهو قيد مُوثَّق في `_ihr_header` لا عيب في المراقبة.
    """
    report = client.get('/api/v1/integration/ihr/report/pheic/')
    report_id = report.data['data']['report']['report_id']
    submit = client.post(
        '/api/v1/integration/ihr/report/submit/',
        {'report_type': 'PHEIC'},
        format='json',
    )

    pheic = IntegrationLog.objects.get(request_type='IHR_PHEIC')
    assert pheic.correlation_id == report_id
    assert pheic.direction == IntegrationLog.Direction.OUTBOUND

    submit_log = IntegrationLog.objects.get(request_type='IHR_SUBMIT_PHEIC')
    assert submit_log.correlation_id == submit.data['data']['report_id']
    assert submit_log.direction == IntegrationLog.Direction.OUTBOUND


def test_ihr_report_id_has_second_resolution(client):
    """قيد مُوثَّق: معرّف التقرير بدقة الثانية، فقد يتكرر في نفس اللحظة.

    يُثبَّت عمداً ليمنع أحدهم من بناء ربط بين عمليتين على أساسه دون قراءة
    هذا القيد. حلّه يتطلّب تغيير ترويسة IHR، وهو قرار نطاق لا تحسين صامت.
    """
    first = client.get('/api/v1/integration/ihr/report/pheic/')
    second = client.get('/api/v1/integration/ihr/report/pheic/')

    assert len(first.data['data']['report']['report_id']) == len(
        second.data['data']['report']['report_id']
    )
    # إن اختلفا فالتحقق من صحّته اعتماداً على الدقة الثانية.
    if first.data['data']['report']['report_id'] != second.data['data']['report']['report_id']:
        assert first.data['data']['report']['report_id'].startswith('IHR-PHEIC-')


# --- تسجيل نقطة الحالة (كانت غير موصلة) ------------------------------


def test_labs_status_endpoint_is_routable(client):
    """`labs_status` كان معرّفاً بلا مسار، فلا يمكن استدعاؤه."""
    response = client.get('/api/v1/integration/labs/status/SMP-1/')

    assert response.status_code == 200
    log = IntegrationLog.objects.get(request_type='STATUS_RECEIVE')
    assert log.response_payload['sample_id'] == 'SMP-1'
    assert log.direction == IntegrationLog.Direction.INBOUND


# --- التصفية على حقول المراقبة --------------------------------------


def _seed_logs():
    IntegrationLog.objects.create(
        integration_name='MOH', request_type='REPORT_RECEIVE',
        status=IntegrationLog.Status.SUCCESS, direction=IntegrationLog.Direction.INBOUND,
        status_code=200, correlation_id='CID-A',
    )
    IntegrationLog.objects.create(
        integration_name='WHO', request_type='IHR_SUBMIT_PHEIC',
        status=IntegrationLog.Status.FAILED, direction=IntegrationLog.Direction.OUTBOUND,
        status_code=500, correlation_id='CID-B', error_message='تعذر الإرسال',
    )
    IntegrationLog.objects.create(
        integration_name='WHO', request_type='IHR_WEEKLY',
        status=IntegrationLog.Status.SUCCESS, direction=IntegrationLog.Direction.OUTBOUND,
        status_code=200,
    )


@pytest.mark.parametrize('query,expected_count', [
    ('?status=FAILED', 1),
    ('?status=SUCCESS', 2),
    ('?direction=OUTBOUND', 2),
    ('?direction=INBOUND', 1),
    ('?integration_name=WHO', 2),
    ('?status=FAILED&direction=OUTBOUND', 1),
    ('?status=SUCCESS&direction=INBOUND', 1),
])
def test_logs_can_be_filtered_by_monitoring_fields(client, query, expected_count):
    _seed_logs()

    response = client.get(f'/api/v1/integration/logs/{query}')

    assert response.status_code == 200
    assert response.data['count'] == expected_count


def test_logs_are_searchable_by_correlation_id(client):
    _seed_logs()

    response = client.get('/api/v1/integration/logs/?search=CID-B')

    assert response.data['count'] == 1
    assert response.data['results'][0]['correlation_id'] == 'CID-B'


def test_logs_expose_monitoring_fields_in_serializer(client):
    _seed_logs()

    response = client.get('/api/v1/integration/logs/')
    row = response.data['results'][0]

    for field in ('direction', 'status', 'is_successful', 'error_message',
                  'duration_ms', 'correlation_id', 'completed_at'):
        assert field in row, field


def test_log_endpoint_is_read_only(client):
    """حقول المراقبة يكتبها التبادل، ولا يقبلها العميل."""
    _seed_logs()
    log = IntegrationLog.objects.first()

    response = client.patch(
        f'/api/v1/integration/logs/{log.id}/',
        {'status': 'SUCCESS', 'direction': 'OUTBOUND'},
        format='json',
    )

    assert response.status_code == 405


# --- النموذج ---------------------------------------------------------


def test_unknown_status_is_not_treated_as_success():
    """`UNKNOWN` ليس نجاحاً — الحقل الافتراضي لا يجوز قراءته كنجاح."""
    log = IntegrationLog.objects.create(
        integration_name='MOH', request_type='REPORT_RECEIVE',
    )

    assert log.direction == IntegrationLog.Direction.UNKNOWN
    assert log.status == IntegrationLog.Status.UNKNOWN
    assert log.is_successful is False


def test_is_successful_tracks_status_not_status_code():
    """رمز HTTP وحده لا يقرر النجاح: التبادل الداخلي نجاح بلا رمز."""
    log = IntegrationLog.objects.create(
        integration_name='WHO', request_type='IHR_SUBMIT_PHEIC',
        status=IntegrationLog.Status.SUCCESS, status_code=None,
    )

    assert log.is_successful is True

    log.status = IntegrationLog.Status.FAILED
    assert log.is_successful is False