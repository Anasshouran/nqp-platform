# 🚧 Land Border Health System — نظام إدارة المعابر البرية

> نظام متخصص لإدارة جميع إجراءات **الحجر الصحي والصحة العامة** في المعابر الحدودية البرية بين السودان والدول المجاورة، لحماية البلاد من انتقال الأمراض وضمان سلامة المسافرين والبضائع ووسائل النقل وفق اللوائح الوطنية واللوائح الصحية الدولية **(IHR 2005)**.
>
> يُعتمد كنظام مستقل داخل NQP مع طبقة **Border Health Command Center** للإدارة القومية: لكل معبر تشغيله المحلي مع رؤية مركزية على مستوى السودان.

## 🎯 أهداف النظام

* إدارة حركة المسافرين عبر المعابر البرية.
* التفتيش الصحي على المركبات والبضائع.
* منع دخول الأمراض المعدية.
* إدارة الحجر الصحي والعزل.
* دعم الترصد الوبائي في المنافذ البرية.
* التكامل مع الجهات الحكومية ذات العلاقة.

## 🏛️ المعمارية

```text
                 National Quarantine Platform
                           │
                Land Border Health System
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 Border Operations    Health Surveillance   Cargo Control
       │                   │                   │
       ▼                   ▼                   ▼
 Travelers             Disease              Food Safety
 Vehicles              Cases                Cargo
 Inspections           Contacts             Samples
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                  Decision & Clearance
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Cleared        Hold          Referred
```

## 🚧 مكونات النظام

```text
Land Border Health System
│
├── Border Crossing Management
├── Traveler Health Screening
├── Vehicle Health Inspection
├── Cargo & Food Inspection
├── Health Declaration Management
├── Vaccination Verification
├── Isolation & Quarantine Management
├── Disease Surveillance
├── Contact Tracing
├── Public Health Emergency
├── Inspection Management
├── Certificate Management
├── Reporting & Dashboard
└── Integration Services
```

---

# 1. 🖥️ لوحة القيادة القومية — Border Health Command Center

```text
┌───────────────────────────────────────────────────────────────┐
│ 🇸🇩 الحجر الصحي القومي                                        │
│ 🚧 مركز قيادة المعابر البرية                                  │
│ جميع القطاعات ▼     جميع المعابر ▼     اليوم ▼      🔔 24    │
├───────────────────────────────────────────────────────────────┤
│ 👥 المسافرون       🚍 المركبات       📦 الشحنات       🚨 الحالات│
│   18,420             4,860             1,284             37   │
├───────────────────────────────────────────────────────────────┤
│ 🟢 المعابر العاملة       🟠 تحت المراقبة       🔴 التنبيهات    │
│       12                       2                     5         │
├──────────────────────────┬────────────────────────────────────┤
│ 🗺️ خريطة المعابر          │ ⚠️ أعلى المخاطر                    │
│ أرقين       🟢           │ مرض معدٍ       🔴                  │
│ أشكيت       🟢           │ شحنة غذائية    🟠                  │
│ القلابات     🟠           │ مركبة          🟡                  │
│ اللفة        🟢           │                                    │
└──────────────────────────┴────────────────────────────────────┘
```

---

# 2. 🚧 Border Crossing Management

لكل معبر **ملف تشغيلي مستقل**:

```text
Border ID · Border Name · Border Type · Neighbor Country · State
Location · Coordinates · Operating Status · Working Hours · Capacity
Contact Information · Health Facility · Laboratory
Quarantine Facility · Isolation Facility
```

### حالة المعبر

```text
🟢 OPEN   🟡 RESTRICTED   🟠 LIMITED   🔴 CLOSED   ⚫ EMERGENCY
```

---

# 3. 👥 Traveler Health Screening

```text
Traveler → Registration → Document Verification → Health Declaration
        → Risk Screening
              ├─ Low Risk  → Clearance
              └─ High Risk → Medical Assessment → Release / Isolation
```

بيانات الفحص: رقم المسافر، وثيقة السفر، الجنسية، المعبر، اتجاه الحركة، بلد المغادرة، الدول الزارة، الأعراض، العلامات الحيوية عند الحاجة، مستوى الخطورة، القرار.

---

# 4. 🚍 Vehicle Health Inspection

**Vehicle Health Record** لكل مركبة تحتاج فحصًا.

الفحص يشمل: Cleanliness · Pest Control · Waste Management · Water · Sanitation · Food Refrigeration · Cargo Condition · Health Certificate

أنواع المركبات:

```text
BUS · TRUCK · PRIVATE_CAR · AMBULANCE
LIVESTOCK_TRANSPORT · FOOD_TRANSPORT · OTHER
```

---

# 5. 📦 Cargo & Food Inspection — دون تكرار النظام الغذائي

```text
Land Border Health → Cargo Inspection
        ├── Food            → Food Safety System (مرجع المعاملة)
        ├── Animal Products → Veterinary / Relevant System
        └── Other Cargo     → داخلي
```

إذا كانت الشحنة غذائية يرسل النظام **مرجع المعاملة** إلى Food Safety System ثم يستقبل:

