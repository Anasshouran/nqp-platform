# شاشة صحة المعابر البرية (Land Border Health Screens)

> **توصيف الواجهة الفعلي** كما هو في الشيفرة: صفحة واحدة `/app/borders-health` مع
> **20 قسماً متحركاً بالتمرير** داخل `CommandSectionRail` — ليست 20 مساراً
> منفصلاً. المصدر: `frontend/src/pages/bordershealth/BordersHealthPage.tsx` (1,871 سطراً).
>
> **اتجاه الواجهة:** عربي أولاً (RTL) عبر MUI + Tailwind. كل خرائط الحالات في
> `frontend/src/utils/status/bordershealth.ts` مُسمّاة `border*`.

---

## 1. الهدف

تقديم لوحة قيادة واحدة للمعابر البرية تغطي دورة الرقابة الصحية كاملة — الحركة والفحص
والمركبات والشحنات والحجر والعزل والتتبع والطوارئ والشهادات والقرارات والإشعارات
والحصيلة اليومية — داخل صفحة واحدة قابلة للتمرير بدل التنقّل بين شاشات متعددة.

## 2. البنية والتخطيط

| العنصر | التنفيذ |
| :--- | :--- |
| المسار | `/app/borders-health` (تحميل كسول `React.lazy` في `frontend/src/routes.tsx`) |
| المكوّن | `BordersHealthPage` |
| شريط الأقسام | `CommandSectionRail` + `useCommandSections` |
| الجداول | `DataTable` (MUI) × 22 مع `useServerTable` لكل مورد |
| المؤشرات | `KpiCard` × 8 + `DashboardHero` في القسم الأول |
| التخطيط | `Grid` من عمودين: الشريط الجانبي + منطقة المحتوى |
| التنقّل بين الأقسام | تمرير مع مراسي `data-section` و`scrollMarginTop: 80px` |

### 2.1 الأقسام العشرون

| # | `id` | التسمية | الأيقونة | المورد/الدالة |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `dashboard` | لوحة القيادة | `PublicIcon` | 3 نقاط لوحة قراءة |
| 2 | `crossings` | المعابر | `PublicIcon` | `getCrossings` |
| 3 | `facilities` | المرافق | `ApartmentIcon` | `getFacilities` |
| 4 | `shifts` | الورديات | `AssignmentIcon` | `getShifts` |
| 5 | `staff` | الكادر | `GroupsIcon` | `getBorderStaff` |
| 6 | `travelers` | المسافرون | `GroupsIcon` | `getTravelerRecords` |
| 7 | `declarations` | الإقرارات | `AssignmentIcon` | `getDeclarations` |
| 8 | `screenings` | الفحوصات | `FactCheckOutlinedIcon` | `getScreenings` |
| 9 | `vehicles` | المركبات | `DirectionsBusIcon` | `getVehicles` |
| 10 | `vehicle-inspections` | تفتيش المركبات | `FactCheckIcon` | `getVehicleInspections` |
| 11 | `cargo` | الشحنات | `LocalShippingIcon` | `getCargoInspections` |
| 12 | `samples` | العيّنات | `BiotechIcon` | `getSamples` |
| 13 | `quarantine` | الحجر | `HealthAndSafetyIcon` | `getQuarantineCases` |
| 14 | `isolation` | العزل | `CoronaIcon` | `getIsolationCases` |
| 15 | `tracing` | تتبع المخالطين | `ContactMailIcon` | `getContactTracingCases` + `getContacts` |
| 16 | `emergencies` | الطوارئ | `WarningAmberIcon` | `getIncidents` + `getEmergencies` |
| 17 | `certificates` | الشهادات | `BadgeIcon` | `getCertificates` + `getCrossings` |
| 18 | `decisions` | القرارات | `GavelIcon` | `getDecisions` |
| 19 | `notifications` | الإشعارات | `NotificationsIcon` | `getNotifications` |
| 20 | `statistics` | الحصيلة اليومية | `TrendingUpIcon` | `getDailyStatistics` |

> القسمان 18 و19 يستدعيان `useTableExport` أيضاً، والقسم 20 يوفّر زر «تحديث حصيلة اليوم»
> (§10). قسمان تضمّان **جدولين** في حزمة واحدة: `tracing` (حالات التتبع + المخالطون) و
> `emergencies` (الحوادث الصحية + الطوارئ)، و`certificates` يستدعي `getCrossings` في
> `useServerTable` منفصل (`initialPageSize: 100`) لتعبئة قائمة المعابر في حوار الإصدار.
> لا يملك أي قسم في الشريط مدخلاً مستقلاً للحوادث الصحية: هي بطاقة داخل `emergencies`.

---

## 3. القسم 1 — لوحة القيادة

**الدوال:** `getBordersHealthOverview` · `getCrossingPerformance` · `getTrafficTrend(7)`
— تُستدعى الثلاث في `useEffect` واحد عند التركيب، وكل `.catch(() => undefined)`
(فشل الطلب لا يعرض رسالة، بل يُبقي القيمة `null` فتظهر الأصفار).

### 3.1 ترويسة `DashboardHero`

| الحقل | القيمة |
| :--- | :--- |
| `eyebrow` | مركز قيادة المعابر البرية |
| `title` | الحجر الصحي القومي — المعابر البرية |
| `subtitle` | مؤشرات وطنية لحركة المسافرين والمركبات والشحنات والحجر عبر المعابر |
| `avatarLabel` | المعابر |

### 3.2 بطاقات `KpiCard` الثماني

| # | الحقل | البطاقة | اللون (`accent`) | تلميح |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `open_crossings` | معابر عاملة | `success.main` | `من {crossings}` |
| 2 | `travelers_today` | مسافرون اليوم | `primary.main` | — |
| 3 | `vehicles_inspected` | مركبات مفتّشة | `info.main` | — |
| 4 | `cargo_inspections` | شحنات مفتّشة | `secondary.main` | — |
| 5 | `active_quarantine` | حالات حجر نشطة | `warning.main` | — |
| 6 | `active_isolation` | حالات عزل | `error.main` | — |
| 7 | `suspected_cases` | حالات مشتبه بها | `error.main` | — |
| 8 | `certificates_issued` | شهادات صادرة | `primary.main` | — |

