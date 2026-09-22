#!/bin/bash

# ============================================================
# update_opencode.sh - تحديث مجلد OpenCode بالكامل
# يقوم بإنشاء/تحديث جميع ملفات OpenCode بالمحتوى الجديد
# 
# الاستخدام:
#   chmod +x update_opencode.sh
#   ./update_opencode.sh
# ============================================================

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}📂 تحديث مجلد OpenCode${NC}"
echo -e "${BLUE}============================================================${NC}"

# التأكد من أننا في المجلد الصحيح
if [ ! -d "docs" ]; then
    echo -e "${RED}❌ خطأ: مجلد docs غير موجود. يرجى تشغيل السكريبت من المجلد الجذر للمشروع.${NC}"
    exit 1
fi

# إنشاء مجلد OpenCode إذا لم يكن موجوداً
mkdir -p docs/OpenCode

cd docs/OpenCode || exit 1

echo -e "${GREEN}✅ تم الانتقال إلى: $(pwd)${NC}"

# ============================================================
# 1. README.md
# ============================================================
cat > README.md << 'EOF'
# المساعد الذكي (OpenCode) - NQP

## 1. الهدف
يوفر هذا المجلد جميع الأوامر والتعليمات (Prompts) المستخدمة لتوجيه المساعد الذكي (AI) أثناء عملية تطوير منصة NQP.

## 2. التقنيات الحالية (Current Stack)
| الطبقة | التقنية | الإصدار |
| :--- | :--- | :--- |
| **Backend** | Python, Django, DRF | 3.13+, 4.2+, 3.15+ |
| **Frontend** | React, TypeScript, Vite | 19, 5.5+, 5.4+ |
| **Database** | PostgreSQL | 16+ |
| **Cache & Broker** | Redis | 7+ |
| **Async Tasks** | Celery, Celery Beat | 5.4+ |
| **ASGI/WSGI** | Gunicorn | 22+ |
| **Web Server** | Nginx | 1.24+ |
| **Container** | Docker, Kubernetes | 27+, 1.30+ |
| **CI/CD** | GitHub Actions | - |
| **Monitoring** | Prometheus, Grafana | - |

## 3. هيكل المجلدات
- `system_prompt.md` - التعليمات العامة للنظام
- `backend_prompt.md` - أوامر توليد كود Backend
- `frontend_prompt.md` - أوامر توليد كود Frontend
- `api_prompt.md` - أوامر توليد واجهات API
- `database_prompt.md` - أوامر توليد نماذج قاعدة البيانات
- `testing_prompt.md` - أوامر توليد اختبارات
- `deployment_prompt.md` - أوامر توليد ملفات النشر
- `ui_prompt.md` - أوامر توليد واجهات المستخدم
- `airport_prompt.md` - أوامر نظام صحة المطارات
- `opencode_commands.md` - قائمة الأوامر السريعة
- `mcp_system_prompt.md` - أوامر MCP لـ Cursor

## 4. كيفية استخدام هذه الأوامر
- في بيئة التطوير: اكتب الأمر المناسب في ملف الكود.
- في GitHub Copilot / Cursor: استخدم الأوامر المحددة في `opencode_commands.md`.
- في ChatGPT / Claude: انسخ محتوى الأمر المناسب وأرفق السياق المطلوب.
EOF

echo -e "${GREEN}   ✅ README.md${NC}"

# ============================================================
# 2. system_prompt.md
# ============================================================
cat > system_prompt.md << 'EOF'
# التعليمات العامة للنظام (System Prompt) - NQP

## 1. هويتك
أنت مساعد ذكي متخصص في تطوير منصة الحجر الصحي القومي (NQP). أنت خبير في:
- Python 3.13+ و Django 4.2+ و Django REST Framework
- React 19 و TypeScript و Vite
- PostgreSQL 16+ و Redis 7+
- Docker و Kubernetes
- Celery للمهام الخلفية

## 2. مبادئك
- **الجودة**: توليد كود عالي الجودة، نظيف، وقابل للصيانة.
- **الأمان**: تطبيق أفضل ممارسات الأمن السيبراني (OWASP Top 10).
- **الأداء**: كتابة كود فعال وسريع.
- **التوحيد**: الالتزام بمعايير الترميز المحددة.
- **التوثيق**: كتابة توثيق واضح لكل كود تولده.

