# AFYATNA — Dev VPS Deployment (dev.afyatna.com)

نظام نشر آمن وقابل لإعادة الاستخدام لبيئة التطوير على VPS، يعتمد على
`docker-compose.dev-vps.yml` كملف Compose الرسمي، وسكربتات Bash في `scripts/`
للإشراف على النشر دون أي عملية تخريبية على البيانات.

> **قاعدة صارمة:** حاويات المدير (Docker Cluster):
> `nqp-postgres-dev` و `nqp-redis-dev` وبالتالي قواعد بياناتهما محمية بأحجام
> خارجية (`external volumes`). لا ينفّذ أي سكربت هنا `down`, `down -v`,
> `volume rm`, `volume prune`, أو `system prune`.

---

## 1. Architecture

```
        Internet
           │
           ▼
   dev.afyatna.com  (Host Nginx + SSL — خارج Docker)
           │
           ▼
   127.0.0.1:8080
           │
           ▼
      (frontend :80 = nqp-frontend-dev)
      └─ location /api/ → http://backend:8000  (Docker service discovery)
                          ├── Django/Gunicorn   (nqp-backend-dev)
                          │      ├── PostgreSQL (nqp-postgres-dev)
                          │      └── Redis      (nqp-redis-dev)
                          ├── Celery Worker     (nqp-celery-dev)
                          └── Celery Beat       (nqp-celery-beat-dev)
```

- شبكة واحدة: `deploy_nqp_internal` (bridge) — كل الخدمات عليها، والاتصال
  بأسماء الخدمات فقط (لا IP ثابت ولا aliases يدوية).
- PostgreSQL و Redis **بلا أي منفذ على الـ Host** (5432/6379 لا تُكشف).
- الواجهة الأمامية منشورة على `127.0.0.1:8080 -> 80` فقط؛ الوصول الخارجي عبر
  Nginx المضيف الذي يمرر إلى `127.0.0.1:8080`.

---

## 2. Environment file

- الملف الفعلي على VPS: `/opt/nqp-platform/.env.dev-vps`
- **لا يوجد** `/opt/nqp-platform/.env` — السكربتات تستخدم `--env-file` صراحةً:
  ```bash
  docker-compose --env-file /opt/nqp-platform/.env.dev-vps -f deploy/docker-compose.dev-vps.yml config
  ```
- انسخ القالب `deploy/.env.example` إلى ذلك الموقع واملأ القيم الفعلية.
- لن تُرفع قيم البيئة إطلاقاً في أي إخراج للسكربتات.

المتغيرات المطلوبة: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD` (+ اختياري: `REDIS_PASSWORD`,
`JWT_SECRET_KEY`, `FRONTEND_PORT`, `POSTGRES_IMAGE`, `REDIS_IMAGE`).

---

## 3. Pre-check (قراءة فقط)

```bash
./scripts/dev-check.sh
```

يفحص: وجود المشروع/الملفات، متغيرات البيئة المطلوبة (بدون قيمها)،
`deploy_nqp_postgres_data` و `deploy_nqp_redis_data`، حاويات الحالية وأحجامها،
صورة Backend الحالية، صحة Compose عبر `docker compose` و `docker-compose`
معاً، الإعداد المُعرَّب، المنافذ غير المكشوفة، والشبكة.

النهاية: `DEV CHECK PASSED` (خروج 0) أو `DEV CHECK FAILED` (خروج 1).

---

## 4. Deployment

```bash
./scripts/dev-deploy.sh
```

التسلسل: فحص مسبق إلزامي ← عرض الحالة ← تأكيد `YES` حرفياً ←
`socker-compose pull` ← `up -d` ← انتظار الجاهزية ← تحقق نهائي.
لا migrations تلقائية، ولا أي أمر مدمر.

---

## 5. Status

```bash
./scripts/dev-status.sh
```

يعرض حالة الحاويات وصحّتها وصورها، الأحجام، الشبكة، ومنافذ HTTP
(الواجهة الأمامية + health الـ Backend) — بدون أي أسرار.

---

## 6. Rollback

```bash
./scripts/dev-rollback.sh            # سيطلب الوسم
./scripts/dev-rollback.sh 84a09fa    # أو تمرير الوسم مباشرة
```

يقوم بـ:
1. التحقق من سلامة الأحجام.
2. عرض صورة Backend الحالية.
3. سحب الصورة المستهدفة وتعديل `docker-compose.dev-vps.yml` فقط لتثبيت
   الخدمات الثلاث (backend/celery/celery-beat) على الوسم المختار (مع نسخة
   احتياطية في `/tmp`).
4. إعادة إنشاء حاويات التطبيق فقط: `up -d --no-deps backend celery celery-beat`.
5. انتظار الجاهزية والتحقق.

**يُمنع الإرجاع إلى الوسم المتحرك `dev`** — يُستخدم وسم SHA فقط.

---

## 7. Safety rules

| الممنوع | البديل الآمن |
|---|---|
| `down` / `down -v` | `stop <service>` أو لا شيء |
| `volume rm` / `volume prune` / `system prune` | عدم اللمس — الأحجام خارجية |
| `migrate` تلقائياً | ترحيل يدوي صريح (القسم 9) |
| الإعتماد على `.env` | `--env-file .../.env.dev-vps` |
| حذف/إعادة إنشاء الحاويات المدير | تحقق مسبق من الأحجام قبل أي عملية |

---

## 8. How to update the backend image

1. عدّل الوسم المثبّت في `deploy/docker-compose.dev-vps.yml` للخدمات الثلاث
   (`backend`, `celery`, `celery-beat`) إلى وسم SHA الجديد (لا `dev`).
2. أو نفّذ `./scripts/dev-rollback.sh <new-tag>` لنفس التأثير وبإشراف موثّق.
3. ثم `./scripts/dev-check.sh` و `./scripts/dev-deploy.sh` لتطبيق النسخة الجديدة.

تذكير: السكربتات تستخدم دائمًا `--env-file /opt/nqp-platform/.env.dev-vps`
وتشغّلها من جذر المشروع، وعملية `pull` تحتاج وصولًا عامًا/صلاحيًا إلى
`ghcr.io/anasshouran`.

---

## 9. Manual migration (فقط عند الموافقة الصريحة)

لا تُجرى migrations تلقائياً. عند الحاجة المفوَّض إليها:

```bash
cd /opt/nqp-platform
docker-compose --env-file /opt/nqp-platform/.env.dev-vps \
  -f deploy/docker-compose.dev-vps.yml \
  run --rm --no-deps backend python manage.py migrate --noinput
```

ثم أعد إنشاء الـ Backend ليستخدم أحدث كود:

```bash
docker-compose --env-file /opt/nqp-platform/.env.dev-vps \
  -f deploy/docker-compose.dev-vps.yml up -d backend
```

> نفّذ هذا فقط بعد نسخ احتياطي لقاعدة البيانات:
> `docker exec nqp-postgres-dev pg_dump -U <POSTGRES_USER> -d <POSTGRES_DB> > dump-$(date +%F).sql`