> القيمة الافتراضية لكل بطاقة `0` عند غياب البيانات (`?? 0`)، فلا يميّز `null` عن الصفر.

### 3.3 جدول «أداء المعابر»

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المعبر | `entry_point__name_ar` (عريض) | ظاهر |
| الكود | `entry_point__code` (بخط أحادي المسافة) | مخفي |
| الدولة المجاورة | `neighbor_country` | مخفي |
| الحالة | `operating_status` ⇒ `StatusChip` | ظاهر |
| حركة المسافرين | `records_count` (وسط) | ظاهر |
| مركبات | `vehicle_inspections_count` (وسط) | مخفي |
| شحنات | `cargo_count` (وسط) | مخفي |
| حجر | `quarantine_count` (وسط) | ظاهر |

بلا بحث ولا فلاتر. حالة الفراغ: `لا توجد بيانات أداء`.

---

## 4. الأقسام 2–5 — المعابر والمرافق والورديات والكادر

### 4.1 القسم 2 — المعابر (`crossings`)

- **الدالة:** `getCrossings` — **مع تصدير CSV**.
- **البحث:** `بحث باسم المعبر أو كوده أو الدولة المجاورة...`
- **الفلتر:** `operating_status` من `borderOperatingStatus`.
- **الحالة الفارغة:** `لا توجد معابر`.
- **الإجراء:** زر «تغيير حالة التشغيل» ⇒ `changeCrossingStatus(id, operating_status, closure_reason?)`
  ⇒ `PATCH /api/v1/borders-health/crossings/{id}/status/`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المعبر | `name_ar` | ظاهر |
| الدولة المجاورة | `neighbor_country` | مخفي |
| الولاية | `neighbor_state` | مخفي |
| الحالة | `operating_status` ⇒ شارة | ظاهر |
| السعة اليومية | `daily_capacity` (`toLocaleString('ar')`) | مخفي |
| مختبر | `has_laboratory` | ظاهر |

### 4.2 القسم 3 — المرافق (`facilities`)

- **الدالة:** `getFacilities` · **البحث:** `بحث باسم المرفق...`
- **الفلتر:** `kind` من `borderFacilityKind` (8 قيم).
- **الحالة الفارغة:** `لا توجد مرافق`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المرفق | `name_ar` | ظاهر |
| النوع | `kind` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | مخفي |
| السعة | `capacity` | ظاهر |
| الكادر | `staff_count` | مخفي |
| التشغيل | `is_operational` | ظاهر |

### 4.3 القسم 4 — الورديات (`shifts`)

- **الدالة:** `getShifts` · **البحث:** `بحث في الملاحظات...`
- **الفلتر:** `shift_type` من `borderShiftType`.
- **الحالة الفارغة:** `لا توجد ورديات`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| التاريخ | `shift_date` (`formatDate`) | ظاهر |
| الوردية | `shift_type` ⇒ شارة | ظاهر |
| البداية | `started_at` | ظاهر |
| النهاية | `ended_at` | مخفي |
| المعبر | `crossing_name` | مخفي |
| المشرف | `supervisor_name` | ظاهر |
| مؤمَّنة | `is_staffed` | ظاهر |

> **فخ التسمية:** الواجهة تعرض `AFTERNOON` باسم «مسائية» عبر `EVENING`، بينما الخلفية
> تعرف `AFTERNOON` لا `EVENING` (انظر §12.1).

### 4.4 القسم 5 — الكادر (`staff`)

- **الدالة:** `getBorderStaff` · **البحث:** `بحث باسم الموظف...` · بلا فلاتر.
- **الحالة الفارغة:** `لا يوجد كادر مسجَّل`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| الموظف | `user_name` (عريض) | ظاهر |
| الدور | `role` | ظاهر |
| المعبر | `crossing_name` | مخفي |
| نوع الإسناد | `assignment_type` | مخفي |
| يبدأ | `starts_on` | ظاهر |
| ينتهي | `ends_on` أو `مستمر` | مخفي |
| نشط | `is_active` | ظاهر |

---

## 5. الأقسام 6–8 — المسافرون والإقرارات والفحوصات

### 5.1 القسم 6 — المسافرون (`travelers`)

- **الدالة:** `getTravelerRecords` — **مع تصدير CSV**.
- **البحث:** `بحث بالاسم أو رقم الجواز...`
- **الفلاتر:** `direction` من `borderTravelDirection`، و`risk_level` من `borderRiskLevel`.
- **الحالة الفارغة:** `لا توجد حركة مسافرين`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المسافر | `traveler_name` | ظاهر |
| الاتجاه | `direction` ⇒ شارة | ظاهر |
| وقت العبور | `entry_at` | ظاهر |
| المعبر | `crossing_name` | ظاهر |
| الخطورة | `risk_level` ⇒ شارة | ظاهر |
| القرار | `decision` ⇒ شارة | ظاهر |
| المُقيِّم | `assessed_by_name` | ظاهر |

### 5.2 القسم 7 — الإقرارات (`declarations`)

- **الدالة:** `getDeclarations` · **البحث:** `بحث بالاسم أو الجواز...`
- **الفلتر:** `status` من `borderDeclarationStatus`.
- **الحالة الفارغة:** `لا توجد إقرارات`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المسافر | `traveler_name` | ظاهر |
| بلد المغادرة | `departure_country` | مخفي |
| تاريخ المغادرة | `departure_date` | ظاهر |
| الأعراض | `current_symptoms` | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | مخفي |
| تاريخ الإقرار | `declared_at` | مخفي |

> **تعارض كامل:** `borderDeclarationStatus` لا يتشارك أي قيمة مع
> `HealthDeclaration.Status` (انظر §12.1).

### 5.3 القسم 8 — الفحوصات (`screenings`)

