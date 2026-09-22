
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