
---

### 📄 2. `Docker.md` (أفضل ممارسات Docker)

```markdown
# أفضل ممارسات Docker (Docker Best Practices) - NQP

## 1. نظرة عامة
يتم حوسبة (Containerize) جميع مكونات المنصة باستخدام Docker لتوحيد بيئات التطوير والاختبار والإنتاج. يتم استخدام `docker-compose` لتشغيل الخدمات المتعددة (Backend, Frontend, PostgreSQL, Redis, MinIO) في بيئة التطوير، بينما يتم استخدام Kubernetes في بيئة الإنتاج.

## 2. ملفات Dockerfile

### 2.1. Dockerfile لـ Backend (Django + Gunicorn)

```dockerfile
# ========== مرحلة البناء (Builder) ==========
FROM python:3.13-slim AS builder

WORKDIR /app

# تثبيت الاعتماديات
COPY requirements/base.txt requirements/prod.txt ./
RUN pip install --no-cache-dir -r prod.txt

# نسخ الكود وجمع الملفات الثابتة
COPY . .
RUN python manage.py collectstatic --noinput

# ========== مرحلة التشغيل (Production) ==========
FROM python:3.13-slim AS production

WORKDIR /app

# تثبيت Gunicorn
RUN pip install --no-cache-dir gunicorn

# نسخ الكود والاعتماديات من مرحلة البناء
COPY --from=builder /app /app
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages

# إنشاء مستخدم غير جذري (Non-root user)
RUN useradd --create-home --shell /bin/bash nqp_user
USER nqp_user

# المنفذ
EXPOSE 8000

# تشغيل Gunicorn
CMD ["gunicorn", "--workers=4", "--threads=2", "--bind=0.0.0.0:8000", "nqp_backend.wsgi:application"]


2.2. Dockerfile لـ Frontend (React + Vite + Nginx)
# ========== مرحلة البناء (Builder) ==========
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build  # ينتج مجلد `dist/`

# ========== مرحلة التشغيل (Production) ==========
FROM nginx:alpine AS production

# نسخ الملفات المبنية إلى مجلد Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# نسخ إعدادات Nginx مخصصة
COPY nginx.conf /etc/nginx/nginx.conf

# المنفذ
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]



3. docker-compose.yml (للتطوير المحلي)
version: '3.9'

services:
  # ===== قاعدة البيانات =====
  postgres:
    image: postgres:16-alpine
    container_name: nqp-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: nqp_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== التخزين المؤقت =====
  redis:
    image: redis:7-alpine
    container_name: nqp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===== الخادم الخلفي =====
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: nqp-backend
    environment:
      DJANGO_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ../backend:/app
      - ../backend/static:/app/static
      - ../backend/media:/app/media

  # ===== الخادم الأمامي =====
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: nqp-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  # ===== (اختياري) Nginx كـ Reverse Proxy =====
  nginx:
    image: nginx:alpine
    container_name: nqp-nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "443:443"
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:


4. إدارة الملفات الثابتة (Static & Media)

    Static Files: يتم جمعها في مرحلة البناء (Collectstatic) ونشرها مع الصورة.

    Media Files: يتم تخزينها على (MinIO/S3) في الإنتاج، أو على (Volume) محلي في التطوير.

5. أفضل الممارسات
الممارسة	الوصف
استخدام صور أساسية خفيفة (Alpine)	تقليل حجم الصورة.
تقسيم مراحل البناء (Multi-stage)	تقليل حجم الصورة النهائية.
استخدام مستخدم غير جذري (Non-root)	تحسين الأمان.
إضافة Healthchecks	لضمان ترتيب بدء التشغيل.
استخدام Volumes للبيانات	الحفاظ على البيانات (قاعدة البيانات، الملفات).
تخزين الملفات الثابتة خارجياً	لتخفيف الحمل عن الخادم.
استخدام Docker Compose للتطوير	لتسهيل التشغيل المحلي.
6. مراجع

    Docker Documentation: https://docs.docker.com/

    Dockerfile Best Practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/