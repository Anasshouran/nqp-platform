# 🔐 14. Administration & Security — التصميم التنفيذي المقترح

> وحدة الحوكمة المركزية لنظام رقابة الأغذية (Food Safety System). هذا التصميم يعتمَد كأساس رسمي للوحدة، مع إضافة عناصر أمنية وحوكمية تجعلها مناسبة للتشغيل القومي.

## الهيكل الشجري للوحدة

```text
Administration & Security
│
├── 14.1 User Management
│   ├── Users
│   ├── User Profiles
│   ├── Organizational Units
│   ├── User Roles
│   ├── User Scope
│   ├── Account Status
│   └── 2FA / MFA
│
├── 14.2 Roles & Permissions
│   ├── Role Management
│   ├── Permission Management
│   ├── Role-Permission Matrix
│   ├── Data Scope
│   └── Delegation
│
├── 14.3 Workflow Configuration
│   ├── Workflow Definition
│   ├── Workflow Stages
│   ├── Transitions
│   ├── Role Assignment
│   ├── SLA
│   └── Escalation Rules
│
├── 14.4 Reference Data
│   ├── Food Categories
│   ├── Products
│   ├── Countries
│   ├── Ports
│   ├── Laboratories
│   ├── Inspection Types
│   ├── Sampling Types
│   ├── Test Types
│   └── Documents
│
├── 14.5 Risk Configuration
│   ├── Risk Factors
│   ├── Risk Scores
│   ├── Risk Levels
│   ├── Sampling Rules
│   └── Alert Rules
│
├── 14.6 Fee Configuration
│   ├── Fee Types
│   ├── Fee Rules
│   ├── Laboratory Fees
│   ├── Inspection Fees
│   ├── Certificate Fees
│   └── Effective Dates
│
├── 14.7 Audit & Compliance
│   ├── Audit Log
│   ├── Login History
│   ├── Change History
│   ├── Decision History
│   ├── Export History
│   └── Security Events
│
├── 14.8 Notifications
│   ├── Notification Templates
│   ├── In-App
│   ├── Email
│   ├── SMS
│   ├── WhatsApp Gateway
│   └── Escalations
│
├── 14.9 Integration Configuration
│   ├── Customs API
│   ├── Laboratory API
│   ├── Standards API
│   ├── Payment API
│   └── National Gateway
│
└── 14.10 System Configuration
    ├── General Settings
    ├── Security Policies
    ├── SLA Settings
    ├── Sampling Settings
    ├── Risk Settings
    ├── Certificate Settings
    └── Maintenance Settings
```

---

# 👥 1. User Management

الأفضل أن يكون المستخدم مرتبطًا بهيكل تنظيمي واضح:

```text
User
 │
 ├── Organization
 │
 ├── Sector
 │
 ├── Port / Facility
 │
 ├── Department
 │
 ├── Role
 │
 └── Data Scope
```

مثال:

```text
محمد أحمد
│
├── Sector: البحر الأحمر
├── Port: بورتسودان
├── Department: رقابة الأغذية
├── Role: FOOD_DEPARTMENT_HEAD
└── Scope: UNIT_AND_BELOW
```

وبذلك لا يكفي أن يكون المستخدم **رئيس قسم**؛ بل يعرف النظام **أي قسم وأي منفذ وأي قطاع**.

---

# 🔑 2. RBAC + Data Scope

أنصح بأن يعتمد النظام على مستويين:

### Role-Based Access Control

```text
WHO CAN DO WHAT?
```

### Data Scope

```text
WHO CAN SEE WHICH DATA?
```

مثال:

```text
FOOD_GENERAL_DIRECTOR
        ↓
ALL NATIONAL DATA

FOOD_SECTOR_DIRECTOR
        ↓
SECTOR DATA

FOOD_DEPARTMENT_HEAD
        ↓
PORT / DEPARTMENT DATA

FOOD_INSPECTOR
        ↓
ASSIGNED CASES
```

وهذا مهم جدًا لمنع أن يستطيع مستخدم في منفذ معين رؤية بيانات منفذ آخر.

---

# 🔐 3. Security Policy

أضيف إلى التصميم سياسة أمن مركزية:

```text
Security Policy
│
├── Password Policy
├── MFA Policy
├── Session Timeout
├── Failed Login Policy
├── Account Lockout
├── IP Restrictions
├── Device Tracking
├── API Authentication
└── Security Alerts
```

مثلاً:

```text
Failed Login Attempts = 5
Account Lock Duration = 30 min
Session Timeout = 30 min
MFA = Required for privileged users
```

---

# 🧾 4. Audit Log

أقترح أن يكون سجل التدقيق أكثر تفصيلًا:

```text
AuditLog
│
├── user_id
├── username
├── role
├── organization
├── sector
├── port
├── action
├── entity_type
├── entity_id
├── old_value
├── new_value
├── timestamp
├── ip_address
├── device
├── request_id
└── result
```

مثال:

```text
User:
Ahmed Ali

Action:
FOOD_DECISION_APPROVE

Entity:
Shipment #FS-2026-00125

Old Status:
UNDER_REVIEW

New Status:
APPROVED

Timestamp:
2026-08-23 18:42:11

IP:
10.x.x.x

Result:
SUCCESS
```

**ولا يسمح لأي مستخدم عادي بتعديل أو حذف Audit Log.**

---

# 🔄 5. Workflow Engine

بدل أن يكون Workflow ثابتًا في الكود، يكون Configurable:

```text
Workflow
│
├── Workflow Definition
│
├── Stage
│   ├── Name
│   ├── Role
│   ├── SLA
│   └── Required
│
├── Transition
│   ├── From
│   ├── Event
│   ├── To
│   └── Permission
│
└── Escalation
```

مثلاً:

```text
REGISTERED
     │
     ▼
AWAITING_PAYMENT
     │
     ▼
PAID
     │
     ▼
ASSIGNED_INSPECTOR
     │
     ▼
INSPECTION
     │
     ├── No Sampling ────────┐
     │                       │
     └── Sampling            │
            ↓                │
        LABORATORY            │
            ↓                │
       RESULT_READY           │
            └────────┬────────┘
                     ▼
                UNDER_REVIEW
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       APPROVED    HOLD      REJECTED
```

---

# ⚠️ 6. Risk Configuration

يجب فصل **Risk Configuration** عن Reference Data، لأنها تتحكم في قرارات النظام:

```text
Risk Engine Configuration
│
├── Product Risk
├── Country Risk
├── Importer Risk
├── Previous Violations
├── Laboratory History
├── International Alerts
├── Risk Weight
├── Risk Threshold
└── Sampling Rule
```

مثال:

```text
Risk Score
│
├── 0–25    LOW
├── 26–50   MEDIUM
├── 51–75   HIGH
└── 76–100  CRITICAL
```

والنظام يحول النتيجة تلقائيًا إلى:

```text
Risk Level
      ↓
Inspection Level
      ↓
Sampling Rate
      ↓
Laboratory Tests
      ↓
Decision Support
```

---

# 🧪 7. Sampling Configuration

بدل تثبيت النسب في الكود:

```text
Sampling Rules

LOW       → 25%
MEDIUM    → 75%
HIGH       → 100%
CRITICAL  → 100%
```

ويجب أن يحتوي كل Rule على:

```text
effective_from
effective_to
approved_by
version
status
```

حتى يمكن معرفة **أي سياسة كانت سارية وقت اتخاذ القرار**.

---

# 💰 8. Fee Configuration

هذه إضافة مهمة جدًا للنظام الذي تعمل عليه:

```text
Fee Rule
│
├── Fee Type
├── Product Category
├── Quantity Range
├── Unit
├── Amount
├── Currency
├── Port
├── Import / Export
├── Effective From
├── Effective To
└── Status
```

وبذلك يمكن تحديث رسوم 2025 أو أي رسوم مستقبلية دون تعديل البرنامج.

---

# 🔗 9. Integration Security

كل تكامل يجب أن يكون له إعداد مستقل:

```text
Integration
│
├── Customs
├── Standards
├── Laboratory
├── Payment
├── Ports
├── National Portal
└── National API Gateway
```

ويتم حفظ:

```text
API URL
API Version
Authentication Method
Timeout
Retry Policy
Status
Last Successful Sync
Last Failed Sync
```

**مفاتيح API والأسرار لا تظهر للمستخدمين في الواجهة ولا تحفظ كنص مكشوف في قاعدة البيانات.**

---

# 🔔 10. Notification Engine

بدلاً من مجرد إرسال رسائل، يكون هناك محرك إشعارات:

```text
Event
  ↓
Notification Rule
  ↓
Target Role
  ↓
Target User
  ↓
Channel
```

مثال:

```text
Lab Result = NON_CONFORMING
        ↓
Critical Alert
        ↓
Food Safety Manager
Sector Director
General Director
        ↓
In-App + SMS
```

---

# 🖥️ 11. Administration Dashboard

ويكون للمدير العام ومدير النظام Dashboard خاص:

```text
┌──────────────────────────────────────────────────────────────┐
│ ⚙️ Administration & Security                                 │
├──────────────────────────────────────────────────────────────┤
│ Users                 248                                    │
│ Active Users          231                                    │
│ Locked Accounts         4                                    │
│ Roles                  18                                    │
│ Permissions           146                                    │
│ Workflows               9                                    │
│ Reference Records   2,840                                    │
│ Security Alerts         7                                    │
│ Audit Events        18,542                                    │
└──────────────────────────────────────────────────────────────┘
```

