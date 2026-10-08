# نظرة عامة على قاعدة البيانات (Database Overview) - NQP

## 1. الهدف من قاعدة البيانات
تمثل قاعدة البيانات **المستودع المركزي (Single Source of Truth)** لجميع بيانات منصة الحجر الصحي القومي (NQP). تم تصميمها لتكون:
- **علائقية (Relational)**: لضمان سلامة البيانات (ACID) في المعاملات الحرجة (مثل: تسجيل الفحوصات، إصدار الشهادات).
- **قابلة للتوسع (Scalable)**: لدعم ملايين السجلات (المسافرين، الفحوصات، العينات) مع الحفاظ على الأداء.
- **آمنة (Secure)**: مع تشفير البيانات الحساسة وسجلات التدقيق غير القابلة للتعديل.

## 2. تقنية قاعدة البيانات
- **النظام**: PostgreSQL (الإصدار 16 أو أحدث).
- **الميزات المستخدمة**:
  - `JSONB` لتخزين البيانات غير المنتظمة (مثل: استمارات الفحص الديناميكية، بيانات الأجهزة القابلة للارتداء).
  - `UUID` كمفاتيح أساسية لتجنب التصادم في البيئات الموزعة.
  - `Triggers` و `Functions` لتحديث الطوابع الزمنية (Updated At) تلقائياً.
  - `Row-Level Security (RLS)` لتطبيق سياسات الصلاحيات على مستوى الصف (للمستخدمين العاديين).

## 3. مبادئ التصميم الرئيسية
- **التطبيع (Normalization)**: حتى المستوى الثالث (3NF) لتجنب التكرار غير الضروري.
- **الفهرسة (Indexing)**: إنشاء فهارس على جميع المفاتيح الخارجية والحقول المستخدمة في عمليات البحث المتكررة (مثل: `passport_number`, `case_id`).
- **التقسيم (Partitioning)**: سيتم تقسيم جداول السجلات الكبيرة (مثل: `daily_health_logs`, `audit_logs`) حسب التاريخ (شهرياً أو سنوياً) لتحسين الأداء.

## 4. خريطة الجداول الرئيسية (Categories)
| الفئة (Category) | الجداول الرئيسية | الغرض |
| :--- | :--- | :--- |
| **الحوكمة والأمان** | `users`, `roles`, `permissions`, `audit_logs` | إدارة المستخدمين والصلاحيات وتسجيل النشاطات. |
| **البيانات الأساسية** | `countries`, `ports`, `airports`, `diseases`, `medications` | البيانات المرجعية (Master Data). |
| **المسافرون والرحلات** | `travelers`, `travel_documents`, `carriers`, `flights`, `passenger_manifests` | إدارة بيانات المسافرين والرحلات. |
| **الفحص والتقييم** | `health_screenings`, `risk_assessments`, `symptom_logs` | عمليات الفحص عند الوصول وتقييم المخاطر. |
| **الرعاية الصحية** | `clinic_visits`, `emr_records`, `prescriptions`, `lab_samples`, `lab_results` | العيادات والمختبرات. |
| **المتابعة المنزلية** | `follow_up_patients`, `daily_health_logs`, `medication_adherence`, `recovery_certificates` | متابعة المرضى بعد الخروج. |
| **الحجر الغذائي** | `food_shipments`, `food_inspections`, `food_samples`, `food_release_certificates` | إدارة الواردات الغذائية. |
| **الطوارئ والترصد** | `emergency_alerts`, `eoc_actions`, `surveillance_reports` | غرفة العمليات والإنذار المبكر. |
| **المعابر البرية** | `borders_health_bordercrossing`, `borders_health_travelerhealthrecord`, `borders_health_quarantinecase` | تشغيل المعابر البرية: ملفات المعابر، حركة المسافرين، المركبات، الشحنات، الحجر والعزل، والطوارئ. |
| **التكامل الخارجي** | `external_integration_logs`, `who_reports` | تتبع عمليات التكامل مع الجهات الخارجية. |

