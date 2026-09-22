# تنفيذ واجهة الموقع (Frontend UI Implementation)

> **آخر تحديث:** 2026-08-01
> يوثّق هذا الملف الوضع الفعلي لواجهة المستخدم (المطبق بالكود) بعد تحسين شامل للواجهة: نظام تصميم احترافي، مكونات مشتركة، إعادة تصميم الموقع العام ولوحة تحكم الموظفين، تحسين الأداء والإتاحة.

## 1. التقنيات المستخدمة (الفعلية)

| التقنية | الاستخدام |
| :--- | :--- |
| **React 19 + TypeScript** | إطار العمل واللغة. |
| **Vite 5** | أداة البناء (code-splitting تلقائي). |
| **React Router 6** | إدارة المسارات مع تحميل كسول (`React.lazy`). |
| **MUI (Material UI) v5** | نظام التصميم والمكونات (RTL). |
| **Redux Toolkit** | إدارة الحالة (auth, traveler, ui). |
| **Axios** | استدعاء الـ APIs مع interceptor لتجديد التوكن. |
| **React Hook Form + Zod** | النماذج والتحقق. |
| **Tailwind CSS** | أدوات تنسيق مساعدة (محدودة). |

## 2. نظام التصميم (Design System)

ملفات: `frontend/src/styles/theme.ts` + `globals.css` + `index.html`

### الألوان
- **اللون الرئيسي (Primary):** زمردي طبي `#0e8a72` مع درجات `dark #0a6b58` و `darker #075447` و `light #e5f5f0` و `lighter #f2faf7`.
- **اللون الثانوي (Secondary):** ذهبي حكومي `#c8a13a`.
- خلفية الموقع: `#f6f9f8` (مائلة للأخضر الفاتح)؛ النص الأساسي `#16332c`.
- درجات `grey` مخصصة (من `#f8faf9` إلى `#172522`).

### الخطوط
- خط **Cairo** محمّل من Google Fonts عبر `index.html` مع `preconnect` (الأوزان 400–900) و `display=swap`.
- تدرّج خطوط كامل في `typography` (h1 → h6، subtitle، button، caption).

### الأشكال والظلال
- نصف قطر موحّد `14`، البطاقات `16`، الأزرار `12`.
- سلسلة ظلال ناعمة مخصصة (shadow 1–5) بدلاً من ظلال Material الافتراضية.

### تخصيص المكونات (Component Overrides)
- `MuiButton`: حواف دائرية، وزن 700، تأثير hover (ارتفاع 1px)، حلقة `focus-visible` ملوّنة.
- `MuiCard`: ظل ناعم + انتقال hover.
- `MuiTextField`: حقول دائرية مع هالة تركيز `4px`.
- `MuiListItemButton`, `MuiAccordion`, `MuiTableCell`, `MuiSkeleton`, `MuiChip`, `MuiTab`.

### الأنماط العامة (`globals.css`)
- تمرير مخصص للصفحة، `::selection` ملوّن، حلقات `:focus-visible`.
- دعم `prefers-reduced-motion` (تعطيل الحركات).
- رابط "تخطي إلى المحتوى" (skip link) لإتاحة لوحة المفاتيح.
- حركة `fade-up` عند ظهور العناصر.
- `index.html`: `lang="ar" dir="rtl"`, `theme-color`, وصف توضيحي، `noscript`.

## 3. المكونات المشتركة (Shared UI Primitives)

المجلد: `frontend/src/components/common/`

