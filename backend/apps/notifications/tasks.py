"""مهام Celery للبث المدفوع وإشعارات الصحة (إبقاء العمل خارج مسار الطلب)."""

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


def _broadcast_web_push(subscriptions, title, body, url):
    from core.utils.webpush import send_web_push

    delivered = 0
    failed = 0
    for subscription in subscriptions:
        try:
            result = send_web_push(
                subscription,
                title=title,
                body=body,
                url=url,
            )
        except Exception:  # noqa: BLE001
            result = {'success': False}
        if result.get('success'):
            delivered += 1
        else:
            failed += 1
            if not (result.get('status') in (404, 410)):
                logger.warning('web push failed: %s', result)
    return {'delivered': delivered, 'failed': failed}


@shared_task(max_retries=3, default_retry_delay=60)
def broadcast_web_push(subscription_ids, title, body, url='/services/tools') -> dict:
    """بث رسالة لكل اشتراكات الويب المحددة (تؤخذ المعرّفات قبل الطلب)."""
    from .models import WebPushSubscription

    subscriptions = [
        s.as_dict()
        for s in WebPushSubscription.objects.filter(id__in=subscription_ids)
    ]
    return _broadcast_web_push(subscriptions, title, body, url)


@shared_task(max_retries=3, default_retry_delay=60)
def push_health_notice(instance_id) -> dict:
    """بث إشعار مدفوع للمشتركين عند إصدار إشعار صحي عالي/متوسط الأهمية."""
    from apps.carriers.models import HealthNotice

    from .models import WebPushSubscription

    notice = HealthNotice.objects.filter(id=instance_id).first()
    if not notice:
        return {'error': 'NOTICE_NOT_FOUND'}
    if notice.priority not in (HealthNotice.NoticePriority.HIGH, HealthNotice.NoticePriority.MEDIUM):
        return {'skipped': True}
    subscriptions = [s.as_dict() for s in WebPushSubscription.objects.all()]
    result = _broadcast_web_push(
        subscriptions,
        title=f'تنبيه صحي: {notice.title}',
        body=notice.description,
        url='/services/tools',
    )
    logger.info('pushed health notice %s → %s', instance_id, result)
    return result