# 🦟 Vector Control System — نظام مكافحة النواقل

> نظام رئيسي داخل منصة الحجر الصحي القومي (NQP) يعتمد نفس منهجية Food Safety System: **دورة حياة كاملة للعملية** وليس مجرد تسجيل عمليات الرش.
>
> **النموذج النهائي:** Survey → Risk → Plan → Work Order → Treatment → Resource Usage → Follow-up → Effectiveness → Closure
>
> هذا أفضل من تصميمه كنظام «رش ومكافحة» فقط، لأنه يوفر سجلًا تشغيليًا كاملًا لكل نقطة دخول، وكل ناقل، وكل حملة، وكل مادة ومعدة، مع قياس فعالية المكافحة.

## البنية التشغيلية

```text
Vector Control System
│
├── 1. Point of Entry Management   ├── 8. Equipment Management
├── 2. Vector Surveillance         ├── 9. Follow-up & Effectiveness
├── 3. Risk Assessment             ├── 10. Incident Management
├── 4. Control Planning            ├── 11. Laboratory Integration
├── 5. Control Activities          ├── 12. Reporting & Analytics
├── 6. Campaign Management         └── 13. Integration Services
└── 7. Materials Management (Stock Ledger)
```

## 🔄 دورة حياة مكافحة النواقل

```text
                 Point of Entry
                       │
                Vector Survey
                       │
                Risk Assessment
              ┌────────┴────────┐
              ▼                 ▼
             LOW          MEDIUM/HIGH
              │                 │
        Routine Monitoring   Control Plan
                                │
                          Work Order
                                │
                         Control Activity
                   ┌────────────┼────────────┐
                Spraying    Larval Control  Rodent Control
                                │
                         Resource Usage
                                │
                         Follow-up Survey
                         ┌──────┴──────┐
                     Effective      Not Effective
                       Close       Re-treatment
```

---

# 1. Point of Entry Management

كل نقطة دخول كيان رئيسي (مطار / ميناء / معبر بري) ببيانات: Code · Name · Type · Sector · State · Location · GPS · Responsible Officer · Risk Level · Teams · Equipment · Storage · Vector History.

وهذا يسمح بالربط المباشر مع Airport Health وPort Health وLand Border Health — **نقطة الدخول Master Entity مشتركة بين أنظمة NQP**:

```text
Port Sudan International Airport
 ├── Airport Health ├── Vector Control ├── Food Safety
 ├── Surveillance └── Emergency / Incident
```

---

# 2. Vector Surveillance

المسح مستقل عن عملية المكافحة:

```text
Survey: Survey Number · Point of Entry · Survey Area · Date · Team
Vector Type · Breeding Sites · Density · Environmental Conditions
Photos · GPS · Assessment
```

مثال: مطار بورتسودان الدولي ← مسح بعوض ← مواقع تولد: 8 · الكثافة: عالية · الخطورة: HIGH.

---

# 3. Vector Registry — السجل المركزي للنواقل

لا يُدخل اسم الناقل كنص حر في كل عملية:

```text
Vector
├── Mosquito (Aedes · Anopheles · Culex)
├── Rodents · Flies · Cockroaches · Fleas · Ticks · Other
```

---

# 4. Risk Assessment — محرك المخاطر

مرتبط بالمسح والتاريخ السابق:

```text
Risk Engine inputs: Vector Density · Breeding Sites · Vector Type
Environmental Conditions · Previous Surveys · Previous Treatments
Disease Risk · Season · Point of Entry Risk
     ↓ Risk Score
LOW / MEDIUM / HIGH / CRITICAL
     ↓ Priority → Control Plan → Work Order
```

---

# 5. Control Planning + Work Order

الخطة بين تقييم المخاطر والتنفيذ: Target Vector · Target Area · Control Method · Team · Equipment · Materials · Start/End Date · Expected Result.

أمر العمل بعد اعتماد الخطة بحالات:

```text
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → FOLLOW_UP → CLOSED
```

---

# 6. Control Activity

تسجيل النشاط الفعلي: Work Order · Date · Location · Target Vector · Method · Team · Equipment · Material · Quantity Used · Area Covered · Weather · Photos · Result.

---

# 7. إدارة المواد — Stock Ledger

ليس مجرد خانة «كمية»:

```text
Material · Batch Number · Manufacturer · Expiry Date
Opening Balance · Received · Used · Wasted · Adjusted · Current Balance
```

مثال: مبيد A — افتتاحي 100 لتر، وارد 50، مستخدم 30، تالف 2 ← **رصيد 118 لتر**.
ويمنع النظام استخدام مادة منتهية الصلاحية.

# 8. Equipment Management