| المكوّن | الوصف |
| :--- | :--- |
| `BrandLogo.tsx` | شعار المنصة (أيقونة + اسم) بدعم أوضاع `light/compact`. |
| `PageHeader.tsx` | ترويسة صفحة موحّدة (عنوان + وصف + eyebrow + زر إجراء). |
| `SectionTitle.tsx` | عنوان قسم مع خط سفلي متدرّج (زمردي/ذهبي). |
| `EmptyState.tsx` | حالة فارغة أنيقة (أيقونة + عنوان + وصف + إجراء). |
| `StatCard.tsx` | بطاقة إحصائية (قيمة + تسمية + أيقونة + اتجاه). |
| `BackToTop.tsx` | زر العودة لأعلى الصفحة عند التمرير. |
| `PageLoader.tsx` | شاشة تحميل (تُستخدم مع `Suspense`). |
| `LoadingSkeleton.tsx` | 4 أنماط هيكل تحميل: بطاقات، شبكة بطاقات، قائمة، جدول. |

## 4. التخطيطات (Layouts)

### `PublicLayout.tsx` — تخطيط الموقع العام
- **شريط علوي** (top bar) داكن: اسم المنظمة + الهاتف + البريد.
- **شريط تنقّل زجاجي ثابت** (sticky glass): يتغير مع التمرير (`backdrop-filter: blur`)، يتضمن شعار المنصة + قائمة التنقل + زر "دخول الموظفين".
- **قائمة درج للموبايل** (Drawer) بفتح/إغلاق، مع إغلاق تلقائي عند تغيير المسار.
- **فوتر** متعدد الأعمدة: وصف المنصة، روابط سريعة، معلومات التواصل، خط متدرّج علوي.
- زر العودة لأعلى + رابط تخطي المحتوى.
- تمرير تلقائي لأعلى عند تغيير الصفحة.

### `AdminLayout.tsx` — تخطيط بوابة الموظفين
- **شريط جانبي دائم** على الشاشات الكبيرة و**Drawer مؤقت** على الموبايل (`useMediaQuery`).
- قائمة تنقّل مقسّمة لمجموعات (العام / العمليات / الطوارئ والتقارير) مع أيقونات وإبراز المسار النشط.
- بطاقة المستخدم أسفل الشريط الجانبي.
- **هيدر زجاجي**: اسم القسم الحالي (breadcrumb ديناميكي)، زر إشعارات، قائمة مستخدم (avatar + الاسم + تسجيل الخروج).
- خروج آمن: يستدعي `/auth/logout/` ثم يمسح حالة Redux وينتقل لـ `/login`.

## 5. الصفحات

### الموقع العام (Public Website)
| الصفحة | المسار | ملاحظات |
| :--- | :--- | :--- |
| الرئيسية | `/` | Hero متدرّج + شريط إحصاءات حي (منافذ/قطاعات/إنذارات) + تنبيهات طوارئ + بطاقات خدمات + آخر الأخبار + قسم CTA. |
| القطاعات والمنافذ | `/sectors` | بطاقات قطاعات بلون كل قطاع + عدد المنافذ + حالات فارغة/تحميل. |
| الأخبار | `/news` | شبكة بطاقات أخبار مع تصنيف وتاريخ. |
| الأمراض والإرشادات | `/diseases` | بطاقات أمراض (أعراض، فترة الحضانة، فئة IHR). |
| متطلبات السفر | `/travel-requirements` | جدول + فلترة بالدولة + شارات مستوى الخطورة. |
| الأسئلة الشائعة | `/faq` | أكورديون مع ترقيم وحالة توسيع واحدة. |
| مركز الوثائق | `/documents` | قائمة وثائق + زر تحميل (يُخدم عبر `/media/`). |
| اتصل بنا | `/contact` | نموذج تواصل (التحقق بـ Zod) + بطاقات معلومات (هاتف/بريد/عنوان) + خريطة Google مضمّنة + قنوات التواصل الاجتماعي. |
| الخدمات الذكية | `/services` | 5 تبويبات: بحث عن الطلب، التحقق من QR، التحقق من شهادة صحية، إشعارات فورية، المساعد الذكي (chatbot). |

