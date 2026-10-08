# قاموس البيانات (Data Dictionary)

## 1. مقدمة
يوفر قاموس البيانات وصفاً شاملاً لجميع الحقول (Columns) في قاعدة البيانات، بما في ذلك المصطلحات التقنية والتجارية، ليكون مرجعاً سريعاً للمطورين ومحللي الأعمال.

---

## 2. قاموس الحقول الأساسية (Common Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | المعرف الفريد | UUID | معرف فريد عالمي لكل سجل. |
| `created_at` | تاريخ الإنشاء | Timestamptz | وقت إنشاء السجل في النظام. |
| `updated_at` | تاريخ التعديل | Timestamptz | وقت آخر تعديل على السجل. |
| `is_active` | مفعل | Boolean | يشير إلى ما إذا كان السجل نشطاً أم لا. |
| `status` | الحالة | String | وصف حالة السجل في دورة حياته. |

---

## 3. قاموس حقول المسافرين (Traveler Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `passport_number` | رقم جواز السفر | String | رقم جواز السفر الفريد للمسافر. | `A1234567` |
| `first_name` | الاسم الأول | String | الاسم الأول للمسافر. | `محمد` |
| `last_name` | اسم العائلة | String | اسم العائلة للمسافر. | `أحمد` |
| `date_of_birth` | تاريخ الميلاد | Date | تاريخ ميلاد المسافر. | `1990-05-15` |
| `nationality_id` | الجنسية | UUID (FK) | معرف الدولة في جدول `countries`. | - |
| `medical_history` | التاريخ الطبي | JSONB | الأمراض المزمنة والحساسية. | `{"diabetes": false, "hypertension": true}` |

---

## 4. قاموس حقول الفحص والتقييم (Screening Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `body_temperature` | درجة الحرارة | Float | درجة حرارة الجسم (بالدرجة المئوية). | `38.5` |
| `oxygen_saturation` | تشبع الأكسجين | Int | النسبة المئوية للأكسجين في الدم (SpO2). | `95` |
| `systolic_bp` | الضغط الانقباضي | Int | قراءة ضغط الدم الانقباضي. | `120` |
| `diastolic_bp` | الضغط الانبساطي | Int | قراءة ضغط الدم الانبساطي. | `80` |
| `observed_symptoms` | الأعراض الظاهرة | JSONB | قائمة الأعراض التي يعاني منها المسافر. | `["cough", "fever", "headache"]` |
| `risk_level` | مستوى الخطورة | String | تصنيف المخاطر (أخضر/أصفر/أحمر). | `YELLOW` |
| `risk_score` | درجة المخاطر | Float | درجة رقمية (0-100) تعبر عن شدة الخطورة. | `72.5` |

---

## 5. قاموس حقول المختبرات (Lab Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `sample_barcode` | باركود العينة | String | رمز شريطي فريد لتتبع العينة. | `LAB-2024-0001` |
| `sample_type` | نوع العينة | String | نوع العينة المأخوذة. | `SWAB`, `BLOOD` |
| `result` | النتيجة | String | نتيجة الفحص المخبري. | `POSITIVE`, `NEGATIVE` |
| `approval_status` | حالة الاعتماد | String | هل النتيجة معتمدة من المشرف؟ | `PENDING`, `APPROVED` |

---

## 6. قاموس حقول المتابعة (Follow-up Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `enrollment_date` | تاريخ التسجيل | Date | تاريخ بدء متابعة المريض. | `2024-07-01` |
| `expected_end_date` | تاريخ الانتهاء المتوقع | Date | التاريخ المتوقع لانتهاء المتابعة. | `2024-07-14` |
| `mood_score` | درجة الحالة النفسية | Int | تقييم المريض لحالته النفسية (1-10). | `7` |
| `certificate_hash` | التوقيع الرقمي | String | بصمة رقمية فريدة للشهادة. | `5d41402abc4b2a76b9719d911017c592` |

---

## 7. قاموس حقول الطوارئ (EOC Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `alert_type` | نوع الإنذار | String | نوع الحدث الطارئ. | `RED_ALERT`, `OUTBREAK` |
| `location_geo` | الإحداثيات الجغرافية | JSONB | موقع الحالة (خط الطول والعرض). | `{"lat": 12.34, "lng": 45.67}` |
| `triggered_at` | وقت الإطلاق | Timestamptz | وقت إطلاق الإنذار. | `2024-07-01 10:30:00+00` |
| `resolved_at` | وقت الإنهاء | Timestamptz | وقت انتهاء حالة الطوارئ. | `2024-07-01 14:00:00+00` |

---

## 8. قاموس حقول الحجر الغذائي (Food Fields)

| اسم الحقل (Tech) | المصطلح التجاري (Business) | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- | :--- |
| `manifest_number` | رقم بيان الشحنة | String | رقم البيان الجمركي للشحنة. | `SHIP-2024-100` |
| `supplier_name` | اسم المورد | String | اسم المورد أو الشركة المصدرة. | `Global Meat Co.` |
| `product_list` | قائمة المنتجات | JSONB | قائمة المنتجات في الشحنة. | `[{"name": "Beef", "qty": 1000}]` |
| `decision` | قرار التفتيش | String | نتيجة التفتيش. | `COMPLIANT`, `NON_COMPLIANT` |