- **الدالة:** `getScreenings` · **البحث:** `بحث بالاسم أو رقم الجواز...`
- **الفلتر:** `decision` من `borderScreeningDecision`.
- **الحالة الفارغة:** `لا توجد فحوصات`.
- **الإجراء:** زر صف في `actions` بتلميح «إعادة التقييم بقياسات جديدة» (سطر 762) ⇒ حوار
  «إعادة تقييم الفحص» (سطر 781) بحقلَي «درجة الحرارة (°C)» و«إشباع الأكسجين (%)»،
  تُملأ مسبقاً بالقيم الحالية للسجل (سطور 769–770). الإرسال يستدعي
  `reassessScreening(id, body)` (سطر 687) ⇒
  `POST /api/v1/borders-health/screenings/{id}/reassess/`، حيث لا يُرسل إلا الحقلان
  المعبّآن (سطور 684–686) — فارغُ أحدهما يعني «أبقِ القياس الحالي». عند النجاح
  `notifySuccess('أُعيد تقييم الفحص وحُدِّث القرار')` ثم `t.refresh()`؛ وعند الفشل
  `notifyError(extractErrorMessage(e))`. نصّ الحوار يسرّد القواعد المُعاد تشغيلها:
  حمّى ≥ 38 أو أكسجين < 92 ⇒ خطورة حمراء وحجر، أعراض ⇒ إحالة، وثائق غير متحقَّق منها ⇒ حجز.

> `POST …/reassess/` يقبل في الخلفية خمسة حقول (`body_temperature`,
> `oxygen_saturation`, `observed_symptoms`, `document_verified`,
> `vaccination_verified`) ويغيّر ما ورد منها فقط
> (`views.py:318–321`) — لكن الحوار يعرض اثنين منها، فالأعراض وحالة الوثائق لا
> يُعاد ضبطهما من الواجهة رغم أنهما مُدخَلان في قاعدة القرار.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المسافر | `traveler_name` | ظاهر |
| الحرارة | `body_temperature` | ظاهر |
| الأكسجين | `oxygen_saturation` | مخفي |
| الخطورة | `risk_level` ⇒ شارة | ظاهر |
| القرار | `decision` ⇒ شارة | ظاهر |
| الوثائق | `document_verified` | مخفي |
| المعبر | `crossing_name` | مخفي |
| وقت الفحص | `screened_at` | مخفي |

> **بلا نموذج تسجيل فحص جديد:** إعادة التقييم تعيد تشغيل قواعد القرار على قياسات موجودة
> ولا تنشئ فحصاً، و`createScreening` معرَّف في `bordersHealth.ts` وغير مستدعى — فلا سبيل
> لإدخال الفحص من الصفر إلا عبر `emptyDescription` الذي يوجّه إلى «سجّل الفحص الحراري مع
> قرار الإفراج». الفحص الصحي هو أهم إجراء في الوحدة ومع ذلك يبقى بلا نموذج إنشاء.

---

## 6. الأقسام 9–12 — المركبات والشحنات والعيّنات

### 6.1 القسم 9 — المركبات (`vehicles`)

- **الدالة:** `getVehicles` · **البحث:** `بحث باللوحة أو الهيكل أو اسم السائق...`
- **الفلتر:** `vehicle_type` من `borderVehicleType`.
- **الحالة الفارغة:** `لا توجد مركبات`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| اللوحة | `plate_number` | ظاهر |
| النوع | `vehicle_type` ⇒ شارة | ظاهر |
| الطراز | `make_model` | ظاهر |
| السائق | `driver_name` | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | ظاهر |

### 6.2 القسم 10 — تفتيش المركبات (`vehicle-inspections`)

- **الدالة:** `getVehicleInspections` · **البحث:** `بحث باللوحة أو الملاحظات...`
- **الفلتر:** `overall_status` من `borderInspectionOverall`.
- **الحالة الفارغة:** `لا توجد عمليات تفتيش`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| اللوحة | `plate_number` | ظاهر |
| نوع التفتيش | `inspection_type` | ظاهر |
| النظافة | `cleanliness_status` | مخفي |
| الحشرات | `pest_control_status` | مخفي |
| الحكم | `overall_status` ⇒ شارة | ظاهر |
| التاريخ | `inspection_date` | مخفي |
| المفتش | `inspector_name` | مخفي |

> `createVehicleInspection` معرَّف في `bordersHealth.ts` وغير مستدعى — لا نموذج تسجيل
> تفتيش في الواجهة.

### 6.3 القسم 11 — الشحنات (`cargo`)

- **الدالة:** `getCargoInspections` — **مع تصدير CSV**.
- **البحث:** `بحث برقم الإقرار أو الصنف أو المنشأ...`
- **الفلاتر:** `scope` من `borderCargoScope`، و`status` من `borderCargoStatus`.
- **الحالة الفارغة:** `لا توجد شحنات`.
- **الإجراء:** زر «حساب القرار من العيّنات» ⇒ `decideCargoInspection(id, decision?)`
  ⇒ `POST /api/v1/borders-health/cargo-inspections/{id}/decide/`. عند عدم تمرير
  `decision` يُرسَل `{}` فيعتمد الخادم على الاشتقاق (انظر WF-10 §5).

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| رقم الإقرار | `declaration_number` | ظاهر |
| النطاق | `scope` | ظاهر |
| الصنف | `product_type` | ظاهر |
| المنشأ | `country_of_origin` | مخفي |
| اللوحة | `plate_number` | مخفي |
| الحالة | `status` ⇒ شارة | ظاهر |
| القرار | `decision` ⇒ شارة | ظاهر |

### 6.4 القسم 12 — العيّنات (`samples`)

- **الدالة:** `getSamples` · **البحث:** `بحث بكود العيّنة أو نوعها...`
- **الفلتر:** `status` من `borderSampleStatus`.
- **الحالة الفارغة:** `لا توجد عيّنات`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| كود العيّنة | `sample_code` | ظاهر |
| نوع العيّنة | `sample_type` | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| النتيجة | `result` | ظاهر |
| المعبر | `crossing_name` | مخفي |
| المسحوب | `collected_by_name` | مخفي |
| التاريخ | `collected_at` | مخفي |

---

## 7. الأقسام 13–15 — الحجر والعزل والتتبع

### 7.1 القسم 13 — الحجر (`quarantine`)

- **الدالة:** `getQuarantineCases` · **البحث:** `بحث برقم الحالة أو الاسم...`
- **الفلاتر:** `status` من `borderQuarantineStatus`، و`phase` من `borderQuarantinePhase`.
- **الحالة الفارغة:** `لا توجد حالات حجر`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| رقم الحالة | `case_number` | ظاهر |
| الحالة | `person_name` | ظاهر |
| تاريخ الدخول | `entry_at` | ظاهر |
| المدة | `required_days` | مخفي |
| النهاية المتوقعة | `expected_end_date` | ظاهر |
| المرحلة | `phase` ⇒ شارة | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | مخفي |

