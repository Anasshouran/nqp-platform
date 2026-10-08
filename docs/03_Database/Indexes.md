# استراتيجية الفهرسة (Indexes Strategy)

## 1. مقدمة
الفهارس ضرورية لضمان أداء عالٍ مع تزايد عدد السجلات (ملايين المسافرين والفحوصات). تم اختيار الفهارس بناءً على أنماط الاستعلام المتوقعة.

## 2. فهارس المفاتيح الأساسية والأجنبية (PK & FK)
جميع المفاتيح الأساسية (Primary Keys) والمفاتيح الأجنبية (Foreign Keys) تحصل تلقائياً على فهارس (B-Tree) في PostgreSQL، ولكن سيتم إعادة إنشائها صراحةً لضمان الأداء.

## 3. فهارس مخصصة (Custom Indexes)

| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `travelers` | `passport_number` | UNIQUE B-Tree | البحث السريع عن المسافر بجواز السفر |
| `travelers` | `phone` | B-Tree | البحث عن المسافر برقم الجوال |
| `travelers` | `(last_name, first_name)` | B-Tree | البحث بالاسم (في لوحات الأطباء) |
| `flights` | `flight_number` | B-Tree | البحث عن الرحلة |
| `flights` | `scheduled_arrival` | B-Tree | ترتيب الرحلات حسب وقت الوصول |
| `passenger_manifests` | `(flight_id, traveler_id)` | UNIQUE B-Tree | منع تكرار تسجيل نفس المسافر في نفس الرحلة |
| `health_screenings` | `(traveler_id, screened_at)` | B-Tree | استرجاع تاريخ الفحوصات لمسافر معين |
| `health_screenings` | `port_id` | B-Tree | إحصائيات الفحص حسب المنفذ |
| `risk_assessments` | `risk_level` | B-Tree | تصفية الحالات (أحمر/أصفر) |
| `lab_samples` | `sample_barcode` | UNIQUE B-Tree | البحث السريع باستخدام الباركود |
| `lab_results` | `(sample_id, disease_id)` | UNIQUE B-Tree | منع تكرار نتيجة لنفس العينة والمرض |
| `daily_health_logs` | `(follow_up_id, logged_date)` | B-Tree | استرجاع تطور حالة المريض زمنياً |
| `recovery_certificates` | `certificate_hash` | UNIQUE B-Tree | التحقق من صحة الشهادة رقمياً |
| `emergency_alerts` | `(port_id, status)` | B-Tree | لوحة الطوارئ: عرض التنبيهات النشطة |
| `food_shipments` | `manifest_number` | UNIQUE B-Tree | تتبع الشحنات الغذائية |
| `audit_logs` | `(user_id, created_at)` | B-Tree | سجلات التدقيق الخاصة بمستخدم معين |
| `external_integration_logs` | `(integration_name, request_timestamp)` | B-Tree | تتبع عمليات التكامل الخارجية |

## 4. فهارس JSONB (GIN Indexes)
نظراً لاستخدام `JSONB` بكثافة، سيتم إنشاء فهارس `GIN` لتسريع الاستعلامات داخل البيانات غير المنتظمة.

| الجدول | العمود (JSONB) | نوع الفهرس | مثال الاستعلام |
| :--- | :--- | :--- | :--- |
| `travelers` | `medical_history` | GIN | `medical_history @> '{"diabetes": true}'` |
| `health_screenings` | `observed_symptoms` | GIN | `observed_symptoms ? 'cough'` |
| `emr_records` | `clinical_notes` | GIN | `clinical_notes @> '{"diagnosis": "pneumonia"}'` |
| `food_shipments` | `product_list` | GIN | `product_list @> '[{"name": "Beef"}]'` |

## 5. الفهارس الجزئية (Partial Indexes)
| الجدول | الشرط (WHERE) | الأعمدة | الغرض |
| :--- | :--- | :--- | :--- |
| `health_screenings` | `screened_at > NOW() - INTERVAL '7 days'` | `port_id` | إحصائيات الأسبوع الحالي فقط (تقليل حجم الفهرس) |
| `emergency_alerts` | `status = 'NEW'` | `port_id` | تسريع لوحة الإنذارات الجديدة |
| `follow_up_patients` | `status = 'ACTIVE'` | `traveler_id` | تسريع البحث عن المرضى النشطين |

## 6. فهارس نظام صحة المعابر البرية (`bh_*`)

