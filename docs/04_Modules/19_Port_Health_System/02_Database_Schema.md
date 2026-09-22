# 02_Database_Schema - مخطط قاعدة بيانات صحة الموانئ

## الجداول الأساسية

### `port_vessels`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `vessel_name` | VARCHAR(200) | اسم السفينة |
| `vessel_registration` | VARCHAR(50) | رقم التسجيل |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `origin_port` | VARCHAR(100) | ميناء المغادرة |
| `arrival_date` | DATE | تاريخ الوصول |
| `status` | VARCHAR(20) | (ARRIVED, DEPARTED, QUARANTINED) |

### `port_screenings`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `vessel_id` | UUID | FOREIGN KEY (port_vessels) |
| `body_temperature` | FLOAT | درجة الحرارة |
| `symptoms` | JSONB | الأعراض |
| `risk_level` | VARCHAR(10) | (GREEN, YELLOW, RED) |
| `status` | VARCHAR(20) | (PENDING, CLEARED, QUARANTINED) |

## ⚙️ حالة التنفيذ مقابل الكود

| الجدول/المجموعة | الحالة | ملاحظة |
| :--- | :--- | :--- |
| جداول `apps/port_health/models.py` | ✅ مطابقة | خريطة مرجعية للنماذج الفعلية 1:1 (17 نموذجًا) |
| ميجرشنز | ✅ متسقة | ضمن السويت الأخضر 240 اختبارًا |
