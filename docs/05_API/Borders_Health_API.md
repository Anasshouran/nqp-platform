# Borders_Health_API — واجهات نظام صحة المعابر البرية

> التطبيق: `backend/apps/borders_health/` · المسار الجذري: `/api/v1/borders-health/`
> الواجهة الأمامية: `/app/borders-health` (صفحة واحدة lazy-loaded بـ 20 قسماً)

---

## 1. نظرة عامة ومصادقة

### 1.1 ما تديره هذه الواجهات

نظام صحة المعابر البرية (Land Border Health System) يدير دورة الرقابة الصحية الكاملة على
المعابر البرية في السودان عبر **21 مورداً** مبنية على امتداد تشغيلي (`OneToOne`) لـ
`masterdata.EntryPoint` بنوع `LAND_PORT`:

- **التشغيل:** المعابر، المرافق، الورديات، إسناد الكادر.
- **الحركة:** سجلات المسافرين، الإقرارات الصحية، فحوص المسافرين.
- **المركبات والشحنات:** المركبات، تفتيش المركبات، تفتيش الشحنات، العيّنات.
- **الحجر والعزل:** حالات الحجر، حالات العزل.
- **الترصد:** حالات تتبع المخالطين، المخالطون.
- **الطوارئ:** الحوادث الصحية، الطوارئ الصحية.
- **الإفراج والتقرير:** الشهادات المعبرية، القرارات، الإشعارات، الإحصاءات اليومية.

### 1.2 المصادقة

| البند | القيمة |
| :--- | :--- |
| البروتوكول | JWT عبر `simplejwt` |
| الترويسة | `Authorization: Bearer <access_token>` |
| نقطة الدخول | وحدة المصادقة المشتركة في المنصة (`AuthViewSet.login`) — انظر [`Authentication_API.md`](./Authentication_API.md) |
| مورد الصلاحيات | `borders_health` |
| صنف الصلاحيات | `PermissionAction` (المورد/الإجراء) + `MultiHopScopeFilter` (النطاق) |
| جذر الصلاحيات | `has_active_global_scope` + `ScopeType.PORT` |

كل المسارات أدناه تتطلّب مستخدماً مصادَقاً. المستخدم الفائق (`is_superuser`) يتجاوز فحص
الصلاحية وفحص النطاق معاً.

### 1.3 صلاحيات الوحدة — 19 صلاحية

تُقسم إلى نوعين: صلاحيات CRUD/تكرار عامة (5)، وصلاحيات نطاقية متخصّصة (14).

| # | الصلاحية | الوصف |
| :--- | :--- | :--- |
| 1 | `borders_health:view` | عرض القوائم والتفاصيل + كل الإجراءات المخصّصة (انظر §3) |
| 2 | `borders_health:add` | إنشاء سجل جديد |
| 3 | `borders_health:edit` | تعديل جزئي (`PATCH`) |
| 4 | `borders_health:delete` | حذف |
| 5 | `borders_health:export` | تصدير البيانات |
| 6 | `borders_health:register_traveler` | تسجيل مسافر |
| 7 | `borders_health:health_screen` | فحص صحي |
| 8 | `borders_health:vehicle_inspect` | تفتيش مركبة |
| 9 | `borders_health:cargo_inspect` | تفتيش شحنة |
| 10 | `borders_health:sample_create` | جمع عيّنة |
| 11 | `borders_health:sample_send` | إرسال عيّنة |
| 12 | `borders_health:case_create` | فتح حالة |
| 13 | `borders_health:quarantine_manage` | إدارة الحجر |
| 14 | `borders_health:isolation_manage` | إدارة العزل |
| 15 | `borders_health:contact_trace` | تتبع مخالطين |
| 16 | `borders_health:emergency_manage` | إدارة طوارئ |
| 17 | `borders_health:certificate_issue` | إصدار شهادة |
| 18 | `borders_health:report_view` | عرض تقارير المعابر |
| 19 | `borders_health:dashboard_view` | عرض لوحة قيادة المعابر |

> **ملاحظة تنفيذية:** الصلاحيات النطاقية (6–19) مُعرَّفة في `seed_rbac.py` ومُسنَدة للأدوار،
> لكنها **غير مربوطة** بأي إجراء في الكود: خريطة `ACTION_TO_PERMISSION` في `views.py` تغطي
> إجراءات DRF القياسية فقط، فكل الإجراءات المخصّصة (§3) تُطالَب فعلياً بـ `borders_health:view`
> إضافةً إلى فحص نطاق الكائن. راجع §3.7.

### 1.4 الطرق المسموحة

كل الـ viewsets تستخدم `http_method_names = ['get', 'post', 'patch', 'delete']`:

- `GET`, `POST`, `PATCH`, `DELETE` — متاحة.
- **`PUT` غير مدعوم** على أي مورد. التعديل يتم بـ `PATCH` حصراً.
- `HEAD`/`OPTIONS` غير معرّفة صريحاً.

---

## 2. الموارد والمسارات (21 مورداً)

كل مورد يعرض: مسار القائمة، مسار التفاصيل، الفلاتر، الترتيب، البحث، والنطاق.

### 2.1 المعابر — `BorderCrossing`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/crossings/` | قائمة المعابر |
| `POST` | `/api/v1/borders-health/crossings/` | إنشاء ملف معبر |
| `GET` | `/api/v1/borders-health/crossings/{id}/` | تفاصيل معبر |
| `PATCH` | `/api/v1/borders-health/crossings/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/crossings/{id}/` | حذف |

- **بحث (`?search=`):** `entry_point__name_ar`, `entry_point__code`, `neighbor_country`
- **فلاتر:** `entry_point`, `operating_status`, `border_type`
- **ترتيب (`?ordering=`):** `entry_point__name_ar`, `entry_point__code`
- **النطاق:** `entry_point` (مستوى واحد)
- **حقول مقروءة مسطّحة:** `entry_point_code`, `name_ar`, `neighbor_state`
- **قيم `border_type`:** `ROAD` / `RAIL` / `RIVER`
- **قيم `operating_status`:** `OPEN` / `RESTRICTED` / `LIMITED` / `CLOSED` / `EMERGENCY`

### 2.2 المرافق — `BorderFacility`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/facilities/` | قائمة المرافق |
| `POST` | `/api/v1/borders-health/facilities/` | إنشاء مرفق |
| `GET` | `/api/v1/borders-health/facilities/{id}/` | تفاصيل مرفق |
| `PATCH` | `/api/v1/borders-health/facilities/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/facilities/{id}/` | حذف |

- **بحث:** `name_ar`, `name_en`
- **فلاتر:** `crossing`, `kind`, `is_operational`
- **ترتيب:** `name_ar`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قيم `kind`:** `HEALTH`, `LABORATORY`, `QUARANTINE`, `ISOLATION`, `STORAGE`, `WATER_SANITATION`, `WASTE`, `VECTOR_CONTROL`

### 2.3 الورديات — `BorderShift`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/shifts/` | قائمة الورديات |
| `POST` | `/api/v1/borders-health/shifts/` | إنشاء وردية |
| `GET` | `/api/v1/borders-health/shifts/{id}/` | تفاصيل وردية |
| `PATCH` | `/api/v1/borders-health/shifts/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/shifts/{id}/` | حذف |

- **بحث:** `notes`
- **فلاتر:** `crossing`, `shift_date`, `shift_type`, `is_staffed`
- **ترتيب:** `shift_date`, `shift_type`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `supervisor_name`
- **قيم `shift_type`:** `MORNING` / `AFTERNOON` / `NIGHT` / `ROTATING`

### 2.4 إسناد الكادر — `BorderStaff`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/staff/` | قائمة الإسنادات |
| `POST` | `/api/v1/borders-health/staff/` | إنشاء إسناد |
| `GET` | `/api/v1/borders-health/staff/{id}/` | تفاصيل إسناد |
| `PATCH` | `/api/v1/borders-health/staff/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/staff/{id}/` | حذف |

- **بحث:** `user__full_name`, `notes`
- **فلاتر:** `crossing`, `user`, `role`, `is_active`
- **ترتيب:** `role`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `user_name`
- **قيد تفرّد:** `unique_border_staff_assignment` على `(crossing, user, role)` ← تكرار ⇒ `400`
- **قيم `role`:** `MANAGER`, `DOCTOR`, `INSPECTOR`, `FOOD_INSPECTOR`, `ENVIRONMENTAL_INSPECTOR`, `REGISTRATION_OFFICER`, `LAB_TECHNICIAN`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`
- **قيم `assignment_type`:** `FULL_TIME` / `PART_TIME` / `SECONDMENT`

### 2.5 سجلات المسافرين — `TravelerHealthRecord`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/traveler-records/` | قائمة سجلات الحركة |
| `POST` | `/api/v1/borders-health/traveler-records/` | تسجيل حركة مسافر |
| `GET` | `/api/v1/borders-health/traveler-records/{id}/` | تفاصيل سجل |
| `PATCH` | `/api/v1/borders-health/traveler-records/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/traveler-records/{id}/` | حذف |

