# 02_Database_Schema - مخطط قاعدة بيانات نظام صحة المعابر البرية

> التطبيق `backend/apps/borders_health` — الماركة `borders_health`.
> **21 جدولاً**، **21 مفتاحاً أساسياً**، **7 قيود فريدة**، **69 مفتاحاً أجنبياً**، **20 قيد CHECK**، **28 فهرساً يدوياً** (`bh_*`).
> الترحيلات المطبَّقة: `borders_health.0001` … `borders_health.0007` (كلها مطبَّقة في قاعدة التطوير).
> البادئة الإجبارية لكل جدول: `borders_health_`. لا يوجد أي `db_table` مخصص في هذا التطبيق.

## 1. القواعد المشتركة للجداول الـ 21

كل جدول يرث `core.models.BaseModel` (abstract) فلا يُنشئ جدولاً بمفرده، بل يمنح كل نموذج:

| البند | التفصيل |
| :--- | :--- |
| المفتاح الأساسي | `id UUID NOT NULL PRIMARY KEY` — اسم القيد `<table>_pkey` |
| توليد المعرّف | في بايثون عبر `uuid.uuid4` قبل الإدخال — **لا `DEFAULT` على مستوى قاعدة البيانات** |
| `created_at` | `TIMESTAMP WITH TIME ZONE NOT NULL` — `auto_now_add`، بلا قيمة افتراضية في SQL |
| `updated_at` | `TIMESTAMP WITH TIME ZONE NOT NULL` — `auto_now`، يُحدَّث من ORM لا من Trigger |
| أعمدة `CharField` بـ `blank=True` | `NOT NULL` بقيمة افتراضية `''` (نص فارغ، **ليس NULL**) |
| أعمدة `JSONField` بـ `default=list` | `NOT NULL` بقيمة افتراضية `[]` |
| كل أعمدة `choices` | قيمة `default=` من الاختيار — **ولا يولّد Django قيد `CHECK` لقيم `choices`** |

### توزيع الأعمدة الوظيفية

| المجموعة | الجداول | عدد |
| :--- | :--- | :--- |
| المعابر والمرافق والطواقم | `bordercrossing`, `borderfacility`, `bordershift`, `borderstaff` | 4 |
| المسافرون والإقرارات | `travelerhealthrecord`, `healthdeclaration` | 2 |
| الفحص الصحي | `borderscreening` | 1 |
| المركبات والبضائع | `vehicle`, `vehicleinspection`, `cargoinspection` | 3 |
| العيّنات | `bordersample` | 1 |
| الحجر والعزل والتتبّع | `quarantinecase`, `isolationcase`, `contacttracingcase`, `contact` | 4 |
| الحوادث والطوارئ والقرارات والإشعارات | `borderhealthincident`, `borderemergency`, `borderdecision`, `bordernotification` | 4 |
| الشهادات والحصيلة | `bordercertificate`, `borderdailystatistics` | 2 |
| **المجموع** | | **21** |

**نموذجان لا يحملان `crossing_id`:** `borders_health_vehicleinspection` (يرتبط بـ `vehicle_id`) و`borders_health_contact` (يرتبط بـ `tracing_case_id`). لذلك يُشتق نطاقهما بمسار علائقي متعدد القفزات — انظر §7.

---

## 2. الجداول الأساسية (Core Tables)

### 2.1. `borders_health_bordercrossing` — المعابر البرية

سجل المعبر هو **عمود النطاق الوحيد** في التطبيق.

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `entry_point_id` | UUID | لا | — | FK ← `masterdata_entrypoint` (**OneToOne**، `CASCADE`) |
| `border_type` | VARCHAR(10) | لا | `ROAD` | `ROAD` / `RAIL` / `RIVER` |
| `neighbor_country` | VARCHAR(100) | لا | `''` | الدولة المجاورة |
| `operating_status` | VARCHAR(20) | لا | `OPEN` | `OPEN` / `RESTRICTED` / `LIMITED` / `CLOSED` / `EMERGENCY` |
| `operating_hours` | VARCHAR(200) | لا | `''` | ساعات العمل |
| `daily_capacity` | INTEGER | نعم | NULL | السعة اليومية — `CHECK >= 0` |
| `working_agencies` | TEXT | لا | `''` | الجهات العاملة |
| `has_health_facility` | BOOLEAN | لا | `FALSE` | توجد مرفق صحي |
| `has_laboratory` | BOOLEAN | لا | `FALSE` | يوجد مختبر |
| `has_quarantine_facility` | BOOLEAN | لا | `FALSE` | يوجد مرفق حجر |
| `has_isolation_facility` | BOOLEAN | لا | `FALSE` | يوجد مرفق عزل |
| `quarantine_capacity` | INTEGER | نعم | NULL | سعة الحجر — `CHECK >= 0` |
| `closure_reason` | TEXT | لا | `''` | سبب الإغلاق |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_o_xc` (`operating_status`)، `bh_n_xc` (`neighbor_country`).
قيود: `entry_point_id` فريد؛ قيدان `CHECK` على السعات.

### 2.2. `borders_health_borderfacility` — مرافق المعبر

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `kind` | VARCHAR(20) | لا | — | `HEALTH` / `LABORATORY` / `QUARANTINE` / `ISOLATION` / `STORAGE` / `WATER_SANITATION` / `WASTE` / `VECTOR_CONTROL` |
| `name_ar` | VARCHAR(150) | لا | — | الاسم بالعربية |
| `name_en` | VARCHAR(150) | لا | `''` | Name in English |
| `capacity` | INTEGER | نعم | NULL | السعة — `CHECK >= 0` |
| `staff_count` | INTEGER | نعم | NULL | عدد الكادر — `CHECK >= 0` |
| `is_operational` | BOOLEAN | لا | `TRUE` | عامل |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_ck_fac` (`crossing`, `kind`) — قوائم المرافق المفلترة داخل معبر.

### 2.3. `borders_health_bordershift` — الورديات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `shift_date` | DATE | لا | — | تاريخ الوردية |
| `shift_type` | VARCHAR(20) | لا | `MORNING` | `MORNING` / `AFTERNOON` / `NIGHT` / `ROTATING` |
| `started_at` | TIME | نعم | NULL | بداية الوردية |
| `ended_at` | TIME | نعم | NULL | نهاية الوردية |
| `supervisor_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `is_staffed` | BOOLEAN | لا | `TRUE` | الوردية مغطاة بكادر |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_shf` (`crossing`, `shift_date`) — جدول الورديات اليومية للمعبر.

