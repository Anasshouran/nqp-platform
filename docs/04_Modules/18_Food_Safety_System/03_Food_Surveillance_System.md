# 🛡️ Food Surveillance System — نظام الترصد الغذائي القومي

> **ملاحظة معمارية:** نظام مستقل عن **Food Safety System**. في المعمارية النهائية يكون **طبقة استخبارات وتحليل ورصد** فوق الأنظمة التشغيلية، وليس نسخة أخرى من نظام رقابة الأغذية.
>
> * **Food Safety System** يدير العمليات اليومية (الطلبات، التفتيش، العينات، المختبرات، الشهادات).
> * **Food Surveillance System** يحلل البيانات الواردة من جميع المصادر لاكتشاف المخاطر والاتجاهات وإدارة الإنذارات.

## 🎯 الهدف

> **تحويل بيانات الأغذية من مجرد معاملات ونتائج وفحوصات إلى معلومات استخباراتية تساعد الإدارة على اكتشاف الخطر مبكرًا واتخاذ القرار.**

```text
                    Food Surveillance System
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Monitoring            Risk Engine          Alert Engine
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    Food Intelligence
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 Incident   Recall   Decision
                    │         │         │
                    └─────────┼─────────┘
                              ▼
                    National Food Safety
```

---

## 🏗️ الهيكل العام

```text
Food Surveillance System
│
├── Food Monitoring
├── Risk Assessment
├── Food Alert Management
├── Food Incident Management
├── Food Recall Management
├── Foodborne Disease Surveillance
├── Trend & Analytics
├── GIS & Hotspot Mapping
├── Reporting & Dashboard
└── Integration Services
```

---

# 1. 🏠 Dashboard — المدير العام للترصد الغذائي

يكون Dashboard مختلفًا عن Dashboard مدير رقابة الأغذية.

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🇸🇩 وزارة الصحة الاتحادية — الحجر الصحي القومي                    │
│ 🛡️ نظام الترصد الغذائي القومي                                     │
│                                                                    │
│ الفترة: [آخر 30 يوم ▼]   جميع القطاعات ▼   🔔 24   👤 المستخدم    │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🚨 التنبيهات │ │ 🦠 الحوادث   │ │ 🔄 الاستدعاء │ │ ⚠️ المخاطر   │
│              │ │              │ │              │ │              │
│     42       │ │     18       │ │      7       │ │     126      │
│ Active       │ │ Active       │ │ Active       │ │ High/Critical│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ 📈 Food Risk Trend                                                 │
│       ╭────╮                                                       │
│  ╭────╯    ╰────╮                                                 │
│──╯              ╰────────                                         │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐ ┌──────────────────────────────────┐
│ 🔴 أعلى المخاطر              │ │ 🗺️ Hotspots                     │
│ Product A       Critical    │ │ Port Sudan       🔴              │
│ Product B       High        │ │ Khartoum         🟠              │
│ Country X       High        │ │ Kassala          🟡              │
└─────────────────────────────┘ └──────────────────────────────────┘
```

---

# 2. 📡 Food Monitoring

مصادر البيانات:

```text
Food Safety System
        │
FCLIS  ──┤
        │
Inspection ─┤
        │
Complaints ─┤
        │
Hospitals ──┤
        │
Markets ────┤
        │
Imports ────┤
        │
Exports ────┤
        │
International Alerts
        │
        ▼
Food Surveillance
```

ويتم إنشاء **Food Observation** لكل معلومة مهمة بدلًا من اعتبار كل معلومة حادثة.

---

# 3. ⚠️ Risk Intelligence

التفريق الجوهري:

### Risk Assessment في Food Safety
يقيّم **الشحنة الحالية**.

### Risk Intelligence في Food Surveillance
يقيّم **الاتجاه العام للخطر**.

```text
5 شحنات
   ↓
نفس المنتج
   ↓
نفس بلد المنشأ
   ↓
3 نتائج غير مطابقة
   ↓
