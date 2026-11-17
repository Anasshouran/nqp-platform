# M5-D-ج-2b — Discovery: Functional Coverage Audit (4 صفحات)

**التاريخ:** 2026-11-16
**الفرع:** `feat/m5-d-j2b-discovery` (from `main` @ `575aa8f`)
**النوع:** Read-only audit — **0 production code، 0 test changes**
**النطاق:** `frontend/src/pages/{food,health,carriers,finance}`

---

## 0) الخلاصة التنفيذية

| البند | القيمة |
|---|---|
| ملفات اختبار موجودة | **7** (كما في PR #191) |
| اختبارات موجودة | **59** (`5+5+22+10` carriers، `1` finance، `12` food، `4` health) |
| صفحات/مكوّنات مصدر مغطاة | 12 مكوّناً (food) + 1 health + 6 carriers + 1 finance |
| تغطية وظيفية حقيقية (R-F1…R-F5) | **carriers: جزئية-جيدة** — **food/finance: صفر** — **health: 2/5** |
| تقدير الاختبارات الجديدة (النطاق الأصلي) | **45–59** (وليس 25–40) |
| تقدير إضافي (صفحتا carriers بلا أي اختبار) | **+9–11** → 54–70 |

**الاستنتاج:** تقدير 25–40 في الـprompt كان متحفظاً. الصفحتان الأكبر فجوةً هما
**finance** (1 اختبار لغة مقابل 14 دالة API و53 handler و4 dialogs) و**food**
(12 اختبار لغة فقط مقابل 15 دالة API و67 handler). أما **carriers** فتغطيته
أفضل بكثير مما يفترض الـprompt (42 اختباراً وظيفياً فعلياً).

---

## 1) المنهجية

- قراءة كل ملفات الاختبار السبعة سطراً بسطر وتصنيف كل اختبار على R-F1…R-F5.
- قراءة المصادر وعدّ: `on*` handlers، شروط `if/ternary`، دوال API المستوردة،
  `Dialog`/`TextField` (النماذج MUI بلا `<form>`)، وحالات `loading`/`error`/`empty`.
- لم يُشغَّل أي اختبار ولم يُعدَّل أي ملف (audit فقط).

### معايير التصنيف

| الرمز | المعيار |
|---|---|
| **R-F1** | تفاعل مستخدم (`fireEvent`/`userEvent` click/type/change) |
| **R-F2** | انتقال حالة (loading → loaded، empty، error) |
| **R-F3** | عرض شرطي (role/permission/scope) |
| **R-F4** | تحقق نموذج (منع إرسال، رسائل خطأ، حدود) |
| **R-F5** | معالجة خطأ API (4xx/5xx → واجهة خطأ) |

---

## 2) المخزون الحالي (verbatim من الملفات)

| الملف | أسطر | اختبارات |
|---|---|---|
| `carriers/CarrierDocumentsPage.test.tsx` | 110 | 5 |
| `carriers/CarrierFlightDetailPage.test.tsx` | 138 | 5 |
| `carriers/CarrierMembersPage.test.tsx` | 332 | 22 |
| `carriers/CarriersPage.test.tsx` | 240 | 10 |
| `finance/__tests__/NationalFinancePage.test.tsx` | 72 | 1 |
| `food/__tests__/FoodLanguageReactivity.test.tsx` | 270 | 12 |
| `health/HealthDashboardPage.test.tsx` | 100 | 4 |
| **الإجمالي** | **1,262** | **59** |

**ملاحظة:** `FoodLanguageReactivity.test.tsx` يستورد **12 مكوّناً** من food
(`FoodOpsPage`, `FoodPage`, `QuarantineFeesPage`, `ShipmentWorkflowPage`,
`ExportInspectionForm`, `LabPricingPage`, `FoodWindowPage`, `ChemistryLabPage`,
`FoodSurveillancePage`, `PrintBarcodeDialog`, `MicroEvaluationDialog`,
`FoodDirectorPage`) — لكن كل اختباراته **تبديل لغة AR→EN فقط** (`i18n.changeLanguage`)،
**بلا أي `fireEvent`/`userEvent`/`waitFor` على تفاعل**.

---

## 3) تغطية R-F1…R-F5 لكل صفحة

### 3.1 food — 12 اختباراً، تغطية وظيفية = 0/5

| الاختبار | R-F1 | R-F2 | R-F3 | R-F4 | R-F5 | ملاحظة |
|---|---|---|---|---|---|---|
| QuarantineFeesPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | نص الترجمة فقط |
| FoodPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | نص الترجمة فقط |
| LabPricingPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodlab) |
| FoodWindowPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodWindow) |
| ChemistryLabPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodlab) |
| FoodSurveillancePage AR | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodsurveillance) |
| PrintBarcodeDialog AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodlab) |
| MicroEvaluationDialog AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (foodlab) |
| ShipmentWorkflowPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | نص الترجمة فقط |
| FoodDirectorPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | خارج النطاق (fooddirector) |
| ExportInspectionForm AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | عرض فقط، 0 API |
| FoodOpsPage AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | نص الترجمة فقط |