### 2.4. `borders_health_borderstaff` — كادر المعبر

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `user_id` | UUID | لا | — | FK ← `accounts_user` (`PROTECT`) |
| `role` | VARCHAR(30) | لا | — | 9 أدوار من `MANAGER` إلى `EMERGENCY_OFFICER` |
| `assignment_type` | VARCHAR(15) | لا | `FULL_TIME` | `FULL_TIME` / `PART_TIME` / `SECONDMENT` |
| `starts_on` | DATE | نعم | NULL | بداية الإسناد |
| `ends_on` | DATE | نعم | NULL | نهاية الإسناد |
| `is_active` | BOOLEAN | لا | `TRUE` | إسناد سارٍ |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_ci_stf` (`crossing`, `is_active`).
**قيد فريد مركّب:** `unique_border_staff_assignment` على `(crossing_id, user_id, role)` — يمنع إسناد نفس المستخدم نفس الدور مرتين في المعبر نفسه، ويسمح بدور مختلف أو معبر مختلف.

### 2.5. `borders_health_travelerhealthrecord` — سجل صحة المسافر

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `traveler_id` | UUID | لا | — | FK ← `travelers_traveler` (`PROTECT`) |
| `direction` | VARCHAR(10) | لا | `INBOUND` | `INBOUND` / `OUTBOUND` |
| `entry_at` | TIMESTAMPTZ | لا | `timezone.now` | وقت الدخول |
| `departure_country` | VARCHAR(100) | لا | `''` | بلد المغادرة |
| `visited_countries` | JSONB | لا | `[]` | الدول المزارة |
| `transport_mode` | VARCHAR(50) | لا | `''` | وسيلة النقل |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `health_status` | VARCHAR(20) | لا | `FIT` | `FIT` / `UNFIT` / `UNDER_OBSERVATION` |
| `risk_level` | VARCHAR(10) | لا | `GREEN` | `GREEN` / `YELLOW` / `RED` |
| `decision` | VARCHAR(20) | لا | `CLEARED` | `CLEARED` / `HOLD` / `REFERRED` / `QUARANTINED` / `REFUSED_ENTRY` |
| `assessed_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_ce_thr` (`crossing`, `entry_at`)، `bh_tc_thr` (`traveler`, `crossing`)، `bh_cr_thr` (`crossing`, `risk_level`).
**أعلى كثافة فهرسة في التطبيق** (3 فهارس) لأنه أكثر جداول القائمة استعلاماً.

### 2.6. `borders_health_healthdeclaration` — الإقرار الصحي

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `traveler_id` | UUID | لا | — | FK ← `travelers_traveler` (`PROTECT`) |
| `departure_country` | VARCHAR(100) | لا | `''` | بلد المغادرة |
| `departure_date` | DATE | نعم | NULL | تاريخ المغادرة |
| `visited_countries` | JSONB | لا | `[]` | الدول المزارة |
| `health_conditions` | TEXT | لا | `''` | الحالة الصحية |
| `current_symptoms` | TEXT | لا | `''` | الأعراض الحالية |
| `contact_name` | VARCHAR(150) | لا | `''` | اسم جهة الاتصال |
| `contact_phone` | VARCHAR(30) | لا | `''` | هاتف جهة الاتصال |
| `declared_at` | TIMESTAMPTZ | لا | — | وقت الإقرار |
| `status` | VARCHAR(15) | لا | `PENDING` | 4 حالات |
| `reviewed_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_cd_dcl` (`crossing`, `declared_at`)، `bh_tc_dcl` (`traveler`, `crossing`).

### 2.7. `borders_health_borderscreening` — الفحص الصحي

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `traveler_id` | UUID | لا | — | FK ← `travelers_traveler` (`PROTECT`) |
| `shared_screening_id` | UUID | نعم | NULL | FK ← `screening_healthscreening` (`SET_NULL`) |
| `body_temperature` | DOUBLE PRECISION | نعم | NULL | درجة الحرارة — **بلا قيد `BETWEEN`** |
| `oxygen_saturation` | DOUBLE PRECISION | نعم | NULL | تشبّع الأكسجين — **بلا قيد `BETWEEN 50 AND 100`** |
| `observed_symptoms` | JSONB | لا | `[]` | الأعراض المرصودة (قائمة بعد التطبيع) |
| `risk_level` | VARCHAR(10) | لا | `''` | مستوى الخطر — **يُشتق في الشيفرة، لا يُقبل من العميل** |
| `document_verified` | BOOLEAN | لا | `FALSE` | التحقق من الوثائق |
| `vaccination_verified` | BOOLEAN | لا | `FALSE` | التحقق من شهادة التطعيم |
| `screening_certificate_id` | UUID | نعم | NULL | FK ← `vaccination_vaccinationcertificate` (`SET_NULL`) |
| `decision` | VARCHAR(20) | لا | `CLEARED` | `CLEARED` / `HOLD` / `REFERRED` / `QUARANTINED` |
| `screened_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `screened_at` | TIMESTAMPTZ | لا | — | وقت الفحص |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_cs_scr` (`crossing`, `screened_at`)، `bh_tc_scr` (`traveler`, `crossing`)، `bh_cd_scr` (`crossing`, `decision`).

### 2.8. `borders_health_vehicle` — المركبات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `plate_number` | VARCHAR(30) | لا | — | لوحة المركبة — **فريد عالميًا** |
| `chassis_number` | VARCHAR(50) | لا | `''` | رقم الهيكل |
| `vehicle_type` | VARCHAR(25) | لا | `TRUCK` | 8 أنواع |
| `make_model` | VARCHAR(100) | لا | `''` | النوع والموديل |
| `year_of_manufacture` | SMALLINT | نعم | NULL | سنة الصنع — `CHECK >= 0`، **بلا حدّ أعلى** |
| `capacity` | INTEGER | نعم | NULL | السعة — `CHECK >= 0` |
| `owner_name` | VARCHAR(200) | لا | `''` | اسم المالك |
| `driver_name` | VARCHAR(150) | لا | `''` | اسم السائق |
| `driver_phone` | VARCHAR(30) | لا | `''` | هاتف السائق |
| `status` | VARCHAR(20) | لا | `ACTIVE` | `ACTIVE` / `UNDER_QUARANTINE` / `CONDEMNED` |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_veh` (`crossing`, `status`).
**ملاحظة نطاق:** فريدية `plate_number` **عالمية لا لكل معبر** — يفترض النظام أن اللوحات لا تُعاد بين المعابر. تغيير ذلك يتطلب ترحيلاً.

### 2.9. `borders_health_vehicleinspection` — تفتيش المركبات

