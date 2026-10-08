# قيود قاعدة البيانات (Constraints)

## 1. القيود الأساسية (Primary & Unique)
- **المفاتيح الأساسية**: جميع الجداول تستخدم `PRIMARY KEY (id)` مع نوع `UUID` وقيمة افتراضية `gen_random_uuid()`.
- **المفاتيح الفريدة**:
  - `users(email)` و `users(phone)`
  - `travelers(passport_number)`
  - `roles(name)`
  - `permissions(name)`
  - `countries(code_alpha_2)`
  - `lab_samples(sample_barcode)`
  - `recovery_certificates(certificate_hash)`

## 2. قيود التحقق (Check Constraints)
يتم تطبيق القواعد التالية على مستوى قاعدة البيانات لضمان سلامة البيانات:

| الجدول | القيد (Constraint) | الشرط |
| :--- | :--- | :--- |
| `health_screenings` | `CHK_temperature` | `body_temperature BETWEEN 30 AND 45` |
| `health_screenings` | `CHK_oxygen` | `oxygen_saturation BETWEEN 50 AND 100` |
| `daily_health_logs` | `CHK_mood` | `mood_score BETWEEN 1 AND 10` |
| `travelers` | `CHK_passport_format` | `passport_number ~ '^[A-Z0-9]{6,20}$'` |
| `diseases` | `CHK_incubation` | `incubation_period_min <= incubation_period_max` |
| `users` | `CHK_role` | `role IN ('SUPER_ADMIN', 'FEDERAL_ADMIN', 'SECTOR_MANAGER', 'PORT_OFFICER', 'DOCTOR', 'LAB_TECH', 'LAB_SUPERVISOR', 'FOOD_INSPECTOR', 'EOC_OPERATOR', 'CARRIER_REP', 'TRAVELER')` |

## 3. قيود القيم الافتراضية (Defaults)
| الجدول | العمود | القيمة الافتراضية |
| :--- | :--- | :--- |
| جميع الجداول | `created_at` | `CURRENT_TIMESTAMP` |
| جميع الجداول | `updated_at` | `CURRENT_TIMESTAMP` |
| `users` | `is_active` | `true` |
| `flights` | `status` | `'SCHEDULED'` |
| `lab_samples` | `status` | `'REGISTERED'` |
| `lab_results` | `approval_status` | `'PENDING'` |
| `follow_up_patients` | `status` | `'ACTIVE'` |

## 4. قيود التكامل المرجعي (Referential Integrity - ON DELETE)
| الجدول الفرعي | المفتاح الخارجي | سياسة الحذف (Delete Rule) |
| :--- | :--- | :--- |
| `user_roles` | `user_id` | `CASCADE` (حذف صلاحيات المستخدم عند حذفه) |
| `health_screenings` | `traveler_id` | `RESTRICT` (منع حذف المسافر إذا كان لديه فحوصات) |
| `clinic_visits` | `traveler_id` | `RESTRICT` |
| `daily_health_logs` | `follow_up_id` | `CASCADE` (حذف سجلات المتابعة عند حذف الملف) |
| `audit_logs` | `user_id` | `SET NULL` (إذا حُذف المستخدم، يبقى السجل باسم NULL) |
| `external_integration_logs` | - | لا يوجد FK، تُحذف مع الجدول الرئيسي. |

## 5. قيود نظام صحة المعابر البرية (`borders_health`)

> التطبيق `apps.borders_health` — **21 جدولاً**، **21 مفتاحاً أساسياً**، **7 قيود فريدة**، **69 مفتاحاً أجنبياً**، **20 قيد CHECK**.
> الترحيلات المطبَّقة: `borders_health.0001` … `borders_health.0007`.

### 5.1. المفاتيح الأساسية (Primary Keys)
| البند | التفصيل |
| :--- | :--- |
| العمود | `id UUID NOT NULL PRIMARY KEY` في كل جدول من الـ 21 |
| المصدر | `core.models.BaseModel` (abstract) — لا يُنشئ جدولاً بمفرده |
| القيمة الافتراضية | **لا يوجد `DEFAULT`** على مستوى قاعدة البيانات؛ Django يولّد القيمة في بايثون عبر `uuid.uuid4` قبل الإدخال |
| اسم القيد الفعلي | `<table>_pkey` (مثال: `borders_health_bordercrossing_pkey`) |
| أعمودا التدقيق | `created_at` و `updated_at` من نوع `TIMESTAMP WITH TIME ZONE NOT NULL`، يُملآن في التطبيق عبر `auto_now_add` / `auto_now` — أي أنهما **بلا قيمة افتراضية في قاعدة البيانات**، و`updated_at` يُحدَّث من ORM لا من Trigger |