Equipment ID · Type · Serial · Model · Assigned Team · Location · Status (`AVAILABLE/IN_USE/MAINTENANCE/DAMAGED/RETIRED`) · Last/Next Maintenance · History.

---

# 9. Follow-up & Effectiveness — أهم نقطة

لا يُغلق العمل بمجرد تسجيل «تم الرش»:

```text
Survey → Treatment → Follow-up Survey → Compare → Effectiveness
```

```text
قبل المعالجة: الكثافة HIGH → معالجة → بعدها LOW → خفض 80% → ✅ EFFECTIVE
قبلها HIGH  → معالجة → تبقى HIGH → ❌ NOT EFFECTIVE → خطة مكافحة جديدة
```

---

# 10. Campaign Management

الحملة مجموعة أوامر عمل: Campaign ID · Point of Entry · Target Vector · Objective · Dates · Areas · Teams · Equipment · Materials · Work Orders · Results · Supervisor.

مثال — حملة مكافحة البعوض بمطار بورتسودان:

```text
Areas Covered: 12   Teams: 3   Work Orders: 24
Sites Treated: 48   Materials Used: 120 L   Effectiveness: 87%
```

---

# 11. المستخدمون وسير الصلاحيات

Vector Control Director · Sector Vector Manager · POE Supervisor · Entomology/Surveillance Officer · Inspector · Field Technician · Team Leader · Storekeeper · Equipment Officer · Data Entry · Epi Officer · Lab User · Auditor · System Admin.

```text
Data Entry → Survey Officer → Risk Assessment → Supervisor
→ Control Plan → Team Leader → Field Team
→ Follow-up Officer → Supervisor → Close
```

**فصل المدير/المفتش:** المدير يعتمد المخاطر ويخطط الحملات ويدير المواد؛ المفتش ينشئ المسوحات وينفذ الأنشطة والمتابعة ويطلب صرف المواد فقط (ضمن منفذه).

---

# 12. 🖥️ شاشات مدير مكافحة النواقل

القائمة: الرئيسية · نقاط الدخول (مطارات/موانئ/معابر) · المسح (مسوحات/تقييم مخاطر) · الحملات (نشطة/إنشاء/متابعة) · المواد والمعدات (مخزون/معدات/صيانة) · التقارير · التنبيهات.

**لوحة التحكم:** بطاقات — نقاط الدخول، مسوحات الشهر، حملات مكتملة، أنواع المواد؛ بطاقات الخطورة 🔴حرجة / 🟠مرتفعة / 🟡متوسطة / 🟢منخفضة؛ جدول أحدث المسوحات (نقطة/ناقل/كثافة/خطورة) + الحملات النشطة.

**الشاشات:**
- **نقاط الدخول:** جدول (النقطة/النوع/الموقع/الخطورة/فرق/معدات)، وعند الفتح: المعلومات + المسوحات + الحملات + سجل الخطورة.
- **تقييم المخاطر:** قائمة المسوحات بالخطورة المحسوبة مع زر «اعتماد» للمدير وتوصية بإنشاء حملة للعالي الخطورة.
- **إنشاء حملة:** نقطة الدخول، الناقل المستهدف، التواريخ، الفريق، المنطقة، المعدات ☑، المواد ☑، المشرف.
- **متابعة الفعالية:** نتيجة ما بعد المكافحة لكل حملة؛ غير فعالة ← إجراء إعادة معالجة.
- **المخزون:** مواد (تشغيلة/رصيد/صلاحية) ومعدات (تسلسلي/حالة/صيانة) + تنبيه انخفاض الرصيد واقتراب الصلاحية.

---

# 13. 📱 شاشات المفتش الميداني

القائمة: الرئيسية · المسح (جديد/مسوحاتي/المتابعة) · الحملات (مهامي/تنفيذ نشاط/نتائج) · طلب صرف · التقارير.

**لوحة التحكم:** مسوحات اليوم / مهامي / نشاطات اليوم / مواقع معالجة + جدول مهام اليوم (بدء/متابعة/عرض).

- **نموذج المسح:** الناقل والموقع (قد يُملآن من المهمة)، الكثافة (منخفضة/متوسطة/عالية/حرجة) مرتبطة تلقائيًا بالتقييم المبدئي، مواقع التوالد، الظروف البيئية، صور حتى 4، ملاحظات، حفظ كمسودة.
- **تنفيذ نشاط:** النشاط، المادة + الكمية، المعدة، الموقع المعالج — **الحفظ يخصم من المخزون تلقائيًا**.
- **مسح ما بعد المكافحة:** الكثافة الحالية + هل انخفضت؟ + مواقع التوالد المتبقية + النتيجة (فعالة/غير فعالة) — غير فعالة تتطلب سببًا وتُظهر توصية «إعادة معالجة» تلقائيًا.
- **طلب صرف مواد:** مادة/كمية/غرض/نقطة ← موافقة المدير ← صرف من المخزن.

