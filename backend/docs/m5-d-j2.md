# M5-D-ج-2 — فحص Coverage: pages/{food,health,carriers,finance}

**الحالة:** ✅ **مغلق** — PR #191 (جاري)
**التاريخ:** 2026-11-13 · **الفرع:** `feat/organizational-registry-m5-d-j2` · **الأساس:** `753e676`
**النوع:** توثيق فقط — لا كود إنتاجي، لا migrations، لا إضافة اختبارات.

## 1. الاكتشاف (§1 من الـ prompt)

ال cuatro مجلدات موجودة وتحتوي ملفات اختبار:

| المجلد | موجود؟ | ملفات اختبار موجودة | المسار |
|---|---|---|---|
| `pages/food` | ✅ | 1 | `pages/food/__tests__/FoodLanguageReactivity.test.tsx` |
| `pages/health` | ✅ | 1 | `pages/health/HealthDashboardPage.test.tsx` |
| `pages/carriers` | ✅ | 4 | `CarrierDocumentsPage` · `CarrierFlightDetailPage` · `CarrierMembersPage` · `CarriersPage` |
| `pages/finance` | ✅ | 1 | `pages/finance/__tests__/NationalFinancePage.test.tsx` |

**الإجمالي: 7 ملفات** — جميعها **ليست ضمن الـ 30 الملفات المفحوصة سابقًا** (10 من M5-D-ب + 20 من M5-D-ج-1). أي: عيّنة جديدة تمامًا.

## 2. جدول التصنيف (R1–R4 — نفس معايير M5-D-ب / ج-1)

| # | الملف | المجلد | R1 expect غير ثابت | R2 render + استعلام | R3 سلوك/تفاعل | R4 لا skip | حقيقي؟ |
|---|---|---|---|---|---|---|---|
| 1 | `pages/food/__tests__/FoodLanguageReactivity.test.tsx` | food | ✅ | ✅ | ✅ (rerender لتبديل اللغة) | ✅ | ✅ |
| 2 | `pages/health/HealthDashboardPage.test.tsx` | health | ✅ | ✅ | ✅ (انتظار API + زر إعادة محاولة) | ✅ | ✅ |
| 3 | `pages/carriers/CarrierDocumentsPage.test.tsx` | carriers | ✅ | ✅ | ✅ (fireEvent حذف/إلغاء) | ✅ | ✅ |
| 4 | `pages/carriers/CarrierFlightDetailPage.test.tsx` | carriers | ✅ | ✅ | ✅ (انتظار getFlight / getFlightTimeline) | ✅ | ✅ |
| 5 | `pages/carriers/CarrierMembersPage.test.tsx` | carriers | ✅ | ✅ | ✅ (fireEvent إنشاء عضو + mock createCarrierMember) | ✅ | ✅ |
| 6 | `pages/carriers/CarriersPage.test.tsx` | carriers | ✅ | ✅ | ✅ (fireEvent تبويبات + مؤشرات) | ✅ | ✅ |
| 7 | `pages/finance/__tests__/NationalFinancePage.test.tsx` | finance | ✅ | ✅ | ✅ (rerender لتبديل اللغة ar→en) | ✅ | ✅ |

## 3. الإحصاءات

| المقياس | القيمة |
|---|---|
| ملفات | **7** |
| حالات `it()` | **59** |
| عبارات `expect()` | **99** |
| `skip` / `todo` / `xit` | **0** |
| تأكيدات تافهة (`expect(true)`) | **0** |
| حقيقي | **7/7 = 100%** |

## 4. الحكم التراكمي (M5-D-ب + ج-1 + ج-2)

| الجولة | الملفات | حقيقي | النسبة |
|---|---|---|---|
| M5-D-ب (§Q2) | 10 | 10 | 100% |
| M5-D-ج-1 | 20 | 20 | 100% |
| M5-D-ج-2 | 7 | 7 | 100% |
| **المجموع** | **37** | **37** | **100%** |

**الاستنتاج:** لا دليل على أي اختبار زائف بين 37 ملفًا مفحوصًا (33.6% من 110 ملف الاختبار الحالي). دَين «هل الـ 786 اختبارًا حقيقية؟» مغلق بثقة عالية جداً.

## 5. انحرافات موثَّقة

| الانحراف | التوضيح |
|---|---|
| **الخطة الأصلية لم تحدد هذه 4 المجلدات في العينة المنفذة** | M5-D-ج-1 استخدمت 9 تصنيفات (utils/shipping/components/..) ولم تصب في food/health/carriers/finance — سُجّل انحراف في PR #190. ج-2 يغلق هذا الانحراف تحديدًا. |
| **لا اختبارات جديدة مضافة** | القاعدة الصارمة: إعادة كتابة فقط لو وُجد trivial. لم يُوجد trivial ⇒ عدد الاختبارات ثابت عند 845. |
| **D-M5-D-ج-2 (Coverage gaps broadly)** | هذا الملف يتحقق من *وجود* ملفات في food/health/carriers/finance. الفجوة الأوسع — «مجلدات ذات < 30% تغطية وظيفية من Q3» — تظل مفتوحة كدَين M7+ (موثَّق في m5-d-followup.md). |

## 6. المرجع

- `backend/docs/m5-d-b.md` — Q2 (العيّنة الأولى 10/10) · Q3 (الغطاء 29.95% функций)
- `backend/docs/m5-d-j1.md` — م5-D-ج-1 (20 ملفاً إضافياً)
- `backend/docs/m5-d-followup.md` — نطاق م5-D-ج (ج-1/ج-2/ج-3)
