
---

### 📄 3. `Firewall.md` (إدارة الجدران النارية)

```markdown
# إدارة الجدران النارية (Firewall Management) - NQP

## 1. نظرة عامة
يتم استخدام جدران نارية (Firewalls) لحماية البنية التحتية للمنصة من الهجمات الخارجية وتقييد الوصول بين المكونات الداخلية. يتم تطبيق سياسات (Least Privilege) للحد الأدنى من الوصول المطلوب.

## 2. أنواع الجدران النارية

| النوع | الموقع | الدور |
| :--- | :--- | :--- |
| **جدار ناري خارجي** | بين الإنترنت والشبكة | حماية الشبكة من الهجمات الخارجية. |
| **جدار ناري داخلي** | بين DMZ والشبكة الداخلية | حماية الشبكة الداخلية من DMZ. |
| **جدار ناري للتطبيقات (WAF)** | أمام Nginx | حماية التطبيقات من هجمات (SQL Injection, XSS, CSRF). |

## 3. قواعد الجدار الناري الخارجي

| القاعدة | المنفذ | البروتوكول | المصدر | الوجهة | الإجراء |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HTTPS** | 443 | TCP | أي | Nginx | السماح |
| **HTTP (إعادة توجيه)** | 80 | TCP | أي | Nginx | السماح |
| **SSH (للمسؤولين)** | 22 | TCP | IPs معينة | جميع الخوادم | السماح |
| **جميع الباقي** | أي | أي | أي | أي | الرفض |

## 4. قواعد الجدار الناري الداخلي

| القاعدة | المنفذ | البروتوكول | المصدر | الوجهة | الإجراء |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend → PostgreSQL** | 5432 | TCP | Backend | PostgreSQL | السماح |
| **Backend → Redis** | 6379 | TCP | Backend | Redis | السماح |
| **Celery → Redis** | 6379 | TCP | Celery | Redis | السماح |
| **Backend → MinIO** | 9000 | TCP | Backend | MinIO | السماح |
| **Celery → MinIO** | 9000 | TCP | Celery | MinIO | السماح |
| **SSH (للمسؤولين)** | 22 | TCP | IPs معينة | جميع الخوادم | السماح |

## 5. حماية (WAF - Web Application Firewall)

- **الحماية من SQL Injection**: تصفية الطلبات التي تحتوي على أكواد SQL ضارة.
- **الحماية من XSS**: تصفية الطلبات التي تحتوي على أكواد JavaScript ضارة.
- **الحماية من CSRF**: التحقق من (CSRF Tokens) في الطلبات.
- **الحماية من Brute Force**: تقييد عدد محاولات تسجيل الدخول الفاشلة.
- **الحماية من DDoS**: تقييد عدد الطلبات في الدقيقة.

## 6. مراجع
- **Cisco Firewall**: [https://www.cisco.com/c/en/us/products/security/firewalls/](https://www.cisco.com/c/en/us/products/security/firewalls/)
- **OWASP WAF**: [https://owasp.org/www-community/Web_Application_Firewall](https://owasp.org/www-community/Web_Application_Firewall)
- **ModSecurity**: [https://modsecurity.org/](https://modsecurity.org/)

📄 4. LoadBalancer.md (موازنات التحميل)
# موازنات التحميل (Load Balancer) - NQP

## 1. نظرة عامة
يتم استخدام موازن التحميل (Load Balancer) لتوزيع حركة المرور بين عدة نسخ (Instances) من الخدمات (Frontend و Backend) لضمان **التوفر العالي (High Availability)** و **توزيع الحمل (Load Distribution)**.

## 2. أنواع موازنات التحميل

| النوع | الموقع | الدور |
| :--- | :--- | :--- |
| **موازن تحميل خارجي** | أمام الخوادم (DMZ) | توزيع حركة المرور الواردة من الإنترنت. |
| **موازن تحميل داخلي** | داخل Kubernetes (Service) | توزيع حركة المرور بين (Pods) داخل الكلاستر. |

## 3. تكوين Nginx كـ Load Balancer

```nginx
# nginx.conf
upstream backend_servers {
    # استراتيجية توزيع الحمل (Round Robin)
    server backend-1:8000 weight=3;
    server backend-2:8000 weight=2;
    server backend-3:8000 weight=1;
    keepalive 32;
}

upstream frontend_servers {
    server frontend-1:80;
    server frontend-2:80;
    server frontend-3:80;
}

server {
    listen 443 ssl;
    server_name nqp.gov.sd;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location /api/ {
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://frontend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

4. استراتيجيات توزيع الحمل
الاستراتيجية	الوصف	الاستخدام
Round Robin	توزيع الطلبات بشكل دوري على جميع الخوادم.	الاستخدام الافتراضي.
Weighted Round Robin	توزيع الطلبات بناءً على أوزان محددة (خوادم أقوى تحصل على طلبات أكثر).	لتوزيع الحمل حسب قدرة الخوادم.
Least Connections	توجيه الطلبات إلى الخادم بأقل عدد من الاتصالات النشطة.	للطلبات الطويلة (Long-lived connections).
IP Hash	توجيه طلبات نفس الـ IP إلى نفس الخادم (للحفاظ على الجلسة).	للتطبيقات التي تتطلب (Session Affinity).
5. فحص الصحة (Health Checks)
nginx

# Nginx Health Checks
upstream backend_servers {
    server backend-1:8000;
    server backend-2:8000;
    server backend-3:8000;

    # فحص صحي كل 5 ثوانٍ
    health_check interval=5s fails=3 passes=2 uri=/api/v1/health/;
}

6. مراجع

    Nginx Load Balancing: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

    Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/