---

# 14. لوحة المؤشرات القومية

```text
Airports 6 │ Ports 8 │ Borders 12 │ Active Campaigns 18
Risk: 🔴4 🟠7 🟡22 🟢31
Surveys/Month 156 │ Sites Treated 420 │ Active WOs 38
Completed Campaigns 84 │ Pending Follow-ups 18 │ Avg Effectiveness 87%
```

---

# 15. 🔗 التكامل داخل NQP

```text
        Airport Health · Port Health · Land Border
                     └───────┬───────┘
                VECTOR CONTROL SYSTEM
     ┌──────────┬────────┼────────┬──────────┐
 Surveillance  Risk    Control   Laboratory  Reporting
               Engine  Activities
```

يتكامل أيضًا مع Emergency & Incident وFood Safety عبر نقطة الدخول المشتركة، ومع FCLIS لتحاليل النواقل.

---

## ⚙️ حالة التنفيذ مقابل المنصة القائمة (NQP)

> **تم تنفيذ النواة (MVP)**: تطبيق `apps/vector_control` بثلاثة نماذج + لوحة مؤشرات + واجهة `/app/vector-control` (6 تبويبات) — الدورة الأساسية تعمل فعليًا: مسح ← اعتماد ← أمر عمل ← إسناد/تنفيذ ← قياس فعالية ← إغلاق.

| مكون الوثيقة | الحالة | التنفيذ الفعلي |
|---|---|---|
| نقطة الدخول كـ Master Entity | ✅ مطبَّق | المسح مرتبط مباشرة بـ `masterdata.EntryPoint` (مطارات/موانئ/معابر) |
| Vector Registry | ✅ مطبَّق | `VectorRegistry`: 7 أنواع نواقل بالنويعات والأمراض المرتبطة — مبذور |
| Vector Surveillance | ✅ مطبَّق | `VectorSurvey`: رقم تلقائي VS-YYYY-XXXXXXXX، نقطة دخول، منطقة، فريق، مواقع تولد، كثافة رباعية، تقييم مبدئي مقترح تلقائي من الكثافة، اعتماد المدير (`approve`) مع تسجيل المعتمِد |
| Risk Assessment (مبدئي) | ⚠️ جزئي | اقتراح الخطورة من الكثافة + فلترة بالخطورة؛ محرك القواعد الكامل (مواسم/تاريخ) غير مربوط بعد |
| Work Orders | ✅ مطبَّق | `WorkOrder`: رقم تلقائي، طريقة مكافحة، دورة حالات PENDING→ASSIGNED→IN_PROGRESS→COMPLETED→FOLLOW_UP→CLOSED عبر `advance` (الإسناد يتطلب فريقًا)، `set_result` (فعالية % + إعادة معالجة لغير الفعالة)، `close` (يُمنع قبل تسجيل النتيجة) |
| Control Plans مستقلة | ❌ مؤجل | أمر العمل يُنشأ من المسح مباشرة دون خطة وسيطة |
| Materials Stock Ledger | ❌ مؤجل | لا مخزون مواد (تشغيلات/أرصدة/صلاحيات) |
| Equipment Management | ❌ مؤجل | لا معدات |
| Follow-up Surveys مستقلة | ⚠️ جزئي | الفعالية تُسجل على أمر العمل (نسبة %) دون مسح متابعة مستقل يقارن الكثافة قبل/بعد |
| Campaigns | ❌ مؤجل | لا حملات تجمع أوامر عمل |
| Incident / Laboratory Integration | ❌ مؤجل | — |
| أدوار VECTOR_* | ❌ مؤجل | الوصول حاليًا لأي مستخدم مصادق (IsAuthenticated) — الصلاحيات الدقيقة لاحقًا |
| شاشات المدير والمفتش | ⚠️ جزئي | صفحة موحدة بتبويبات (لوحة مؤشرات بالتوزيع الرباعي للكثافة، سجل النواقل، مسوحات + اعتماد، مسح جديد، أوامر عمل بإجراءات دورة الحياة، إنشاء أمر عمل) بدل فصل المدير/المفتش |

**اختبارات:** 6 اختبارات (سجل، توليد رقم المسح + الاقتراح التلقائي، الاعتماد ومنع التكرار، دورة أمر العمل كاملة بقواعدها، رفض النتيجة قبل التنفيذ، لوحة المؤشرات). **البذور:** `seed_vector_control` (7 نواقل، 4 مسوحات عبر معابر حقيقية، 2 أمر عمل بواقعية 82%).
