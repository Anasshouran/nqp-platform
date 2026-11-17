# M5-D-ج-2b Phase 1 — Functional Tests (finance + food)

## 1. Delivery

| البند | القيمة |
|---|---|
| الفرع | `feat/m5-d-j2b-phase1` (من `main@db63eee`) |
| PR | #212 |
| Baseline | Frontend **855** اختباراً (112 ملفاً) |
| بعد Phase 1 | **890** اختباراً (115 ملفاً) |
| المضاف | **+35** اختباراً |
| ملفات جديدة | 4 (3 اختبارات + هذا التقرير) |
| تعديل على ملفات موجودة | **صفر** |
| تعديل production code | **صفر** |

### التوزيع

| الملف | الاختبارات | التغطية |
|---|---|---|
| `frontend/src/pages/finance/__tests__/NationalFinancePage.functional.test.tsx` | **19** | تحميل/خطأ/نجاح، 6 حوارات، فلترة الحالة، قواعد `handlePay`، R-F4، R-F5 |
| `frontend/src/pages/food/__tests__/FoodOpsPage.functional.test.tsx` | **10** | 5 لوحات + شريط التنقل، إنشاء طلب، تفتيش، عينة، تحصيل الرسوم، استمارة الصادر |
| `frontend/src/pages/food/__tests__/ShipmentWorkflowPage.functional.test.tsx` | **6** | 6 أزرار إجراء، حوار الفاتورة، تعيين المفتش، فشل الدفع |
| **المجموع** | **35** | |

المجال: 15–20 (finance) + 12–16 (food) = 27–36. الرقم الفعلي **35** يقع في النطاق.

---

## 2. ما تم تغطيته

### finance — `NationalFinancePage` (19)

- **R-F2:** مؤشر التحميل (Chip `جارٍ التحديث…`)، خطأ فشل `getFinanceInvoices`، عرض أرقام الفواتير بعد النجاح.
- **R-F1:** إرسال فلتر الحالة للـAPI، فتح/إغلاق حوار تفاصيل الفاتورة، فتح حوار التحصيل بعنوان الفاتورة، ملء مبلغ الدفعة بالمتبقي.
- **R-F4:** رفض مبلغ صفر، رفض مبلغ يتجاوز المتبقي (كِلا الرسالتين في `Paper role="alert"`)، تعطيل زر «اعتماد الإلغاء» و«اعتماد الاسترداد» حتى إدخال السبب.
- **R-F5:** استدعاء `payFinanceInvoice` بالمعاملات الصحيحة، ظهور تنبيه عند فشل التحصيل/الاسترداد/إنشاء الرسم، إرسال سبب الإلغاء، اعتماد التسوية، إنشاء بند رسوم.

### food — `FoodOpsPage` (10)

- **R-F1:** وجود اللوحات الخمس (`data-section`) وأسماء شريط الأوامر، التنقل بـ`scrollIntoView`، فتح حوار «طلب وارد جديد»، فتح حوار التفتيش، فتح استمارة الصادر عبر `getExportForm`.
- **R-F3/R-F4:** منع الإنشاء عند نقص الحقول (`notifyError`)، تعطيل زر حفظ العينة حتى اختيار النوع.
- **R-F5:** إنشاء وإرسال الطلب، تحصيل الرسوم، الإبلاغ عن فشل التحصيل.
- **R-F2:** `DataTable` يعرض `aria-busy` أثناء التحميل — مُغطّى في اختبارات المكوّن المشترك، لم يُكرّر هنا.

### food — `ShipmentWorkflowPage` (6)

- عرض بيانات الشحنة و6 أزرار إجراء، رسالة التحميل عند عدم وجود شحنة مطابقة لـ`useParams.id`.
- منع إنشاء فاتورة بدون بنود، إنشاء فاتورة من بند مُعبّأ، تعطيل زر تعيين المفتش حتى الاختيار ثم الاستدعاء، الإبلاغ عن فشل الدفع.

---

## 3. الأنماط المستخدمة

### Selectors نظيفة

كل التفاعلات عبر `getByRole` / `findByRole` / `within(...)` بالأسماء العربية الحقيقية من `ar.json`. **صفر** `getByText("t('…')")`. أمثلة: `الفواتير`، `تفاصيل`، `تحصيل`، `تأكيد التحصيل`، `طلب وارد جديد`، `تفتيش`، `سحب عينة`، `عرض الاستمارة`، `أصدار الفاتورة`.

### Envelope API

كل استجابة مُجهّزة بصيغة `{ data: { data: … } }` — القوائم `{ results: [] }`، المتأخرات `{ items: [], total: 0 }`.

