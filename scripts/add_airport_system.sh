#!/bin/bash

# ============================================================
# add_airport_system.sh - إضافة وتحديث نظام صحة المطارات
# يقوم بإنشاء/تحديث جميع ملفات نظام صحة المطارات وفقاً للتوثيق الجديد
# 
# الاستخدام:
#   chmod +x add_airport_system.sh
#   ./add_airport_system.sh
# ============================================================

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}✈️ إضافة وتحديث نظام صحة المطارات (Airport Health System)${NC}"
echo -e "${BLUE}============================================================${NC}"

# التأكد من أننا في المجلد الصحيح
if [ ! -d "docs" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ خطأ: يرجى تشغيل السكريبت من المجلد الجذر للمشروع (nqp-platform).${NC}"
    exit 1
fi

# إنشاء نسخة احتياطية
echo -e "\n${YELLOW}📦 إنشاء نسخة احتياطية...${NC}"
BACKUP_DIR="backup_airport_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "docs/04_Modules/17_Airport_Health_System" ]; then
    cp -r docs/04_Modules/17_Airport_Health_System "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ -f "docs/05_API/Airport_API.md" ]; then
    cp docs/05_API/Airport_API.md "$BACKUP_DIR/" 2>/dev/null || true
fi
echo -e "${GREEN}   ✅ تم إنشاء النسخة الاحتياطية في: $BACKUP_DIR${NC}"

# ============================================================
# 1. إنشاء مجلد النظام
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📁 1. إنشاء مجلد النظام${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/04_Modules/17_Airport_Health_System
echo -e "${GREEN}   ✅ docs/04_Modules/17_Airport_Health_System/${NC}"

# ============================================================
# 2. إنشاء 01_System_Overview.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 2. إنشاء 01_System_Overview.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

cat > docs/04_Modules/17_Airport_Health_System/01_System_Overview.md << 'EOF'
# 17_Airport_Health_System - نظام صحة المطارات

## 1. الهدف الاستراتيجي
نظام متخصص لإدارة جميع إجراءات الحجر الصحي والصحة العامة في المطارات الدولية، ويغطي دورة العمل منذ وصول الرحلة وحتى مغادرتها، مع التكامل مع بقية أنظمة **منصة الحجر الصحي القومي (National Quarantine Platform - NQP)**.

## 2. أهداف النظام
- إدارة الرحلات القادمة والمغادرة.
- تسجيل وفحص المسافرين.
- إدارة صحة أطقم الطائرات.
- التفتيش الصحي للطائرات.
- التحقق من الشهادات والتطعيمات.
- إدارة الحالات المشتبه بها.
- إصدار التصاريح والشهادات الصحية.
- دعم الترصد الوبائي.
- التكامل مع الجهات الحكومية بالمطار.

## 3. الهيكل الوظيفي (المكونات الـ 23)

```text
Airport Health System
│
├── Dashboard
├── Airport Management
├── Flight Management
├── Airline Management
├── Passenger Health Management
├── Crew Health Management
├── Health Declaration
├── Vaccination Verification
├── Medical Screening
├── Risk Assessment
├── Quarantine & Isolation
├── Medical Referral
├── Aircraft Health Inspection
├── Aircraft Sanitation Inspection
├── Food & Catering Inspection
├── Water Quality Inspection
├── Waste Management
├── Vector Surveillance
├── Emergency Management
├── Disease Surveillance
├── Certificate Management
├── Reporting & Dashboard
├── Notification Center
└── Integration Services
```

## 4. المكونات الرئيسية (Components)

| الرقم | المكون | الوصف | الأولوية |
| :--- | :--- | :--- | :--- |
| **1** | **Dashboard** | لوحة التحكم الرئيسية وعرض المؤشرات. | عالية |
| **2** | **Airport Management** | إدارة بيانات المطارات (IATA، ICAO، الصالات، محطات الحجر). | عالية |
| **3** | **Flight Management** | إدارة الرحلات القادمة والمغادرة. | عالية |
| **4** | **Airline Management** | إدارة شركات الطيران (الاسم، الرمز، الاتصال، التراخيص). | عالية |
| **5** | **Passenger Health Management** | إدارة بيانات المسافرين وربطها مع Traveler Health System. | عالية |
| **6** | **Crew Health Management** | إدارة صحة الطواقم (الطيارين، المضيفين، الفنيين). | عالية |
| **7** | **Health Declaration** | الإقرار الصحي الإلكتروني (الأعراض، الدول الزائرة، الأمراض). | عالية |
| **8** | **Vaccination Verification** | التحقق من شهادات التطعيم وصلاحيتها. | عالية |
| **9** | **Medical Screening** | الفحص الصحي (العلامات الحيوية، قياس الحرارة، تقييم الحالة). | عالية |
| **10** | **Risk Assessment** | تصنيف المسافر (Low, Medium, High, Critical). | عالية |
| **11** | **Quarantine & Isolation** | إدارة العزل والحجر الصحي للحالات المشتبه بها. | عالية |
| **12** | **Medical Referral** | تحويل الحالات إلى المستشفيات، المراكز الصحية، المختبرات. | عالية |
| **13** | **Aircraft Health Inspection** | تفتيش صحة الطائرة (المقصورة، دورات المياه، التهوية). | عالية |
| **14** | **Aircraft Sanitation Inspection** | التأكد من عمليات التطهير والتعقيم ومكافحة الآفات. | عالية |
| **15** | **Food & Catering Inspection** | فحص وجبات الطائرات، مخازن الأغذية، المطابخ، شركات التموين. | عالية |
| **16** | **Water Quality Inspection** | فحص جودة مياه الشرب وخزانات المياه. | عالية |
| **17** | **Waste Management** | إدارة النفايات الطبية والغذائية والتخلص الآمن. | متوسطة |
| **18** | **Vector Surveillance** | مكافحة البعوض، الذباب، القوارض، برامج الرش. | متوسطة |
| **19** | **Emergency Management** | إدارة الحالات الطارئة، الأوبئة، الطائرات المشتبه بها. | عالية |
| **20** | **Disease Surveillance** | الترصد الوبائي وربطه مع Disease Surveillance System. | عالية |
| **21** | **Certificate Management** | إصدار شهادات الإفراج الصحي، تقارير التفتيش، التقارير الطبية. | متوسطة |
| **22** | **Reporting & Dashboard** | عرض التقارير والإحصائيات (الرحلات، المسافرين، حالات الاشتباه). | متوسطة |
| **23** | **Notification Center** | إرسال الإشعارات (SMS، Email، إشعارات النظام). | متوسطة |

## 5. سير العمل الأساسي (Workflow)

```mermaid
flowchart TD
    Start([وصول الرحلة]) --> Step1[استقبال بيانات الرحلة]
    Step1 --> Step2[تسجيل الركاب وربطهم بـ Traveler Health System]
    Step2 --> Step3[التحقق من الإقرار الصحي والتطعيمات]
    Step3 --> Step4[الفحص الصحي وتقييم المخاطر]
    Step4 --> Decision1{التصنيف}
    Decision1 -- سليم --> Step5[سماح بالدخول]
    Decision1 -- مشتبه --> Step6[تحويل للمختبر]
    Decision1 -- خطير --> Step7[حجر صحي/عزل]
    Step5 --> Step8[إصدار التصاريح والتقارير الصحية]
    Step6 --> Step8
    Step7 --> Step8
    Step8 --> Step9[إرسال البيانات إلى نظام الترصد الوبائي والتقارير المركزية]
    Step9 --> End([النهاية])
```

## 6. التكامل مع الأنظمة الأخرى

```mermaid
flowchart TD
    A[نظام صحة المطارات] --> B[نظام صحة المسافرين]
    A --> C[نظام الترصد الوبائي]
    A --> D[نظام المختبرات]
    A --> E[نظام التفتيش]
    A --> F[نظام إدارة الشهادات]
    A --> G[نظام الفوترة]
    A --> H[نظام الإشعارات]
```

### 6.1. الجهات الخارجية المتكاملة
- **وزارة الصحة الاتحادية السودانية**: تبادل التقارير والبيانات الصحية.
- **الإدارة العامة للحجر الصحي القومي**: الإشراف والتوجيه.
- **سلطة الطيران المدني**: تبادل بيانات الرحلات والطائرات.
- **إدارة المطار**: التنسيق التشغيلي.
- **شركات الطيران**: تبادل بيانات الركاب والطواقم.
- **الجوازات والهجرة**: التحقق من هويات المسافرين.
- **الجمارك**: التنسيق في إجراءات الإفراج.
- **المختبرات المرجعية**: تبادل نتائج الفحوصات.

## 7. المستخدمون (Actors)
- **طبيب الحجر الصحي**: يقوم بالفحص الطبي وتقييم الحالات.
- **مفتش الحجر الصحي**: يقوم بالتفتيش على الطائرات والمرافق.
- **مفتش صحة البيئة**: يتولى تفتيش الأغذية والمياه والمرافق.
- **مفتش سلامة الأغذية**: يتولى تفتيش الوجبات والمطابخ.
- **موظف تسجيل المسافرين**: يسجل بيانات المسافرين والإقرارات الصحية.
- **موظف العمليات بالمطار**: يدير العمليات التشغيلية.
- **مسؤول المختبر**: يدير العينات والفحوصات المخبرية.
- **مدير محطة الحجر الصحي**: يدير عمليات الحجر الصحي في المطار.
- **مدير الإدارة العامة للحجر الصحي**: يشرف على جميع العمليات.
- **مسؤول النظام**: يدير إعدادات النظام والصلاحيات.

## 8. مكان النظام داخل المنصة

```text
منصة الحجر الصحي القومي (National Quarantine Platform)
│
├── البوابة الوطنية للحجر الصحي (National Quarantine Portal)
├── نظام صحة المسافرين (Traveler Health System)
├── نظام صحة المطارات (Airport Health System) ← هذا النظام
├── نظام صحة الموانئ (Port Health System)
├── نظام صحة المعابر البرية (Land Border Health System)
├── نظام سلامة الغذاء (Food Safety System)
├── نظام إدارة التفتيش الصحي (Health Inspection Management System)
├── نظام المعلومات المخبرية للرقابة الغذائية (Food Control Laboratory Information System)
├── نظام الترصد الوبائي (Disease Surveillance System)
├── نظام إدارة الشهادات (Certificate Management System)
├── نظام الإشعارات (Notification System)
└── نظام التقارير والذكاء الأعمال (Reporting & Business Intelligence)
```

## 9. نطاق النظام
يركز نظام صحة المطارات على جميع الأنشطة الصحية داخل المطار، بدءًا من وصول الرحلة والمسافرين، مرورًا بالتفتيش الصحي والعزل والترصد الوبائي، وانتهاءً بالتكامل مع بقية أنظمة منصة الحجر الصحي القومي لضمان حماية الصحة العامة ومنع انتقال الأمراض عبر النقل الجوي.
EOF

echo -e "${GREEN}   ✅ 01_System_Overview.md${NC}"

# ============================================================
# 3. إنشاء 02_Database_Schema.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 3. إنشاء 02_Database_Schema.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

cat > docs/04_Modules/17_Airport_Health_System/02_Database_Schema.md << 'EOF'
# 02_Database_Schema - مخطط قاعدة بيانات نظام صحة المطارات

## 1. الجداول الأساسية (Core Tables)

### `airports` (إدارة المطارات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `airport_code` | VARCHAR(10) | رمز IATA |
| `icao_code` | VARCHAR(10) | رمز ICAO |
| `airport_name` | VARCHAR(200) | اسم المطار |
| `state` | VARCHAR(100) | الولاية |
| `country` | VARCHAR(100) | الدولة |
| `status` | VARCHAR(20) | (ACTIVE, INACTIVE) |

### `flights` (إدارة الرحلات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `flight_number` | VARCHAR(20) | رقم الرحلة |
| `airline_id` | UUID | FOREIGN KEY (airlines) |
| `origin` | VARCHAR(100) | دولة القدوم |
| `destination` | VARCHAR(100) | الوجهة |
| `arrival_date` | DATE | تاريخ الوصول |
| `departure_date` | DATE | تاريخ المغادرة |
| `status` | VARCHAR(20) | (SCHEDULED, ARRIVED, DEPARTED) |

### `airlines` (إدارة شركات الطيران)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `airline_name` | VARCHAR(200) | اسم الشركة |
| `airline_code` | VARCHAR(10) | رمز الشركة |
| `contact_info` | JSONB | بيانات الاتصال |
| `licenses` | JSONB | التراخيص |

### `passenger_screenings` (فحص المسافرين)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `temperature` | FLOAT | درجة الحرارة |
| `symptoms` | JSONB | الأعراض |
| `risk_level` | VARCHAR(10) | (LOW, MEDIUM, HIGH, CRITICAL) |
| `decision` | VARCHAR(20) | (CLEARED, QUARANTINED, REFERRED) |

### `health_declarations` (الإقرار الصحي)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `symptoms` | JSONB | الأعراض |
| `travel_history` | JSONB | تاريخ السفر |
| `status` | VARCHAR(20) | (SUBMITTED, VERIFIED) |

### `quarantine_cases` (العزل والحجر الصحي)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `reason` | TEXT | سبب العزل |
| `isolation_location` | VARCHAR(200) | موقع العزل |
| `start_date` | DATE | تاريخ البدء |
| `end_date` | DATE | تاريخ الانتهاء |
| `status` | VARCHAR(20) | (ACTIVE, COMPLETED) |

### `aircraft_inspections` (تفتيش الطائرات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `inspection_date` | DATE | تاريخ التفتيش |
| `inspector` | VARCHAR(100) | اسم المفتش |
| `inspection_type` | VARCHAR(50) | نوع التفتيش |
| `result` | VARCHAR(20) | (PASSED, FAILED) |
| `decision` | VARCHAR(20) | (CLEARED, QUARANTINED) |

### `vaccination_verifications` (التحقق من التطعيمات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `vaccine_name` | VARCHAR(100) | اسم اللقاح |
| `certificate_number` | VARCHAR(50) | رقم الشهادة |
| `issue_date` | DATE | تاريخ الإصدار |
| `expiry_date` | DATE | تاريخ الانتهاء |
| `verified_by` | UUID | FOREIGN KEY (users) |

### `medical_referrals` (الإحالات الطبية)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `referral_type` | VARCHAR(20) | (HOSPITAL, CLINIC, LAB) |
| `referral_reason` | TEXT | سبب الإحالة |
| `referral_date` | DATE | تاريخ الإحالة |
| `status` | VARCHAR(20) | (PENDING, COMPLETED) |

### `food_catering_inspections` (تفتيش الأغذية والتموين)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `inspection_date` | DATE | تاريخ التفتيش |
| `food_source` | VARCHAR(200) | مصدر الطعام |
| `result` | VARCHAR(20) | (PASSED, FAILED) |
| `notes` | TEXT | ملاحظات |

### `water_quality_inspections` (تفتيش جودة المياه)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `flight_id` | UUID | FOREIGN KEY (flights) |
| `inspection_date` | DATE | تاريخ التفتيش |
| `water_source` | VARCHAR(200) | مصدر المياه |
| `lab_results` | JSONB | نتائج المختبر |
| `status` | VARCHAR(20) | (COMPLIANT, NON_COMPLIANT) |

### `vector_surveillance` (مكافحة النواقل)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `airport_id` | UUID | FOREIGN KEY (airports) |
| `surveillance_date` | DATE | تاريخ المراقبة |
| `vector_type` | VARCHAR(50) | نوع الناقل |
| `findings` | TEXT | الملاحظات |
| `action_taken` | TEXT | الإجراء المتخذ |

### `emergency_incidents` (الحوادث الطارئة)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `airport_id` | UUID | FOREIGN KEY (airports) |
| `incident_type` | VARCHAR(30) | (OUTBREAK, SUSPECTED, BIOHAZARD) |
| `description` | TEXT | الوصف |
| `status` | VARCHAR(20) | (ACTIVE, RESOLVED) |
| `activated_at` | TIMESTAMPTZ | وقت التفعيل |
| `resolved_at` | TIMESTAMPTZ | وقت الحل |

### `notifications` (الإشعارات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `recipient` | VARCHAR(255) | المستلم |
| `notification_type` | VARCHAR(20) | (SMS, EMAIL, SYSTEM) |
| `subject` | VARCHAR(255) | الموضوع |
| `message` | TEXT | الرسالة |
| `sent_at` | TIMESTAMPTZ | وقت الإرسال |
| `status` | VARCHAR(20) | (SENT, FAILED) |

### `certificates` (الشهادات)
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `certificate_type` | VARCHAR(50) | نوع الشهادة |
| `certificate_number` | VARCHAR(50) | رقم الشهادة |
| `issue_date` | DATE | تاريخ الإصدار |
| `expiry_date` | DATE | تاريخ الانتهاء |
| `qr_data` | JSONB | بيانات QR |
| `status` | VARCHAR(20) | (ACTIVE, REVOKED) |

## 2. العلاقات (Relationships)

```mermaid
erDiagram
    airports ||--o{ flights : has
    airlines ||--o{ flights : operates
    travelers ||--o{ passenger_screenings : undergoes
    flights ||--o{ passenger_screenings : has
    travelers ||--o{ health_declarations : submits
    flights ||--o{ health_declarations : associated
    travelers ||--o{ quarantine_cases : quarantined
    flights ||--o{ aircraft_inspections : inspected
    travelers ||--o{ vaccination_verifications : has
    travelers ||--o{ medical_referrals : referred
    flights ||--o{ food_catering_inspections : inspected
    flights ||--o{ water_quality_inspections : inspected
    airports ||--o{ vector_surveillance : monitored
    airports ||--o{ emergency_incidents : contains
    travelers ||--o{ certificates : has
```

## 3. الفهارس (Indexes)

| الجدول | العمود | نوع الفهرس |
| :--- | :--- | :--- |
| `flights` | `flight_number` | B-Tree |
| `flights` | `arrival_date` | B-Tree |
| `passenger_screenings` | `traveler_id` | B-Tree |
| `passenger_screenings` | `flight_id` | B-Tree |
| `health_declarations` | `traveler_id` | B-Tree |
| `quarantine_cases` | `status` | B-Tree |
| `aircraft_inspections` | `flight_id` | B-Tree |
| `vaccination_verifications` | `traveler_id` | B-Tree |
| `certificates` | `certificate_number` | UNIQUE B-Tree |
| `notifications` | `sent_at` | B-Tree |
| `emergency_incidents` | `status` | B-Tree |
EOF

echo -e "${GREEN}   ✅ 02_Database_Schema.md${NC}"

# ============================================================
# 4. إنشاء 03_Airport_Modules.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 4. إنشاء 03_Airport_Modules.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

cat > docs/04_Modules/17_Airport_Health_System/03_Airport_Modules.md << 'EOF'
# 03_Airport_Modules - مكونات نظام صحة المطارات (23 مكوناً)

## 1. Dashboard (لوحة التحكم)
لوحة التحكم الرئيسية التي تعرض:
- إحصائيات الرحلات (القادمة، المغادرة، المتأخرة).
- عدد المسافرين الذين تم فحصهم.
- عدد الحالات المشتبه بها.
- حالات العزل النشطة.
- مؤشرات الأداء الرئيسية (KPIs).
- التنبيهات والإشعارات الفورية.

## 2. Airport Management (إدارة المطارات)
إدارة بيانات المطارات:
- اسم المطار.
- رمز IATA.
- رمز ICAO.
- الدولة والولاية.
- صالات الوصول والمغادرة.
- محطات الحجر الصحي.
- حالة المطار (نشط/غير نشط).

## 3. Flight Management (إدارة الرحلات)
إدارة الرحلات:
- الرحلات القادمة والمغادرة.
- رقم الرحلة وشركة الطيران.
- دولة القدوم والوجهة.
- وقت الوصول والمغادرة.
- بوابة الوصول.
- حالة الرحلة.

## 4. Airline Management (إدارة شركات الطيران)
إدارة شركات الطيران:
- اسم الشركة ورمزها.
- بيانات الاتصال.
- التراخيص.
- حالة الشركة.

## 5. Passenger Health Management (إدارة صحة المسافرين)
مرتبط مع **Traveler Health System**:
- بيانات المسافر.
- QR الصحي.
- نتيجة الفحص.
- حالة الدخول.
- تاريخ السفر.

## 6. Crew Health Management (إدارة صحة الطاقم)
إدارة:
- الطيارين.
- المضيفين.
- الفنيين.
- الطاقم الطبي.
- الشهادات الصحية.
- التطعيمات.
- الحالات المرضية.

## 7. Health Declaration (الإقرار الصحي)
الإقرار الصحي الإلكتروني:
- الأعراض.
- الدول التي تمت زيارتها.
- الأمراض المزمنة.
- وسائل التواصل.
- تاريخ السفر.

## 8. Vaccination Verification (التحقق من التطعيمات)
التحقق من:
- شهادة التطعيم.
- صلاحية اللقاحات.
- QR Verification.
- التطعيمات المطلوبة حسب الوجهة.

## 9. Medical Screening (الفحص الصحي)
الفحص الصحي:
- العلامات الحيوية.
- قياس الحرارة.
- تقييم الحالة.
- قرار الطبيب.

## 10. Risk Assessment (تقييم المخاطر)
تصنيف المسافر:
- **Low Risk** (منخفض).
- **Medium Risk** (متوسط).
- **High Risk** (مرتفع).
- **Critical** (خطير).

## 11. Quarantine & Isolation (العزل والحجر الصحي)

```text
Arrival
   │
   ▼
Medical Screening
   │
┌───────────────┐
▼               ▼
Normal      Suspected
│               │
▼               ▼
Clearance   Isolation
```

يدير النظام:
- العزل المؤقت.
- التحويل للمستشفى.
- متابعة الحالة.
- إنهاء إجراءات الحجر الصحي.

## 12. Medical Referral (الإحالة الطبية)
تحويل:
- مستشفى.
- مركز صحي.
- مختبر.
- عيادة المطار.

## 13. Aircraft Health Inspection (تفتيش صحة الطائرة)
تفتيش:
- المقصورة.
- دورات المياه.
- خزانات المياه.
- التهوية.
- النظافة العامة.
- مكافحة الحشرات.

## 14. Aircraft Sanitation Inspection (تفتيش التطهير)
التأكد من:
- عمليات التطهير.
- التعقيم.
- مكافحة الآفات.
- الالتزام بالاشتراطات الصحية.

## 15. Food & Catering Inspection (تفتيش الأغذية والتموين)
فحص:
- وجبات الطائرات.
- مخازن الأغذية.
- المطابخ.
- شركات التموين.

## 16. Water Quality Inspection (تفتيش جودة المياه)
يشمل:
- مياه الشرب.
- خزانات المياه.
- نتائج المختبر.
- جودة المياه.

## 17. Waste Management (إدارة النفايات)
إدارة:
- النفايات الطبية.
- النفايات الغذائية.
- التخلص الآمن.
- إعادة التدوير (إن وجد).

## 18. Vector Surveillance (مكافحة النواقل)
يشمل:
- مكافحة البعوض.
- مكافحة الذباب.
- مكافحة القوارض.
- برامج الرش.
- المراقبة الدورية.

## 19. Emergency Management (إدارة الطوارئ)
إدارة:
- الحالات الطارئة.
- الأوبئة.
- الطائرات المشتبه بها.
- الكوارث الصحية.
- خطط الاستجابة.

## 20. Disease Surveillance (الترصد الوبائي)
مرتبط مع **Disease Surveillance System**:
- البلاغات.
- الحالات.
- التنبيهات.
- تتبع المخالطين.
- التقارير الوبائية.

## 21. Certificate Management (إدارة الشهادات)
إصدار:
- شهادة الإفراج الصحي.
- تقرير التفتيش.
- تقارير الحجر الصحي.
- التقارير الطبية.
- شهادات التطعيم.

## 22. Reporting & Dashboard (التقارير ولوحات المعلومات)
يعرض:
- الرحلات.
- المسافرين.
- حالات الاشتباه.
- عدد الفحوصات.
- نتائج التفتيش.
- مؤشرات الأداء.
- الإحصاءات اليومية والشهرية.

## 23. Notification Center (مركز الإشعارات)
إرسال:
- SMS.
- Email.
- إشعارات النظام.
- تنبيهات الطوارئ.
- تذكيرات المتابعة.
EOF

echo -e "${GREEN}   ✅ 03_Airport_Modules.md${NC}"

# ============================================================
# 5. إنشاء 04_Airport_Workflow.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 5. إنشاء 04_Airport_Workflow.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

cat > docs/04_Modules/17_Airport_Health_System/04_Airport_Workflow.md << 'EOF'
# 04_Airport_Workflow - سير العمل المتكامل في نظام صحة المطارات

## 1. سير العمل الأساسي (Main Workflow)

```mermaid
flowchart TD
    Start([وصول الرحلة]) --> Step1[استقبال بيانات الرحلة]
    Step1 --> Step2[تسجيل الركاب وربطهم بـ Traveler Health System]
    Step2 --> Step3[التحقق من الإقرار الصحي والتطعيمات]
    Step3 --> Step4[الفحص الصحي وتقييم المخاطر]
    Step4 --> Decision1{التصنيف}
    Decision1 -- سليم --> Step5[سماح بالدخول]
    Decision1 -- مشتبه --> Step6[تحويل للمختبر]
    Decision1 -- خطير --> Step7[حجر صحي/عزل]
    Step5 --> Step8[إصدار التصاريح والتقارير الصحية]
    Step6 --> Step8
    Step7 --> Step8
    Step8 --> Step9[إرسال البيانات إلى نظام الترصد الوبائي والتقارير المركزية]
    Step9 --> End([النهاية])
```

## 2. سير العمل: فحص المسافر القادم (Arrival Screening)

```mermaid
flowchart TD
    Start([بداية: هبوط الرحلة]) --> Step1[1. إشعار نظام المطار بوصول الرحلة]
    Step1 --> Step2[2. توجيه المسافرين إلى نقطة الفحص الصحي]
    Step2 --> Step3[3. مسح QR (أو إدخال رقم الجواز)]
    Step3 --> Step4[4. عرض بيانات المسافر من Traveler Health System]
    Step4 --> Step5[5. قياس الحرارة و SpO2]
    Step5 --> Step6[6. إدخال الأعراض الظاهرة]
    Step6 --> Step7[7. تقييم المخاطر (محرك المخاطر)]
    Step7 --> Decision1{التصنيف}
    Decision1 -- أخضر --> Step8[8. إفراج + تحديث حالة الرحلة]
    Decision1 -- أصفر/أحمر --> Step9[9. عزل مؤقت + إحالة للعيادة]
    Step9 --> Step10[10. إشعار غرفة الطوارئ في المطار]
    Step8 --> End([النهاية])
    Step10 --> End
```

## 3. سير العمل: العزل والحجر الصحي (Quarantine Management)

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

## 4. سير العمل: تتبع المخالطين (Contact Tracing)

```mermaid
flowchart TD
    Start([بداية: حالة مؤكدة]) --> Step1[1. تحديد الرحلة]
    Step1 --> Step2[2. استخراج قائمة الركاب]
    Step2 --> Step3[3. تحديد المخالطين (المقاعد المجاورة)]
    Step3 --> Step4[4. إرسال تنبيهات للمخالطين]
    Step4 --> Step5[5. متابعة حالات المخالطين]
    Step5 --> End([النهاية])
```

## 5. سير العمل: الطوارئ في المطار (Emergency Response)

```mermaid
flowchart TD
    Start([بداية: اكتشاف حالة خطيرة]) --> Step1[1. إشعار غرفة عمليات المطار]
    Step1 --> Step2[2. تفعيل خطة الطوارئ]
    Step2 --> Step3[3. تحديد المنطقة المتأثرة]
    Step3 --> Step4[4. إرسال الفرق الطبية إلى الموقع]
    Step4 --> Step5[5. عزل المنطقة ومنع الدخول/الخروج]
    Step5 --> Step6[6. إجراء فحوصات للمخالطين]
    Step6 --> Decision1{السيطرة على الوضع؟}
    Decision1 -- نعم --> Step7[7. رفع الحظر وإعادة التشغيل]
    Decision1 -- لا --> Step8[8. تصعيد إلى غرفة الطوارئ الوطنية (EOC)]
    Step7 --> End([النهاية])
    Step8 --> End
```

## 6. سير العمل: تفتيش الطائرات (Aircraft Inspection)

```mermaid
flowchart TD
    Start([بداية: وصول الطائرة]) --> Step1[1. إشعار بوصول الطائرة]
    Step1 --> Step2[2. توجيه الطائرة إلى منطقة التفتيش]
    Step2 --> Step3[3. المفتش يصعد إلى الطائرة]
    Step3 --> Step4[4. فحص المقصورة والنظافة]
    Step4 --> Step5[5. فحص دورات المياه]
    Step5 --> Step6[6. فحص خزانات المياه]
    Step6 --> Step7[7. فحص التهوية]
    Step7 --> Step8[8. فحص مكافحة الحشرات]
    Step8 --> Decision1{النتيجة}
    Decision1 -- مطابق --> Step9[9. إصدار شهادة إفراج للطائرة]
    Decision1 -- غير مطابق --> Step10[10. تسجيل الملاحظات]
    Step10 --> Step11[11. إشعار شركة الطيران]
    Step11 --> Step12[12. اتخاذ إجراءات تصحيحية]
    Step12 --> Step4
    Step9 --> End([النهاية])
```

## 7. نقاط القرار الرئيسية (Decision Points)
- **تصنيف المخاطر**: (أخضر، أصفر، أحمر) – يحدد الإفراج أو العزل أو الإحالة.
- **نتيجة الفحص المخبري**: (سلبية، إيجابية) – يحدد الإفراج أو التحويل.
- **حالة المطار**: (طبيعي، تنبيه، طوارئ) – يحدد مستوى الاستجابة.
- **نوع المسافر**: (قادم، مغادر، عابر، طاقم) – يحدد مسار الفحص.
- **نتيجة تفتيش الطائرة**: (مطابق، غير مطابق) – يحدد الإفراج أو الإجراءات التصحيحية.
EOF

echo -e "${GREEN}   ✅ 04_Airport_Workflow.md${NC}"

# ============================================================
# 6. إنشاء 05_Airport_Integration.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 6. إنشاء 05_Airport_Integration.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

cat > docs/04_Modules/17_Airport_Health_System/05_Airport_Integration.md << 'EOF'
# 05_Airport_Integration - التكامل مع الأنظمة الأخرى

## 1. نظرة عامة
يتكامل نظام صحة المطارات مع العديد من الأنظمة الداخلية والخارجية لضمان سير العمل بسلاسة وتبادل البيانات بكفاءة.

## 2. التكامل مع الأنظمة الداخلية

```mermaid
flowchart TD
    A[نظام صحة المطارات] --> B[نظام صحة المسافرين<br/>Traveler Health System]
    A --> C[نظام الترصد الوبائي<br/>Disease Surveillance System]
    A --> D[نظام المختبرات<br/>Laboratory System]
    A --> E[نظام التفتيش الصحي<br/>Health Inspection System]
    A --> F[نظام إدارة الشهادات<br/>Certificate Management System]
    A --> G[نظام الفوترة<br/>Finance System]
    A --> H[نظام الإشعارات<br/>Notification System]
```

## 3. التكامل مع الجهات الخارجية

| الجهة | نوع التكامل | البيانات المتبادلة |
| :--- | :--- | :--- |
| **وزارة الصحة الاتحادية** | REST API / SFTP | التقارير الصحية، التنبيهات |
| **سلطة الطيران المدني** | REST API | جداول الرحلات، بيانات الطائرات |
| **إدارة المطار** | REST API | التنسيق التشغيلي |
| **شركات الطيران** | REST API | بيانات الركاب والطواقم |
| **الجوازات والهجرة** | REST API | التحقق من هويات المسافرين |
| **الجمارك** | REST API | إجراءات الإفراج |
| **المختبرات المرجعية** | REST API | نتائج الفحوصات |

## 4. نقاط التكامل (Integration Points)

| النقطة | الوصف | البروتوكول |
| :--- | :--- | :--- |
| **استقبال الرحلات** | استقبال بيانات الرحلات من سلطة الطيران المدني | REST API |
| **استقبال المسافرين** | استقبال بيانات المسافرين من Traveler Health System | REST API |
| **إرسال الفحوصات** | إرسال عينات إلى نظام المختبرات | REST API |
| **استلام النتائج** | استلام نتائج المختبر من Laboratory System | REST API |
| **إصدار الشهادات** | إرسال الشهادات إلى Certificate Management System | REST API |
| **إرسال الإشعارات** | إرسال إشعارات عبر Notification System | REST API / SMS / Email |
| **التقارير** | إرسال التقارير إلى وزارة الصحة | SFTP / REST API |
| **الترصد** | إرسال بيانات الحالات إلى Disease Surveillance System | REST API |

## 5. معايير التكامل
- **المصادقة**: JWT / API Keys
- **التشفير**: TLS 1.3
- **تنسيق البيانات**: JSON / XML
- **تسجيل الأخطاء**: Audit Logging
- **إعادة المحاولة**: Exponential Backoff
EOF

echo -e "${GREEN}   ✅ 05_Airport_Integration.md${NC}"

# ============================================================
# 7. تحديث Airport_API.md
# ============================================================
echo -e "\n${MAGENTA}════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}📄 7. تحديث 05_API/Airport_API.md${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════════${NC}"

mkdir -p docs/05_API

cat > docs/05_API/Airport_API.md << 'EOF'
# Airport_API - واجهات نظام صحة المطارات

## 1. نظرة عامة
تدير هذه الواجهات جميع عمليات نظام صحة المطارات، بما في ذلك إدارة المطارات، الرحلات، شركات الطيران، فحص المسافرين، إدارة الطاقم، تفتيش الطائرات، العزل والحجر الصحي، الطوارئ الصحية، الترصد الوبائي، وتتبع المخالطين.

## 2. المسارات (Endpoints)

### 2.1. إدارة المطارات (Airport Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/airports/` | قائمة المطارات | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/airports/` | إضافة مطار جديد | ADMIN |
| `GET` | `/api/v1/airport/airports/{id}/` | تفاصيل مطار | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/airports/{id}/` | تحديث مطار | ADMIN |

### 2.2. إدارة الرحلات (Flight Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/flights/` | قائمة الرحلات | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/flights/` | إضافة رحلة جديدة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/{id}/` | تفاصيل رحلة | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/flights/{id}/` | تحديث رحلة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/arriving/` | الرحلات القادمة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/departing/` | الرحلات المغادرة | AIRPORT_OPERATOR |

### 2.3. إدارة شركات الطيران (Airline Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/airlines/` | قائمة شركات الطيران | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/airlines/` | إضافة شركة طيران جديدة | ADMIN |
| `GET` | `/api/v1/airport/airlines/{id}/` | تفاصيل شركة طيران | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/airlines/{id}/` | تحديث شركة طيران | ADMIN |

### 2.4. فحص المسافرين (Passenger Screening)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/screenings/` | تسجيل فحص جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/{id}/` | تفاصيل فحص | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/flight/{flight_id}/` | فحوصات رحلة | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/screenings/{id}/status/` | تحديث حالة الفحص | AIRPORT_HEALTH_OFFICER |

### 2.5. إدارة صحة الطاقم (Crew Health)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/crew/` | قائمة الطاقم | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/crew/` | تسجيل طاقم جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/crew/{id}/` | تفاصيل طاقم | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/crew/{id}/health/` | تحديث الحالة الصحية | AIRPORT_HEALTH_OFFICER |

### 2.6. الإقرار الصحي (Health Declaration)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/declarations/` | تسجيل إقرار صحي | TRAVELER |
| `GET` | `/api/v1/airport/declarations/{id}/` | تفاصيل إقرار | TRAVELER (نفسه) |
| `GET` | `/api/v1/airport/declarations/flight/{flight_id}/` | إقرارات رحلة | AIRPORT_HEALTH_OFFICER |

### 2.7. التحقق من التطعيمات (Vaccination Verification)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/vaccinations/verify/{traveler_id}/` | التحقق من تطعيمات مسافر | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/vaccinations/required/{country}/` | التطعيمات المطلوبة لدولة | AIRPORT_HEALTH_OFFICER |

### 2.8. تفتيش الطائرات (Aircraft Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/inspections/` | تسجيل تفتيش جديد | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/` | قائمة عمليات التفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/{id}/` | تفاصيل تفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/aircraft/{registration}/` | تفتيشات طائرة | HEALTH_INSPECTOR |

### 2.9. العزل والحجر الصحي (Quarantine & Isolation)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/quarantine/` | بدء عزل جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/active/` | حالات العزل النشطة | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/{id}/` | تفاصيل عزل | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/quarantine/{id}/status/` | تحديث حالة العزل | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/quarantine/{id}/end/` | إنهاء العزل | AIRPORT_HEALTH_OFFICER |

### 2.10. الإحالة الطبية (Medical Referral)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/referrals/` | إنشاء إحالة طبية | DOCTOR |
| `GET` | `/api/v1/airport/referrals/` | قائمة الإحالات | DOCTOR |
| `GET` | `/api/v1/airport/referrals/{id}/` | تفاصيل إحالة | DOCTOR |
| `PATCH` | `/api/v1/airport/referrals/{id}/status/` | تحديث حالة الإحالة | DOCTOR |

### 2.11. الطوارئ الصحية (Emergency Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/emergency/` | تسجيل بلاغ طارئ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `GET` | `/api/v1/airport/emergency/active/` | البلاغات النشطة | AIRPORT_OPERATOR, EOC_OPERATOR |
| `PATCH` | `/api/v1/airport/emergency/{id}/status/` | تحديث حالة البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `POST` | `/api/v1/airport/emergency/{id}/resolve/` | حل البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |

### 2.12. تتبع المخالطين (Contact Tracing)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/tracing/{case_id}/` | تتبع مخالطي حالة | EOC_OPERATOR |
| `GET` | `/api/v1/airport/tracing/flight/{flight_id}/` | مخالطي رحلة | EOC_OPERATOR |
| `POST` | `/api/v1/airport/tracing/notify/` | إرسال تنبيهات للمخالطين | EOC_OPERATOR |

### 2.13. إدارة الشهادات (Certificate Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/certificates/traveler/{traveler_id}/` | شهادات مسافر | TRAVELER (نفسه) |
| `POST` | `/api/v1/airport/certificates/aircraft/` | إصدار شهادة إفراج للطائرة | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/certificates/verify/{hash}/` | التحقق من شهادة | PUBLIC |

### 2.14. التفتيش على الأغذية والتموين (Food & Catering Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/food-inspections/` | تسجيل تفتيش غذائي | FOOD_INSPECTOR |
| `GET` | `/api/v1/airport/food-inspections/flight/{flight_id}/` | تفتيشات رحلة | FOOD_INSPECTOR |

### 2.15. تفتيش جودة المياه (Water Quality Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/water-inspections/` | تسجيل تفتيش مياه | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/water-inspections/flight/{flight_id}/` | تفتيشات رحلة | HEALTH_INSPECTOR |

### 2.16. مكافحة النواقل (Vector Surveillance)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/vector-surveillance/` | تسجيل مراقبة نواقل | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/vector-surveillance/` | قائمة المراقبات | HEALTH_INSPECTOR |

### 2.17. التقارير ولوحات المعلومات (Reporting & Dashboard)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/dashboard/stats/` | إحصائيات المطار | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/flights/` | إحصائيات الرحلات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/cases/` | إحصائيات الحالات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/inspections/` | إحصائيات التفتيش | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/reports/export/` | تصدير التقارير | AIRPORT_OPERATOR |

### 2.18. مركز الإشعارات (Notification Center)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/notifications/` | إرسال إشعار | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/notifications/history/` | سجل الإشعارات | AIRPORT_OPERATOR |

## 3. نماذج الطلبات والاستجابات

### 3.1. تسجيل فحص مسافر (Request)
```json
{
  "traveler_id": "uuid",
  "flight_id": "uuid",
  "temperature": 38.5,
  "symptoms": ["cough", "fever"],
  "risk_level": "MEDIUM",
  "decision": "QUARANTINED",
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
    "start_date": "2024-08-01",
    "expected_end_date": "2024-08-08",
    "location": "غرفة العزل رقم 3",
    "status": "ACTIVE"
  }
}
```

### 3.3. تسجيل تفتيش طائرة (Request)
```json
{
  "flight_id": "uuid",
  "inspection_date": "2024-08-01",
  "inspector": "أحمد محمد",
  "inspection_type": "HEALTH",
  "cabin_condition": "PASSED",
  "toilets_condition": "PASSED",
  "water_tanks_condition": "PASSED",
  "ventilation_condition": "PASSED",
  "pest_control": "PASSED",
  "result": "PASSED",
  "decision": "CLEARED",
  "notes": "جميع الإجراءات مطابقة للمعايير"
}
```

## 4. رموز الاستجابة (Status Codes)
| الكود | الوصف |
| :--- | :--- | :--- |
| `200 OK` | نجاح العملية |
| `201 Created` | تم إنشاء المورد بنجاح |
| `400 Bad Request` | طلب غير صحيح |
| `401 Unauthorized` | غير مصرح |
| `403 Forbidden` | ممنوع (صلاحية غير كافية) |
| `404 Not Found` | المورد غير موجود |
| `409 Conflict` | تعارض (مورد مكرر) |
| `500 Internal Server Error` | خطأ في الخادم |
EOF

echo -e "${GREEN}   ✅ Airport_API.md${NC}"

# ============================================================
# 8. عرض النتائج النهائية
# ============================================================
echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ ✅ ✅ تم إضافة وتحديث نظام صحة المطارات بنجاح!${NC}"
echo -e "${BLUE}============================================================${NC}"

echo -e "\n${CYAN}📁 الملفات التي تم إنشاؤها/تحديثها:${NC}"
echo -e "   📄 docs/04_Modules/17_Airport_Health_System/01_System_Overview.md"
echo -e "   📄 docs/04_Modules/17_Airport_Health_System/02_Database_Schema.md"
echo -e "   📄 docs/04_Modules/17_Airport_Health_System/03_Airport_Modules.md"
echo -e "   📄 docs/04_Modules/17_Airport_Health_System/04_Airport_Workflow.md"
echo -e "   📄 docs/04_Modules/17_Airport_Health_System/05_Airport_Integration.md"
echo -e "   📄 docs/05_API/Airport_API.md"

echo -e "\n${CYAN}📋 ملخص المكونات المضافة:${NC}"
echo -e "   ✅ 23 مكوناً رئيسياً لنظام صحة المطارات"
echo -e "   ✅ 15 جدولاً في قاعدة البيانات"
echo -e "   ✅ 18 مجموعة من واجهات API"
echo -e "   ✅ 6 سيناريوهات لسير العمل"
echo -e "   ✅ 1 مخطط للتكامل مع الأنظمة الأخرى"

echo -e "\n${YELLOW}📌 تم إنشاء نسخة احتياطية في: $BACKUP_DIR${NC}"
echo -e "${GREEN}🚀 أصبح نظام صحة المطارات جاهزاً للاستخدام!${NC}"

echo -e "\n${CYAN}📋 الخطوات التالية المقترحة:${NC}"
echo -e "   1. مراجعة الملفات للتأكد من اكتمال المحتوى"
echo -e "   2. إضافة الجداول الجديدة إلى ملف init.sql"
echo -e "   3. إنشاء تطبيق Django (backend/apps/airport_health/)"
echo -e "   4. إنشاء صفحات React (frontend/src/pages/AirportHealth/)"
echo -e "   5. تحديث workflows.md بإضافة سير العمل الجديدة"
EOF
```
