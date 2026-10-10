import json
from datetime import timedelta
from xml.sax.saxutils import escape as xml_escape

from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.travelers.models import Traveler
from core.filters import ExactFilterBackend
from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import (
    ApiEndpoint,
    AuditLog,
    DataScope,
    DeveloperApp,
    EncryptedCredentialValue,
    Integration,
    IntegrationHealth,
    IntegrationLog,
    Organization,
    WebhookDelivery,
    WebhookEndpoint,
    WebhookSubscription,
)
from .organizations.results import redact_text
from .serializers import (
    ApiEndpointSerializer,
    AuditLogSerializer,
    DataScopeSerializer,
    DeveloperAppSerializer,
    EncryptedCredentialValueSerializer,
    ImmigrationVerifySerializer,
    IntegrationHealthSerializer,
    IntegrationLogSerializer,
    IntegrationSerializer,
    OrganizationSerializer,
    WebhookDeliverySerializer,
    WebhookEndpointSerializer,
    WebhookSubscriptionSerializer,
)

#: اتجاه كل نوع طلب في السجل.
#:
#: `_ack` استُخدم مع `request_type` اصطلاحي: اللاحقة `*_SEND` تعني أن
#: المنصة تُرسل، و`*_RECEIVE` تعني أن النظام الخارجي أرسل. هذا الاستخراج
#: جديد ولا يُستخدم على البيانات القديمة (اتجاهها يبقى `UNKNOWN`).
_DIRECTION_BY_VERB = {
    'RECEIVE': IntegrationLog.Direction.INBOUND,
    'VERIFY': IntegrationLog.Direction.INBOUND,
    'SEND': IntegrationLog.Direction.OUTBOUND,
}


def _direction_for(request_type: str) -> str:
    """يحدّد اتجاه الرسالة من اصطلاح اسم الطلب، وإلا `UNKNOWN`.

    اللاحقة `SEND` و`RECEIVE` تُفحص على آخر جزء بعد `_` حتى لا يُطابَق
    `RECEIVE` داخل كلمة أطول. أي اسم لا يتبع الاصطلاح يبقى `UNKNOWN`
    أفضل من تخمين خاطئ.
    """
    tail = (request_type or '').rsplit('_', 1)[-1]
    return _DIRECTION_BY_VERB.get(tail, IntegrationLog.Direction.UNKNOWN)


def _redacted_payload(value):
    """يخزّن الـ payload بعد تنقية الأسرار منه.

    `redact_text` يعمل على نصوص، لذا يُسلسَل الـ payload أولاً ثم تُنقّى
    القيم النصية داخله وتُعاد بنية JSON. كان الحفظ قبل ذلك يكتب
    `request.data` خاماً، فأي مفتاح مكرر في جسم الطلب كان يصل إلى قاعدة
    البيانات دون تنقية رغم أن عقد الإخفاء معرّف في نفس التطبيق.

    التنقية تتم على **مفتاح** الحقل أيضاً (`_is_secret_key`): أنماط
    `redact_text` تبحث عن `api_key: قيمة` داخل نص، بينما في الـ payload
    المُفكَّك يكون `api_key` اسم مفتاح والقيمة مجرولة عنه فلا تطابقه.
    """
    if value is None:
        return {}
    try:
        decoded = json.loads(json.dumps(value, default=str, ensure_ascii=False))
    except (TypeError, ValueError):
        return {'summary': redact_text(value)}

    if isinstance(decoded, dict):
        return {key: _redacted_value(item, key) for key, item in decoded.items()}
    if isinstance(decoded, list):
        return [_redacted_value(item) for item in decoded]
    return _redacted_value(decoded)


#: أسماء المفاتيح التي قيمتها سرّية بحد ذاتها.
#:
#: مطابقة التسمية (لا القيمة) مقصودة: `api_key: 'nqp_...'` سر حتى لو لم
#: يمرّ عبر أنماط `redact_text`، لأن الاسم ينفي ببساطة أن القيمة عامة.
_SECRET_KEY_NAMES = frozenset({
    'api_key', 'apikey', 'key',
    'client_secret', 'client_id',
    'access_token', 'refresh_token', 'id_token', 'token',
    'secret', 'password', 'passwd', 'pin',
    'authorization', 'auth',
})

