
---

### 📄 7. `Monitoring/Monitoring.md` (المراقبة والأداء)

```markdown
# Monitoring - المراقبة والأداء (Monitoring & Performance)

## 1. الهدف
ضمان صحة وأداء منصة NQP من خلال مراقبة مستمرة لجميع المكونات (API Gateway، الخدمات الخلفية، قاعدة البيانات، طابور الرسائل، المهام الخلفية)، مع توفير تنبيهات فورية في حال حدوث أي خلل أو انخفاض في الأداء.

## 2. الأدوات المستخدمة (Tools)

| الأداة | الاستخدام | طريقة التنفيذ |
| :--- | :--- | :--- |
| **Prometheus** | جمع المقاييس (Metrics) من جميع الخدمات. | تشغيل (Prometheus Server) وجلب البيانات من (Django Prometheus Exporter). |
| **Grafana** | عرض المقاييس على لوحات معلومات (Dashboards) تفاعلية. | ربط (Grafana) بـ (Prometheus) كـ (Data Source). |
| **Uptime Kuma** | مراقبة توفر الخدمات (Ping/HTTPS). | تشغيل (Uptime Kuma) ومراقبة نقاط نهاية الـ API. |
| **Sentry** | مراقبة الأخطاء (Exceptions) في التطبيقات (Backend و Frontend). | دمج (Sentry SDK) مع Django و React. |
| **Celery Flower** | مراقبة طابور الرسائل (المهام قيد التنفيذ، المكتملة، الفاشلة). | تشغيل (Celery Flower) وربطه بـ (Celery Broker). |

## 3. المقاييس الأساسية (Key Metrics)

| الفئة (Category) | المقياس (Metric) | أداة المراقبة |
| :--- | :--- | :--- |
| **API Gateway** | عدد الطلبات في الدقيقة، متوسط وقت الاستجابة، نسبة الطلبات الفاشلة (5xx). | Prometheus (django_prometheus) |
| **الخدمات الخلفية** | استخدام CPU، استخدام الذاكرة، عدد الاتصالات بقاعدة البيانات. | Prometheus (node_exporter) |
| **قاعدة البيانات** | عدد الاستعلامات في الثانية، وقت تنفيذ الاستعلامات، حجم قاعدة البيانات. | Prometheus (postgres_exporter) |
| **طابور الرسائل** | عدد المهام في الطابور (Queue Length)، متوسط وقت المعالجة، نسبة المهام الفاشلة. | Celery Flower + Prometheus |
| **التوفر (Uptime)** | حالة الخدمات (نشط/غير نشط). | Uptime Kuma |

## 4. التنبيهات (Alerts)

| التنبيه | الشرط | الإجراء التلقائي |
| :--- | :--- | :--- |
| **API Gateway غير متاح** | فشل (Ping) لمدة 2 دقيقة | إرسال إشعار (Telegram/Slack) إلى فريق DevOps. |
| **نسبة الطلبات الفاشلة > 5%** | في آخر 5 دقائق | إرسال إشعار (Telegram/Slack) إلى فريق DevOps. |
| **عدد المهام في الطابور > 100** | في أي لحظة | إرسال إشعار (Telegram/Slack) إلى فريق DevOps وإضافة (Celery Workers) إضافية تلقائياً. |
| **قاعدة البيانات قريبة من السعة** | استخدام القرص > 80% | إرسال إشعار (Telegram/Slack) إلى فريق DevOps وتنظيف السجلات القديمة. |
| **متوسط وقت استجابة API > 2 ثانية** | في آخر 5 دقائق | إرسال إشعار (Telegram/Slack) إلى فريق DevOps. |

## 5. تكامل Django مع Prometheus
```python
# nqp_backend/settings.py
INSTALLED_APPS = [
    ...
    'django_prometheus',
    ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# nqp_backend/urls.py
urlpatterns = [
    path('', include('django_prometheus.urls')),  # /metrics endpoint
    ...
]

6. لوحات Grafana (Dashboards)

    Dashboard 1: API Performance: يوضح (عدد الطلبات، وقت الاستجابة، كود حالة الطلبات).

    Dashboard 2: System Health: يوضح (استخدام CPU، الذاكرة، القرص).

    Dashboard 3: Database: يوضح (عدد الاتصالات، وقت الاستعلامات، حجم قاعدة البيانات).

    Dashboard 4: Celery: يوضح (عدد المهام في الطابور، متوسط وقت المعالجة، المهام الفاشلة).

    Dashboard 5: Business KPIs: يوضح (عدد الفحوصات، الحالات الإيجابية، الإحالات) - يغذي بيانات (لوحة الإدارة الاتحادية - 8).

7. مراقبة الأخطاء (Error Monitoring - Sentry)

    Sentry: يجمع جميع الاستثناءات (Exceptions) التي تحدث في Django و React.

    التنبيهات: إرسال إشعار (عبر البريد الإلكتروني و Telegram) عند ظهور خطأ جديد غير متوقع.

    تحديد الأولوية: يتم تصنيف الأخطاء حسب (التكرار) و (التأثير) لتحديد الأولويات في الإصلاح.