## 3. هيكل المشروع (17 وحدة)
| الرقم | الوحدة | الوصف |
| :--- | :--- | :--- |
| 01 | Public Website | الموقع العام |
| 02 | Traveler Portal | بوابة المسافرين |
| 03 | Carrier Portal | بوابة شركات الطيران |
| 04 | Health Inspection | بوابة موظفي الحجر |
| 05 | Clinic Portal | بوابة العيادات |
| 06 | Laboratory Portal | بوابة المختبرات |
| 07 | Food Quarantine | بوابة الحجر الغذائي |
| 08 | Federal Administration | بوابة الإدارة الاتحادية |
| 09 | Public Health Emergency | بوابة الطوارئ |
| 10 | Supporting Systems | أنظمة الدعم |
| 11 | Integration Platform | منصة التكامل |
| 12 | External Integrations | التكامل الخارجي |
| 13 | Vaccination System | نظام التطعيمات |
| 14 | Hospital Integration | تكامل المستشفيات |
| 15 | Emergency Crisis Management | إدارة الأزمات |
| 16 | Mobile Application | تطبيق الجوال |
| 17 | Airport Health System | نظام صحة المطارات |

## 4. التقنيات الرئيسية
| الطبقة | التقنية | الإصدار |
| :--- | :--- | :--- |
| Backend | Python, Django, DRF | 3.13+, 4.2+, 3.15+ |
| Frontend | React, TypeScript, Vite | 19, 5.5+, 5.4+ |
| Database | PostgreSQL | 16+ |
| Cache | Redis | 7+ |
| Async Tasks | Celery, Celery Beat | 5.4+ |
| Server | Gunicorn, Nginx | 22+, 1.24+ |
| Container | Docker, Kubernetes | 27+, 1.30+ |

## 5. معايير الترميز
- Python: PEP 8
- TypeScript: Google TypeScript Style Guide
- React: Functional Components + Hooks
- Django: Class-based Views و ViewSets مع DRF
EOF

echo -e "${GREEN}   ✅ system_prompt.md${NC}"

# ============================================================
# 3. backend_prompt.md
# ============================================================
cat > backend_prompt.md << 'EOF'
# أوامر توليد Backend (Backend Prompts) - NQP

## 1. إنشاء تطبيق Django جديد
**الأمر**: `/backend create app <app_name>`

**المخرجات**: مجلد التطبيق في `backend/apps/<app_name>/` مع الملفات الأساسية.

**مثال**:
```
/backend create app airport_health
```

## 2. إنشاء نموذج Django
**الأمر**: `/backend create model <model_name> fields:<field1:type,field2:type>`

**مثال**:
```
/backend create model AirportTerminal fields:port_id:fk:Port,terminal_code:str,name_ar:str,name_en:str,capacity:int
```

## 3. إنشاء Serializer
**الأمر**: `/backend create serializer <model_name>`

**مثال**:
```
/backend create serializer AirportTerminal
```

## 4. إنشاء ViewSet
**الأمر**: `/backend create viewset <model_name>`

**مثال**:
```
/backend create viewset AirportTerminal
```

## 5. إنشاء Service
**الأمر**: `/backend create service <service_name>`

**مثال**:
```
/backend create service AirportScreeningService
```

## 6. إنشاء Celery Task
**الأمر**: `/backend create task <task_name>`

**مثال**:
```
/backend create task process_airport_manifest
```

## 7. إنشاء نموذج Admin
**الأمر**: `/backend create admin <model_name>`

**مثال**:
```
/backend create admin AirportTerminal
```

## 8. إنشاء URL
**الأمر**: `/backend create url <app_name> <path>`

**مثال**:
```
/backend create url airport /airport/
```

## 9. إنشاء Permission
**الأمر**: `/backend create permission <permission_name> resource:<resource> action:<action>`

**مثال**:
```
/backend create permission CAN_PERFORM_AIRPORT_SCREENING resource:AIRPORT action:SCREEN
```
EOF

echo -e "${GREEN}   ✅ backend_prompt.md${NC}"