## 5. الاتصال من Django
```python
# nqp_backend/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',  # في الإنتاج
        }
    }
}

6. التخزين المؤقت (Caching)

يتم استخدام Redis كطبقة تخزين مؤقت لتسريع الاستعلامات المتكررة:

    تصنيفات الدول (مدة الصلاحية: 1 ساعة).

    تعريفات الأمراض (مدة الصلاحية: 6 ساعات).

    نتائج تقييم المخاطر (مدة الصلاحية: 5 دقائق). 
### 5. الجداول حسب النظام (مُحدّث)

| النظام | الجداول الرئيسية |
| :--- | :--- |
| **صحة المطارات (17)** | `airport_terminals`, `airport_screenings`, `airport_transit_passengers`, `aircraft_inspections` |
| **سلامة الغذاء (18)** | `food_shipments`, `food_inspections`, `food_samples`, `food_release_certificates` |
| **صحة الموانئ (19)** | `port_vessels`, `port_screenings`, `port_crew_health`, `vessel_inspections` |
| **صحة المعابر البرية (21)** | `borders_health_bordercrossing`, `borders_health_borderfacility`, `borders_health_bordershift`, `borders_health_borderstaff`, `borders_health_travelerhealthrecord`, `borders_health_healthdeclaration`, `borders_health_borderscreening`, `borders_health_vehicle`, `borders_health_vehicleinspection`, `borders_health_cargoinspection`, `borders_health_bordersample`, `borders_health_quarantinecase`, `borders_health_isolationcase`, `borders_health_contacttracingcase`, `borders_health_contact`, `borders_health_borderhealthincident`, `borders_health_borderemergency`, `borders_health_bordercertificate`, `borders_health_borderdecision`, `borders_health_bordernotification`, `borders_health_borderdailystatistics` |

## 6. نظام صحة المعابر البرية (Land Border Health System)

### 6.1. البادئة والمفاتيح الأساسية
- التطبيق: `apps.borders_health` — بادئة جميع الجداول: `borders_health_`.
- **21 جدولاً** يرث كل منها `core.models.BaseModel`: المفتاح الأساسي `id` من نوع `UUID`، مع `created_at` و `updated_at` من نوع `TIMESTAMPTZ`.
- الترحيلات المطبَّقة: `borders_health.0001` … `borders_health.0007`.

### 6.2. نموذج الامتداد التشغيلي (لا تكرار للمنافذ)
`borders_health_bordercrossing` **ليس** جدول منافذ ثانياً، بل امتداد `OneToOneField` إلى `masterdata_entrypoint`:

| العمود | المرجع | القيد |
| :--- | :--- | :--- |
| `entry_point_id` | `masterdata_entrypoint(id)` | `UNIQUE` — منفذ بري واحد ⇒ ملف `BorderCrossing` تشغيلي واحد على الأكثر |

لذلك يبقى النطاق والصلاحيات يعملان عبر `ScopeType.PORT` و `resolve_user_port_ids` دون ازدواج، ولهذا يُقاس الوصول دائماً على `entry_point` لا على معرّف المعبر.

### 6.3. عمود النطاق (`crossing_id`) ومعيار التحكم في الوصول
كل سجل تشغيلي يحمل `crossing_id` (عمود `FK NOT NULL` إلى `borders_health_bordercrossing`). عند الطلب تُقارن قيم `crossing__entry_point` بمعرّفات نطاق المستخدم من نوع `ScopeType.PORT`:

| مسار النطاق (`scope_field`) | الجداول التي يستخدمه |
| :--- | :--- |
| `entry_point` | `borders_health_bordercrossing` |
| `crossing__entry_point` | بقية الجداول التي تحمل `crossing_id` مباشرة |
| `vehicle__crossing__entry_point` | `borders_health_vehicleinspection` |
| `tracing_case__crossing__entry_point` | `borders_health_contact` |

المسارات متعددة المستويات تُحلّ عبر `MultiHopScopeFilter`، والفشل آمن: أي مسار غير قابل للحل أو نطاق فارغ ⇒ **منع** (لا تسريب صفوف).

هذا التصميم هو سبب وجود **28 فهرساً مركّباً** يبدأ أغلبها بـ `(crossing_id, ...)` — أُضيفت جميعها في الترحيل `borders_health.0007` لتغطية استعلامات القائمة والتصفية والإحصاءات اليومية. انظر `Indexes.md` قسم 6.

### 6.4. مراجع الوحدات الأخرى (Cross-module)
يستهلك النظام كيانات المنصة القائمة بدل تكرارها:

| الجدول المرجعي | الوحدة | الاستخدام في النظام |
| :--- | :--- | :--- |
| `masterdata_entrypoint` | `masterdata` | نقطة الدخول (نطاق الوصول) |
| `travelers_traveler` | `travelers` | هوية المسافر |
| `accounts_user` | `accounts` | المُقيِّم / المفتش / المبلِّغ / المُقرِّر |
| `laboratory_disease` | `laboratory` | المرض المرتبط بالحجر والطوارئ |
| `laboratory_labsample` | `laboratory` | العيّنة المختبرية المشتركة |
| `clinic_clinic` | `clinic` | العيادة المرجعية للحجر |
| `clinic_isolationrecord` | `clinic` | سجل العزل بالعيادة |
| `food_quarantine_foodshipment` | `food_quarantine` | شحنة سلامة الغذاء |
| `emergency_eoc_healthcase` | `emergency_eoc` | حالة الترصد المشتركة |
| `emergency_eoc_contacttrace` | `emergency_eoc` | سجل التتبع المشترك |
| `emergency_eoc_emergencyevent` | `emergency_eoc` | حدث الطوارئ المشترك |
| `screening_healthscreening` | `screening` | الفحص المشترك |
| `vaccination_vaccinationcertificate` | `vaccination` | شهادة التطعيم |


