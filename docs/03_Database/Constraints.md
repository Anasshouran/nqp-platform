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