# 20_Land_Border_Health_System - نظام صحة المعابر البرية

> تطبيق مستقل داخل المنصة: `backend/apps/borders_health` — الماركة `borders_health` — تحت الجذر `/api/v1/borders-health/`.
> جميع الأرقام في هذه الوثيقة مأخوذة من الكود وقاعدة بيانات التطوير فعليًا (انظر [14_حالة_التنفيذ](#14-حالة-التنفيذ-مقابل-الكود)).

## 1. الهدف الاستراتيجي

نظام صحة عامة متكامل للمعابر البرية يغطي دورة حياة المسافر والشحنة من لحظة الوصول حتى المغادرة: تسجيل المعبر ونطاقه، فحص المسافر، تفتيش المركبة والبضاعة، تنزيل العيّنات، فرض قرار، الحجر والعزل وتتبّع المخالطين، إصدار الشهادات، إدارة الطوارئ والحوادث، وبثّ الحصيلة اليومية على قيادة صحة المعابر على المستوى الوطني.

الفصل الجوهري لهذا التطبيق: **المعبر البرية ليس نوعًا من `masterdata` فحسب، بل سجل تشغيل الصحي**. نقطة الدخول (`masterdata.EntryPoint`) تصف الموقع؛ أما `BorderCrossing` فيصف الحالة التشغيلية والسعات والمرافق وساعات العمل، وكل ما يُسجَّل من فحوصات وقرارات وإحصاءات يرتبط به لا بنقطة الدخول مباشرة.

## 2. أهداف النظام

| # | الهدف | نموذج البيانات / نقطة النهاية الداعمة |
| :--- | :--- | :--- |
| 1 | تمثيل كل معبر بري بسجل تشغيل صحي مرتبط بمنفذ بري واحد | `BorderCrossing` <-> `masterdata.EntryPoint` (علاقة `OneToOne`) |
| 2 | توثيق الطور البنية والتشغيلية للمعبر | `BorderFacility`, `BorderShift`, `BorderStaff` |
| 3 | تسجيل حركة المسافرين وإقراراتهم الصحية | `TravelerHealthRecord`, `HealthDeclaration` |
| 4 | فحص المسافر واشتقاق القرار آليًا من القياسات | `BorderScreening` + إجراء `reassess` |
| 5 | تفتيش المركبات وال بضائع البرية وقراراتها | `Vehicle`, `VehicleInspection`, `CargoInspection` |
| 6 | تنزيل العيّنات وربطها بمختبر المنصة | `BorderSample` <-> `laboratory.LabSample` |
| 7 | إدارة الحجر والعزل وتتبّع المخالطين | `QuarantineCase`, `IsolationCase`, `ContactTracingCase`, `Contact` |
| 8 | إصدار شهادات برقم تسلسلي ومحتوى QR مولَّد من الخادم | `BorderCertificate` + إجراء `issue` |
| 9 | تسجيل الحوادث والطوارئ بنِسَب تقييد متدرّجة | `BorderHealthIncident`, `BorderEmergency` |
| 10 | توثيق القرارات والإشعارات وحصيلة اليوم | `BorderDecision`, `BorderNotification`, `BorderDailyStatistics` |
| 11 | لوحة قيادة وطنية مجمّعة محصورة بنطاق المستخدم | `BordersHealthDashboardViewSet` (3 قراءات) |

## 3. الهيكل الوظيفي — المكونات الـ 21

كل النماذج ترث `core.models.BaseModel` (abstract)، أي أن لكل جدول: `id UUID` مفتاح أساسي، `created_at` و`updated_at` من نوع `TIMESTAMP WITH TIME ZONE` يملأهما `auto_now_add` / `auto_now`. لا يوجد أي `DEFAULT` على مستوى قاعدة البيانات لهذه الأعمدة.

### 3.1. المعابر والمرافق والطواقم (4 نماذج)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `BorderCrossing` | `borders_health_bordercrossing` | `entry_point`, `border_type`, `neighbor_country`, `operating_status`, `operating_hours`, `daily_capacity`, `working_agencies`, `has_health_facility`, `has_laboratory`, `has_quarantine_facility`, `has_isolation_facility`, `quarantine_capacity`, `closure_reason`, `notes` | `entry_point_id` فريد <= منفذ بري واحد إلى سجل `BorderCrossing` واحد على الأكثر. سجل المعبر **عمود النطاق** الوحيد في التطبيق. |
| `BorderFacility` | `borders_health_borderfacility` | `crossing`, `kind`, `name_ar`, `name_en`, `capacity`, `staff_count`, `is_operational`, `notes` | ثمانية أنواع: `HEALTH`, `LABORATORY`, `QUARANTINE`, `ISOLATION`, `STORAGE`, `WATER_SANITATION`, `WASTE`, `VECTOR_CONTROL`. |
| `BorderShift` | `borders_health_bordershift` | `crossing`, `shift_date`, `shift_type`, `started_at`, `ended_at`, `supervisor`, `is_staffed`, `notes` | أربعة أنواع وردية: `MORNING`, `AFTERNOON`, `NIGHT`, `ROTATING`. |
| `BorderStaff` | `borders_health_borderstaff` | `crossing`, `user`, `role`, `assignment_type`, `starts_on`, `ends_on`, `is_active`, `notes` | تسعة أدوار كادر. القيد `unique_border_staff_assignment` على `(crossing_id, user_id, role)` يمنع إسناد نفس المستخدم نفس الدور مرتين في المعبر نفسه. |

### 3.2. المسافرون والإقرارات (2 نموذجان)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `TravelerHealthRecord` | `borders_health_travelerhealthrecord` | `crossing`, `traveler`, `direction`, `entry_at`, `departure_country`, `visited_countries`, `transport_mode`, `vehicle`, `health_status`, `risk_level`, `decision`, `assessed_by`, `notes` | النموذج الوحيد في التطبيق الذي يحمل `risk_level` (3 مستويات). `entry_at` افتراضه `timezone.now`. |
| `HealthDeclaration` | `borders_health_healthdeclaration` | `crossing`, `traveler`, `departure_country`, `departure_date`, `visited_countries`, `health_conditions`, `current_symptoms`, `contact_name`, `contact_phone`, `declared_at`, `status`, `reviewed_by`, `notes` | الإقرار المُدخَل من المسافر، منفصل عن قرار الفحص الذي يحسبه الخادم. |

### 3.3. الفحص الصحي (نموذج واحد)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `BorderScreening` | `borders_health_borderscreening` | `crossing`, `traveler`, `shared_screening`, `body_temperature`, `oxygen_saturation`, `observed_symptoms`, `risk_level`, `document_verified`, `vaccination_verified`, `screening_certificate`, `decision`, `screened_by`, `screened_at`, `notes` | `body_temperature` و`oxygen_saturation` من نوع `DOUBLE PRECISION` (وليس `INT`). `observed_symptoms` من نوع `JSONB` ويقبل خدمات التطبيق عدة أشكال مدخلات (انظر §6). |

### 3.4. المركبات والبضائع (3 نماذج)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `Vehicle` | `borders_health_vehicle` | `crossing`, `plate_number`, `chassis_number`, `vehicle_type`, `make_model`, `year_of_manufacture`, `capacity`, `owner_name`, `driver_name`, `driver_phone`, `status`, `notes` | ثمانية أنواع مركبة. `plate_number` فريد **عالميًا** (لا لكل معبر). |
| `VehicleInspection` | `borders_health_vehicleinspection` | `vehicle`, `inspection_type`, `inspection_date`, `inspector`, `cleanliness_status`, `pest_control_status`, `waste_status`, `cooling_status`, `findings`, `overall_status`, `reinspection_required` | سبعة أنواع تفتيش. **لا يحمل `crossing_id`**؛ يُشتق من المركبة — انظر مسار النطاق §5. |
| `CargoInspection` | `borders_health_cargoinspection` | `crossing`, `scope`, `food_shipment`, `facility`, `declaration_number`, `product_type`, `country_of_origin`, `vehicle`, `samples_collected`, `laboratory_result`, `status`, `decision`, `decided_by`, `decided_at`, `notes` | أربعة نطاقات: `CARGO`, `FOOD`, `WAREHOUSE`, `WATER_SANITATION`. سبع حالات. |

### 3.5. العيّنات (نموذج واحد)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `BorderSample` | `borders_health_bordersample` | `crossing`, `lab_sample`, `cargo_inspection`, `vehicle`, `sample_code`, `sample_type`, `collected_by`, `collected_at`, `status`, `result`, `notes` | خمس حالات. `sample_code` حر (لا فريد) لأن الترقيم الفعلي يحدث في `laboratory.LabSample`. |

### 3.6. الحجر والعزل وتتبّع المخالطين (4 نماذج)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `QuarantineCase` | `borders_health_quarantinecase` | `case_number`, `crossing`, `traveler`, `person_name`, `health_case`, `disease`, `clinic`, `facility`, `entry_at`, `required_days`, `expected_end_date`, `actual_end_date`, `phase`, `status`, `follow_up_notes` | 7 مراحل، 5 حالات. `case_number` فريد و**قابل لـ NULL** — انظر §7.2. |
| `IsolationCase` | `borders_health_isolationcase` | `crossing`, `quarantine_case`, `clinic_isolation`, `facility`, `start_date`, `expected_end_date`, `end_date`, `status`, `started_by`, `closed_by`, `notes` | ثلاث حالات. لا يوجد قيد `CHECK` على ترتيب التواريخ. |
| `ContactTracingCase` | `borders_health_contacttracingcase` | `case`, `crossing`, `index_case_name`, `transport_mode`, `vehicle`, `shared_contact_trace`, `follow_up_days`, `started_at`, `status`, `notes` | أربع حالات تتبّع. `follow_up_days` افتراضه 14. |
| `Contact` | `borders_health_contact` | `tracing_case`, `full_name`, `passport_number`, `phone`, `seat_or_relation`, `status`, `follow_up_day`, `notes` | ست حالات. **لا يحمل `crossing_id`**؛ يُشتق من حالة التتبّع — انظر مسار النطاق §5. |

### 3.7. الحوادث والطوارئ والقرارات والإشعارات (4 نماذج)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `BorderHealthIncident` | `borders_health_borderhealthincident` | `crossing`, `quarantine_case`, `title`, `description`, `severity`, `status`, `reported_at`, `closed_at`, `reported_by`, `notes` | 4 مستويات شدة، 4 حالات. |
| `BorderEmergency` | `borders_health_borderemergency` | `crossing`, `shared_event`, `disease`, `title`, `description`, `restriction_level`, `status`, `reported_at`, `resolved_at`, `reported_by`, `notes` | 5 مستويات تقييد. |
| `BorderDecision` | `borders_health_borderdecision` | `crossing`, `subject_type`, `traveler`, `vehicle`, `cargo_inspection`, `quarantine_case`, `outcome`, `reason`, `decided_by`, `decided_at` | 6 نتائج ممكنة. سجل قرار عام متعدد الأنواع (`subject_type`). |
| `BorderNotification` | `borders_health_bordernotification` | `crossing`, `recipient_role`, `recipient_contact`, `title`, `body`, `channel`, `status`, `sent_at`, `sent_by` | 4 قنوات، 3 حالات. **سجل بلا أثر جانبي**: لا يرسل بريدًا ولا رسالة ولا إشعارًا فوريًا — انظر §13.2 البند 3. |

### 3.8. الشهادات والحصيلة اليومية (نموذجان)

| النموذج | الجدول | الأعمدة الوظيفية | ملاحظة تصميمية |
| :--- | :--- | :--- | :--- |
| `BorderCertificate` | `borders_health_bordercertificate` | `certificate_number`, `certificate_type`, `crossing`, `traveler`, `vehicle`, `vehicle_inspection`, `issue_date`, `expiry_date`, `status`, `qr_payload`, `issued_by`, `notes` | 5 أنواع شهادات. `certificate_number` فريد عالميًا، ويُولَّد تسلسليًا من الخادم. |
| `BorderDailyStatistics` | `borders_health_borderdailystatistics` | `crossing`, `stat_date`, `travelers_inbound`, `travelers_outbound`, `vehicles_inspected`, `cargo_inspections`, `quarantine_cases`, `isolation_cases`, `suspected_cases`, `certificates_issued`, `samples_collected`, `average_processing_minutes` | 9 عدّادات افتراضها `0`. القيد `unique_border_daily_statistic` على `(crossing_id, stat_date)` يجعل `update_or_create` آمنًا. **النموذج الوحيد بلا فهرس `bh_*`** لأن القيد الفريد يخدم نفس غرض الفهرس. |

## 4. نقاط النهاية الخلفية (API Endpoints)

### 4.1. التركيب

| البند | القيمة | المصدر |
| :--- | :--- | :--- |
| الجذر | `/api/v1/borders-health/` | `backend/nqp_backend/urls.py` |
| الراوتر | `DefaultRouter` واحد بـ 22 تسجيلًا | `backend/apps/borders_health/urls.py` |
| المسارات | **50 مسارًا** في مخطط OpenAPI الحي | `SchemaGenerator` |
| مخططات المكوّنات | **103 مخططًا** مُشارًا إليها من مسارات borders_health | `SchemaGenerator` |
| المصادقة | JWT عبر `simplejwt` (مشتركة على مستوى المنصة) | `settings.py` |
| غلاف الاستجابة | `EnvelopeRenderer` <= `{ status, data, message }` | `core.renderers` |
| الترحيل | `PageNumberPagination` مع `PaginatedResponse` في مخطط OpenAPI | `core.pagination` |

### 4.2. جدول التسجيلات (22)

| # | البادئة | الراوتر | basename | نموذج واحد |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `dashboard/` | `BordersHealthDashboardViewSet` | `borders-dashboard` | — (قراءة فقط) |
| 2 | `crossings/` | `BorderCrossingViewSet` | `border-crossing` | `BorderCrossing` |
| 3 | `facilities/` | `BorderFacilityViewSet` | `border-facility` | `BorderFacility` |
| 4 | `shifts/` | `BorderShiftViewSet` | `border-shift` | `BorderShift` |
| 5 | `staff/` | `BorderStaffViewSet` | `border-staff` | `BorderStaff` |
| 6 | `traveler-records/` | `TravelerHealthRecordViewSet` | `border-traveler-record` | `TravelerHealthRecord` |
| 7 | `declarations/` | `HealthDeclarationViewSet` | `border-declaration` | `HealthDeclaration` |
| 8 | `screenings/` | `BorderScreeningViewSet` | `border-screening` | `BorderScreening` |
| 9 | `vehicles/` | `VehicleViewSet` | `border-vehicle` | `Vehicle` |
| 10 | `vehicle-inspections/` | `VehicleInspectionViewSet` | `border-vehicle-inspection` | `VehicleInspection` |
| 11 | `cargo-inspections/` | `CargoInspectionViewSet` | `border-cargo-inspection` | `CargoInspection` |
| 12 | `samples/` | `BorderSampleViewSet` | `border-sample` | `BorderSample` |
| 13 | `quarantine-cases/` | `QuarantineCaseViewSet` | `border-quarantine-case` | `QuarantineCase` |
| 14 | `isolation-cases/` | `IsolationCaseViewSet` | `border-isolation-case` | `IsolationCase` |
| 15 | `contact-tracing-cases/` | `ContactTracingCaseViewSet` | `border-contact-tracing-case` | `ContactTracingCase` |
| 16 | `contacts/` | `ContactViewSet` | `border-contact` | `Contact` |
| 17 | `incidents/` | `BorderHealthIncidentViewSet` | `border-incident` | `BorderHealthIncident` |
| 18 | `emergencies/` | `BorderEmergencyViewSet` | `border-emergency` | `BorderEmergency` |
| 19 | `certificates/` | `BorderCertificateViewSet` | `border-certificate` | `BorderCertificate` |
| 20 | `decisions/` | `BorderDecisionViewSet` | `border-decision` | `BorderDecision` |
| 21 | `notifications/` | `BorderNotificationViewSet` | `border-notification` | `BorderNotification` |
| 22 | `daily-statistics/` | `BorderDailyStatisticsViewSet` | `border-daily-statistic` | `BorderDailyStatistics` |

**21 راوتر** من أصل 22 يوفّر مجموعة CRUD كاملة، وجميعها تحدّ `http_method_names` بـ `['get', 'post', 'patch', 'delete']` — أي **لا يوجد `PUT` ولا `destroy` في شيفرة الراوتر** (المسارات تظهر في OpenAPI لكن `PUT` و`DELETE` غير مسموحين). الراوتر الثاني والعشرون (لوحة القيادة) قراءة فقط.

### 4.3. لوحة القيادة — 3 قراءات

| الطريقة | المسار الكامل | الوظيفة الدائمة | الصلاحية المطبَّقة فعليًا |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/dashboard/overview/` | ملخص وطني مجمّع | `borders_health:dashboard_view` |
| `GET` | `/api/v1/borders-health/dashboard/crossing-performance/` | أداء المعابر | `borders_health:dashboard_view` |
| `GET` | `/api/v1/borders-health/dashboard/traffic-trend/` | اتجاه حركة المسافرين والمركبات | `borders_health:dashboard_view` |

> **تنبيه تسمية:** القراءة الثالثة تُسمَّى في الشيفرة وفي الواجهة `traffic-trend` (اتجاه الحركة)، وليست `daily-statistics`. جدول `daily-statistics` هو جدول الحصيلة اليومية نفسه وله مسار `refresh` مستقل (§4.4).

### 4.4. الإجراءات المخصّصة — 5 إجراءات

| # | الإجراء | الطريقة | المسار الكامل | `detail` | الدالة في `views.py` | الصلاحية المطبَّقة فعليًا |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | تغيير حالة المعبر | `PATCH` | `/api/v1/borders-health/crossings/{id}/status/` | `True` | `BorderCrossingViewSet.change_status` | `borders_health:edit` |
| 2 | إعادة تقييم الفحص | `POST` | `/api/v1/borders-health/screenings/{id}/reassess/` | `True` | `BorderScreeningViewSet.reassess` | `borders_health:health_screen` |
| 3 | إصدار شهادة | `POST` | `/api/v1/borders-health/certificates/issue/` | `False` | `BorderCertificateViewSet.issue` | `borders_health:certificate_issue` |
| 4 | قرار البضاعة | `POST` | `/api/v1/borders-health/cargo-inspections/{id}/decide/` | `True` | `CargoInspectionViewSet.decide` | `borders_health:cargo_inspect` |
| 5 | تحديث الحصيلة اليومية | `POST` | `/api/v1/borders-health/daily-statistics/refresh/` | `False` | `BorderDailyStatisticsViewSet.refresh` | `borders_health:dashboard_view` |

تفاصيل نافذة الإدخال لكل إجراء:

| الإجراء | الحقول المقبولة | السلوك عند الغياب أو الخطأ |
| :--- | :--- | :--- |
| `status` | `operating_status` (إلزامي منطقيًا)، `closure_reason` (اختياري) | قيمة خارج `BorderCrossing.BorderStatus` <= `ValidationError` على `operating_status`. يحدّث `operating_status` و`closure_reason` فقط عبر `save(update_fields=...)`. |
| `reassess` | `body_temperature`, `oxygen_saturation`, `observed_symptoms`, `document_verified`, `vaccination_verified` | أي حقل غير مرسل يُترك كما هو؛ ثم `apply_screening_decision` تعيد اشتقاق `risk_level` و`decision`. **لا تُقبل كتابة `decision` يدويًا** — القرار محسوب حصرًا. |
| `issue` | `crossing` (إلزامي)، `certificate_type` (إلزامي)، `expiry_days` (افتراضي 30)، `traveler`, `vehicle`, `vehicle_inspection`, `notes` | غياب `crossing` أو `certificate_type` <= `ValidationError`. `expiry_days` غير عددي <= `ValidationError`. معبر أو مركبة أو تفتيش خارج النطاق <= `ValidationError` (تسريب نطاق). ينجح بـ `201 Created`. |
| `decide` | `decision` (اختياري) | `decision` غير معروف <= `ValidationError`. عند غيابه يُحسب القرار من عيّنات الشحنة عبر `assess_cargo_inspection`. يحدّث `decision` و`decided_by` و`decided_at` و`status`. |
| `refresh` | `stat_date` (اختياري، `YYYY-MM-DD`)، `crossing` (اختياري) | تاريخ غير صالح <= `ValidationError`. معبر خارج النطاق <= `ValidationError`. بلا معبر يُعاد حساب كل معابر النطاق. الاستجابة `{ "results": [...], "count": N }`. |

### 4.5. الفلترة والترتيب والبحث

كل راوتر CRUD يستخدم `filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]`، ومعاملات `?search=` و`?ordering=` و`?<field>=` متاحة. أهم حقول البحث والترتيب:

| الراوتر | `search_fields` | `filter_fields` | `ordering_fields` |
| :--- | :--- | :--- | :--- |
| `crossings` | `entry_point__name_ar`, `entry_point__code`, `neighbor_country` | `entry_point`, `operating_status`, `border_type` | `entry_point__name_ar`, `entry_point__code` |
| `facilities` | `name_ar`, `name_en` | `crossing`, `kind`, `is_operational` | `name_ar` |
| `shifts` | `notes` | `crossing`, `shift_date`, `shift_type`, `is_staffed` | `shift_date`, `shift_type` |
| `staff` | `user__full_name`, `notes` | `crossing`, `user`, `role`, `is_active` | `role` |
| `traveler-records` | `traveler__full_name`, `traveler__passport_number` | `crossing`, `traveler`, `direction`, `risk_level`, `decision` | `entry_at`, `risk_level` |
| `declarations` | `traveler__full_name`, `traveler__passport_number` | `crossing`, `traveler`, `status` | `declared_at` |
| `screenings` | `traveler__full_name`, `traveler__passport_number` | `crossing`, `traveler`, `decision`, `risk_level` | `screened_at` |
| `vehicles` | `plate_number`, `chassis_number`, `driver_name`, `owner_name` | `crossing`, `vehicle_type`, `status` | `plate_number`, `created_at` |
| `vehicle-inspections` | `vehicle__plate_number`, `findings` | `vehicle`, `inspection_type`, `overall_status` | `inspection_date` |
| `cargo-inspections` | `declaration_number`, `product_type`, `country_of_origin` | `crossing`, `scope`, `status`, `decision`, `country_of_origin` | `created_at`, `status` |
| `samples` | `sample_code`, `sample_type` | `crossing`, `cargo_inspection`, `vehicle`, `status` | `collected_at` |
| `quarantine-cases` | `case_number`, `person_name` | `crossing`, `traveler`, `disease`, `status`, `phase` | `entry_at`, `status` |
| `isolation-cases` | `notes` | `crossing`, `quarantine_case`, `status` | `start_date`, `status` |
| `contact-tracing-cases` | `index_case_name`, `transport_mode` | `crossing`, `case`, `status`, `transport_mode` | `started_at` |
| `contacts` | `full_name`, `passport_number`, `phone` | `tracing_case`, `status` | `full_name`, `status` |
| `incidents` | `title`, `description` | `crossing`, `severity`, `status` | `reported_at` |
| `emergencies` | `title`, `description` | `crossing`, `restriction_level`, `status`, `disease` | `reported_at` |
| `certificates` | `certificate_number` | `crossing`, `traveler`, `vehicle`, `certificate_type`, `status` | `issue_date`, `status` |
| `decisions` | `reason`, `subject_type` | `crossing`, `traveler`, `vehicle`, `outcome` | `decided_at` |
| `notifications` | `title`, `body`, `recipient_role` | `crossing`, `channel`, `status` | `created_at` |
| `daily-statistics` | — | `crossing`, `stat_date` | `stat_date` |

## 5. الصلاحيات وحصر النطاق

### 5.1. طبقتا الحماية

كل راوتر في التطبيق يرث `BordersHealthScopedMixin` الذي يثبّت:

```python
permission_resource = 'borders_health'
permission_classes = [PermissionAction, MultiHopScopeFilter]
scope_type = RoleAssignment.ScopeType.PORT
```

| الطبقة | الصنف | المسؤولية |
| :--- | :--- | :--- |
| الصلاحية | `core.permissions.PermissionAction` | هل يملك المستخدم كود الإجراء لهذا المورد؟ |
| النطاق | `apps.borders_health.permissions.MultiHopScopeFilter` | هل يقع الكائن ضمن نطاق نقطة الدخول المملوك للمستخدم؟ |

`PermissionAction` يقرأ `self.permission_action` الذي يضعه `get_permissions()` من جدول `ACTION_TO_PERMISSION`، ثم يبني الكود `f'{resource}:{action}'` ويمرّره إلى `User.can()` الذي يفحص `Permission.code` في جدول `Permission` عبر `User.extra_permissions` ثم أدوار `User.role_assignments` السارية، ويطرح `User.blocked_permissions`.

### 5.2. جدول تحويل الإجراء إلى صلاحية

| `self.action` | الصلاحية المطلوبة فعليًا | الإجراء المعرَّف في الشيفرة |
| :--- | :--- | :--- |
| `list`, `retrieve` | `borders_health:view` | قراءة |
| `create` | `borders_health:add` | إضافة |
| `update`, `partial_update` | `borders_health:edit` | تعديل |
| `destroy` | `borders_health:delete` | حذف |
| `change_status` | `borders_health:edit` | إجراء مخصّص 1 |
| `reassess` | `borders_health:health_screen` | إجراء مخصّص 2 |
| `issue` | `borders_health:certificate_issue` | إجراء مخصّص 3 |
| `decide` | `borders_health:cargo_inspect` | إجراء مخصّص 4 |
| `refresh` | `borders_health:dashboard_view` | إجراء مخصّص 5 |
| `overview`, `crossing_performance`, `traffic_trend` | `borders_health:dashboard_view` | لوحة القيادة |

> **تعذّر على أي من الواجبتين — قاع مطلق.** `PermissionAction.has_permission` يرفض عند غياب `resource` أو `action` (مع تحذير)، و`MultiHopScopeFilter.has_object_permission` يرفض عند غياب نطاق صالح أو تعذّر حلّ المسار.

### 5.3. معالج النطاق متعدد القفزات

`core.permissions.ScopeFilter` يقرأ النطاق عبر `getattr(obj, f'{scope_field}_id')` أي **مستوى واحد فقط**، وهو ما لا يكفي لنماذج التطبيق. لذلك يضيف التطبيق `MultiHopScopeFilter` الذي يقطع المسار على `__` ويمشي على الكائنات:

| `scope_field` | مسار الحل | يُستخدم في |
| :--- | :--- | :--- |
| `entry_point` | `entry_point` | `crossings` |
| `crossing__entry_point` | `crossing` → `entry_point` | 18 راوتر يحمل `crossing_id` مباشرة |
| `vehicle__crossing__entry_point` | `vehicle` → `crossing` → `entry_point` | `vehicle-inspections` |
| `tracing_case__crossing__entry_point` | `tracing_case` → `crossing` → `entry_point` | `contacts` |

`resolve_scope_id` يقرأ `_id` في القفزة **الأخيرة فقط**، ويسجّل تحذيرًا ويُعيد `None` عند: مسار فارغ، أو كائن ليس له `_meta`، أو سمة غير قابلة للوصول، أو قيمة `None` في أي قفزة وسيطة. و`None` يعني **منع** لا سماح.

### 5.4. ترتيب فحص النطاق على مستوى القائمة

`_entry_point_scope_ids` يكرر ترتيب `core.permissions.ScopeFilter`: فحص الأدق (تعيين صريح) ثم تغطية القطاع ثم التغطية الوطنية. `User.active_scopes()` **تُسقِط `GLOBAL` عمدًا**، فلا يجوز تفسير قائمة فارغة دليلًا على غياب النطاق قبل فحص التغطية العامة.

| الحالة | النتيجة |
| :--- | :--- |
| `has_active_global_scope(user)` <= `True` | غير مقيّد: كل المعابر (معبر `None` ليس "بلا نتائج") |
| تعيينات PORT صريحة | يقتصر على معرّفات نقاط الدخول هذه |
| لا تعيينات صريحة، لكن تغطية وطنية/ قطاعية سارية | يُشتق النطاق من تغطية الوحداتة |
| لا شيء قابل للحل | **قائمة فارغة** مع تحذير، لا كل السجلات |

### 5.5. تجاوز `superuser`

`PermissionAction.has_permission` و`MultiHopScopeFilter.has_object_permission` يعيدان `True` فورًا إذا كان `request.user.is_superuser`.

## 6. طبقة الخدمات (Business Logic)

`backend/apps/borders_health/services.py` — 8 دوال عامة + دالة مساعدة:

| الدالة | المسؤولية | قواعد صريحة |
| :--- | :--- | :--- |
| `assess_screening(...)` | اشتقاق `risk_level` و`decision` من القياسات | تُستدعى في `BorderScreeningViewSet.perform_create` قبل الحفظ |
| `apply_screening_decision(screening)` | إعادة الاشتقاق على كائن محمَّل | تُستدعى في إجراء `reassess` |
| `assess_cargo_inspection(inspection)` | اشتقاق قرار البضاعة من عيّناتها | تُستدعى في `decide` عند غياب `decision` صريح |
| `issue_certificate(...)` | توليد `certificate_number` و`qr_payload` | يستدعي `_next_sequence` |
| `open_quarantine_case(...)` | فتح حالة حجر | يستدعي `generate_quarantine_case_number` |
| `record_clearance_decision(...)` | تسجيل قرار إخلاء | — |
| `refresh_daily_statistics(crossing, stat_date=None)` | `update_or_create` لصف الحصيلة | آمن بسبب القيد `unique_border_daily_statistic` |
| `national_overview(crossing_ids)` | تجميع لوحة القيادة | — |
| `_normalize_symptoms(value)` | تطبيع `observed_symptoms` | يقبل نص، قائمة، صف، مجموعة، أرقام، وقيم فارغة؛ والمخرج دائماً قائمة في `JSONB` |
| `_next_sequence(prefix, model, field, width=4)` | ترقيم تسلسلي داخل نطاق المعبر | — |

## 7. قواعد بيانات مُلزِمة في الشيفرة

### 7.1. ترقيم شهادات الحجر

`QuarantineCase.save()` يولّد `case_number` قبل أول `INSERT` بالصيغة `'Q-' + YYMMDD + '-' + أول 8 محارف من UUID بأحرف كبيرة`، مثل `Q-260930-A1B2C3D4`. الاعتماد على جزء من `BaseModel.id` (المولَّد مسبقًا بـ `uuid4`) يضمن التفرّد بلا عدّاد تسلسلي.

### 7.2. ترقيم شهادات الإصدار

`BorderCertificate.certificate_number` فريد عالميًا ويُولَّد تسلسليًا عبر `_next_sequence`، ويشتق `qr_payload` في الخادم — لا يُقبل من العميل.

### 7.3. تقييد إصدار الشهادة على المعبر

إجراء `issue` يفرض أن كل كيان مُحلَّل (المركبة والتفتيش) ينتمي إلى **نفس `crossing`** المطلوب، وإلا رُفض بخطأ. هذا القيد يمنع أن تُختم شهادة بمركبة أو تفتيش من معبر آخر (تسريب عبر النطاق).

## 8. سير العمل الأساسي (Workflow)

```
1. تجهيز المعبر
   BorderCrossing (حالة التشغيل) ← BorderFacility / BorderShift / BorderStaff
2. تسجيل الوصول
   TravelerHealthRecord (اتجاه + وقت الدخول + خطر مبدئي) + HealthDeclaration (إقرار المسافر)
3. الفحص
   BorderScreening ← assess_screening(body_temperature, oxygen_saturation,
                       observed_symptoms, document_verified, vaccination_verified)
   → يُشتق risk_level وdecision تلقائيًا (لا تُقبل كتابة يدوية للقرار)
4. المركبة والبضاعة
   Vehicle ← VehicleInspection
   CargoInspection ← assess_cargo_inspection(العيّنات) أو قرار فاحص صريح
5. العيّنات
   BorderSample (حالة: مسجّلة / منقولة / مستلمة / محلَّلة / مرفوضة)
   <-> laboratory.LabSample عند التحليل المخبري
6. القرار
   قرار CLEARED  → شهادة BorderCertificate عبر certificates/issue
   قرار HOLD / REFERRED / QUARANTINED
        → QuarantineCase (7 مراحل)
             → IsolationCase (عند الحاجة)
             → ContactTracingCase → Contact (المخالطون)
7.yarat
   BorderHealthIncident (حادث) / BorderEmergency (طوارئ بنِسَب تقييد)
   → BorderDecision (سجل القرار) + BorderNotification (سجل الإشعار)
8. الحصيلة
   daily-statistics/refresh → BorderDailyStatistics
   dashboard/overview + crossing-performance + traffic-trend
```

**حدّ صريح:** الخطوات فوق **دليل تشغيلي** لا أوركسترَرة أحداث. لا توجد مهام Celery في هذا التطبيق تشغّل السلسلة تلقائيًا؛ الربط بين السجلات يتم عبر حقول المفاتيح الأجنبية ونداءات الـ API. `BorderNotification` سجل بيانات فقط ولا يرسل شيئًا فعليًا.

## 9. التكامل مع الأنظمة الأخرى

كل التكامل **عبر مفاتيح أجنبية مرجعية**؛ التطبيق لا ينسخ أي كيان من تطبيق آخر.

| التطبيق المصدر | الجدول المصدر | الجدول الهدف في `borders_health` | `on_delete` |
| :--- | :--- | :--- | :--- |
| `masterdata` | `masterdata_entrypoint` | `bordercrossing.entry_point_id` | `CASCADE` |
| `travelers` | `travelers_traveler` | `travelerhealthrecord.traveler_id`, `healthdeclaration.traveler_id`, `borderscreening.traveler_id`, `quarantinecase.traveler_id`, `bordercertificate.traveler_id`, `borderdecision.traveler_id` | `PROTECT` |
| `accounts` | `accounts_user` | `borderstaff.user_id`, `bordershift.supervisor_id`, `borderscreening.screened_by_id`, `vehicleinspection.inspector_id`, `cargoinspection.decided_by_id`, `bordersample.collected_by_id`, `quarantinecase`/`isolationcase`/`incident`/`emergency`/`certificate`/`decision`/`notification` (مُبلِّغون) | `PROTECT` |
| `food_quarantine` | `food_quarantine_foodshipment` | `cargoinspection.food_shipment_id` | `SET_NULL` |
| `screening` | `screening_healthscreening` | `borderscreening.shared_screening_id` | `SET_NULL` |
| `vaccination` | `vaccination_vaccinationcertificate` | `borderscreening.screening_certificate_id` | `SET_NULL` |
| `laboratory` | `laboratory_labsample` | `bordersample.lab_sample_id` | `SET_NULL` |
| `laboratory` | `laboratory_disease` | `quarantinecase.disease_id`, `borderemergency.disease_id` | `SET_NULL` |
| `emergency_eoc` | `emergency_eoc_healthcase` | `quarantinecase.health_case_id` | `SET_NULL` |
| `emergency_eoc` | `emergency_eoc_contacttrace` | `contacttracingcase.shared_contact_trace_id` | `SET_NULL` |
| `emergency_eoc` | `emergency_eoc_emergencyevent` | `borderemergency.shared_event_id` | `SET_NULL` |
| `clinic` | `clinic_clinic` | `quarantinecase.clinic_id` | `SET_NULL` |
| `clinic` | `clinic_isolationrecord` | `isolationcase.clinic_isolation_id` | `SET_NULL` |

**حدود داخل التطبيق:** `facility_id` في `cargoinspection` و`quarantinecase` و`isolationcase` يشير إلى `borders_health_borderfacility` (داخلي، `SET_NULL`)، وليس إلى `clinic.Clinic`. احترام هذا الحد يمنع خلط مرافق المعابر بمصانع المنصة.

**تسجيل خطأ مقصود في تلك الوثيقة:** هذا الملف تحت `borders_health`؛ لا تعِد استخدام أسمائها في تطبيق آخر دون بادئة `borders_health_`.

## 10. المستخدمون والأدوار (Actors)

### 10.1. الصلاحيات — 19 صلاحية

كل الصلاحيات المخزّنة في جدول `Permission` بالماركة `borders_health` (تحقّق من قاعدة التطوير: 19 صفًا):

| # | كود الصلاحية | # | كود الصلاحية |
| :--- | :--- | :--- | :--- |
| 1 | `borders_health:view` | 11 | `borders_health:health_screen` |
| 2 | `borders_health:add` | 12 | `borders_health:vehicle_inspect` |
| 3 | `borders_health:edit` | 13 | `borders_health:cargo_inspect` |
| 4 | `borders_health:delete` | 14 | `borders_health:sample_create` |
| 5 | `borders_health:register_traveler` | 15 | `borders_health:sample_send` |
| 6 | `borders_health:case_create` | 16 | `borders_health:certificate_issue` |
| 7 | `borders_health:quarantine_manage` | 17 | `borders_health:contact_trace` |
| 8 | `borders_health:isolation_manage` | 18 | `borders_health:emergency_manage` |
| 9 | `borders_health:report_view` | 19 | `borders_health:dashboard_view` |
| 10 | `borders_health:export` | | |

### 10.2. الأدوار — 16 دورًا برّيًا + `ADMIN`

| الدور | عدد صلاحيات `borders_health` | الدور | عدد صلاحيات `borders_health` |
| :--- | :--- | :--- | :--- |
| `QUARANTINE_INSPECTOR` | 12 | `ENV_INSPECTOR` | 6 |
| `NATIONAL_QUARANTINE_DIRECTOR` | 11 | `FOOD_INSPECTOR` | 6 |
| `QUARANTINE_SECTOR_DIRECTOR` | 11 | `LAB_TECHNICIAN` | 6 |
| `BORDER_DIRECTOR` | 10 | `TRAVELER_REGISTRATION_OFFICER` | 4 |
| `EMERGENCY_OFFICER` | 10 | `CUSTOMS_OFFICER` | 3 |
| `BORDER_HEALTH_OFFICER` | 9 | `IMMIGRATION_OFFICER` | 3 |
| `EPIDEMIOLOGY_OFFICER` | 9 | `ADMIN` | 19 (كامل) |
| `QUARANTINE_DOCTOR` | 9 | | |
| `BORDER_STATION_MANAGER` | 8 | | |
| `BORDER_SYSTEM_ADMIN` | 7 | | |

**الاسماء المستعارة (Aliases) في `roleLayouts/borders.tsx`:**

| الاسم في عقد الواجهة | الدور الفعلي في `Role` |
| :--- | :--- |
| `ENVIRONMENTAL_HEALTH_INSPECTOR` | `ENV_INSPECTOR` |
| `SYSTEM_ADMIN` | `BORDER_SYSTEM_ADMIN` |

### 10.3. قاعدة القبول

`BordersHealthPage.tsx` في `roleLayouts/borders.tsx` يوجّه **كل الأدوار الستة عشر** إلى الصفحة نفسها `/app/borders-health` (بما فيها `CUSTOMS_OFFICER` و`IMMIGRATION_OFFICER`). الاختلاف بين الأدوار **ليس في الواجهة** بل في التفويض الخلفي: كل دور يرى من الأقسام ما تسمح به `borders_health` المسندة إليه، و`MultiHopScopeFilter` يقصر بياناته على نقاط دخوله.

| دور يملك `view` فقط | النتيجة أمام الإجراءات الخمسة |
| :--- | :--- |
| لا صلاحية إجراءات | يُرفض `change_status` (تحتاج `edit`)، `reassess` (`health_screen`)، `issue` (`certificate_issue`)، `decide` (`cargo_inspect`)، `refresh` (`dashboard_view`) |

هذه القاعدة هي الغرض من جدول `ACTION_TO_PERMISSION`: بدونه كان `.get(action, 'view')` يمنح أي دور يملك قراءة حق إصدار شهادة أو تغيير حالة معبر — تصعيد صلاحيات.

## 11. واجهة المستخدم الأمامية

| البند | القيمة | الملف |
| :--- | :--- | :--- |
| التحميل | `React.lazy()` | `frontend/src/routes.tsx` |
| المسار | `/app/borders-health` | `frontend/src/routes.tsx` |
| المكوّن | `BordersHealthPage` (~1871 سطرًا) | `frontend/src/pages/bordershealth/BordersHealthPage.tsx` |
| عدد الأقسام | **20 قسمًا** في مصفوفة `SECTIONS` | `frontend/src/pages/bordershealth/BordersHealthPage.tsx` |
| طبقة الـ API | 34 مُساعدًا | `frontend/src/api/endpoints/bordersHealth.ts` |
| خرائط الأدوار | 16 دورًا | `frontend/src/config/roleLayouts/borders.tsx` |

الأقسام العشرون بالترتيب: `dashboard` (لوحة القيادة)، `crossings` (المعابر)، `facilities` (المرافق)، `shifts` (الورديات)، `staff` (الكادر)، `travelers` (المسافرون)، `declarations` (الإقرارات)، `screenings` (الفحوصات)، `vehicles` (المركبات)، `vehicle-inspections` (تفتيش المركبات)، `cargo` (الشحنات)، `samples` (العيّنات)، `quarantine` (الحجر)، `isolation` (العزل)، `tracing` (تتبّع المخالطين)، `emergencies` (الطوارئ)، `certificates` (الشهادات)، `decisions` (القرارات)، `notifications` (الإشعارات)، `statistics` (الحصيلة اليومية).

**ملاحظة تسمية يجب تصحيحها:** `docs/05_API/Borders_Health_API.md` يذكر **17** قسمًا، بينما `SECTIONS` في الشيفرة **20**. الأجزاء الثلاثة المفقودة في العدّ القديم هي `vehicle-inspections` و`tracing` و`decisions`.

## 12. الاختبارات

| البند | القيمة |
| :--- | :--- |
| العدد | **66 اختبارًا** ناجحًا لتطبيق borders_health |
| الملفات | `backend/apps/borders_health/tests/test_borders_health.py`, `test_services.py` |
| التغطية | نقاط النهاية، حصر النطاق (أحادي ومتعدد القفزات)، رفض دور القراءة فقط أمام الإجراءات الخمسة، طبقة الخدمات، الحصيلة اليومية، التحقق من الشهادة على نفس المعبر |
| فحص المنصة | `python manage.py check` نظيف |

## 13. نطاق النظام وحدوده

### 13.1. ما ينفّذه التطبيق

سجل المعبر التشغيلي، دورة الفحص والقرار، العزل والحجر والتتبّع، الشهادات، الطوارئ، الحصيلة، ولوحة قيادة محصورة بنطاق المستخدم.

### 13.2. حدود معروفة (مستخرجة من الشيففة)

| # | الحد | التفصيل |
| :--- | :--- | :--- |
| 1 | لا نماذج `POST`/`PATCH` كاملة | الواجهة تقرأ وتُصدر طلبات API، لكن **لا توجد استمارات إنشاء/تعديل** للمعابر والفحوصات وتفتيش المركبات |
| 2 | لا `PUT` ولا `DELETE` | `http_method_names` على كل راوتر = `['get', 'post', 'patch', 'delete']` |
| 3 | لا إشعارات فعلية | `BorderNotification` سجل فقط؛ الإرسال مسؤولية Celery/خدمة خارجية |
| 4 | لا أوركسترَرة أحداث | السلسلة دليل تشغيلي، لا مهام خلفية |
| 5 | لا تحقق `CHECK` على القياسات | `body_temperature` و`oxygen_saturation` بلا `BETWEEN`؛ قيمة `choices` بلا قيد SQL |
| 6 | لا تحقق ترتيب التواريخ | `isolationcase` و`quarantinecase` بلا قيد `end_date >= expected_end_date` |
| 7 | `bulk_create` و`queryset.update()` تتجاوز التوليد | `case_number` و`certificate_number` تبقى `NULL` أو فارغة |
| 8 | تصادم أسماء في OpenAPI | `CargoInspection` و`HealthDeclaration` و`BlankEnum` أسماء مشتركة مع `port_health` و`clinic` |
| 9 | لا `db_table` مخصص | كل الجداول تتبع `borders_health_<model>` من `BaseModel` |
| 10 | استعلامات الهامش | `_entry_point_scope_ids` تنفّذ 3 استعلامات حد أقصى لكل طلب قائمة |

## 14. حالة التنفيذ مقابل الكود

| البند | الحالة | الدليل في الشيفرة |
| :--- | :--- | :--- |
| 21 نموذجًا | مطابق | `models.py` — 21 صنف `BaseModel`؛ 21 صف في `django_migrations` (0001–0007) |
| 22 راوتر | مطابق | `urls.py` — 22 `router.register` |
| 50 مسار OpenAPI | مطابق | `SchemaGenerator()` — 50 مسارًا تحت `/api/v1/borders-health/` |
| 103 مخطط مكوّنات | مطابق | مكوّنات مُشار إليها من مسارات borders_health |
| 3 قراءات لوحة القيادة | مطابق | `overview`, `crossing-performance`, `traffic-trend` |
| 5 إجراءات مخصّصة | مطابق | `get_extra_actions()` — 5 إجراءات عبر 5 راوترات |
| 19 صلاحية | مطابق | جدول `Permission` — 19 صفًا بالماركة `borders_health` |
| 16 دورًا + `ADMIN` | مطابق | `Role` — 16 دورًا برّيًا، و`ADMIN` بـ 19 صلاحية |
| 28 فهرس `bh_*` | مطابق | `0007` — 28 `AddIndex`؛ و28 `bh_*` في `pg_indexes` |
| 20 قسمًا في الواجهة | مطابق | `SECTIONS` — 20 مُدخلًا |
| 34 مُساعد API في الواجهة | مطابق | `bordersHealth.ts` — 34 تصديراً |

### تناقضات موثّقة مع مصادر أخرى

| المصدر | ما ورد فيه | ما في الشيفة | الأثر |
| :--- | :--- | :--- | :--- |
| `docs/05_API/Borders_Health_API.md` | 17 قسمًا في صفحة واحدة | 20 قسمًا | عدد فقط؛ المسارات والأقسام الفعلية مطابقة للباقي |
| `docs/05_API/Borders_Health_API.md` | الإجراءات تحتاج صلاحيات Django على النماذج (`borders_health.change_bordercrossing` وأخواتها) | الشيفرة تفحص `borders_health:edit` و`borders_health:health_screen` و`borders_health:certificate_issue` و`borders_health:cargo_inspect` و`borders_health:dashboard_view` عبر `PermissionAction` | **مهم**: أسماء صلاحيات النماذج المذكورة ليست ما يفرّضه التطبيق فعليًا. الفصل الصحيح يبقى واحدًا (رفض دور القراءة فقط). |
| `docs/05_API/Borders_Health_API.md` | قراءة "الحصيلة اليومية" في لوحة القيادة | المسار الفعلي `dashboard/traffic-trend/` | تسمية فقط؛ جدول الحصيلة نفسه في `daily-statistics/` |
| `docs/05_API/OpenAPI.yaml` | لقطة ثابتة | `OpenAPI.yaml` مولَّدة قبل التطبيق | استُعمل المخطط الحي (drf-spectacular) كمصدر حقيقة |
| `docs/03_Database/Indexes.md` | 28 فهرسًا | 28 `bh_*` في قاعدة التطوير | مطابق |

## 15. الوثائق الفرعية

| الوثيقة | المحتوى |
| :--- | :--- |
| [02_Database_Schema.md](02_Database_Schema.md) | الجداول الـ 21 كاملة: الأعمدة والأنواع والقيود والفهارس والعلاقات |
| [03_Border_Health_Command.md](03_Border_Health_Command.md) | تصميم Border Health Command Center: فحص المسافرين والمركبات والبضائع، الحجر والعزل، تتبّع المخالطين، الطوارئ، GIS |
| [../../05_API/Borders_Health_API.md](../../05_API/Borders_Health_API.md) | مرجع الـ API التفصيلي (انظر تناقضات §14) |
| [../../03_Database/Data_Dictionary.md](../../03_Database/Data_Dictionary.md) | قاموس بيانات المنصة الكامل (يتضمن `borders_health`) |
| [../../03_Database/Relationships.md](../../03_Database/Relationships.md) | خريطة العلاقات على مستوى المنصة |
| [../../03_Database/Constraints.md](../../03_Database/Constraints.md) | كل القيود: 7 فريدة، 69 مفتاحًا أجنبيًا، 20 `CHECK` |
| [../../03_Database/Indexes.md](../../03_Database/Indexes.md) | 28 فهرس `bh_*` بغرض الاستعلام |
