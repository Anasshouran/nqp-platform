# 02_Database_Schema - هيكل جداول نظام إدارة الأمراض

## 1. الجداول الأساسية (PostgreSQL)

### جدول `diseases` (الأمراض)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف الفريد للمرض. |
| `icd_11_code` | VARCHAR(20) | UNIQUE | رمز ICD-11 (مثل: RA01 لكوفيد-19). |
| `name_ar` | VARCHAR(255) | NOT NULL | اسم المرض باللغة العربية. |
| `name_en` | VARCHAR(255) | NOT NULL | اسم المرض باللغة الإنجليزية. |
| `description` | TEXT | - | وصف المرض (الأعراض العامة، المضاعفات). |
| `symptoms` | JSONB | NOT NULL | قائمة الأعراض النموذجية (مثال: ["fever", "cough", "shortness_of_breath"]). |
| `incubation_period_min` | INT | - | الحد الأدنى لفترة الحضانة (بالأيام). |
| `incubation_period_max` | INT | - | الحد الأقصى لفترة الحضانة (بالأيام). |
| `transmission_methods` | JSONB | - | طرق الانتقال (["airborne", "contact", "foodborne"]). |
| `is_public_health_emergency` | BOOLEAN | DEFAULT FALSE | هل هو مرض من PHEIC (حسب IHR)؟ |
| `ihr_category` | VARCHAR(30) | - | (PHEIC, TARGETED_ERADICATION, SURVEILLANCE_ONLY, NOT_IHR). |
| `reporting_requirements` | JSONB | - | متطلبات الإبلاغ (الجهات، التوقيت). |
| `is_active` | BOOLEAN | DEFAULT TRUE | هل المرض مفعّل في النظام؟ |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإضافة. |
| `updated_at` | TIMESTAMP | - | آخر تحديث. |

### جدول `disease_case_definitions` (تعريفات الحالات)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `disease_id` | UUID | FOREIGN KEY | المرض المرتبط. |
| `case_type` | VARCHAR(20) | NOT NULL | (SUSPECTED, PROBABLE, CONFIRMED, NOT_A_CASE). |
| `clinical_criteria` | JSONB | - | المعايير السريرية (الأعراض المطلوبة). |
| `lab_criteria` | JSONB | - | المعايير المخبرية (النتائج المطلوبة). |
| `epidemiological_criteria` | JSONB | - | المعايير الوبائية (التعرض، السفر). |
| `algorithm` | TEXT | - | منطق التصنيف (نصي أو شيفرة). |
| `version` | INT | DEFAULT 1 | رقم الإصدار. |
| `is_active` | BOOLEAN | DEFAULT TRUE | هل التعريف مفعّل؟ |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء. |
| `updated_at` | TIMESTAMP | - | آخر تحديث. |

### جدول `treatment_protocols` (البروتوكولات العلاجية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `disease_id` | UUID | FOREIGN KEY | المرض المرتبط. |
| `name` | VARCHAR(255) | NOT NULL | اسم البروتوكول (مثل: "بروتوكول كوفيد-19 للبالغين"). |
| `severity_level` | VARCHAR(30) | NOT NULL | (MILD, MODERATE, SEVERE, CRITICAL). |
| `medications` | JSONB | NOT NULL | قائمة الأدوية (الاسم، الجرعة، التكرار، المدة). |
| `alternative_medications` | JSONB | - | الأدوية البديلة (إن وجدت). |
| `supportive_care` | JSONB | - | الرعاية الداعمة (الأكسجين، السوائل). |
| `duration_days` | INT | - | مدة العلاج الموصى بها (بالأيام). |
| `contraindications` | JSONB | - | موانع الاستخدام (الحمل، الحساسية). |
| `version` | INT | DEFAULT 1 | رقم الإصدار. |
| `is_active` | BOOLEAN | DEFAULT TRUE | هل البروتوكول مفعّل؟ |
| `approved_by` | UUID | FOREIGN KEY (users) | من اعتمد البروتوكول. |
| `approved_at` | TIMESTAMP | - | وقت الاعتماد. |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء. |
| `updated_at` | TIMESTAMP | - | آخر تحديث. |

### جدول `disease_updates` (سجل تحديثات الأمراض - للتدقيق)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `disease_id` | UUID | FOREIGN KEY | المرض المُحدّث. |
| `update_type` | VARCHAR(30) | NOT NULL | (CASE_DEFINITION, PROTOCOL, GENERAL_INFO). |
| `old_data` | JSONB | - | البيانات القديمة. |
| `new_data` | JSONB | - | البيانات الجديدة. |
| `performed_by_id` | UUID | FOREIGN KEY (users) | من قام بالتحديث. |
| `performed_at` | TIMESTAMP | DEFAULT NOW() | وقت التحديث. |
| `reason` | TEXT | - | سبب التحديث. |

### جدول `disease_ihr_mapping` (ربط الأمراض بمتطلبات IHR)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `disease_id` | UUID | FOREIGN KEY | المرض. |
| `ihr_event_type` | VARCHAR(50) | NOT NULL | نوع الحدث في IHR (OUTBREAK, SINGLE_CASE, UNUSUAL). |
| `reporting_deadline_hours` | INT | NOT NULL | المهلة الزمنية للإبلاغ (بالساعات). |
| `notification_authority` | VARCHAR(255) | - | الجهة المختصة بالإبلاغ. |
| `last_sync_at` | TIMESTAMP | - | تاريخ آخر مزامنة مع نظام WHO. |

## 2. العلاقات (Relationships)
```mermaid
erDiagram
    diseases ||--o{ disease_case_definitions : "has"
    diseases ||--o{ treatment_protocols : "has"
    diseases ||--o{ disease_updates : "has"
    diseases ||--o| disease_ihr_mapping : "has"

3. الفهارس (Indexes)
الجدول	العمود	نوع الفهرس	الغرض
diseases	icd_11_code	UNIQUE	البحث السريع باستخدام رمز ICD-11.
diseases	is_public_health_emergency	B-Tree	تصفية أمراض PHEIC.
disease_case_definitions	disease_id	B-Tree	استرجاع تعريفات حالة مرض معين.
treatment_protocols	disease_id	B-Tree	عرض البروتوكولات المتاحة لمرض معين.
treatment_protocols	severity_level	B-Tree	تصفية حسب شدة المرض.