- **بحث:** `traveler__full_name`, `traveler__passport_number`
- **فلاتر:** `crossing`, `traveler`, `direction`, `risk_level`, `decision`
- **ترتيب:** `entry_at`, `risk_level`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `traveler_name`, `passport_number`, `assessed_by_name`
- **ملاحظة:** `assessed_by` حقل `HiddenField` يُملأ من المستخدم الحالي تلقائياً.
- **قيم `direction`:** `INBOUND` / `OUTBOUND`
- **قيم `health_status`:** `FIT` / `UNFIT` / `UNDER_OBSERVATION`
- **قيم `risk_level`:** `GREEN` / `YELLOW` / `RED`
- **قيم `decision`:** `CLEARED`, `HOLD`, `REFERRED`, `QUARANTINED`, `REFUSED_ENTRY`

### 2.6 الإقرارات الصحية — `HealthDeclaration`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/declarations/` | قائمة الإقرارات |
| `POST` | `/api/v1/borders-health/declarations/` | تسجيل إقرار |
| `GET` | `/api/v1/borders-health/declarations/{id}/` | تفاصيل إقرار |
| `PATCH` | `/api/v1/borders-health/declarations/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/declarations/{id}/` | حذف |

- **بحث:** `traveler__full_name`, `traveler__passport_number`
- **فلاتر:** `crossing`, `traveler`, `status`
- **ترتيب:** `declared_at`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `traveler_name`
- **قراءة فقط من الخادم:** `declared_at` (`auto_now_add`)
- **قيم `status`:** `RECEIVED` / `REVIEWED` / `APPROVED` / `REJECTED`

### 2.7 فحوص المسافرين — `BorderScreening`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/screenings/` | قائمة الفحوصات |
| `POST` | `/api/v1/borders-health/screenings/` | تسجيل فحص (**القرار يُحسَب تلقائياً**) |
| `GET` | `/api/v1/borders-health/screenings/{id}/` | تفاصيل فحص |
| `PATCH` | `/api/v1/borders-health/screenings/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/screenings/{id}/` | حذف |
| `POST` | `/api/v1/borders-health/screenings/{id}/reassess/` | **إعادة تقييم** (انظر §3.2) |

- **بحث:** `traveler__full_name`, `traveler__passport_number`
- **فلاتر:** `crossing`, `traveler`, `decision`, `risk_level`
- **ترتيب:** `screened_at`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `traveler_name`, `passport_number`, `screened_by_name`
- **ملاحظة:** `screened_by` حقل `HiddenField`؛ `screened_at` قراءة فقط.
- **قيم `decision`:** `CLEARED`, `HOLD`, `REFERRED`, `QUARANTINED` (أربعة فقط — لا `REFUSED_ENTRY`)

### 2.8 المركبات — `Vehicle`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/vehicles/` | قائمة المركبات |
| `POST` | `/api/v1/borders-health/vehicles/` | تسجيل مركبة |
| `GET` | `/api/v1/borders-health/vehicles/{id}/` | تفاصيل مركبة |
| `PATCH` | `/api/v1/borders-health/vehicles/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/vehicles/{id}/` | حذف |

- **بحث:** `plate_number`, `chassis_number`, `driver_name`, `owner_name`
- **فلاتر:** `crossing`, `vehicle_type`, `status`
- **ترتيب:** `plate_number`, `created_at`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قيد تفرّد:** `plate_number` فريد عالمياً ← تكرار ⇒ `400`
- **قيم `vehicle_type`:** `BUS`, `TRUCK`, `PRIVATE_CAR`, `AMBULANCE`, `LIVESTOCK_TRANSPORT`, `REFRIGERATED_TRUCK`, `TANKER`, `OTHER`
- **قيم `status`:** `ACTIVE` / `UNDER_QUARANTINE` / `CONDEMNED`

### 2.9 تفتيش المركبات — `VehicleInspection`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/vehicle-inspections/` | قائمة عمليات التفتيش |
| `POST` | `/api/v1/borders-health/vehicle-inspections/` | تسجيل عملية تفتيش |
| `GET` | `/api/v1/borders-health/vehicle-inspections/{id}/` | تفاصيل تفتيش |
| `PATCH` | `/api/v1/borders-health/vehicle-inspections/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/vehicle-inspections/{id}/` | حذف |

- **بحث:** `vehicle__plate_number`, `findings`
- **فلاتر:** `vehicle`, `inspection_type`, `overall_status`
- **ترتيب:** `inspection_date`
- **النطاق:** **`vehicle__crossing__entry_point`** (ثلاث قفزات — انظر §8)
- **حقول مقروءة مسطّحة:** `plate_number`, `inspector_name`
- **ملاحظة:** `inspector` حقل `HiddenField`؛ `inspection_date` قراءة فقط (`auto_now_add`).
- **قيم `inspection_type`:** `EXTERIOR`, `CARGO_HOLD`, `TEMPERATURE`, `DISINFECTION`, `PEST_CONTROL`, `WASTE`, `CABIN`
- **قيم المطابقة (`cleanliness_status`, `pest_control_status`, `waste_status`, `cooling_status`):** `COMPLIANT` / `NON_COMPLIANT` / `NOT_APPLICABLE`
- **قيم `overall_status`:** `PASSED` / `CONDITIONAL` / `FAILED`

### 2.10 تفتيش الشحنات — `CargoInspection`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/cargo-inspections/` | قائمة تفتيش الشحنات |
| `POST` | `/api/v1/borders-health/cargo-inspections/` | تسجيل تفتيش شحنة |
| `GET` | `/api/v1/borders-health/cargo-inspections/{id}/` | تفاصيل التفتيش |
| `PATCH` | `/api/v1/borders-health/cargo-inspections/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/cargo-inspections/{id}/` | حذف |
| `POST` | `/api/v1/borders-health/cargo-inspections/{id}/decide/` | **تسجيل القرار** (انظر §3.4) |

- **بحث:** `declaration_number`, `product_type`, `country_of_origin`
- **فلاتر:** `crossing`, `scope`, `status`, `decision`, `country_of_origin`
- **ترتيب:** `created_at`, `status`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `plate_number`
- **قيم `scope`:** `CARGO` / `FOOD` / `WAREHOUSE` / `WATER_SANITATION`
- **قيم `status`:** `PENDING`, `INSPECTING`, `SAMPLES_SENT`, `AWAITING_DECISION`, `RELEASED`, `REJECTED`, `HOLD`
- **قيم `decision` (`Outcome`):** `CLEARED` / `CONDITIONAL` / `REJECTED` / `HOLD`

### 2.11 العيّنات — `BorderSample`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/samples/` | قائمة العيّنات |
| `POST` | `/api/v1/borders-health/samples/` | تسجيل عيّنة |
| `GET` | `/api/v1/borders-health/samples/{id}/` | تفاصيل عيّنة |
| `PATCH` | `/api/v1/borders-health/samples/{id}/` | تعديل جزئي (تحديث `status` / `result`) |
| `DELETE` | `/api/v1/borders-health/samples/{id}/` | حذف |

- **بحث:** `sample_code`, `sample_type`
- **فلاتر:** `crossing`, `cargo_inspection`, `vehicle`, `status`
- **ترتيب:** `collected_at`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `collected_by_name`
- **ملاحظة:** `collected_by` حقل `HiddenField`؛ `collected_at` قراءة فقط.
- **قيم `status`:** `COLLECTED` / `SENT` / `UNDER_TEST` / `RESULT_RECEIVED` / `REJECTED`
- **مهم:** قرار الشحنة (§3.4) يُشتق من `result` لا من `status` — انظر `WF-10`.

### 2.12 حالات الحجر — `QuarantineCase`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/quarantine-cases/` | قائمة حالات الحجر |
| `POST` | `/api/v1/borders-health/quarantine-cases/` | فتح حالة حجر |
| `GET` | `/api/v1/borders-health/quarantine-cases/{id}/` | تفاصيل الحالة |
| `PATCH` | `/api/v1/borders-health/quarantine-cases/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/quarantine-cases/{id}/` | حذف |

- **بحث:** `case_number`, `person_name`
- **فلاتر:** `crossing`, `traveler`, `disease`, `status`, `phase`
- **ترتيب:** `entry_at`, `status`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `person_name` (من `traveler.full_name`)
- **توليد الرقم:** `save()` يولّد `Q-YYMMDD-XXXXXXXX` (أول 8 أحرف من UUID) عند أول INSERT.
- **قيم `status`:** `ADMITTED` / `UNDER_QUARANTINE` / `REFERRED` / `RELEASED` / `ESCALATED`
- **قيم `phase`:** `SCREENED`, `ASSESSED`, `QUARANTINED`, `UNDER_TREATMENT`, `RECOVERED`, `RELEASED`, `REFERRED_OUT`
- **الافتراضيات:** `required_days=14`، `phase=SCREENED`، `status=ADMITTED`
- **قراءة فقط:** `entry_at`

### 2.13 حالات العزل — `IsolationCase`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/isolation-cases/` | قائمة حالات العزل |
| `POST` | `/api/v1/borders-health/isolation-cases/` | فتح حالة عزل |
| `GET` | `/api/v1/borders-health/isolation-cases/{id}/` | تفاصيل الحالة |
| `PATCH` | `/api/v1/borders-health/isolation-cases/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/isolation-cases/{id}/` | حذف |

- **بحث:** `notes`
- **فلاتر:** `crossing`, `quarantine_case`, `status`
- **ترتيب:** `start_date`, `status`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `started_by_name`
- **ملاحظة:** `started_by` حقل `HiddenField`.
- **قيم `status`:** `ACTIVE` / `RELEASED` / `REMOVED`