### بوابة المسافرين (Traveler Portal) — التدفق الأساسي
| الصفحة | المسار | ملاحظات |
| :--- | :--- | :--- |
| التسجيل المسبق | `/traveler/register` | معالج متعدد الخطوات (6 خطوات): البداية واللغة ← البيانات الشخصية ← بيانات الرحلة ← الغرض والتواصل ← الإقرار الصحي (10 أسئلة + تقييم مخاطر مبدئي) ← المراجعة والتأكيد. يحفظ تقدم السفر محلياً (`localStorage`) ويدعم العودة لاحقاً. |
| لوحة تحكم المسافر | `/traveler/dashboard` | دخول برقم الجواز (بحث عام بدون تسجيل دخول) + بطاقة الحالة مع شريط تقدم + إجراءات سريعة + تسجيل خروج (مسح الجلسة المحلية). |
| تتبع الطلب | `/traveler/tracking` | بحث بالجواز + بطاقة الحالة + شريط التقدم (5 خطوات) + جدول زمني + عرض QR Code مع أزرار تنزيل/طباعة/مشاركة عند اعتماد الطلب. |

جميع الصفحات تستخدم `PageHeader` + `EmptyState` + هياكل تحميل موحّدة، مع خطأ آمن يقع في البيانات.

### بوابة الموظفين (Admin Portal)
| الصفحة | المسار | ملاحظات |
| :--- | :--- | :--- |
| تسجيل الدخول | `/login` | شاشة مقسومة (هوية المنصة + نموذج). بعد النجاح ينتقل إلى `/app`. |
| لوحة التحكم | `/app` | ترحيب + بطاقات إحصاءات ببيانات حية (من الـ public API) + روابط سريعة للوحدات. |
| المستخدمون | `/app/users` | جدول مستخدمين (اسم/بريد/هاتف/دور/حالة) + نافذة إنشاء/تعديل. |

## 6. المسارات والتحميل الكسول

`frontend/src/routes.tsx`:
- الموقع العام داخل `PublicLayout` (المسارات `/`, `/sectors`, `/news`, `/diseases`, `/travel-requirements`, `/faq`, `/documents`).
- `/login` مستقل.
- لوحة الموظفين داخل `ProtectedRoute` → `AdminLayout` (`/app`, `/app/users`).
- كل صفحة تُحمَّل عبر `React.lazy()` مع `Suspense` و `PageLoader` — الناتج مقسّم إلى chunks صغيرة.

```typescript
const HomePage = lazy(() => import('./pages/public/HomePage'));
const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);
```

## 7. الواجهة البرمجية (API Client)

`frontend/src/api/`:
- `client.ts`: axios + حقن `Authorization: Bearer` + إعادة محاولة تجديد التوكن (refresh) عند 401 مع طابور طلبات.
- `endpoints/auth.ts`, `users.ts`, `public.ts`, `travelers.ts`, `screening.ts`.
- `endpoints/public.ts`: نماذج + دوال للموقع العام؛ يفتح تغليف pagination الـ CMS عبر `PaginatedResponse`.
- `vite.config.ts`: proxy لـ `/api`, `/admin`, `/media` → `http://localhost:8000`.

## 8. الأداء (Performance)
- تحميل كسول لكل الصفحات (code-splitting).
- `preconnect` لخطوط Google.
- مكوّنات خفيفة، تجنّب إعادة الرسم الزائدة، واستخدام هياكل تحميل بدلاً من الانتظار الصامت.
- `ManualChunks` في vite لتقسيم vendor/ui.

## 9. الإتاحة (Accessibility)
- `lang="ar" dir="rtl"` في `index.html`.
- رابط تخطي إلى المحتوى (`#main-content`).
- `aria-label` على أزرار الأيقونات (قائمة، إغلاق، إشعارات، حساب المستخدم).
- حلقات `:focus-visible` واضحة لكل العناصر القابلة للتفاعل.
- `prefers-reduced-motion` لإيقاف الحركات.
- عناوين دلالية (h1 → h6) بترتيب صحيح في كل صفحة.
- تباين ألوان مدروس للنصوص الثانوية.

## 10. بيانات الموقع العام (Seed + API)