### Security Alerts

```text
🔴 Multiple failed login attempts
🔴 Privileged account login
🟠 Unauthorized API request
🟠 Configuration changed
🟡 Expiring account
```

---

# 🏛️ 12. الارتباط مع NQP

الهيكل الأفضل:

```text
                    NQP Identity & Security
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
             Users           RBAC          Audit
               │              │              │
               └──────────────┼──────────────┘
                              ▼
                    Food Safety System
                              │
          ┌───────────────────┼──────────────────┐
          ▼                   ▼                  ▼
    Food Roles          Food Permissions    Food Scope
```

أي أن **Food Safety System لا ينشئ نظام مستخدمين منفصلًا عن منصة الحجر الصحي القومي**، وإنما يستخدم الهوية المركزية ويضيف:

* Food Roles
* Food Permissions
* Food Data Scope
* Food Workflow
* Food Configuration

---

# 🔒 النتيجة النهائية

بهذا تصبح الوحدة رقم **14 — Administration & Security** مسؤولة عن:

**Identity → Users → Roles → Permissions → Data Scope → Workflow → Risk Rules → Sampling Rules → Fees → Integrations → Notifications → Audit → Security**

وهذا يجعلها **طبقة الحوكمة المركزية لنظام رقابة الأغذية**، مع بقائها مرتبطة مباشرة ببنية الأمان والهوية المركزية لمنصة **NQP**.

---

## ⚙️ حالة التنفيذ مقابل المنصة القائمة (NQP)

| القسم | الحالة | التنفيذ الحالي |
|---|---|---|
| 14.1 Users | ✅ جزئي | `accounts.User` — هوية مركزية (`email`, `full_name`, `user_type`) + حقل `sector` FK؛ `is_mfa_enabled` موجود كحقل |
| 14.2 RBAC + Scope | ✅ مطبَّق | `Role`/`Permission` + `RoleAssignment` مع `ScopeType` (GLOBAL/SECTOR/PORT/STATION/…)؛ `seed_rbac` يبذر 31 دورًا و80 صلاحية؛ الأدوار الغذائية: `FOOD_DIRECTOR` (قومي)، `SECTOR_HEAD` (قطاع)، `STATION_HEAD` (قسم)، `FOOD_INSPECTOR` (مهام مُسندة) — نفس سلم الوثيقة تمامًا |
| 14.3 Workflow | ❌ مؤجل | الحالات مثبتة في الكود (`FoodShipment.ShipmentStatus`) — المحرك المهيَّأ يتطلب نماذج WorkflowDefinition/Stage/Transition |
| 14.4 Reference Data | ✅ مطبَّق | `masterdata` (Sector/State/EntryPoint/Terminal/Station)، `FoodProduct`، `MaterialCatalog`، الدول، بذور المعايير وأنواع الفحوص |
| 14.5 Risk Config | ❌ مؤجل | تطبيق `risk_engine` قائم كهيكل؛ قواعد أخذ العينات تعمل عبر `SamplingPolicy` (بإصدارات وفعالية زمنية) |
| 14.6 Fee Config | ✅ مطبَّق | `FeeType` + جدول رسوم اللائحة 2025 بأوامر بذر (`seed_quarantine_fees`/`seed_food_fees`) مع فئات ومبالغ وعملة |
| 14.7 Audit & Compliance | ✅ جزئي | `AuditLog` (فعل/كائن/تفاصيل JSON/IP/وقت) يُسجَّل على القرار والإسناد والمراجعة؛ لا تعديل/حذف من أي دور — التوسعة (old/new value, device, request_id) مؤجلة |
| 14.8 Notifications | ✅ جزئي | `NotificationTemplate` (قنوات In-App/Email/SMS) + `NotificationLog`؛ تُرسل إشعارات فعلية عند الإسناد والمراجعة والقرار |
| 14.9 Integrations | ✅ جزئي | `integration`: `ExternalEntity`/`DeveloperApp`/`WebhookEndpoint`/`IntegrationLog`؛ سياسة إخفاء المفاتيح مطلوبة قبل ربط حقيقي |
| 14.10 System Config | ❌ مؤجل | `SystemSettings` موجودة كمستند تصميم اتحادي فقط |

**قواعد حاكمة معتمدة:** لا يستخدم نظام الأغذية هوية منفصلة — الهوية والأمان من NQP المركزية؛ وسجل التدقيق غير قابل للتعديل أو الحذف من أي واجهة.
