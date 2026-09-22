# بيئات التشغيل والمتغيرات (Environment Configuration)

## 1. نظرة عامة
يدير المشروع تكويناته عبر ملفات `.env` متعددة، مع فصل واضح بين البيئات (التطوير، الاختبار، الإنتاج). يستخدم Django مكتبة `python-dotenv` لتحميل المتغيرات، بينما يستخدم React (Vite) آلية `import.meta.env`.

## 2. بيئات التشغيل (Environments)
| البيئة | ملف Backend | ملف Frontend | الغرض |
| :--- | :--- | :--- | :--- |
| **التطوير (Development)** | `.env.dev` | `.env.development` | التطوير المحلي. |
| **الاختبار (Testing)** | `.env.test` | `.env.test` | تشغيل اختبارات CI/CD. |
| **الإنتاج (Production)** | `.env.prod` | `.env.production` | البيئة الحية. |

## 3. ملف `.env.example` لـ Backend (Django)
```env
# ===== Django الأساسية =====
SECRET_KEY=your_super_secret_key_50_chars
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,api.nqp.gov.sd

# ===== قاعدة البيانات (PostgreSQL) =====
DB_NAME=nqp_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# ===== التخزين المؤقت (Redis) =====
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# ===== المصادقة (JWT) =====
JWT_ACCESS_TOKEN_LIFETIME=1800
JWT_REFRESH_TOKEN_LIFETIME=604800

# ===== تخزين الملفات (MinIO/S3) =====
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=nqp-documents
AWS_S3_ENDPOINT_URL=http://localhost:9000
AWS_S3_REGION_NAME=us-east-1
USE_S3=False

# ===== البريد الإلكتروني =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=no-reply@nqp.gov.sd
EMAIL_HOST_PASSWORD=your_password

# ===== Celery (Redis) =====
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# ===== تكاملات خارجية =====
MOH_API_URL=https://api.moh.gov.sd/v1
MOH_API_KEY=your_key
WHO_API_URL=https://api.who.int/v1
WHO_API_KEY=your_key