### 5.2. القيود الفريدة (Unique Constraints)
| الجدول | القيد | الأعمدة | النطاق | السبب |
| :--- | :--- | :--- | :--- | :--- |
| `borders_health_bordercrossing` | `borders_health_bordercrossing_entry_point_id_key` | `entry_point_id` | عام | **علاقة One-to-One**: منفذ بري واحد ⇒ ملف `BorderCrossing` تشغيلي واحد على الأكثر |
| `borders_health_borderstaff` | **`unique_border_staff_assignment`** | `(crossing_id, user_id, role)` | مركّب | يمنع إسناد نفس المستخدم نفس الدور مرتين في نفس المعبر (ويسمح بدور مختلف أو معبر مختلف) |
| `borders_health_borderdailystatistics` | **`unique_border_daily_statistic`** | `(crossing_id, stat_date)` | مركّب | صف واحد لكل معبر في اليوم؛ يجعل `update_or_create` في `refresh_daily_statistics` آمناً ويمنع تكرار الإحصاء |
| `borders_health_vehicle` | `borders_health_vehicle_plate_number_key` | `plate_number` | **عالمي** | لوحة المركبة فريدة على مستوى النظام كله، **وليس لكل معبر** — يُفترض أن اللوحات لا تُعاد بين المعابر |
| `borders_health_quarantinecase` | `borders_health_quarantinecase_case_number_key` | `case_number` | عام + **NULL مسموح** | انظر القسم 5.3 |
| `borders_health_bordercertificate` | `borders_health_bordercertificate_certificate_number_key` | `certificate_number` | عام | مرجع التحقق من الشهادة عبر `qr_payload` |

### 5.3. `case_number` — قيد فريد على عمود قابل لـ NULL (بالتصميم)
**العمود:** `borders_health_quarantinecase.case_number VARCHAR(30) UNIQUE NULL`

**لماذا NULL وليس `DEFAULT ''`:**

| الحالة | السلوك |
| :--- | :--- |
| `UNIQUE` + `NOT NULL` + `DEFAULT ''` | أول صف يُدرج بلا رقم يأخذ `''`، وأي صف ثانٍ بلا رقم يخالف القيد بخطأ `duplicate key value violates unique constraint`. عندها تفشل كل عمليات الإدراج المجمَّعة (`bulk_create`) لأن التوليد يحدث في `save()` فقط |
| `UNIQUE` + `NOT NULL` بلا افتراضي | يفشل الإدخال عند غياب الرقم |
| **`UNIQUE` + `NULL`** ✅ | Postgres يعتبر قيم `NULL` **متميزة عن بعضها** في فهرس `UNIQUE`، فيسمح بعدة صفوف بلا رقم دون تعارض. بعد تسجيل أرقام حقيقية لا يعود الـ NULL متاحاً لتلك القيم |

**التوليد:** يتكفّل به `QuarantineCase.save()` قبل أول `INSERT`:
```
case_number = 'Q-' + YYMMDD + '-' + أول 8 محارف من UUID (بأحرف كبيرة)
```
مثال: `Q-260930-A1B2C3D4`. الاعتماد على جزء من `BaseModel.id` (المُولَّد مسبقاً) يضمن التفرّد دون عدّاد تسلسلي.

**الترحيل `borders_health.0006`** (`0006_alter_quarantinecase_case_number`) هو الذي نفّذ التحول من **`unique + default=''`** إلى **`unique + null=True`**:
```python
# قبل
case_number = models.CharField(max_length=30, unique=True, default='', blank=True, ...)
# بعد
case_number = models.CharField(max_length=30, unique=True, null=True, blank=True, ...)
```

**تحذير تشغيلي:** `bulk_create` و`queryset.update()` لا يمرّان على `save()`، فيمكن أن تُدخل صفوف بـ `case_number IS NULL`. أي استعلام يعتمد على اكتمال الترقيم يجب أن يتعامل مع `NULL` صراحةً.

### 5.4. قيود المفاتيح الأجنبية وسلوك `ON DELETE`
**حقيقة مهمة:** Django **لا يُصدر بنود `ON DELETE` على مستوى قاعدة البيانات إطلاقاً.** كل قيد مفتاح أجنبي يُنشأ على الصورة التالية (تحقّق مباشر من `pg_constraint`):
```sql
FOREIGN KEY (<col>_id) REFERENCES <table>(id) DEFERRABLE INITIALLY DEFERRED
```
أي أن **سلوك Postgres الفعلي هو `NO ACTION`**، و`DEFERRABLE INITIALLY DEFERRED` يسمح بإدخال child's صف قبل إنشاء الصف الأب داخل نفس المعاملة.

