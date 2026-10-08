# علاقات الجداول (Table Relationships)

## 1. مخطط المفاتيح الخارجية (Foreign Keys Summary)

| الجدول (Table) | المفتاح الخارجي (FK) | الجدول المرجعي (Reference) | نوع العلاقة |
| :--- | :--- | :--- | :--- |
| `users` | `port_id` | `ports` | Many-to-One |
| `travelers` | `nationality_id` | `countries` | Many-to-One |
| `health_screenings` | `traveler_id` | `travelers` | Many-to-One |
| `health_screenings` | `port_id` | `ports` | Many-to-One |
| `health_screenings` | `officer_id` | `users` | Many-to-One |
| `risk_assessments` | `screening_id` | `health_screenings` | One-to-One |
| `clinic_visits` | `traveler_id` | `travelers` | Many-to-One |
| `clinic_visits` | `referral_id` | `health_screenings` | One-to-One |
| `clinic_visits` | `doctor_id` | `users` | Many-to-One |
| `emr_records` | `visit_id` | `clinic_visits` | One-to-One |
| `prescriptions` | `visit_id` | `clinic_visits` | Many-to-One |
| `prescriptions` | `medication_id` | `medications` | Many-to-One |
| `lab_samples` | `visit_id` | `clinic_visits` | Many-to-One |
| `lab_samples` | `collector_id` | `users` | Many-to-One |
| `lab_results` | `sample_id` | `lab_samples` | One-to-One |
| `lab_results` | `disease_id` | `diseases` | Many-to-One |
| `lab_results` | `entered_by_id` | `users` | Many-to-One |
| `lab_results` | `approved_by_id` | `users` | Many-to-One |
| `follow_up_patients` | `traveler_id` | `travelers` | Many-to-One |
| `daily_health_logs` | `follow_up_id` | `follow_up_patients` | Many-to-One |
| `medication_adherence` | `prescription_id` | `prescriptions` | Many-to-One |
| `recovery_certificates` | `follow_up_id` | `follow_up_patients` | One-to-One |
| `emergency_alerts` | `port_id` | `ports` | Many-to-One |
| `food_shipments` | `port_id` | `ports` | Many-to-One |
| `food_inspections` | `shipment_id` | `food_shipments` | One-to-One |
| `food_samples` | `inspection_id` | `food_inspections` | Many-to-One |

## 2. علاقات Many-to-Many (جداول وسيطة)
| الجدول الوسيط (Junction) | الجدول الأول | الجدول الثاني | الغرض |
| :--- | :--- | :--- | :--- |
| `user_roles` | `users` | `roles` | تعيين أدوار للمستخدمين |
| `role_permissions` | `roles` | `permissions` | تعيين صلاحيات للأدوار |
| `passenger_manifests` | `flights` | `travelers` | ربط المسافرين بالرحلات |

## 3. علاقات نظام صحة المعابر البرية (`borders_health`)

> **21 جدولاً · 69 مفتاحاً أجنبياً** داخل التطبيق، إضافة إلى 13 رابطاً عابراً للوحدات.
> التطبيق **مستهلك** لأنظمة المنصة (لا مكرِّر لها): يرث نقطة الدخول من `masterdata`، وهوية المسافر من `travelers`، والمرضى والأمراض والعيّنات والشارات من وحداتها.

### 3.1. المحور الأساسي: المعبر ونطاق الوصول
| الجدول (Table) | المفتاح الخارجي (FK) | الجدول المرجعي (Reference) | نوع العلاقة | on_delete |
| :--- | :--- | :--- | :--- | :--- |
| `borders_health_bordercrossing` | `entry_point_id` | `masterdata_entrypoint` | One-to-One | `CASCADE` |

**لماذا OneToOne:** المعبر البري ليس جدول منافذ ثانٍ، بل امتداد تشغيلي لنقطة دخول واحدة. قيد `UNIQUE` على `entry_point_id` يضمن أن منفذاً برياً واحداً لا يأخذ أكثر من ملف `BorderCrossing` واحد.

### 3.2. الجداول المرتبطة بـ `borders_health_bordercrossing` (عمود النطاق)
كل الجداول التالية تحمل `crossing_id UUID NOT NULL` → `borders_health_bordercrossing` بـ `on_delete=CASCADE`، ولهذا تبدأ فهارسها المركّبة بـ `crossing_id`:

| الجدول | `crossing_id` | الملاحظة |
| :--- | :--- | :--- |
| `borders_health_borderfacility` | NOT NULL | — |
| `borders_health_bordershift` | NOT NULL | — |
| `borders_health_borderstaff` | NOT NULL | — |
| `borders_health_travelerhealthrecord` | NOT NULL | — |
| `borders_health_healthdeclaration` | NOT NULL | — |
| `borders_health_borderscreening` | NOT NULL | — |
| `borders_health_vehicle` | NOT NULL | — |
| `borders_health_cargoinspection` | NOT NULL | — |
| `borders_health_bordersample` | NOT NULL | — |
| `borders_health_quarantinecase` | NOT NULL | — |
| `borders_health_isolationcase` | NOT NULL | — |
| `borders_health_contacttracingcase` | NOT NULL | — |
| `borders_health_borderhealthincident` | NOT NULL | — |
| `borders_health_borderemergency` | NOT NULL | — |
| `borders_health_bordercertificate` | NOT NULL | — |
| `borders_health_borderdecision` | NOT NULL | — |
| `borders_health_bordernotification` | NOT NULL | — |
| `borders_health_borderdailystatistics` | NOT NULL | — |

**جدولان بلا `crossing_id` مباشرة** (مسار النطاق متعدد المستويات):
| الجدول | المسار حتى نقطة الدخول | `scope_field` |
| :--- | :--- | :--- |
| `borders_health_vehicleinspection` | `vehicle__crossing__entry_point` | `vehicle__crossing__entry_point` |
| `borders_health_contact` | `tracing_case__crossing__entry_point` | `tracing_case__crossing__entry_point` |

### 3.3. العلاقات داخل التطبيق
| الجدول (Table) | المفتاح الخارجي (FK) | الجدول المرجعي (Reference) | نوع العلاقة | on_delete |
| :--- | :--- | :--- | :--- | :--- |
| `borders_health_cargoinspection` | `facility_id` | `borders_health_borderfacility` | Many-to-One | `SET_NULL` |
| `borders_health_quarantinecase` | `facility_id` | `borders_health_borderfacility` | Many-to-One | `SET_NULL` |
| `borders_health_isolationcase` | `facility_id` | `borders_health_borderfacility` | Many-to-One | `SET_NULL` |
| `borders_health_travelerhealthrecord` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_cargoinspection` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_bordersample` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_contacttracingcase` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_bordercertificate` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_borderdecision` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `SET_NULL` |
| `borders_health_vehicleinspection` | `vehicle_id` | `borders_health_vehicle` | Many-to-One | `CASCADE` |
| `borders_health_bordercertificate` | `vehicle_inspection_id` | `borders_health_vehicleinspection` | Many-to-One | `SET_NULL` |
| `borders_health_bordersample` | `cargo_inspection_id` | `borders_health_cargoinspection` | Many-to-One | `CASCADE` |
| `borders_health_borderdecision` | `cargo_inspection_id` | `borders_health_cargoinspection` | Many-to-One | `SET_NULL` |
| `borders_health_isolationcase` | `quarantine_case_id` | `borders_health_quarantinecase` | Many-to-One | `CASCADE` |
| `borders_health_contacttracingcase` | `case_id` | `borders_health_quarantinecase` | Many-to-One | `CASCADE` |
| `borders_health_borderhealthincident` | `quarantine_case_id` | `borders_health_quarantinecase` | Many-to-One | `SET_NULL` |
| `borders_health_borderdecision` | `quarantine_case_id` | `borders_health_quarantinecase` | Many-to-One | `SET_NULL` |
| `borders_health_contact` | `tracing_case_id` | `borders_health_contacttracingcase` | Many-to-One | `CASCADE` |

### 3.4. الروابط العابرة للوحدات (Cross-module)
| الجدول (Table) | المفتاح الخارجي (FK) | الجدول المرجعي (Reference) | الوحدة | نوع العلاقة | on_delete |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `borders_health_bordercrossing` | `entry_point_id` | `masterdata_entrypoint` | `masterdata` | One-to-One | `CASCADE` |
| `borders_health_travelerhealthrecord` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_healthdeclaration` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_borderscreening` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_quarantinecase` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_bordercertificate` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_borderdecision` | `traveler_id` | `travelers_traveler` | `travelers` | Many-to-One | `PROTECT` |
| `borders_health_bordershift` | `supervisor_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_borderstaff` | `user_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_travelerhealthrecord` | `assessed_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_healthdeclaration` | `reviewed_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_borderscreening` | `screened_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_vehicleinspection` | `inspector_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_cargoinspection` | `decided_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_bordersample` | `collected_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_isolationcase` | `started_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_isolationcase` | `closed_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_borderhealthincident` | `reported_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_borderemergency` | `reported_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_bordercertificate` | `issued_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_borderdecision` | `decided_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_bordernotification` | `sent_by_id` | `accounts_user` | `accounts` | Many-to-One | `PROTECT` |
| `borders_health_quarantinecase` | `disease_id` | `laboratory_disease` | `laboratory` | Many-to-One | `SET_NULL` |
| `borders_health_borderemergency` | `disease_id` | `laboratory_disease` | `laboratory` | Many-to-One | `SET_NULL` |
| `borders_health_bordersample` | `lab_sample_id` | `laboratory_labsample` | `laboratory` | Many-to-One | `SET_NULL` |
| `borders_health_quarantinecase` | `clinic_id` | `clinic_clinic` | `clinic` | Many-to-One | `SET_NULL` |
| `borders_health_isolationcase` | `clinic_isolation_id` | `clinic_isolationrecord` | `clinic` | Many-to-One | `SET_NULL` |
| `borders_health_cargoinspection` | `food_shipment_id` | `food_quarantine_foodshipment` | `food_quarantine` | Many-to-One | `SET_NULL` |
| `borders_health_quarantinecase` | `health_case_id` | `emergency_eoc_healthcase` | `emergency_eoc` | Many-to-One | `SET_NULL` |
| `borders_health_contacttracingcase` | `shared_contact_trace_id` | `emergency_eoc_contacttrace` | `emergency_eoc` | Many-to-One | `SET_NULL` |
| `borders_health_borderemergency` | `shared_event_id` | `emergency_eoc_emergencyevent` | `emergency_eoc` | Many-to-One | `SET_NULL` |
| `borders_health_borderscreening` | `shared_screening_id` | `screening_healthscreening` | `screening` | Many-to-One | `SET_NULL` |
| `borders_health_borderscreening` | `screening_certificate_id` | `vaccination_vaccinationcertificate` | `vaccination` | Many-to-One | `SET_NULL` |