# ============================================================
# 4. frontend_prompt.md
# ============================================================
cat > frontend_prompt.md << 'EOF'
# أوامر توليد Frontend (Frontend Prompts) - NQP

## 1. إنشاء مكون React جديد
**الأمر**: `/frontend create component <component_name>`

**مثال**:
```
/frontend create component AirportScreeningForm
```

## 2. إنشاء صفحة جديدة
**الأمر**: `/frontend create page <page_name>`

**مثال**:
```
/frontend create page SectorsPorts
```

## 3. إنشاء نموذج (Form)
**الأمر**: `/frontend create form <form_name>`

**مثال**:
```
/frontend create form AirportScreeningForm
```

## 4. إنشاء جدول (Table)
**الأمر**: `/frontend create table <table_name>`

**مثال**:
```
/frontend create table PortsTable
```

## 5. إنشاء رسم بياني (Chart)
**الأمر**: `/frontend create chart <chart_name>`

**مثال**:
```
/frontend create chart AirportStatsChart
```

## 6. إنشاء Hook
**الأمر**: `/frontend create hook <hook_name>`

**مثال**:
```
/frontend create hook useAirportScreenings
```

## 7. إنشاء Service (API Client)
**الأمر**: `/frontend create service <service_name>`

**مثال**:
```
/frontend create service AirportService
```

## 8. إنشاء Slice (Redux Toolkit)
**الأمر**: `/frontend create slice <slice_name>`

**مثال**:
```
/frontend create slice airport
```

## 9. إنشاء Route
**الأمر**: `/frontend create route <path> <component>`

**مثال**:
```
/frontend create route /airport/dashboard AirportDashboard
```
EOF

echo -e "${GREEN}   ✅ frontend_prompt.md${NC}"

# ============================================================
# 5. api_prompt.md
# ============================================================
cat > api_prompt.md << 'EOF'
# أوامر توليد واجهات API (API Prompts) - NQP

## 1. إنشاء نقطة نهاية API جديدة
**الأمر**: `/api create endpoint <path> method:<method>`

**مثال**:
```
/api create endpoint /airport/screenings method:POST
```

## 2. إنشاء Serializer
**الأمر**: `/api create serializer <model_name>`

**مثال**:
```
/api create serializer AirportScreening
```

## 3. إنشاء Filter
**الأمر**: `/api create filter <model_name>`

**مثال**:
```
/api create filter AirportScreening
```

## 4. إنشاء Permission
**الأمر**: `/api create permission <permission_name>`

**مثال**:
```
/api create permission IsAirportHealthOfficer
```

## 5. إنشاء Documentation (OpenAPI)
**الأمر**: `/api create docs <app_name>`

**مثال**:
```
/api create docs airport
```

## 6. إنشاء API Test
**الأمر**: `/api create test <endpoint_name>`

**مثال**:
```
/api create test airport_screening
```

## 7. إنشاء Throttle
**الأمر**: `/api create throttle <throttle_name>`

**مثال**:
```
/api create throttle AirportScreeningThrottle
```
EOF

echo -e "${GREEN}   ✅ api_prompt.md${NC}"

# ============================================================
# 6. database_prompt.md
# ============================================================
cat > database_prompt.md << 'EOF'
# أوامر توليد قاعدة البيانات (Database Prompts) - NQP

## 1. إنشاء نموذج Django جديد
**الأمر**: `/database create model <model_name> fields:<field1:type,field2:type>`

**مثال**:
```
/database create model AirportTerminal fields:port_id:fk:Port,terminal_code:str,name_ar:str,name_en:str
```

## 2. إنشاء هجرة (Migration)
**الأمر**: `/database create migration <app_name> <description>`

**مثال**:
```
/database create migration airport add_aircraft_inspections
```

## 3. إنشاء فهرس (Index)
**الأمر**: `/database create index <model_name> <field_name>`

**مثال**:
```
/database create index AirportScreening traveler_id
```

## 4. إنشاء علاقة (Relationship)
**الأمر**: `/database create relationship <model1> <model2> type:<type>`

**مثال**:
```
/database create relationship AirportTerminal Port type:ForeignKey
```

## 5. إنشاء JSON Field
**الأمر**: `/database create jsonfield <model_name> <field_name>`

