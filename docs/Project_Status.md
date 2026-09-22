# حالة المشروع (Project Status / جرد شامل)

آخر تحديث: **2026-08-10** — جرد سطحي (نماذج/endpoints/بذرات/اختبارات/واجهات) لكل الوحدات.

## مقياس التصنيف
- **جاهز**: منطق + واجهة + بذرة + اختبارات.
- **ناقص**: يعمل بجدية لكن بلا اختبارات/بذرات كاملة.
- **ناقص محتوى**: فجوة واضحة (endpoints قليلة، بلا اختبارات، أو محتوى «قريباً»).

## 1. الخلفية والنماذج (Backend — 21 app)
| الحالة | الوحدات (عدد endpoints) |
| :--- | :--- |
| **جاهز** | `food_quarantine` (50) ✓ 19 اختبار، `accounts` (27) للحظات، `organization` (22)، `clinic` (14)، `airport_health` (10)، `db_admin` (42)، `emergency_eoc` (18)، `public` (16)، `integration` (42) |
| **ناقص** | `carriers` (14) لا اختبارات ولا بذور، `cms` (15)، `laboratory` (19)، `reporting` (21) بلا اختبارات، `travelers` (34) بلا بذرة، `port_health` (4) قليل، `food_surveillance` (18) بلا بذرة/اختبارات |
| **ناقص محتوى** | `notifications` (5) بلا اختبارات، `risk_engine` (2) بلا اختبارات، `screening` (8) بلا اختبارات |
| **مستهلك من غيرها** | `ports` (نموذج فقط) — يُعرض عبر `public` (`/api/v1/public/ports`) |

- **بذرات (11 command)**: seed_rbac، seed_clinic، seed_lab_parameters، seed_food_fees، seed_sampling، seed_airport_health، seed_public، seed_db_admin، seed_organization، seed_org_assignments، seed_port_health.
- **اختبارات**: 17 ملف (food 19 اختبار الآن خضراء بالكامل).

## 2. الواجهة الأمامية (52 صفحة / 20 client API)
- كل app خلفي له client في `frontend/src/api/endpoints/`.
- صفحات عامة غير مكتملة المحتوى (نص «قريباً»): `SectorsPortsPage`, `DiseasePage`, `DocumentsPage` — محتوى توعوي فقط.
- `tsc --noEmit` و`vite build` يمرّان.

## 3. حالة مؤجلة موثّقة (Target State في docs/Data)
| البند | الحالة |
| :--- | :--- |
| تعريفة الرسوم الشرائحية (وارد/صادر) حسب الكمية | غير مطبقة — المحدِّث: بنود ثابتة `FoodFee` (التالي) |
| ~~سياسة العينات بالصنف + مجموعة المخاطر (100%/75%/25%)~~ | ✅ **مطبّقة** — 146 صنفاً حقوق `seed_sampling`، مطابقة صنفية + دوران حاسم R1/R2/R3 في `compute_sampling` |
| تسعير الفحوص المخبرية لكل فحص | غير مطبق — بند تحليل موحّد (التالي) |
| PDF خادم + QR للشهادات | غير مطبق — طباعة متصفح (`window.print`) (التالي) |
| تكامل الجمارك الفعلي | البنية في `integration` موجودة بدون ربط مباشر (التالي) |

## 4. الخطوات الجارية
1. اختبارات API تلقائية لدورة رقابة الأغذية ✓ (19/19 خضراء).
2. زرع جدول الأصناف الرسمي في `SamplingPolicy` ✓ (146 صنفاً + احتياطيان؛ R1:54 R2:69 R3:22).
3. تطبيق التعريفة الرسمية للرسوم في `compute_fee_breakdown` (التالي).
4. تسعير الفحوص المخبرية لكل فحص (التالي).
5. PDF + QR من الخادم (التالي).