**مقاييس المصادر (food):**

| الملف | أسطر | handlers | API fns | loading | error | empty | role gating | Dialog/TextField |
|---|---|---|---|---|---|---|---|---|
| `FoodOpsPage.tsx` | 799 | 47 | 15 | 21 | 15 | 14 | 0 | 0 / 29 |
| `ShipmentWorkflowPage.tsx` | 353 | 20 | 7 | 6 | 7 | 1 | 0 | 0 / 4 |
| `ExportInspectionForm.tsx` | 395 | 1 | 0 | 2 | 0 | 0 | 0 | 0 / 0 |
| `QuarantineFeesPage.tsx` | 196 | 1 | 1 | 5 | 6 | 2 | 0 | 0 / 0 |
| `FoodPage.tsx` | 117 | 1 | 1 | 2 | 2 | 2 | 0 | 0 / 0 |

- **R-F3 غير قابل للاختبار في food** (0 role/permission gating) → يُستبعد.
- **ExportInspectionForm**: 0 API + 1 handler → **لا functional tests ممكنة** (render فقط، مغطى).

### 3.2 health — 4 اختبارات، تغطية 2/5

| الاختبار | R-F1 | R-F2 | R-F3 | R-F4 | R-F5 | ملاحظة |
|---|---|---|---|---|---|---|
| يعرض المؤشرات من API الحقيقي | ✗ | ✓ | ✗ | ✗ | ✗ | loaded + قيم حقيقية |
| لا يعرض «مباشر» المزيف | ✗ | ✓ | ✗ | ✗ | ✗ | عرض مشروط (وقت التحديث) |
| خطأ + زر إعادة المحاولة | ✗ | ✓ | ✗ | ✗ | ✓ | **وجود** الزر فقط — لا نقر |
| حالة فارغة صادقة | ✗ | ✓ | ✗ | ✗ | ✗ | empty |

**مقاييس المصدر:** `HealthDashboardPage.tsx` — 210 سطراً، **0 handlers مباشر**،
**1 دالة API** (`getPublicStatistics`)، 10 شروط، `loading`/`error`/`retry` عبر
`useApi` + `ErrorState onRetry`، و`NotificationPanel` (مكوّن مشترك، خارج النطاق).

- **R-F3/R-F4 غير قابلين** (0 role gating، 0 form).
- الفجوة الفعلية: **R-F1** (نقر retry → إعادة جلب → بيانات)، و**R-F2 loading**
  (`progressbar` قبل وصول البيانات).

### 3.3 carriers — 42 اختباراً، تغطية جزئية-جيدة