**مثال**:
```
/database create jsonfield AirportScreening symptoms
```

## 6. إنشاء Constraint
**الأمر**: `/database create constraint <model_name> <constraint_type>`

**مثال**:
```
/database create constraint AirportScreening CheckConstraint risk_level
```

## 7. إنشاء Query Optimized
**الأمر**: `/database create query <model_name> <method_name>`

**مثال**:
```
/database create query AirportScreening get_active_screenings
```
EOF

echo -e "${GREEN}   ✅ database_prompt.md${NC}"

# ============================================================
# 7. testing_prompt.md
# ============================================================
cat > testing_prompt.md << 'EOF'
# أوامر توليد اختبارات (Testing Prompts) - NQP

## 1. إنشاء اختبار وحدة (Unit Test) لـ Backend
**الأمر**: `/testing create unit <app_name> <target>`

**مثال**:
```
/testing create unit airport AirportScreeningModel
```

## 2. إنشاء اختبار وحدة (Unit Test) لـ Frontend
**الأمر**: `/testing create unit <component_name>`

**مثال**:
```
/testing create unit AirportScreeningForm
```

## 3. إنشاء اختبار تكامل (Integration Test)
**الأمر**: `/testing create integration <app_name> <feature>`

**مثال**:
```
/testing create integration airport screening_flow
```

## 4. إنشاء اختبار أداء (Performance Test)
**الأمر**: `/testing create performance <endpoint_name>`

**مثال**:
```
/testing create performance /api/v1/airport/screenings/
```

## 5. إنشاء اختبار أمان (Security Test)
**الأمر**: `/testing create security <endpoint_name>`

**مثال**:
```
/testing create security /api/v1/airport/screenings/
```

## 6. إنشاء اختبار UAT (User Acceptance Test)
**الأمر**: `/testing create uat <scenario_name>`

**مثال**:
```
/testing create uat airport_screening
```

## 7. إنشاء بيانات اختبار (Fixtures)
**الأمر**: `/testing create fixture <model_name>`

**مثال**:
```
/testing create fixture AirportTerminal
```
EOF

echo -e "${GREEN}   ✅ testing_prompt.md${NC}"

# ============================================================
# 8. deployment_prompt.md
# ============================================================
cat > deployment_prompt.md << 'EOF'
# أوامر توليد النشر (Deployment Prompts) - NQP

## 1. إنشاء Dockerfile
**الأمر**: `/deployment create dockerfile <service>`

**مثال**:
```
/deployment create dockerfile backend
```

## 2. إنشاء docker-compose
**الأمر**: `/deployment create compose <services>`

**مثال**:
```
/deployment create compose backend,frontend,postgres,redis
```

## 3. إنشاء Kubernetes Deployment
**الأمر**: `/deployment create k8s <service>`

**مثال**:
```
/deployment create k8s backend
```

## 4. إنشاء GitHub Actions Workflow
**الأمر**: `/deployment create workflow <name>`

**مثال**:
```
/deployment create workflow ci-cd
```

## 5. إنشاء Nginx Config
**الأمر**: `/deployment create nginx <domain>`

**مثال**:
```
/deployment create nginx nqp.gov.sd
```

## 6. إنشاء SSL Certificate
**الأمر**: `/deployment create ssl <domain>`

**مثال**:
```
/deployment create ssl nqp.gov.sd
```

## 7. إنشاء Backup Script
**الأمر**: `/deployment create backup <service>`

**مثال**:
```
/deployment create backup postgres
```
EOF

echo -e "${GREEN}   ✅ deployment_prompt.md${NC}"

# ============================================================
# 9. ui_prompt.md
# ============================================================
cat > ui_prompt.md << 'EOF'
# أوامر توليد واجهات المستخدم (UI Prompts) - NQP

## 1. إنشاء واجهة تسجيل الدخول
**الأمر**: `/ui create login`

**مثال**:
```
/ui create login
```

## 2. إنشاء Dashboard
**الأمر**: `/ui create dashboard <type>`

**مثال**:
```
/ui create dashboard traveler
```

## 3. إنشاء نموذج
**الأمر**: `/ui create form <form_name>`

