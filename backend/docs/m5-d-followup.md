# M5-D-ج — Follow-up (deferred)

**آخر تحديث:** 2026-11-13 · **M5-D-ج-1 ✅ مغلق** (`#189`, `302a65b`) ·
**M5-D-ج-2 مؤجَّل M7+** · **M5-D-ج-3 مؤجَّل M7+**

## Scope (low priority)

### D-M5-D-ج-1: Spot-check additional files from the 98 — ✅ CLOSED

Beyond the 10 sampled in M5-D-ب, spot-check 20 more files.

**الخطة الأصلية هنا** (تحت): `pages/food/**` · `pages/airport/**` ·
`pages/airporthealth/**` · `pages/health/**` · `pages/carriers/**` ·
`pages/finance/**`.

**المنفَّذ فعليًا (M5-D-ج-1، `#189`):** عيّنة **حتمية مصنَّفة** على 9 مجالات
(utils · shipping · components · pages · layouts · public · hooks · store · api)،
لا على قائمة المجلدات أعلاه:

| التصنيف | الحوض | المختار |
|---|---|---|
| utils | 12 | 4 |
| pages/shipping | 10 | 3 |
| components (بلا layouts) | 17 | 3 |
| pages (بلا registry/shipping/public) | 39 | 3 |
| components/layouts | 4 | 2 |
| pages/public | 6 | 1 |
| hooks | 2 | 2 |
| store | 1 | 1 |
| api | 3 | 1 |

**النتيجة:** 139 `it()` · 235 `expect()` · 0 skip · 0 تافه ⇒ **20/20 حقيقي**؛
**30/30 تراكميًا = 100%** (27% من 110 ملفًا).

**انحراف مُصرَّح به:** 4 من مجلدات الخطة الأصلية لم تُغطَّ
(`pages/food` · `pages/health` · `pages/carriers` · `pages/finance`) لأن
العيّنة الحتمية على 39 ملف `pages` لم تصب فيها. الهدف (≥ 80% real) **تحقّق**،
لكن تغطية تلك المجلدات تحديدًا **لم تتحقّق** — تُرشَّح لجولة تالية إن لزم.

Goal: confirm ≥ 80% real tests across a broader sample. ✅ (100%)

التفاصيل: `backend/docs/m5-d-j1.md` · `backend/docs/m5-d-b.md` (§M5-D-ج-1 Closure).

### D-M5-D-ج-2: Coverage gaps — 🟡 مفتوح (لم يُنفَّذ)

Directories with < 30% function coverage (from Q3):
- Identify via `npm run test:coverage` per-directory report.
- Add targeted tests for uncovered handlers (onClick, onChange, submit).

**الحالة:** لم يُنفَّذ في M5-D-ج-1 (كان مخصَّصًا للفحص لا للغطاء).
`29.95%` function coverage كما هي.

### D-M5-D-ج-3: e2e (Playwright) — 🟡 DEFERRED M7+

Full-app e2e for critical flows:
- Login + role-based routing
- Registry tree navigation + facility detail
- Role assignment (STATE/LOCALITY/FACILITY pickers)
- Screening flow (port → traveler → screening)

**سبب التأجيل (مُوثَّق):** ~300MB ثنائيات chromium · +~4 دقائق CI لكل PR ·
صيانة عند كل تغيير UI · والقيمة مُسلَّمة أصلًا عبر 30/30 عيّنة + 845 اختبارًا
محميًا في CI. النطاق عند التنفيذ: 4 تدفقات · chromium فقط · workflow على PR
فقط · `workers=1`. التفاصيل: `backend/docs/m5-d-b.md` (§M5-D-ج-2).

## Priority

**Low.** M6-bis (Facility FKs، محجوب على Q7) و M5-E (الديون) لهما الأولوية.

## Trigger

M5-D-ج (الباقي: ج-2/ج-3) يبدأ فقط عندما:
1. M6-bis مدموج (أو مؤجَّل). ✅ مدموج `#182`.
2. M5-E — `m5-e-b.md` §9 (V-3 مغلق) + §10 (مصالحة العدّ) مدموجان (`#187`).
   (لا عبارة «M5-E مكتمل» صريحة في السجل ⇒ لم أضع ✅.)
3. المنتج يطلب تغطية اختبار أمامية أوسع، أو M7 يضيف تدفقات معقّدة.
