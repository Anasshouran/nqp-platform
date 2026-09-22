#!/bin/bash

# ============================================================
# update_airport_health_system.sh - تحديث نظام صحة المطارات
# يقوم بتحديث جميع الملفات في المجلدات التالية:
#   04_Modules/17_Airport_Health_System/
#   05_API/Airport_API.md
#   06_UI_UX/17_Airport_Health_System/
#   07_Workflows/
#   03_Database/
#   PROJECT_TREE.md
# 
# الاستخدام:
#   chmod +x update_airport_health_system.sh
#   ./update_airport_health_system.sh
# ============================================================

set -e  # إيقاف التنفيذ عند حدوث أي خطأ

# الألوان لجعل المخرجات واضحة
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}✈️ تحديث نظام صحة المطارات (Airport Health System)${NC}"
echo -e "${BLUE}============================================================${NC}"

# التأكد من أننا في المجلد الصحيح
if [ ! -d "docs" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ خطأ: يرجى تشغيل السكريبت من المجلد الجذر للمشروع (nqp-platform).${NC}"
    exit 1
fi

echo -e "${GREEN}✅ تم التحقق من موقع المشروع.${NC}"

# ============================================================
# 1. تحديث 04_Modules/17_Airport_Health_System/
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📁 1. تحديث 04_Modules/17_Airport_Health_System/${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

# إنشاء المجلد إذا لم يكن موجوداً
mkdir -p docs/04_Modules/17_Airport_Health_System
cd docs/04_Modules/17_Airport_Health_System || exit 1

# ============================================================
# 1.1 01_System_Overview.md
# ============================================================
echo -e "\n${YELLOW}📄 1.1 إنشاء 01_System_Overview.md${NC}"
cat << 'EOF' > "01_System_Overview.md"
# 17_Airport_Health_System - نظام صحة المطارات (Airport Health System)

## 1. الهدف الاستراتيجي
نظام صحة المطارات هو نظام متخصص لإدارة جميع إجراءات الصحة العامة والحجر الصحي في المطارات الدولية، ويعمل وفقًا للوائح الصحية الوطنية واشتراطات **اللوائح الصحية الدولية (IHR 2005)**، ويعد أحد الأنظمة الأساسية في **منصة الحجر الصحي القومي**.

## 2. الأهداف الرئيسية
- مراقبة الحالة الصحية للمسافرين القادمين والمغادرين.
- منع دخول أو انتشار الأمراض المعدية عبر المطارات.
- إدارة إجراءات الحجر الصحي للطائرات والمسافرين.
- مراقبة الطائرات والطاقم والتحقق من صحتهم.
- إصدار التصاريح والشهادات الصحية اللازمة.
- التكامل مع الجهات الحكومية العاملة في المطار.
- توفير نظام متكامل للاستجابة للطوارئ الصحية في المطارات.

## 3. الممثلون (Actors)
- **طبيب الحجر الصحي**: يقوم بالفحص الطبي وتقييم الحالات.
- **مفتش الحجر الصحي**: يقوم بالتفتيش على الطائرات والمرافق.
- **مفتش صحة البيئة**: يتولى تفتيش الأغذية والمياه والمرافق.
- **موظف تسجيل المسافرين**: يسجل بيانات المسافرين والإقرارات الصحية.
- **مسؤول المختبر**: يدير العينات والفحوصات المخبرية.
- **مدير محطة الحجر الصحي**: يدير عمليات الحجر الصحي في المطار.
- **مدير المطار**: يتابع العمليات ويتخذ القرارات التشغيلية (بصلاحيات محددة).
- **مسؤولو الجوازات والجمارك**: للاستعلام وفق الصلاحيات.

## 4. المكونات الرئيسية (Components)

| المكون | الوصف | الأولوية |
| :--- | :--- | :--- |
| **إدارة الرحلات (Flight Management)** | متابعة الرحلات القادمة والمغادرة (الرقم، الشركة، الدولة، الوقت، البوابة). | عالية |
| **فحص المسافرين (Passenger Screening)** | تسجيل البيانات، الإقرار الصحي، قياس الحرارة، تقييم الخطورة، التحقق من المستندات. | عالية |
| **إدارة صحة الطاقم (Crew Management)** | تتبع أفراد الطاقم (الشهادات الصحية، التطعيمات، الحالات المرضية، سجل الرحلات). | عالية |
| **تفتيش الطائرات (Aircraft Inspection)** | نظافة الطائرة، مياه الشرب، دورات المياه، النفايات الطبية، مكافحة الحشرات والقوارض، سلامة الأغذية. | عالية |
| **التحقق من التطعيمات (Vaccination Verification)** | إدارة شهادات التطعيم، صلاحيتها، التطعيمات المطلوبة حسب الوجهة، التحقق عبر QR Code. | عالية |
| **الإقرار الصحي (Health Declaration)** | تعبئة البيانات الشخصية، تاريخ السفر، الحالة الصحية، الأعراض، أماكن الإقامة، وسائل التواصل. | عالية |
| **العزل والحجر الصحي (Isolation & Quarantine)** | إدارة العزل المؤقت، التحويل للمستشفى، متابعة الحالة، إنهاء إجراءات الحجر الصحي. | عالية |
| **الطوارئ الصحية (Public Health Emergency)** | إدارة البلاغات، الاستجابة السريعة، إدارة الأزمات، متابعة الحالات الجماعية. | عالية |
| **الترصد الوبائي (Disease Surveillance)** | ربط الحالات مع أنظمة الترصد والمختبرات وفرق الاستجابة والإدارات الصحية. | عالية |
| **تتبع المخالطين (Contact Tracing)** | تحديد الرحلة، استخراج قائمة الركاب، تحديد المخالطين، إرسال التنبيهات، متابعة الحالات. | عالية |
| **إدارة الشهادات (Certificate Management)** | شهادات الإفراج الصحي للمسافرين، شهادات التطعيم، تقارير الفحص، شهادات الإفراج للطائرة. | متوسطة |
| **إدارة التفتيش (Inspection Management)** | تفتيش الطائرات، صالات الوصول والمغادرة، المطاعم، مخازن الأغذية، مصادر المياه. | متوسطة |
| **التقارير ولوحات المعلومات (Reporting & Dashboard)** | عرض عدد الرحلات، المسافرين، الحالات المشتبه بها، حالات العزل، مؤشرات الأداء، الإحصاءات. | متوسطة |

## 5. التكامل مع الأنظمة الأخرى

```mermaid
flowchart TD
    A[نظام صحة المطارات] --> B[نظام صحة المسافرين]
    A --> C[نظام الترصد الوبائي]
    A --> D[نظام المختبرات]
    A --> E[نظام إدارة الشهادات]
    A --> F[نظام الإشعارات]
    A --> G[نظام الفوترة (للرسوم)]
```

### 5.1. الجهات الخارجية المتكاملة
- **وزارة الصحة الاتحادية السودانية**: تبادل التقارير والبيانات الصحية.
- **الإدارة العامة للحجر الصحي القومي**: الإشراف والتوجيه.
- **سلطة الطيران المدني**: تبادل بيانات الرحلات والطائرات.
- **إدارة المطار**: التنسيق التشغيلي.
- **شركات الطيران**: تبادل بيانات الركاب والطواقم.
- **هيئة الجمارك السودانية**: التنسيق في إجراءات الإفراج.
- **وزارة الداخلية (الجوازات والهجرة)**: التحقق من هويات المسافرين.

## 6. موقع النظام في المنصة

```text
منصة الحجر الصحي القومي
│
├── نظام صحة المسافرين (Traveler Health System)
├── نظام صحة المطارات (Airport Health System) ← هذا النظام
├── نظام صحة الموانئ (Port Health System)
├── نظام صحة المنافذ البرية (Land Border Health System)
├── نظام الترصد الوبائي (Disease Surveillance System)
├── نظام المعلومات المخبرية (Laboratory Information System)
├── نظام إدارة الشهادات (Certificate Management System)
├── نظام الإشعارات (Notification System)
└── نظام التقارير والذكاء الأعمال (Reporting & BI System)
```

## 7. نطاق النظام
يركز نظام صحة المطارات على جميع الأنشطة الصحية داخل المطار، بدءًا من وصول الرحلة والمسافرين، مرورًا بالتفتيش الصحي والعزل والترصد الوبائي، وانتهاءً بالتكامل مع بقية أنظمة منصة الحجر الصحي القومي لضمان حماية الصحة العامة ومنع انتقال الأمراض عبر النقل الجوي.
EOF
echo -e "${GREEN}   ✅ 01_System_Overview.md${NC}"

# ============================================================
# 1.2 02_Database_Schema.md
# ============================================================
echo -e "\n${YELLOW}📄 1.2 إنشاء 02_Database_Schema.md${NC}"
cat << 'EOF' > "02_Database_Schema.md"
# 02_Database_Schema - مخطط قاعدة بيانات نظام صحة المطارات

## 1. الجداول الأساسية (Core Tables)

### `airport_terminals`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `terminal_code` | VARCHAR(20) | رمز الصالة (T1, T2) |
| `name_ar` | VARCHAR(100) | اسم الصالة (عربي) |
| `name_en` | VARCHAR(100) | اسم الصالة (إنجليزي) |
| `capacity` | INT | السعة القصوى |
| `location_geo` | JSONB | الإحداثيات |
| `is_active` | BOOLEAN | حالة الصالة |

### `airport_screening_points`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `terminal_id` | UUID | FOREIGN KEY (airport_terminals) |
| `point_code` | VARCHAR(20) | رمز نقطة الفحص |
| `point_type` | VARCHAR(20) | (ARRIVAL, DEPARTURE, TRANSIT, CREW) |
| `location_geo` | JSONB | الإحداثيات |
| `is_active` | BOOLEAN | حالة نقطة الفحص |

### `airport_screenings`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `screening_point_id` | UUID | FOREIGN KEY (airport_screening_points) |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `screening_type` | VARCHAR(20) | (ARRIVAL, DEPARTURE, TRANSIT, CREW) |
| `body_temperature` | FLOAT | درجة الحرارة |
| `oxygen_saturation` | INT | تشبع الأكسجين |
| `symptoms` | JSONB | الأعراض الظاهرة |
| `risk_level` | VARCHAR(10) | (GREEN, YELLOW, RED) |
| `status` | VARCHAR(20) | (PENDING, CLEARED, QUARANTINED, REFERRED) |
| `screened_by` | UUID | FOREIGN KEY (users) |
| `screened_at` | TIMESTAMPTZ | وقت الفحص |

### `airport_transit_passengers`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `arrival_flight_id` | UUID | FOREIGN KEY (flights) |
| `departure_flight_id` | UUID | FOREIGN KEY (flights) |
| `transit_duration` | INTERVAL | مدة الترانزيت |
| `screening_status` | VARCHAR(20) | (PENDING, CLEARED, QUARANTINED) |
| `quarantine_location` | VARCHAR(100) | موقع العزل المؤقت |

### `airport_emergency_incidents`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `terminal_id` | UUID | FOREIGN KEY (airport_terminals) |
| `incident_type` | VARCHAR(30) | (SUSPECTED_CASE, OUTBREAK, BIOHAZARD) |
| `description` | TEXT | وصف الحادث |
| `affected_area` | JSONB | المنطقة المتأثرة |
| `status` | VARCHAR(20) | (ACTIVE, CONTAINED, RESOLVED) |
| `activated_by` | UUID | FOREIGN KEY (users) |
| `activated_at` | TIMESTAMPTZ | وقت التفعيل |
| `resolved_at` | TIMESTAMPTZ | وقت الحل |

## 2. الجداول الإضافية

### `aircraft_inspections`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `aircraft_registration` | VARCHAR(20) | رقم تسجيل الطائرة |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `inspection_date` | DATE | تاريخ التفتيش |
| `inspector_id` | UUID | FOREIGN KEY (users) |
| `cleanliness_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `water_quality_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `toilets_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `medical_waste_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `pest_control_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `rodent_control_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `food_safety_status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |
| `findings` | TEXT | الملاحظات |
| `overall_status` | VARCHAR(20) | (PASSED, FAILED, CONDITIONAL) |
| `certificate_issued` | BOOLEAN | هل تم إصدار شهادة؟ |

### `crew_health_records`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `crew_id` | UUID | FOREIGN KEY (users) |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `health_status` | VARCHAR(20) | (FIT, UNFIT, UNDER_OBSERVATION) |
| `temperature` | FLOAT | درجة الحرارة |
| `symptoms` | JSONB | الأعراض |
| `medical_clearance_date` | DATE | تاريخ التصريح الطبي |
| `next_clearance_date` | DATE | تاريخ التصريح القادم |
| `notes` | TEXT | ملاحظات |

### `airport_health_declarations`
| العمود (Column) | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `declaration_date` | TIMESTAMPTZ | تاريخ الإقرار |
| `personal_data` | JSONB | البيانات الشخصية |
| `travel_history` | JSONB | تاريخ السفر |
| `health_status` | JSONB | الحالة الصحية |
| `symptoms` | JSONB | الأعراض |
| `accommodation` | JSONB | أماكن الإقامة |
| `contact_info` | JSONB | معلومات التواصل |

## 3. العلاقات (Relationships)

```mermaid
erDiagram
    ports ||--o{ airport_terminals : has
    airport_terminals ||--o{ airport_screening_points : has
    airport_terminals ||--o{ airport_emergency_incidents : contains
    airport_screening_points ||--o{ airport_screenings : performs
    flights ||--o{ airport_screenings : linked_to
    travelers ||--o{ airport_screenings : undergoes
    flights ||--o{ airport_transit_passengers : arrival
    flights ||--o{ airport_transit_passengers : departure
    travelers ||--o{ airport_transit_passengers : transits
    flights ||--o{ aircraft_inspections : inspected
    users ||--o{ aircraft_inspections : performs
    users ||--o{ crew_health_records : crew
    travelers ||--o{ airport_health_declarations : declares
```
EOF
echo -e "${GREEN}   ✅ 02_Database_Schema.md${NC}"

# ============================================================
# 1.3 03_Airport_Modules.md
# ============================================================
echo -e "\n${YELLOW}📄 1.3 إنشاء 03_Airport_Modules.md${NC}"
cat << 'EOF' > "03_Airport_Modules.md"
# 03_Airport_Modules - مكونات نظام صحة المطارات

## 1. Flight Management (إدارة الرحلات)
يتابع:
- الرحلات القادمة.
- الرحلات المغادرة.
- رقم الرحلة.
- شركة الطيران.
- دولة القدوم.
- وقت الوصول والمغادرة.
- بوابة الوصول.

## 2. Passenger Health Screening (فحص المسافرين)
يشمل:
- تسجيل بيانات المسافر.
- الإقرار الصحي.
- قياس درجة الحرارة (إذا كان مطلوبًا).
- تقييم عوامل الخطورة.
- التحقق من المستندات الصحية.

## 3. Crew Health Management (إدارة صحة الطاقم)
يتابع:
- أفراد طاقم الطائرة.
- الشهادات الصحية.
- التطعيمات.
- الحالات المرضية.
- سجل الرحلات.

## 4. Aircraft Health Inspection (تفتيش الطائرات)
يشمل:
- نظافة الطائرة.
- مياه الشرب.
- دورات المياه.
- النفايات الطبية.
- مكافحة الحشرات.
- مكافحة القوارض.
- سلامة الأغذية المقدمة على متن الطائرة.

## 5. Vaccination Verification (التحقق من التطعيمات)
يدير:
- شهادات التطعيم.
- صلاحية الشهادات.
- التطعيمات المطلوبة حسب وجهة القدوم أو المغادرة.
- التحقق عبر QR Code (عند توفره).

## 6. Health Declaration Management (الإقرار الصحي)
يمكن للمسافر تعبئة:
- البيانات الشخصية.
- تاريخ السفر.
- الحالة الصحية.
- الأعراض الحالية.
- أماكن الإقامة.
- وسائل التواصل.

## 7. Isolation & Quarantine Management (العزل والحجر الصحي)

```text
Passenger Screening
        │
        ▼
Suspected Case
        │
        ▼
Medical Assessment
        │
 ┌──────┴──────┐
 ▼             ▼
Isolation   Entry Clearance
```

يدير النظام:
- العزل المؤقت.
- التحويل للمستشفى.
- متابعة الحالة.
- إنهاء إجراءات الحجر الصحي.

## 8. Public Health Emergency (الطوارئ الصحية)
يشمل:
- إدارة البلاغات.
- الاستجابة السريعة.
- إدارة الأزمات.
- متابعة الحالات الجماعية.

## 9. Disease Surveillance (الترصد الوبائي)
يربط الحالات مع:
- **Disease Surveillance System**
- المختبرات.
- فرق الاستجابة.
- الإدارات الصحية بالولايات.

## 10. Contact Tracing (تتبع المخالطين)
عند اكتشاف حالة:
- تحديد الرحلة.
- استخراج قائمة الركاب.
- تحديد المخالطين.
- إرسال التنبيهات.
- متابعة الحالات.

## 11. Certificate Management (إدارة الشهادات)
يشمل:
- شهادة الإفراج الصحي للمسافر (عند الحاجة).
- شهادات التطعيم.
- تقارير الفحص الصحي.
- شهادات الإفراج للطائرة بعد استكمال الإجراءات المطلوبة.

## 12. Inspection Management (إدارة التفتيش)
يدير عمليات التفتيش على:
- الطائرات.
- صالات الوصول والمغادرة.
- المطاعم والكافتيريات داخل المطار.
- مخازن الأغذية.
- مصادر المياه.

## 13. Reporting & Dashboard (التقارير ولوحات المعلومات)
يعرض:
- عدد الرحلات.
- عدد المسافرين.
- عدد الحالات المشتبه بها.
- عدد حالات العزل.
- مؤشرات الأداء.
- الإحصاءات اليومية والشهرية.

## 14. التكامل مع الأنظمة الأخرى

```text
Airport Health System
          │
──────────────────────────────────────────
│           │            │
▼           ▼            ▼
Traveler   Disease     Laboratory
Health     Surveillance Information
System     System       System
│
▼
Notification Service
```

ويتكامل أيضاً مع:
- **Traveler Health System**.
- **Disease Surveillance System**.
- **Laboratory Information System**.
- **Certificate Management System**.
- **Finance & Revenue System** (للرسوم إن وجدت).
- **Notification Service**.

## 15. المستخدمون

- طبيب الحجر الصحي.
- مفتش الحجر الصحي.
- مفتش صحة البيئة.
- موظف تسجيل المسافرين.
- مسؤول المختبر.
- مدير محطة الحجر الصحي بالمطار.
- مدير المطار (بصلاحيات محددة).
- مسؤولو الجوازات والجمارك (للاستعلام وفق الصلاحيات).
EOF
echo -e "${GREEN}   ✅ 03_Airport_Modules.md${NC}"

# العودة إلى المجلد الجذر
cd ../../../..

# ============================================================
# 2. تحديث 05_API/Airport_API.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}🌐 2. تحديث 05_API/Airport_API.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/05_API
cd docs/05_API || exit 1

cat << 'EOF' > "Airport_API.md"
# Airport_API - واجهات نظام صحة المطارات

## 1. نظرة عامة
تدير هذه الواجهات جميع عمليات نظام صحة المطارات، بما في ذلك إدارة الرحلات، فحص المسافرين، إدارة الطاقم، تفتيش الطائرات، العزل والحجر الصحي، الطوارئ الصحية، الترصد الوبائي، وتتبع المخالطين.

## 2. المسارات (Endpoints)

### 2.1. إدارة الرحلات (Flight Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/flights/` | قائمة الرحلات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/{id}/` | تفاصيل رحلة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/arriving/` | الرحلات القادمة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/departing/` | الرحلات المغادرة | AIRPORT_OPERATOR |

### 2.2. فحص المسافرين (Passenger Screening)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/screenings/` | تسجيل فحص جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/{id}/` | تفاصيل فحص | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/flight/{flight_id}/` | فحوصات رحلة | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/screenings/{id}/status/` | تحديث حالة الفحص | AIRPORT_HEALTH_OFFICER |

### 2.3. إدارة صحة الطاقم (Crew Health)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/crew/` | قائمة الطاقم | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/crew/` | تسجيل طاقم جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/crew/{id}/` | تفاصيل طاقم | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/crew/{id}/health/` | تحديث الحالة الصحية | AIRPORT_HEALTH_OFFICER |

### 2.4. تفتيش الطائرات (Aircraft Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/inspections/` | تسجيل تفتيش جديد | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/` | قائمة عمليات التفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/{id}/` | تفاصيل تفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/aircraft/{registration}/` | تفتيشات طائرة | HEALTH_INSPECTOR |

### 2.5. التحقق من التطعيمات (Vaccination Verification)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/vaccinations/verify/{traveler_id}/` | التحقق من تطعيمات مسافر | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/vaccinations/required/{country}/` | التطعيمات المطلوبة لدولة | AIRPORT_HEALTH_OFFICER |

### 2.6. الإقرار الصحي (Health Declaration)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/declarations/` | تسجيل إقرار صحي | TRAVELER |
| `GET` | `/api/v1/airport/declarations/{id}/` | تفاصيل إقرار | TRAVELER (نفسه) |
| `GET` | `/api/v1/airport/declarations/flight/{flight_id}/` | إقرارات رحلة | AIRPORT_HEALTH_OFFICER |

### 2.7. العزل والحجر الصحي (Isolation & Quarantine)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/quarantine/` | بدء عزل جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/active/` | حالات العزل النشطة | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/{id}/` | تفاصيل عزل | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/quarantine/{id}/status/` | تحديث حالة العزل | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/quarantine/{id}/end/` | إنهاء العزل | AIRPORT_HEALTH_OFFICER |

### 2.8. الطوارئ الصحية (Public Health Emergency)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/emergency/` | تسجيل بلاغ طارئ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `GET` | `/api/v1/airport/emergency/active/` | البلاغات النشطة | AIRPORT_OPERATOR, EOC_OPERATOR |
| `PATCH` | `/api/v1/airport/emergency/{id}/status/` | تحديث حالة البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `POST` | `/api/v1/airport/emergency/{id}/resolve/` | حل البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |

### 2.9. تتبع المخالطين (Contact Tracing)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/tracing/{case_id}/` | تتبع مخالطي حالة | EOC_OPERATOR |
| `GET` | `/api/v1/airport/tracing/flight/{flight_id}/` | مخالطي رحلة | EOC_OPERATOR |
| `POST` | `/api/v1/airport/tracing/notify/` | إرسال تنبيهات للمخالطين | EOC_OPERATOR |

### 2.10. إدارة الشهادات (Certificate Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/certificates/traveler/{traveler_id}/` | شهادات مسافر | TRAVELER (نفسه) |
| `POST` | `/api/v1/airport/certificates/aircraft/` | إصدار شهادة إفراج للطائرة | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/certificates/verify/{hash}/` | التحقق من شهادة | PUBLIC |

### 2.11. التقارير ولوحات المعلومات (Reporting & Dashboard)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/dashboard/stats/` | إحصائيات المطار | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/flights/` | إحصائيات الرحلات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/cases/` | إحصائيات الحالات | AIRPORT_OPERATOR |

## 3. نماذج الطلبات والاستجابات

### 3.1. تسجيل فحص مسافر (Request)
```json
{
  "traveler_id": "uuid",
  "flight_id": "uuid",
  "body_temperature": 38.5,
  "symptoms": ["cough", "fever"],
  "risk_factors": {
    "travel_history": ["CountryX"],
    "contact_with_cases": false,
    "chronic_diseases": ["diabetes"]
  },
  "risk_level": "MEDIUM",
  "notes": "المسافر يبدو عليه التعب"
}
```

### 3.2. استجابة العزل (Response)
```json
{
  "status": "success",
  "data": {
    "quarantine_id": "uuid",
    "traveler_name": "محمد أحمد",
    "start_date": "2024-07-28",
    "expected_end_date": "2024-08-04",
    "location": "غرفة العزل رقم 3",
    "status": "ACTIVE"
  }
}
```

### 3.3. تسجيل تفتيش طائرة (Request)
```json
{
  "aircraft_registration": "SUD-123",
  "flight_id": "uuid",
  "inspection_date": "2024-07-28",
  "cleanliness_status": "COMPLIANT",
  "water_quality_status": "COMPLIANT",
  "toilets_status": "COMPLIANT",
  "medical_waste_status": "COMPLIANT",
  "pest_control_status": "COMPLIANT",
  "rodent_control_status": "COMPLIANT",
  "food_safety_status": "COMPLIANT",
  "findings": "جميع الإجراءات مطابقة للمعايير",
  "overall_status": "PASSED"
}
```

## 4. رموز الاستجابة (Status Codes)
| الكود | الوصف |
| :--- | :--- |
| `200 OK` | نجاح العملية |
| `201 Created` | تم إنشاء المورد بنجاح |
| `400 Bad Request` | طلب غير صحيح |
| `401 Unauthorized` | غير مصرح |
| `403 Forbidden` | ممنوع (صلاحية غير كافية) |
| `404 Not Found` | المورد غير موجود |
| `409 Conflict` | تعارض (مورد مكرر) |
EOF
echo -e "${GREEN}   ✅ Airport_API.md${NC}"

cd ../..

# ============================================================
# 3. تحديث 06_UI_UX/17_Airport_Health_System/
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}🎨 3. تحديث 06_UI_UX/17_Airport_Health_System/${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/06_UI_UX/17_Airport_Health_System
cd docs/06_UI_UX/17_Airport_Health_System || exit 1

# ============================================================
# 3.1 Dashboard.md
# ============================================================
cat << 'EOF' > "Dashboard.md"
# لوحة تحكم المطار (Airport Dashboard)

## 1. الهدف
تزويد مدير المطار ومدير محطة الحجر الصحي بنظرة شاملة عن حالة المطار الصحية، بما في ذلك الرحلات، المسافرين، الحالات المشتبه بها، وإشغال العزل.

## 2. مكونات الصفحة

### 2.1. بطاقات الملخص العلوي (KPI Cards)
| البطاقة | القيمة | المصدر |
| :--- | :--- | :--- |
| **الرحلات القادمة اليوم** | عدد الرحلات | نظام إدارة الرحلات |
| **المسافرون القادمون** | عدد المسافرين | نظام فحص المسافرين |
| **حالات مشتبه بها** | عدد الحالات | نظام فحص المسافرين |
| **حالات العزل النشطة** | عدد الحالات | نظام العزل والحجر الصحي |

### 2.2. خريطة المطار التفاعلية
- **خريطة المطار** مع نقاط تمثل:
  - 🟢 **أخضر**: نقاط الفحص النشطة والآمنة.
  - 🟡 **أصفر**: نقاط الفحص تحت المراقبة.
  - 🔴 **أحمر**: نقاط الفحص في حالة طوارئ.
- عند النقر على نقطة: تظهر إحصائيات نقطة الفحص.

### 2.3. قائمة التنبيهات (Alerts)
- عرض آخر التنبيهات (حالات مشتبه بها، أعطال في نقاط الفحص، طوارئ).
- **زر**: "عرض الكل".

### 2.4. جدول الرحلات القادمة (Upcoming Flights)
- الأعمدة: (رقم الرحلة، شركة الطيران، دولة القدوم، وقت الوصول، عدد الركاب، حالة الفحص، الإجراءات).
- **زر**: "عرض التفاصيل".

## 3. حالات واجهة المستخدم (UI States)
- **حالة التحميل**: عرض (Skeleton Loader).
- **حالة عدم وجود تنبيهات**: "🎉 لا توجد تنبيهات حالياً".
- **حالة الطوارئ**: تغيير لون الخلفية إلى أحمر مع رسالة تحذيرية.
EOF
echo -e "${GREEN}   ✅ Dashboard.md${NC}"

# ============================================================
# 3.2 Screening.md
# ============================================================
cat << 'EOF' > "Screening.md"
# شاشة الفحص الصحي (Passenger Health Screening)

## 1. الهدف
تمكين طبيب الحجر الصحي أو موظف تسجيل المسافرين من إجراء الفحص الصحي للمسافرين القادمين.

## 2. مكونات الشاشة

### 2.1. شريط البحث (Search Bar)
- **حقل بحث**: (رقم الجواز، QR Code، رقم الرحلة).
- **زر**: "🔍 بحث".

### 2.2. بطاقة بيانات المسافر (Traveler Info)
- **الاسم الكامل**.
- **رقم الجواز**.
- **الرحلة** (رقم الرحلة، شركة الطيران، دولة القدوم).
- **نوع المسافر**: (قادم، مغادر، عابر، طاقم).
- **حالة الإقرار الصحي**: (مسجل، غير مسجل).

### 2.3. نموذج الفحص (Screening Form)
- **درجة الحرارة** (حقل رقمي - اختياري حسب الإجراءات).
- **الأعراض** (قائمة اختيارات متعددة): (سعال، حرارة، ضيق تنفس، صداع، إلخ).
- **عوامل الخطورة**: (تاريخ سفر، مخالطة حالات، أمراض مزمنة).
- **تقييم المخاطر**: (منخفض، متوسط، مرتفع).
- **ملاحظات إضافية** (حقل نصي اختياري).

### 2.4. أزرار الإجراء (Action Buttons)
- **زر**: "✅ إفراج" (يظهر إذا كان التصنيف منخفض الخطورة).
- **زر**: "🟡 عزل مؤقت" (يظهر إذا كان التصنيف متوسط أو مرتفع).
- **زر**: "🔴 إحالة للعيادة" (يظهر في الحالات الحرجة).

## 3. حالات واجهة المستخدم (UI States)
- **حالة البحث**: عرض (Spinner).
- **حالة نجاح الفحص**: رسالة خضراء "تم تسجيل الفحص بنجاح".
- **حالة فشل الفحص**: رسالة حمراء مع سبب الفشل.
EOF
echo -e "${GREEN}   ✅ Screening.md${NC}"

# ============================================================
# 3.3 Quarantine.md
# ============================================================
cat << 'EOF' > "Quarantine.md"
# شاشة العزل والحجر الصحي (Isolation & Quarantine Management)

## 1. الهدف
إدارة حالات العزل المؤقت والحجر الصحي للمسافرين المشتبه بهم في المطار.

## 2. مكونات الشاشة

### 2.1. قائمة حالات العزل النشطة (Active Quarantine)
- **الأعمدة**: (اسم المسافر، رقم الجواز، الرحلة، تاريخ العزل، مدة العزل، الحالة).
- **أزرار الإجراءات**:
  - **زر**: "عرض التفاصيل".
  - **زر**: "تحديث الحالة".
  - **زر**: "إنهاء العزل".

### 2.2. نموذج تسجيل عزل جديد
- **اختيار المسافر**: (بحث عن مسافر).
- **سبب العزل**: (أعراض، مخالطة، فحص إيجابي).
- **مدة العزل المتوقعة**.
- **موقع العزل**: (غرفة عزل، مستشفى).
- **زر**: "بدء العزل".

### 2.3. تدفق العزل
```mermaid
flowchart LR
    A[فحص المسافر] --> B{مشتبه؟}
    B -- نعم --> C[عزل مؤقت]
    C --> D[تقييم طبي]
    D --> E{مؤكد؟}
    E -- نعم --> F[تحويل للمستشفى]
    E -- لا --> G[إنهاء العزل]
```

## 3. حالات واجهة المستخدم (UI States)
- **حالة عدم وجود حالات**: "لا توجد حالات عزل نشطة".
- **حالة نجاح بدء العزل**: رسالة خضراء "تم بدء العزل بنجاح".
EOF
echo -e "${GREEN}   ✅ Quarantine.md${NC}"

# ============================================================
# 3.4 Emergency.md
# ============================================================
cat << 'EOF' > "Emergency.md"
# شاشة الطوارئ الصحية (Public Health Emergency)

## 1. الهدف
تمكين مدير محطة الحجر الصحي من إدارة حالات الطوارئ الصحية في المطار.

## 2. مكونات الشاشة

### 2.1. زر التفعيل (Activation Button)
- **زر دائري كبير باللون الأحمر**: "🚨 تفعيل حالة الطوارئ".

### 2.2. نموذج البلاغ (Incident Form)
- **نوع البلاغ**: (حالة مشتبه بها، تفشي، خطر بيولوجي، حادث).
- **الوصف**: (حقل نصي).
- **الموقع**: (اختيار صالة/بوابة).

### 2.3. قائمة الإجراءات (Actions)
- **عزل المنطقة** (زر).
- **إرسال الفرق الطبية** (زر).
- **إشعار الجهات المعنية** (زر).
- **تحديث حالة البلاغ**: (قائمة منسدلة: نشط، قيد الاحتواء، محلول).

### 2.4. زر الحل (Resolve Button)
- **زر**: "✅ حل البلاغ" (يظهر بعد السيطرة).

## 3. حالات واجهة المستخدم (UI States)
- **حالة الطوارئ المفعلة**: تغيير لون الخلفية إلى أحمر.
- **حالة حل البلاغ**: رسالة خضراء "تم حل البلاغ بنجاح".
EOF
echo -e "${GREEN}   ✅ Emergency.md${NC}"

# العودة إلى المجلد الجذر
cd ../../../..

# ============================================================
# 4. تحديث 07_Workflows/
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📋 4. تحديث 07_Workflows/${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/07_Workflows
cd docs/07_Workflows || exit 1

# ============================================================
# 4.1 Airport_Arrival_Workflow.md
# ============================================================
cat << 'EOF' > "Airport_Arrival_Workflow.md"
# WF-17: فحص المسافرين القادمين (Airport Arrival Screening)

## 1. الهدف
توثيق عملية الفحص الصحي للمسافرين القادمين إلى المطار، بدءاً من هبوط الرحلة وصولاً إلى الإفراج أو العزل.

## 2. تدفق العملية

```mermaid
flowchart TD
    Start([بداية: هبوط الرحلة]) --> Step1[1. إشعار نظام المطار بوصول الرحلة]
    Step1 --> Step2[2. توجيه المسافرين إلى نقطة الفحص الصحي]
    Step2 --> Step3[3. مسح QR (أو إدخال رقم الجواز)]
    Step3 --> Step4[4. عرض بيانات المسافر]
    Step4 --> Step5[5. قياس الحرارة و SpO2]
    Step5 --> Step6[6. إدخال الأعراض الظاهرة]
    Step6 --> Step7[7. تقييم المخاطر]
    Step7 --> Decision1{التصنيف}
    Decision1 -- أخضر --> Step8[8. إفراج + تحديث حالة الرحلة]
    Decision1 -- أصفر/أحمر --> Step9[9. عزل مؤقت + إحالة للعيادة]
    Step9 --> Step10[10. إشعار غرفة الطوارئ في المطار]
    Step8 --> End([النهاية])
    Step10 --> End
```

## 3. المسارات البديلة
- **A1 (بيانات غير مكتملة)**: إذا لم يكن المسافر مسجلاً مسبقاً، يتم توجيهه للتسجيل الفوري.
- **A2 (حالة حرجة)**: إذا كانت الحالة حرجة، يتم إشعار غرفة الطوارئ فوراً.
EOF
echo -e "${GREEN}   ✅ Airport_Arrival_Workflow.md${NC}"

# ============================================================
# 4.2 Aircraft_Inspection_Workflow.md
# ============================================================
cat << 'EOF' > "Aircraft_Inspection_Workflow.md"
# WF-25: تفتيش الطائرات (Aircraft Inspection)

## 1. الهدف
توثيق عملية تفتيش الطائرات القادمة للتأكد من مطابقتها للمعايير الصحية.

## 2. تدفق العملية

```mermaid
flowchart TD
    Start([بداية: وصول الطائرة]) --> Step1[1. إشعار بوصول الطائرة]
    Step1 --> Step2[2. توجيه الطائرة إلى منطقة التفتيش]
    Step2 --> Step3[3. المفتش يصعد إلى الطائرة]
    Step3 --> Step4[4. فحص نظافة الطائرة]
    Step4 --> Step5[5. فحص مياه الشرب]
    Step5 --> Step6[6. فحص دورات المياه]
    Step6 --> Step7[7. فحص النفايات الطبية]
    Step7 --> Step8[8. فحص مكافحة الحشرات والقوارض]
    Step8 --> Step9[9. فحص سلامة الأغذية]
    Step9 --> Decision1{النتيجة}
    Decision1 -- مطابق --> Step10[10. إصدار شهادة إفراج للطائرة]
    Decision1 -- غير مطابق --> Step11[11. تسجيل الملاحظات]
    Step11 --> Step12[12. إشعار شركة الطيران]
    Step12 --> Step13[13. اتخاذ إجراءات تصحيحية]
    Step13 --> Step4
    Step10 --> End([النهاية])
```

## 3. قائمة التفتيش (Inspection Checklist)
| العنصر | الوصف | النتيجة |
| :--- | :--- | :--- |
| **نظافة الطائرة** | نظافة المقاعد والممرات ودورات المياه | مطابق / غير مطابق |
| **مياه الشرب** | جودة مياه الشرب على متن الطائرة | مطابق / غير مطابق |
| **دورات المياه** | نظافة وتوفر المستلزمات | مطابق / غير مطابق |
| **النفايات الطبية** | التخلص الآمن من النفايات الطبية | مطابق / غير مطابق |
| **مكافحة الحشرات** | وجود حشرات على متن الطائرة | مطابق / غير مطابق |
| **مكافحة القوارض** | وجود قوارض على متن الطائرة | مطابق / غير مطابق |
| **سلامة الأغذية** | جودة وسلامة الأغذية المقدمة | مطابق / غير مطابق |
EOF
echo -e "${GREEN}   ✅ Aircraft_Inspection_Workflow.md${NC}"

# ============================================================
# 4.3 Airport_Quarantine_Workflow.md
# ============================================================
cat << 'EOF' > "Airport_Quarantine_Workflow.md"
# WF-26: العزل والحجر الصحي في المطار (Airport Quarantine)

## 1. الهدف
توثيق عملية العزل المؤقت والحجر الصحي للمسافرين المشتبه بهم في المطار.

## 2. تدفق العملية

```mermaid
flowchart TD
    Start([بداية: اكتشاف حالة مشتبه بها]) --> Step1[1. عزل المسافر في غرفة العزل]
    Step1 --> Step2[2. تسجيل حالة العزل في النظام]
    Step2 --> Step3[3. إجراء التقييم الطبي الأولي]
    Step3 --> Step4[4. أخذ عينات للفحص المخبري]
    Step4 --> Step5[5. انتظار النتائج]
    Step5 --> Decision1{النتيجة}
    Decision1 -- سلبية --> Step6[6. إنهاء العزل]
    Decision1 -- إيجابية --> Step7[7. تحويل المسافر إلى المستشفى]
    Step7 --> Step8[8. تتبع المخالطين]
    Step6 --> End([النهاية])
    Step8 --> End
```

## 3. مدة العزل
| الحالة | المدة | الإجراء |
| :--- | :--- | :--- |
| **بانتظار النتيجة** | 24-48 ساعة | عزل مؤقت مع مراقبة الأعراض |
| **حالة مؤكدة** | حسب البروتوكول | تحويل للمستشفى |
| **حالة سلبية** | فوري | إنهاء العزل والإفراج |
EOF
echo -e "${GREEN}   ✅ Airport_Quarantine_Workflow.md${NC}"

cd ../..

# ============================================================
# 5. تحديث 03_Database/init_new_modules.sql
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}🗄️ 5. تحديث 03_Database/init_new_modules.sql${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/03_Database
cd docs/03_Database || exit 1

# إضافة الجداول الجديدة إلى ملف SQL
cat << 'EOF' >> "init_new_modules.sql"

-- ============================================================
-- جداول إضافية لنظام صحة المطارات (Airport Health System)
-- ============================================================

-- جدول تفتيش الطائرات
CREATE TABLE IF NOT EXISTS aircraft_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_registration VARCHAR(20) NOT NULL,
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL,
    inspector_id UUID NOT NULL REFERENCES users(id),
    cleanliness_status VARCHAR(20) CHECK (cleanliness_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    water_quality_status VARCHAR(20) CHECK (water_quality_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    toilets_status VARCHAR(20) CHECK (toilets_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    medical_waste_status VARCHAR(20) CHECK (medical_waste_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    pest_control_status VARCHAR(20) CHECK (pest_control_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    rodent_control_status VARCHAR(20) CHECK (rodent_control_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    food_safety_status VARCHAR(20) CHECK (food_safety_status IN ('COMPLIANT', 'NON_COMPLIANT')),
    findings TEXT,
    overall_status VARCHAR(20) CHECK (overall_status IN ('PASSED', 'FAILED', 'CONDITIONAL')),
    certificate_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول صحة الطاقم
CREATE TABLE IF NOT EXISTS crew_health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES users(id),
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    health_status VARCHAR(20) CHECK (health_status IN ('FIT', 'UNFIT', 'UNDER_OBSERVATION')),
    temperature FLOAT CHECK (temperature BETWEEN 30 AND 45),
    symptoms JSONB,
    medical_clearance_date DATE,
    next_clearance_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإقرارات الصحية للمطار
CREATE TABLE IF NOT EXISTS airport_health_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    declaration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    personal_data JSONB,
    travel_history JSONB,
    health_status JSONB,
    symptoms JSONB,
    accommodation JSONB,
    contact_info JSONB,
    declared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_aircraft_inspections_flight ON aircraft_inspections(flight_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_inspections_date ON aircraft_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_crew_health_records_crew ON crew_health_records(crew_id);
CREATE INDEX IF NOT EXISTS idx_airport_health_declarations_traveler ON airport_health_declarations(traveler_id);
CREATE INDEX IF NOT EXISTS idx_airport_health_declarations_flight ON airport_health_declarations(flight_id);

-- Triggers
DROP TRIGGER IF EXISTS update_aircraft_inspections_updated_at ON aircraft_inspections;
CREATE TRIGGER update_aircraft_inspections_updated_at BEFORE UPDATE ON aircraft_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crew_health_records_updated_at ON crew_health_records;
CREATE TRIGGER update_crew_health_records_updated_at BEFORE UPDATE ON crew_health_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_airport_health_declarations_updated_at ON airport_health_declarations;
CREATE TRIGGER update_airport_health_declarations_updated_at BEFORE UPDATE ON airport_health_declarations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF
echo -e "${GREEN}   ✅ تم تحديث init_new_modules.sql${NC}"

cd ../..

# ============================================================
# 6. تحديث PROJECT_TREE.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📁 6. تحديث PROJECT_TREE.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

# إضافة قسم نظام صحة المطارات إلى PROJECT_TREE.md
if [ -f "docs/02_Architecture/PROJECT_TREE.md" ]; then
    echo -e "\n## 5. نظام صحة المطارات (Airport Health System)" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "\n### 5.1. 04_Modules/17_Airport_Health_System/" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- 01_System_Overview.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- 02_Database_Schema.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- 03_Airport_Modules.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "\n### 5.2. 05_API/" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Airport_API.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "\n### 5.3. 06_UI_UX/17_Airport_Health_System/" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Dashboard.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Screening.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Quarantine.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Emergency.md" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "\n### 5.4. 07_Workflows/" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Airport_Arrival_Workflow.md (WF-17)" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Aircraft_Inspection_Workflow.md (WF-25)" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- Airport_Quarantine_Workflow.md (WF-26)" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "\n### 5.5. 03_Database/" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "- init_new_modules.sql (جداول إضافية)" >> docs/02_Architecture/PROJECT_TREE.md
    echo -e "${GREEN}   ✅ تم تحديث PROJECT_TREE.md${NC}"
fi

# ============================================================
# 7. عرض النتائج النهائية
# ============================================================
echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ ✅ ✅ تم تحديث نظام صحة المطارات بالكامل!${NC}"
echo -e "${BLUE}============================================================${NC}"

echo -e "\n${CYAN}📁 الملفات المنشأة/المحدثة:${NC}"
echo -e "   📄 04_Modules/17_Airport_Health_System/01_System_Overview.md"
echo -e "   📄 04_Modules/17_Airport_Health_System/02_Database_Schema.md"
echo -e "   📄 04_Modules/17_Airport_Health_System/03_Airport_Modules.md"
echo -e "   📄 05_API/Airport_API.md"
echo -e "   📄 06_UI_UX/17_Airport_Health_System/Dashboard.md"
echo -e "   📄 06_UI_UX/17_Airport_Health_System/Screening.md"
echo -e "   📄 06_UI_UX/17_Airport_Health_System/Quarantine.md"
echo -e "   📄 06_UI_UX/17_Airport_Health_System/Emergency.md"
echo -e "   📄 07_Workflows/Airport_Arrival_Workflow.md"
echo -e "   📄 07_Workflows/Aircraft_Inspection_Workflow.md"
echo -e "   📄 07_Workflows/Airport_Quarantine_Workflow.md"
echo -e "   📄 03_Database/init_new_modules.sql (محدث)"
echo -e "   📄 02_Architecture/PROJECT_TREE.md (محدث)"

echo -e "\n${YELLOW}📌 إجمالي الملفات: 12 ملفاً تم تحديثها أو إنشاؤها${NC}"

echo -e "\n${GREEN}🚀 أصبح نظام صحة المطارات متكاملاً وجاهزاً للتطوير!${NC}"
echo -e "${GREEN}✅ تم الانتهاء من تحديث جميع الملفات بنجاح${NC}"
