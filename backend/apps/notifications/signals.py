"""إطلاق إشعارات الويب المدفوعة عند نشر إشعارات صحية عالية الأهمية (عبر Celery)."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.carriers.models import HealthNotice


@receiver(post_save, sender=HealthNotice)
def push_high_priority_notice(sender, instance, created, **kwargs):
    """جدولة بث إشعار مدفوع عند إصدار إشعار صحي جديد عبر مهمة Celery."""
    if not created:
        return

    from .tasks import push_health_notice

    push_health_notice.delay(instance.id)