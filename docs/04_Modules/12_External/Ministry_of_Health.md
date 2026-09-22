
---

### 📄 2. `Ministry_of_Health.md` (وزارة الصحة)

```markdown
# وزارة الصحة - Ministry of Health (MoH)

## 1. الهدف
تمكين وزارة الصحة من استلام التقارير الصحية الوطنية والتنبيهات الفورية من منصة NQP، وإرسال التوجيهات والسياسات الصحية (مثل: تحديث متطلبات الحجر، قوائم الدول الموبوءة) إلى المنصة لتطبيقها تلقائياً.

## 2. نقاط التكامل (Integration Points)

| الاتجاه | البيانات المرسلة | التوقيت | البروتوكول | التنسيق |
| :--- | :--- | :--- | :--- | :--- |
| **من NQP → MoH** | التقارير اليومية/الأسبوعية (الفحوصات، الحالات، الإشغال). | يومي/أسبوعي | REST API | JSON |
| **من NQP → MoH** | التنبيهات الفورية (حالات PHEIC، تفشي في منفذ). | فوري (عند الحدث) | Webhook / REST | JSON |
| **من NQP → MoH** | تقارير الأداء (مؤشرات الأداء الرئيسية KPIs). | شهري | REST API | JSON |
| **من MoH → NQP** | تحديث تعريفات الأمراض والبروتوكولات. | عند التحديث | REST API | JSON |
| **من MoH → NQP** | تحديث قوائم الدول الموبوءة ومتطلبات الحجر. | عند التحديث | REST API | JSON |
| **من MoH → NQP** | أوامر تعليق/استئناف الرحلات من دول معينة. | عند الطوارئ | REST API | JSON |

## 3. تدفق البيانات (Data Flow)

```mermaid
sequenceDiagram
    participant NQP
    participant MoH_API as MoH API Gateway
    participant MoH_DB as MoH Database
    participant MoH_Team as فريق وزارة الصحة

    loop كل يوم (الساعة 6 صباحاً)
        NQP->>MoH_API: إرسال التقرير اليومي (JSON)
        MoH_API->>MoH_DB: تخزين التقرير
        MoH_API-->>NQP: تأكيد الاستلام
    end

    alt حالة طوارئ
        NQP->>MoH_API: إرسال تنبيه PHEIC (فوري)
        MoH_API->>MoH_Team: إشعار (SMS + بريد إلكتروني)
        MoH_Team-->>MoH_API: اتخاذ قرار
        MoH_API->>NQP: إرسال تحديث السياسات
    end

4. نموذج التقرير اليومي (Daily Report JSON)
json

{
  "report_date": "2024-07-25",
  "total_screenings": 1540,
  "positive_cases": 12,
  "occupancy_rate": 68.5,
  "ports": [
    {
      "port_code": "KRT",
      "name": "مطار الخرطوم",
      "screenings": 850,
      "positive": 8
    },
    {
      "port_code": "PSD",
      "name": "ميناء بورتسودان",
      "screenings": 320,
      "positive": 2
    }
  ]
}

5. الأمان

    المصادقة: مفتاح API (X-API-Key) يتم توفيره لوزارة الصحة.

    التشفير: TLS 1.3 لجميع الاتصالات.

    التحقق من صحة البيانات: يتم التحقق من صحة التوقيع الرقمي في التقارير الصادرة من NQP.

    سجل التدقيق: تسجيل كل عملية تبادل في جدول external_integration_logs.

6. نقاط النهاية (API Endpoints)
الطريقة	المسار	الوصف
POST	/api/v1/integration/moh/reports	استقبال التقارير من NQP (تستخدمه MoH).
POST	/api/v1/integration/moh/alerts	استقبال التنبيهات الفورية.
POST	/api/v1/integration/moh/policies	(تُستخدم من MoH لإرسال التحديثات).