> التطبيق `apps.borders_health` — **28 فهرساً** كلها من نوع `BTREE`، أُضيفت دفعةً واحدة في الترحيل `borders_health.0007` (`AddIndex`).
> الفهارس معلنة في `Meta.indexes` على مستوى كل موديل، وهذا سبب وجودها صراحةً في `init.sql` لقسم 12، على خلاف بقية وحدات المستند التي يفصل فهارسها ملف مستقل.
>
> **لماذا أغلب الفهارس تبدأ بـ `crossing_id`:** كل سجل تشغيلي يحمل `crossing_id`، والتحقق من النطاق يمرّ دائماً عبر `crossing__entry_point` مقابل معرّفات `ScopeType.PORT` للمستخدم. أي أن استعلام القائمة الحقيقي يبدأ بـ `WHERE crossing_id IN (…)` ثم يضيّق بـ `status` أو تاريخ. لذلك بُنيت الفهارس على النمط `(crossing_id, <عمود التصفية أو التاريخ>)` ليخدم التصفية والعدّ معاً في مسح واحد (Index Scan) بدل `BitmapAnd` على فهرسين.

### 6.1. إدارة المعابر (5)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_bordercrossing` | `operating_status` (`bh_o_xc`) | B-Tree | لوحة القيادة: عدّ المعابر `operating_status = 'OPEN'` مقابل `RESTRICTED / LIMITED / EMERGENCY / CLOSED` |
| `borders_health_bordercrossing` | `neighbor_country` (`bh_n_xc`) | B-Tree | تصفية ومقارنة حركة المعابر حسب الدولة المجاورة |
| `borders_health_borderfacility` | `(crossing_id, kind)` (`bh_ck_fac`) | B-Tree | قائمة مرافق معبر معيّن مصنّفة بالنوع: `WHERE crossing_id IN (…) AND kind = 'LABORATORY'` |
| `borders_health_bordershift` | `(crossing_id, shift_date)` (`bh_cs_shf`) | B-Tree | جدول الورديات لمعاينة يوم/فترة: `WHERE crossing_id IN (…) AND shift_date BETWEEN … AND …` |
| `borders_health_borderstaff` | `(crossing_id, is_active)` (`bh_ci_stf`) | B-Tree | كشف القوة البشرية العاملة: `WHERE crossing_id IN (…) AND is_active = TRUE` |

### 6.2. فحص المسافرين والإقرار الصحي (8)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_travelerhealthrecord` | `(crossing_id, entry_at)` (`bh_ce_thr`) | B-Tree | حركة المسافرين اليومية لكل معبر: `WHERE crossing_id IN (…) AND entry_at__gte = <start>` — يغذّي `refresh_daily_statistics` و`national_overview` |
| `borders_health_travelerhealthrecord` | `(traveler_id, crossing_id)` (`bh_tc_thr`) | B-Tree | تاريخ عبور مسافر واحد عبر المعابر: `WHERE traveler_id = ?` ثم تضييق بالمعبر |
| `borders_health_travelerhealthrecord` | `(crossing_id, risk_level)` (`bh_cr_thr`) | B-Tree | عدّ الحالات المشتبه بها: `WHERE crossing_id IN (…) AND risk_level = 'RED'` (بطاقة `suspected_cases`) |
| `borders_health_healthdeclaration` | `(crossing_id, declared_at)` (`bh_cd_dcl`) | B-Tree | قائمة الإقرارات الحديثة بالمعبر مع الترتيب الزمني: `WHERE crossing_id IN (…) ORDER BY declared_at DESC` |
| `borders_health_healthdeclaration` | `(traveler_id, crossing_id)` (`bh_tc_dcl`) | B-Tree | إقرارات مسافر واحد عبر المعابر |
| `borders_health_borderscreening` | `(crossing_id, screened_at)` (`bh_cs_scr`) | B-Tree | سجل الفحوصات اليومي بالمعبر: `WHERE crossing_id IN (…) AND screened_at >= <start>` |
| `borders_health_borderscreening` | `(traveler_id, crossing_id)` (`bh_tc_scr`) | B-Tree | فحوصات مسافر واحد عبر المعابر |
| `borders_health_borderscreening` | `(crossing_id, decision)` (`bh_cd_scr`) | B-Tree | تصفية الفحوصات بالقرار: `WHERE crossing_id IN (…) AND decision = 'QUARANTINED'` |

### 6.3. المركبات وتفتيشها (2)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_vehicle` | `(crossing_id, status)` (`bh_cs_veh`) | B-Tree | أسطول معبر معيّن بحالة: `WHERE crossing_id IN (…) AND status = 'UNDER_QUARANTINE'` |
| `borders_health_vehicleinspection` | `(vehicle_id, inspection_date)` (`bh_vi_vin`) | B-Tree | تاريخ تفتيش مركبة + histogram تفتيش يومي: `WHERE vehicle_id = ? AND inspection_date >= <start>`. فهو الفهرس الوحيد لجدول **بلا `crossing_id`**، فيخدم النطاق متعدد المستويات `vehicle__crossing__entry_point` والإحصاء اليومي عبر صلة `vehicle` |