**مثال**:
```
/ui create form AirportScreeningForm
```

## 4. إنشاء جدول
**الأمر**: `/ui create table <table_name>`

**مثال**:
```
/ui create table PortsTable
```

## 5. إنشاء رسم بياني
**الأمر**: `/ui create chart <chart_name>`

**مثال**:
```
/ui create chart AirportStatsChart
```

## 6. إنشاء Sidebar / Navbar
**الأمر**: `/ui create navigation <type>`

**مثال**:
```
/ui create navigation sidebar
```

## 7. إنشاء Modal / Dialog
**الأمر**: `/ui create modal <modal_name>`

**مثال**:
```
/ui create modal AirportEmergencyModal
```

## 8. إنشاء Toast / Notification
**الأمر**: `/ui create toast`

**مثال**:
```
/ui create toast
```
EOF

echo -e "${GREEN}   ✅ ui_prompt.md${NC}"

# ============================================================
# 10. airport_prompt.md (جديد)
# ============================================================
cat > airport_prompt.md << 'EOF'
# أوامر توليد نظام صحة المطارات (Airport Health Prompts) - NQP

## 1. إنشاء نظام صحة المطارات
**الأمر**: `/airport create system`

**الوصف**: إنشاء الهيكل الكامل لنظام صحة المطارات (المجلدات، النماذج، واجهات API، الشاشات).

**المخرجات**:
- `backend/apps/airport_health/` مع جميع الملفات.
- `frontend/src/pages/AirportHealth/` مع جميع الشاشات.
- `docs/04_Modules/17_Airport_Health_System/` مع جميع الملفات.

**مثال**:
```
/airport create system
```

## 2. إنشاء نموذج صالة مطار
**الأمر**: `/airport create terminal <terminal_code>`

**مثال**:
```
/airport create terminal T1
```

## 3. إنشاء نقطة فحص
**الأمر**: `/airport create screening-point <point_code> type:<ARRIVAL|DEPARTURE|TRANSIT|CREW>`

**مثال**:
```
/airport create screening-point SP-01 type:ARRIVAL
```

## 4. تسجيل فحص مسافر
**الأمر**: `/airport create screening <traveler_id> <flight_id>`

**مثال**:
```
/airport create screening traveler-123 flight-456
```

## 5. تسجيل مسافر عابر
**الأمر**: `/airport create transit <traveler_id> <arrival_flight> <departure_flight>`

**مثال**:
```
/airport create transit traveler-123 flight-456 flight-789
```

## 6. تفعيل طوارئ في المطار
**الأمر**: `/airport create emergency <terminal_id> type:<SUSPECTED_CASE|OUTBREAK|BIOHAZARD>`

**مثال**:
```
/airport create emergency terminal-123 type:SUSPECTED_CASE
```

## 7. تتبع مخالطين
**الأمر**: `/airport create tracing <case_id>`

**مثال**:
```
/airport create tracing case-123
```

## 8. إنشاء تقرير مطار
**الأمر**: `/airport create report <period>`

**مثال**:
```
/airport create report daily
```
EOF

echo -e "${GREEN}   ✅ airport_prompt.md${NC}"

# ============================================================
# 11. opencode_commands.md
# ============================================================
cat > opencode_commands.md << 'EOF'
# قائمة الأوامر السريعة (Quick Commands) - NQP

## 1. الأوامر العامة
| الأمر | الوصف |
| :--- | :--- |
| `/help` | عرض قائمة الأوامر المتاحة |
| `/version` | عرض إصدار المشروع |
| `/status` | عرض حالة المشروع |

## 2. أوامر Backend
| الأمر | الوصف |
| :--- | :--- |
| `/backend create app <name>` | إنشاء تطبيق Django جديد |
| `/backend create model <name> fields:<f1:t1>` | إنشاء نموذج Django جديد |
| `/backend create serializer <name>` | إنشاء Serializer لـ DRF |
| `/backend create viewset <name>` | إنشاء ViewSet لـ DRF |
| `/backend create service <name>` | إنشاء خدمة جديدة |
| `/backend create task <name>` | إنشاء مهمة Celery جديدة |
| `/backend create admin <name>` | إنشاء تسجيل Admin |
| `/backend create url <app> <path>` | إضافة مسار جديد |
| `/backend create permission <name> resource:<r> action:<a>` | إنشاء صلاحية جديدة |

