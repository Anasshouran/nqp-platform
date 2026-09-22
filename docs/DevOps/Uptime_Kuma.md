
---

### 📄 9. `Uptime_Kuma.md` (مراقبة توفر الخدمات)

```markdown
# مراقبة توفر الخدمات (Uptime Kuma) - NQP

## 1. نظرة عامة
يتم استخدام **Uptime Kuma** لمراقبة توفر الخدمات (Uptime) والحالة (Health) لجميع نقاط نهاية المنصة (API، الموقع، الخدمات الداخلية). يوفر Uptime Kuma تنبيهات فورية في حال انقطاع أي خدمة.

## 2. الخدمات التي يتم مراقبتها

| الخدمة | الهدف | التكرار | المهلة |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `https://api.nqp.gov.sd/api/v1/health/` | 60 ثانية | 10 ثوانٍ |
| **الموقع العام** | `https://nqp.gov.sd/` | 60 ثانية | 10 ثوانٍ |
| **بوابة المسافرين** | `https://nqp.gov.sd/traveler/dashboard` | 60 ثانية | 10 ثوانٍ |
| **بوابة موظفي الحجر** | `https://nqp.gov.sd/port-health/dashboard` | 60 ثانية | 10 ثوانٍ |
| **بوابة العيادات** | `https://nqp.gov.sd/clinic/dashboard` | 60 ثانية | 10 ثوانٍ |
| **بوابة المختبرات** | `https://nqp.gov.sd/laboratory/dashboard` | 60 ثانية | 10 ثوانٍ |
| **بوابة الإدارة** | `https://nqp.gov.sd/federal-admin/dashboard` | 60 ثانية | 10 ثوانٍ |
| **بوابة الطوارئ** | `https://nqp.gov.sd/eoc/dashboard` | 60 ثانية | 10 ثوانٍ |
| **Swagger UI** | `https://api.nqp.gov.sd/api/docs/` | 60 ثانية | 10 ثوانٍ |
| **قاعدة البيانات** | (اختبار اتصال PostgreSQL) | 120 ثانية | 10 ثوانٍ |
| **Redis** | (اختبار اتصال Redis) | 120 ثانية | 10 ثوانٍ |

## 3. إعدادات التنبيهات (Notifications)

| القناة | الاستخدام | الحالة |
| :--- | :--- | :--- |
| **Telegram** | إشعارات فورية للانقطاعات والاستعادة. | ✅ مفعل |
| **Slack** | إشعارات الفريق التقني. | ✅ مفعل |
| **Email** | إشعارات للمسؤولين. | ✅ مفعل |
| **SMS** | إشعارات للمسؤولين (للانقطاعات الحرجة). | ⚠️ اختياري |

## 4. أمثلة على إعدادات التنبيهات في Uptime Kuma

### 4.1. تنبيه انقطاع API Gateway
- **الشرط**: فشل (Ping) لمدة 2 دقيقة.
- **الإجراء**: إرسال (Telegram) و (Slack).

### 4.2. تنبيه انقطاع قاعدة البيانات
- **الشرط**: فشل الاتصال بقاعدة البيانات لمدة 1 دقيقة.
- **الإجراء**: إرسال (Telegram) و (Email) و (SMS).

### 4.3. تنبيه انخفاض الأداء (زمن الاستجابة > 3 ثوانٍ)
- **الشرط**: زمن استجابة > 3 ثوانٍ لمدة 5 دقائق.
- **الإجراء**: إرسال (Telegram) و (Slack).

## 5. مراجع
- **Uptime Kuma**: [https://uptime.kuma.pet/](https://uptime.kuma.pet/)
- **Uptime Kuma Documentation**: [https://github.com/louislam/uptime-kuma/wiki](https://github.com/louislam/uptime-kuma/wiki)