القيم في عمود `on_delete` بالجدول أدناه هي **نيّة التطبيق** (تُنفَّذ في طبقة ORM عند الحذف، لا في قاعدة البيانات):

#### 5.4.1. `CASCADE` — 24 مفتاحاً
| الجدول | المفتاح | المرجع |
| :--- | :--- | :--- |
| `borders_health_bordercrossing` | `entry_point_id` | `masterdata_entrypoint` |
| `borders_health_borderfacility` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_bordershift` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_borderstaff` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_travelerhealthrecord` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_healthdeclaration` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_borderscreening` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_vehicle` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_vehicleinspection` | `vehicle_id` | `borders_health_vehicle` |
| `borders_health_cargoinspection` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_bordersample` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_bordersample` | `cargo_inspection_id` | `borders_health_cargoinspection` |
| `borders_health_quarantinecase` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_isolationcase` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_isolationcase` | `quarantine_case_id` | `borders_health_quarantinecase` |
| `borders_health_contacttracingcase` | `case_id` | `borders_health_quarantinecase` |
| `borders_health_contacttracingcase` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_contact` | `tracing_case_id` | `borders_health_contacttracingcase` |
| `borders_health_borderhealthincident` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_borderemergency` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_bordercertificate` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_borderdecision` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_bordernotification` | `crossing_id` | `borders_health_bordercrossing` |
| `borders_health_borderdailystatistics` | `crossing_id` | `borders_health_bordercrossing` |

**المبدأ:** حذف المعبر يحذف كل سجلاته التشغيلية (المعاملات، الفحوصات، الشحنات، الإحصاءات). حذف `BorderCrossing` من الواجهة معطّل عملياً لأن `entry_point_id` نفسه `CASCADE` على `masterdata_entrypoint`.

#### 5.4.2. `PROTECT` — 21 مفتاحاً (حماية سجلات التدقيق)
كلها تشير إلى `accounts_user` أو `travelers_traveler`. القاعدة: **لا يُحذف مستخدم أو مسافر لسجلاته المنسوبة إلى معبر.**

| الجدول | المفتاح | المرجع |
| :--- | :--- | :--- |
| `borders_health_borderstaff` | `user_id` | `accounts_user` |
| `borders_health_bordershift` | `supervisor_id` | `accounts_user` |
| `borders_health_travelerhealthrecord` | `assessed_by_id` | `accounts_user` |
| `borders_health_travelerhealthrecord` | `traveler_id` | `travelers_traveler` |
| `borders_health_healthdeclaration` | `reviewed_by_id` | `accounts_user` |
| `borders_health_healthdeclaration` | `traveler_id` | `travelers_traveler` |
| `borders_health_borderscreening` | `screened_by_id` | `accounts_user` |
| `borders_health_borderscreening` | `traveler_id` | `travelers_traveler` |
| `borders_health_vehicleinspection` | `inspector_id` | `accounts_user` |
| `borders_health_cargoinspection` | `decided_by_id` | `accounts_user` |
| `borders_health_bordersample` | `collected_by_id` | `accounts_user` |
| `borders_health_quarantinecase` | `traveler_id` | `travelers_traveler` |
| `borders_health_isolationcase` | `started_by_id` | `accounts_user` |
| `borders_health_isolationcase` | `closed_by_id` | `accounts_user` |
| `borders_health_borderhealthincident` | `reported_by_id` | `accounts_user` |
| `borders_health_borderemergency` | `reported_by_id` | `accounts_user` |
| `borders_health_bordernotification` | `sent_by_id` | `accounts_user` |
| `borders_health_bordercertificate` | `issued_by_id` | `accounts_user` |
| `borders_health_bordercertificate` | `traveler_id` | `travelers_traveler` |
| `borders_health_borderdecision` | `decided_by_id` | `accounts_user` |
| `borders_health_borderdecision` | `traveler_id` | `travelers_traveler` |

#### 5.4.3. `SET_NULL` — 24 مفتاحاً (مراجع خارجية قابلة للتخلّي)
كل المراجع هنا **خارج حدود التطبيق** أو كيانات ثانوية. لا يجوز فقدان سجل وبائي لمجرد حذف `Disease` أو `Clinic` أو `LabSample`.