### 3.5. الأسماء العكسية (`related_name`) التي ينشئها التطبيق
| المصدر | `related_name` | الجدول الهدف |
| :--- | :--- | :--- |
| `masterdata_entrypoint` | `border_crossing` | `borders_health_bordercrossing` |
| `borders_health_bordercrossing` | `facilities` | `borders_health_borderfacility` |
| `borders_health_bordercrossing` | `shifts` | `borders_health_bordershift` |
| `borders_health_bordercrossing` | `staff_assignments` | `borders_health_borderstaff` |
| `borders_health_bordercrossing` | `traveler_records` | `borders_health_travelerhealthrecord` |
| `borders_health_bordercrossing` | `declarations` | `borders_health_healthdeclaration` |
| `borders_health_bordercrossing` | `screenings` | `borders_health_borderscreening` |
| `borders_health_bordercrossing` | `vehicles` | `borders_health_vehicle` |
| `borders_health_bordercrossing` | `cargo_inspections` | `borders_health_cargoinspection` |
| `borders_health_bordercrossing` | `samples` | `borders_health_bordersample` |
| `borders_health_bordercrossing` | `quarantine_cases` | `borders_health_quarantinecase` |
| `borders_health_bordercrossing` | `isolation_cases` | `borders_health_isolationcase` |
| `borders_health_bordercrossing` | `contact_tracing_cases` | `borders_health_contacttracingcase` |
| `borders_health_bordercrossing` | `incidents` | `borders_health_borderhealthincident` |
| `borders_health_bordercrossing` | `emergencies` | `borders_health_borderemergency` |
| `borders_health_bordercrossing` | `certificates` | `borders_health_bordercertificate` |
| `borders_health_bordercrossing` | `decisions` | `borders_health_borderdecision` |
| `borders_health_bordercrossing` | `notifications` | `borders_health_bordernotification` |
| `borders_health_bordercrossing` | `daily_statistics` | `borders_health_borderdailystatistics` |
| `borders_health_borderfacility` | `cargo_inspections` / `quarantine_cases` / `isolation_cases` | التفتيش، الحجر، العزل |
| `borders_health_vehicle` | `traveler_records` / `cargo_inspections` / `samples` / `contact_tracing_cases` / `certificates` / `decisions` | سجلات المركبة عبر النظام |
| `borders_health_vehicle` | `inspections` | `borders_health_vehicleinspection` |
| `borders_health_cargoinspection` | `samples` | `borders_health_bordersample` |
| `borders_health_cargoinspection` | `decisions` | `borders_health_borderdecision` |
| `borders_health_quarantinecase` | `isolation_cases` / `contact_tracing_cases` / `incidents` / `decisions` | العزل، التتبع، الحوادث، القرارات |
| `borders_health_contacttracingcase` | `contacts` | `borders_health_contact` |
| `borders_health_vehicleinspection` | `certificates` | `borders_health_bordercertificate` |
| `accounts_user` | `border_shifts` / `border_staff_assignments` / `border_traveler_records` / `border_declarations_reviewed` / `border_screenings_performed` / `border_vehicle_inspections` / `border_cargo_decisions` / `border_samples_collected` / `border_isolation_started` / `border_isolation_closed` / `border_incidents_reported` / `border_emergencies_reported` / `border_certificates_issued` / `border_decisions_made` / `border_notifications_sent` | إسنادات المستخدم بالمعابر |
| `travelers_traveler` | `border_health_records` / `border_declarations` / `border_screenings` / `border_quarantine_cases` / `border_certificates` / `border_decisions` | سجلات المسافر بالمعابر |

