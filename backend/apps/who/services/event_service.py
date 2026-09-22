"""خدمة بناء حمولة أحداث IHR وإرسالها إلى منظمة الصحة العالمية."""

from datetime import date, datetime
from typing import Any

from apps.ihr.models import IHREvent


def _iso(value) -> str:
    """تحويل تاريخ/وقت لصيغة ISO مع بقاء النصوص كما هي."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def build_event_payload(event: IHREvent) -> dict[str, Any]:
    """بناء حمولة JSON للحدث وفق نموذج IHR الداخلي المقترح (الحد الأدنى من البيانات)."""
    payload = {
        'event_id': event.event_number,
        'country': 'SDN',
        'event_type': event.event_type,
        'title': event.title,
        'description': event.description,
        'risk_level': event.risk_level,
        'status': event.status,
        'date_detected': _iso(event.date_detected),
        'cases': {
            'suspected': event.cases_suspected,
            'probable': event.cases_probable,
            'confirmed': event.cases_confirmed,
            'deaths': event.deaths,
        },
        'source': 'AFYATNA',
    }
    if event.disease:
        payload['disease'] = {
            'icd11_code': event.disease.icd_11_code,
            'name_ar': event.disease.name_ar,
            'name_en': event.disease.name_en,
        }
    location: dict[str, Any] = {}
    if event.port:
        location['point_of_entry'] = event.port.code
        location['point_of_entry_name'] = event.port.name_ar
    if event.sector:
        location['sector'] = event.sector.name_ar
    if event.locality:
        location['locality'] = event.locality.name_ar
    if location:
        payload['location'] = location
    return payload


def submit_event_to_who(event: IHREvent) -> str:
    """إرسال حدث IHR للجهة المكوّنة لمنظمة الصحة، يُرجع المرجع الخارجي."""
    from apps.who.clients.base_client import WHOClient
    from apps.who.clients.base_client import WHOSyncLog
    from apps.who.models import WHOIntegration

    integration = WHOIntegration.objects.filter(is_active=True).order_by('-last_success_at').first()
    if not integration:
        raise ValueError('لا يوجد تكامل WHO فعّال — لابد من تهيئته أولاً.')

    client = WHOClient(integration)
    payload = build_event_payload(event)
    operation = WHOSyncLog.Operation.EVENT_SUBMIT
    result = client.post(
        operation,
        '/api/v1/events',
        payload,
        resource_type='ihr_event',
        local_ref=str(event.id),
    )
    remote_ref = ''
    if isinstance(result.get('data'), dict):
        remote_ref = str(result['data'].get('id', ''))
    if remote_ref:
        event.who_reference = remote_ref
        event.save(update_fields=['who_reference'])
    return remote_ref