REDACTED = '[REDACTED]'


def _is_secret_key(key) -> bool:
    """هل اسم المفتاح يكفي للحكم بأن قيمته سرّ؟"""
    if not isinstance(key, str):
        return False
    return key.strip().lower().replace('-', '_') in _SECRET_KEY_NAMES


def _redacted_value(value, key=None):
    if _is_secret_key(key):
        return REDACTED if value not in (None, '') else value
    if isinstance(value, str):
        return redact_text(value, limit=0)
    if isinstance(value, dict):
        return {k: _redacted_value(item, k) for k, item in value.items()}
    if isinstance(value, list):
        return [_redacted_value(item) for item in value]
    return value


def _ihr_header(report_type):
    """ترويسة تقرير IHR.

    قيد مُوثَّق: `report_id` بدقة الثانية، فطلبان في الثانية نفسها يتشاركان
    المعرّف. وهو مقبول لأن المعرّف يميّز **التقرير** لا الطلب، لكن لا يجوز
    بناء ربط بين عمليتين على أساسه وحده. له قيمة تسلسل (`IHR-SD-...`
    في `apps.ihr`) بدل ذلك.
    """
    now = timezone.now()
    return {
        'report_id': f'IHR-{report_type}-{now:%Y%m%d-%H%M%S}',
        'country': 'SDN',
        'report_type': report_type,
        'report_date': now.date().isoformat(),
        'generated_at': now.isoformat(),
    }


def _pheic_events():
    """أحداث PHEIC: إنذارات تفشٍ نشطة + حالات مؤكدة/محتملة لأمراض IHR المدرجة."""
    from apps.emergency_eoc.models import EmergencyAlert, HealthCase

    events = []
    alerts = EmergencyAlert.objects.filter(
        alert_type=EmergencyAlert.AlertType.OUTBREAK,
    ).exclude(status=EmergencyAlert.AlertStatus.RESOLVED).select_related('port')
    for alert in alerts:
        events.append({
            'case_id': str(alert.id),
            'source': 'alert',
            'description': alert.description,
            'event_date': alert.triggered_at.date().isoformat(),
            'location': {
                'port_code': alert.port.code if alert.port else '',
                'city': alert.port.city_name if alert.port and hasattr(alert.port, 'city_name') else '',
            },
            'cases': {'confirmed': 0, 'probable': 0},
            'actions_taken': [],
        })

    cases = (
        HealthCase.objects.filter(
            disease__isnull=False,
            case_type__in=[HealthCase.CaseType.CONFIRMED, HealthCase.CaseType.PROBABLE],
        )
        .filter(disease__ihr_category__in=['PHEIC'])
        .select_related('disease', 'port')
    )
    for case in cases:
        loc_code = case.port.code if case.port else ''
        ev = next((e for e in events if e['location']['port_code'] == loc_code
                   and e.get('disease') == case.disease.icd_11_code), None)
        if ev is None:
            events.append({
                'case_id': case.case_number or str(case.id),
                'source': 'case',
                'disease': {
                    'icd_11_code': case.disease.icd_11_code,
                    'name_en': case.disease.name_en,
                    'name_ar': case.disease.name_ar,
                },
                'description': '',
                'event_date': (case.reported_date or case.created_at.date()).isoformat(),
                'location': {
                    'port_code': loc_code,
                    'city': '',
                },
                'cases': {'confirmed': 0, 'probable': 0},
                'actions_taken': (
                    ['Isolation of patient']
                    if case.status == HealthCase.Status.ISOLATED
                    else ['Under investigation']
                ),
            })
            ev = events[-1]
        key = 'confirmed' if case.case_type == HealthCase.CaseType.CONFIRMED else 'probable'
        ev['cases'][key] += 1
    return events