### Mocks

- **finance:** `vi.mock` لـ13 endpoint من `api/endpoints/finance` + `auth` + `masterdata` + `organization` + `utils/toast` + `hooks/useAuth` + `react-i18next`.
- **food:** `vi.mock` لـ13 endpoint من `api/endpoints/food` + `users` + `public` + `utils/toast`.
- **stubs jsdom:** `IntersectionObserver`، `ResizeObserver`، `matchMedia`، `Element.prototype.scrollIntoView`.
- **Router:** `MemoryRouter` في finance وFoodOps؛ `<Route path="/:id">` في workflow حتى يعمل `useParams`.

### ملاحظة تقنية — عيب production في `NationalFinancePage`

الصفحة تستدعي `ProcessNull()` (الذي يستدعي `useTranslation()`) كدالة عادية داخل عرض `home` (السطر 546). عند change view يُحذف هذا الاستدعاء فيُنتج React 19 الخطأ `Rendered fewer hooks than expected`. هذا عيب production حقيقي خارج نطاق Phase 1 (يُمنع تعديل production code هنا).

الحلّ داخل الاختبار فقط: `vi.mock('react-i18next')` يُعيد `useTranslation` **بلا hooks** معمراً نسخة i18n الحقيقية ومرجع `t` ثابت. النصوص العربية تبقى حقيقية، والـhook Counting يبقى ثابتاً. المرجع الثابت مهم: مرجع `t` جديد في كل استدعاء يُغيّر تبعيات `useCallback` فيجعل `refresh` يُعاد تشغيله باستمرار.

### تنبيهات إضافية

- `MUI Dialog` يضع `aria-hidden="true"` على الخلفية؛ رسائل الخطأ في finance تُقرأ بـ`getByRole('alert', { hidden: true })`.
- حقل المبلغ في finance حقل مُتحكَّم فيه بقيمة احتياطية هي المتبقي عند الفراغ؛ استخدمنا `fireEvent.change` لتعيين القيمة مباشرة بدل `clear()+type()`.
- خمسة مفاتيح i18n مفقودة في `ar.json` (`food.ops.notify.{assigned,decisionFailed,feeCollected,paymentFailed,selectInspector}`)؛ الاختبارات لا تعتمد على نصوصها.

---

## 4. الاستبعادات (من Discovery)

- `foodlab` / `foodWindow` / `foodsurveillance` / `fooddirector`
- `NotificationPanel`، `ExportInspectionForm`
- R-F3 (لا role gating في finance ولا food)
- i18n reactivity (مغطى في `NationalFinancePage.test.tsx` و`FoodLanguageReactivity.test.tsx` الأصليين)

---

## 5. التحقّق (7 فحوص قبل commit)

> الفحوص 1–3 و7 نُفّذت في **worktree نظيف** من `main@db63eee` يحوي الملفات الأربعة الجديدة فقط، لعزل التحقق عن حذف غير مُلتزم سابق لـ`frontend/src/components/common/GovernmentHeader.tsx` في شجرة العمل الأصلية (ليس جزءاً من هذا PR ولن يُضمّن في الـcommit). الفحوص 4–6 نُفّذت في شجرة العمل الأصلية.

| # | الفحص | النتيجة |
|---|---|---|
| 1 | `npx tsc --noEmit` | **exit 0** (worktree نظيف) |
| 2 | `npm test -- --run` | **855 → 890** (115 ملفاً، 0 فشل) |
| 3 | `npm run build` | **exit 0** (worktree نظيف) |
| 4 | `npm run lint` | 0 errors (328 تحذيراً سابقاً، لا تحذير من ملفات Phase 1) |
| 5 | `grep -rn "getByText(\"t('" … \| wc -l` | 0 |
| 6 | `grep -c ">t('" src/pages/food/*.tsx` | 0 لكل ملف |
| 7 | `git diff main --name-only \| grep -v "\.test\.\|docs/"` | 0 (worktree نظيف) |

> ملاحظة: في شجرة العمل الأصلية يُظهر الفحص 7 النتيجة 1 بسبب الحذف غير المُلتزم لـ`GovernmentHeader.tsx` أعلاه؛ هذا الملف **لن يُستاج** في الـcommit.

---

## 6. المرحلة التالية

- Phase 2 (carriers + health: 18–23 اختباراً) في PR منفصل.
- Q7 (backfills + `PROD_SCOPING_ENABLED=True` + adoption على VPS) هو البوابة الوحيدة المتبقية لـA2c ولا يُعطّل Phase 1.
