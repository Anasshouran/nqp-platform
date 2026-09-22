# 11_Integration_Platform - منصة التكامل (Integration Platform)

## 1. الهدف الاستراتيجي
توفير طبقة وسيطة (Middleware) موحدة وآمنة وقابلة للتوسع لإدارة جميع عمليات التكامل بين مكونات منصة NQP الداخلية (البوابات وأنظمة الدعم) والأنظمة الخارجية (وزارة الصحة، الجمارك، منظمة الصحة العالمية، شركات الطيران). تهدف منصة التكامل إلى:

- **الفصل (Decoupling)**: فصل البوابات الأمامية عن أنظمة الدعم والأنظمة الخارجية، مما يسمح بتحديث أي مكون بشكل مستقل.

- **الأمان المركزي**: تطبيق سياسات المصادقة والترخيص (Authentication & Authorization) على جميع الطلبات في نقطة واحدة.

- **المرونة (Resilience)**: التعامل مع فشل الخدمات عبر آليات إعادة المحاولة (Retry) وطوابير الرسائل (Message Queues).

- **المراقبة (Observability)**: توفير رؤية شاملة لأداء جميع عمليات التكامل عبر التسجيل (Logging) والمراقبة (Monitoring).

## 2. المكونات الرئيسية (Components)

| المكون | المسؤولية | التقنية المستخدمة |
| :--- | :--- | :--- |
| **API Gateway** | نقطة الدخول الموحدة لجميع الطلبات الخارجية. توجيه الطلبات إلى الخدمات المناسبة، تطبيق (Rate Limiting)، التحقق من صحة JWT. | Django REST Framework + `django-rest-framework-simplejwt` |
| **Authentication Service** | إدارة دورة حياة المصادقة (JWT)، إدارة المستخدمين والصلاحيات (RBAC). | Django + JWT |
| **Integration Services** | تنفيذ منطق التكامل مع الأنظمة الخارجية (وزارة الصحة، الجمارك، WHO). | Celery Tasks + Django Services |
| **Message Queue** | معالجة المهام غير المتزامنة (رفع قوائم الركاب الكبيرة، إرسال الإشعارات الجماعية، توليد التقارير). | Redis (مع Celery) |
| **Audit Log** | تسجيل جميع العمليات التي تتم في النظام (من قام، متى، ماذا فعل) لأغراض المراجعة والشفافية. | Django Model (جدول `audit_logs`) |
| **Monitoring** | مراقبة صحة الخدمات، أداء الـ API، واستخدام الموارد. | Prometheus + Grafana (مع Django Prometheus) |

## 3. العمارة التفصيلية (Detailed Architecture)

```mermaid
flowchart TD
    subgraph External["الأنظمة الخارجية"]
        MOH[وزارة الصحة]
        Customs[الجمارك]
        WHO[منظمة الصحة العالمية]
        Airlines[شركات الطيران]
    end

    subgraph Integration["منصة التكامل (11)"]
        direction TB
        Gateway[API Gateway<br/>(Rate Limiting, JWT Validation)]
        Auth[Authentication Service<br/>(JWT, RBAC)]
        Queue[Message Queue<br/>(Redis + Celery)]
        Services[Integration Services<br/>(Celery Tasks)]
        Audit[Audit Log]
        Monitor[Monitoring<br/>(Prometheus + Grafana)]
    end

    subgraph Internal["المكونات الداخلية (NQP)"]
        Portals[البوابات (1-9)]
        Support[أنظمة الدعم (10)]
        DB[(قاعدة البيانات المركزية)]
    end

    External -->|"طلبات خارجية"| Gateway
    Gateway -->|"طلبات داخلية"| Internal
    Gateway --> Auth
    Gateway --> Audit
    Gateway --> Monitor
    
    Internal -->|"طلبات خارجة"| Services
    Services -->|"إرسال بيانات"| External
    Services --> Queue
    Queue -->|"معالجة غير متزامنة"| Services
    Services --> Audit
    Services --> Internal

4. نقاط القوة (Key Strengths)

    قابلية التوسع (Scalability): يمكن إضافة نسخ (Instances) جديدة من (API Gateway) و (Celery Workers) بشكل أفقي لمواجهة الأحمال الكبيرة.

    الأمان (Security): جميع الطلبات تمر عبر (API Gateway) الذي يطبق سياسات (JWT) و (CORS) و (Rate Limiting).

    المرونة (Resilience): استخدام (Message Queue) يضمن عدم فقدان البيانات في حال تعطل الخدمات.

    المراقبة (Observability): يوفر النظام سجلات شاملة ومراقبة لحظية لجميع العمليات.

5. متطلبات التشغيل (Operational Requirements)

    توفر عالي (High Availability): يجب تشغيل (API Gateway) و (Celery Workers) في وضع (Active-Active) مع (Load Balancer).

    زمن استجابة منخفض: يجب ألا يتجاوز زمن استجابة (API Gateway) 50 مللي ثانية (باستثناء زمن معالجة الخدمات الخلفية).

    النسخ الاحتياطي: يجب عمل نسخ احتياطية لقاعدة البيانات (Audit Log) يومياً.