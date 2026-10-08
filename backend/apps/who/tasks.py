"""مهام Celery لمزامنة وإرسال البيانات لمنظمة الصحة العالمية.

انضباط Phase 0:
* لا استيراد على مستوى الوحدة يفتح اتصالاً أو يبني عميلاً — كل الاستيرادات
  داخل الدوال، فاستيراد الوحدة لا يسبب أي أثر جانبي.
* لا تُجدول أي مهمة دورية هنا: لا ``CELERY_BEAT_SCHEDULE``، والتزامن الدوري
  مرحلة لاحقة بعد اعتماد العقد وتهيئة الاعتمادادات.
* كل مهمة تتحقق من التهيئة قبل أي إرسال وتُفشل برسالة واضحة.
"""

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def submit_ihr_event(self, event_id: str) -> str:
    """إرسال حدث IHR إلى منظمة الصحة العالمية مع إعادة محاولة عند الفشل."""
    from apps.ihr.models import IHREvent
    from apps.who.services.event_service import submit_event_to_who

    event = IHREvent.objects.filter(id=event_id).first()
    if not event:
        raise ValueError(f'حدث IHR غير موجود: {event_id}')
    try:
        remote_ref = submit_event_to_who(event)
        logger.info('Submitted IHR event %s → %s', event.event_number, remote_ref)
        return remote_ref
    except Exception as exc:  # noqa: BLE001
        logger.warning('IHR submit failed for %s: %s', event.event_number, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=600)
def sync_who_diseases(self) -> dict:
    """مزامنة خرائط ICD-11 للمرض من البيانات المحلية الصالحة."""
    from apps.who.clients.icd_client import ICD11Client
    from apps.who.models import WHOIntegration
    from apps.who.services.disease_service import sync_diseases_from_icd11

    integration = WHOIntegration.objects.filter(is_active=True).order_by('-last_success_at').first()
    if not integration or not integration.client_id or not integration.client_secret:
        raise ValueError('تكامل WHO غير مكتمل لتنفيذ مزامنة الأمراض.')
    client = ICD11Client(
        base_url=integration.base_url,
        client_id=integration.client_id,
        client_secret=integration.client_secret,
    )
    result = sync_diseases_from_icd11(client)
    if result.errors:
        raise RuntimeError(' | '.join(result.errors[:20]))
    return {
        'synced': result.synced,
        'updated': result.updated,
        'skipped': result.skipped,
    }


@shared_task(max_retries=2, default_retry_delay=60)
def test_who_connection() -> dict:
    """فحص اتصال سريع بالجهة المفوّضة (لا يُجرى إلا باستدعاء صريح)."""
    from apps.who.clients.base_client import test_connection
    from apps.who.config import SETTING_ENABLED, load_icd_configuration
    from apps.who.models import WHOIntegration

    if not load_icd_configuration().enabled:
        return {'connected': False, 'message': f'التكامل مع WHO معطّل عبر {SETTING_ENABLED}.'}

    integration = WHOIntegration.objects.filter(is_active=True).first()
    if not integration:
        return {'connected': False, 'message': 'لا يوجد تكامل WHO فعّال.'}
    return test_connection(integration)