### 2.14 حالات تتبع المخالطين — `ContactTracingCase`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/contact-tracing-cases/` | قائمة حالات التتبع |
| `POST` | `/api/v1/borders-health/contact-tracing-cases/` | فتح حالة تتبع |
| `GET` | `/api/v1/borders-health/contact-tracing-cases/{id}/` | تفاصيل الحالة |
| `PATCH` | `/api/v1/borders-health/contact-tracing-cases/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/contact-tracing-cases/{id}/` | حذف |

- **بحث:** `index_case_name`, `transport_mode`
- **فلاتر:** `crossing`, `case`, `status`, `transport_mode`
- **ترتيب:** `started_at`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قراءة فقط:** `started_at`; **افتراضي:** `follow_up_days=14`
- **قيم `status`:** `OPEN` / `MONITORING` / `COMPLETED` / `ESCALATED`

### 2.15 المخالطون — `Contact`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/contacts/` | قائمة المخالطين |
| `POST` | `/api/v1/borders-health/contacts/` | تسجيل مخالط |
| `GET` | `/api/v1/borders-health/contacts/{id}/` | تفاصيل مخالط |
| `PATCH` | `/api/v1/borders-health/contacts/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/contacts/{id}/` | حذف |

- **بحث:** `full_name`, `passport_number`, `phone`
- **فلاتر:** `tracing_case`, `status`
- **ترتيب:** `full_name`, `status`
- **النطاق:** **`tracing_case__crossing__entry_point`** (ثلاث قفزات، مع `scope_distinct = True`)
- **لا حقول مقروءة مسطّحة** (المسلسل يعرض حقول النموذج فقط)
- **افتراضي:** `follow_up_day=0`
- **قيم `status`:** `IDENTIFIED` / `CONTACTED` / `QUARANTINED` / `MONITORING` / `CLEARED` / `LOST`

### 2.16 الحوادث الصحية — `BorderHealthIncident`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/incidents/` | قائمة الحوادث |
| `POST` | `/api/v1/borders-health/incidents/` | تسجيل حادثة |
| `GET` | `/api/v1/borders-health/incidents/{id}/` | تفاصيل الحادثة |
| `PATCH` | `/api/v1/borders-health/incidents/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/incidents/{id}/` | حذف |

- **بحث:** `title`, `description`
- **فلاتر:** `crossing`, `severity`, `status`
- **ترتيب:** `reported_at`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قراءة فقط:** `reported_at`
- **قيم `severity`:** `LOW` / `MEDIUM` (افتراضي) / `HIGH` / `CRITICAL`
- **قيم `status`:** `OPEN` / `INVESTIGATING` / `CONTROLLED` / `CLOSED`

### 2.17 الطوارئ الصحية — `BorderEmergency`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/emergencies/` | قائمة الطوارئ |
| `POST` | `/api/v1/borders-health/emergencies/` | تسجيل حالة طوارئ |
| `GET` | `/api/v1/borders-health/emergencies/{id}/` | تفاصيل الطوارئ |
| `PATCH` | `/api/v1/borders-health/emergencies/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/emergencies/{id}/` | حذف |

- **بحث:** `title`, `description`
- **فلاتر:** `crossing`, `restriction_level`, `status`, `disease`
- **ترتيب:** `reported_at`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قراءة فقط:** `reported_at`
- **قيم `restriction_level`:** `ADVISORY` (افتراضي), `INCREASED_SURVEILLANCE`, `MOVEMENT_REDUCED`, `MOVEMENT_SUSPENDED`, `CLOSED`
- **قيم `status`:** `OPEN` / `ACTIVE` / `CONTROLLED` / `CLOSED`

### 2.18 الشهادات المعبرية — `BorderCertificate`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/certificates/` | قائمة الشهادات |
| `POST` | `/api/v1/borders-health/certificates/` | إنشاء شهادة يدوياً (يتطلّب `certificate_number`) |
| `GET` | `/api/v1/borders-health/certificates/{id}/` | تفاصيل الشهادة |
| `PATCH` | `/api/v1/borders-health/certificates/{id}/` | تعديل جزئي (إبطال/إلغاء) |
| `DELETE` | `/api/v1/borders-health/certificates/{id}/` | حذف |
| `POST` | `/api/v1/borders-health/certificates/issue/` | **إصدار شهادة** (انظر §3.3) |

- **بحث:** `certificate_number`
- **فلاتر:** `crossing`, `traveler`, `vehicle`, `certificate_type`, `status`
- **ترتيب:** `issue_date`, `status`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `issued_by_name`
- **قيد تفرّد:** `certificate_number` فريد عالمياً
- **قيم `certificate_type`:** `HEALTH_CLEARANCE`, `INSPECTION`, `PASSAGE_PERMIT`, `QUARANTINE_RELEASE`, `REJECTION`
- **قيم `status`:** `DRAFT` (افتراضي النموذج), `ISSUED` (ما يُصدره `issue/`), `EXPIRED`, `REVOKED`, `CANCELLED`

### 2.19 القرارات — `BorderDecision`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/decisions/` | سجل القرارات |
| `POST` | `/api/v1/borders-health/decisions/` | تسجيل قرار |
| `GET` | `/api/v1/borders-health/decisions/{id}/` | تفاصيل القرار |
| `PATCH` | `/api/v1/borders-health/decisions/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/decisions/{id}/` | حذف |

- **بحث:** `reason`, `subject_type`
- **فلاتر:** `crossing`, `traveler`, `vehicle`, `outcome`
- **ترتيب:** `decided_at`
- **النطاق:** `crossing__entry_point`
- **حقول مقروءة مسطّحة:** `crossing_name`, `decided_by_name`
- **قراءة فقط:** `decided_at`
- **قيم `outcome`:** `CLEARED`, `CONDITIONAL`, `HOLD`, `REFERRED`, `REJECTED`, `ENFORCEMENT`
- **ملاحظة:** `subject_type` حقل نصي حر (بلا `choices`) — القيمة من تقدير المُسجِّل.

### 2.20 الإشعارات — `BorderNotification`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/notifications/` | قائمة الإشعارات |
| `POST` | `/api/v1/borders-health/notifications/` | إنشاء إشعار |
| `GET` | `/api/v1/borders-health/notifications/{id}/` | تفاصيل الإشعار |
| `PATCH` | `/api/v1/borders-health/notifications/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/notifications/{id}/` | حذف |

- **بحث:** `title`, `body`, `recipient_role`
- **فلاتر:** `crossing`, `channel`, `status`
- **ترتيب:** `created_at`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قيم `channel`:** `INTERNAL` (افتراضي) / `EMAIL` / `SMS` / `PUSH`
- **قيم `status`:** `PENDING` (افتراضي) / `SENT` / `FAILED`
- **ملاحظة:** الوحدة لا ترسل شيئاً فعلياً — الإرسال مسؤولية مهام Celery.

### 2.21 الإحصاءات اليومية — `BorderDailyStatistics`

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/daily-statistics/` | قائمة الإحصاءات |
| `POST` | `/api/v1/borders-health/daily-statistics/` | إنشاء صف إحصاء يدوياً |
| `GET` | `/api/v1/borders-health/daily-statistics/{id}/` | تفاصيل صف |
| `PATCH` | `/api/v1/borders-health/daily-statistics/{id}/` | تعديل جزئي |
| `DELETE` | `/api/v1/borders-health/daily-statistics/{id}/` | حذف |
| `POST` | `/api/v1/borders-health/daily-statistics/refresh/` | **إعادة الحساب** (انظر §3.5) |

- **بحث:** لا يوجد (`search_fields` غير معرّف — المعلمة تُتجاهل)
- **فلاتر:** `crossing`, `stat_date`
- **ترتيب:** `stat_date`
- **النطاق:** `crossing__entry_point`
- **حقل مقروء مسطّح:** `crossing_name`
- **قيد تفرّد:** `unique_border_daily_statistic` على `(crossing, stat_date)`
- **الحقول:** `travelers_inbound`, `travelers_outbound`, `vehicles_inspected`, `cargo_inspections`, `quarantine_cases`, `isolation_cases`, `suspected_cases`, `certificates_issued`, `samples_collected`, `average_processing_minutes`
- **مهم:** `refresh_daily_statistics()` (في `services.py`) **لا تعبّئ** `average_processing_minutes` — يبقى `NULL` ما لم يُكتب يدوياً.

### 2.22 جذر الـ API

| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/v1/borders-health/` | جذر الراوتر (قائمة المسارات المسجّلة) |

---

## 3. الإجراءات المخصّصة الخمسة

### 3.0 جدول ملخّص

| # | الطريقة | المسار | نوع التفاصيل | الإجراء المطلوب فعلياً |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `PATCH` | `/crossings/{id}/status/` | detail | `borders_health:view` |
| 2 | `POST` | `/screenings/{id}/reassess/` | detail | `borders_health:view` |
| 3 | `POST` | `/certificates/issue/` | list | `borders_health:view` |
| 4 | `POST` | `/cargo-inspections/{id}/decide/` | detail | `borders_health:view` |
| 5 | `POST` | `/daily-statistics/refresh/` | list | `borders_health:view` |

### 3.1 `PATCH /api/v1/borders-health/crossings/{id}/status/`

