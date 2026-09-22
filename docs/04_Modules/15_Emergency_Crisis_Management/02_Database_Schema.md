# 02_Database_Schema - هيكل جداول نظام إدارة الطوارئ

## 1. الجداول الأساسية (PostgreSQL)

### جدول `emergency_event_types` (أنواع الأحداث - مرجعية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `name` | VARCHAR(100) | NOT NULL | اسم النوع (مثل: "مرض معدي"، "تسمم غذائي"، "كارثة طبيعية"). |
| `icd_code` | VARCHAR(20) | - | رمز ICD-11 إن وجد. |
| `default_priority` | VARCHAR(20) | DEFAULT 'ROUTINE' | الأولوية الافتراضية (ROUTINE, URGENT, CRITICAL). |
| `is_public_health_emergency` | BOOLEAN | DEFAULT FALSE | هل هو مرض يندرج تحت PHEIC؟ |

### جدول `emergency_events` (الأحداث المُبلّغ عنها)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف الحدث. |
| `event_number` | VARCHAR(50) | UNIQUE | رقم الحدث التلقائي (مثل: E-2024-001). |
| `event_type_id` | UUID | FOREIGN KEY | نوع الحدث. |
| `title` | VARCHAR(255) | NOT NULL | عنوان مختصر للحدث. |
| `description` | TEXT | NOT NULL | وصف تفصيلي للحدث. |
| `source_type` | VARCHAR(30) | NOT NULL | (SCREENING, LAB, CLINIC, PUBLIC, OTHER). |
| `source_id` | UUID | - | معرف المصدر (مثل: screening_id، lab_result_id). |
| `reported_by_id` | UUID | FOREIGN KEY (users) | الشخص المُبلّغ. |
| `reported_at` | TIMESTAMP | DEFAULT NOW() | وقت الإبلاغ. |
| `location_port_id` | UUID | FOREIGN KEY (ports) | المنفذ المرتبط بالحدث (إن وجد). |
| `location_geo` | JSONB | - | إحداثيات الموقع (للأحداث الميدانية). |
| `affected_travelers` | TEXT[] | - | قائمة بمعرفات المسافرين المتأثرين (إن وجدوا). |
| `severity` | VARCHAR(20) | DEFAULT 'MODERATE' | (LOW, MODERATE, HIGH, CRITICAL). |
| `status` | VARCHAR(30) | DEFAULT 'IDENTIFIED' | (IDENTIFIED, VERIFIED, RESPONDING, CONTROLLED, CLOSED). |
| `response_plan_id` | UUID | FOREIGN KEY | خطة الاستجابة المُفعّلة (إن وجدت). |

### جدول `response_plans` (خطط الاستجابة الجاهزة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `name` | VARCHAR(255) | NOT NULL | اسم الخطة (مثل: "خطة جائحة كوفيد-19"). |
| `event_type_id` | UUID | FOREIGN KEY | نوع الحدث المرتبط بالخطة. |
| `description` | TEXT | - | وصف الخطة. |
| `activation_criteria` | JSONB | - | معايير التفعيل (مثل: {"min_cases": 5, "time_window": "24h"}). |
| `steps` | JSONB | NOT NULL | قائمة الإجراءات (خطوات الاستجابة) مع تسلسل زمني. |
| `required_resources` | JSONB | - | الموارد المطلوبة (أدوية، فرق، معدات). |
| `communication_plan` | JSONB | - | خطة الاتصال (جهات الاتصال، وسائل الإعلام). |
| `version` | INT | DEFAULT 1 | رقم الإصدار. |
| `is_active` | BOOLEAN | DEFAULT TRUE | هل الخطة مفعّلة؟ |

### جدول `crisis_management_actions` (سجل إجراءات إدارة الأزمة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `event_id` | UUID | FOREIGN KEY | الحدث المرتبط. |
| `action_type` | VARCHAR(50) | NOT NULL | (ESCALATE, DEPLOY_TEAM, ACTIVATE_PLAN, DECLARE_EMERGENCY, CLOSE). |
| `description` | TEXT | NOT NULL | وصف الإجراء. |
| `performed_by_id` | UUID | FOREIGN KEY (users) | الشخص الذي قام بالإجراء. |
| `performed_at` | TIMESTAMP | DEFAULT NOW() | وقت الإجراء. |

### جدول `crisis_team_members` (فرق الاستجابة للأزمات)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `event_id` | UUID | FOREIGN KEY | الحدث المرتبط. |
| `user_id` | UUID | FOREIGN KEY (users) | عضو الفريق. |
| `role` | VARCHAR(50) | NOT NULL | (INCIDENT_COMMANDER, LOGISTICS, MEDICAL_TEAM, COMMUNICATIONS). |
| `assigned_at` | TIMESTAMP | DEFAULT NOW() | وقت التعيين. |

### جدول `after_action_reports` (تقارير ما بعد الأزمة)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `event_id` | UUID | FOREIGN KEY | الحدث المرتبط. |
| `summary` | TEXT | NOT NULL | ملخص الإجراءات المتخذة. |
| `lessons_learned` | TEXT | - | الدروس المستفادة. |
| `recommendations` | TEXT | - | التوصيات المستقبلية. |
| `file_url` | TEXT | - | رابط ملف التقرير (PDF). |
| `created_by_id` | UUID | FOREIGN KEY (users) | من أنشأ التقرير. |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء. |

## 2. العلاقات (Relationships)
```mermaid
erDiagram
    emergency_event_types ||--o{ emergency_events : "defines"
    emergency_events }o--|| users : "reported_by"
    emergency_events }o--|| ports : "located_at"
    response_plans }o--|| emergency_event_types : "for"
    emergency_events }o--|| response_plans : "uses"
    emergency_events ||--o{ crisis_management_actions : "has"
    emergency_events ||--o{ crisis_team_members : "has"
    emergency_events ||--o| after_action_reports : "has"

3. الفهارس (Indexes)
الجدول	العمود	نوع الفهرس	الغرض
emergency_events	status	          B-Tree	عرض الأحداث النشطة/المفتوحة.
emergency_events	severity	       B-Tree	تصفية الأحداث الحرجة.
emergency_events	location_port_id	B-Tree	إحصائيات حسب المنفذ.
emergency_events	reported_at	         B-Tree	ترتيب زمني.
response_plans	    event_type_id	      B-Tree	البحث عن الخطة المناسبة لنوع الحدث.