| الجدول | المفتاح | المرجع | الوحدة |
| :--- | :--- | :--- | :--- |
| `borders_health_travelerhealthrecord` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_borderscreening` | `shared_screening_id` | `screening_healthscreening` | `screening` |
| `borders_health_borderscreening` | `screening_certificate_id` | `vaccination_vaccinationcertificate` | `vaccination` |
| `borders_health_cargoinspection` | `food_shipment_id` | `food_quarantine_foodshipment` | `food_quarantine` |
| `borders_health_cargoinspection` | `facility_id` | `borders_health_borderfacility` | داخلي |
| `borders_health_cargoinspection` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_bordersample` | `lab_sample_id` | `laboratory_labsample` | `laboratory` |
| `borders_health_bordersample` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_quarantinecase` | `health_case_id` | `emergency_eoc_healthcase` | `emergency_eoc` |
| `borders_health_quarantinecase` | `disease_id` | `laboratory_disease` | `laboratory` |
| `borders_health_quarantinecase` | `clinic_id` | `clinic_clinic` | `clinic` |
| `borders_health_quarantinecase` | `facility_id` | `borders_health_borderfacility` | داخلي |
| `borders_health_isolationcase` | `clinic_isolation_id` | `clinic_isolationrecord` | `clinic` |
| `borders_health_isolationcase` | `facility_id` | `borders_health_borderfacility` | داخلي |
| `borders_health_contacttracingcase` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_contacttracingcase` | `shared_contact_trace_id` | `emergency_eoc_contacttrace` | `emergency_eoc` |
| `borders_health_borderemergency` | `shared_event_id` | `emergency_eoc_emergencyevent` | `emergency_eoc` |
| `borders_health_borderemergency` | `disease_id` | `laboratory_disease` | `laboratory` |
| `borders_health_bordercertificate` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_bordercertificate` | `vehicle_inspection_id` | `borders_health_vehicleinspection` | داخلي |
| `borders_health_borderdecision` | `vehicle_id` | `borders_health_vehicle` | داخلي |
| `borders_health_borderdecision` | `cargo_inspection_id` | `borders_health_cargoinspection` | داخلي |
| `borders_health_borderdecision` | `quarantine_case_id` | `borders_health_quarantinecase` | داخلي |
| `borders_health_borderhealthincident` | `quarantine_case_id` | `borders_health_quarantinecase` | داخلي |


#### 5.4.4. أثر عملي
| السيناريو | السلوك |
| :--- | :--- |
| حذف `masterdata.EntryPoint` | ORM يحذف `BorderCrossing` ثم 23 سجلاً تشغيلياً تابعاً له (`CASCADE`) |
| حذف `accounts.User` مُسنَد بمعبر | يُرفض الحذف بـ `ProtectedError` ما دام له سجل إسناد أو فحص أو قرار |
| حذف `laboratory.Disease` مستخدم في حجر أو طوارئ | الحذف ينجح، ويصبح `disease_id = NULL` ويبقى باقي السجل |
| `DELETE` مباشر على جدول من خارج Django | **لا يطبّق أي `CASCADE`**: Postgres يمنع حذف الأب بـ `NO ACTION`، و`SET NULL` لا يحدث. المسارات المغلقة داخل معاملة واحدة فقط ما دامت القوائم `DEFERRABLE INITIALLY DEFERRED` |

### 5.5. قيود `CHECK` (20 قيداً)
Django يولّد قيداً واحداً لكل حقل `PositiveIntegerField` / `PositiveSmallIntegerField`، ولا يولّد أي `CHECK` لقيم `choices` (انظر 5.6):

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
| `borders_health_borderdailystatistics` | `borders_health_borderdailystat_average_processing_minutes_check` | `average_processing_minutes >= 0` |

**غير مقيَّد بـ CHECK (ثغرات تحقق قائمة):**
| الجدول | العمود | الملاحظة |
| :--- | :--- | :--- |
| `borders_health_borderscreening` | `body_temperature` | لا قيد `BETWEEN 30 AND 45` (بعكس `health_screenings` في القسم 2 أعلاه) |
| `borders_health_borderscreening` | `oxygen_saturation` | لا قيد `BETWEEN 50 AND 100`، والنوع `DOUBLE PRECISION` لا `INT` |
| `borders_health_vehicle` | `year_of_manufacture` | لا حدّ أعلى (سنة 9999 مقبولة) |
| `borders_health_isolationcase` | `expected_end_date` / `end_date` | لا قيد ترتيب زمني `end_date >= expected_end_date` |
| `borders_health_quarantinecase` | `expected_end_date` / `actual_end_date` | لا قيد ترتيب زمني، ولا تحقق أن `actual_end_date = entry_at + required_days` |

### 5.6. قيم `choices` — لا تفرضها قاعدة البيانات
كل قيم الاختيار (`operating_status`, `risk_level`, `decision`, `status`, `kind`, `phase`, `restriction_level` …) **حرة تماماً في مستوى الـ SQL**: Django لا يولّد `CHECK` لها، والتحقق يحدث في الـ serializers ونماذج Django فقط. الإدراج المباشر عبر SQL أو `bulk_create` بــ `queryset.bulk_create` يتجاوز التحقق.

| الفئة | عدد الأعمدة | أمثلة |
| :--- | :--- | :--- |
| `border_type` | 1 | ROAD / RAIL / RIVER |
| `operating_status` | 1 | OPEN / RESTRICTED / LIMITED / CLOSED / EMERGENCY |
| `kind` (المرفق) | 1 | HEALTH / LABORATORY / QUARANTINE / ISOLATION / STORAGE / WATER_SANITATION / WASTE / VECTOR_CONTROL |
| `shift_type` | 1 | MORNING / AFTERNOON / NIGHT / ROTATING |
| `role` (الكادر) | 1 | 9 أدوار (MANAGER … EMERGENCY_OFFICER) |
| `assignment_type` | 1 | FULL_TIME / PART_TIME / SECONDMENT |
| `direction` | 1 | INBOUND / OUTBOUND |
| `health_status` | 1 | FIT / UNFIT / UNDER_OBSERVATION |
| `risk_level` | 2 | GREEN / YELLOW / RED — **موجود في `travelerhealthrecord` فقط** |
| `decision` | 2 | CLEARED / HOLD / REFERRED / QUARANTINED (+ REFUSED_ENTRY) / CLEARED / CONDITIONAL / HOLD / REJECTED |
| `vehicle_type` | 1 | 8 أنواع |
| `status` | 1 | ACTIVE / UNDER_QUARANTINE / CONDEMNED (مركبة) |
| `inspection_type` | 1 | 7 أنواع |
| `overall_status` | 1 | PASSED / CONDITIONAL / FAILED |
| `scope` | 1 | CARGO / FOOD / WAREHOUSE / WATER_SANITATION |
| `sample_type` / `severity` | 1 | نص حر / LOW / MEDIUM / HIGH / CRITICAL |
| `channel` | 1 | INTERNAL / EMAIL / SMS / PUSH |
| `outcome` | 1 | CLEARED / CONDITIONAL / HOLD / REFERRED / REJECTED / ENFORCEMENT |
| `phase` | 1 | 7 مراحل |

### 5.7. قيود القيم الافتراضية (`DEFAULT`)
| الجدول | العمود | القيمة الافتراضية | ملاحظة |
| :--- | :--- | :--- | :--- |
| جميع جداول `borders_health` | `id` | *(لا يوجد)* | يُولَّد في بايثون |
| جميع جداول `borders_health` | `created_at` | *(لا يوجد)* | `auto_now_add` في التطبيق |
| جميع جداول `borders_health` | `updated_at` | *(لا يوجد)* | `auto_now` في التطبيق |
| `borders_health_travelerhealthrecord` | `entry_at` | *(لا يوجد)* | `default=timezone.now` في بايثون |
| أعمدة `CharField` بـ `blank=True` | — | `''` (نص فارغ، **ليس NULL**) | يشمل `neighbor_country`, `notes`, `reason`, `qr_payload`, `sample_code` … |
| أعمدة `JSONField` بـ `default=list` | — | `[]` | `visited_countries`, `observed_symptoms` |
| كل أعمدة `choices` | — | قيمة من `default=` | مثال: `operating_status = 'OPEN'`، `required_days = 14`، `samples_collected = 0` |
| عدّادات `borders_health_borderdailystatistics` | 9 عدّادات | `0` | تُملأ بـ `update_or_create` في `refresh_daily_statistics` |
| كل أعمدة `BooleanField` | — | `FALSE` أو `TRUE` | `has_*` = FALSE، `is_active` / `is_operational` / `is_staffed` = TRUE |

### 5.8. ملخص العدّ
| النوع | العدد |
| :--- | :--- |
| جداول | 21 |
| `PRIMARY KEY` | 21 |
| قيود `UNIQUE` | 7 (منها 2 مُسمّاة: `unique_border_staff_assignment`, `unique_border_daily_statistic`) |
| `FOREIGN KEY` | 69 (كلها `DEFERRABLE INITIALLY DEFERRED` بـ `NO ACTION`) |
| مفاتيح `on_delete=CASCADE` | 24 |
| مفاتيح `on_delete=PROTECT` | 21 |
| مفاتيح `on_delete=SET_NULL` | 24 |
| قيود `CHECK` | 20 |
| فهارس `bh_*` يدوية | 28 |