تغيير حالة تشغيل المعبر. ينفّذ `get_object()` أولاً ⇒ فحص نطاق الكائن إلزامي.

| حقل الطلب | النوع | مطلوب | الوصف |
| :--- | :--- | :--- | :--- |
| `operating_status` | string | **نعم** | إحدى: `OPEN`, `RESTRICTED`, `LIMITED`, `CLOSED`, `EMERGENCY` |
| `closure_reason` | string | لا | سبب الإغلاق/التقييد. إذا أُرسل يُستبدل، وإذا لم يُرسل تبقى القيمة الحالية |

**الاستجابة (`200 OK`):** كائن `BorderCrossing` كاملاً بعد التحديث (بغلاف `success_response`).
الحقول المرقّعة في الحفظ: `operating_status`, `closure_reason`, `updated_at`.

**أخطاء:**
- `400` — `operating_status` مفقود أو خارج القيم المسموحة: `{"operating_status": "حالة تشغيل غير معروفة"}`
- `403` — لا صلاحية `borders_health:view` على الإجراء
- `404` — لا معبر بهذا المعرّف **أو** المعبر خارج نطاق المستخدم (انظر §7.1)

**ملاحظة:** الإجراء **لا يسجّل** `BorderDecision` ولا يُغيّر حالة الشحنات/الحجر المرتبطة.

### 3.2 `POST /api/v1/borders-health/screenings/{id}/reassess/`

يعيد حساب `risk_level` و`decision` من القياسات والأعراض، دون تعديل يدوي للقرار.

| حقل الطلب | النوع | مطلوب | الوصف |
| :--- | :--- | :--- | :--- |
| `body_temperature` | float | لا | يحدّث القيمة قبل إعادة التقييم |
| `oxygen_saturation` | float | لا | يحدّث القيمة قبل إعادة التقييم |
| `observed_symptoms` | — | لا | يحدّث القيمة قبل إعادة التقييم |
| `document_verified` | bool | لا | يحدّث قبل إعادة التقييم |
| `vaccination_verified` | bool | لا | يُحدَّث لكن **لا يؤثر** في القرار |

الحقول غير المُرسلة تبقى كما هي. **الطلب الفارغ `{}` يعيد التقييم على القيم المخزّنة.**

**قواعد القرار الفعلية** (`assess_screening` — بالترتيب، الأقوى أثراً أولاً):

| # | الشرط | `risk_level` | `decision` |
| :--- | :--- | :--- | :--- |
| 1 | `body_temperature >= 38.0` **أو** `oxygen_saturation < 92.0` | `RED` | `QUARANTINED` |
| 2 | `observed_symptoms` غير فارغ | `YELLOW` | `REFERRED` |
| 3 | `document_verified = false` | `YELLOW` | `HOLD` |
| 4 | غير ذلك | `GREEN` | `CLEARED` |

`vaccination_verified` **لا يمنع الإفراج وحده** — قرار الفاحص فقط.

**الاستجابة (`200 OK`):** كائن `BorderScreening` كاملاً بعد إعادة الحساب.

**أخطاء:**
- `400` — قيمة منطقية/رقمية غير صالحة
- `403` — لا صلاحية `borders_health:view` على الإجراء
- `404` — لا فحص بهذا المعرّف **أو** الفحص خارج نطاق المستخدم (انظر §7.1)

### 3.3 `POST /api/v1/borders-health/certificates/issue/`

إصدار شهادة برقم ومحتوى QR **مولَّدين من الخادم**.

| حقل الطلب | النوع | مطلوب | الوصف |
| :--- | :--- | :--- | :--- |
| `crossing` | uuid | **نعم** | معرّف المعبر — يجب أن يكون ضمن نطاق المستخدم |
| `certificate_type` | string | **نعم | إحدى: `HEALTH_CLEARANCE`, `INSPECTION`, `PASSAGE_PERMIT`, `QUARANTINE_RELEASE`, `REJECTION` |
| `traveler` | uuid | لا | المسافر |
| `vehicle` | uuid | لا | المركبة |
| `vehicle_inspection` | uuid | لا | تفتيش المركبة |
| `expiry_days` | int | لا | مدة الصلاحية بالأيام — **افتراضي `30`** |
| `notes` | string | لا | ملاحظات — **افتراضي `''`** |

**ما يولّده الخادم تلقائياً (غير قابل للإرسال من العميل):**

| الحقل | القيمة | ملاحظة |
| :--- | :--- | :--- |
| `certificate_number` | `BC-YYYYMMDD-NNNN` | عدّاد يومي بعرض 4 خانات |
| `issue_date` | تاريخ اليوم المحلي | `timezone.localdate()` |
| `expiry_date` | `issue_date + expiry_days` | — |
| `status` | `ISSUED` | لا `DRAFT` |
| `issued_by` | المستخدم الحالي | حقل `HiddenField` |
| `qr_payload` | `NQP\|BC\|<number>\|<issue_date>\|<expiry_date>` | انظر §3.3.1 |

#### 3.3.1 قيد 동일 المعبر (مهم)

> **`vehicle` و `vehicle_inspection` يجب أن ينتميا إلى نفس `crossing` المطلوب — وإلا `400`.**
>
> يبحث الخادم عن المركبة داخل `Vehicle.objects.filter(crossing=crossing)` فقط، وعن التفتيش داخل
> `VehicleInspection.objects.filter(vehicle__in=scoped_vehicles)` فقط. فمركبة من معبر آخر — أو تفتيش
> لمركبة من معبر آخر — لا يُعثر عليه ⇒ خطأ `400`:
>
> ```json
> { "vehicle": "يجب أن ينتمي إلى المعبر <BorderCrossing>" }
> ```
>
> سبب القيد: بلاه يُمكن للختم أن يربط شهادة بمركبة أو تفتيش من معبر مختلف (تسريب عبر النطاق).
>
> `traveler` **لا يخضع** لهذا القيد — يُحلّ من `travelers.Traveler` دون تقييد معبر، لأن ملف المسافر
> وطني. ومع ذلك فإن وجود معرّف غير موجود ⇒ `400` (`"غير موجود في نطاقك"`).

**محتوى `qr_payload`** (نصّي مقروء وغير سرّي، للتدقيق السريع عند بوابة المعبر):

```
NQP|BC|BC-20260115-0007|2026-01-15|2026-02-14
```

الحقول بالترتيب: البادئة، رمز نوع السجل، رقم الشهادة، تاريخ الإصدار، تاريخ الانتهاء.

**الاستجابة:** **`201 Created`** مع كائن `BorderCertificate` كاملاً.

**أخطاء:**

| الكود | الشرط | الجسم |
| :--- | :--- | :--- |
| `400` | `crossing` أو `certificate_type` مفقود | `{"crossing": "مطلوب", "certificate_type": "مطلوب"}` |
| `400` | المعبر غير موجود أو خارج النطاق | `{"crossing": "معبر غير موجود في نطاقك"}` |
| `400` | `expiry_days` ليس رقماً صحيحاً | `{"expiry_days": "عدد أيام غير صحيح"}` |
| `400` | `traveler` غير موجود | `{"traveler": "غير موجود في نطاقك"}` |
| `400` | `vehicle` غير موجود **أو من معبر آخر** | `{"vehicle": "غير موجود في نطاقك"}` / `{"vehicle": "يجب أن ينتمي إلى المعبر …"}` |
| `400` | `vehicle_inspection` غير موجود **أو لمركبة من معبر آخر** | `{"vehicle_inspection": …}` |
| `403` | لا صلاحية `borders_health:view` | — |

**مثال طلب:**

```json
{
  "crossing": "9f1c…",
  "certificate_type": "HEALTH_CLEARANCE",
  "traveler": "3ab2…",
  "vehicle": "7c04…",
  "vehicle_inspection": "d551…",
  "expiry_days": 14,
  "notes": "إفراج صحي — لا أعراض"
}
```

**مثال استجابة (`201`):**

```json
{
  "status": "success",
  "data": {
    "id": "b7d2…",
    "certificate_number": "BC-20260115-0007",
    "certificate_type": "HEALTH_CLEARANCE",
    "crossing": "9f1c…",
    "crossing_name": "معبر أم علي",
    "traveler": "3ab2…",
    "vehicle": "7c04…",
    "vehicle_inspection": "d551…",
    "issue_date": "2026-01-15",
    "expiry_date": "2026-02-14",
    "status": "ISSUED",
    "qr_payload": "NQP|BC|BC-20260115-0007|2026-01-15|2026-02-14",
    "issued_by": "…",
    "issued_by_name": "د. آمنة إبراهيم",
    "notes": "إفراج صحي — لا أعراض"
  }
}
```

### 3.4 `POST /api/v1/borders-health/cargo-inspections/{id}/decide/`

يسجّل قرار الشحنة. القرار **مشتق** من عيّنات الشحنة ما لم يُرسل قرار صريح.

| حقل الطلب | النوع | مطلوب | الوصف |
| :--- | :--- | :--- | :--- |
| `decision` | string | لا | قرار صريح يتجاوز الاشتقاق. إحدى: `CLEARED`, `CONDITIONAL`, `REJECTED`, `HOLD`. **افتراضي: الاشتقاق** |

**قواعد الاشتقاق الفعلية** (`assess_cargo_inspection` — بالترتيب، أول شرط يتحقّق ينهي):

