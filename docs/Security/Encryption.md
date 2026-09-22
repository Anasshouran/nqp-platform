
---

### 📄 7. `Encryption.md` (التشفير)

```markdown
# التشفير (Encryption) - NQP

## 1. الهدف
تحديد سياسات وإجراءات التشفير المستخدمة في منصة NQP لحماية البيانات الحساسة أثناء النقل (In Transit) وعند السكون (At Rest)، وضمان **سرية (Confidentiality)** و **سلامة (Integrity)** البيانات.

## 2. أنواع التشفير

| النوع | الوصف | التقنية المستخدمة |
| :--- | :--- | :--- |
| **تشفير أثناء النقل (In Transit)** | تشفير البيانات أثناء نقلها عبر الشبكة. | TLS 1.3, HTTPS |
| **تشفير عند السكون (At Rest)** | تشفير البيانات المخزنة على الأقراص. | AES-256 (Disk Encryption) |
| **تشفير على مستوى التطبيق** | تشفير الحقول الحساسة في قاعدة البيانات. | Fernet (symmetric encryption) |
| **تشفير الملفات** | تشفير الملفات المرفوعة والمخزنة. | AES-256 (Server-Side Encryption) |

## 3. تشفير أثناء النقل (In Transit)

### 3.1. TLS 1.3
- **البروتوكول**: TLS 1.3 فقط (مع تعطيل الإصدارات القديمة).
- **الشهادات**: شهادات SSL/TLS من (Let's Encrypt) مع تجديد تلقائي.
- **التكوين الموصى به**:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

3.2. HTTPS

    جميع الطلبات: يجب أن تكون عبر HTTPS فقط.

    إعادة توجيه HTTP → HTTPS: إعادة توجيه جميع طلبات HTTP إلى HTTPS.

4. تشفير عند السكون (At Rest)
4.1. تشفير قاعدة البيانات (Disk Encryption)

    التقنية: LUKS (Linux Unified Key Setup) أو تشفير EBS (في AWS).

    المفتاح: يتم تخزين المفتاح في (Secrets Manager) أو (Vault).

4.2. تشفير الحقول الحساسة في Django
python

# apps/accounts/models.py
from django.db import models
from cryptography.fernet import Fernet
from django.conf import settings

class EncryptedTextField(models.TextField):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cipher = Fernet(settings.ENCRYPTION_KEY)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return self.cipher.decrypt(value.encode()).decode()

    def get_prep_value(self, value):
        if value is None:
            return value
        return self.cipher.encrypt(value.encode()).decode()

# الاستخدام
class User(models.Model):
    # ... الحقول الأخرى
    national_id = EncryptedTextField(null=True, blank=True)

4.3. تشفير الملفات (MinIO/S3)

    التقنية: AES-256 (Server-Side Encryption).

    التنفيذ: يتم تمكين (SSE-S3) أو (SSE-C) في MinIO/S3.

5. إدارة المفاتيح (Key Management)
المفتاح	الاستخدام	التخزين	التناوب
مفتاح قاعدة البيانات	تشفير قاعدة البيانات.	(Secrets Manager)	سنوي
مفتاح التطبيق (Fernet)	تشفير الحقول الحساسة.	(Secrets Manager)	سنوي
مفتاح MinIO	تشفير الملفات.	(Secrets Manager)	سنوي
مفتاح JWT	توقيع JWT.	(Secrets Manager)	90 يوماً
6. مراجع

    Fernet (cryptography): https://cryptography.io/en/latest/fernet/

    OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

    TLS 1.3: https://datatracker.ietf.org/doc/html/rfc8446
    