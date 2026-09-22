# البنية التحتية (Infrastructure) - NQP

## 1. الهدف
يوفر هذا المجلد جميع الوثائق المتعلقة بالبنية التحتية لمنصة NQP، بما في ذلك (الشبكات، الخوادم، الجدران النارية، موازنات التحميل، DNS، SSL، وإدارة الأجهزة الافتراضية). تهدف هذه البنية التحتية إلى ضمان **الموثوقية، الأمان، قابلية التوسع، والأداء العالي** للمنصة.

## 2. هيكل المجلدات

```text
Infrastructure/
├── README.md                    # هذا الملف
├── Network.md                   # تصميم الشبكة
├── Firewall.md                  # إدارة الجدران النارية
├── LoadBalancer.md              # موازنات التحميل
├── DNS.md                       # إدارة DNS
├── SSL.md                       # إدارة شهادات SSL/TLS
├── Server.md                    # مواصفات الخوادم
└── VM.md                        # إدارة الأجهزة الافتراضية

3. البنية التحتية الأساسية
flowchart TD
    Internet[🌍 الإنترنت] --> Firewall1[جدار ناري خارجي]
    Firewall1 --> LB[موازن التحميل (Nginx)]
    LB --> DMZ[DMZ]
    
    subgraph DMZ["🛡️ منطقة منزوعة السلاح (DMZ)"]
        WAF[جدار حماية التطبيقات (WAF)]
        Nginx[Nginx Reverse Proxy]
    end
    
    subgraph Internal["🔒 الشبكة الداخلية"]
        Frontend[خوادم Frontend]
        Backend[خوادم Backend]
        Celery[خوادم Celery]
    end
    
    subgraph Secure["🔐 الشبكة المعزولة"]
        DB[قاعدة البيانات (PostgreSQL)]
        Redis[Redis]
        Storage[تخزين الملفات (MinIO/S3)]
    end
    
    Internet --> Firewall1
    Firewall1 --> LB
    LB --> WAF
    WAF --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Backend --> DB
    Backend --> Redis
    Backend --> Storage
    Celery --> DB
    Celery --> Redis


4. المواصفات التقنية
المكون	المواصفات	عدد النسخ
خادم Frontend	4 CPU, 8 GB RAM, 100 GB SSD	3
خادم Backend	8 CPU, 16 GB RAM, 200 GB SSD	3
خادم Celery	    4 CPU, 8 GB RAM, 100 GB SSD	2
قاعدة البيانات	16 CPU, 32 GB RAM, 500 GB SSD	2 (Master + Replica)
Redis	4 CPU, 8 GB RAM, 50 GB SSD	3 (Cluster)
تخزين الملفات	4 CPU, 8 GB RAM, 1 TB SSD	2
5. متطلبات الشبكة
الخدمة	المنفذ	البروتوكول	المصدر	الوجهة
HTTPS	443	TCP	أي	Nginx
HTTP (إعادة توجيه)	80	TCP	أي	Nginx
SSH	22	TCP	IPs معينة	جميع الخوادم
PostgreSQL	5432	TCP	Backend	قاعدة البيانات
Redis	6379	TCP	Backend, Celery	Redis
MinIO	9000	TCP	Backend	تخزين الملفات
6. مراجع

    بنية تحتية نموذجية: (AWS Well-Architected Framework)

    أفضل ممارسات الأمن: (CIS Benchmarks)