ارتفاع Risk Trend
   ↓
رفع Country/Product Risk Profile
   ↓
Food Alert
```

---

# 4. 🚨 Food Alert Management

### دورة التنبيه

```text
Detection
   ↓
Validation
   ↓
Risk Classification
   ↓
Alert Creation
   ↓
Notification
   ↓
Response
   ↓
Monitoring
   ↓
Closure
```

### حالات التنبيه

```text
DRAFT
UNDER_VALIDATION
ACTIVE
ESCALATED
RESOLVED
CLOSED
CANCELLED
```

### مستويات التنبيه

```text
LOW
MEDIUM
HIGH
CRITICAL
```

ينشأ تنبيه تلقائي عند: نتيجة مختبر غير مطابقة، تكرار مخالفات، تلوث ميكروبي، ارتفاع نسبة سموم، اكتشاف مادة محظورة.

مثال:

```text
Alert No:  ALT-2026-00045
Type:      Food Safety Alert
Severity:  High
Status:    Active
```

---

# 5. 🦠 Food Incident Management

**Alert = إشارة إلى خطر محتمل أو مؤكد.**
**Incident = حدث صحي أو غذائي فعلي يحتاج استجابة.**

```text
LAB RESULT
     ↓
ALERT
     ↓
Food Incident
     ↓
Investigation
     ↓
Affected Product
     ↓
Affected Population
     ↓
Recall
```

يسجل: حالات التسمم الغذائي، الأغذية الملوثة، الشكاوى، البلاغات، الحوادث المرتبطة بالمنافذ.

---

# 6. 🏥 Foodborne Disease Surveillance

يربط **الترصد الغذائي** بالترصد الصحي:

```text
Hospital
   │
   ▼
Foodborne Disease Case
   │
   ▼
Case Cluster Detection
   │
   ▼
Common Food/Product
   │
   ▼
Food Investigation
   │
   ▼
Laboratory
   │
   ▼
Alert / Incident
```

يحتوي: عدد الحالات، الموقع، تاريخ بداية الأعراض، الفئة العمرية إحصائيًا، المنتج المشتبه، مصدر الطعام، نتائج المختبر، حالة التحقيق — مع ضوابط خصوصية صارمة (لا بيانات شخصية غير اللازمة للترصد).

---

# 7. 🔄 Food Recall Intelligence

النظام لا ينفذ السحب الميداني بنفسه، بل **يدير استخبارات ومتابعة السحب**:

```text
Food Incident
      ↓
Recall Recommendation
      ↓
Recall Decision
      ↓
Food Safety System
      ↓
Stop Release / Distribution
      ↓
Market Recall
      ↓
Verification
      ↓
Recall Completion
      ↓
Surveillance Closure
```

### مؤشرات السحب

```text
Products Affected · Lots Affected · Shipments Affected
Sectors Affected · Ports Affected
Estimated Quantity · Recovered Quantity · Recall %
```

---

# 8. 🗺️ GIS & Hotspot

الخريطة القومية:

```text
             🇸🇩 Sudan Food Risk Map

        🔴 Critical   🟠 High   🟡 Medium   🟢 Low

        ● Food Alert    ▲ Food Incident
        ■ Recall        ★ Disease Cluster
```

التنقل: **السودان → الولاية/القطاع → المدينة → المنفذ → الحادث.**

---

# 9. 📊 Analytics

```text
Food Alerts · Food Incidents · Disease Clusters
High-Risk Products · High-Risk Countries · Repeated Violations
Laboratory Non-Conformity · Recall Effectiveness
Response Time · Closure Time
```

مثال:

```text
Top Risk Products
1. Dairy Products     🔴
2. Meat Products      🔴
3. Cereals            🟠
4. Oils               🟠
5. Processed Foods    🟡
```

---

# 10. 🧠 Food Intelligence Center

أهم إضافة مقترحة:

```text
                 FOOD INTELLIGENCE CENTER
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
 Historical Data       Real-Time Data       External Alerts
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                     Analytics Engine
                            │
                    ┌───────┼────────┐
                    ▼       ▼        ▼
                  Trend    Risk    Prediction
                    │       │        │
                    └───────┼────────┘
                            ▼
                    Decision Support