| # | الشرط على عيّنات `BorderSample` المرتبطة | القرار المشتق |
| :--- | :--- | :--- |
| 1 | أي عيّنة `status = REJECTED` | `REJECTED` |
| 2 | أي عيّنة `result` يطابق `positive\|موجبة\|إيجابية` (غير فارغ) | `REJECTED` |
| 3 | أي عيّنة `status ∈ {SENT, UNDER_TEST}` | `HOLD` |
| 4 | أي عيّنة `result` يطابق `negative\|سالبة` (غير فارغ) | `CLEARED` |
| 5 | `inspection.decision` مُعبّأ مسبقاً | يُعاد كما هو |
| 6 | لا عيّنات إطلاقاً | `HOLD` (تحفّظ افتراضي) |

**مهم:** القرار يُشتق من `result` (النتيجة الفيرولوجية) لا من `status` (دورة حياة العيّنة).

**تحويل `status` المرافق:**

| `decision` الناتج | `status` الذي يُكتب |
| :--- | :--- |
| `REJECTED` | `REJECTED` |
| `CLEARED` | `RELEASED` |
| `HOLD` | `AWAITING_DECISION` |
| `CONDITIONAL` | **لا تغيير** على `status` |

**مما يُكتب أيضاً:** `decided_by` (المستخدم الحالي)، `decided_at` (`timezone.now()`).

**الاستجابة (`200 OK`):** كائن `CargoInspection` كاملاً بعد القرار.

**أخطاء:**
- `400` — `decision` صريح خارج `Outcome.choices`: `{"decision": "قرار غير معروف"}`
- `403` — لا صلاحية `borders_health:view`
- `404` — الفحص غير موجود أو خارج نطاق المستخدم

### 3.5 `POST /api/v1/borders-health/daily-statistics/refresh/`

يعيد حساب حصيلة يوم واحد لكل معابر النطاق (أو لمعبر واحد).

| حقل الطلب | النوع | مطلوب | الوصف |
| :--- | :--- | :--- | :--- |
| `crossing` | uuid | لا | معبر واحد. **افتراضي: كل معابر النطاق** |
| `stat_date` | string | لا | `YYYY-MM-DD`. **افتراضي: اليوم المحلي**. أي قيمة أخرى ⇒ `400` |

**العدّادات المُعاد حسابها** لكل معبر (نوافذ زمنية `[start, start+1day)` بتوقيت
`Africa/Khartoum`، ما عدا `isolation_cases` و`certificates_issued` فهما بمطابقة تاريخ مباشرة):

| الحقل | المصدر |
| :--- | :--- |
| `travelers_inbound` | `TravelerHealthRecord` بـ `direction='INBOUND'` |
| `travelers_outbound` | `TravelerHealthRecord` بـ `direction='OUTBOUND'` |
| `vehicles_inspected` | `VehicleInspection` عبر `vehicle__crossing` |
| `cargo_inspections` | `CargoInspection` بـ `created_at` في النافذة |
| `quarantine_cases` | `QuarantineCase` بـ `entry_at` في النافذة |
| `isolation_cases` | `IsolationCase` بـ `start_date == stat_date` |
| `suspected_cases` | `TravelerHealthRecord` بـ `risk_level='RED'` في النافذة |
| `certificates_issued` | `BorderCertificate` بـ `issue_date == stat_date` |
| `samples_collected` | `BorderSample` بـ `collected_at` في النافذة |

**سلوك `update_or_create`:** على `(crossing, stat_date)` ⇒ **idempotent** — إعادة الاستدعاء
بنفس التاريخ يحسب القيم من جديد ويحدّث الصف نفسه (لا تكرار). `average_processing_minutes`
لا يُلمس.

**الاستجابة (`200 OK`):**

```json
{
  "status": "success",
  "data": {
    "results": [ { "...": "BorderDailyStatistics" } ],
    "count": 1
  }
}
```

**أخطاء:**
- `400` — `stat_date` ليس `YYYY-MM-DD`: `{"stat_date": "تاريخ غير صحيح (YYYY-MM-DD)"}`
- `400` — `crossing` خارج النطاق: `{"crossing": "معبر غير موجود في نطاقك"}`
- `403` — لا صلاحية `borders_health:view`

### 3.6 ملاحظات مشتركة على الإجراءات الخمسة

1. **الفحص النطاقي إلزامي:** كل إجراء يستدعي `get_object()` (التفاصيل) أو `_scoped_crossing_ids()`
   (القوائم) قبل أي كتابة.
2. **بلا غلاف إضافي:** كل الإجراءات ترجع `success_response(...)` ⇒ الغلاف `{status, data}`.
3. **بلا تسجيل في سجل القرارات:** `BorderDecision` لا يُكتب تلقائياً بواسطة أي إجراء من الخمسة.
   تسجيل قرار يدوي عبر `POST /decisions/`.
4. **بلا آثار بريد/إشعار:** `services.py` صريح أنه «بلا آثار جانبية على البريد/الإشعارات».

### 3.7 فجوة الإذن على الإجراءات المخصّصة

خريطة `ACTION_TO_PERMISSION` في `views.py` تغطّي إجراءات DRF القياسية فقط:

```python
{'list': 'view', 'retrieve': 'view', 'create': 'add',
 'update': 'edit', 'partial_update': 'edit', 'destroy': 'delete'}
```

`get_permissions()` يستدعي `ACTION_TO_PERMISSION.get(self.action, 'view')` ⇒ أي اسم إجراء
غير مُدرج (مثل `change_status`, `reassess`, `issue`, `decide`, `refresh`) يقع على **الافتراضي
`'view'`**. أي لم تُضاف مفاتيح لهذه الأسماء الخمسة، فإن:

- `certificate_issue`, `quarantine_manage`, `sample_send`, `emergency_manage`, … **لا تحمي**
  المسارات التي يفترض المنطق أنها محمية بها.
- الإجراء الوحيد الحامي هو **فحص نطاق الكائن** (`MultiHopScopeFilter`).

هذا موثّق هنا كسلوك **حالي**، لا كمواصفة مقصودة.

---

## 4. نقاط لوحة القيادة (3 نقاط قراءة فقط)

جميعها على الراوتر `dashboard` وتحمل اسم basename `borders-dashboard`، وكلها `GET` بلا
ترقيم ولا فلاتر — والاثنتان الأخيرتان ترجعان غلاف `{status, data: {results, count}}`.

### 4.1 `GET /api/v1/borders-health/dashboard/overview/`

ملخص وطني مجمّع عبر نقاط الدخول في نطاق المستخدم. القيم **الكلّية (لا تاريخية)** عدا四项
محدّدة بيوم اليوم.

**تجميعات الحقول:**

| الحقل | التجميع | النطاق الزمني |
| :--- | :--- | :--- |
| `crossings` | `count()` لكل المعابر | — |
| `open_crossings` | `operating_status = OPEN` | — |
| `restricted_crossings` | `operating_status ∈ {RESTRICTED, LIMITED, EMERGENCY}` | — |
| `closed_crossings` | `operating_status = CLOSED` | — |
| `travelers_today` | `count(TravelerHealthRecord)` | `entry_at__date = today` |
| `vehicles_inspected` | `count(VehicleInspection)` عبر `vehicle__crossing` | `inspection_date__date = today` |
| `cargo_inspections` | `count(CargoInspection)` | `created_at__date = today` |
| `active_quarantine` | `QuarantineCase` بـ `status = UNDER_QUARANTINE` | — |
| `active_isolation` | `IsolationCase` بـ `status = ACTIVE` | — |
| `suspected_cases` | `TravelerHealthRecord` بـ `risk_level = RED` | **تراكمي** (لا يقصر على اليوم) |
| `open_emergencies` | `BorderEmergency` بـ `status ∈ {OPEN, ACTIVE}` | — |
| `certificates_issued` | `count(BorderCertificate)` | `issue_date = today` |
| `samples_collected` | `count(BorderSample)` | `collected_at__date = today` |

`today = timezone.localdate()` بتوقيت `Africa/Khartoum`.

**استجابة (`200 OK`):** غلاف كامل مسطّح — 13 عدّاداً بلا `results`:

```json
{
  "status": "success",
  "data": {
    "crossings": 5, "open_crossings": 3, "restricted_crossings": 1,
    "closed_crossings": 1, "travelers_today": 412, "vehicles_inspected": 68,
    "cargo_inspections": 21, "active_quarantine": 9, "active_isolation": 2,
    "suspected_cases": 5, "open_emergencies": 1, "certificates_issued": 37,
    "samples_collected": 12
  }
}
```

### 4.2 `GET /api/v1/borders-health/dashboard/crossing-performance/`

صف واحد لكل معبر في النطاق — مقارنة أفقية بين المعابر.

**الأعمدة:** `id`, `entry_point__code`, `entry_point__name_ar`, `operating_status`,
`neighbor_country`, `records_count`, `vehicle_inspections_count`, `cargo_count`,
`quarantine_count`.

**منطق العدّ:**

| العمود | `Count` على | شرط |
| :--- | :--- | :--- |
| `records_count` | `traveler_records` | `distinct=True` — **تراكمي** |
| `vehicle_inspections_count` | `vehicles__inspections` | `distinct=True` — تراكمي |
| `cargo_count` | `cargo_inspections` | `distinct=True` — تراكمي |
| `quarantine_count` | `quarantine_cases` | `distinct=True` + `filter(Q(status=UNDER_QUARANTINE))` |

