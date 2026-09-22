
---

### 📄 2. `Network.md` (تصميم الشبكة)

```markdown
# تصميم الشبكة (Network Design) - NQP

## 1. نظرة عامة
تم تصميم شبكة منصة NQP وفق نموذج (DMZ - الشبكة الداخلية - الشبكة المعزولة) لضمان أعلى مستويات الأمان والفصل بين المكونات.

## 2. هيكل الشبكة

```mermaid
flowchart TD
    subgraph Internet["🌍 الإنترنت"]
        Users[المستخدمون]
    end

    subgraph DMZ["🛡️ منطقة منزوعة السلاح (DMZ)"]
        FW_External[جدار ناري خارجي]
        LB[موازن التحميل]
        WAF[جدار حماية التطبيقات]
        Nginx[Nginx Reverse Proxy]
    end

    subgraph Internal["🔒 الشبكة الداخلية"]
        subgraph App["طبقة التطبيقات"]
            FE1[Frontend-1]
            FE2[Frontend-2]
            FE3[Frontend-3]
            BE1[Backend-1]
            BE2[Backend-2]
            BE3[Backend-3]
        end
        subgraph Workers["طبقة المهام"]
            Celery1[Celery-1]
            Celery2[Celery-2]
        end
    end

    subgraph Secure["🔐 الشبكة المعزولة"]
        subgraph Data["طبقة البيانات"]
            PG_Master[PostgreSQL Master]
            PG_Replica[PostgreSQL Replica]
            Redis1[Redis-1]
            Redis2[Redis-2]
            Redis3[Redis-3]
        end
        subgraph Storage["طبقة التخزين"]
            MinIO1[MinIO-1]
            MinIO2[MinIO-2]
        end
    end

    Users --> FW_External
    FW_External --> LB
    LB --> WAF
    WAF --> Nginx
    Nginx --> FE1
    Nginx --> FE2
    Nginx --> FE3
    Nginx --> BE1
    Nginx --> BE2
    Nginx --> BE3

    BE1 --> PG_Master
    BE2 --> PG_Master
    BE3 --> PG_Master
    PG_Master --> PG_Replica

    BE1 --> Redis1
    BE2 --> Redis2
    BE3 --> Redis3
    Celery1 --> Redis1
    Celery2 --> Redis2

    BE1 --> MinIO1
    BE2 --> MinIO2
    BE3 --> MinIO1
    Celery1 --> MinIO2


    3. عناوين IP (مثال)
المكون	عنوان IP	الشبكة الفرعية
Nginx (DMZ)	10.0.0.10	10.0.0.0/24
Frontend-1	10.0.1.10	10.0.1.0/24
Frontend-2	10.0.1.11	10.0.1.0/24
Frontend-3	10.0.1.12	10.0.1.0/24
Backend-1	10.0.2.10	10.0.2.0/24
Backend-2	10.0.2.11	10.0.2.0/24
Backend-3	10.0.2.12	10.0.2.0/24
PostgreSQL Master	10.0.3.10	10.0.3.0/24
PostgreSQL Replica	10.0.3.11	10.0.3.0/24
Redis-1	10.0.3.20	10.0.3.0/24
Redis-2	10.0.3.21	10.0.3.0/24
Redis-3	10.0.3.22	10.0.3.0/24
MinIO-1	10.0.4.10	10.0.4.0/24
MinIO-2	10.0.4.11	10.0.4.0/24
4. قواعد التوجيه (Routing)
المصدر	الوجهة	المسار
DMZ	الشبكة الداخلية	عبر جدار ناري داخلي
الشبكة الداخلية	الشبكة المعزولة	عبر جدار ناري داخلي
الشبكة الداخلية	الإنترنت	عبر جدار ناري خارجي
5. مراجع

    Cisco Networking Basics: https://www.cisco.com/c/en/us/solutions/small-business/resource-center/networking-basics.html