> عمودان يحملان التسمية نفسها «الحالة»: `person_name` و`status`.

### 7.2 القسم 14 — العزل (`isolation`)

- **الدالة:** `getIsolationCases` · **البحث:** `بحث في الملاحظات...`
- **الفلتر:** `status` من `borderIsolationStatus`.
- **الحالة الفارغة:** `لا توجد حالات عزل`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| تاريخ البدء | `start_date` | ظاهر |
| النهاية المتوقعة | `expected_end_date` | ظاهر |
| النهاية الفعلية | `end_date` | مخفي |
| الحالة | `status` ⇒ شارة | ظاهر |
| بدأها | `started_by_name` | مخفي |
| المعبر | `crossing_name` | مخفي |
| ملاحظات | `notes` | مخفي |

### 7.3 القسم 15 — تتبع المخالطين (`tracing`)

جدولان: **حالات التتبع** ثم **المخالطون**.

**جدول حالات التتبع**
- **الدالة:** `getContactTracingCases` · **البحث:** `بحث باسم الحالة الأصل...`
  · بلا فلاتر · الحالة الفارغة: `لا توجد حالات تتبع`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| الحالة الأصل | `index_case_name` | ظاهر |
| وسيلة النقل | `transport_mode` | مخفي |
| أيام المتابعة | `follow_up_days` | ظاهر |
| تاريخ البدء | `started_at` | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | مخفي |

**جدول المخالطين**
- **الدالة:** `getContacts` · **البحث:** `بحث بالاسم أو الجواز أو الهاتف...`
  · بلا فلاتر · الحالة الفارغة: `لا يوجد مخالطون`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| المخاطَب | `full_name` | ظاهر |
| الجواز | `passport_number` | ظاهر |
| الهاتف | `phone` | مخفي |
| المقعد / الصلة | `seat_or_relation` | مخفي |
| يوم المتابعة | `follow_up_day` | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |

---

## 8. القسم 16 — الطوارئ

جدولان: **الحوادث الصحية** ثم **حالات الطوارئ**.

**جدول الحوادث**
- **الدالة:** `getIncidents` · **البحث:** `بحث بعنوان الحادثة أو الوصف...`
- **الفلتر:** `severity` من `borderIncidentSeverity` · الحالة الفارغة: `لا توجد حوادث`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| الحادثة | `title` (عريض) | ظاهر |
| الخطورة | `severity` ⇒ شارة | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| تاريخ البلاغ | `reported_at` | ظاهر |
| المعبر | `crossing_name` | مخفي |

**جدول الطوارئ**
- **الدالة:** `getEmergencies` · **البحث:** `بحث بالعنوان أو الوصف...` · بلا فلاتر
  · الحالة الفارغة: `لا توجد طوارئ`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| الطوارئ | `title` (عريض) | ظاهر |
| مستوى التقييد | `restriction_level` ⇒ شارة | ظاهر |
| الحالة | `status` ⇒ شارة | ظاهر |
| تاريخ البلاغ | `reported_at` | ظاهر |
| المعبر | `crossing_name` | مخفي |

> **خطأ خرائط:** عمود `status` في جدول الطوارئ يستدعي `borderIncidentStatus` (سطر 1406)
> لا `borderEmergencyStatus` — بينما `BorderEmergency.EmergencyStatus` خلفيّته
> `OPEN, ACTIVE, CONTROLLED, CLOSED`، فقيم `ACTIVE` و`CONTROLLED` تُعرض خاماً بلا شارة،
> وقيم `INVESTIGATING` و`RESOLVED` لا تحدث أصلاً. `borderEmergencyStatus` معرَّفة في
> `bordershealth.ts` (سطر 200) وغير مُستعملة في الصفحة إطلاقاً.

---

## 9. القسم 17 — الشهادات

- **الدوال:** `getCertificates` — **مع تصدير CSV**، و`getCrossings` لتعبئة قائمة المعابر
  في نموذج الإصدار.
- **البحث:** `بحث برقم الشهادة...` · **الفلتر:** `status` من `borderCertificateStatus`
  · **الحالة الفارغة:** `لا توجد شهادات`.
- **الإجراء:** زر/حوار «إصدار شهادة» ⇒ `issueCertificate(payload)`
  ⇒ `POST /api/v1/borders-health/certificates/issue/`.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| رقم الشهادة | `certificate_number` | ظاهر |
| النوع | `certificate_type` ⇒ شارة | ظاهر |
| تاريخ الإصدار | `issue_date` | ظاهر |
| ينتهي | `expiry_date` | مخفي |
| الحالة | `status` ⇒ شارة | ظاهر |
| المعبر | `crossing_name` | مخفي |
| أصدرها | `issued_by_name` | مخفي |

---

## 10. الأقسام 18–20 — القرارات والإشعارات والحصيلة اليومية

الأقسام الثلاثة الأخيرة رُكِّبت بلا شريط تبويبات داخلي: كلٌّ منها جدول واحد كامل الشاشة
يعكس `DataTable` مستقلاً في حزمة `Stack` واحدة.

### 10.1 القسم 18 — القرارات (`decisions`)

- **الدالة:** `getDecisions` (سطر 1437) ⇒ `GET /api/v1/borders-health/decisions/` —
  **مع تصدير CSV**.
- **البحث:** `بحث في سبب القرار...` · بلا فلاتر · بلا أزرار إجراءات على الصف.
- **الحالة الفارغة:** `لا توجد قرارات`، ووصفها `تُسجَّل قرارات الإفراج والتوجيه
  تلقائياً عند الفحص والتخليص.` — أي السجل ناتج عن إجراءات الخلفية، لا عن نموذج هنا.
- **التصدير:** `exportAll` بملف `border-decisions` وترويسات
  `التاريخ · الموضوع · النتيجة · السبب · المعبر` (سطور 1471–1476).

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| تاريخ القرار | `decided_at` | ظاهر |
| الموضوع | `subject_type` (خام بلا شارة) | ظاهر |
| النتيجة | `outcome` ⇒ شارة `borderDecisionOutcome` | ظاهر |
| السبب | `reason` | ظاهر |
| اتخذ القرار | `decided_by_name` | ظاهر |
| المعبر | `crossing_name` | مخفي |