**الاستجابة:**

```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "id": "9f1c…",
        "entry_point__code": "BD-AMALI",
        "entry_point__name_ar": "معبر أم علي",
        "operating_status": "OPEN",
        "neighbor_country": "إثيوبيا",
        "records_count": 180, "vehicle_inspections_count": 40,
        "cargo_count": 12, "quarantine_count": 3
      }
    ],
    "count": 5
  }
}
```

### 4.3 `GET /api/v1/borders-health/dashboard/traffic-trend/`

اتجاه الحركة اليومية مجمّعاً عبر معابر النطاق.

| معامل الاستعلام | النوع | افتراضي | الوصف |
| :--- | :--- | :--- | :--- |
| `days` | int | `7` | عدد الأيام؛ **مقصوصة عند 90** |

**النافذة:** `[today - (days - 1), today]` — أي `days` يوماً **شاملاً اليوم**.
مصدر البيانات `BorderDailyStatistics` (وليس استعلاماً لحظياً على سجلات الفحص) — أي يعتمد
على تشغيل `daily-statistics/refresh/` أولاً.

**الأعمدة:** `stat_date`, `inbound`, `outbound`, `vehicles`, `cargo`, `samples`
(`Sum` على الصفوف، مُجمّعة بـ `stat_date` ومُرتّبة تصاعدياً).

**فراغات محتملة:** الحقول nullable عند الغياب ⇒ `null` في JSON (وليس `0`).

**استجابة:**

```json
{
  "status": "success",
  "data": {
    "results": [
      { "stat_date": "2026-01-09", "inbound": 305, "outbound": 288, "vehicles": 51, "cargo": 14, "samples": 9 },
      { "stat_date": "2026-01-10", "inbound": 341, "outbound": 302, "vehicles": 63, "cargo": 19, "samples": 15 }
    ],
    "count": 7
  }
}
```

---

## 5. الترقيم والفلترة والترتيب والبحث

### 5.1 الترقيم

| البند | القيمة |
| :--- | :--- |
| صنف الترقيم | `core.pagination.StandardPagination` (`PageNumberPagination`) |
| معامل الصفحة | `?page=` (افتراضي `1`) |
| معامل حجم الصفحة | `?page_size=` |
| الحد الأقصى لحجم الصفحة | `500` |
| حجم الصفحة الافتراضي | `10` (`REST_FRAMEWORK.PAGE_SIZE` في `settings.py`) |

**شكل الاستجابة المُرقّمة:**

```json
{
  "status": "success",
  "data": {
    "count": 137,
    "next": "http://…/api/v1/borders-health/screenings/?page=2&page_size=10",
    "previous": null,
    "results": [ /* … */ ]
  }
}
```

`count` هو **العدد الكلّي بعد الفلترة**، و`next`/`previous` روابط مطلقة.

**للتصدير:** مرّر `page_size=500` مع `page=1..N` للتنقّل عبر الصفحات (تستخدم الواجهة
الأمامية `fetchAllRows` في `useServerTable` بهذه الآلية).

### 5.2 الفلترة — `ExactFilterBackend`

`filter_fields` على كل مورد (انظر §2) تُطبَّق عبر مطابقة تامّة:

- قيمة فارغة أو `None` ⇒ **تُتجاهل** (لا تصفية).
- `?status=OPEN` ⇒ `status=OPEN`.
- `?status=OPEN,CLOSED` ⇒ `status__in=['OPEN','CLOSED']` (قيم متعدّدة بفاصلة).
- القيم المنطقية: `?is_active=true` / `?1` ⇒ `True`؛ `?is_active=false` / `?0` ⇒ `False`.
  (لاحظ أثر التحويل: `?is_active=0` يُعامل كـ `False` لا كـ `0`.)

### 5.3 البحث — `SearchFilter`

`?search=` يبحث في `search_fields` بنمط `icontains` (غير حسّاس لحالة الأحرف). الحقول
المعلَنة لكل مورد في §2. المورد الوحيد بلا بحث هو `daily-statistics`.

### 5.4 الترتيب — `OrderingFilter`

`?ordering=<field>` أو `?ordering=-<field>` (تنازلي بـ `-`). الحقول المسموحة لكل مورد في §2.
**بلا `ordering` يُطبَّق ترتيب `Meta.ordering` الافتراضي للنموذج** (مثّل `['-entry_at']` لـ
`TravelerHealthRecord` و`['-screened_at']` لـ `BorderScreening`).

**ترتيب افتراضي لكل نموذج (مستخرَج من `Meta.ordering`):**

| النموذج | الترتيب الافتراضي |
| :--- | :--- |
| `BorderCrossing` | `entry_point__order`, `entry_point__name_ar` |
| `BorderFacility` | `crossing`, `kind`, `name_ar` |
| `BorderShift` | `-shift_date`, `shift_type` |
| `BorderStaff` | `crossing`, `role`, `user` |
| `TravelerHealthRecord` | `-entry_at` |
| `HealthDeclaration` | `-declared_at` |
| `BorderScreening` | `-screened_at` |
| `Vehicle` | `-created_at` |
| `VehicleInspection` | `-inspection_date` |
| `CargoInspection` | `-created_at` |
| `BorderSample` | `-collected_at` |
| `QuarantineCase` | `-entry_at` |
| `IsolationCase` | `-start_date` |
| `ContactTracingCase` | `-started_at` |
| `Contact` | `tracing_case`, `full_name` |
| `BorderHealthIncident` | `-reported_at` |
| `BorderEmergency` | `-reported_at` |
| `BorderCertificate` | `-issue_date` |
| `BorderDecision` | `-decided_at` |
| `BorderNotification` | `-created_at` |
| `BorderDailyStatistics` | `-stat_date`, `crossing` |

---

## 6. غلاف الاستجابة

### 6.1 الشكل

`core.renderers.EnvelopeRenderer` غلاف افتراضي يغلّف كل استجابة ناجحة:

```json
{
  "status": "success",
  "data": { /* … */ }
}
```

والواجهات التي تبني بنفسها عبر `core.utils.response.success_response(data)` تمرّ كما هي
لأن `status` موجود أصلاً.

**عنصر `message`:** مفتاح **اختياري**. `success_response(data, message=None)` لا يضيف
`message` إلا إذا مُرّر صراحةً:

```python
def success_response(data=None, message=None):
    body = {'status': 'success'}
    if message is not None:
        body['message'] = message
    if data is not None:
        body['data'] = data
    return body
```

**لا يوجد أي استدعاء في `borders_health` يمرّر `message`** ⇒ عملياً **لا يظهر `message` في
استجابات هذه الوحدة**، بينما غلاف الأخطاء في بقية المنصة قد يحمله.

### 6.2 الحالات الخاصة

| الحالة | السلوك |
| :--- | :--- |
| `204 No Content` | الغلاف يُتجاهل تماماً — جسم فارغ |
| مورد مفرد | `{status, data: <object>}` |
| قائمة مُرقّمة | `{status, data: {count, next, previous, results}}` |
| تجميع (`overview`) | `{status, data: {...}}` مسطّح بلا `results` |
| تجميع (`crossing-performance`, `traffic-trend`, `refresh`) | `{status, data: {results, count}}` |
| خطأ التحقّق `400` | **بلا غلاف** — خريطة أخطاء DRF الخام: `{"field": ["message"]}` |

**مثال خطأ تحقّق:**

```json
{
  "operating_status": ["حالة تشغيل غير معروفة"]
}
```

> **تنبيه للعميل:** استخرج رسالة الخطأ من `response.data` مباشرةً (إما خريطة DRF الخام أو
> غلاف `error_response`)، لا من `response.data.data` دائماً.

---

## 7. رموز الحالة

| الكود | المعنى | في هذه الوحدة |
| :--- | :--- | :--- |
| `200 OK` | نجاح القراءة/التعديل/الإجراءات المخصّصة | كل الإجراءات في §3 عدا `issue` |
| `201 Created` | إنشاء مورد جديد | `POST` على أي مورد + `certificates/issue/` |
| `400 Bad Request` | فشل التحقّق أو مخالفة قاعدة عمل | حالة تشغيل غير معروفة، قرار غير معروف، معبر خارج النطاق، مركبة من معبر آخر، تاريخ غير صحيح |
| `401 Unauthorized` | مصادقة غائبة أو منتهية | كل المسارات |
| `403 Forbidden` | لا صلاحية `borders_health:*`، أو نطاق غير قابل للحل | انظر §7.1 و §8 |
| `404 Not Found` | المعرّف غير موجود **أو مخفي بالنطاق** | انظر §7.1 و §8 |
| `405 Method Not Allowed` | طريقة غير مسموحة | **`PUT` على كل الموارد** |
| `500 Internal Server Error` | خطأ غير متوقع | — |

### 7.1 `403` مقابل `404` — السلوك الحاسم

`get_queryset()` يقيّد النتائج بالنطاق قبل التنفيذ، و`get_object()` يعمل على `get_queryset()`.
لذلك:

- عنصر **داخل** النطاق ⇒ `200` / `PATCH` / `DELETE` عادي.
- عنصر **خارج** النطاق ⇒ **`404 Not Found`** (ليس `403`).
- `403 Forbidden` محجوز لحالتين فقط:
  1. المستخدم لا يحمل صلاحية `borders_health:<action>` على المورد (فشل `PermissionAction`).
  2. مستخدم **صلاحية موقوتة** بلا نطاق قابل للحل، على إجراء يفرض نطاقاً
     (انظر §8.2 و`MultiHopScopeFilter.has_object_permission`).

---

## 8. نموذج النطاق (Scoping)

### 8.1 الفكرة

كل نموذج يحمل `crossing` ← `BorderCrossing` ← `masterdata.EntryPoint`. لذلك تقارن
الوحدة معرّفات `EntryPoint` **مباشرة** — وهي نفس فضاء المعرّفات الذي تستخدمه
`ScopeType.PORT` و`resolve_user_port_ids` — بلا جدول منافذ ثانٍ.

`scope_type = RoleAssignment.ScopeType.PORT`.

### 8.2 GLOBAL = غير مقيّد

عبر `has_active_global_scope(user)` (تعيين نشط بـ `scope_type='GLOBAL'`، أو `is_superuser`):

| المستوى | السلوك |
| :--- | :--- |
| القوائم (`get_queryset`) | **بلا تقييد** — كل الصفوف |
| تجميع المعابر (`_scoped_crossing_ids`) | كل المعابر |
| الكائنات (`has_object_permission`) | **يسمح دائماً** |

### 8.3 الفشل الآمن (Fail Closed)

> **أي نطاق غير قابل للحل ⇒ منع، لا استثناء.**

**على مستوى القائمة** (`BordersHealthScopedMixin.get_queryset`): ترتيب الفحص الدقيق أولاً
(تعيين صريح) ثم تغطية القطاع ثم تغطية وطنية:

1. `is_superuser` ⇒ بلا تقييد.
2. `has_active_global_scope` ⇒ بلا تقييد.
3. تعيينات `PORT` صريحة ⇒ `filter(scope_field__in=ids)`.
4. لا تعيينات صريحة ⇒ `resolve_user_sector(user)` ثم `sector_entry_points(sector)` (منافذ الدخول النشطة في القطاع).
5. **لا نطاق على الإطلاق** ⇒ `qs.none()` (قائمة فارغة) **+ تحذير في السجل**.

`active_scopes` تُسقِط GLOBAL عمداً، لذلك لا يجوز تفسير قائمة فارغة دليل غياب قبل فحص
التغطية العامة — ولهذا الترتيب مهم.

**على مستوى الكائن** (`MultiHopScopeFilter.has_object_permission`): يمنع الحسم في ثلاث حالات
مع تسجيل `logger.warning` في كل واحدة:

| الحالة | النتيجة |
| :--- | :--- |
| `scope_ids` فارغة | **منع** |
| `scope_field` غير قابل للحل على الكائن | **منع** |
| أي قفزة في المسار تساوي `None` | **منع** |
| `scope_field = None` ولا يوجد مسار افتراضي صالح | يمنع (المسار الافتراضي `entry_point` فقط على `BorderCrossing`) |

### 8.4 مسارات النطاق العميق الثلاثة

`core.permissions.ScopeFilter` الأصلي يقرأ `getattr(obj, f'{scope_field}_id')` — أي **مستوى
واحد فقط**. مسارات هذا الموديول متعدّدة المستويات، فبدون معالجة خاصة يُعيد `getattr` قيمة
`None` فيُرفض **كل** طلب على مستوى الكائن حتى لمستخدم داخل نطاقه. لذلك تستخدم الوحدة
`MultiHopScopeFilter` مع `resolve_scope_id(obj, path)`:

| النموذج | `scope_field` | عدد القفزات | `scope_distinct` |
| :--- | :--- | :--- | :--- |
| `HealthDeclaration` | `crossing__entry_point` | 2 | `False` |
| `BorderFacility`, `BorderShift`, `BorderStaff` | `crossing__entry_point` | 2 | `False` |
| `TravelerHealthRecord`, `BorderScreening` | `crossing__entry_point` | 2 | `False` |
| `CargoInspection`, `BorderSample` | `crossing__entry_point` | 2 | `False` |
| `QuarantineCase`, `IsolationCase` | `crossing__entry_point` | 2 | `False` |
| `ContactTracingCase` | `crossing__entry_point` | 2 | `False` |
| `BorderHealthIncident`, `BorderEmergency` | `crossing__entry_point` | 2 | `False` |
| `BorderCertificate`, `BorderDecision` | `crossing__entry_point` | 2 | `False` |
| `BorderNotification`, `BorderDailyStatistics` | `crossing__entry_point` | 2 | `False` |
| **`VehicleInspection`** | **`vehicle__crossing__entry_point`** | **3** | `False` |
| **`Contact`** | **`tracing_case__crossing__entry_point`** | **3** | **`True`** |
| `BorderCrossing` | `entry_point` | 1 | `False` |

**المسار العميق الأول — `VehicleInspection`:**
`VehicleInspection` لا يحمل `crossing` مباشرة؛ المسار يبدأ من `vehicle` (عبر فهرس FK).

```
VehicleInspection → vehicle → crossing → entry_point
```

**المسار العميق الثاني — `Contact`:**
`Contact` لا يحمل `crossing` إطلاقاً؛ المسار يبدأ من حالة التتبع.

```
Contact → tracing_case → crossing → entry_point
```

**خوارزمية `resolve_scope_id`:** تقطع المسار على `__` وتمشي على **الكائنات** في كل قفزة
وسيطة (البدء بـ `_id` يوقف عند UUID لأن القفزة التالية تحتاج كائناً لا معرّفاً)، ثم تقرأ
`_id` في القفزة **الأخيرة** فقط. أي خطوة تفشل (سمة غير موجودة، قيمة `None`، كائن ليس
نموذج Django) تُعيد `None` ⇒ **منع آمن**.

**`scope_distinct = True` (المورد `contacts` فقط):** التصفية تمرّ على مسار عريض فتنتج
تكراراً في الصفوف ⇒ `qs.distinct()` إلزامي. بدونه يتكرر المخالط الواحد بعدد نقاط الدخول
المطابقة.

---

## 9. جدول الصلاحيات حسب مجموعة الأدوار

المصدر: `backend/apps/accounts/management/commands/seed_rbac.py` + §1.3.
«النطاق الافتراضي» عمود `default_scope` في التعريف.

### 9.1 مديرو النظام والمعابر

| الدور | النطاق الافتراضي | صلاحيات `borders_health` |
| :--- | :--- | :--- |
| `BORDER_SYSTEM_ADMIN` | `PORT` | `view`, `add`, `edit`, `delete`, `export`, `dashboard_view`, `report_view` |
| `BORDER_STATION_MANAGER` | `PORT` | `view`, `add`, `edit`, `delete`, `export`, `dashboard_view`, `report_view`, `health_screen` |
| `BORDER_DIRECTOR` | `SECTOR` | `view`, `add`, `edit`, `delete`, `export`, `dashboard_view`, `report_view`, `health_screen`, `certificate_issue`, `emergency_manage` |
| `QUARANTINE_SECTOR_DIRECTOR` | `SECTOR` | `view`, `add`, `edit`, `delete`, `export`, `dashboard_view`, `report_view`, `quarantine_manage`, `isolation_manage`, `contact_trace`, `emergency_manage` |
| `NATIONAL_QUARANTINE_DIRECTOR` | `GLOBAL` | `view`, `add`, `edit`, `delete`, `export`, `dashboard_view`, `report_view`, `quarantine_manage`, `isolation_manage`, `emergency_manage`, `certificate_issue` |

### 9.2 ضباط الحركة والفحص

| الدور | النطاق الافتراضي | صلاحيات `borders_health` |
| :--- | :--- | :--- |
| `BORDER_HEALTH_OFFICER` | `PORT` | `view`, `add`, `edit`, `register_traveler`, `health_screen`, `vehicle_inspect`, `cargo_inspect`, `sample_create`, `dashboard_view` |
| `TRAVELER_REGISTRATION_OFFICER` | `PORT` | `view`, `add`, `edit`, `register_traveler` |
| `IMMIGRATION_OFFICER` | `PORT` | `view`, `register_traveler`, `health_screen` |
| `CUSTOMS_OFFICER` | `PORT` | `view`, `cargo_inspect`, `vehicle_inspect` |
| `QUARANTINE_DOCTOR` | `PORT` | `view`, `add`, `edit`, `health_screen`, `case_create`, `quarantine_manage`, `isolation_manage`, `contact_trace`, `dashboard_view` |

> **فجوة تغطية في الواجهة:** دور `QUARANTINE_INSPECTOR` (نطاق `STATION`) يمنحه
> `seed_rbac.py` اثنتي عشرة صلاحية `borders_health` (§9.3)، لكن **لا يوجد له مدخل في
> `roleLayouts/borders.tsx`** — أي أنه لا يستطيع الوصول إلى أي قسم في واجهة المعابر
> رغم امتلاكه الصلاحيات. الأدوار الـ 15 المفصّلة هنا هي بالضبط ما يحتويه الملف.

### 9.3 الفحص والرقابة والمختبر