## 3. أوامر Frontend
| الأمر | الوصف |
| :--- | :--- |
| `/frontend create component <name>` | إنشاء مكون React جديد |
| `/frontend create page <name>` | إنشاء صفحة جديدة |
| `/frontend create form <name>` | إنشاء نموذج (React Hook Form) |
| `/frontend create table <name>` | إنشاء جدول (AG Grid) |
| `/frontend create chart <name>` | إنشاء رسم بياني (Recharts) |
| `/frontend create hook <name>` | إنشاء Custom Hook |
| `/frontend create service <name>` | إنشاء خدمة (API Client) |
| `/frontend create slice <name>` | إنشاء Slice (Redux Toolkit) |
| `/frontend create route <path> <component>` | إضافة مسار (React Router) |

## 4. أوامر API
| الأمر | الوصف |
| :--- | :--- |
| `/api create endpoint <path> method:<m>` | إنشاء نقطة نهاية API جديدة |
| `/api create serializer <name>` | إنشاء Serializer لـ DRF |
| `/api create filter <name>` | إنشاء FilterSet |
| `/api create permission <name>` | إنشاء Permission Class |
| `/api create docs <app>` | إنشاء توثيق OpenAPI |
| `/api create test <endpoint>` | إنشاء اختبار API |
| `/api create throttle <name>` | إنشاء (Rate Limiting) |

## 5. أوامر قاعدة البيانات
| الأمر | الوصف |
| :--- | :--- |
| `/database create model <name> fields:<f1:t1>` | إنشاء نموذج Django جديد |
| `/database create migration <app> <desc>` | إنشاء هجرة (Migration) |
| `/database create index <model> <field>` | إنشاء فهرس (Index) |
| `/database create relationship <m1> <m2> type:<t>` | إنشاء علاقة بين نموذجين |
| `/database create jsonfield <model> <field>` | إضافة حقل JSONB |
| `/database create constraint <model> <type>` | إنشاء قيد (Constraint) |
| `/database create query <model> <method>` | إنشاء استعلام محسّن |

## 6. أوامر الاختبار
| الأمر | الوصف |
| :--- | :--- |
| `/testing create unit <app> <target>` | إنشاء اختبار وحدة (Backend) |
| `/testing create unit <component>` | إنشاء اختبار وحدة (Frontend) |
| `/testing create integration <app> <feature>` | إنشاء اختبار تكامل |
| `/testing create performance <endpoint>` | إنشاء اختبار أداء |
| `/testing create security <endpoint>` | إنشاء اختبار أمان |
| `/testing create uat <scenario>` | إنشاء اختبار UAT |
| `/testing create fixture <model>` | إنشاء بيانات اختبار (Fixtures) |

## 7. أوامر النشر
| الأمر | الوصف |
| :--- | :--- |
| `/deployment create dockerfile <service>` | إنشاء Dockerfile |
| `/deployment create compose <services>` | إنشاء docker-compose.yml |
| `/deployment create k8s <service>` | إنشاء ملفات Kubernetes |
| `/deployment create workflow <name>` | إنشاء GitHub Actions Workflow |
| `/deployment create nginx <domain>` | إنشاء ملف تكوين Nginx |
| `/deployment create ssl <domain>` | إنشاء شهادة SSL |
| `/deployment create backup <service>` | إنشاء سكربت نسخ احتياطي |

## 8. أوامر واجهات المستخدم
| الأمر | الوصف |
| :--- | :--- |
| `/ui create login` | إنشاء صفحة تسجيل الدخول |
| `/ui create dashboard <type>` | إنشاء لوحة تحكم |
| `/ui create form <name>` | إنشاء نموذج |
| `/ui create table <name>` | إنشاء جدول |
| `/ui create chart <name>` | إنشاء رسم بياني |
| `/ui create navigation <type>` | إنشاء شريط تنقل |
| `/ui create modal <name>` | إنشاء نافذة منبثقة |
| `/ui create toast` | إعداد الإشعارات |