---

## 9. قاموس نظام صحة المعابر البرية (Land Border Health Fields)

> التطبيق `apps.borders_health` — **21 جدولاً** ببادئة `borders_health_`.
> **الأعمدة المشتركة الموروثة** من `core.models.BaseModel` موجودة في كل جدول من الـ 21 ولا يُعاد تفصيلها 21 مرة، وهي موثّقة هنا مرة واحدة ومُحيلة إلى القسم 2:
>
> | العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
> | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
> | `id` | UUID | لا | *(لا يوجد)* — يُولَّد في بايثون عبر `uuid.uuid4` | المعرف الفريد | — | `0e1c8f2a-…` |
> | `created_at` | TIMESTAMPTZ | لا | *(لا يوجد)* — `auto_now_add` | وقت الإنشاء | — | `2026-09-30 06:00:00+00` |
> | `updated_at` | TIMESTAMPTZ | لا | *(لا يوجد)* — `auto_now` | وقت آخر تعديل | — | `2026-09-30 06:12:00+00` |
>
> أدناه **بقية أعمدة كل جدول** (أي `عدد الأعمدة الكلي − 3`). خانات **NULL / قيمة افتراضية / قيم مسموحة** تصف ما تُصدره قاعدة البيانات فعلياً (PostgreSQL)، وما بين قوسين هو سلوك التطبيق.
> الأعمدة المكتوبة `NOT NULL` بقيمة فارغة افتراضية (`''`) هي أعمدة `CharField` بـ `blank=True`: تخزّن نصاً فارغاً ولا تقبل `NULL`.

