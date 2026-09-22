# هيكل المجلدات الفعلي (Code Folder Structure) — NQP

## 1. الهيكل العام (Root)

```text
nqp-platform/
├── README.md                    # وصف المشروع
├── .env.example                 # متغيرات البيئة النموذجية
├── .gitignore
├── Makefile                     # أوامر تشغيل مختصرة
├── backend/                     # الخادم الخلفي (Django + DRF)
├── frontend/                    # الخادم الأمامي (React 19 + Vite)
├── deploy/                      # ملفات النشر (Docker Compose, K8s, Nginx, SSL)
├── docs/                        # التوثيق الشامل
├── scripts/                     # سكربتات التشغيل المساعدة
├── tests/                       # اختبارات End-to-End
└── .github/                     # GitHub Actions
```

## 2. هيكل Backend (Django + DRF)

```text
backend/
├── manage.py                    # نقطة الدخول
├── nqp_backend/                 # إعدادات المشروع الرئيسية
│   ├── __init__.py
│   ├── settings.py              # إعدادات Django (DB, JWT, Celery, MinIO, etc.)
│   ├── urls.py                  # المسارات الجذرية لجميع التطبيقات
│   ├── wsgi.py                  # خادم WSGI
│   └── celery.py                # إعدادات Celery
├── apps/                        # تطبيقات Django (Feature-based)
│   ├── accounts/                # المصادقة والمستخدمين (JWT + RBAC)
│   ├── travelers/               # إدارة المسافرين
│   ├── carriers/                # شركات الطيران ووسائل النقل
│   ├── screening/               # الفحص الصحي وتقييم المخاطر
│   ├── risk_engine/             # محرك تقييم المخاطر (ذكي)
│   ├── clinic/                  # العيادات والسجلات الطبية (EMR)
│   ├── laboratory/              # المختبرات والعينات
│   ├── food_quarantine/         # الحجر الصحي للأغذية
│   ├── emergency_eoc/           # غرفة الطوارئ (EOC)
│   ├── notifications/           # محرك الإشعارات (SMS, Email, Push)
│   ├── reporting/               # التقارير ولوحات المعلومات
│   ├── integration/             # التكامل مع الأنظمة الخارجية
│   ├── cms/                     # إدارة محتوى الموقع العام
│   └── airport_health/          # نظام صحة المطارات
├── core/                        # الوظائف المشتركة
│   ├── models/                  # نماذج أساسية (BaseModel)
│   ├── permissions/             # صلاحيات مخصصة
│   ├── serializers/             # Serializers مشتركة
│   ├── utils/                   # دوال مساعدة (QR, تشفير)
│   └── exceptions/              # استثناءات مخصصة
├── external/                    # تكاملات خارجية
│   ├── clients/                 # عميل APIs خارجية
│   └── services/                # خدمات التكامل (Celery Tasks)
├── requirements/                # اعتماديات Python
│   ├── base.txt                 # الاعتماديات الأساسية
│   ├── dev.txt                  # اعتماديات التطوير
│   └── prod.txt                 # اعتماديات الإنتاج
├── static/                      # ملفات ثابتة
├── media/                       # ملفات مرفوعة
├── Dockerfile
├── Dockerfile.dev
├── .env.example
└── pytest.ini
```

كل تطبيق في `apps/` يتبع الهيكل:
```
app_name/
├── __init__.py
├── apps.py          # إعدادات التطبيق
├── models.py        # نماذج قاعدة البيانات
├── views.py         # واجهات API (ViewSets)
├── serializers.py   # Serializers
├── admin.py         # واجهة المشرف
├── urls.py          # المسارات (Router)
```

## 3. هيكل Frontend (React 19 + Vite)

```text
frontend/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── manifest.json              # PWA Manifest
├── src/
│   ├── api/                       # Axios API Calls
│   │   ├── client.ts              # تكوين Axios (Interceptors)
│   │   └── endpoints/
│   │       ├── auth.ts
│   │       ├── travelers.ts
│   │       └── screening.ts
│   ├── components/                # مكونات React
│   │   ├── ui/                    # MUI Components (مُغلفة)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── forms/                 # React Hook Form + Zod
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ScreeningForm.tsx
│   │   │   └── schemas/
│   │   ├── tables/                # AG Grid
│   │   │   ├── TravelersTable.tsx
│   │   │   └── FlightsTable.tsx
│   │   ├── charts/                # Recharts
│   │   │   ├── CasesChart.tsx
│   │   │   └── KPIsChart.tsx
│   │   └── layouts/               # تخطيطات الصفحات
│   │       ├── PublicLayout.tsx
│   │       └── AdminLayout.tsx
│   ├── store/                     # Redux Toolkit
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── travelerSlice.ts
│   │       └── uiSlice.ts
│   ├── hooks/                     # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useTravelers.ts
│   │   └── useScreening.ts
│   ├── utils/                     # دوال مساعدة
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── qr-generator.ts
│   ├── types/                     # TypeScript Types
│   │   ├── traveler.ts
│   │   ├── screening.ts
│   │   └── api.ts
│   ├── styles/                    # Tailwind CSS + MUI Theme
│   │   ├── globals.css
│   │   └── theme.ts
│   ├── routes.tsx                 # React Router
│   ├── App.tsx                    # المكون الجذري
│   └── main.tsx                   # نقطة الدخول
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── .env.development
├── .env.production
├── Dockerfile
├── Dockerfile.dev
└── nginx.conf
```

## 4. مبادئ التنظيم

- **الفصل حسب المسؤولية (Separation of Concerns):** كل تطبيق Django يحتوي على (models, views, serializers, admin, urls) خاصة به.
- **التجميع حسب الميزة (Feature-Based):** بدلاً من التجميع حسب النوع، تم التجميع حسب الميزة لتسهيل الصيانة.
- **التسمية:** استخدام أسماء إنجليزية واضحة (snake_case لـ Python، camelCase لـ TypeScript).