| الملف | R-F1 | R-F2 | R-F3 | R-F4 | R-F5 | الحكم |
|---|---|---|---|---|---|---|
| `CarriersPage.test.tsx` (10) | ✓ | ✓ (تبويبات) | ✓ (roles) | ✗ | ✗ | لا اختبار خطأ API لـ flights/carriers/notices؛ لا تحقق نماذج |
| `CarrierDocumentsPage.test.tsx` (5) | ✓ | ✓ | ✗ | ✗ (لا يوجد نموذج مُختبَر) | ✓ | رفع/تنزيل/فلترة غير مغطاة |
| `CarrierFlightDetailPage.test.tsx` (5) | ✗ | ✓ | ✗ | ✗ | ✓ | لا تنزيل مستند ولا خطأ timeline منفرد |
| `CarrierMembersPage.test.tsx` (22) | ✓ | ✓ | ✓ | ~ (إخفاء أزرار فقط) | ✓ (404) | شبه مكتمل؛ ينقص تحقق حقل فارغ وسياقات خطأ lifecycle |

**مقاييس المصادر (carriers):**

| الملف | أسطر | handlers | API fns | loading | error | empty | role gating | Dialog/TextField |
|---|---|---|---|---|---|---|---|---|
| `CarriersPage.tsx` | 1194 | 19 | 9 | — | — | — | 2 | 0 / 0 |
| `CarrierMembersPage.tsx` | 331 | 10 | 6 | — | — | — | — | 0 / 1 |
| `CarrierCompanyPage.tsx` | 273 | 8 | 4 | 2 | 9 | 0 | 0 | 0 / 4 |
| `CarrierDocumentsPage.tsx` | 222 | 8 | 4 | — | — | — | — | 0 / 4 |
| `CarrierFlightDetailPage.tsx` | 170 | 1 | 4 | — | — | — | — | 0 / 0 |
| `CarrierDashboardPage.tsx` | 410 | 5 | 3 | 12 | 2 | 4 | 2 | 1 / 0 |

**صفحتان في مجلد carriers بلا أي اختبار:** `CarrierCompanyPage`،
`CarrierDashboardPage` (4 و3 دوال API على التوالي) — خارج «4 ملفات» الأصلية،
لكنها فجوة حقيقية ضمن منطقة carriers.

### 3.4 finance — اختبار واحد، تغطية 0/5

| الاختبار | R-F1 | R-F2 | R-F3 | R-F4 | R-F5 | ملاحظة |
|---|---|---|---|---|---|---|
| reactivity AR→EN | ✗ | ✗ | ✗ | ✗ | ✗ | نص الترجمة فقط |

**مقاييس المصدر:** `NationalFinancePage.tsx` — **1,274 سطراً**، **53 handler**،
**14 دالة API**، **4 dialogs**، **18 TextField**، **67 شرطاً**،
`loading`/`error`/`empty` موجودة، role gating = 2 إشارة.

هذه أكبر فجوة في النطاق: صفحة واحدة بحجم ~نصف food كله وبلا أي اختبار وظيفي.

---

## 4) Gap Matrix (النطاق الأصلي: 4 صفحات / 7 ملفات)

| Page | Current tests | Handlers uncovered | Branches uncovered | API calls uncovered | Forms uncovered | Est. new tests |
|---|---|---|---|---|---|---|
| **food** | 12 (i18n فقط) | ~66 (FoodOps 47 + Workflow 20 − مكرر/عرض) | ~48 | 22 (FoodOps 15 + Workflow 7) | 33 TextField | **12–16** |
| **health** | 4 | 0 (retry عبر `useApi`) | 2 (loading، retry) | 0 | 0 | **2–3** |
| **carriers (4 ملفات)** | 42 | ~18 | ~30 | ~9 (CarriersPage: flights/carriers/notices؛ Documents: upload/download) | 5 TextField | **16–20** |
| **finance** | 1 (i18n) | 53 | 67 | 14 | 18 TextField + 4 dialogs | **15–20** |
| **الإجمالي** | **59** | **~137** | **~147** | **~45** | **56+** | **45–59** |

**خارج النطاق الأصلي (اختياري، قرار منفصل):**

| Page | Current tests | Est. new tests |
|---|---|---|
| `CarrierCompanyPage` | 0 | 5–6 |
| `CarrierDashboardPage` | 0 | 4–5 |

---

## 5) التوصيات والأولوية