```text
Inspection Status · Sampling Status · Laboratory Status
Risk Level · Decision · Certificate
```

---

# 6. 🧪 Laboratory Integration

```text
Border Inspection → Sample Created → Barcode/QR → Laboratory
→ Analysis → Result → Border Decision
```

نتيجة المختبر **غير قابلة للتعديل من مستخدم المعبر**.

---

# 7. 🦠 Disease Surveillance & Contact Tracing

```text
Traveler Screening → Suspected Case → Disease Surveillance System
                                     ├── Case   ├── Contact
                                     ├── Cluster └── Alert
```

تتبع المخالطين:

```text
Case → Vehicle · Driver · Passengers · Border · Travel Route
     → Potential Contacts → Notification → Follow-up
```

---

# 8. 🏥 Isolation & Quarantine — Quarantine Case Management

كيان مستقل:

```text
Quarantine Case
├── Case Number · Person · Reason
├── Start Date · Expected End Date
├── Facility · Responsible Officer
├── Monitoring · Laboratory Tests · Final Decision
```

الحالات:

```text
PENDING · UNDER_ASSESSMENT · ISOLATED · QUARANTINED
REFERRED · RELEASED · CLOSED
```

سير العزل:

```text
Traveler Screening → Suspected Case → Medical Assessment
    ┌──────────┴──────────┐
    ▼                     ▼
Isolation           Entry Clearance
```

---

# 9. 🚨 Public Health Emergency

```text
Incident Detected → Emergency Assessment → Classification
→ Response Team (Medical/Lab/Epi/Border Ops) → Response → Closure
```

مع ربط المعبر مباشرة بـ **Emergency & Outbreak Management** وإمكانية إغلاق أو تقييد حركة المعبر.

---

# 10. 📜 Certificate Management

```text
Certificate Number · QR Code · Verification Number
Issue Date · Expiry Date · Issuing Officer · Border
Person / Vehicle / Cargo · Digital Signature · Status
```

الحالات:

```text
DRAFT · ISSUED · ACTIVE · EXPIRED · REVOKED · CANCELLED
```

---

# 11. 🗺️ Border GIS

لكل معبر: Latitude · Longitude · Border Zone · Health Facility · Quarantine Facility · Isolation Facility · Laboratory · Ambulance

الخريطة القومية:

```text
🟢 Normal   🟡 Increased Surveillance   🟠 Health Alert
🔴 Emergency   ⚫ Closed
```

---

# 12. 📊 التقارير

### تشغيلية
حركة المسافرين، المركبات، الشحنات، التفتيش، العينات، نتائج المختبر، الحالات المشتبهة، العزل، الحجر، المخالفات.

### للإدارة القومية
أداء كل معبر، مقارنة المعابر، متوسط زمن المعاملة، الحالات الصحية، أكثر المعابر خطورة، اتجاهات الأمراض، مؤشرات الاستجابة.

---

# 13. 👥 المستخدمون والصلاحيات

| الدور | النطاق |
|---|---|
| `BORDER_SYSTEM_ADMIN` | المعبر |
| `BORDER_STATION_MANAGER` | المعبر |
| `BORDER_HEALTH_OFFICER` | المعبر |
| `QUARANTINE_DOCTOR` | المعبر |
| `QUARANTINE_INSPECTOR` | المعبر |
| `FOOD_INSPECTOR` | المعبر |
| `ENVIRONMENTAL_HEALTH_INSPECTOR` | المعبر |
| `TRAVELER_REGISTRATION_OFFICER` | المعبر |
| `LAB_TECHNICIAN` | المختبر |
| `EPIDEMIOLOGY_OFFICER` | القطاع |
| `EMERGENCY_OFFICER` | القطاع/القومي |
| `CUSTOMS_OFFICER` / `IMMIGRATION_OFFICER` | قراءة/تكامل |
| `BORDER_DIRECTOR` | المعبر/القطاع |
| `QUARANTINE_SECTOR_DIRECTOR` | القطاع |
| `NATIONAL_QUARANTINE_DIRECTOR` | قومي |
| `SYSTEM_ADMIN` | المنصة القومية |

الصلاحيات:

```text
border_traveler_register · border_health_screen · border_vehicle_inspect
border_cargo_inspect · border_sample_create · border_sample_send
border_case_create · border_quarantine_manage · border_isolation_manage
border_contact_trace · border_emergency_manage · border_certificate_issue
border_report_view · border_dashboard_view
```

---

# 14. 🗃️ قاعدة البيانات

```text
BorderCrossing · BorderFacility · BorderShift · BorderStaff
TravelerHealthRecord · HealthDeclaration · TravelerScreening
Vehicle · VehicleInspection · CargoInspection · BorderSample
QuarantineCase · IsolationCase · ContactTracingCase · Contact
BorderHealthIncident · BorderEmergency · HealthCertificate
BorderDecision · BorderNotification · BorderDailyStatistics
```

---

# 15. 🔄 سير العمل الكامل