| الدور | النطاق الافتراضي | صلاحيات `borders_health` |
| :--- | :--- | :--- |
| `FOOD_INSPECTOR` | `STATION` | `view`, `add`, `edit`, `cargo_inspect`, `sample_create`, `report_view` |
| `ENV_INSPECTOR` | `STATION` | `view`, `add`, `edit`, `cargo_inspect`, `health_screen`, `report_view` |
| `LAB_TECHNICIAN` | `STATION` | `view`, `add`, `edit`, `sample_create`, `sample_send`, `report_view` |
| `QUARANTINE_INSPECTOR` | `STATION` | `view`, `add`, `edit`, `register_traveler`, `health_screen`, `vehicle_inspect`, `cargo_inspect`, `sample_create`, `sample_send`, `certificate_issue`, `report_view`, `dashboard_view` |
| `EPIDEMIOLOGY_OFFICER` | `SECTOR` | `view`, `add`, `edit`, `case_create`, `contact_trace`, `quarantine_manage`, `report_view`, `export`, `dashboard_view` |
| `EMERGENCY_OFFICER` | `SECTOR` | `view`, `add`, `edit`, `delete`, `emergency_manage`, `sample_create`, `sample_send`, `dashboard_view`, `report_view`, `export` |

### 9.4 مرجع سريع: من يملك ماذا

> الفهرس التالي مُولَّد آلياً من `ROLES` في `seed_rbac.py` (ترتيب `ACTIONS` ثم
> `EXTRA_ACTIONS["borders_health"]`)، وشامل الصلاحيات الخمس العامة و الأربع عشرة الخاصة.

| صلاحية | الأدوار الحاملة |
| :--- | :--- |
| `view` | `QUARANTINE_INSPECTOR`, `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `BORDER_HEALTH_OFFICER`, `QUARANTINE_DOCTOR`, `TRAVELER_REGISTRATION_OFFICER`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `CUSTOMS_OFFICER`, `IMMIGRATION_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR`, `FOOD_INSPECTOR`, `ENV_INSPECTOR`, `LAB_TECHNICIAN` |
| `add` | `QUARANTINE_INSPECTOR`, `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `BORDER_HEALTH_OFFICER`, `QUARANTINE_DOCTOR`, `TRAVELER_REGISTRATION_OFFICER`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR`, `FOOD_INSPECTOR`, `ENV_INSPECTOR`, `LAB_TECHNICIAN` |
| `edit` | `QUARANTINE_INSPECTOR`, `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `BORDER_HEALTH_OFFICER`, `QUARANTINE_DOCTOR`, `TRAVELER_REGISTRATION_OFFICER`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR`, `FOOD_INSPECTOR`, `ENV_INSPECTOR`, `LAB_TECHNICIAN` |
| `delete` | `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `export` | `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `register_traveler` | `QUARANTINE_INSPECTOR`, `BORDER_HEALTH_OFFICER`, `TRAVELER_REGISTRATION_OFFICER`, `IMMIGRATION_OFFICER` |
| `health_screen` | `QUARANTINE_INSPECTOR`, `BORDER_STATION_MANAGER`, `BORDER_HEALTH_OFFICER`, `QUARANTINE_DOCTOR`, `IMMIGRATION_OFFICER`, `BORDER_DIRECTOR`, `ENV_INSPECTOR` |
| `vehicle_inspect` | `QUARANTINE_INSPECTOR`, `BORDER_HEALTH_OFFICER`, `CUSTOMS_OFFICER` |
| `cargo_inspect` | `QUARANTINE_INSPECTOR`, `BORDER_HEALTH_OFFICER`, `CUSTOMS_OFFICER`, `FOOD_INSPECTOR`, `ENV_INSPECTOR` |
| `sample_create` | `QUARANTINE_INSPECTOR`, `BORDER_HEALTH_OFFICER`, `EMERGENCY_OFFICER`, `FOOD_INSPECTOR`, `LAB_TECHNICIAN` |
| `sample_send` | `QUARANTINE_INSPECTOR`, `EMERGENCY_OFFICER`, `LAB_TECHNICIAN` |
| `case_create` | `QUARANTINE_DOCTOR`, `EPIDEMIOLOGY_OFFICER` |
| `quarantine_manage` | `QUARANTINE_DOCTOR`, `EPIDEMIOLOGY_OFFICER`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `isolation_manage` | `QUARANTINE_DOCTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `contact_trace` | `QUARANTINE_DOCTOR`, `EPIDEMIOLOGY_OFFICER`, `QUARANTINE_SECTOR_DIRECTOR` |
| `emergency_manage` | `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `certificate_issue` | `QUARANTINE_INSPECTOR`, `BORDER_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |
| `report_view` | `QUARANTINE_INSPECTOR`, `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR`, `FOOD_INSPECTOR`, `ENV_INSPECTOR`, `LAB_TECHNICIAN` |
| `dashboard_view` | `QUARANTINE_INSPECTOR`, `BORDER_SYSTEM_ADMIN`, `BORDER_STATION_MANAGER`, `BORDER_HEALTH_OFFICER`, `QUARANTINE_DOCTOR`, `EPIDEMIOLOGY_OFFICER`, `EMERGENCY_OFFICER`, `BORDER_DIRECTOR`, `QUARANTINE_SECTOR_DIRECTOR`, `NATIONAL_QUARANTINE_DIRECTOR` |

> **تنبيه:** كما هو موضّح في §3.7، الأعمدة أعلاه تصف **الإسناد في بيانات البذر**، بينما
> **الإنفاذ الفعلي** على المسارات يعتمد على `ACTION_TO_PERMISSION` فقط. عملياً: أي دور يحمل
> `borders_health:view` يستطيع استدعاء المسارات الخمسة المخصّصة (داخل نطاقه)، لأن
> `certificate_issue` و`quarantine_manage` وغيرها **غير مربوطة** بأي إجراء في `views.py`.

---

## 10. جدول النماذج المرجعي السريع (21 جدولاً)

| # | النموذج | الجدول | الأعمدة | الفهارس | التفرّد |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `BorderCrossing` | `borders_health_bordercrossing` | 17 | 2 | `entry_point` |
| 2 | `BorderFacility` | `borders_health_borderfacility` | 11 | 1 | — |
| 3 | `BorderShift` | `borders_health_bordershift` | 11 | 1 | — |
| 4 | `BorderStaff` | `borders_health_borderstaff` | 11 | 1 | `unique_border_staff_assignment` |
| 5 | `TravelerHealthRecord` | `borders_health_travelerhealthrecord` | 16 | 3 | — |
| 6 | `HealthDeclaration` | `borders_health_healthdeclaration` | 16 | 2 | — |
| 7 | `BorderScreening` | `borders_health_borderscreening` | 17 | 3 | — |
| 8 | `Vehicle` | `borders_health_vehicle` | 15 | 1 | `plate_number` |
| 9 | `VehicleInspection` | `borders_health_vehicleinspection` | 14 | 1 | — |
| 10 | `CargoInspection` | `borders_health_cargoinspection` | 18 | 1 | — |
| 11 | `BorderSample` | `borders_health_bordersample` | 14 | 2 | — |
| 12 | `QuarantineCase` | `borders_health_quarantinecase` | 18 | 2 | `case_number` |
| 13 | `IsolationCase` | `borders_health_isolationcase` | 14 | 1 | — |
| 14 | `ContactTracingCase` | `borders_health_contacttracingcase` | 13 | 1 | — |
| 15 | `Contact` | `borders_health_contact` | 11 | 1 | — |
| 16 | `BorderHealthIncident` | `borders_health_borderhealthincident` | 13 | 1 | — |
| 17 | `BorderEmergency` | `borders_health_borderemergency` | 14 | 1 | — |
| 18 | `BorderCertificate` | `borders_health_bordercertificate` | 15 | 1 | `certificate_number` |
| 19 | `BorderDecision` | `borders_health_borderdecision` | 13 | 1 | — |
| 20 | `BorderNotification` | `borders_health_bordernotification` | 12 | 1 | — |
| 21 | `BorderDailyStatistics` | `borders_health_borderdailystatistics` | 15 | 0 | `unique_border_daily_statistic` |

**ملاحظة:** أعمدة كل جدول تبدأ بـ `id`, `created_at`, `updated_at` (من `core.models.BaseModel`)،
وكلها UUID.

---

## 11. روابط ذات صلة

| الوثيقة | الوصف |
| :--- | :--- |
| [`../07_Workflows/Border_Health_Workflow.md`](../07_Workflows/Border_Health_Workflow.md) | سير العمل WF-10 وقواعد القرار |
| [`../06_UI_UX/11_Land_Border_Health/00-Screens.md`](../06_UI_UX/11_Land_Border_Health/00-Screens.md) | الأقسام السبع عشر للواجهة |
| [`./Authentication_API.md`](./Authentication_API.md) | المصادقة والأدوار والنطاقات |
| [`../03_Database/Data_Dictionary.md`](../03_Database/Data_Dictionary.md) | قاموس البيانات الكامل |
| [`./OpenAPI.yaml`](./OpenAPI.yaml) | مخطط OpenAPI (ملاحظة: الوحدة غير مغطاة فيه بعد) |

> **ملاحظة:** اقتصرت المسارات المذكورة في هذا الملف على ما ورد في سجل المسارات
> الرسمي للوحدة. مسارات المنصة العامة (المصادقة، مخطط OpenAPI، Swagger) موثّقة
> في وثائقها الخاصة ولم تُدرج هنا تفادياً لأي التباس في النطاق.