### أولوية 1 — finance (15–20 اختباراً)
أكبر فجوة/تكلفة. مقترح التقسيم:
1. `getFinanceSummary` → loading / loaded / error+retry.
2. جدول الفواتير → loading / empty / error / صفوف.
3. إجراءات الفاتورة: دفع، مراجعة، إلغاء، استرداد (تأكيد + نجاح + خطأ).
4. رسوم: إنشاء/تعديل/تعطيل + تحقق الحقول الإلزامية.
5. متأخرات + فلاتر/بحث + role gating.

### أولوية 2 — food (12–16)
1. `FoodOpsPage`: جلب الشحنات (loading/empty/error)، فلاتر/بحث، إنشاء شحنة،
   قرار (approve/reject) مع تأكيد، جدولة عينة، ترقيم صفحات.
2. `ShipmentWorkflowPage`: إسناد مفتش، إحالة، إنشاء فاتورة، دفع.
3. `FoodPage` / `QuarantineFeesPage`: loading/error/empty (سطحية سريعة).
4. **تخطّي** `ExportInspectionForm` (0 API).

### أولوية 3 — carriers (16–20)
- `CarriersPage`: حالات خطأ API الثلاث، تحقق نموذج إنشاء شركة، رفع manifest،
  حوار API key + regenerate.
- `CarrierDocumentsPage`: رفع (نجاح/خطأ/تحقق)، تنزيل، فلترة نوع.
- `CarrierFlightDetailPage`: تنزيل مستند، خطأ timeline منفرد.
- `CarrierMembersPage`: تحقق معرّف مستخدم فارغ، خطأ تعطيل.
- **تأجيل** `CarrierCompanyPage`/`CarrierDashboardPage` إلى ticket منفصل.

### أولوية 4 — health (2–3)
- `progressbar` أثناء التحميل، ثم إعادة المحاولة بالنقر → بيانات.
- **تخطّي** `NotificationPanel` (مكوّن مشترك مشمول في اختباراته).

### استبعادات مؤكدة
- `ExportInspectionForm` (0 API، 1 handler، عرض فقط).
- R-F3 لـ food/finance/health (لا role gating في food/health؛ finance gating سطحي
  ويُغطى داخل اختبارات الأزرار).
- مكوّنات خارج مجلدات الصفحات الأربعة (`foodlab`, `foodWindow`, `foodsurveillance`,
  `fooddirector`) — تُركّز اختباراتها الحالية على i18n فقط، وخارج هذا الـticket.

---

## 6) القيود والمخاطر

1. **تقدير الـprompt (25–40) أقل من الواقع (45–59).** السبب: food وfinance
   بلا أي تغطية وظيفية، وليس مجرد «سطحية».
2. **لا backend حقيقي** — كل الاختبارات ستعتمد `vi.mock` للـ `api/endpoints/*`؛
   لن تكشف أخطاء العقود (وهذا مقصود).
3. **النماذج MUI بلا `<form>`** (0 عبر الصفحات الأربع) → التحقق يُختبر عبر
   تعطيل زر الحفظ/رسائل الحقل، لا `submit` أحداث.
4. **`CarriersPage.tsx` (1,194 سطراً)** و**`NationalFinancePage.tsx` (1,274)**
   يحتاجان mock شامل لكل دوال API المستوردة وإلا فشل render.
5. **حدود CI:** إضافة ~50–60 اختباراً ترفع زمن frontend CI (حالياً 5m10s) بمقدار
   متوقع 3–6 دقائق — مقبول.

---

## 7) تعريف الاكتمال لهذا الـDiscovery

- [x] قراءة 7 ملفات الاختبار السبعة وتصنيفها R-F1…R-F5
- [x] عدّ handlers/branches/API/forms لكل صفحة مصدر
- [x] Gap matrix + تقدير لكل صفحة
- [x] استبعادات مبرَّرة (0 API، 0 handlers)
- [x] 0 production code، 0 test changes
- [x] الخروج بتوصية أولوية (finance → food → carriers → health)