```text
                 Traveler / Vehicle / Cargo
                           │
                    Border Registration → Health Screening
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Traveler       Vehicle        Cargo
       Medical Screening Health Inspect    │
             │                        Food Safety
             └─────────────┬─────────────┘
                           ▼
                      Risk Assessment
                  ┌────────┼────────┐
                  ▼        ▼        ▼
                CLEAR    HOLD     REFER
                           │
                 Laboratory · Isolation · Quarantine
                           ▼
                        Decision
                    ┌──────┴──────┐
                    ▼             ▼
              Entry Clearance   Referral / Enforcement
```

---

# 16. 🌐 التكامل

داخلي: Traveler Health · Food Safety · FCLIS · Disease Surveillance · Certificates · Finance (الرسوم) — عبر **NQP Integration/API Gateway** دون تكرار وظائف الأنظمة المتخصصة.

خارجي: الجوازات والهجرة، الجمارك، المواصفات والمقاييس، الزراعة، الثروة الحيوانية، وزارة الصحة الاتحادية، الإدارة العامة للحجر الصحي القومي.

---

# 17. 🇸🇩 المعابر — Reference Data لا كود

لا تُثبَّت أسماء المعابر في الكود؛ تُدار كبيانات مرجعية يمكن للإدارة إضافتها أو إيقافها:

| المعبر | الدولة المجاورة | الولاية |
|---|---|---|
| أرقين | مصر | الشمالية |
| وادي حلفا | مصر | الشمالية |
| المثلث | مصر | الشمالية |
| القلابات | إثيوبيا | القضارف |
| أدري | تشاد | غرب دارفور |
| تينة | تشاد | غرب دارفور |
| الحدود مع إريتريا | إريتريا | كسلا |
| الحدود مع جنوب السودان | جنوب السودان | النيل الأزرق |

لكل معبر: مدير محطة + أطباء + مفتشون + موظفو تسجيل + مفتشو أغذية + صحة بيئة + مستخدمو مختبر حسب حجمه.

## 🏛️ مستويات الإدارة الثلاثة

```text
                 مدير الحجر الصحي القومي
                         │
              Border Command Center
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      مدير القطاع     مدير القطاع     مدير القطاع
          │
          ▼
      مدير محطة المعبر
          │
    ┌─────┼─────┬─────┐
    ▼     ▼     ▼     ▼
   طبيب  مفتش  كاتب  مختبر
```

---

## ⚙️ حالة التنفيذ مقابل المنصة القائمة (NQP)

| مكون الوثيقة | الحالة | التنفيذ الفعلي |
|---|---|---|
| المعابر البرية كمرجعيات | ✅ مطبَّق | `masterdata.EntryPoint` بنوع `LAND_PORT` — **8 معابر مبذورة فعليًا**: أرقين، وادي حلفا، المثلث، القلابات، أدري، تينة، حدود إريتريا، حدود جنوب السودان + نموذج `Port` بنوع `LAND_PORT` |
| فحص المسافرين | ✅ مطبَّق (عبر أنظمة مشتركة) | `travelers` + `screening.HealthScreening` مرتبط بـ Port — يعمل على أي منفذ بمن فيهم البري؛ الإقرار الصحي من Traveler Health System |
| تفتيش الأغذية البرية | ✅ مطبَّق (تكامل) | شحنات `food_quarantine` تدعم المنافذ البرية (`LAND_PORT` في الاختبارات والبذور) — دون تكرار النظام الغذائي كما تشترط الوثيقة |
| العزل والإحالة | ✅ جزئي | إحالات العيادة عبر `clinic.ClinicReferral` — لا كيان QuarantineCase مستقل بحالاته السبع |
| هيكل القطاعات/المحطات | ✅ مطبَّق | `seed_organization`: قطاعات ومحطات ومواقع وظيفية تغطي المنافذ البرية |
| Border Health Command Center | ❌ مؤجل | لا لوحة قومية مخصصة للمعابر البرية (لوحات القيادة القائمة للأغذية والمطار) |
| Vehicle Inspection | ❌ مؤجل | لا نموذج Vehicle/VehicleInspection |
| Quarantine/Isolation Cases | ❌ مؤجل | يتطلب نماذج QuarantineCase/IsolationCase |
| Contact Tracing | ❌ مؤجل | لا نماذج تتبع مخالطين على مستوى المعبر |
| شهادات المعابر (QR) | ⚠️ جزئي | شهادات FCER الغذائية موجودة بتحقق؛ شهادات عبور المسافرين عبر مسار الشهادات العام |
| GIS وإحداثيات المعابر | ❌ مؤجل | EntryPoint فيه location نصي فقط — لا lat/long |
| أدوار BORDER_* الدقيقة | ❌ مؤجل | تعمل حاليًا أدوار عامة (PORT_OFFICER وغيرها) عبر ScopeType على المحطة |

**قاعدة معمارية:** المعبر البري **مستهلك لأنظمة** Traveler/Food/Lab المشتركة، وليس نظامًا مكررًا — الناقص هو كيانات المركبات والحجر والتتبع المخالطين ولوحة القيادة القومية.