### أمر إضافة البيانات التجريبية
```bash
DB_ENGINE=django.db.backends.postgresql .venv/bin/python manage.py seed_public
```
يضيف: 5 أمراض (كوليرا، حمى صفراء، ملاريا، ضنك، حصبة)، 8 دول بمستويات خطورة، 3 إشعارات صحية، 3 أخبار، 4 أسئلة شائعة، وثيقة تجريبية (`/media/documents/law-of-quarantine.pdf`)، وشهادتين صحيتين تجريبيتين (`NQP-YF-2026-0001` صالحة).

### واجهة الموقع العام (AllowAny)
- `GET /api/v1/public/sectors/`, `sectors/{id}/ports/`
- `GET /api/v1/public/ports/`, `ports/map/` (GeoJSON), `ports/{id}/stats/`
- `GET /api/v1/public/diseases/`
- `GET /api/v1/public/notices/`
- `GET /api/v1/public/travel-requirements/?country=CODE`
- `GET /api/v1/public/countries/` — قائمة الدول (كود/اسم/مستوى خطورة) لاستخدامها في نماذج التسجيل (AllowAny).
- `POST /api/v1/public/contact/` — إرسال رسالة تواصل (AllowAny)؛ `GET` محمي لإدارة النظام (`apps/public/models.ContactMessage`).
- `GET /api/v1/public/lookup/?passport=XXX` — البحث عن طلب مسافر (AllowAny).
- `POST /api/v1/public/verify-qr/` — التحقق من رمز QR (AllowAny).
- `POST /api/v1/public/verify-certificate/` — التحقق من شهادة صحية (AllowAny؛ نموذج `apps/public/models.HealthCertificate`).
- محتوى CMS (عام): `GET /api/v1/cms/news/`, `faq/`, `documents/`

### بوابة المسافرين (عامة - AllowAny)
- `POST /api/v1/travelers/` — إنشاء مسافر جديد (يقبل `medical_history` JSON لتخزين بيانات الرحلة/الغرض/الإقرار الصحي).
- `GET /api/v1/travelers/{id}/status/` — حالة التسجيل (`PENDING_DOCUMENTS` / `UNDER_REVIEW` / `COMPLETED` / `REJECTED`).
- `GET /api/v1/travelers/{id}/qr-code/` — رمز QR (Base64 PNG) مع `qr_data` (traveler_id/passport/full_name/issued_at).
- الجلسة محلية فقط: `frontend/src/utils/travelerSession.ts` (تخزين `traveler_id` + `passport_number` في `localStorage`).

### المساعد الذكي (SmartAssistant)
`frontend/src/components/common/SmartAssistant.tsx` — روبوت دردشة يعمل كمحرك قواعد أمامي فوق البيانات العامة:
- يحمّل الأسئلة الشائعة (FAQ)، الإشعارات الصحية، ومتطلبات السفر.
- يطابق كلمات مفتاحية (متطلبات السفر، تطعيمات، حمى صفراء، وثائق، QR، أخبار، تواصل…) ويُجيب من قاعدة المعرفة.
- واجهة محادثة فقاعية (user/bot) مع مؤشر كتابة وردود سريعة.

## 11. الاختبارات
- Backend: `apps/public/tests/test_public.py` — 21 اختباراً (الموقع العام + الدول + رسائل التواصل + الخدمات الذكية: بحث الطلب، تحقق QR، تحقق الشهادة). إجمالي المجموعة: **46 اختباراً ناجحاً**.
- Frontend: `npm run build` (tsc + vite) نظيف.

## 12. الحسابات التجريبية
| البريد | الدور | كلمة المرور |
| :--- | :--- | :--- |
| `admin@nqp.gov.sd` | مدير النظام (PORT_OFFICER) | `AdminPass123!` |
| `officer2@nqp.gov.sd` | موظف منفذ | (تُستعاد أو تُعدّل) |