def _weekly_rows():
    """الحالات المبَلّغ عنها خلال الأسبوع الحالي مجمّعة حسب المرض والمنفذ."""
    from apps.emergency_eoc.models import HealthCase

    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    rows = (
        HealthCase.objects.filter(
            reported_date__gte=week_start,
            reported_date__lte=today,
            disease__isnull=False,
        )
        .values(
            'disease__icd_11_code', 'disease__name_en', 'disease__name_ar',
            'port__code', 'case_type',
        )
        .annotate(total=Count('id'))
    )
    grouped = {}
    for r in rows:
        key = (r['disease__icd_11_code'], r['port__code'] or '')
        entry = grouped.setdefault(key, {
            'disease': {
                'icd_11_code': r['disease__icd_11_code'],
                'name_en': r['disease__name_en'],
                'name_ar': r['disease__name_ar'],
            },
            'location': {'port_code': r['port__code'] or ''},
            'cases': {'suspected': 0, 'confirmed': 0, 'probable': 0},
        })
        idx = r['case_type'].lower()
        if idx in entry['cases']:
            entry['cases'][idx] += r['total']
    return list(grouped.values())


def _to_spar_xml(report):
    header = report['header']
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<IHRReport xmlns="http://www.who.int/ihr/report/1.0">',
        f'  <Header>',
        f'    <Country>{xml_escape(header["country"])}</Country>',
        f'    <EventDate>{xml_escape(header.get("event_date", ""))}</EventDate>',
        f'    <ReportDate>{xml_escape(header["report_date"])}</ReportDate>',
        f'    <EventType>{xml_escape(header["report_type"])}</EventType>',
        f'  </Header>',
    ]
    for ev in report['events']:
        lines.append('  <Event>')
        disease = ev.get('disease') or {}
        lines.append(f'    <Disease><Code>{xml_escape(disease.get("icd_11_code", ""))}</Code>'
                     f'<Name>{xml_escape(disease.get("name_en", ""))}</Name></Disease>')
        loc = ev['location']
        lines.append(f'    <Location><Port>{xml_escape(loc.get("port_code", ""))}</Port>'
                     f'<City>{xml_escape(loc.get("city", ""))}</City></Location>')
        cases = ev.get('cases', {})
        lines.append(f'    <Cases><Confirmed>{cases.get("confirmed", 0)}</Confirmed>'
                     f'<Probable>{cases.get("probable", 0)}</Probable></Cases>')
        actions = ev.get('actions_taken') or []
        if actions:
            lines.append('    <ActionsTaken>')
            for act in actions:
                lines.append(f'      <Action>{xml_escape(act)}</Action>')
            lines.append('    </ActionsTaken>')
        lines.append('  </Event>')
    lines.append('</IHRReport>')
    return '\n'.join(lines)


class IntegrationViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer

    def _log(
        self,
        name,
        request_type,
        request_payload,
        response_payload,
        status_code,
        *,
        status=None,
        direction=None,
        error_message='',
        duration_ms=None,
        correlation_id='',
        started_at=None,
    ):
        """يسجّل عملية تبادل واحدة بكل حقول المراقبة.

        `status_code` هو رمز HTTP الذي يقابل الاستجابة الفعلية، و`status`
        هو نتيجة العملية. لا يتطابقان بالضرورة: التبادل الداخلي (IHR مثلاً)
        نجاح بلا رمز HTTP، والفشل قد يكون برمجياً لا HTTP.
        """
        if status is None:
            if status_code is None:
                status = IntegrationLog.Status.UNKNOWN
            elif 200 <= status_code < 400:
                status = IntegrationLog.Status.SUCCESS
            else:
                status = IntegrationLog.Status.FAILED

        completed_at = timezone.now()
        if started_at is None:
            started_at = completed_at
        if duration_ms is None:
            duration_ms = max(
                0, int((completed_at - started_at).total_seconds() * 1000)
            )

        return IntegrationLog.objects.create(
            integration_name=name,
            request_type=request_type,
            request_payload=_redacted_payload(request_payload),
            response_payload=_redacted_payload(response_payload),
            status_code=status_code,
            direction=direction or _direction_for(request_type),
            status=status,
            error_message=redact_text(error_message) if error_message else '',
            duration_ms=duration_ms,
            correlation_id=correlation_id or '',
            completed_at=completed_at,
        )

    def _ack(self, name, request_type, request, result=None, code=200):
        """يستقبل رسالة من نظام خارجي ويجيب بتأكيد.

        `code` هو **رمز الاستجابة المرسَل فعلياً** وليس رمزاً منفصلاً
        للقراءة في السجل: الكود القديم كان يسجّل `201` ويرد `HTTP 200`،
        فكان السجل يقول شيئاً لا يقوله الرد.
        """
        data = result if result is not None else {'accepted': True, 'message': 'تم الاستلام'}
        started_at = timezone.now()
        # `request.data` يُنشئ QueryDict حتى لطلب GET بلا جسم، فيقرأ
        # معاملات الاستعلام. الفحص الصريح أوضح من الاعتماد على ذلك.
        payload = request.data if request.method in ('POST', 'PUT', 'PATCH') else request.query_params
        # الاتجاه يُشتق من اصطلاح `request_type` لا يُثبَّت على INBOUND:
        # بعض نقاط `_ack` تمثّل **إرسالاً** من المنصة (`CERTIFICATE_SEND`
        # و`AGGREGATED_SEND`)، وثبّتها كواردة كانت تسجّل اتجاهاً خاطئاً.
        self._log(
            name,
            request_type,
            payload,
            data,
            code,
            direction=_direction_for(request_type),
            started_at=started_at,
        )
        return Response(
            success_response(data),
            status=status.HTTP_200_OK if code == 200 else status.HTTP_201_CREATED,
        )

    def overview(self, request):
        return Response(success_response({
            'services': [
                'airlines', 'moh', 'customs', 'ihr', 'immigration', 'labs', 'surveillance', 'hospitals',
            ],
            'airlines': {
                'note': 'يتطلب مفتاح API لكل شركة عبر ترويسة X-API-Key (مُدار من بوابة الناقل).',
                'endpoints': [
                    {'method': 'POST', 'path': '/api/v1/integration/airlines/flights/'},
                    {'method': 'POST', 'path': '/api/v1/integration/airlines/manifest/'},
                    {'method': 'GET', 'path': '/api/v1/integration/airlines/notices/'},
                ],
            },
        }))

    @action(detail=False, methods=['post'], url_path='moh/reports')
    def moh_reports(self, request):
        return self._ack('MOH', 'REPORT_RECEIVE', request)

    @action(detail=False, methods=['post'], url_path='moh/alerts')
    def moh_alerts(self, request):
        return self._ack('MOH', 'ALERT_RECEIVE', request)

    @action(detail=False, methods=['post'], url_path='moh/policies')
    def moh_policies(self, request):
        return self._ack('MOH', 'POLICY_UPDATE', request)

    @action(detail=False, methods=['post'], url_path='customs/certificate')
    def customs_certificate(self, request):
        return self._ack('CUSTOMS', 'CERTIFICATE_SEND', request, code=201)

    @action(detail=False, methods=['post'], url_path='customs/status')
    def customs_status(self, request):
        return self._ack('CUSTOMS', 'STATUS_UPDATE', request)

    @action(detail=False, methods=['get'], url_path='ihr/report/pheic')
    def ihr_pheic(self, request):
        from apps.emergency_eoc.models import HealthCase

        header = _ihr_header('PHEIC')
        events = _pheic_events()
        confirmed = sum(e['cases'].get('confirmed', 0) for e in events)
        probable = sum(e['cases'].get('probable', 0) for e in events)
        report = {
            **header,
            'event_date': events[0]['event_date'] if events else header['report_date'],
            'events': events,
            'summary': {
                'events': len(events),
                'confirmed_cases': confirmed,
                'probable_cases': probable,
                'definition': HealthCase.CaseType.CONFIRMED.label,
            },
        }
        data = {'report': report}
        if request.query_params.get('output') == 'xml':
            data['spar_xml'] = _to_spar_xml({'header': header, 'events': events})
        self._log(
            'WHO',
            'IHR_PHEIC',
            {'output': request.query_params.get('output', 'json')},
            data,
            200,
            direction=IntegrationLog.Direction.OUTBOUND,
            correlation_id=header['report_id'],
        )
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='ihr/report/weekly')
    def ihr_weekly(self, request):
        header = _ihr_header('WEEKLY')
        events = _weekly_rows()
        confirmed = sum(ev['cases'].get('confirmed', 0) for ev in events)
        suspected = sum(ev['cases'].get('suspected', 0) for ev in events)
        report = {
            **header,
            'period': {
                'start': (timezone.now().date() - timedelta(days=timezone.now().weekday())).isoformat(),
                'end': timezone.now().date().isoformat(),
            },
            'events': events,
            'summary': {
                'reported_cases': confirmed + suspected,
                'confirmed': confirmed,
                'suspected': suspected,
            },
        }
        data = {'report': report}
        self._log(
            'WHO',
            'IHR_WEEKLY',
            {'period': report['period']},
            data,
            200,
            direction=IntegrationLog.Direction.OUTBOUND,
            correlation_id=header['report_id'],
        )
        return Response(success_response(data))

    @action(detail=False, methods=['post'], url_path='ihr/report/submit')
    def ihr_submit(self, request):
        report_type = (request.data.get('report_type') or 'PHEIC').upper()
        if report_type not in ('PHEIC', 'WEEKLY', 'ANNUAL'):
            raise ValidationError('report_type يجب أن يكون PHEIC أو WEEKLY أو ANNUAL')

        if report_type == 'WEEKLY':
            header, events = _ihr_header('WEEKLY'), _weekly_rows()
        elif report_type == 'ANNUAL':
            header = _ihr_header('ANNUAL')
            header['event_date'] = header['report_date']
            events = []
        else:
            header, events = _ihr_header('PHEIC'), _pheic_events()
            header['event_date'] = events[0]['event_date'] if events else header['report_date']

        render_xml = request.data.get('format') == 'xml'
        payload = {
            'report': {
                **header,
                'events': events,
                'summary': {'events': len(events)},
            },
        }
        if render_xml:
            payload['spar_xml'] = _to_spar_xml({'header': header, 'events': events})

        result = {
            'report_id': header['report_id'],
            'status': 'SEALED',
            'channel': 'EIS',
            'submitted_at': timezone.now().isoformat(),
            'receipt': f"{header['report_id']}:SEALED",
        }
        self._log(
            'WHO',
            f'IHR_SUBMIT_{report_type}',
            payload,
            result,
            201,
            direction=IntegrationLog.Direction.OUTBOUND,
            correlation_id=header['report_id'],
        )
        return Response(success_response({**payload, **result}), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='immigration/verify')
    def immigration_verify(self, request):
        serializer = ImmigrationVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        passport = serializer.validated_data.get('passport_number')
        traveler = Traveler.objects.filter(passport_number=passport).first()
        result = {
            'is_valid': traveler is not None,
            'full_name_ar': traveler.full_name if traveler else None,
            'national_id': None,
            'nationality': traveler.nationality.code if traveler else None,
            'expiry_date': None,
            'visa_status': 'VALID' if traveler else 'NONE',
        }
        self._log(
            'IMMIGRATION',
            'VERIFY',
            request.data,
            result,
            200,
            direction=IntegrationLog.Direction.INBOUND,
        )
        return Response(success_response(result))

    @action(detail=False, methods=['post'], url_path='labs/request')
    def labs_request(self, request):
        return self._ack('REFERENCE_LAB', 'SAMPLE_REQUEST', request, code=201)

    @action(detail=False, methods=['post'], url_path='labs/result')
    def labs_result(self, request):
        return self._ack('REFERENCE_LAB', 'RESULT_RECEIVE', request)

    @action(detail=False, methods=['get'], url_path='labs/status/{sample_id}')
    def labs_status(self, request, sample_id=None):
        # نقطة GET: `request.data` غير متاح لحالة الاستعلام، وتمريره
        # إلى `_ack` كان سيعطي payload فارغاً بلا معرّف العينة.
        # الاسم `STATUS_RECEIVE` يتضمّن `RECEIVE` عمداً حتى يُشتق منه
        # الاتجاه الوارد؛ الاسم القديم `STATUS` كان يُسجَّل `UNKNOWN`.
        return self._ack(
            'REFERENCE_LAB',
            'STATUS_RECEIVE',
            request,
            result={
                'accepted': True,
                'sample_id': sample_id,
                'message': 'تم تسجيل طلب الحالة',
            },
        )

    @action(detail=False, methods=['post'], url_path='surveillance/aggregated')
    def surveillance_aggregated(self, request):
        return self._ack('SURVEILLANCE', 'AGGREGATED_SEND', request, code=201)

    @action(detail=False, methods=['post'], url_path='surveillance/alert')
    def surveillance_alert(self, request):
        return self._ack('SURVEILLANCE', 'ALERT_SEND', request, code=201)

    @action(detail=False, methods=['post'], url_path='hospitals/referral')
    def hospitals_referral(self, request):
        return self._ack('HOSPITAL', 'REFERRAL_SEND', request, code=201)

    @action(detail=False, methods=['post'], url_path='hospitals/confirm')
    def hospitals_confirm(self, request):
        return self._ack('HOSPITAL', 'REFERRAL_CONFIRM', request)