```

يقدم **توصيات آلية** (وليست قرارات إدارية تلقائية)، مثل:

> «ارتفاع مخاطر منتج معين خلال آخر 90 يومًا؛ يوصى برفع مستوى الرقابة وأخذ عينات إضافية.»

---

# 11. 🔌 التكاملات

```text
                 Food Surveillance
                        │
 ┌──────────────────────┼─────────────────────────┐
 ▼                      ▼                         ▼
Food Safety            FCLIS                  Disease Surveillance
Shipments              Results                 Cases
Inspection             Tests                   Clusters
Sampling               Reports                 Outbreaks
Certificates
```

جهات خارجية: الجمارك، المواصفات والمقاييس، الصحة، الزراعة، الثروة الحيوانية، الإدارة العامة للحجر الصحي القومي، وزارة الصحة الاتحادية، ومنظمة الصحة العالمية (تبادل التنبيهات الدولية عند الحاجة).

سير العمل الكلي:

```text
Food Safety System → Laboratory Information System → Food Surveillance System
        │                      │                           │
Risk Engine · Alert Engine · Analytics → Decision Support → Recall / Notification
```

---

# 12. 🗃️ قاعدة البيانات الأساسية

```text
FoodAlert · FoodIncident · FoodRecall · FoodRiskProfile
FoodObservation · FoodMonitoringEvent
FoodDiseaseCase · FoodDiseaseCluster · FoodHotspot
FoodTrend · FoodRiskFactor · FoodRiskAssessment
FoodAlertSource · FoodIncidentInvestigation
RecallAction · RecallVerification
SurveillanceNotification · SurveillanceReport
```

الجداول التأسيسية:

| الجدول | الحقول |
|---|---|
| FoodAlert | Alert ID, Alert Type, Severity, Product, Country, Status, Created Date |
| FoodIncident | Incident ID, Incident Type, Location, Affected Persons, Status |
| FoodRecall | Recall ID, Product, Manufacturer, Reason, Recall Date, Status |
| FoodRiskProfile | Country, Product, Risk Score, Inspection Frequency, Last Updated |

---

# 13. 👥 المستخدمون

```text
FOOD_SURVEILLANCE_DIRECTOR · FOOD_SURVEILLANCE_OFFICER
FOOD_RISK_ANALYST · FOOD_DATA_ANALYST
FOOD_ALERT_OFFICER · FOOD_INCIDENT_OFFICER · FOOD_RECALL_OFFICER
EPIDEMIOLOGIST · PUBLIC_HEALTH_OFFICER · LAB_SPECIALIST
FOOD_INSPECTOR · FOOD_GENERAL_DIRECTOR · QUARANTINE_DIRECTOR
SYSTEM_ADMIN · AUDITOR
```

# 14. 🛡️ الصلاحيات

| Permission | المسؤول |
|---|---|
| `surveillance_view` | حسب النطاق |
| `alert_create` | Alert Officer |
| `alert_validate` | مدير الترصد |
| `incident_create` | Incident Officer |
| `incident_investigate` | فريق التحقيق |
| `risk_assessment_run` | Risk Analyst |
| `risk_profile_update` | مدير الترصد |
| `recall_recommend` | مدير الترصد |
| `recall_manage` | الجهة المختصة |
| `surveillance_report_create` | Data Analyst |
| `surveillance_report_approve` | المدير |
| `hotspot_manage` | Risk/GIS Analyst |

---

# 15. 🏛️ مكان النظام في NQP

```text
National Quarantine Platform
├── 01. Core Quarantine System
├── 02. Traveler Health System
├── 03. Airport Health System
├── 04. Port Health System
├── 05. Food Safety System
├── 06. Food Control Laboratory System
├── 07. Food Surveillance System   ← هذا النظام
├── 08. Disease Surveillance System
├── 09. Vector Control System
├── 10. Emergency & Outbreak Management
├── 11–14. Planning / Finance / HR / Stores
├── 15. Reporting & BI
└── 16. Administration & Security
```

## 🔄 العلاقة بين الأنظمة الثلاثة

```text
                 🍎 Food Safety System
                         │ Operational Data
                         ▼
              🧪 Food Laboratory
                         │ Test Results
                         ▼
              🛡️ Food Surveillance
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      Risk             Alerts          Trends
        └────────────────┼────────────────┘
                         ▼
                Food Intelligence → Decision Support
            ┌────────────┴────────────┐
            ▼                         ▼
      Food Safety Action      Management / Leadership