## 12.1 التحسينات البصرية والتجريبية (UX/Visual)
- **مؤشرات حركة عامة** في `globals.css`: floatParticle, shimmerText/Bar, scanLine, pulseDot/pulseRing, typingBlink, rippleFx, progressFill, gradientShift, tiltIn, bannerSlide + helper classes (`.fade-in`, `.slide-down`, `.stagger`, `.particle`، `.typing-dot`). كلها محترمة لـ `prefers-reduced-motion`.
- **PageLoader** الحلقي المزدوج + نص متدرج لامع (cinematic).
- **PublicLayout**: ساعة رقمية حية (`LiveClock`)، شريط تنقّل ينكمش عند التمرير، شريط إعلان متدرج قابل للإغلاق (يُحفظ في sessionStorage).
- **HomePage**: جسيمات عائمة في الـ Hero (مكوّن `Particles` قابل لإعادة الاستخدام)، بطاقات خدمات ثلاثية الأبعاد (تعبئة متدرجة + سهم يظهر عند الـ hover)، ظهور متدرج (stagger).
- **SectionTitle**: نقاط متوهجة نابضة + خطوط تمييز جانبية.
- **لوحة التحكم (DashboardPage)**: تكامل **Chart.js** (`chart.js` + `react-chartjs-2`) — مخطط خطي لتسجيلات المسافرين (آخر 7 أيام) ومخطط دائري لتوزيع المنافذ حسب النوع. البيانات من API الحقيقي (`getTravelers` مع `page_size=500`، `getPorts`). أُضيف `TravelerPagination` في الواجهة الخلفية لدعم `page_size`.
- **الخدمات الذكية**: ماسح QR بواجهة واقعية (إطار بزوايا مضيئة + خط مسح ضوئي متحرك + تدفق تحقق متدرج capture → parse → verify).
- **المساعد الذكي**: مؤشر كتابة متحرك (نقاط)، حالة "متصل الآن" نابضة، رسائل متحركة، أسئلة سريعة أغنى.
- **توستز (react-toastify)**: `ToastContainer` في `App.tsx` + مساعد `utils/toast.ts`؛ مستخدم في نموذج التواصل ونموذج المستخدمين.
- **صفحات أخرى**: نقاط نابضة + حلقات متوسعة في الأخبار، شريط تقدّم يمتلئ عند الـ hover في الوثائق، أيقونات تواصل اجتماعي ثلاثية الأبعاد، ترويسة متدرجة لـ `UserFormDialog`.

## 13. هيكل الملفات الفعلي (المطبق)
```text
frontend/src/
├── api/
│   ├── client.ts
│   └── endpoints/{auth,users,public,travelers,screening}.ts
├── components/
│   ├── common/          # BrandLogo, PageHeader, SectionTitle, EmptyState,
│   │                    # StatCard, BackToTop, PageLoader, LoadingSkeleton
│   ├── forms/           # LoginForm, UserFormDialog, ScreeningForm + schemas
│   ├── layouts/         # PublicLayout, AdminLayout
│   ├── tables/          # TravelersTable, FlightsTable
│   ├── charts/          # CasesChart, KPIsChart
│   ├── ui/              # Button, Card, Input
│   └── ProtectedRoute.tsx
├── hooks/               # useAuth, useScreening, useTravelers
├── pages/
│   ├── public/          # HomePage, SectorsPortsPage, NewsPage, DiseasePage,
│   │                    # FaqPage, DocumentsPage, TravelRequirementsPage
│   ├── traveler/        # PreRegistrationPage, TravelerDashboardPage, RequestTrackingPage
│   ├── login/           # LoginPage
│   ├── dashboard/       # DashboardPage
│   └── users/           # UsersPage
├── store/               # slices (auth, traveler, ui) + hooks
├── styles/              # theme.ts, globals.css
├── types/               # api, user, traveler, screening
├── utils/               # formatters, validators, qr-generator, travelerSession
├── App.tsx
├── main.tsx
└── routes.tsx           # مسارات + تحميل كسول
```