> `subject_type` و`recipient_role` في القسمين 18 و19 يُعرضان نصاً خاماً بلا شارة ولا
> ترجمة، لأن `bordershealth.ts` لا يعرّف خريطة لهما — وهي قيم حرّة من `TextChoices`
> في الخلفية.

### 10.2 القسم 19 — الإشعارات (`notifications`)

- **الدالة:** `getNotifications` (سطر 1485) ⇒
  `GET /api/v1/borders-health/notifications/` — **مع تصدير CSV**.
- **البحث:** `بحث في العنوان أو النص...` · **بفلترين**: `status` من
  `borderNotificationDeliveryStatus` و`channel` من `borderNotificationChannel`
  (سطور 1521–1536).
- **الحالة الفارغة:** `لا توجد إشعارات`، ووصفها `تُرسل إشعارات تنبيه للكادر عند
  الطوارئ والقرارات.`
- **التصدير:** `exportAll` بملف `border-notifications` وترويسات
  `التاريخ · العنوان · القناة · التسليم · المستلم` (سطور 1540–1545).
- **بلا نموذج إرسال** — الإشعار يُنشأ في الخلفية؛ الواجهة للعرض فقط.

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| تاريخ الإرسال | `sent_at` (`formatDateTime` أو `—`) | ظاهر |
| العنوان | `title` (عريض) | ظاهر |
| القناة | `channel` ⇒ شارة `borderNotificationChannel` | ظاهر |
| التسليم | `status` ⇒ شارة `borderNotificationDeliveryStatus` | ظاهر |
| المستلم | `recipient_role` (خام) | ظاهر |
| وسيلة التواصل | `recipient_contact` | مخفي |

> تسميات عمودَي القناة والتسليم أوضح من تسميات بقية الوحدة: `status` هنا «التسليم»
> لا «الحالة»، فلا يلتبس بحالة السجل نفسه — وهو ما لا ينطبق على `channel` إذ لا
> مقابل له في أي جدول آخر.

### 10.3 القسم 20 — الحصيلة اليومية (`statistics`)

- **الدالة:** `getDailyStatistics` (سطر 1554) ⇒
  `GET /api/v1/borders-health/daily-statistics/`. بلا بحث وبلا فلاتر وبلا تصدير.
- **الإجراء (الوحيد في القسم):** زر «تحديث حصيلة اليوم» فوق الجدول
  (`startIcon={<RefreshIcon />}`، سطور 1572–1579) ⇒ `refreshDailyStatistics()` بلا
  وسائط ⇒ `POST /api/v1/borders-health/daily-statistics/refresh/`، أي حساب أرقام
  **لكل المعابر لتاريخ اليوم**. عند النجاح `notifySuccess('تم تحديثحصيلة اليوم لكل
  المعابر')` ثم `t.refresh()`؛ وعند الفشل إشعار صريح
  `تعذّر تحديث الإحصاءات — قد تحتاج صلاحية لوحة القيادة`، بخلاف لوحة القيادة التي
  تبتلع الخطأ بـ `.catch(() => undefined)`.
- **الحالة الفارغة:** `لا توجد حصيلة`، ووصفها `اضغط «تحديث حصيلة اليوم» لحساب أرقام
  اليوم من سجلات الفحص والشحنات.`

| العمود | المفتاح | على الجوال |
| :--- | :--- | :--- |
| التاريخ | `stat_date` (`formatDate`) | ظاهر |
| المعبر | `crossing_name` (عريض) | ظاهر |
| داخل | `travelers_inbound` (`toLocaleString('ar')`) | ظاهر |
| خارج | `travelers_outbound` (`toLocaleString('ar')`) | ظاهر |
| مركبات | `vehicles_inspected` | مخفي |
| حجر | `quarantine_cases` | ظاهر |
| عيّنات | `samples_collected` | مخفي |
| متوسط المعالجة | `average_processing_minutes` (`{n} د` أو `—`) | ظاهر |

> `average_processing_minutes` يُصفَّر بـ `'—'` عند `null`، فلا يُخلط الصفر الحقيقي
> (معالجة فورية) بغياب القياس. ولأن الزر يُرسل الحسبة بلا `crossing` ولا `stat_date`،
> فهو يعيد حساب يوم واحد لكل المعابر ولا يعيد أياماً سابقة. ونصّ النجاح في الشيفرة
> `تم تحديثحصيلة اليوم` **بلا مسافة** بين «تحديث» و«حصيلة» (سطر 1561) — عيب طباعي
> ظاهر للمستخدم لا وظيفي.

---

## 11. الترقيم والتصدير والبحث

### 11.1 `useServerTable` — ترقيم خادمي

| السمة | السلوك |
| :--- | :--- |
| `page` / `rowsPerPage` | حالة داخلية؛ الافتراضي يتبع `useServerTable` |
| `pageSizeOptions` | خيارات من الفلتر (`pageSizeOptions`) |
| `setPage` / `setRowsPerPage` | تعيد الجلب |
| `setFilter(key, value)` | يضيف الفلاتر إلى معاملات الطلب |
| `setSearchInput` + `searchInput` | بحث نصي |
| `refresh` | إعادة جلب |
| `fetchAllRows` | يجلب **كل** الصفوف المطابقة للتصدير (بحد `page_size` أقصى `500`) |

الترقيم **من الخادم** (`?page=` و`?page_size=`)، والحد الأقصى `500`، وحجم الصفحة
الافتراضي `10` (`REST_FRAMEWORK.PAGE_SIZE`). استُدعي `useServerTable` **22 مرة** — واحدة
لكل `DataTable` من الـ 22، ومنها `getCrossings` مرتين: مرة لجدول المعابر (262) ومرة
أخرى (`initialPageSize: 100`) لتغذية قائمة المعابر في حوار إصدار الشهادة (1623).

### 11.2 `useTableExport` — تصدير CSV

مربوط بـ `useTableExport(t.fetchAllRows)` في **خمسة أقسام**:

| القسم | السطر | الدالة المصدِّرة | ملف CSV | الترويسات |
| :--- | :--- | :--- | :--- | :--- |
| 2 المعابر | 263 | `exportAll` | `border-crossings` | الكود · الاسم · الدولة · الحالة |
| 6 المسافرون | 544 | `exportAll` | `border-travelers` | المسافر · الجواز · الاتجاه · الخطورة · القرار |
| 17 الشهادات | 1616 | `exportAll` | `border-certificates` | الرقم · النوع · الإصدار · الانتهاء · الحالة |
| 18 القرارات | 1438 | `exportAll` | `border-decisions` | التاريخ · الموضوع · النتيجة · السبب · المعبر |
| 19 الإشعارات | 1486 | `exportAll` | `border-notifications` | التاريخ · العنوان · القناة · التسليم · المستلم |

> **15 قسماً بلا تصدير** من أصل 20 — منها الفحوصات والشحنات والعيّنات والحجر والعزل،
> وهي أكثر الأقسام احتياجاً للعرض الميداني. القيم المصدَّرة **خام** (لا تمرّ
> `StatusChip`): فتصدير المعابر يضع `operating_status` بالنص الإنجليزي لا «يعمل».

### 11.3 قوائم الفلترة `filters`

**15 خاصية `filters={[…]}`** في الصفحة ⇒ **20 قائمة منسدلة** على **15 جدولاً**، تغطّي
**14 قسماً** من الـ 20 (القسم 16 يحمل الفلتر على جدول الحوادث لا على جدول الطوارئ):

| القسم | الجدول | الفلتر (المفتاح) | الخريطة |
| :--- | :--- | :--- | :--- |
| 2 `crossings` | إدارة المعابر | `operating_status` | `borderOperatingStatus` |
| 3 `facilities` | مرافق المعابر | `kind` | `borderFacilityKind` |
| 4 `shifts` | الورديات | `shift_type` | `borderShiftType` |
| 6 `travelers` | المسافرون | `direction` + `risk_level` | `borderTravelDirection` + `borderRiskLevel` |
| 7 `declarations` | الإقرارات الصحية | `status` | `borderDeclarationStatus` |
| 8 `screenings` | الفحص الصحي | `decision` | `borderScreeningDecision` |
| 9 `vehicles` | المركبات | `vehicle_type` | `borderVehicleType` |
| 10 `vehicle-inspections` | تفتيش المركبات | `overall_status` | `borderInspectionOverall` |
| 11 `cargo` | تفتيش الشحنات | `scope` + `status` | `borderCargoScope` + `borderCargoStatus` |
| 12 `samples` | العيّنات | `status` | `borderSampleStatus` |
| 13 `quarantine` | حالات الحجر | `status` + `phase` | `borderQuarantineStatus` + `borderQuarantinePhase` |
| 14 `isolation` | حالات العزل | `status` | `borderIsolationStatus` |
| 16 `emergencies` | الحوادث الصحية | `severity` | `borderIncidentSeverity` |
| 17 `certificates` | الشهادات | `status` | `borderCertificateStatus` |
| 19 `notifications` | الإشعارات | `status` + `channel` | `borderNotificationDeliveryStatus` + `borderNotificationChannel` |

الجداول السبعة الباقية بلا فلاتر: لوحة الأداء (القسم 1)، الكادر (5)، حالتا التتبع
(15: `حالات التتبع` و`المخالطون`)، الطوارئ (16)، القرارات (18)، الإحصاءات (20).

> كل قائمة تُبنى بـ `Object.entries(borderX).map(...)` فتشمل **كل** قيم الخريطة بلا
> استثناء ولا «غير مطبَّق». واستعمالان لـ`Object.entries` ليسا فلاتر: السطر 373
> (`borderOperatingStatus` في حوار تغيير حالة المعبر) والسطر 1754
> (`borderCertificateType` في حوار إصدار الشهادة) — وهما `<TextField select>` لا
> `filters`.

### 11.4 `DataTable` — الخصائص المشتركة

`columns` · `rows` · `rowKey` · `count` · `page` · `rowsPerPage` · `pageSizeOptions` ·
`loading` · `error` · `title` · `subtitle` · `searchInput`/`onSearchChange` ·
`searchPlaceholder` · `filters` · `onPageChange` · `onRowsPerPageChange` · `onRefresh` ·
`emptyTitle` · `emptyDescription` · `onExport` (اختياري) · `exporting` (اختياري) ·
`actions` (اختياري) · `toolbar` (اختياري، في الشهادات فقط) · `hidePagination`
(اختياري، في لوحة الأداء فقط).

كل عمود يحمل `key` و`label` و`render`، وغالباً `hideOnMobile` و/أو `align: 'center'`.
قيمة الفراغ الموحّدة `'—'` (عدا «لا يوجد» في `current_symptoms` و«مستمر» في
`ends_on` و`end_date` و«جارٍ…» في أزرار الانتظار).

---

## 12. خرائط الحالات: التطابق والخلل

`frontend/src/utils/status/bordershealth.ts` يعرّف **33 خريطة** حالة. طوبقتها آلياً على
`TextChoices` في `backend/apps/borders_health/models.py`:

- **22 خريطة متطابقة تماماً.**
- **11 خريطة غير متطابقة.**

من الـ 33، وُزّعت على ثلاثة أنماط استعمال داخل الصفحة:

| النمط | العدد | الدليل |
| :--- | :--- | :--- |
| قوائم فلاتر منسدلة | **19 خريطة** في **20 قائمة** | 15 خاصية `filters={[…]}` (§11.3) |
| مُشار إليها في `render` أعمدة الجداول | **30 خريطة** | 35 استدعاء `label={borderX[…]` |
| بلا أي مرجع في الصفحة | **3 خرائط** | `borderType` · `borderHealthStatus` · `borderEmergencyStatus` |

> الأرقام الثلاثة متداخلة لا مجمّعة: كل خريطة من الـ 19 الفلترية تُستعمل أيضاً داخل
> `render`، فيبقى المجموع 30 خريطة فعّالة + 3 غير مُستعملة = 33.

