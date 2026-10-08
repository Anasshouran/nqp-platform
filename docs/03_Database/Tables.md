
---

### 📄 3. `Tables.md` (وصف تفصيلي للجداول)

```markdown
# وصف تفصيلي للجداول (Tables Description)

## 1. جداول المستخدمين والصلاحيات (Users & Auth)

### `users`
| العمود (Column) | النوع (Type) | القيد (Constraint) | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف الفريد للمستخدم |
| `email` | VARCHAR(255) | UNIQUE | البريد الإلكتروني (تسجيل الدخول) |
| `phone` | VARCHAR(20) | UNIQUE | رقم الجوال (تسجيل الدخول) |
| `full_name` | VARCHAR(255) | NOT NULL | الاسم الكامل |
| `hashed_password` | VARCHAR(255) | NOT NULL | كلمة المرور المشفرة (bcrypt) |
| `national_id` | VARCHAR(20) | - | الرقم القومي |
| `port_id` | UUID | FOREIGN KEY (ports) | المنفذ التابع له (إن وجد) |
| `role` | VARCHAR(50) | NOT NULL | الدور (SUPER_ADMIN, FEDERAL_ADMIN, إلخ) |
| `is_active` | BOOLEAN | DEFAULT TRUE | حالة الحساب |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | وقت آخر تحديث |

### `roles`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `name` | VARCHAR(50) | UNIQUE (مثل: ADMIN, DOCTOR, OFFICER) |
| `description` | TEXT | وصف الصلاحية |

### `permissions`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `name` | VARCHAR(100) | UNIQUE (مثل: READ_TRAVELER, WRITE_EMR) |
| `resource` | VARCHAR(50) | الفئة (TRAVELER, EMR, LAB) |
| `action` | VARCHAR(20) | العملية (READ, WRITE, DELETE) |

---

## 2. جداول المسافرين والرحلات (Travelers & Flights)

### `travelers`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `passport_number` | VARCHAR(20) | UNIQUE، رقم جواز السفر |
| `first_name` | VARCHAR(100) | الاسم الأول |
| `last_name` | VARCHAR(100) | اسم العائلة |
| `date_of_birth` | DATE | تاريخ الميلاد |
| `nationality_id` | UUID | FOREIGN KEY (countries) |
| `phone` | VARCHAR(20) | رقم التواصل |
| `email` | VARCHAR(255) | البريد الإلكتروني |
| `medical_history` | JSONB | (مثل: {"diabetes": true, "hypertension": false}) |
| `created_at` | TIMESTAMPTZ | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | وقت آخر تحديث |

### `flights`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `flight_number` | VARCHAR(20) | رقم الرحلة |
| `carrier_id` | UUID | FOREIGN KEY (carriers) |
| `origin_code` | VARCHAR(10) | رمز مطار المغادرة (IATA) |
| `origin_country_id` | UUID | FOREIGN KEY (countries) |
| `destination_port_id` | UUID | FOREIGN KEY (ports) |
| `scheduled_arrival` | TIMESTAMPTZ | موعد الوصول المتوقع |
| `status` | VARCHAR(20) | (SCHEDULED, ARRIVED, DEPARTED) |

---

## 3. جداول الفحص والتقييم (Screening & Risk)

### `health_screenings`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `officer_id` | UUID | FOREIGN KEY (users) |
| `body_temperature` | FLOAT | درجة حرارة الجسم (مئوية) |
| `oxygen_saturation` | INT | تشبع الأكسجين (SpO2%) |
| `systolic_bp` | INT | الضغط الانقباضي |
| `diastolic_bp` | INT | الضغط الانبساطي |
| `observed_symptoms` | JSONB | (مثل: ["cough", "fever"]) |
| `screened_at` | TIMESTAMPTZ | وقت الفحص |

### `risk_assessments`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `screening_id` | UUID | FOREIGN KEY (health_screenings) |
| `risk_level` | VARCHAR(10) | (GREEN, YELLOW, RED) |
| `risk_score` | FLOAT | النتيجة الرقمية (0-100) |
| `decision_factors` | JSONB | عوامل القرار (مثل: {"origin_risk": 80, "symptoms": 90}) |
| `recommendation` | VARCHAR(20) | (ADMIT, QUARANTINE, REFER) |
| `assessed_at` | TIMESTAMPTZ | وقت التقييم |

---

## 4. جداول العيادات والمختبرات (Clinic & Lab)

### `emr_records`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `visit_id` | UUID | FOREIGN KEY (clinic_visits) |
| `clinical_notes` | JSONB | ملاحظات الطبيب السريرية |
| `vital_signs` | JSONB | (مثل: {"heart_rate": 80, "resp_rate": 18}) |
| `physical_exam` | JSONB | نتائج الفحص البدني |
| `created_at` | TIMESTAMPTZ | وقت الإنشاء |

### `lab_samples`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `visit_id` | UUID | FOREIGN KEY (clinic_visits) |
| `sample_barcode` | VARCHAR(50) | UNIQUE، باركود العينة |
| `sample_type` | VARCHAR(30) | (BLOOD, SWAB, URINE) |
| `collector_id` | UUID | FOREIGN KEY (users) |
| `collected_at` | TIMESTAMPTZ | وقت سحب العينة |
| `status` | VARCHAR(20) | (REGISTERED, PROCESSING, COMPLETED) |

### `lab_results`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `sample_id` | UUID | FOREIGN KEY (lab_samples) |
| `disease_id` | UUID | FOREIGN KEY (diseases) |
| `result` | VARCHAR(20) | (POSITIVE, NEGATIVE, INCONCLUSIVE) |
| `value` | FLOAT | القيمة الرقمية (إن وجدت) |
| `entered_by_id` | UUID | FOREIGN KEY (users) |
| `approved_by_id` | UUID | FOREIGN KEY (users) |
| `approval_status` | VARCHAR(20) | (PENDING, APPROVED) |
| `result_date` | TIMESTAMPTZ | وقت النتيجة |

---

## 5. جداول المتابعة المنزلية (Health Follow-up)

### `follow_up_patients`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `clinic_visit_id` | UUID | FOREIGN KEY (clinic_visits) |
| `enrollment_date` | DATE | تاريخ التسجيل في المتابعة |
| `expected_end_date` | DATE | التاريخ المتوقع للانتهاء |
| `status` | VARCHAR(20) | (ACTIVE, COMPLETED, CANCELLED) |

### `daily_health_logs`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `follow_up_id` | UUID | FOREIGN KEY (follow_up_patients) |
| `temperature` | FLOAT | درجة الحرارة اليومية |
| `oxygen_saturation` | INT | تشبع الأكسجين |
| `symptoms` | JSONB | الأعراض الجديدة |
| `mood_score` | INT | 1-10 |
| `logged_date` | TIMESTAMPTZ | وقت الإدخال |

### `recovery_certificates`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `follow_up_id` | UUID | FOREIGN KEY (follow_up_patients) |
| `approved_by_id` | UUID | FOREIGN KEY (users) |
| `certificate_hash` | VARCHAR(255) | UNIQUE، التوقيع الرقمي |
| `qr_data` | JSONB | بيانات الـ QR المشفرة |
| `issue_date` | DATE | تاريخ الإصدار |
| `status` | VARCHAR(20) | (ACTIVE, REVOKED) |

---

## 6. جداول الطوارئ والترصد (EOC & Surveillance)

### `emergency_alerts`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `alert_type` | VARCHAR(30) | (RED_ALERT, OUTBREAK) |
| `description` | TEXT | وصف الحالة |
| `location_geo` | JSONB | (مثل: {"lat": 12.34, "lng": 45.67}) |
| `status` | VARCHAR(20) | (NEW, PROCESSING, RESOLVED) |
| `triggered_at` | TIMESTAMPTZ | وقت الإطلاق |
| `resolved_at` | TIMESTAMPTZ | وقت الإنهاء |

### `kill_switches`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `activated_by_id` | UUID | FOREIGN KEY (users) |
| `reason` | TEXT | سبب التفعيل |
| `activated_at` | TIMESTAMPTZ | وقت التفعيل |
| `deactivated_at` | TIMESTAMPTZ | وقت إلغاء التفعيل |

## 7. جداول نظام صحة المعابر البرية (Land Border Health System)

> التطبيق `apps.borders_health` — **21 جدولاً** ببادئة `borders_health_`.
> كل جدول يرث `core.models.BaseModel`: `id` (UUID, PRIMARY KEY) + `created_at` + `updated_at`.
> الترحيلات المطبَّقة: `borders_health.0001` … `borders_health.0007`.
>
> **عمود النطاق**: كل سجل تشغيلي يحمل `crossing_id` → `borders_health_bordercrossing`، وقياس الصلاحية يتم على `crossing__entry_point` مقابل نطاق `ScopeType.PORT`.
> استثناءان: `borders_health_bordercrossing` نفسه (يُقاس على `entry_point`)، و`borders_health_vehicleinspection` + `borders_health_contact` (مسار متعدد المستويات).

---

### `borders_health_bordercrossing` (معبر بري)
| العمود (Column) | النوع (Type) | القيد (Constraint) | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء (auto_now_add) |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث (auto_now) |
| `entry_point_id` | UUID | FOREIGN KEY (masterdata_entrypoint) UNIQUE | نقطة الدخول (منفذ بري) — امتداد OneToOne |
| `border_type` | VARCHAR(10) | NOT NULL, DEFAULT 'ROAD' | نوع المعبر: ROAD / RAIL / RIVER |
| `neighbor_country` | VARCHAR(100) | NOT NULL | الدولة المجاورة |
| `operating_status` | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | حالة التشغيل: OPEN / RESTRICTED / LIMITED / CLOSED / EMERGENCY |
| `operating_hours` | VARCHAR(200) | NOT NULL | ساعات العمل |
| `daily_capacity` | INTEGER | NULL, CHECK (>= 0) | الطاقة اليومية (عدد الأشخاص) |
| `working_agencies` | TEXT | NOT NULL | الجهات العاملة بالمعبر |
| `has_health_facility` | BOOLEAN | NOT NULL, DEFAULT FALSE | يوجد مرفق صحي |
| `has_laboratory` | BOOLEAN | NOT NULL, DEFAULT FALSE | يوجد مختبر |
| `has_quarantine_facility` | BOOLEAN | NOT NULL, DEFAULT FALSE | يوجد مرفق حجر |
| `has_isolation_facility` | BOOLEAN | NOT NULL, DEFAULT FALSE | يوجد مرفق عزل |
| `quarantine_capacity` | INTEGER | NULL, CHECK (>= 0) | طاقة مرفق الحجر |
| `closure_reason` | TEXT | NOT NULL | سبب الإغلاق أو التقييد |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderfacility` (مرفق معبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `kind` | VARCHAR(20) | NOT NULL | نوع المرفق: HEALTH / LABORATORY / QUARANTINE / ISOLATION / STORAGE / WATER_SANITATION / WASTE / VECTOR_CONTROL |
| `name_ar` | VARCHAR(150) | NOT NULL | الاسم بالعربية |
| `name_en` | VARCHAR(150) | NOT NULL | الاسم بالإنجليزية |
| `capacity` | INTEGER | NULL, CHECK (>= 0) | طاقة المرفق |
| `staff_count` | INTEGER | NULL, CHECK (>= 0) | عدد الكوادر |
| `is_operational` | BOOLEAN | NOT NULL, DEFAULT TRUE | يعمل |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_bordershift` (وردية معبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `shift_date` | DATE | NOT NULL | تاريخ الوردية |
| `shift_type` | VARCHAR(20) | NOT NULL, DEFAULT 'MORNING' | نوع الوردية: MORNING / AFTERNOON / NIGHT / ROTATING |
| `started_at` | TIME | NULL | بداية الوردية |
| `ended_at` | TIME | NULL | نهاية الوردية |
| `supervisor_id` | UUID | FOREIGN KEY (accounts_user) NULL | المشرف على الوردية |
| `is_staffed` | BOOLEAN | NOT NULL, DEFAULT TRUE | الوردية مؤمَّنة |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderstaff` (إسناد كادر بالمعبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `user_id` | UUID | FOREIGN KEY (accounts_user) NOT NULL | المستخدم المسنَد |
| `role` | VARCHAR(30) | NOT NULL | الدور: MANAGER / DOCTOR / INSPECTOR / FOOD_INSPECTOR / ENVIRONMENTAL_INSPECTOR / REGISTRATION_OFFICER / LAB_TECHNICIAN / EPIDEMIOLOGY_OFFICER / EMERGENCY_OFFICER |
| `assignment_type` | VARCHAR(15) | NOT NULL, DEFAULT 'FULL_TIME' | نوع الإسناد: FULL_TIME / PART_TIME / SECONDMENT |
| `starts_on` | DATE | NULL | بداية الإسناد |
| `ends_on` | DATE | NULL | نهاية الإسناد |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | الإسناد نشط |
| `notes` | TEXT | NOT NULL | ملاحظات |
| — | — | `unique_border_staff_assignment` | UNIQUE (crossing_id, user_id, role) |

### `borders_health_travelerhealthrecord` (سجل صحي للمسافر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NOT NULL | المسافر |
| `direction` | VARCHAR(10) | NOT NULL, DEFAULT 'INBOUND' | اتجاه الحركة: INBOUND / OUTBOUND |
| `entry_at` | TIMESTAMPTZ | NOT NULL | وقت العبور (يُملأ بـ `timezone.now`) |
| `departure_country` | VARCHAR(100) | NOT NULL | بلد المغادرة |
| `visited_countries` | JSONB | NOT NULL, DEFAULT `[]` | الدول التي زارها المسافر |
| `transport_mode` | VARCHAR(50) | NOT NULL | وسيلة النقل |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة |
| `health_status` | VARCHAR(20) | NOT NULL, DEFAULT 'FIT' | الحالة الصحية: FIT / UNFIT / UNDER_OBSERVATION |
| `risk_level` | VARCHAR(10) | NOT NULL, DEFAULT 'GREEN' | مستوى الخطورة: GREEN / YELLOW / RED |
| `decision` | VARCHAR(20) | NOT NULL, DEFAULT 'CLEARED' | القرار: CLEARED / HOLD / REFERRED / QUARANTINED / REFUSED_ENTRY |
| `assessed_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المُقيِّم |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_healthdeclaration` (إقرار صحي)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NOT NULL | المسافر |
| `departure_country` | VARCHAR(100) | NOT NULL | بلد المغادرة |
| `departure_date` | DATE | NULL | تاريخ السفر |
| `visited_countries` | JSONB | NOT NULL, DEFAULT `[]` | الدول التي زارها |
| `health_conditions` | TEXT | NOT NULL | الحالة الصحية المُعلنة |
| `current_symptoms` | TEXT | NOT NULL | الأعراض الحالية |
| `contact_name` | VARCHAR(150) | NOT NULL | اسم جهة الاتصال |
| `contact_phone` | VARCHAR(30) | NOT NULL | هاتف التواصل |
| `declared_at` | TIMESTAMPTZ | NOT NULL | تاريخ الإقرار (auto_now_add) |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'RECEIVED' | الحالة: RECEIVED / REVIEWED / APPROVED / REJECTED |
| `reviewed_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المراجع |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderscreening` (فحص مسافر بمعبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NOT NULL | المسافر |
| `shared_screening_id` | UUID | FOREIGN KEY (screening_healthscreening) NULL | الفحص المشترك |
| `body_temperature` | DOUBLE PRECISION | NULL | درجة حرارة الجسم (مئوية) |
| `oxygen_saturation` | DOUBLE PRECISION | NULL | نسبة تشبع الأكسجين (%) |
| `observed_symptoms` | JSONB | NOT NULL, DEFAULT `[]` | الأعراض المرصودة |
| `risk_level` | VARCHAR(10) | NOT NULL | مستوى الخطورة — حقل حر بلا `choices` |
| `document_verified` | BOOLEAN | NOT NULL, DEFAULT FALSE | تم التحقق من الوثائق |
| `vaccination_verified` | BOOLEAN | NOT NULL, DEFAULT FALSE | تم التحقق من التطعيمات |
| `screening_certificate_id` | UUID | FOREIGN KEY (vaccination_vaccinationcertificate) NULL | شهادة التطعيم |
| `decision` | VARCHAR(20) | NOT NULL, DEFAULT 'CLEARED' | القرار: CLEARED / HOLD / REFERRED / QUARANTINED |
| `screened_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | الفاحص |
| `screened_at` | TIMESTAMPTZ | NOT NULL | وقت الفحص (auto_now_add) |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_vehicle` (مركبة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `plate_number` | VARCHAR(30) | NOT NULL UNIQUE | رقم اللوحة — فريد **عالمياً** لا لكل معبر |
| `chassis_number` | VARCHAR(50) | NOT NULL | رقم الهيكل |
| `vehicle_type` | VARCHAR(25) | NOT NULL, DEFAULT 'TRUCK' | النوع: BUS / TRUCK / PRIVATE_CAR / AMBULANCE / LIVESTOCK_TRANSPORT / REFRIGERATED_TRUCK / TANKER / OTHER |
| `make_model` | VARCHAR(100) | NOT NULL | الصنع والطراز |
| `year_of_manufacture` | SMALLINT | NULL, CHECK (>= 0) | سنة الصنع |
| `capacity` | INTEGER | NULL, CHECK (>= 0) | السعة |
| `owner_name` | VARCHAR(200) | NOT NULL | اسم المالك |
| `driver_name` | VARCHAR(150) | NOT NULL | اسم السائق |
| `driver_phone` | VARCHAR(30) | NOT NULL | هاتف السائق |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | الحالة: ACTIVE / UNDER_QUARANTINE / CONDEMNED |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_vehicleinspection` (تفتيش مركبة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NOT NULL | المركبة — النطاق عبر `vehicle__crossing__entry_point` |
| `inspection_type` | VARCHAR(20) | NOT NULL, DEFAULT 'EXTERIOR' | نوع التفتيش: EXTERIOR / CARGO_HOLD / TEMPERATURE / DISINFECTION / PEST_CONTROL / WASTE / CABIN |
| `inspection_date` | TIMESTAMPTZ | NOT NULL | تاريخ التفتيش (auto_now_add) |
| `inspector_id` | UUID | FOREIGN KEY (accounts_user) NULL | المفتش |
| `cleanliness_status` | VARCHAR(20) | NOT NULL, DEFAULT 'COMPLIANT' | النظافة: COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE |
| `pest_control_status` | VARCHAR(20) | NOT NULL, DEFAULT 'COMPLIANT' | مكافحة الحشرات: COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE |
| `waste_status` | VARCHAR(20) | NOT NULL, DEFAULT 'COMPLIANT' | النفايات: COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE |
| `cooling_status` | VARCHAR(20) | NOT NULL, DEFAULT 'NOT_APPLICABLE' | وسائل التبريد: COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE |
| `findings` | TEXT | NOT NULL | الملاحظات |
| `overall_status` | VARCHAR(15) | NOT NULL, DEFAULT 'PASSED' | الحالة العامة: PASSED / CONDITIONAL / FAILED |
| `reinspection_required` | BOOLEAN | NOT NULL, DEFAULT FALSE | يلزم إعادة تفتيش |

### `borders_health_cargoinspection` (تفتيش شحنة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `scope` | VARCHAR(20) | NOT NULL, DEFAULT 'CARGO' | نطاق التفتيش: CARGO / FOOD / WAREHOUSE / WATER_SANITATION |
| `food_shipment_id` | UUID | FOREIGN KEY (food_quarantine_foodshipment) NULL | شحنة سلامة الغذاء |
| `facility_id` | UUID | FOREIGN KEY (borders_health_borderfacility) NULL | المرفق (مخزن / مياه وصرف) |
| `declaration_number` | VARCHAR(50) | NOT NULL | رقم الإقرار |
| `product_type` | VARCHAR(150) | NOT NULL | نوع المنتج |
| `country_of_origin` | VARCHAR(100) | NOT NULL | بلد المنشأ |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة |
| `samples_collected` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | عدد العينات المسحوبة |
| `laboratory_result` | TEXT | NOT NULL | نتيجة المختبر |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | حالة الفحص: PENDING / INSPECTING / SAMPLES_SENT / AWAITING_DECISION / RELEASED / REJECTED / HOLD |
| `decision` | VARCHAR(15) | NOT NULL | القرار: CLEARED / CONDITIONAL / REJECTED / HOLD |
| `decided_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المُقرِّر |
| `decided_at` | TIMESTAMPTZ | NULL | وقت القرار |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_bordersample` (عيّنة معبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `lab_sample_id` | UUID | FOREIGN KEY (laboratory_labsample) NULL | العيّنة المختبرية المشتركة |
| `cargo_inspection_id` | UUID | FOREIGN KEY (borders_health_cargoinspection) NULL | تفتيش الشحنة مصدر العيّنة |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة مصدر العيّنة |
| `sample_code` | VARCHAR(40) | NOT NULL | رمز العيّنة |
| `sample_type` | VARCHAR(100) | NOT NULL | نوع العيّنة |
| `collected_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | من قام بسحب العيّنة |
| `collected_at` | TIMESTAMPTZ | NOT NULL | تاريخ السحب (auto_now_add) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'COLLECTED' | الحالة: COLLECTED / SENT / UNDER_TEST / RESULT_RECEIVED / REJECTED |
| `result` | TEXT | NOT NULL | النتيجة |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_quarantinecase` (حالة حجر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `case_number` | VARCHAR(30) | **UNIQUE + NULL** | رقم الحالة — فريد وقابل لـ NULL عمداً (راجع `Constraints.md` قسم 3) |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NULL | المسافر |
| `person_name` | VARCHAR(200) | NOT NULL | اسم الحالة (للمخالطين غير المسجَّلين) |
| `health_case_id` | UUID | FOREIGN KEY (emergency_eoc_healthcase) NULL | حالة الترصد المشتركة |
| `disease_id` | UUID | FOREIGN KEY (laboratory_disease) NULL | المرض |
| `clinic_id` | UUID | FOREIGN KEY (clinic_clinic) NULL | العيادة المرجعية |
| `facility_id` | UUID | FOREIGN KEY (borders_health_borderfacility) NULL | مرفق الحجر |
| `entry_at` | TIMESTAMPTZ | NOT NULL | وقت الدخول للحجر (auto_now_add) |
| `required_days` | SMALLINT | NOT NULL, DEFAULT 14, CHECK (>= 0) | المدة المطلوبة (أيام) |
| `expected_end_date` | DATE | NULL | تاريخ الانتهاء المتوقع |
| `actual_end_date` | DATE | NULL | تاريخ الانتهاء الفعلي |
| `phase` | VARCHAR(20) | NOT NULL, DEFAULT 'SCREENED' | المرحلة: SCREENED / ASSESSED / QUARANTINED / UNDER_TREATMENT / RECOVERED / RELEASED / REFERRED_OUT |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'ADMITTED' | الحالة: ADMITTED / UNDER_QUARANTINE / REFERRED / RELEASED / ESCALATED |
| `follow_up_notes` | TEXT | NOT NULL | ملاحظات المتابعة |

### `borders_health_isolationcase` (حالة عزل)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `quarantine_case_id` | UUID | FOREIGN KEY (borders_health_quarantinecase) NULL | حالة الحجر المرتبطة |
| `clinic_isolation_id` | UUID | FOREIGN KEY (clinic_isolationrecord) NULL | سجل العزل بالعيادة |
| `facility_id` | UUID | FOREIGN KEY (borders_health_borderfacility) NULL | مرفق العزل |
| `start_date` | DATE | NOT NULL | تاريخ البدء |
| `expected_end_date` | DATE | NULL | تاريخ الانتهاء المتوقع |
| `end_date` | DATE | NULL | تاريخ الانتهاء الفعلي |
| `status` | VARCHAR(10) | NOT NULL, DEFAULT 'ACTIVE' | الحالة: ACTIVE / RELEASED / REMOVED |
| `started_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | من بدأ العزل |
| `closed_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | من أغلق العزل |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_contacttracingcase` (حالة تتبع مخالطين)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `case_id` | UUID | FOREIGN KEY (borders_health_quarantinecase) NULL | حالة الحجر المفهرسة |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `index_case_name` | VARCHAR(200) | NOT NULL | اسم/وصف الحالة المفهرسة |
| `transport_mode` | VARCHAR(50) | NOT NULL | وسيلة النقل |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة |
| `shared_contact_trace_id` | UUID | FOREIGN KEY (emergency_eoc_contacttrace) NULL | سجل التتبع المشترك |
| `follow_up_days` | SMALLINT | NOT NULL, DEFAULT 14, CHECK (>= 0) | مدة المتابعة (أيام) |
| `started_at` | TIMESTAMPTZ | NOT NULL | تاريخ البدء (auto_now_add) |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'OPEN' | الحالة: OPEN / MONITORING / COMPLETED / ESCALATED |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_contact` (مخالط)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `tracing_case_id` | UUID | FOREIGN KEY (borders_health_contacttracingcase) NOT NULL | حالة التتبع — النطاق عبر `tracing_case__crossing__entry_point` |
| `full_name` | VARCHAR(200) | NOT NULL | الاسم الكامل |
| `passport_number` | VARCHAR(40) | NOT NULL | رقم الجواز |
| `phone` | VARCHAR(30) | NOT NULL | رقم الجوال |
| `seat_or_relation` | VARCHAR(60) | NOT NULL | المقعد أو صلة القرابة |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'IDENTIFIED' | الحالة: IDENTIFIED / CONTACTED / QUARANTINED / MONITORING / CLEARED / LOST |
| `follow_up_day` | SMALLINT | NOT NULL, DEFAULT 0, CHECK (>= 0) | يوم المتابعة |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderhealthincident` (حادثة صحية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `quarantine_case_id` | UUID | FOREIGN KEY (borders_health_quarantinecase) NULL | حالة الحجر المرتبطة |
| `title` | VARCHAR(200) | NOT NULL | العنوان |
| `description` | TEXT | NOT NULL | الوصف |
| `severity` | VARCHAR(10) | NOT NULL, DEFAULT 'MEDIUM' | الخطورة: LOW / MEDIUM / HIGH / CRITICAL |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'OPEN' | الحالة: OPEN / INVESTIGATING / CONTROLLED / CLOSED |
| `reported_at` | TIMESTAMPTZ | NOT NULL | وقت البلاغ (auto_now_add) |
| `closed_at` | TIMESTAMPTZ | NULL | وقت الإغلاق |
| `reported_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المبلِّغ |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderemergency` (طوارئ صحية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `shared_event_id` | UUID | FOREIGN KEY (emergency_eoc_emergencyevent) NULL | حدث الطوارئ المشترك |
| `disease_id` | UUID | FOREIGN KEY (laboratory_disease) NULL | المرض المسبِّب |
| `title` | VARCHAR(200) | NOT NULL | العنوان |
| `description` | TEXT | NOT NULL | الوصف |
| `restriction_level` | VARCHAR(25) | NOT NULL, DEFAULT 'ADVISORY' | مستوى التقييد: ADVISORY / INCREASED_SURVEILLANCE / MOVEMENT_REDUCED / MOVEMENT_SUSPENDED / CLOSED |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'OPEN' | الحالة: OPEN / ACTIVE / CONTROLLED / CLOSED |
| `reported_at` | TIMESTAMPTZ | NOT NULL | وقت البلاغ (auto_now_add) |
| `resolved_at` | TIMESTAMPTZ | NULL | وقت الإنهاء |
| `reported_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المبلِّغ |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_bordercertificate` (شهادة معبرية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `certificate_number` | VARCHAR(50) | NOT NULL UNIQUE | رقم الشهادة |
| `certificate_type` | VARCHAR(25) | NOT NULL | نوع الشهادة: HEALTH_CLEARANCE / INSPECTION / PASSAGE_PERMIT / QUARANTINE_RELEASE / REJECTION |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NULL | المسافر |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة |
| `vehicle_inspection_id` | UUID | FOREIGN KEY (borders_health_vehicleinspection) NULL | تفتيش المركبة |
| `issue_date` | DATE | NOT NULL | تاريخ الإصدار |
| `expiry_date` | DATE | NULL | تاريخ الانتهاء |
| `status` | VARCHAR(15) | NOT NULL, DEFAULT 'DRAFT' | الحالة: DRAFT / ISSUED / EXPIRED / REVOKED / CANCELLED |
| `qr_payload` | VARCHAR(500) | NOT NULL | محتوى رمز QR |
| `issued_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | من أصدرها |
| `notes` | TEXT | NOT NULL | ملاحظات |

### `borders_health_borderdecision` (قرار)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `subject_type` | VARCHAR(30) | NOT NULL | نوع المخاطَب بالقرار (مسافر / مركبة / شحنة / حالة حجر) |
| `traveler_id` | UUID | FOREIGN KEY (travelers_traveler) NULL | المسافر |
| `vehicle_id` | UUID | FOREIGN KEY (borders_health_vehicle) NULL | المركبة |
| `cargo_inspection_id` | UUID | FOREIGN KEY (borders_health_cargoinspection) NULL | تفتيش الشحنة |
| `quarantine_case_id` | UUID | FOREIGN KEY (borders_health_quarantinecase) NULL | حالة الحجر |
| `outcome` | VARCHAR(20) | NOT NULL | القرار: CLEARED / CONDITIONAL / HOLD / REFERRED / REJECTED / ENFORCEMENT |
| `reason` | TEXT | NOT NULL | المبرر |
| `decided_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المُقرِّر |
| `decided_at` | TIMESTAMPTZ | NOT NULL | وقت القرار (auto_now_add) |

### `borders_health_bordernotification` (إشعار معبر)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `recipient_role` | VARCHAR(40) | NOT NULL | الدور المستلم |
| `recipient_contact` | VARCHAR(120) | NOT NULL | جهة الاتصال |
| `title` | VARCHAR(200) | NOT NULL | العنوان |
| `body` | TEXT | NOT NULL | النص |
| `channel` | VARCHAR(15) | NOT NULL, DEFAULT 'INTERNAL' | القناة: INTERNAL / EMAIL / SMS / PUSH |
| `status` | VARCHAR(10) | NOT NULL, DEFAULT 'PENDING' | الحالة: PENDING / SENT / FAILED |
| `sent_at` | TIMESTAMPTZ | NULL | وقت الإرسال |
| `sent_by_id` | UUID | FOREIGN KEY (accounts_user) NULL | المرسل |

### `borders_health_borderdailystatistics` (إحصاء يومي)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف فريد |
| `created_at` | TIMESTAMPTZ | NOT NULL | وقت الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL | وقت آخر تحديث |
| `crossing_id` | UUID | FOREIGN KEY (borders_health_bordercrossing) NOT NULL | المعبر |
| `stat_date` | DATE | NOT NULL | التاريخ |
| `travelers_inbound` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | المسافرون الداخليون |
| `travelers_outbound` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | المسافرون الخارجون |
| `vehicles_inspected` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | المركبات المفحوصة |
| `cargo_inspections` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | تفتيش الشحنات |
| `quarantine_cases` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | حالات الحجر |
| `isolation_cases` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | حالات العزل |
| `suspected_cases` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | الحالات المشتبه بها |
| `certificates_issued` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | الشهادات الصادرة |
| `samples_collected` | INTEGER | NOT NULL, DEFAULT 0, CHECK (>= 0) | العينات المسحوبة |
| `average_processing_minutes` | INTEGER | NULL, CHECK (>= 0) | متوسط زمن المعاملة (دقائق) |
| — | — | `unique_border_daily_statistic` | UNIQUE (crossing_id, stat_date) |