## 9. أوامر نظام صحة المطارات (🆕)
| الأمر | الوصف |
| :--- | :--- |
| `/airport create system` | إنشاء هيكل نظام صحة المطارات بالكامل |
| `/airport create terminal <code>` | إنشاء صالة مطار جديدة |
| `/airport create screening-point <code> type:<t>` | إنشاء نقطة فحص جديدة |
| `/airport create screening <traveler> <flight>` | تسجيل فحص مسافر |
| `/airport create transit <traveler> <arrival> <departure>` | تسجيل مسافر عابر |
| `/airport create emergency <terminal> type:<t>` | تفعيل طوارئ في المطار |
| `/airport create tracing <case_id>` | تتبع مخالطين |
| `/airport create report <period>` | إنشاء تقرير مطار |
EOF

echo -e "${GREEN}   ✅ opencode_commands.md${NC}"

# ============================================================
# 12. mcp_system_prompt.md (جديد)
# ============================================================
cat > mcp_system_prompt.md << 'EOF'
# أوامر MCP - Model Context Protocol (مخصص لـ Cursor)

## 1. نظرة عامة
هذا الملف يحتوي على أوامر مخصصة لـ (Model Context Protocol) المستخدم في أدوات مثل Cursor، لتوفير سياق دقيق للمساعد الذكي عند توليد الكود.

## 2. أوامر السياق (Context Commands)
| الأمر | الوصف |
| :--- | :--- |
| `/context show` | عرض السياق الحالي للمشروع |
| `/context update` | تحديث السياق بناءً على آخر التغييرات |
| `/context reset` | إعادة تعيين السياق |

## 3. أوامر المشروع (Project Commands)
| الأمر | الوصف |
| :--- | :--- |
| `/project init` | تهيئة المشروع باستخدام أحدث التقنيات |
| `/project status` | عرض حالة المشروع الحالية |
| `/project summary` | عرض ملخص المشروع |

## 4. أوامر التطوير (Development Commands)
| الأمر | الوصف |
| :--- | :--- |
| `/dev start` | بدء بيئة التطوير |
| `/dev test` | تشغيل جميع الاختبارات |
| `/dev lint` | تشغيل أدوات التحقق (Lint) |
| `/dev format` | تنسيق جميع الملفات |

## 5. أوامر قاعدة البيانات (Database Commands)
| الأمر | الوصف |
| :--- | :--- |
| `/db migrate` | تشغيل ترحيلات قاعدة البيانات |
| `/db seed` | تعبئة قاعدة البيانات بالبيانات الأولية |
| `/db reset` | إعادة تعيين قاعدة البيانات |
| `/db shell` | فتح واجهة قاعدة البيانات |

## 6. أوامر Git (Git Commands)
| الأمر | الوصف |
| :--- | :--- |
| `/git commit <message>` | تنفيذ commit مع رسالة |
| `/git push` | دفع التغييرات إلى المستودع |
| `/git pull` | سحب التغييرات من المستودع |
| `/git status` | عرض حالة المستودع |
EOF

echo -e "${GREEN}   ✅ mcp_system_prompt.md${NC}"

# ============================================================
# عرض النتائج النهائية
# ============================================================
echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ ✅ ✅ تم تحديث مجلد OpenCode بالكامل!${NC}"
echo -e "${BLUE}============================================================${NC}"

echo -e "\n${CYAN}📁 الملفات التي تم إنشاؤها/تحديثها:${NC}"
echo -e "   📄 README.md"
echo -e "   📄 system_prompt.md"
echo -e "   📄 backend_prompt.md"
echo -e "   📄 frontend_prompt.md"
echo -e "   📄 api_prompt.md"
echo -e "   📄 database_prompt.md"
echo -e "   📄 testing_prompt.md"
echo -e "   📄 deployment_prompt.md"
echo -e "   📄 ui_prompt.md"
echo -e "   📄 airport_prompt.md (جديد)"
echo -e "   📄 opencode_commands.md"
echo -e "   📄 mcp_system_prompt.md (جديد)"

echo -e "\n${GREEN}🚀 أصبح مجلد OpenCode جاهزاً للاستخدام!${NC}"
echo -e "${YELLOW}📌 الموقع: $(pwd)${NC}"
k
