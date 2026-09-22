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