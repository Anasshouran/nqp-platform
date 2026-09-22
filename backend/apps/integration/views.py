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

from .models import DeveloperApp, ExternalEntity, IntegrationLog, WebhookEndpoint
from .serializers import (
    DeveloperAppSerializer,
    ExternalEntitySerializer,
    ImmigrationVerifySerializer,
    IntegrationLogSerializer,
    WebhookEndpointSerializer,
)


def _ihr_header(report_type):
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
    def _log(self, name, request_type, request_payload, response_payload, status_code):
        return IntegrationLog.objects.create(
            integration_name=name,
            request_type=request_type,
            request_payload=request_payload,
            response_payload=response_payload,
            status_code=status_code,
        )

    def _ack(self, name, request_type, request, result=None, code=200):
        data = result if result is not None else {'accepted': True, 'message': 'تم الاستلام'}
        self._log(name, request_type, request.data, data, code)
        return Response(success_response(data), status=status.HTTP_200_OK if code == 200 else status.HTTP_201_CREATED)

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
        self._log('WHO', 'IHR_PHEIC', {'output': request.query_params.get('output', 'json')}, data, 200)
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
        self._log('WHO', 'IHR_WEEKLY', {'period': report['period']}, data, 200)
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
        self._log('WHO', f'IHR_SUBMIT_{report_type}', payload, result, 201)
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
        self._log('IMMIGRATION', 'VERIFY', request.data, result, 200)
        return Response(success_response(result))

    @action(detail=False, methods=['post'], url_path='labs/request')
    def labs_request(self, request):
        return self._ack('REFERENCE_LAB', 'SAMPLE_REQUEST', request, code=201)

    @action(detail=False, methods=['post'], url_path='labs/result')
    def labs_result(self, request):
        return self._ack('REFERENCE_LAB', 'RESULT_RECEIVE', request)

    @action(detail=False, methods=['get'], url_path='labs/status/{sample_id}')
    def labs_status(self, request, sample_id=None):
        return self._ack('REFERENCE_LAB', 'STATUS', request)

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
    queryset = IntegrationLog.objects.all()
    serializer_class = IntegrationLogSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['integration_name', 'request_type']
    ordering_fields = ['request_timestamp']
    filter_fields = ['integration_name', 'status_code']


class ExternalEntityViewSet(viewsets.ModelViewSet):
    queryset = ExternalEntity.objects.all()
    serializer_class = ExternalEntitySerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    filter_fields = ['is_active']


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
