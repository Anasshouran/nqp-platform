
---

### 📄 4. `Integration-Services/Integration-Services.md` (خدمات التكامل)

```markdown
# Integration Services - خدمات التكامل مع الأنظمة الخارجية

## 1. الهدف
إدارة وتنفيذ عمليات التكامل مع الأنظمة الخارجية (وزارة الصحة، الجمارك، منظمة الصحة العالمية، شركات الطيران) بشكل آمن وموثوق، باستخدام مهام (Celery) غير متزامنة لضمان عدم تأثر أداء المنصة الأساسية.

## 2. أنواع خدمات التكامل

| الخدمة | الوصف | النظام الخارجي | طريقة التنفيذ |
| :--- | :--- | :--- | :--- |
| **إرسال التقارير الوطنية** | إرسال التقارير الدورية (اليومية/الأسبوعية) إلى وزارة الصحة. | وزارة الصحة | REST API (مع Retry) |
| **إرسال شهادات الإفراج الغذائي** | إرسال شهادات الإفراج الصحي للشحنات الغذائية إلى الجمارك. | الجمارك | SFTP / REST API |
| **مزامنة ICD-11** | جلب تحديثات التصنيف الدولي للأمراض من WHO. | WHO | REST API (جدولة) |
| **إرسال تقارير IHR** | إرسال التقارير الوبائية إلى المركز الوطني للوائح الصحية. | المركز الوطني (IHR) | SFTP / REST API |
| **استقبال قوائم الركاب (Manifest)** | استقبال قوائم الركاب من شركات الطيران عبر API مخصص. | شركات الطيران | REST API |
| **الاستعلام عن المواصفات القياسية** | الاستعلام عن المواصفات القياسية من هيئة المواصفات والمقاييس. | هيئة المواصفات | REST API |

## 3. هيكل خدمة التكامل في Django (مثال)

```python
# apps/integration/services.py
import requests
from celery import shared_task
from django.core.cache import cache

@shared_task(bind=True, max_retries=3)
def send_report_to_moh(self, report_data, report_id):
    """إرسال تقرير إلى وزارة الصحة."""
    try:
        response = requests.post(
            'https://api.moh.gov.sd/v1/reports',
            json=report_data,
            headers={'Authorization': f'Api-Key {settings.MOH_API_KEY}'},
            timeout=30
        )
        response.raise_for_status()
        return {'status': 'success', 'report_id': report_id}
    except requests.exceptions.RequestException as e:
        # إعادة المحاولة بعد 5 دقائق، 30 دقيقة، ساعتين
        raise self.retry(exc=e, countdown=2 ** self.request.retries * 60)

@shared_task
def sync_icd11_codes():
    """مزامنة أكواد ICD-11 مع منظمة الصحة العالمية."""
    response = requests.get(
        'https://api.who.int/icd11/updates',
        headers={'X-API-Key': settings.WHO_API_KEY},
        timeout=60
    )
    data = response.json()
    # تحديث قاعدة البيانات المحلية
    for disease in data['codes']:
        Disease.objects.update_or_create(
            icd_11_code=disease['code'],
            defaults={
                'name_ar': disease['name_ar'],
                'name_en': disease['name_en'],
                'symptoms': disease.get('symptoms', [])
            }
        )
    cache.set('last_icd11_sync', timezone.now(), timeout=86400)
    return {'status': 'success', 'updated': len(data['codes'])}

4. جدولة المهام (Scheduling via Celery Beat)
python

# celery_beat_schedule.py
CELERY_BEAT_SCHEDULE = {
    'sync-icd11-daily': {
        'task': 'apps.integration.tasks.sync_icd11_codes',
        'schedule': crontab(hour=2, minute=0),  # 2 صباحاً يومياً
    },
    'send-daily-report-to-moh': {
        'task': 'apps.integration.tasks.send_report_to_moh',
        'schedule': crontab(hour=6, minute=0),  # 6 صباحاً يومياً
        'kwargs': {'report_type': 'daily'},
    },
    'send-weekly-ihr-report': {
        'task': 'apps.integration.tasks.send_ihr_report',
        'schedule': crontab(day_of_week=0, hour=3, minute=0),  # الأحد 3 صباحاً
    },
}

5. التعامل مع الأخطاء (Error Handling)

    فشل الاتصال: يتم إعادة المحاولة (Retry) مع فترات متزايدة (5 دقائق، 30 دقيقة، ساعتين).

    بيانات غير صحيحة: يتم تسجيل الخطأ في (Audit Log) وإرسال إشعار للمسؤول عبر البريد الإلكتروني.

    انتهاء المهلة (Timeout): يتم إلغاء الطلب وتسجيل الخطأ، مع إعادة المحاولة في الدورة التالية.

6. مراقبة خدمات التكامل (Monitoring)

    مؤشرات الأداء:

        عدد الطلبات الناجحة والفاشلة.

        متوسط زمن الاستجابة.

        عدد مرات إعادة المحاولة.

    التنبيهات: يتم إرسال تنبيه (عبر البريد الإلكتروني و/أو Telegram) في حال تجاوز نسبة الفشل 5% في الساعة الواحدة.