**لا يحمل `crossing_id`** — يُشتق نطاقه عبر `vehicle__crossing__entry_point`.

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `vehicle_id` | UUID | لا | — | FK ← `borders_health_vehicle` (`CASCADE`) |
| `inspection_type` | VARCHAR(20) | لا | — | 7 أنواع |
| `inspection_date` | TIMESTAMPTZ | لا | — | تاريخ التفتيش |
| `inspector_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `cleanliness_status` | VARCHAR(20) | لا | — | حالة النظافة |
| `pest_control_status` | VARCHAR(20) | لا | — | حالة مكافحة الحشرات |
| `waste_status` | VARCHAR(20) | لا | — | حالة النفايات |
| `cooling_status` | VARCHAR(20) | لا | — | حالة التبريد |
| `findings` | TEXT | لا | `''` | الملاحظات |
| `overall_status` | VARCHAR(15) | لا | — | `PASSED` / `CONDITIONAL` / `FAILED` |
| `reinspection_required` | BOOLEAN | لا | `FALSE` | يحتاج إعادة تفتيش |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_vi_vin` (`vehicle`, `inspection_date`).

### 2.10. `borders_health_cargoinspection` — تفتيش البضائع

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `scope` | VARCHAR(20) | لا | `CARGO` | `CARGO` / `FOOD` / `WAREHOUSE` / `WATER_SANITATION` |
| `food_shipment_id` | UUID | نعم | NULL | FK ← `food_quarantine_foodshipment` (`SET_NULL`) |
| `facility_id` | UUID | نعم | NULL | FK ← `borders_health_borderfacility` (`SET_NULL`) |
| `declaration_number` | VARCHAR(50) | لا | `''` | رقم البيان |
| `product_type` | VARCHAR(150) | لا | `''` | نوع المنتج |
| `country_of_origin` | VARCHAR(100) | لا | `''` | بلد المنشأ |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `samples_collected` | INTEGER | لا | `0` | عدد العيّنات — `CHECK >= 0` |
| `laboratory_result` | TEXT | لا | `''` | نتيجة المختبر |
| `status` | VARCHAR(20) | لا | — | 7 حالات |
| `decision` | VARCHAR(15) | لا | `''` | `CLEARED` / `CONDITIONAL` / `HOLD` / `REJECTED` |
| `decided_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `decided_at` | TIMESTAMPTZ | نعم | NULL | وقت القرار |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_css_crg` (`crossing`, `scope`, `status`) — فهرس ثلاثي للقوائم المفلترة.
**تصادم اسم في OpenAPI:** `CargoInspection` اسم مشترك مع `port_health.CargoInspection`.

### 2.11. `borders_health_bordersample` — العيّنات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `lab_sample_id` | UUID | نعم | NULL | FK ← `laboratory_labsample` (`SET_NULL`) |
| `cargo_inspection_id` | UUID | نعم | NULL | FK ← `borders_health_cargoinspection` (`CASCADE`) |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `sample_code` | VARCHAR(40) | لا | `''` | رمز العيّنة — **غير فريد** |
| `sample_type` | VARCHAR(100) | لا | `''` | نوع العيّنة (نص حر) |
| `collected_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `collected_at` | TIMESTAMPTZ | لا | — | وقت السحب |
| `status` | VARCHAR(20) | لا | — | 5 حالات |
| `result` | TEXT | لا | `''` | النتيجة |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_cc_smp` (`crossing`, `collected_at`)، `bh_cs_smp` (`cargo_inspection`, `status`).

### 2.12. `borders_health_quarantinecase` — حالات الحجر

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `case_number` | VARCHAR(30) | **نعم** | NULL | رقم الحالة — **فريد وقابل لـ NULL**، انظر §3 |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `traveler_id` | UUID | نعم | NULL | FK ← `travelers_traveler` (`PROTECT`) |
| `person_name` | VARCHAR(200) | لا | `''` | اسم الشخص |
| `health_case_id` | UUID | نعم | NULL | FK ← `emergency_eoc_healthcase` (`SET_NULL`) |
| `disease_id` | UUID | نعم | NULL | FK ← `laboratory_disease` (`SET_NULL`) |
| `clinic_id` | UUID | نعم | NULL | FK ← `clinic_clinic` (`SET_NULL`) |
| `facility_id` | UUID | نعم | NULL | FK ← `borders_health_borderfacility` (`SET_NULL`) |
| `entry_at` | TIMESTAMPTZ | لا | — | وقت الدخول للحجر |
| `required_days` | SMALLINT | لا | `14` | المدة المطلوبة — `CHECK >= 0` |
| `expected_end_date` | DATE | نعم | NULL | تاريخ النهاية المتوقع |
| `actual_end_date` | DATE | نعم | NULL | تاريخ النهاية الفعلي |
| `phase` | VARCHAR(20) | لا | `SCREENING` | 7 مراحل |
| `status` | VARCHAR(20) | لا | `ACTIVE` | 5 حالات |
| `follow_up_notes` | TEXT | لا | `''` | ملاحظات المتابعة |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهارس: `bh_cs_qua` (`crossing`, `status`)، `bh_ce_qua` (`crossing`, `entry_at`).

### 2.13. `borders_health_isolationcase` — حالات العزل

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `quarantine_case_id` | UUID | نعم | NULL | FK ← `borders_health_quarantinecase` (`CASCADE`) |
| `clinic_isolation_id` | UUID | نعم | NULL | FK ← `clinic_isolationrecord` (`SET_NULL`) |
| `facility_id` | UUID | نعم | NULL | FK ← `borders_health_borderfacility` (`SET_NULL`) |
| `start_date` | DATE | لا | — | تاريخ البداية |
| `expected_end_date` | DATE | نعم | NULL | النهاية المتوقعة |
| `end_date` | DATE | نعم | NULL | النهاية الفعلية |
| `status` | VARCHAR(10) | لا | `ACTIVE` | 3 حالات |
| `started_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `closed_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_iso` (`crossing`, `status`).
**بلا قيد ترتيب زمني** على `end_date` مقابل `expected_end_date`.

### 2.14. `borders_health_contacttracingcase` — حالات تتبّع المخالطين

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `case_id` | UUID | نعم | NULL | FK ← `borders_health_quarantinecase` (`CASCADE`) |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `index_case_name` | VARCHAR(200) | لا | `''` | اسم الحالة المفهرسة |
| `transport_mode` | VARCHAR(50) | لا | `''` | وسيلة النقل |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `shared_contact_trace_id` | UUID | نعم | NULL | FK ← `emergency_eoc_contacttrace` (`SET_NULL`) |
| `follow_up_days` | SMALLINT | لا | `14` | أيام المتابعة — `CHECK >= 0` |
| `started_at` | TIMESTAMPTZ | لا | — | تاريخ البدء |
| `status` | VARCHAR(15) | لا | `PENDING` | 4 حالات |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_ctc` (`crossing`, `status`).

