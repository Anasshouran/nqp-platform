
---

### 📄 5. `DNS.md` (إدارة DNS)

```markdown
# إدارة DNS (DNS Management) - NQP

## 1. نظرة عامة
يتم استخدام نظام (DNS - Domain Name System) لربط أسماء النطاقات (Domains) بعناوين (IP) الخاصة بالخوادم. يضمن DNS وصول المستخدمين إلى المنصة باستخدام أسماء نطاقات سهلة التذكر بدلاً من عناوين IP.

## 2. أسماء النطاقات (Domains)

| النطاق | الاستخدام | النوع | القيمة |
| :--- | :--- | :--- | :--- |
| `nqp.gov.sd` | الموقع العام والبوابات | A | 192.168.1.100 |
| `api.nqp.gov.sd` | واجهات API | A | 192.168.1.101 |
| `staging.nqp.gov.sd` | بيئة الاختبار | A | 192.168.1.102 |
| `dev.nqp.gov.sd` | بيئة التطوير | A | 192.168.1.103 |
| `*.nqp.gov.sd` | النطاقات الفرعية (Wildcard) | CNAME | nqp.gov.sd |

## 3. سجلات DNS

| السجل | النوع | القيمة | TTL |
| :--- | :--- | :--- | :--- |
| **nqp.gov.sd** | A | 192.168.1.100 | 300 |
| **www.nqp.gov.sd** | CNAME | nqp.gov.sd | 300 |
| **api.nqp.gov.sd** | A | 192.168.1.101 | 300 |
| **staging.nqp.gov.sd** | A | 192.168.1.102 | 300 |
| **dev.nqp.gov.sd** | A | 192.168.1.103 | 300 |
| **MX** | 10 | mail.nqp.gov.sd | 3600 |
| **TXT** | SPF | v=spf1 mx ~all | 3600 |
| **TXT** | DKIM | (قيمة DKIM) | 3600 |

## 4. إدارة DNS

| المسؤولية | الأداة | الوصف |
| :--- | :--- | :--- |
| **تسجيل النطاق** | (مزود النطاق) | تسجيل النطاق `nqp.gov.sd`. |
| **إدارة السجلات** | (مزود DNS) | إضافة وتعديل وحذف سجلات DNS. |
| **مراقبة DNS** | (Uptime Kuma) | مراقبة توفر النطاقات. |

## 5. مراجع
- **DNS Basics**: [https://www.cloudflare.com/learning/dns/what-is-dns/](https://www.cloudflare.com/learning/dns/what-is-dns/)
- **DNS Record Types**: [https://www.cloudflare.com/learning/dns/dns-records/](https://www.cloudflare.com/learning/dns/dns-records/)

📄 6. SSL.md (إدارة شهادات SSL/TLS)
# إدارة شهادات SSL/TLS (SSL/TLS Management) - NQP

## 1. نظرة عامة
يتم استخدام شهادات (SSL/TLS) لتشفير الاتصالات بين المستخدمين والخوادم، وضمان سرية البيانات وسلامتها. يتم إدارة الشهادات عبر (Let's Encrypt) مع تجديد تلقائي.

## 2. أنواع الشهادات

| النوع | الوصف | الاستخدام |
| :--- | :--- | :--- |
| **Let's Encrypt (Wildcard)** | شهادة مجانية تغطي جميع النطاقات الفرعية. | تستخدم لـ (nqp.gov.sd, api.nqp.gov.sd, staging.nqp.gov.sd). |
| **شهادة داخلية** | شهادة موقعة ذاتياً (Self-signed). | تستخدم في بيئة التطوير فقط. |

## 3. تكوين Let's Encrypt

### 3.1. تثبيت Certbot
```bash
# تثبيت Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# الحصول على شهادة Wildcard
certbot certonly --manual --preferred-challenges dns -d *.nqp.gov.sd

3.2. التجديد التلقائي
bash

# إضافة مهمة (Cron) لتجديد الشهادة تلقائياً
0 0 * * * certbot renew --quiet --post-hook "systemctl reload nginx"

4. تكوين Nginx مع SSL
nginx

# nginx.conf
server {
    listen 443 ssl http2;
    server_name nqp.gov.sd;

    ssl_certificate /etc/letsencrypt/live/nqp.gov.sd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nqp.gov.sd/privkey.pem;

    # إعدادات SSL المتقدمة
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

5. إعادة توجيه HTTP إلى HTTPS
nginx

server {
    listen 80;
    server_name nqp.gov.sd;
    return 301 https://$server_name$request_uri;
}

6. مراجع

    Let's Encrypt: https://letsencrypt.org/

    Certbot: https://certbot.eff.org/

    SSL Labs (اختبار الشهادة): https://www.ssllabs.com/ssltest/

    Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
    