```

**الخلاصة:**
**Food Safety System = تنفيذ الرقابة · FCLIS = إنتاج نتائج التحليل · Food Surveillance = فهم المخاطر والإنذار المبكر · Reporting & BI = عرض المؤشرات للإدارة**

---

## ⚙️ حالة التنفيذ مقابل المنصة القائمة (NQP)

**النطاق الحقيقي في الكود:** `backend/apps/food_surveillance` + صفحة `/app/food-surveillance` + دور `FOOD_SURVEILLANCE_MANAGER`.

| مكون الوثيقة | الحالة | التنفيذ الفعلي |
|---|---|---|
| Food Alerts (دورة حياة كاملة) | ✅ مطبَّق | `FoodAlert` بحالات DRAFT/ACTIVE/RESOLVED/CLOSED/… + أسباب (نتيجة مخبرية، تلوث، مادة محظورة…) + إجراءات `action` / `close` على الـ ViewSet |
| Risk Assessment | ✅ جزئي | `RiskAssessment` بأنواع تقييم ومستويات LOW→CRITICAL — يقيّم حالات محددة؛ لا **Trend** تراكمي بعد |
| Recall Management | ✅ جزئي | `FoodRecall` بحالات وإغلاق عبر `close` — لا مؤشرات استرجاع % ولا تحقق سوقي |
| Non-Conformity + Corrective Action | ✅ مطبَّق | `NonConformity` (تقدم بـ `advance`) + `CorrectiveAction` (إكمال بـ `complete`) |
| Establishments | ✅ مطبَّق | `FoodEstablishment` (أسواق/مصانع/مستودعات) بأنواع وحالات |
| Surveillance Dashboard | ✅ مطبَّق | `SurveillanceDashboardViewSet` بمؤشرات مجمعة + صفحة `/app/food-surveillance` |
| Food Observation / Monitoring Events | ❌ مؤجل | لا نماذج — كل معلومة تدخل مباشرة كتنبيه أو مخالفة |
| Food Incidents + Investigation | ❌ مؤجل | نموذج Incident مستقل عن Alert غير موجود |
| Foodborne Disease Cases & Clusters | ❌ مؤجل | يتطلب ربطًا بالترصد الوبائي (`screening`/`surveillance`) |
| GIS & Hotspots | ❌ مؤجل | لا حقول إحداثيات ولا طبقة خريطة |
| Intelligence Center (توصيات آلية) | ❌ مؤجل | يعتمد على Trend + Prediction — فوق طبقة البيانات الحالية |
| الأدوار الدقيقة (15 دورًا) | ⚠️ جزئي | `FOOD_SURVEILLANCE_MANAGER` فقط مبذور؛ البقية عند بناء الصلاحيات التفصيلية |
| مصفوفة الصلاحيات (12 permission) | ❌ مؤجل | تُضاف إلى `seed_rbac` عند تفعيل الأدوار الدقيقة |

**قاعدة معمارية معتمدة:** الترصد الغذائي **لا ينفّذ** التفتيش أو التحليل أو السحب الميداني — يقرأ من أنظمة التشغيل ويُخرج تنبيهات وتوصيات واتجاهات.