### 6.4. الشحنات والعيّنات (3)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_cargoinspection` | `(crossing_id, scope, status)` (`bh_css_crg`) | B-Tree | لوحة تفتيش الشحنات: `WHERE crossing_id IN (…) AND scope = 'FOOD' AND status = 'PENDING'` — فهرس ثلاثي يخدم التصفية المزدوجة |
| `borders_health_bordersample` | `(crossing_id, collected_at)` (`bh_cc_smp`) | B-Tree | عينات اليوم بالمعبر: `WHERE crossing_id IN (…) AND collected_at >= <start>` |
| `borders_health_bordersample` | `(cargo_inspection_id, status)` (`bh_cs_smp`) | B-Tree | عدّ عينات تفتيش شحنة بعينها بحالة: `WHERE cargo_inspection_id = ? AND status = 'REJECTED'` — يحدّد قرار الشحنة |

### 6.5. العزل والحجر وتتبع المخالطين (5)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_quarantinecase` | `(crossing_id, status)` (`bh_cs_qua`) | B-Tree | بطاقة «الحجر النشط» وطاولة الفحص: `WHERE crossing_id IN (…) AND status = 'UNDER_QUARANTINE'` |
| `borders_health_quarantinecase` | `(crossing_id, entry_at)` (`bh_ce_qua`) | B-Tree | حالات الحجر اليومية: `WHERE crossing_id IN (…) AND entry_at >= <start>` (إحصاء `quarantine_cases`) |
| `borders_health_isolationcase` | `(crossing_id, status)` (`bh_cs_iso`) | B-Tree | بطاقة «العزل النشط»: `WHERE crossing_id IN (…) AND status = 'ACTIVE'` |
| `borders_health_contacttracingcase` | `(crossing_id, status)` (`bh_cs_ctc`) | B-Tree | متابعة حالات التتبع: `WHERE crossing_id IN (…) AND status IN ('OPEN','MONITORING')` |
| `borders_health_contact` | `(tracing_case_id, status)` (`bh_ts_con`) | B-Tree | قائمة مخالطي حالة تتبع واحدة: `WHERE tracing_case_id = ? AND status = 'LOST'` — الفهرس الوحيد لجدول بلا `crossing_id` |

### 6.6. الطوارئ والحوادث والشهادات والقرارات والإشعارات (5)
| الجدول | العمود (Columns) | نوع الفهرس | الغرض |
| :--- | :--- | :--- | :--- |
| `borders_health_borderhealthincident` | `(crossing_id, status)` (`bh_cs_inc`) | B-Tree | حوادث المعابر المفتوحة: `WHERE crossing_id IN (…) AND status = 'OPEN'` |
| `borders_health_borderemergency` | `(crossing_id, status)` (`bh_cs_emg`) | B-Tree | بطاقة الطوارئ: `WHERE crossing_id IN (…) AND status IN ('OPEN','ACTIVE')` |
| `borders_health_bordercertificate` | `(crossing_id, issue_date)` (`bh_ci_crt`) | B-Tree | شهادات إصدار يوم معيّن: `WHERE crossing_id IN (…) AND issue_date = <today>` — يخدم أيضاً قيد `certificate_number` UNIQUE كصورة مفهرسة منفصلة |
| `borders_health_borderdecision` | `(crossing_id, decided_at)` (`bh_cd_dec`) | B-Tree | سجل القرارات الزمني: `WHERE crossing_id IN (…) AND decided_at >= <start>` مع الترتيب `DESC` |
| `borders_health_bordernotification` | `(crossing_id, sent_at)` (`bh_cs_ntf`) | B-Tree | سجل إشعارات المعبر: `WHERE crossing_id IN (…) AND sent_at >= <start>` |

### 6.7. ملاحظات
| الملاحظة | التفصيل |
| :--- | :--- |
| `borders_health_borderdailystatistics` بلا فهرس `bh_*` | استعلاماته (`WHERE crossing_id IN (…) AND stat_date >= …`) يخدمه مباشرةً فهرس القيد الفريد `unique_border_daily_statistic (crossing_id, stat_date)` — تغطية فهرسية كاملة بلا ازدواج. |
| الفهارس الموروثة تلقائياً من PostgreSQL | كل مفتاح `id` (PK) وكل قيد `UNIQUE` يملك فهرس B-Tree تلقائي، ومنها `borders_health_bordercrossing_entry_point_id_key` الذي يخدم تحويل `entry_point_id` ← نطاق المستخدم ← `crossing_id`. |
| الدوال الحقيقية | استعلام `VehicleInspection` يحتاج صلة مع `borders_health_vehicle` للوصول إلى النطاق (`vehicle__crossing_id IN (…)`)، فهو غير قابل للخدمة بفهرس واحد على جدول التفتيش نفسه. |
| ترتيب الأعمدة | في الفهارس `(traveler_id, crossing_id)` و `(cargo_inspection_id, status)` يُوضع عمود التحديد أولاً؛ وفي البقية `(crossing_id, …)` لأن العمود الأول هو بؤرة النطاق الأوسع. |