**الخرائط الإحدى عشرة التي لا تظهر في أي قائمة فلترة** (ظاهرة في `render` فقط):
`borderTravelerDecision`، `borderVehicleStatus`، `borderInspectionType`،
`borderComplianceStatus`، `borderCargoOutcome`، `borderContactTracingStatus`،
`borderContactStatus`، `borderIncidentStatus`، `borderRestrictionLevel`،
`borderDecisionOutcome`، `borderCertificateType` — أي **11** خريطة، ستّها متطابقة
(`borderTravelerDecision`, `borderInspectionType`, `borderComplianceStatus`,
`borderCargoOutcome`, `borderDecisionOutcome`, `borderCertificateType`) وخمسها متخلّفة
(انظر الجدول التالي).

> **تصحيح سابق:** كانت هذه الوثيقة تعدّ **8** خرائط للاستعمال في `render` وتحسبها كلها
> متطابقة، وكانت تُدرج `borderType` و`borderHealthStatus` ضمنها — وهما **غير
> مُستعملتين في الصفحة إطلاقاً** (لا مرجع لهما خارج `bordershealth.ts` وسطر
> إعادة التصدير في `utils/status/index.ts`). كما كانت تُغفل خمس خرائط مستعملة فعلاً:
> `borderVehicleStatus`، `borderContactTracingStatus`، `borderContactStatus`،
> `borderIncidentStatus`، `borderRestrictionLevel`.

### 12.1 جدول التخلّفات الإحدى عشرة

| الخريطة | النموذج.الحقل | واجهة فقط | خلفية فقط |
| :--- | :--- | :--- | :--- |
| `borderShiftType` | `BorderShift.ShiftType` | `EVENING` | `AFTERNOON` |
| `borderDeclarationStatus` | `HealthDeclaration.Status` | `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `FLAGGED` | `RECEIVED`, `REVIEWED`, `APPROVED`, `REJECTED` |
| `borderVehicleType` | `Vehicle.VehicleType` | `CAR`, `PICKUP`, `TRACTOR`, `MOTORCYCLE` | `PRIVATE_CAR`, `AMBULANCE`, `LIVESTOCK_TRANSPORT`, `REFRIGERATED_TRUCK`, `TANKER` |
| `borderVehicleStatus` | `Vehicle.VehicleStatus` | `AWAITING`, `INSPECTED`, `CLEARED`, `HELD`, `REJECTED` | `ACTIVE`, `UNDER_QUARANTINE`, `CONDEMNED` |
| `borderContactTracingStatus` | `ContactTracingCase.TracingStatus` | `FOLLOW_UP`, `CLOSED` | `MONITORING`, `ESCALATED` |
| `borderContactStatus` | `Contact.ContactStatus` | `PENDING`, `SYMPTOMATIC`, `ISOLATED`, `LOST_TO_FOLLOW_UP` | `IDENTIFIED`, `CONTACTED`, `QUARANTINED`, `MONITORING`, `LOST` |
| `borderIncidentStatus` | `BorderHealthIncident.IncidentStatus` | `RESOLVED` | `CONTROLLED` |
| `borderEmergencyStatus` | `BorderEmergency.EmergencyStatus` | `MONITORING`, `RESOLVED` | `CONTROLLED` |
| `borderRestrictionLevel` | `BorderEmergency.RestrictionLevel` | `PARTIAL`, `FULL`, `BORDER_CLOSURE` | `INCREASED_SURVEILLANCE`, `MOVEMENT_REDUCED`, `MOVEMENT_SUSPENDED`, `CLOSED` |
| `borderNotificationChannel` | `BorderNotification.Channel` | `RADIO` | `INTERNAL` |
| `borderNotificationDeliveryStatus` | `BorderNotification.Status` | `DELIVERED` | — |

> `borderEmergencyStatus` من الخرائط الإحدى عشرة المتخلّفة لكنها **غير مُستعملة في
> الصفحة**؛ فجدول الطوارئ يستعمل `borderIncidentStatus` بدلها (§8)، فالقيم الخلفية
> `ACTIVE` و`CONTROLLED` لا تجد شارة.

### 12.2 أثر التخلّفات

كل خانة في `StatusChip` تُسقط بـ `?? v.<field>` مع `tone ?? 'neutral'`، فلا تنهار
الواجهة. لكن **التأثير دلالي**: قيمة خلفية غير معرَّفة تُعرض **كما وصلت من الخادم**
(نصاً خاماً) بلا
ترجمة ولا لون؛ فمثلاً يُعرض `UNDER_QUARANTINE` (قيمة خلفية) و`AWAITING`
> (قيمة واجهة) معاً بلا تمييز.

---

## 13. الأدوار والتنقّل

`frontend/src/config/roleLayouts/borders.tsx` يعرّف **16 دوراً** بتسعة قوالب تنقّل
(`NAV`). **كل** روابط المعابر تشير إلى `/app/borders-health` (صفحة واحدة) — الفرق بين
الأدوار **في التسلسل البصري فقط**؛ الشرح في الملف ينصّ على ذلك صراحةً. الصلاحيات
الحقيقية تُطبَّق في الخلفية عبر `borders_health:*`.

| الدور | العنوان | اللون | القالب |
| :--- | :--- | :--- | :--- |
| `BORDER_SYSTEM_ADMIN` | مدير نظام صحة المعابر | `#16855B` | `STAFF_NAV` |
| `BORDER_STATION_MANAGER` | مدير محطة المعبر | `#16855B` | `STAFF_NAV` |
| `BORDER_HEALTH_OFFICER` | ضابط الصحة الحدودية | `#0B5ED7` | `OFFICER_NAV` |
| `QUARANTINE_DOCTOR` | طبيب الحجر | `#0e7490` | `MEDICAL_NAV` |
| `QUARANTINE_INSPECTOR` | مفتش الحجر الصحي | `#0e7490` | `MEDICAL_NAV` |
| `TRAVELER_REGISTRATION_OFFICER` | موظف تسجيل المسافرين | `#0B5ED7` | `READONLY_NAV` |
| `LAB_TECHNICIAN` | فني المختبر | `#0e7490` | `LAB_NAV` |
| `FOOD_INSPECTOR` | مفتش رقابة الأغذية | `#16855B` | `INSPECTION_NAV` |
| `ENV_INSPECTOR` | مفتش الصحة البيئية | `#16855B` | `INSPECTION_NAV` |
| `EPIDEMIOLOGY_OFFICER` | ضابط الترصد | `#7C3AED` | `EPIDEMIOLOGY_NAV` |
| `EMERGENCY_OFFICER` | ضابط الطوارئ | `#c1121f` | `EMERGENCY_NAV` |
| `CUSTOMS_OFFICER` | ضابط الجمارك | `#0B5ED7` | `READONLY_NAV` |
| `IMMIGRATION_OFFICER` | ضابط الهجرة | `#0B5ED7` | `READONLY_NAV` |
| `BORDER_DIRECTOR` | مدير صحة المعابر | `#16855B` | `LEADERSHIP_NAV` |
| `QUARANTINE_SECTOR_DIRECTOR` | مدير قطاع الحجر الصحي | `#7C3AED` | `LEADERSHIP_NAV` |
| `NATIONAL_QUARANTINE_DIRECTOR` | المدير الوطني للحجر الصحي | `#06463c` | `LEADERSHIP_NAV` |

