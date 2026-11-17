# M5-D-ج-2b — Fix: عرض `t('…')` حرفياً في صفحات food

**التاريخ:** 2026-11-17
**الفرع:** `fix/food-t-literal` (from `main` @ `f5935c5`)
**النوع:** Bug fix — 21 موضعاً في مكوّنين إنتاجيين + مفتاح ترجمة واحد مفقود
**العلاقة:** يسبق PR Phase 1 (#211) لمنع تثبيت عيب في selectors الاختبارات

---

## 0) الخلاصة التنفيذية

| البند | القيمة |
|---|---|
| المواضع المكسورة | **21** — `FoodOpsPage.tsx` (14) + `ShipmentWorkflowPage.tsx` (7) |
| السبب | `t('…')` كُتب كنص JSX خام (`<Button>t('…')</Button>`) بدل تعبير JSX (`{t('…')}`) |
| الأثر | كل زر/عنوان متأثر كان يعرض النص الحرفي `t('food.ops…')` للمستخدم بدل العربية/الإنجليزية |
| الإصلاح | لفّ كل استدعاء بـ`{…}` (21 سطراً) — بلا أي تغيير منطقي |
| مفتاح مفقود إضافي | `food.ops.export.openForm` لم يكن موجوداً في `ar.json`/`en.json` → أُضيف |
| ملفات متغيرة | 4 (2 `.tsx` + 2 `i18n/locales`) + هذا التقرير |

**الخلاصة:** العيب كان مرئياً للمستخدم في كل تبويبات food (الكاتب، المفتش، المدير،
الصادر) وفي صفحة سير الشحنة. الإصلاح ميكانيكي 100%: 21 سطراً، صفر منطق، صفر
handler، صفر API.

---

## 1) الاستدلال — لماذا الإصلاح قبل Phase 1

اختبارات Phase 1 تحتاج selectors مستقرة:

```tsx
// قبل الإصلاح (الاختبار مجبر على تثبيت العيب):
getByText("t('food.ops.clerk.newRequest')")

// بعد الإصلاح (سلوك حقيقي):
getByRole('button', { name: /طلب وارد جديد/ })
```

لو كُتبت اختبارات food على النص الحرفي، فإن أي إصلاح لاحق كان سيكسر **~8 اختبارات**
دفعة واحدة. لذلك أُصلح العيب أولاً في PR منفصل (خيار A المعتمد من المالك)، ثم
تُكتب اختبارات Phase 1 على أسماء وصول صحيحة.

---

## 2) المواضع الـ21 (verbatim)

### `frontend/src/pages/food/FoodOpsPage.tsx` — 14

| السطر | المفتاح | العنصر |
|---|---|---|
| 206 | `food.ops.clerk.newRequest` | زر «طلب جديد» |
| 276 | `food.ops.clerk.items` | عنوان قسم الأصناف |
| 291 | `food.ops.clerk.addItem` | زر «+ إضافة صنف» |
| 292 | `food.ops.clerk.totalWeight` | ملخّص الوزن الكلي |
| 401 | `food.ops.empty.noMovement` | حالة فراغ (المحاسب) |
| 507 | `food.ops.inspector.inspect` | زر «تفتيش» |
| 510 | `food.ops.inspector.sample` | زر «عينة» |
| 513 | `food.ops.inspector.assign` | زر «إسناد» |
| 652 | `food.ops.manager.assignInspector` | زر «إسناد مفتش» |
| 654 | `food.ops.manager.review` | زر «مراجعة» |
| 656 | `food.ops.manager.finalDecision` | زر «قرار نهائي» |
| 756 | `food.ops.export.openForm` | زر «عرض الاستمارة» |
| 789 | `food.ops.export.loading` | حالة تحميل الاستمارة |
| 793 | `food.ops.export.noData` | حالة «لا بيانات» |

### `frontend/src/pages/food/ShipmentWorkflowPage.tsx` — 7

| السطر | المفتاح | العنصر |
|---|---|---|
| 143 | `food.shipmentWorkflow.backToShipments` | زر الرجوع |
| 152 | `food.shipmentWorkflow.actions.invoice` | زر «فاتورة» |
| 155 | `food.shipmentWorkflow.actions.pay` | زر «سداد» |
| 158 | `food.shipmentWorkflow.actions.assignInspector` | زر «إسناد مفتش» |
| 161 | `food.shipmentWorkflow.actions.decide` | زر «القرار النهائي» |
| 165 | `food.shipmentWorkflow.actions.referral` | زر «إحالة» |
| 189 | `food.shipmentWorkflow.details` | عنوان «التفاصيل» |

**الشكل قبل/بعد (نموذج):**

```diff
-          t('food.ops.clerk.newRequest')
+          {t('food.ops.clerk.newRequest')}
```

```diff
-<Button …>+ t('food.ops.clerk.addItem')</Button>
+<Button …>+ {t('food.ops.clerk.addItem')}</Button>
```

**ملاحظة على سطر 292:** `{t('…totalWeight')}{formatNumber(totalWeight)} كغ` — الوحدة
«كغ» مكتوبة نصاً عربياً مباشراً، وهذا **خارج نطاق هذا الإصلاح** (لم يُمسّ).

---

## 3) المفتاح المفقود `food.ops.export.openForm`

أثناء التحقق من أن كل مفتاح من الـ21 يُرجع نصاً فعلياً (لا اسم المفتاح)، تبيّن:

```
ar.json  food.ops.export: title, emptyTitle, emptyDesc, formTitle, formSubtitle, close, loading, noData
en.json  food.ops.export: title, emptyTitle, emptyDesc, formTitle, formSubtitle, close, loading, noData
```

أي أن `openForm` **غير موجود في أي ملف ترجمة**، واستخدامه الوحيد هو `FoodOpsPage.tsx:756`.
الإصلاح الميكانيكي وحده كان سيحوّل العرض من `t('food.ops.export.openForm')` إلى
`food.ops.export.openForm` — يبقى مكسوراً بحكم مفتاح مفقود.

**القرار (بموافقة المالك):** إضافة المفتاح في نفس الـPR:

| الملف | المفتاح | القيمة |
|---|---|---|
| `src/i18n/locales/ar.json` | `food.ops.export.openForm` | `عرض الاستمارة` |
| `src/i18n/locales/en.json` | `food.ops.export.openForm` | `Open form` |

تحقّق التعادل بعد الإضافة: `ar` = 7,817 ورقة، `en` = 7,817 ورقة، **0 فرق** في أي اتجاه.

**الـ20 مفتاحاً الأخرى:** كلها موجودة وغير فارغة في `ar.json` و`en.json` (تحقّق برمجي).

---

## 4) التحقق (verbatim)

| # | الأمر | النتيجة |
|---|---|---|
| 1 | `npx tsc --noEmit` | `tsc_exit=0` |
| 2 | `npm test -- --run` | `Test Files 112 passed (112)` · `Tests 855 passed (855)` |
| 3 | `npm run build` | `✓ built in 38.16s` · `build_exit=0` |
| 4 | `npm run lint` | `✖ 328 problems (0 errors, 328 warnings)` · `lint_exit=0` |
| 5 | `grep -rn ">t('" src/pages/food/*.tsx \| wc -l` | `0` |
| 6 | السطور المجرّدة `^\s+t\('…'\)$` في food | `0` |
| 7 | `git diff main --name-only \| grep -v "\.tsx$\|docs/"` | `0` (قبل إضافة ملفَي الترجمة) |

اختبارات i18n المستهدفة بعد الإضافة:

```
✓ src/pages/food/__tests__/FoodLanguageReactivity.test.tsx (12 tests)
Test Files  3 passed (3)
Tests  22 passed (22)
```

### ملاحظتان على الأرقام (شفافية)

1. **الأساس 855 وليس 857.** المالك ذكر 857، والقياس الفعلي `855 passed (855)` مع
   `112 passed (112)` ملف اختبار — أي أن **كل** ملف اختبار موجود في `git ls-files`
   جرى تشغيله ونجح. لا يوجد `skip`/`todo`/`only`/`skipIf` في أي ملف. الـdiff لا
   يضيف/يحذف أي اختبار، لذا 855 هو العدد الحقيقي على `main` أيضاً.
2. **فحص `grep -c "t('food.ops.clerk.newRequest')"` لا يمكن أن يساوي 0** بعد الإصلاح،
   لأن النص `t('…')` يبقى موجوداً داخل `{…}`. الفحص الصحيح هو ما ورد في البند 5/6
   أعلاه (صفر استدعاءات كنص JSX خام)، وكلها = 0.

---

## 5) النطاق والأثر

**ملفات متغيرة:**

```
frontend/src/pages/food/FoodOpsPage.tsx           | 28 ++++++++++++------------
frontend/src/pages/food/ShipmentWorkflowPage.tsx  | 14 ++++++------
frontend/src/i18n/locales/ar.json                 |  1 +
frontend/src/i18n/locales/en.json                 |  1 +
backend/docs/m5-d-j2b-food-t-fix.md               | (هذا الملف)
```

**غير متأثر:** صفر handler، صفر منطق، صفر API، صفر تبعيات، صفر تعديل CI،
صفر تغيير على `PROD_SCOPING_ENABLED`، وصفر تعديل على أي اختبار موجود.

**الخطوة التالية:** بعد merge هذا الـPR، تُكتب اختبارات Phase 1 (finance + food)
على selectors نظيفة: `getByRole('button', { name: /طلب وارد جديد/ })` — لا
`getByText("t('…')")`.
