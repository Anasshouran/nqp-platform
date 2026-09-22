"""اختبارات تشغيل سلسلة إشعارات الويب عند إصدار إشعار صحي."""

import pytest

pytestmark = pytest.mark.django_db


def test_high_priority_notice_trigger_webpush_without_subscribers():
    from apps.carriers.models import HealthNotice
    from apps.notifications.models import WebPushSubscription

    assert WebPushSubscription.objects.count() == 0
    HealthNotice.objects.create(
        title='إنذار وبائي',
        description='تفشي محتمل',
        category=HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
        priority=HealthNotice.NoticePriority.HIGH,
    )


@pytest.mark.django_db
def test_low_priority_notice_does_not_trigger(settings):
    """الإشعارات المنخفضة الأولوية لا تُرسل إشعارات مدفوعة."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    from unittest import mock

    from apps.carriers.models import HealthNotice

    with mock.patch('core.utils.webpush.send_web_push') as send_mock:
        HealthNotice.objects.create(
            title='إعلان عام',
            description='معلومات عامة',
            category=HealthNotice.NoticeCategory.GENERAL,
            priority=HealthNotice.NoticePriority.LOW,
        )
    send_mock.assert_not_called()


@pytest.mark.django_db
def test_high_priority_notice_triggers_webpush_with_subscribers(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    from unittest import mock

    from apps.carriers.models import HealthNotice
    from apps.notifications.models import WebPushSubscription

    subscription = WebPushSubscription.objects.create(
        endpoint='https://push.example.com/send/abc',
        p256dh='keys-p256dh',
        auth='keys-auth',
    )

    with mock.patch('core.utils.webpush.send_web_push') as send_mock:
        HealthNotice.objects.create(
            title='إنذار وبائي',
            description='تفشي محتمل',
            category=HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
            priority=HealthNotice.NoticePriority.HIGH,
        )

    send_mock.assert_called_once()
    assert subscription.endpoint in str(send_mock.call_args.args[0])