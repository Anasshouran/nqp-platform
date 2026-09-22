
---

### 📄 5. `Message-Queue/Message-Queue.md` (طابور الرسائل)

```markdown
# Message Queue - طابور الرسائل (Redis + Celery)

## 1. الهدف
توفير آلية للمعالجة غير المتزامنة (Asynchronous Processing) للمهام الثقيلة أو التي قد تستغرق وقتاً طويلاً، مثل: (رفع قوائم الركاب الكبيرة، إرسال الإشعارات الجماعية، توليد التقارير)، وذلك لمنع تعطيل واجهات المستخدم (API) وتحسين تجربة المستخدم.

## 2. التقنية المستخدمة
- **Broker**: **Redis** (الإصدار 7+).
- **معالج المهام**: **Celery** (مع Django-Celery).
- **الجدولة**: **Celery Beat** للمهام المجدولة (الدورية).

## 3. المهام النموذجية (Typical Tasks)

| اسم المهمة | الوصف | وقت المعالجة المتوقع |
| :--- | :--- | :--- |
| `process_passenger_manifest` | معالجة قائمة الركاب المرفوعة من شركة الطيران (تحقق، مقارنة، تخزين). | 2-5 دقائق (حسب حجم الملف). |
| `send_mass_alert` | إرسال إشعار جماعي (SMS/Push) لآلاف المستلمين. | 5-15 دقيقة (حسب عدد المستلمين). |
| `generate_national_report` | توليد تقرير وطني شامل (PDF/Excel) يحتوي على آلاف السجلات. | 5-10 دقائق. |
| `sync_icd11_codes` | مزامنة أكواد ICD-11 مع منظمة الصحة العالمية. | 2-5 دقائق. |
| `process_food_sample_result` | معالجة نتيجة عينة غذائية وتحديث حالة الشحنة. | 1-2 دقيقة. |

## 4. هيكل المهمة (Task Structure)

```python
# apps/integration/tasks.py
from celery import shared_task
from apps.carrier.services import ManifestProcessor

@shared_task(bind=True, max_retries=3, time_limit=300)
def process_passenger_manifest(self, manifest_id):
    """معالجة قائمة الركاب المرفوعة."""
    try:
        processor = ManifestProcessor(manifest_id)
        result = processor.process()
        return {'status': 'success', 'manifest_id': manifest_id, 'summary': result}
    except Exception as e:
        # تسجيل الخطأ وإعادة المحاولة
        raise self.retry(exc=e, countdown=60)  # إعادة المحاولة بعد دقيقة

5. مراقبة الطابور (Queue Monitoring)

    Celery Flower: واجهة رسومية لمراقبة المهام (قيد التنفيذ، المكتملة، الفاشلة).

    المؤشرات (Metrics):

        عدد المهام في الطابور (Queue Length).

        متوسط وقت المعالجة.

        نسبة المهام الفاشلة.

    التنبيهات: إرسال تنبيه في حال تجاوز عدد المهام في الطابور 100 مهمة.

6. تكوين Celery في Django
python

# celery.py
from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nqp_backend.settings')
app = Celery('nqp_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# celery_beat_schedule.py
from celery.schedules import crontab
app.conf.beat_schedule = {
    'sync-icd11-daily': {
        'task': 'apps.integration.tasks.sync_icd11_codes',
        'schedule': crontab(hour=2, minute=0),
    },
}

7. إعادة المحاولة (Retry) وفشل المهام

    الحد الأقصى للمحاولات: 3 محاولات.

    فترات الانتظار: 5 دقائق، 30 دقيقة، ساعتين.

    المهام الفاشلة بشكل نهائي: يتم تسجيلها في (Audit Log) وإرسال إشعار للمسؤول.