### 2.15. `borders_health_contact` — المخالطون

**لا يحمل `crossing_id`** — يُشتق نطاقه عبر `tracing_case__crossing__entry_point`.

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `tracing_case_id` | UUID | لا | — | FK ← `borders_health_contacttracingcase` (`CASCADE`) |
| `full_name` | VARCHAR(200) | لا | — | الاسم الكامل |
| `passport_number` | VARCHAR(40) | لا | `''` | رقم جواز السفر |
| `phone` | VARCHAR(30) | لا | `''` | الهاتف |
| `seat_or_relation` | VARCHAR(60) | لا | `''` | المقعد أو صلة القرابة |
| `status` | VARCHAR(15) | لا | `PENDING` | 6 حالات |
| `follow_up_day` | SMALLINT | لا | `0` | يوم المتابعة — `CHECK >= 0` |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_ts_con` (`tracing_case`, `status`).

### 2.16. `borders_health_borderhealthincident` — الحوادث الصحية

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `quarantine_case_id` | UUID | نعم | NULL | FK ← `borders_health_quarantinecase` (`SET_NULL`) |
| `title` | VARCHAR(200) | لا | — | العنوان |
| `description` | TEXT | لا | `''` | الوصف |
| `severity` | VARCHAR(10) | لا | — | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `status` | VARCHAR(15) | لا | `OPEN` | 4 حالات |
| `reported_at` | TIMESTAMPTZ | لا | — | وقت البلاغ |
| `closed_at` | TIMESTAMPTZ | نعم | NULL | وقت الإغلاق |
| `reported_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_inc` (`crossing`, `status`).

### 2.17. `borders_health_borderemergency` — الطوارئ

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `shared_event_id` | UUID | نعم | NULL | FK ← `emergency_eoc_emergencyevent` (`SET_NULL`) |
| `disease_id` | UUID | نعم | NULL | FK ← `laboratory_disease` (`SET_NULL`) |
| `title` | VARCHAR(200) | لا | — | العنوان |
| `description` | TEXT | لا | `''` | الوصف |
| `restriction_level` | VARCHAR(25) | لا | — | 5 مستويات تقييد |
| `status` | VARCHAR(15) | لا | `ACTIVE` | 4 حالات |
| `reported_at` | TIMESTAMPTZ | لا | — | وقت البلاغ |
| `resolved_at` | TIMESTAMPTZ | نعم | NULL | وقت الحل |
| `reported_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_emg` (`crossing`, `status`).

### 2.18. `borders_health_bordercertificate` — الشهادات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `certificate_number` | VARCHAR(50) | لا | — | رقم الشهادة — **فريد عالميًا**، يُولَّد في الخادم |
| `certificate_type` | VARCHAR(25) | لا | — | 5 أنواع |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `traveler_id` | UUID | نعم | NULL | FK ← `travelers_traveler` (`PROTECT`) |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `vehicle_inspection_id` | UUID | نعم | NULL | FK ← `borders_health_vehicleinspection` (`SET_NULL`) |
| `issue_date` | DATE | لا | — | تاريخ الإصدار |
| `expiry_date` | DATE | نعم | NULL | تاريخ الانتهاء |
| `status` | VARCHAR(15) | لا | `VALID` | 5 حالات |
| `qr_payload` | VARCHAR(500) | لا | `''` | محتوى QR — **يُولَّد في الخادم لا من العميل** |
| `issued_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `notes` | TEXT | لا | `''` | ملاحظات |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_ci_crt` (`crossing`, `issue_date`).
**قيد في الخدمة:** المركبة والتفتيش المرتبطان بالشهادة يجب أن ينتميا إلى **نفس `crossing`** وإلا رُفض الإصدار.

### 2.19. `borders_health_borderdecision` — سجل القرارات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `subject_type` | VARCHAR(30) | لا | `''` | نوع موضوع القرار |
| `traveler_id` | UUID | نعم | NULL | FK ← `travelers_traveler` (`PROTECT`) |
| `vehicle_id` | UUID | نعم | NULL | FK ← `borders_health_vehicle` (`SET_NULL`) |
| `cargo_inspection_id` | UUID | نعم | NULL | FK ← `borders_health_cargoinspection` (`SET_NULL`) |
| `quarantine_case_id` | UUID | نعم | NULL | FK ← `borders_health_quarantinecase` (`SET_NULL`) |
| `outcome` | VARCHAR(20) | لا | `CLEARED` | `CLEARED` / `CONDITIONAL` / `HOLD` / `REFERRED` / `REJECTED` / `ENFORCEMENT` |
| `reason` | TEXT | لا | `''` | السبب |
| `decided_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `decided_at` | TIMESTAMPTZ | لا | — | وقت القرار |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cd_dec` (`crossing`, `decided_at`).

### 2.20. `borders_health_bordernotification` — سجل الإشعارات

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `recipient_role` | VARCHAR(40) | لا | `''` | دور المستلم |
| `recipient_contact` | VARCHAR(120) | لا | `''` | جهة اتصال المستلم |
| `title` | VARCHAR(200) | لا | — | العنوان |
| `body` | TEXT | لا | `''` | النص |
| `channel` | VARCHAR(15) | لا | `INTERNAL` | `INTERNAL` / `EMAIL` / `SMS` / `PUSH` |
| `status` | VARCHAR(10) | لا | `PENDING` | `PENDING` / `SENT` / `FAILED` |
| `sent_at` | TIMESTAMPTZ | نعم | NULL | وقت الإرسال |
| `sent_by_id` | UUID | نعم | NULL | FK ← `accounts_user` (`PROTECT`) |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

فهرس: `bh_cs_ntf` (`crossing`, `sent_at`).

### 2.21. `borders_health_borderdailystatistics` — الحصيلة اليومية

**النموذج الوحيد بلا فهرس `bh_*`** لأن القيد الفريد المركّب يخدم نفس الغرض.

| العمود | النوع | Null | افتراضي | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | لا | — | المفتاح الأساسي |
| `crossing_id` | UUID | لا | — | FK ← `borders_health_bordercrossing` (`CASCADE`) |
| `stat_date` | DATE | لا | — | يوم الإحصاء |
| `travelers_inbound` | INTEGER | لا | `0` | الوافدون — `CHECK >= 0` |
| `travelers_outbound` | INTEGER | لا | `0` | المغادرون — `CHECK >= 0` |
| `vehicles_inspected` | INTEGER | لا | `0` | المركبات المفتَّشة — `CHECK >= 0` |
| `cargo_inspections` | INTEGER | لا | `0` | عمليات فحص البضائع — `CHECK >= 0` |
| `quarantine_cases` | INTEGER | لا | `0` | حالات الحجر — `CHECK >= 0` |
| `isolation_cases` | INTEGER | لا | `0` | حالات العزل — `CHECK >= 0` |
| `suspected_cases` | INTEGER | لا | `0` | الحالات المشتبه بها — `CHECK >= 0` |
| `certificates_issued` | INTEGER | لا | `0` | الشهادات الصادرة — `CHECK >= 0` |
| `samples_collected` | INTEGER | لا | `0` | العيّنات المسحوبة — `CHECK >= 0` |
| `average_processing_minutes` | INTEGER | نعم | NULL | متوسط دقائق المعالجة — `CHECK >= 0` |
| `created_at` | TIMESTAMPTZ | لا | — | التدقيق |
| `updated_at` | TIMESTAMPTZ | لا | — | التدقيق |

**قيد فريد مركّب:** `unique_border_daily_statistic` على `(crossing_id, stat_date)` — صف واحد لكل معبر في اليوم، يجعل `update_or_create` في `refresh_daily_statistics` آمناً ويمنع تكرار الإحصاء.

---

## 3. القيود (Constraints)

### 3.1. القيود الفريدة (7)

| # | الجدول | القيد | الأعمدة | السبب |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `borders_health_bordercrossing` | `borders_health_bordercrossing_entry_point_id_key` | `entry_point_id` | منفذ بري واحد إلى سجل `BorderCrossing` واحد على الأكثر |
| 2 | `borders_health_borderstaff` | `unique_border_staff_assignment` | `(crossing_id, user_id, role)` | يمنع تكرار إسناد المستخدم بالدور نفسه في المعبر نفسه |
| 3 | `borders_health_borderdailystatistics` | `unique_border_daily_statistic` | `(crossing_id, stat_date)` | صف واحد لكل معبر في اليوم |
| 4 | `borders_health_vehicle` | `borders_health_vehicle_plate_number_key` | `plate_number` | **فريد عالمياً** لا لكل معبر |
| 5 | `borders_health_quarantinecase` | `borders_health_quarantinecase_case_number_key` | `case_number` | فريد **و NULL مسموح** — انظر §3.2 |
| 6 | `borders_health_bordercertificate` | `borders_health_bordercertificate_certificate_number_key` | `certificate_number` | مرجع التحقق من الشهادة عبر `qr_payload` |
| 7 | `borders_health_bordersample` | — | `sample_code` | **غير فريد** (لا قيد): الترقيم الفعلي في `laboratory_labsample` |

### 3.2. `case_number` — قيد فريد على عمود قابل لـ NULL

**العمود:** `borders_health_quarantinecase.case_number VARCHAR(30) UNIQUE NULL`

| الحالة | السلوك في Postgres |
| :--- | :--- |
| `UNIQUE` + `NOT NULL` + `DEFAULT ''` | الصف الثاني بلا رقم يخالف القيد، وتفشل كل عمليات `bulk_create` لأن التوليد في `save()` فقط |
| `UNIQUE` + `NOT NULL` بلا افتراضي | الإدخال يفشل عند غياب الرقم |
 | **`UNIQUE` + `NULL`** | Postgres يعتبر قيم `NULL` **متميزة** في فهرس `UNIQUE`، فيسمح بعدة صفوف بلا رقم |

**الترحيل المسؤول:** `borders_health.0006` (`0006_alter_quarantinecase_case_number`) نفّذ التحول من `unique + default=''` إلى `unique + null=True`.

**التوليد:** `QuarantineCase.save()` يبني `case_number = 'Q-' + YYMMDD + '-' + أول 8 محارف من UUID بأحرف كبيرة`، مثل `Q-260930-A1B2C3D4`. الاعتماد على جزء من `BaseModel.id` المولَّد بـ `uuid4` يضمن التفرّد بلا عدّاد تسلسلي.

**تحذير تشغيلي:** `bulk_create` و`queryset.update()` لا يمرّان على `save()`، فيمكن أن تُدخل صفوف بـ `case_number IS NULL`. أي استعلام يعتمد على اكتمال الترقيم يجب أن يتعامل مع `NULL` صراحةً. ينطبق التحذير نفسه على `bordercertificate.certificate_number`.

### 3.3. سلوك المفاتيح الأجنبية و`ON DELETE`

**حقيقة مهمة:** Django **لا يُصدر بنود `ON DELETE` على مستوى قاعدة البيانات إطلاقاً.** كل قيد مفتاح أجنبي يُنشأ بصيغة `FOREIGN KEY (...) REFERENCES ... DEFERRABLE INITIALLY DEFERRED`، أي أن سلوك Postgres الفعلي هو `NO ACTION`. قيم `on_delete` أدناه **نيّة التطبيق** تُنفَّذ في طبقة ORM.

| السلوك | العدد | المجموعات |
| :--- | :--- | :--- |
| `CASCADE` | 24 | كل `crossing_id` (18 جدولاً)، `bordercrossing.entry_point_id`، `vehicleinspection.vehicle_id`، `bordersample.cargo_inspection_id`، `isolationcase.quarantine_case_id`، `contacttracingcase.case_id`، `contact.tracing_case_id` |
| `PROTECT` | 21 | كل المراجع إلى `accounts_user` (15 مفتاحاً) و`travelers_traveler` (6 مفاتيح) |
| `SET_NULL` | 24 | كل المراجع الخارجية: `food_quarantine_foodshipment`, `screening_healthscreening`, `vaccination_vaccinationcertificate`, `laboratory_labsample`, `laboratory_disease` (×2), `emergency_eoc_healthcase`, `emergency_eoc_contacttrace`, `emergency_eoc_emergencyevent`, `clinic_clinic`, `clinic_isolationrecord`، والمراجع الداخلية الاختيارية `facility_id` و`vehicle_id` |

| السيناريو | السلوك |
| :--- | :--- |
| حذف `masterdata.EntryPoint` | ORM يحذف `BorderCrossing` ثم كل سجلاته التشغيلية (`CASCADE`) |
| حذف `accounts.User` مُسنَد بمعبر | يُرفض بـ `ProtectedError` ما دام له سجل إسناد أو فحص أو قرار |
| حذف `laboratory.Disease` مستخدم في حجر أو طوارئ | الحذف ينجح، ويصبح `disease_id = NULL` ويبقى باقي السجل |
| `DELETE` مباشر من خارج Django | **لا يُطبَّق أي `CASCADE`**: Postgres يمنع حذف الأب بـ `NO ACTION`، و`SET NULL` لا يحدث |

### 3.4. قيود `CHECK` (20)

Django يولّد قيداً واحداً لكل `PositiveIntegerField` / `PositiveSmallIntegerField`، ولا يولّد أي `CHECK` لقيم `choices`:

| الجدول | القيد | الشرط |
| :--- | :--- | :--- |
| `borders_health_bordercrossing` | `borders_health_bordercrossing_daily_capacity_check` | `daily_capacity >= 0` |
| `borders_health_bordercrossing` | `borders_health_bordercrossing_quarantine_capacity_check` | `quarantine_capacity >= 0` |
| `borders_health_borderfacility` | `borders_health_borderfacility_capacity_check` | `capacity >= 0` |
| `borders_health_borderfacility` | `borders_health_borderfacility_staff_count_check` | `staff_count >= 0` |
| `borders_health_vehicle` | `borders_health_vehicle_capacity_check` | `capacity >= 0` |
| `borders_health_vehicle` | `borders_health_vehicle_year_of_manufacture_check` | `year_of_manufacture >= 0` |
| `borders_health_cargoinspection` | `borders_health_cargoinspection_samples_collected_check` | `samples_collected >= 0` |
| `borders_health_quarantinecase` | `borders_health_quarantinecase_required_days_check` | `required_days >= 0` |
| `borders_health_contacttracingcase` | `borders_health_contacttracingcase_follow_up_days_check` | `follow_up_days >= 0` |
| `borders_health_contact` | `borders_health_contact_follow_up_day_check` | `follow_up_day >= 0` |
| `borders_health_borderdailystatistics` | `..._travelers_inbound_check` | `travelers_inbound >= 0` |
| `borders_health_borderdailystatistics` | `..._travelers_outbound_check` | `travelers_outbound >= 0` |
| `borders_health_borderdailystatistics` | `..._vehicles_inspected_check` | `vehicles_inspected >= 0` |
| `borders_health_borderdailystatistics` | `..._cargo_inspections_check` | `cargo_inspections >= 0` |
| `borders_health_borderdailystatistics` | `..._quarantine_cases_check` | `quarantine_cases >= 0` |
| `borders_health_borderdailystatistics` | `..._isolation_cases_check` | `isolation_cases >= 0` |
| `borders_health_borderdailystatistics` | `..._suspected_cases_check` | `suspected_cases >= 0` |
| `borders_health_borderdailystatistics` | `..._certificates_issued_check` | `certificates_issued >= 0` |
| `borders_health_borderdailystatistics` | `..._samples_collected_check` | `samples_collected >= 0` |
| `borders_health_borderdailystatistics` | `..._average_processing_minutes_check` | `average_processing_minutes >= 0` |

### 3.5. ثغرات التحقق القائمة (مقصودة أو متبقية)

| الجدول | العمود | الملاحظة |
| :--- | :--- | :--- |
| `borders_health_borderscreening` | `body_temperature` | لا قيد `BETWEEN 30 AND 45` (بعكس `screening_healthscreenings` في المنصة) |
| `borders_health_borderscreening` | `oxygen_saturation` | لا قيد `BETWEEN 50 AND 100`، والنوع `DOUBLE PRECISION` |
| `borders_health_vehicle` | `year_of_manufacture` | لا حدّ أعلى (سنة 9999 مقبولة) |
| `borders_health_isolationcase` | `expected_end_date` / `end_date` | لا قيد ترتيب زمني `end_date >= expected_end_date` |
| `borders_health_quarantinecase` | `expected_end_date` / `actual_end_date` | لا قيد ترتيب زمني، ولا تحقق `actual_end_date = entry_at + required_days` |
| كل الأعمدة ذات `choices` | — | **حرة تماماً في SQL**؛ الإدراج المباشر عبر SQL أو `bulk_create` يتجاوز تحقق النماذج |

---

## 4. العلاقات (Relationships)

### 4.1. منفذ بري إلى سجل معبر

```
masterdata_entrypoint  1 ---- 1  borders_health_bordercrossing
```

`BorderCrossing` هو جذر شجرة التطبيق: كل جدول آخر إما يرتبط به مباشرة بـ `crossing_id`، أو يرتبط بجدولين بينهما معبر واحد.

### 4.2. الجداول المرتبطة مباشرة بـ `bordercrossing`

كل الجداول التالية تحمل `crossing_id UUID NOT NULL` ← `borders_health_bordercrossing` بـ `on_delete=CASCADE`، ولهذا تبدأ فهارسها المركّبة بـ `crossing_id`:

`borderfacility`, `bordershift`, `borderstaff`, `travelerhealthrecord`, `healthdeclaration`, `borderscreening`, `vehicle`, `cargoinspection`, `bordersample`, `quarantinecase`, `isolationcase`, `contacttracingcase`, `borderhealthincident`, `borderemergency`, `bordercertificate`, `borderdecision`, `bordernotification`, `borderdailystatistics` — **18 جدولاً**.

### 4.3. الجداول ذات المسار متعدد القفزات

| الجدول | المسار العلائقي إلى نقطة الدخول | عدد المستويات |
| :--- | :--- | :--- |
| `borders_health_vehicleinspection` | `vehicle__crossing__entry_point` | 3 |
| `borders_health_contact` | `tracing_case__crossing__entry_point` | 3 |

### 4.4. خريطة العلاقات الداخلية للتطبيق

```
BorderCrossing
├── BorderFacility ────────────── (facility_id اختياري في 3 جداول)
├── BorderShift ── supervisor ──► accounts.User
├── BorderStaff ─── user ───────► accounts.User
├── TravelerHealthRecord ──┬── traveler ──► travelers.Traveler
│                         └── vehicle ───► Vehicle
├── HealthDeclaration ────── traveler ──► travelers.Traveler
├── BorderScreening ────────┬── traveler ──► travelers.Traveler
│                          ├── shared_screening ──► screening.HealthScreening
│                          └── screening_certificate ──► vaccination.VaccinationCertificate
├── Vehicle
│   └── VehicleInspection ── inspector ──► accounts.User
│       └── (BorderCertificate.vehicle_inspection_id)
├── CargoInspection ──┬── food_shipment ──► food_quarantine.FoodShipment
│                     ├── facility ──────► BorderFacility
│                     └── vehicle ───────► Vehicle
│                         └── BorderSample ── lab_sample ──► laboratory.LabSample
├── BorderSample ─────┬── cargo_inspection ► CargoInspection
│                    └── vehicle ─────────► Vehicle
├── QuarantineCase ──┬── traveler ────────► travelers.Traveler
│                    ├── health_case ─────► emergency_eoc.HealthCase
│                    ├── disease ─────────► laboratory.Disease
│                    ├── clinic ──────────► clinic.Clinic
│                    ├── facility ────────► BorderFacility
│                    ├── IsolationCase ─── clinic_isolation ► clinic.IsolationRecord
│                    │   └── facility ──► BorderFacility
│                    └── ContactTracingCase ─┬── vehicle ──► Vehicle
│                                           ├── shared_contact_trace ► emergency_eoc.ContactTrace
│                                           └── Contact
├── BorderHealthIncident ── quarantine_case ► QuarantineCase
├── BorderEmergency ─────── disease ────────► laboratory.Disease
│                       └── shared_event ──► emergency_eoc.EmergencyEvent
├── BorderCertificate ─────┬── traveler ────► travelers.Traveler
│                          ├── vehicle ─────► Vehicle
│                          └── vehicle_inspection ► VehicleInspection
├── BorderDecision ────────┬── traveler ────► travelers.Traveler
│                          ├── vehicle ─────► Vehicle
│                          ├── cargo_inspection ► CargoInspection
│                          └── quarantine_case ► QuarantineCase
├── BorderNotification ──── sent_by ───────► accounts.User
└── BorderDailyStatistics
```

### 4.5. ملاحظات تصميم العلاقات

| الملاحظة | التفصيل |
| :--- | :--- |
| `facility_id` داخلي | يشير إلى `borders_health_borderfacility` لا إلى `clinic.Clinic` — احترام حدود التطبيق |
| مراجع `PROTECT` | لا يُحذف مستخدم أو مسافر لسجلاته المنسوبة إلى معبر |
| مراجع `SET_NULL` الخارجية | لا يُفقد سجل وبائي لمجرد حذف `Disease` أو `Clinic` أو `LabSample` |
| `CargoInspection` و`HealthDeclaration` | أسماء النماذج **مشتركة** مع `port_health`؛ تُميَّز في SQL بالبادئة `borders_health_` |
| `BorderSample.sample_code` | غير فريد؛ الترقيم الفعلي في `laboratory_labsample` |

---

## 5. الفهارس (Indexes)

### 5.1. ملخص الفهارس الـ 28

كلها فهارس B-tree عادية بلا شرط جزئي (`condition=None`)، وكلها تسلسل أعمدة يبدأ بعمود النطاق لتحسين قوائم المرور بـ `?ordering=` المقيّدة بنطاق المستخدم.

| # | الجدول | اسم الفهرس | الأعمدة | غرض الاستعلام |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `bordercrossing` | `bh_o_xc` | `operating_status` | تصفية المعابر بالحالة التشغيلية |
| 2 | `bordercrossing` | `bh_n_xc` | `neighbor_country` | تصفية بالدولة المجاورة |
| 3 | `borderfacility` | `bh_ck_fac` | `crossing`, `kind` | مرافق معبر بنوع |
| 4 | `bordershift` | `bh_cs_shf` | `crossing`, `shift_date` | جدول الورديات اليومية |
| 5 | `borderstaff` | `bh_ci_stf` | `crossing`, `is_active` | كادر معبر النشط |
| 6 | `travelerhealthrecord` | `bh_ce_thr` | `crossing`, `entry_at` | سجل الوصول مرتّباً زمنياً |
| 7 | `travelerhealthrecord` | `bh_tc_thr` | `traveler`, `crossing` | تاريخ مسافر عبر المعابر |
| 8 | `travelerhealthrecord` | `bh_cr_thr` | `crossing`, `risk_level` | توزيع الخطر داخل المعبر |
| 9 | `healthdeclaration` | `bh_cd_dcl` | `crossing`, `declared_at` | الإقرارات مرتّبة زمنياً |
| 10 | `healthdeclaration` | `bh_tc_dcl` | `traveler`, `crossing` | إقرارات مسافر |
| 11 | `borderscreening` | `bh_cs_scr` | `crossing`, `screened_at` | الفحوصات مرتّبة زمنياً |
| 12 | `borderscreening` | `bh_tc_scr` | `traveler`, `crossing` | فحوصات مسافر |
| 13 | `borderscreening` | `bh_cd_scr` | `crossing`, `decision` | فحوصات معبر بقرار |
| 14 | `vehicle` | `bh_cs_veh` | `crossing`, `status` | مركبات معبر بحالة |
| 15 | `vehicleinspection` | `bh_vi_vin` | `vehicle`, `inspection_date` | تفتيشات مركبة مرتّبة |
| 16 | `cargoinspection` | `bh_css_crg` | `crossing`, `scope`, `status` | شحنات معبر بنطاق وحالة |
| 17 | `bordersample` | `bh_cc_smp` | `crossing`, `collected_at` | عيّنات معبر مرتّبة |
| 18 | `bordersample` | `bh_cs_smp` | `cargo_inspection`, `status` | عيّنات شحنة بحالة |
| 19 | `quarantinecase` | `bh_cs_qua` | `crossing`, `status` | حالات حجر المعبر |
| 20 | `quarantinecase` | `bh_ce_qua` | `crossing`, `entry_at` | دخول الحجر مرتّباً زمنياً |
| 21 | `isolationcase` | `bh_cs_iso` | `crossing`, `status` | حالات عزل المعبر |
| 22 | `contacttracingcase` | `bh_cs_ctc` | `crossing`, `status` | حالات تتبّع المعبر |
| 23 | `contact` | `bh_ts_con` | `tracing_case`, `status` | مخالطو حالة بحالة |
| 24 | `borderhealthincident` | `bh_cs_inc` | `crossing`, `status` | حوادث المعبر |
| 25 | `borderemergency` | `bh_cs_emg` | `crossing`, `status` | طوارئ المعبر |
| 26 | `bordercertificate` | `bh_ci_crt` | `crossing`, `issue_date` | شهادات المعبر مرتّبة |
| 27 | `borderdecision` | `bh_cd_dec` | `crossing`, `decided_at` | قرارات المعبر مرتّبة |
| 28 | `bordernotification` | `bh_cs_ntf` | `crossing`, `sent_at` | إشعارات المعبر مرتّبة |

### 5.2. توزيع الفهارس على الجداول

| عدد الفهارس | الجداول |
| :--- | :--- |
| 0 | `borderdailystatistics` (القيد الفريد المركّب يكفي) |
| 1 | `borderfacility`, `bordershift`, `borderstaff`, `vehicle`, `vehicleinspection`, `cargoinspection`, `quarantinecase` (واحد من اثنين), `isolationcase`, `contacttracingcase`, `contact`, `borderhealthincident`, `borderemergency`, `bordercertificate`, `borderdecision`, `bordernotification` |
| 2 | `bordercrossing`, `healthdeclaration`, `bordersample`, `quarantinecase` (اثنان) |
| 3 | `travelerhealthrecord`, `borderscreening` |

### 5.3. التسمية

نمط التسمية: `bh_` + رمزان للمجال + رمزان للجدول + رمزان للترتيب، وكل الأحرف صغيرة. أمثلة: `bh_ci_crt` (`bordercertificate`, `crossing`, `issue_date`)، `bh_vi_vin` (`vehicleinspection`, `vehicle`, `inspection_date`)، `bh_ts_con` (`contact`, `tracing_case`, `status`).

**الترحيلات 0002–0005** لم تضف فهارس بل عدّلت أعمدة المفاتيح الأجنبية (`on_delete` من `CASCADE` إلى `SET_NULL` على مراجع خارجية، ومن `CASCADE` إلى `PROTECT` على مراجع المستخدمين والمسافرين). **الترحيل 0007** هو وحده الذي أضاف الفهارس الـ 28.

### 5.4. حالة الفهارس في قاعدة التطوير

| القياس | القيمة |
| :--- | :--- |
| جداول `borders_health_%` | 21 |
| فهارس `bh_*` | 28 |
| ترحيلات مطبَّقة | 7 (`0001` … `0007`) |

الفهارس الفريدة المولَّدة تلقائياً (`<table>_pkey`, `..._entry_point_id_key`, `..._plate_number_key`, `..._case_number_key`, `..._certificate_number_key`) وفهارس المفاتيح الأجنبية التلقائية (`..._crossing_id_...` وغيرها) ليست ضمن الـ 28؛ الـ 28 هي الفهارس المُعرَّفة يدوياً في `Meta.indexes`.

---

## 6. ملخص العدّ

| النوع | العدد |
| :--- | :--- |
| جداول | 21 |
| `PRIMARY KEY` | 21 |
| قيود `UNIQUE` | 7 (منها 2 مُسمّاة: `unique_border_staff_assignment`, `unique_border_daily_statistic`) |
| `FOREIGN KEY` | 69 (كلها `DEFERRABLE INITIALLY DEFERRED` بـ `NO ACTION` في SQL) |
| مفاتيح `on_delete=CASCADE` | 24 |
| مفاتيح `on_delete=PROTECT` | 21 |
| مفاتيح `on_delete=SET_NULL` | 24 |
| قيود `CHECK` | 20 |
| فهارس `bh_*` يدوية | 28 |
| أعمدة `choices` بلا قيد SQL | كل قيم الاختيار في التطبيق |

---

## 7. حصر النطاق على مستوى قاعدة البيانات

النطاق ليس قيداً في قاعدة البيانات بل ترشيح في طبقة DRF، لكن **شكل الجداول هو ما يجعله ممكناً**:

| الفئة | عمود النطاق | عدد الجداول | مسار الحل |
| :--- | :--- | :--- | :--- |
| جذور النطاق | `bordercrossing.entry_point_id` | 1 | `entry_point` |
| مباشرة | `crossing_id` | 18 | `crossing__entry_point` |
| غير مباشرة | `vehicleinspection.vehicle_id` | 1 | `vehicle__crossing__entry_point` |
| غير مباشرة | `contact.tracing_case_id` | 1 | `tracing_case__crossing__entry_point` |

**شرط تصميمي:** أي جدول جديد يجب أن يحمل إمّا `crossing_id` مباشرة، أو مساراً علائقياً متصلاً بـ `BorderCrossing` — وإلا استحال تقييد النطاق. هذا الشرط موثّق في `apps/borders_health/permissions.py` المعزّز بـ `MultiHopScopeFilter`، ويُنفَّذ بفشل آمن: أي مسار غير قابل للحل يعني **منع** لا سماح.

---

## 8. حالة التنفيذ مقابل الكود

| البند | الحالة | الدليل |
| :--- | :--- | :--- |
| 21 جدولاً بالبادئة `borders_health_` | مطابق | `models.py` — 21 صنف `BaseModel`؛ `pg_tables` — 21 صفاً |
| 21 مفتاحاً أساسياً `UUID` | مطابق | `BaseModel.id`؛ اسم القيد `<table>_pkey` |
| 7 قيود فريدة | مطابق | §3.1 |
| 69 مفتاحاً أجنبياً | مطابق | 24 `CASCADE` + 21 `PROTECT` + 24 `SET_NULL` |
| 20 قيد `CHECK` | مطابق | §3.4 — كلها `>= 0` على `PositiveIntegerField` |
| 28 فهرساً `bh_*` | مطابق | `0007` — 28 `AddIndex`؛ و28 صفاً في `pg_indexes` |
| `case_number` فريد و NULL مسموح | مطابق | `0006_alter_quarantinecase_case_number` |
| لا `db_table` مخصص | مطابق | لا يوجد `db_table` في `models.py` |
| 0 فهرس على `borderdailystatistics` | مطابق | يُغطى بالقيد `unique_border_daily_statistic` |

### تناقضات موثّقة مع مصادر أخرى

| المصدر | ما ورد فيه | ما في الشيفرة/قاعدة البيانات | الأثر |
| :--- | :--- | :--- | :--- |
| `docs/05_API/OpenAPI.yaml` | لقطة ثابتة سابقة للتطبيق | المخطط الحي يسجل 50 مسار borders_health | **`HealthDeclaration` و`CargoInspection` و`BlankEnum`** أسماء مكوّنات مشتركة مع `port_health` و`clinic`؛ تُرجَّع نسخة واحدة، وقد يختلف وصفها عن نسخة التطبيق الآخر |
| `docs/03_Database/Data_Dictionary.md` | يعرض `sample_code` كعمود حر | لا قيد فريد عليه (وهو الصحيح) | التوضيح في §3.1 البند 7 يمنع التباسه بقيد |

المرجع التفصيلي الكامل: [Tables.md](../../03_Database/Tables.md) و[Data_Dictionary.md](../../03_Database/Data_Dictionary.md) و[Indexes.md](../../03_Database/Indexes.md) و[Relationships.md](../../03_Database/Relationships.md) و[Constraints.md](../../03_Database/Constraints.md).
