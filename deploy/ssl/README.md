# إدارة شهادات SSL (SSL Certificates) - NQP

## 1. نظرة عامة
يحتوي هذا المجلد على شهادات SSL/TLS المستخدمة لتأمين اتصالات المنصة عبر HTTPS.

## 2. الملفات

| الملف | الوصف |
| :--- | :--- |
| `fullchain.pem` | الشهادة الكاملة (بما في ذلك الشهادات الوسيطة). |
| `privkey.pem` | المفتاح الخاص للشهادة. |
| `staging-fullchain.pem` | شهادة بيئة الاختبار (Staging). |
| `staging-privkey.pem` | المفتاح الخاص لبيئة الاختبار. |
| `dev-fullchain.pem` | شهادة بيئة التطوير (Development). |
| `dev-privkey.pem` | المفتاح الخاص لبيئة التطوير. |

## 3. الحصول على شهادات SSL

### 3.1. باستخدام Let's Encrypt (موصى به)
```bash
# تثبيت Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# الحصول على شهادة
sudo certbot --nginx -d nqp.gov.sd -d www.nqp.gov.sd -d api.nqp.gov.sd

# النسخ إلى المجلد المناسب
sudo cp /etc/letsencrypt/live/nqp.gov.sd/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/nqp.gov.sd/privkey.pem ./ssl/

# إعداد التجديد التلقائي
sudo systemctl enable certbot.timer

3.2. باستخدام شهادة ذاتية التوقيع (للتطوير فقط)
bash

# إنشاء شهادة ذاتية التوقيع
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem -days 365 -nodes -subj "/C=SD/ST=Khartoum/L=Khartoum/O=NQP/CN=nqp.gov.sd"

4. تجديد الشهادات

    التجديد التلقائي: يتم التجديد تلقائياً عبر (Certbot) و (Cron job).

    التحقق من التجديد: sudo certbot renew --dry-run

5. الأمان

    تشفير المفتاح الخاص: يجب أن يكون المفتاح الخاص (privkey.pem) محمياً بصلاحيات قراءة فقط (chmod 600).

    عدم مشاركة المفتاح: لا تشارك المفتاح الخاص مع أي شخص.

6. مراجع

    Let's Encrypt: https://letsencrypt.org/

    Certbot: https://certbot.eff.org/

    SSL Labs: https://www.ssllabs.com/ssltest/