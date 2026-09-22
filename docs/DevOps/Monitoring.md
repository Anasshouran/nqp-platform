
---

### 📄 7. `Monitoring.md` (استراتيجية المراقبة الشاملة)

```markdown
# استراتيجية المراقبة الشاملة (Monitoring Strategy) - NQP

## 1. الهدف
ضمان صحة وأداء منصة NQP من خلال مراقبة مستمرة لجميع المكونات (API Gateway، الخدمات الخلفية، قاعدة البيانات، طابور الرسائل، المهام الخلفية)، مع توفير تنبيهات فورية في حال حدوث أي خلل أو انخفاض في الأداء.

## 2. مكونات المراقبة

| المكون | الأداة | الغرض |
| :--- | :--- | :--- |
| **جمع المقاييس** | Prometheus | جمع بيانات الأداء (CPU، RAM، الطلبات، الأخطاء). |
| **عرض المقاييس** | Grafana | لوحات معلومات تفاعلية. |
| **مراقبة الأخطاء** | Sentry | جمع الاستثناءات (Exceptions) في Django و React. |
| **مراقبة التوفر** | Uptime Kuma | مراقبة توفر الخدمات (Ping/HTTPS). |
| **مراقبة السجلات** | ELK Stack | جمع وتحليل سجلات (Logs). |
| **مراقبة Celery** | Celery Flower | مراقبة المهام الخلفية. |

## 3. المقاييس الرئيسية (Key Metrics)

| الفئة | المقياس | الأداة | الهدف |
| :--- | :--- | :--- | :--- |
| **API Gateway** | عدد الطلبات في الدقيقة | Prometheus | < 10,000/min |
| **API Gateway** | متوسط زمن الاستجابة | Prometheus | < 200ms |
| **API Gateway** | نسبة الطلبات الفاشلة (5xx) | Prometheus | < 1% |
| **Backend** | استخدام CPU | Prometheus | < 70% |
| **Backend** | استخدام الذاكرة | Prometheus | < 80% |
| **Database** | عدد الاتصالات | Prometheus | < 100 |
| **Database** | وقت الاستعلام (Query Time) | Prometheus | < 100ms |
| **Redis** | استخدام الذاكرة | Prometheus | < 70% |
| **Celery** | عدد المهام في الطابور | Celery Flower | < 100 |
| **Celery** | نسبة المهام الفاشلة | Celery Flower | < 5% |
| **الأخطاء** | عدد الأخطاء في اليوم | Sentry | < 10 (Critical) |

## 4. التنبيهات (Alerts)

| التنبيه | الشرط | القناة | الأولوية |
| :--- | :--- | :--- | :--- |
| **API Gateway غير متاح** | فشل Ping لمدة 2 دقيقة | Telegram, Email | عالية |
| **نسبة الطلبات الفاشلة > 5%** | في آخر 5 دقائق | Telegram, Slack | عالية |
| **عدد المهام في الطابور > 100** | في أي لحظة | Telegram, Slack | متوسطة |
| **استخدام CPU > 80%** | لمدة 5 دقائق | Telegram, Slack | متوسطة |
| **قاعدة البيانات غير متاحة** | فشل الاتصال لمدة دقيقة | Telegram, Email, SMS | عالية جداً |
| **خطأ Critical جديد** | ظهور خطأ جديد في Sentry | Telegram, Slack | عالية |

## 5. مراجع
- **Prometheus**: [https://prometheus.io/](https://prometheus.io/)
- **Grafana**: [https://grafana.com/](https://grafana.com/)
- **Sentry**: [https://sentry.io/](https://sentry.io/)
- **Uptime Kuma**: [https://uptime.kuma.pet/](https://uptime.kuma.pet/)
- **ELK Stack**: [https://www.elastic.co/what-is/elk-stack](https://www.elastic.co/what-is/elk-stack)
- **Celery Flower**: [https://github.com/mher/flower](https://github.com/mher/flower)