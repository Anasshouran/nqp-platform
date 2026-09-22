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