### 3.6. المخطط العام (ERD)
```mermaid
graph TD
    EP["masterdata_entrypoint"] ||--|| XC["borders_health_bordercrossing"]
    XC --> FAC["borders_health_borderfacility"]
    XC --> SHF["borders_health_bordershift"]
    XC --> STF["borders_health_borderstaff"]
    XC --> THR["borders_health_travelerhealthrecord"]
    XC --> DCL["borders_health_healthdeclaration"]
    XC --> SCR["borders_health_borderscreening"]
    XC --> VEH["borders_health_vehicle"]
    XC --> CRG["borders_health_cargoinspection"]
    XC --> SMP["borders_health_bordersample"]
    XC --> QUA["borders_health_quarantinecase"]
    XC --> ISO["borders_health_isolationcase"]
    XC --> CTC["borders_health_contacttracingcase"]
    XC --> INC["borders_health_borderhealthincident"]
    XC --> EMG["borders_health_borderemergency"]
    XC --> CRT["borders_health_bordercertificate"]
    XC --> DEC["borders_health_borderdecision"]
    XC --> NTF["borders_health_bordernotification"]
    XC --> DST["borders_health_borderdailystatistics"]

    VEH --> VIN["borders_health_vehicleinspection"]
    CRG --> SMP
    QUA --> ISO
    QUA --> CTC
    QUA --> INC
    QUA --> DEC
    CTC --> CON["borders_health_contact"]
    VIN --> CRT
    CRG --> DEC

    TRV["travelers_traveler"] --> THR
    TRV --> DCL
    TRV --> SCR
    TRV --> QUA
    TRV --> CRT
    TRV --> DEC
    USR["accounts_user"] --> STF
    USR --> SHF
    USR --> THR
    USR --> DCL
    USR --> SCR
    USR --> VIN
    USR --> CRG
    USR --> SMP
    USR --> ISO
    USR --> INC
    USR --> EMG
    USR --> CRT
    USR --> DEC
    USR --> NTF
    DIS["laboratory_disease"] --> QUA
    DIS --> EMG
    LSB["laboratory_labsample"] --> SMP
    EOC["emergency_eoc_healthcase"] --> QUA
    CTC2["emergency_eoc_contacttrace"] --> CTC
    EMG2["emergency_eoc_emergencyevent"] --> EMG
    CLI["clinic_clinic"] --> QUA
    ISL["clinic_isolationrecord"] --> ISO
    FSH["food_quarantine_foodshipment"] --> CRG
    SHC["screening_healthscreening"] --> SCR
    VAC["vaccination_vaccinationcertificate"] --> SCR
```
