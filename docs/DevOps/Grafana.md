
---

### 📄 6. `Grafana.md` (لوحات المعلومات)

```markdown
# لوحات المعلومات (Grafana) - NQP

## 1. نظرة عامة
يتم استخدام **Grafana** لعرض المقاييس المجمعة من Prometheus على لوحات معلومات (Dashboards) تفاعلية. توفر Grafana رؤية شاملة لأداء المنصة، واكتشاف المشكلات مبكراً، ودعم اتخاذ القرارات التشغيلية.

## 2. لوحات المعلومات الأساسية (Dashboards)

| اسم اللوحة | الوصف | المصادر |
| :--- | :--- | :--- |
| **API Performance** | أداء واجهات API (عدد الطلبات، زمن الاستجابة، معدل الخطأ). | Django Metrics |
| **System Health** | استخدام الموارد (CPU، RAM، Disk) للخوادم والحاويات. | Node Exporter, cAdvisor |
| **Database** | أداء قاعدة البيانات (الاتصالات، الاستعلامات، الإشغال). | PostgreSQL Exporter |
| **Redis** | أداء Redis (الاتصالات، الذاكرة، العمليات). | Redis Exporter |
| **Nginx** | أداء Nginx (الطلبات، الاستجابات، الأخطاء). | Nginx Exporter |
| **Celery** | أداء Celery (المهام في الطابور، المنجزة، الفاشلة). | Celery Flower + Prometheus |
| **Business KPIs** | مؤشرات الأعمال (الفحوصات، الحالات، الإشغال). | Django Metrics (Custom) |

## 3. أمثلة على استعلامات Prometheus (PromQL)

### 3.1. متوسط زمن استجابة API
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

3.2. عدد الطلبات الفاشلة (5xx)
promql

sum(rate(http_requests_total{status=~"5.."}[5m])) by (path)

3.3. استخدام CPU للـ Backend
promql

sum(rate(container_cpu_usage_seconds_total{namespace="nqp", pod=~"backend-.*"}[5m])) by (pod)

3.4. عدد الاتصالات بقاعدة البيانات
promql

postgresql_connections{datname="nqp_db"}

4. إعدادات التنبيهات (Alerts)
التنبيه	الشرط	الإجراء
زمن استجابة API > 2s	متوسط 5 دقائق > 2s	إرسال إشعار (Telegram/Slack).
استخدام CPU > 80%	لمدة 5 دقائق	إرسال إشعار (Telegram/Slack).
عدد المهام في Celery > 100	في أي لحظة	إرسال إشعار (Telegram/Slack).
قاعدة البيانات غير متاحة	فشل الاتصال لمدة دقيقة	إرسال إشعار عاجل (Telegram/Slack + Email).
5. مراجع

    Grafana Documentation: https://grafana.com/docs/

    PromQL Documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

    Grafana Dashboards: https://grafana.com/grafana/dashboards/