### 13.1 قوالب التنقّل

| القالب | المدخلات | عدد |
| :--- | :--- | :--- |
| `STAFF_NAV` | مركز قيادة المعابر · المعابر والمرافق · الورديات والكادر · حسابي | 4 |
| `OFFICER_NAV` | مركز قيادة المعابر · المسافرون والفحص · المركبات · الشحنات والعيّنات · حسابي | 5 |
| `MEDICAL_NAV` | مركز قيادة المعابر · الفحص الطبي · الحجر والعزل · حسابي | 4 |
| `LAB_NAV` | مركز قيادة المعابر · العيّنات والمختبر · الشحنات · حسابي | 4 |
| `EPIDEMIOLOGY_NAV` | مركز قيادة المعابر · الحجر والعزل · تتبع المخالطين · حسابي | 4 |
| `EMERGENCY_NAV` | مركز قيادة المعابر · الطوارئ والحوادث · العيّنات · حسابي | 4 |
| `INSPECTION_NAV` | مركز قيادة المعابر · الفحص والتفتيش · الشحنات والعيّنات · حسابي | 4 |
| `READONLY_NAV` | مركز قيادة المعابر · المسافرون · حسابي | 3 |
| `LEADERSHIP_NAV` | مركز قيادة المعابر · المعابر والأداء · الحجر والعزل · الطوارئ · الشهادات · حسابي | 6 |

> **تصحيح مهم:** `QUARANTINE_INSPECTOR` **له مدخل** في `borders.tsx` (سطر 120) ومنحه
> `seed_rbac.py` 12 صلاحية `borders_health` — فالسابق توثيقه كدور «بلا تنقّل» غير
> صحيح. الفجوة الحقيقية أن `QUARANTINE_INSPECTOR` و`QUARANTINE_DOCTOR` يتشاركان
> `MEDICAL_NAV` بالضبط (نفس 4 مداخل ونفس الأيقونات)، فلا يميّز المستخدم بينهما في
> الواجهة مع اختلاف صلاحياتهما تماماً في الخلفية.
>
> ولا يذكر أيّ قالب تنقّل الأقسام 18–20 (القرارات والإشعارات والحصيلة اليومية)،
> فيبقى الوصول إليها عبر شريط الأقسام داخل الصفحة أو التمرير إليها.

---

## 14. فجوات الواجهة الموثّقة

| # | الفجوة | الدليل | الأثر |
| :--- | :--- | :--- | :--- |
| 1 | **بلا أي نموذج إنشاء** | `createCrossing`, `updateCrossing`, `getCrossing`, `createScreening`, `createVehicleInspection` غير مستدعاة | الوحدة **قراءة فقط** في 15 من 20 قسماً (5 أقسام فقط لها إجراء: 2 و8 و11 و17 و20) |
| 2 | **بلا نموذج تعديل** | `updateCrossing` غير مستدعى؛ تغيير حالة المعبر يتم بـ `changeCrossingStatus` لا `PATCH crossings/{id}/` | لا يمكن تصحيح بيانات معبر خاطئة من الواجهة |
| 3 | **التصدير في 5 أقسام من 20** | 5 استدعاءات `useTableExport` (263, 544, 1438, 1486, 1616) | **15 قسماً بلا CSV** — منها الفحوصات والشحنات والعيّنات والحجر |
| 4 | **7 جداول بلا فلاتر** | لوحة الأداء · الكادر · حالتا التتبع · الطوارئ · القرارات · الإحصاءات | لا تضييق على حجم السجلات الطويلة |
| 5 | **الأقسام 18–20 خارج قوالب التنقّل** | لا يذكرها أي `NAV` في `borders.tsx` (§13.1) | سجل القرارات والإشعارات والحصيلة لا يقفز إليها أحد من الشريط الجانبي |
| 6 | **11 خريطة حالة متخلّفة** | §12.1 | عرض قيم خام بلا شارة |
| 7 | **3 خرائط معرَّفة وغير مُستعملة** | `borderType`, `borderHealthStatus`, `borderEmergencyStatus` | صيانة بلا فائدة؛ و`borderIncidentStatus` مُستعمل خطأً لجدول الطوارئ (§8) |
| 8 | **قيم حرّة بلا شارة** | `subject_type`, `recipient_role`, `role`, `assignment_type`, `transport_mode`, `sample_type` تُعرض `as is` | لغة إنجليزية داخل واجهة عربية |
| 9 | **فشل الطلب صامت** | `.catch(() => undefined)` في لوحة القيادة فقط | أصفار بلا تفسير عند الخطأ، بخلاف بقية الأقسام |
| 10 | **`QUARANTINE_INSPECTOR` مطابق بصرياً للطبيب** | الاثنان على `MEDICAL_NAV` (§13) | لا يمكن تمييز الدورين في الواجهة رغم اختلاف صلاحياتهما |
| 11 | **تسميات مكرّرة** | `person_name` = «الحالة» و`status` = «الحالة» (قسم الحجر) | غموض في الجدول |

> **ما أُغلق:** `decisions/` و`notifications/` و`daily-statistics/` كانت بلا واجهة، و
> `reassessScreening` و`refreshDailyStatistics` كانتا غير مستدعيتين — جميعها موصولة الآن
> في الأقسام 8 و18 و19 و20. ما زال ناقصاً: `createScreening` و`createVehicleInspection`
> (نموذجان)، ولا نموذج لإرسال إشعار يدوي، ولا نموذج إنشاء قرار.