### 9.1. `borders_health_bordercrossing` — معبر بري (17 عموداً)
| العمود (Column) | النوع (Type) | NULL | الافتراضي (Default) | المعنى (Meaning) | القيم المسموحة (Choices) | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `entry_point_id` | UUID (FK) | لا | — | نقطة الدخول التي يمثّلها المعبر (امتداد OneToOne) | `masterdata_entrypoint.id` | `0e1c…` |
| `border_type` | VARCHAR(10) | لا | `'ROAD'` | نوع المعبر | ROAD، RAIL، RIVER | `ROAD` |
| `neighbor_country` | VARCHAR(100) | لا | `''` | الدولة المجاورة للمعبر | نص حر | `Ethiopia` |
| `operating_status` | VARCHAR(20) | لا | `'OPEN'` | حالة التشغيل الحالية | OPEN، RESTRICTED، LIMITED، CLOSED، EMERGENCY | `OPEN` |
| `operating_hours` | VARCHAR(200) | لا | `''` | ساعات العمل (نص وصفي) | نص حر | `06:00–22:00` |
| `daily_capacity` | INTEGER | نعم | `NULL` | الطاقة اليومية (عدد الأشخاص) | `>= 0` | `1500` |
| `working_agencies` | TEXT | لا | `''` | الجهات العاملة بالمعبر | نص حر | `الشرطة، الجمارك، الصحة` |
| `has_health_facility` | BOOLEAN | لا | `FALSE` | يوجد مرفق صحي | true / false | `true` |
| `has_laboratory` | BOOLEAN | لا | `FALSE` | يوجد مختبر | true / false | `false` |
| `has_quarantine_facility` | BOOLEAN | لا | `FALSE` | يوجد مرفق حجر | true / false | `true` |
| `has_isolation_facility` | BOOLEAN | لا | `FALSE` | يوجد مرفق عزل | true / false | `true` |
| `quarantine_capacity` | INTEGER | نعم | `NULL` | طاقة مرفق الحجر | `>= 0` | `300` |
| `closure_reason` | TEXT | لا | `''` | سبب الإغلاق أو التقييد (يظهر عند `CLOSED`/`RESTRICTED`) | نص حر | `أعمال صيانة` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.2. `borders_health_borderfacility` — مرفق معبر (11 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `kind` | VARCHAR(20) | لا | — | نوع المرفق | HEALTH، LABORATORY، QUARANTINE، ISOLATION، STORAGE، WATER_SANITATION، WASTE، VECTOR_CONTROL | `LABORATORY` |
| `name_ar` | VARCHAR(150) | لا | — | اسم المرفق بالعربية | نص حر | `مختبر الميناء` |
| `name_en` | VARCHAR(150) | لا | `''` | اسم المرفق بالإنجليزية | نص حر | `Port Laboratory` |
| `capacity` | INTEGER | نعم | `NULL` | طاقة المرفق | `>= 0` | `50` |
| `staff_count` | INTEGER | نعم | `NULL` | عدد الكوادر العاملة فيه | `>= 0` | `6` |
| `is_operational` | BOOLEAN | لا | `TRUE` | هل يعمل المرفق حالياً | true / false | `true` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.3. `borders_health_bordershift` — وردية معبر (11 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `shift_date` | DATE | لا | — | تاريخ الوردية | تاريخ | `2026-09-30` |
| `shift_type` | VARCHAR(20) | لا | `'MORNING'` | نوع الوردية | MORNING، AFTERNOON، NIGHT، ROTATING | `MORNING` |
| `started_at` | TIME | نعم | `NULL` | وقت بداية الوردية | وقت | `06:00:00` |
| `ended_at` | TIME | نعم | `NULL` | وقت نهاية الوردية | وقت | `14:00:00` |
| `supervisor_id` | UUID (FK) | نعم | `NULL` | مشرف الوردية | `accounts_user.id` | `a3f2…` |
| `is_staffed` | BOOLEAN | لا | `TRUE` | هل الوردية مؤمَّنة بكادر | true / false | `true` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | `نقص في الفاحصين` |

### 9.4. `borders_health_borderstaff` — إسناد كادر بالمعبر (11 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `user_id` | UUID (FK) | لا | — | المستخدم المسنَد | `accounts_user.id` | `a3f2…` |
| `role` | VARCHAR(30) | لا | — | الدور الوظيفي بالمعبر | MANAGER، DOCTOR، INSPECTOR، FOOD_INSPECTOR، ENVIRONMENTAL_INSPECTOR، REGISTRATION_OFFICER، LAB_TECHNICIAN، EPIDEMIOLOGY_OFFICER، EMERGENCY_OFFICER | `INSPECTOR` |
| `assignment_type` | VARCHAR(15) | لا | `'FULL_TIME'` | نوع الإسناد | FULL_TIME، PART_TIME، SECONDMENT | `FULL_TIME` |
| `starts_on` | DATE | نعم | `NULL` | بداية سريان الإسناد | تاريخ | `2026-01-01` |
| `ends_on` | DATE | نعم | `NULL` | نهاية سريان الإسناد (اختياري للإعارة) | تاريخ | `2026-12-31` |
| `is_active` | BOOLEAN | لا | `TRUE` | هل الإسناد سارٍ | true / false | `true` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |
| — (قيد) | — | — | `unique_border_staff_assignment` | منع تكرار (المعبر، المستخدم، الدور) | UNIQUE (crossing_id, user_id, role) | — |

### 9.5. `borders_health_travelerhealthrecord` — سجل صحي للمسافر (16 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `traveler_id` | UUID (FK) | لا | — | المسافر | `travelers_traveler.id` | `7b1e…` |
| `direction` | VARCHAR(10) | لا | `'INBOUND'` | اتجاه الحركة عبر المعبر | INBOUND، OUTBOUND | `INBOUND` |
| `entry_at` | TIMESTAMPTZ | لا | `timezone.now` (بايثون) | وقت العبور عبر المعبر | طابع زمني | `2026-09-30 06:12:00+00` |
| `departure_country` | VARCHAR(100) | لا | `''` | بلد المغادرة | نص حر | `Ethiopia` |
| `visited_countries` | JSONB | لا | `[]` | الدول التي زارها المسافر قبل الوصول | مصفوفة نصوص | `["Ethiopia","Kenya"]` |
| `transport_mode` | VARCHAR(50) | لا | `''` | وسيلة النقل | نص حر | `شاحنة` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة المستخدمة | `borders_health_vehicle.id` | `c4d9…` |
| `health_status` | VARCHAR(20) | لا | `'FIT'` | الحالة الصحية عند العبور | FIT، UNFIT، UNDER_OBSERVATION | `FIT` |
| `risk_level` | VARCHAR(10) | لا | `'GREEN'` | مستوى الخطورة | GREEN، YELLOW، RED | `YELLOW` |
| `decision` | VARCHAR(20) | لا | `'CLEARED'` | القرار المتخذ | CLEARED، HOLD، REFERRED، QUARANTINED، REFUSED_ENTRY | `CLEARED` |
| `assessed_by_id` | UUID (FK) | نعم | `NULL` | المُقيِّم | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.6. `borders_health_healthdeclaration` — إقرار صحي (16 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `traveler_id` | UUID (FK) | لا | — | المسافر | `travelers_traveler.id` | `7b1e…` |
| `departure_country` | VARCHAR(100) | لا | `''` | بلد المغادرة | نص حر | `Ethiopia` |
| `departure_date` | DATE | نعم | `NULL` | تاريخ سفر المسافر | تاريخ | `2026-09-25` |
| `visited_countries` | JSONB | لا | `[]` | الدول التي زارها | مصفوفة نصوص | `["Kenya"]` |
| `health_conditions` | TEXT | لا | `''` | الحالة الصحية المُعلنة (حمل، ضغط، سكري…) | نص حر | `حمل — الأسبوع 28` |
| `current_symptoms` | TEXT | لا | `''` | الأعراض الحالية | نص حر | `سعال جاف` |
| `contact_name` | VARCHAR(150) | لا | `''` | اسم جهة الاتصال للطوارئ | نص حر | `أحمد محمد` |
| `contact_phone` | VARCHAR(30) | لا | `''` | هاتف جهة الاتصال | نص حر | `+249911234567` |
| `declared_at` | TIMESTAMPTZ | لا | `auto_now_add` | تاريخ تقديم الإقرار | طابع زمني | `2026-09-30 06:05:00+00` |
| `status` | VARCHAR(15) | لا | `'RECEIVED'` | حالة الإقرار | RECEIVED، REVIEWED، APPROVED، REJECTED | `RECEIVED` |
| `reviewed_by_id` | UUID (FK) | نعم | `NULL` | المراجع | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.7. `borders_health_borderscreening` — فحص مسافر بمعبر (17 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `traveler_id` | UUID (FK) | لا | — | المسافر | `travelers_traveler.id` | `7b1e…` |
| `shared_screening_id` | UUID (FK) | نعم | `NULL` | الفحص المشترك من وحدة `screening` (يتحقق من التطابق) | `screening_healthscreening.id` | `d5e6…` |
| `body_temperature` | DOUBLE PRECISION | نعم | `NULL` | درجة حرارة الجسم (مئوية) | عدد عشري — بلا قيد `CHECK` | `37.8` |
| `oxygen_saturation` | DOUBLE PRECISION | نعم | `NULL` | نسبة تشبع الأكسجين (%) | عدد عشري — بلا قيد `CHECK` | `97.5` |
| `observed_symptoms` | JSONB | لا | `[]` | الأعراض المرصودة عند الفحص | مصفوفة نصوص | `["cough"]` |
| `risk_level` | VARCHAR(10) | لا | `''` | مستوى الخطورة | **حقل حر بلا `choices`** (على خلاف `travelerhealthrecord`) | `YELLOW` |
| `document_verified` | BOOLEAN | لا | `FALSE` | تم التحقق من وثائق السفر | true / false | `true` |
| `vaccination_verified` | BOOLEAN | لا | `FALSE` | تم التحقق من التطعيمات | true / false | `true` |
| `screening_certificate_id` | UUID (FK) | نعم | `NULL` | شهادة التتُطعيم المرتبطة | `vaccination_vaccinationcertificate.id` | `e7f8…` |
| `decision` | VARCHAR(20) | لا | `'CLEARED'` | قرار الفحص | CLEARED، HOLD، REFERRED، QUARANTINED | `CLEARED` |
| `screened_by_id` | UUID (FK) | نعم | `NULL` | الفاحص | `accounts_user.id` | `a3f2…` |
| `screened_at` | TIMESTAMPTZ | لا | `auto_now_add` | وقت الفحص | طابع زمني | `2026-09-30 06:20:00+00` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.8. `borders_health_vehicle` — مركبة (15 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `plate_number` | VARCHAR(30) | لا | — (UNIQUE) | رقم اللوحة — **فريد عالمياً** | نص حر | `SD-4471-KL` |
| `chassis_number` | VARCHAR(50) | لا | `''` | رقم الهيكل (VIN) | نص حر | `JTFBX02P…` |
| `vehicle_type` | VARCHAR(25) | لا | `'TRUCK'` | نوع المركبة | BUS، TRUCK، PRIVATE_CAR، AMBULANCE، LIVESTOCK_TRANSPORT، REFRIGERATED_TRUCK، TANKER، OTHER | `TRUCK` |
| `make_model` | VARCHAR(100) | لا | `''` | الصنع والطراز | نص حر | `Toyota Coaster` |
| `year_of_manufacture` | SMALLINT | نعم | `NULL` | سنة الصنع | `>= 0` | `2019` |
| `capacity` | INTEGER | نعم | `NULL` | السعة (ركاب أو أطنان) | `>= 0` | `30` |
| `owner_name` | VARCHAR(200) | لا | `''` | اسم المالك / الشركة | نص حر | `شركة النيل` |
| `driver_name` | VARCHAR(150) | لا | `''` | اسم السائق | نص حر | `محمد علي` |
| `driver_phone` | VARCHAR(30) | لا | `''` | هاتف السائق | نص حر | `+249911112233` |
| `status` | VARCHAR(20) | لا | `'ACTIVE'` | حالة المركبة | ACTIVE، UNDER_QUARANTINE، CONDEMNED | `ACTIVE` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.9. `borders_health_vehicleinspection` — تفتيش مركبة (14 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `vehicle_id` | UUID (FK) | لا | — | المركبة المفحوصة — النطاق عبر `vehicle__crossing__entry_point` | `borders_health_vehicle.id` | `c4d9…` |
| `inspection_type` | VARCHAR(20) | لا | `'EXTERIOR'` | نوع التفتيش | EXTERIOR، CARGO_HOLD، TEMPERATURE، DISINFECTION، PEST_CONTROL، WASTE، CABIN | `EXTERIOR` |
| `inspection_date` | TIMESTAMPTZ | لا | `auto_now_add` | تاريخ ووقت التفتيش | طابع زمني | `2026-09-30 07:00:00+00` |
| `inspector_id` | UUID (FK) | نعم | `NULL` | المفتش | `accounts_user.id` | `a3f2…` |
| `cleanliness_status` | VARCHAR(20) | لا | `'COMPLIANT'` | حالة النظافة | COMPLIANT، NON_COMPLIANT، NOT_APPLICABLE | `COMPLIANT` |
| `pest_control_status` | VARCHAR(20) | لا | `'COMPLIANT'` | حالة مكافحة الحشرات | COMPLIANT، NON_COMPLIANT، NOT_APPLICABLE | `COMPLIANT` |
| `waste_status` | VARCHAR(20) | لا | `'COMPLIANT'` | حالة إدارة النفايات | COMPLIANT، NON_COMPLIANT، NOT_APPLICABLE | `NON_COMPLIANT` |
| `cooling_status` | VARCHAR(20) | لا | `'NOT_APPLICABLE'` | حالة وسائل التبريد | COMPLIANT، NON_COMPLIANT، NOT_APPLICABLE | `NOT_APPLICABLE` |
| `findings` | TEXT | لا | `''` | الملاحظات التفصيلية | نص حر | `أبواب الخلفية غير محكمة` |
| `overall_status` | VARCHAR(15) | لا | `'PASSED'` | النتيجة العامة | PASSED، CONDITIONAL، FAILED | `PASSED` |
| `reinspection_required` | BOOLEAN | لا | `FALSE` | يلزم إعادة تفتيش | true / false | `false` |

### 9.10. `borders_health_cargoinspection` — تفتيش شحنة (18 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `scope` | VARCHAR(20) | لا | `'CARGO'` | نطاق التفتيش (يغطي الشحنات والمخازن والمياه/الصرف) | CARGO، FOOD، WAREHOUSE، WATER_SANITATION | `CARGO` |
| `food_shipment_id` | UUID (FK) | نعم | `NULL` | شحنة سلامة الغذاء المرتبطة | `food_quarantine_foodshipment.id` | `f1a2…` |
| `facility_id` | UUID (FK) | نعم | `NULL` | المرفق المعني (مخزن / مياه وصرف) | `borders_health_borderfacility.id` | `b3c4…` |
| `declaration_number` | VARCHAR(50) | لا | `''` | رقم إقرار الشحن | نص حر | `DEC-2026-0417` |
| `product_type` | VARCHAR(150) | لا | `''` | نوع المنتج | نص حر | `لحوم مجمدة` |
| `country_of_origin` | VARCHAR(100) | لا | `''` | بلد المنشأ | نص حر | `Ethiopia` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة الناقلة | `borders_health_vehicle.id` | `c4d9…` |
| `samples_collected` | INTEGER | لا | `0` | عدد العينات المسحوبة | `>= 0` | `3` |
| `laboratory_result` | TEXT | لا | `''` | نتيجة المختبر (نص حر لنتائج `borders_health_bordersample`) | نص حر | `سالبة` |
| `status` | VARCHAR(20) | لا | `'PENDING'` | حالة الفحص | PENDING، INSPECTING، SAMPLES_SENT، AWAITING_DECISION، RELEASED، REJECTED، HOLD | `AWAITING_DECISION` |
| `decision` | VARCHAR(15) | لا | `''` | القرار (فارغ قبل القرار) | CLEARED، CONDITIONAL، REJECTED، HOLD | `CONDITIONAL` |
| `decided_by_id` | UUID (FK) | نعم | `NULL` | المُقرِّر | `accounts_user.id` | `a3f2…` |
| `decided_at` | TIMESTAMPTZ | نعم | `NULL` | وقت القرار | طابع زمني | `2026-09-30 09:00:00+00` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.11. `borders_health_bordersample` — عيّنة معبر (14 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `lab_sample_id` | UUID (FK) | نعم | `NULL` | العيّنة المقابلة في مختبر المنصة | `laboratory_labsample.id` | `2a3b…` |
| `cargo_inspection_id` | UUID (FK) | نعم | `NULL` | تفتيش الشحنة مصدر العيّنة | `borders_health_cargoinspection.id` | `4c5d…` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة مصدر العيّنة | `borders_health_vehicle.id` | `c4d9…` |
| `sample_code` | VARCHAR(40) | لا | `''` | رمز العيّنة بالمعبر | نص حر (**غير فريد**) | `BH-260930-01` |
| `sample_type` | VARCHAR(100) | لا | `''` | نوع العيّنة | نص حر | `مسحة حلق` |
| `collected_by_id` | UUID (FK) | نعم | `NULL` | من سحب العيّنة | `accounts_user.id` | `a3f2…` |
| `collected_at` | TIMESTAMPTZ | لا | `auto_now_add` | تاريخ السحب | طابع زمني | `2026-09-30 07:30:00+00` |
| `status` | VARCHAR(20) | لا | `'COLLECTED'` | حالة العيّنة | COLLECTED، SENT، UNDER_TEST، RESULT_RECEIVED، REJECTED | `UNDER_TEST` |
| `result` | TEXT | لا | `''` | النتيجة (تُفحص بـ `iregex` في `apply_cargo_decision`) | نص حر | `سالبة` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.12. `borders_health_quarantinecase` — حالة حجر (18 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `case_number` | VARCHAR(30) | **نعم** | `NULL` (يُولَّد في `save()`) | رقم الحالة الفريد | `Q-YYMMDD-XXXXXXXX` | `Q-260930-A1B2C3D4` |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `traveler_id` | UUID (FK) | نعم | `NULL` | المسافر (فارغ للمخالطين غير المسجَّلين) | `travelers_traveler.id` | `7b1e…` |
| `person_name` | VARCHAR(200) | لا | `''` | اسم الحالة | نص حر | `محمد علي` |
| `health_case_id` | UUID (FK) | نعم | `NULL` | حالة الترصد المشتركة | `emergency_eoc_healthcase.id` | `6f7a…` |
| `disease_id` | UUID (FK) | نعم | `NULL` | المرض المُشخَّص | `laboratory_disease.id` | `9b0c…` |
| `clinic_id` | UUID (FK) | نعم | `NULL` | العيادة المرجعية | `clinic_clinic.id` | `1d2e…` |
| `facility_id` | UUID (FK) | نعم | `NULL` | مرفق الحجر | `borders_health_borderfacility.id` | `b3c4…` |
| `entry_at` | TIMESTAMPTZ | لا | `auto_now_add` | وقت الدخول للحجر | طابع زمني | `2026-09-30 08:00:00+00` |
| `required_days` | SMALLINT | لا | `14` | المدة المطلوبة (أيام) | `>= 0` | `14` |
| `expected_end_date` | DATE | نعم | `NULL` | تاريخ الانتهاء المتوقع | تاريخ | `2026-10-14` |
| `actual_end_date` | DATE | نعم | `NULL` | تاريخ الانتهاء الفعلي | تاريخ | `2026-10-13` |
| `phase` | VARCHAR(20) | لا | `'SCREENED'` | مرحلة الحالة | SCREENED، ASSESSED، QUARANTINED، UNDER_TREATMENT، RECOVERED، RELEASED، REFERRED_OUT | `UNDER_TREATMENT` |
| `status` | VARCHAR(20) | لا | `'ADMITTED'` | حالة الحالة | ADMITTED، UNDER_QUARANTINE، REFERRED، RELEASED، ESCALATED | `UNDER_QUARANTINE` |
| `follow_up_notes` | TEXT | لا | `''` | ملاحظات المتابعة | نص حر | `لا أعراض يوم 3` |

### 9.13. `borders_health_isolationcase` — حالة عزل (14 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `quarantine_case_id` | UUID (FK) | نعم | `NULL` | حالة الحجر المرتبطة | `borders_health_quarantinecase.id` | `5e6f…` |
| `clinic_isolation_id` | UUID (FK) | نعم | `NULL` | سجل العزل بالعيادة | `clinic_isolationrecord.id` | `7a8b…` |
| `facility_id` | UUID (FK) | نعم | `NULL` | مرفق العزل | `borders_health_borderfacility.id` | `b3c4…` |
| `start_date` | DATE | لا | — | تاريخ بدء العزل | تاريخ | `2026-09-30` |
| `expected_end_date` | DATE | نعم | `NULL` | تاريخ الانتهاء المتوقع | تاريخ | `2026-10-07` |
| `end_date` | DATE | نعم | `NULL` | تاريخ الانتهاء الفعلي | تاريخ | `2026-10-06` |
| `status` | VARCHAR(10) | لا | `'ACTIVE'` | حالة العزل | ACTIVE، RELEASED، REMOVED | `ACTIVE` |
| `started_by_id` | UUID (FK) | نعم | `NULL` | من بدأ العزل | `accounts_user.id` | `a3f2…` |
| `closed_by_id` | UUID (FK) | نعم | `NULL` | من أغلق العزل | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.14. `borders_health_contacttracingcase` — حالة تتبع مخالطين (13 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `case_id` | UUID (FK) | نعم | `NULL` | حالة الحجر المفهرسة (الحالة الابتدائية) | `borders_health_quarantinecase.id` | `5e6f…` |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `index_case_name` | VARCHAR(200) | لا | `''` | اسم/وصف الحالة المفهرسة (للسرايا) | نص حر | `سائق شاحنة` |
| `transport_mode` | VARCHAR(50) | لا | `''` | وسيلة النقل | نص حر | `نقل حيوانات` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة | `borders_health_vehicle.id` | `c4d9…` |
| `shared_contact_trace_id` | UUID (FK) | نعم | `NULL` | سجل التتبع المشترك في `emergency_eoc` | `emergency_eoc_contacttrace.id` | `3c4d…` |
| `follow_up_days` | SMALLINT | لا | `14` | مدة المتابعة (أيام) | `>= 0` | `14` |
| `started_at` | TIMESTAMPTZ | لا | `auto_now_add` | تاريخ بدء التتبع | طابع زمني | `2026-09-30 08:30:00+00` |
| `status` | VARCHAR(15) | لا | `'OPEN'` | حالة التتبع | OPEN، MONITORING، COMPLETED، ESCALATED | `MONITORING` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.15. `borders_health_contact` — مخالط (11 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tracing_case_id` | UUID (FK) | لا | — | حالة التتبع — النطاق عبر `tracing_case__crossing__entry_point` | `borders_health_contacttracingcase.id` | `8e9f…` |
| `full_name` | VARCHAR(200) | لا | — | الاسم الكامل للمخالط | نص حر | `سارة إبراهيم` |
| `passport_number` | VARCHAR(40) | لا | `''` | رقم الجواز (**غير فريد**؛ يمكن تكراره بين المعابر) | نص حر | `A1234567` |
| `phone` | VARCHAR(30) | لا | `''` | رقم الجوال | نص حر | `+249911998877` |
| `seat_or_relation` | VARCHAR(60) | لا | `''` | المقعد في المركبة أو صلة القرابة | نص حر | `مقعد 12 — أخ` |
| `status` | VARCHAR(15) | لا | `'IDENTIFIED'` | حالة المخالط | IDENTIFIED، CONTACTED، QUARANTINED، MONITORING، CLEARED، LOST | `CONTACTED` |
| `follow_up_day` | SMALLINT | لا | `0` | يوم المتابعة الحالي | `>= 0` | `5` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.16. `borders_health_borderhealthincident` — حادثة صحية (13 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `quarantine_case_id` | UUID (FK) | نعم | `NULL` | حالة الحجر المرتبطة | `borders_health_quarantinecase.id` | `5e6f…` |
| `title` | VARCHAR(200) | لا | — | عنوان الحادثة | نص حر | `تجمع مسافرين دون فحص` |
| `description` | TEXT | لا | `''` | وصف الحادثة | نص حر | — |
| `severity` | VARCHAR(10) | لا | `'MEDIUM'` | خطورة الحادثة | LOW، MEDIUM، HIGH، CRITICAL | `HIGH` |
| `status` | VARCHAR(15) | لا | `'OPEN'` | حالة الحادثة | OPEN، INVESTIGATING، CONTROLLED، CLOSED | `INVESTIGATING` |
| `reported_at` | TIMESTAMPTZ | لا | `auto_now_add` | وقت البلاغ | طابع زمني | `2026-09-30 10:00:00+00` |
| `closed_at` | TIMESTAMPTZ | نعم | `NULL` | وقت الإغلاق | طابع زمني | — |
| `reported_by_id` | UUID (FK) | نعم | `NULL` | المبلِّغ | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.17. `borders_health_borderemergency` — طوارئ صحية (14 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `shared_event_id` | UUID (FK) | نعم | `NULL` | حدث الطوارئ المشترك | `emergency_eoc_emergencyevent.id` | `4d5e…` |
| `disease_id` | UUID (FK) | نعم | `NULL` | المرض المسبِّب | `laboratory_disease.id` | `9b0c…` |
| `title` | VARCHAR(200) | لا | — | عنوان الطوارئ | نص حر | `تفشي حمى الوادي` |
| `description` | TEXT | لا | `''` |وصف الطوارئ | نص حر | — |
| `restriction_level` | VARCHAR(25) | لا | `'ADVISORY'` | مستوى تقييد الحركة (بند IHR) | ADVISORY، INCREASED_SURVEILLANCE، MOVEMENT_REDUCED، MOVEMENT_SUSPENDED، CLOSED | `MOVEMENT_REDUCED` |
| `status` | VARCHAR(15) | لا | `'OPEN'` | حالة الطوارئ | OPEN، ACTIVE، CONTROLLED، CLOSED | `ACTIVE` |
| `reported_at` | TIMESTAMPTZ | لا | `auto_now_add` | وقت البلاغ | طابع زمني | `2026-09-30 10:00:00+00` |
| `resolved_at` | TIMESTAMPTZ | نعم | `NULL` | وقت الإنهاء | طابع زمني | — |
| `reported_by_id` | UUID (FK) | نعم | `NULL` | المبلِّغ | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.18. `borders_health_bordercertificate` — شهادة معبرية (15 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `certificate_number` | VARCHAR(50) | لا | — (UNIQUE) | رقم الشهادة الفريد | تسلسلي عبر `_next_sequence` | `BH-CERT-2026-0001` |
| `certificate_type` | VARCHAR(25) | لا | — | نوع الشهادة | HEALTH_CLEARANCE، INSPECTION، PASSAGE_PERMIT، QUARANTINE_RELEASE، REJECTION | `HEALTH_CLEARANCE` |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `traveler_id` | UUID (FK) | نعم | `NULL` | المسافر | `travelers_traveler.id` | `7b1e…` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة | `borders_health_vehicle.id` | `c4d9…` |
| `vehicle_inspection_id` | UUID (FK) | نعم | `NULL` | تفتيش المركبة المرتبط | `borders_health_vehicleinspection.id` | `2b3c…` |
| `issue_date` | DATE | لا | — | تاريخ الإصدار | تاريخ | `2026-09-30` |
| `expiry_date` | DATE | نعم | `NULL` | تاريخ الانتهاء | تاريخ | `2026-10-07` |
| `status` | VARCHAR(15) | لا | `'DRAFT'` | حالة الشهادة | DRAFT، ISSUED، EXPIRED، REVOKED، CANCELLED | `ISSUED` |
| `qr_payload` | VARCHAR(500) | لا | `''` | محتوى رمز QR للتحقق | نص حر | `NQP:BH-CERT-2026-0001` |
| `issued_by_id` | UUID (FK) | نعم | `NULL` | من أصدر الشهادة | `accounts_user.id` | `a3f2…` |
| `notes` | TEXT | لا | `''` | ملاحظات | نص حر | — |

### 9.19. `borders_health_borderdecision` — قرار (13 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `subject_type` | VARCHAR(30) | لا | `''` | نوع المخاطَب بالقرار | نص حر | `TRAVELER` |
| `traveler_id` | UUID (FK) | نعم | `NULL` | المسافر المخاطَب | `travelers_traveler.id` | `7b1e…` |
| `vehicle_id` | UUID (FK) | نعم | `NULL` | المركبة المخاطَب بها | `borders_health_vehicle.id` | `c4d9…` |
| `cargo_inspection_id` | UUID (FK) | نعم | `NULL` | تفتيش الشحنة المخاطَب به | `borders_health_cargoinspection.id` | `4c5d…` |
| `quarantine_case_id` | UUID (FK) | نعم | `NULL` | حالة الحجر المخاطَب بها | `borders_health_quarantinecase.id` | `5e6f…` |
| `outcome` | VARCHAR(20) | لا | — | نتيجة القرار | CLEARED، CONDITIONAL، HOLD، REFERRED، REJECTED، ENFORCEMENT | `CLEARED` |
| `reason` | TEXT | لا | `''` | المبرر (سجل قابل للتدقيق) | نص حر | `فحص نظيف` |
| `decided_by_id` | UUID (FK) | نعم | `NULL` | المُقرِّر | `accounts_user.id` | `a3f2…` |
| `decided_at` | TIMESTAMPTZ | لا | `auto_now_add` | وقت القرار | طابع زمني | `2026-09-30 06:25:00+00` |

### 9.20. `borders_health_bordernotification` — إشعار معبر (12 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `recipient_role` | VARCHAR(40) | لا | `''` | الدور المستلم | نص حر | `SECTOR_MANAGER` |
| `recipient_contact` | VARCHAR(120) | لا | `''` | جهة الاتصال (بريد/هاتف) | نص حر | `+249911223344` |
| `title` | VARCHAR(200) | لا | — | عنوان الإشعار | نص حر | `إخطار: حالة عزل حرجة` |
| `body` | TEXT | لا | `''` | نص الإشعار | نص حر | — |
| `channel` | VARCHAR(15) | لا | `'INTERNAL'` | قناة الإرسال | INTERNAL، EMAIL، SMS، PUSH | `SMS` |
| `status` | VARCHAR(10) | لا | `'PENDING'` | حالة الإرسال | PENDING، SENT، FAILED | `SENT` |
| `sent_at` | TIMESTAMPTZ | نعم | `NULL` | وقت الإرسال | طابع زمني | `2026-09-30 11:00:00+00` |
| `sent_by_id` | UUID (FK) | نعم | `NULL` | المرسل | `accounts_user.id` | `a3f2…` |

### 9.21. `borders_health_borderdailystatistics` — إحصاء يومي (15 عموداً)
| العمود | النوع | NULL | الافتراضي | المعنى | القيم المسموحة | مثال |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crossing_id` | UUID (FK) | لا | — | المعبر (عمود النطاق) | `borders_health_bordercrossing.id` | `0e1c…` |
| `stat_date` | DATE | لا | — | التاريخ | تاريخ | `2026-09-30` |
| `travelers_inbound` | INTEGER | لا | `0` | عدد المسافرين الداخلين | `>= 0` | `412` |
| `travelers_outbound` | INTEGER | لا | `0` | عدد المسافرين الخارجين | `>= 0` | `305` |
| `vehicles_inspected` | INTEGER | لا | `0` | عدد المركبات المفحوصة | `>= 0` | `88` |
| `cargo_inspections` | INTEGER | لا | `0` | عدد عمليات تفتيش الشحنات | `>= 0` | `24` |
| `quarantine_cases` | INTEGER | لا | `0` | عدد حالات الحجر | `>= 0` | `3` |
| `isolation_cases` | INTEGER | لا | `0` | عدد حالات العزل | `>= 0` | `1` |
| `suspected_cases` | INTEGER | لا | `0` | عدد الحالات المشتبه بها (`risk_level = RED`) | `>= 0` | `2` |
| `certificates_issued` | INTEGER | لا | `0` | عدد الشهادات الصادرة | `>= 0` | `390` |
| `samples_collected` | INTEGER | لا | `0` | عدد العينات المسحوبة | `>= 0` | `11` |
| `average_processing_minutes` | INTEGER | نعم | `NULL` | متوسط زمن المعالجة (دقائق) | `>= 0` | `18` |
| — (قيد) | — | — | `unique_border_daily_statistic` | صف واحد لكل معبر في اليوم | UNIQUE (crossing_id, stat_date) | — |