class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل مراقبة التبادل: قراءة فقط، مع فلاتر состояة والاتجاه.

    `direction` و`status` ها محور المراقبة، لذلك قابلان للتصفية
    والترتيب؛ و`correlation_id` للربط بين عمليتين.
    """

    queryset = IntegrationLog.objects.all()
    serializer_class = IntegrationLogSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['integration_name', 'request_type', 'correlation_id']
    ordering_fields = ['request_timestamp', 'duration_ms', 'status_code']
    filter_fields = ['integration_name', 'status_code', 'direction', 'status', 'request_type']


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name_en', 'name_ar', 'code']
    ordering_fields = ['name_en', 'created_at']
    filter_fields = ['org_type', 'status', 'is_active', 'country']


class DeveloperAppViewSet(viewsets.ModelViewSet):
    """إدارة تطبيقات المطورين المسجلة (بوابة المطورين)."""

    queryset = DeveloperApp.objects.all()
    serializer_class = DeveloperAppSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    filter_fields = ['is_active']

    @action(detail=True, methods=['post'], url_path='rotate-key')
    def rotate_key(self, request, pk=None):
        app = self.get_object()
        app.api_key = DeveloperApp._generate_key()
        app.save(update_fields=['api_key', 'updated_at'])
        return Response(success_response(DeveloperAppSerializer(app).data))


class WebhookEndpointViewSet(viewsets.ModelViewSet):
    """نقاط الويب هوك المسجلة لتطبيقات المطورين."""

    queryset = WebhookEndpoint.objects.all()
    serializer_class = WebhookEndpointSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['event_type', 'endpoint_url']
    ordering_fields = ['created_at']
    filter_fields = ['app', 'event_type', 'is_active']


class ApiEndpointViewSet(viewsets.ModelViewSet):
    """إدارة كتالوج نقاط API الخارجية."""

    queryset = ApiEndpoint.objects.select_related('organization').all()
    serializer_class = ApiEndpointSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name_en', 'name_ar', 'organization__name_en']
    ordering_fields = ['code', 'name_en', 'scope', 'created_at']
    filter_fields = ['organization', 'protocol', 'scope', 'is_active']


class IntegrationViewSetPortal(viewsets.ModelViewSet):
    """إدارة تكاملات المنظمات — شاشة 'التكاملات'."""

    queryset = Integration.objects.select_related('organization', 'endpoint').all()
    serializer_class = IntegrationSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['organization__name_en', 'endpoint__code', 'endpoint__name_en']
    ordering_fields = ['organization__name_en', 'endpoint__code', 'status', 'created_at']
    filter_fields = ['organization', 'endpoint', 'environment', 'status', 'is_active']


class IntegrationHealthViewSet(viewsets.ReadOnlyModelViewSet):
    """سجلات صحة التكامل — شاشة 'الاتصال والصحة'.

    القراءة فقط لأن الحقول تُشتق من فحص فعلي، لكن `run_check` يتيح
    تسجيل نتيجة فحص موثّقة عبر `POST /integration/health/run_check/`.
    """

    queryset = IntegrationHealth.objects.select_related('integration__organization').all()
    serializer_class = IntegrationHealthSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['integration__organization__name_en', 'check_type']
    ordering_fields = ['checked_at']
    filter_fields = ['integration', 'passed']

    @action(detail=False, methods=['post'], url_path='run_check')
    def run_check(self, request):
        """يسجّل نتيجة فحص اتصال يدوياً كـevidence قابل للتدقيق."""
        integration_id = request.data.get('integration')
        if not integration_id:
            raise ValidationError({'integration': 'هذا الحقل مطلوب.'})
        try:
            integration = Integration.objects.select_related('organization', 'endpoint').get(id=integration_id)
        except (Integration.DoesNotExist, ValueError):
            raise ValidationError({'integration': 'تكامل غير موجود.'})

        check_type = request.data.get('check_type', 'manual')
        passed = bool(request.data.get('passed', False))
        detail = redact_text(request.data.get('detail', ''))

        health = IntegrationHealth.objects.create(
            integration=integration,
            check_type=check_type,
            passed=passed,
            detail=detail,
            checked_by=request.user.full_name,
        )
        if passed:
            integration.status = Integration.Status.VERIFIED
            integration.verified_at = health.checked_at
            integration.save(update_fields=['status', 'verified_at', 'updated_at'])

        return Response(
            success_response(IntegrationHealthSerializer(health).data),
            status=status.HTTP_201_CREATED,
        )


class WebhookSubscriptionViewSet(viewsets.ModelViewSet):
    """إدارة اشتراكات الويب هوك — شاشة 'Webhooks'."""

    queryset = WebhookSubscription.objects.select_related('organization', 'integration').all()
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['organization__name_en', 'event_type', 'endpoint_url']
    ordering_fields = ['created_at', 'failure_count']
    filter_fields = ['organization', 'integration', 'event_type', 'is_active']


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل محاولات توصيل الويب هوك — شاشة 'الأخطاء' / 'المزامنة'."""

    queryset = WebhookDelivery.objects.select_related('subscription').all()
    serializer_class = WebhookDeliverySerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['subscription__event_type', 'subscription__organization__name_en']
    ordering_fields = ['fired_at', 'duration_ms']
    filter_fields = ['subscription', 'status']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """سجل مراجعة عمليات البوابة — شاشة 'Audit Logs'."""

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['user', 'action', 'resource_type', 'resource_id']
    ordering_fields = ['created_at']
    filter_fields = ['result', 'resource_type', 'user']


class DataScopeViewSet(viewsets.ModelViewSet):
    """نطاقات تبادل البيانات — شاشة 'خدمات البيانات' / 'الأمن والصلاحيات'."""

    queryset = DataScope.objects.select_related('organization', 'endpoint', 'granted_by').all()
    serializer_class = DataScopeSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['organization__name_en', 'endpoint__code', 'resource']
    ordering_fields = ['created_at']
    filter_fields = ['organization', 'endpoint', 'direction', 'is_active']


class EncryptedCredentialValueViewSet(viewsets.ModelViewSet):
    """إدارة الأسرار المشفرة — شاشة 'بيانات الاعتماد'."""

    queryset = EncryptedCredentialValue.objects.select_related('integration__organization').all()
    serializer_class = EncryptedCredentialValueSerializer
    permission_classes = [IsAdmin]
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['integration__organization__name_en', 'key_name']
    ordering_fields = ['created_at']
    filter_fields = ['integration', 'key_type']
