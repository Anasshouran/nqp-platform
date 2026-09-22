# خريطة الموقع (Sitemap)

## 1. الهدف
توفير صفحة هيكلية تعرض جميع أقسام وصفحات الموقع العام بشكل منظم وقابل للتصفح، لمساعدة الزوار في العثور على المحتوى بسرعة، ولتحسين محركات البحث (SEO) من خلال توفير روابط واضحة لجميع الصفحات الرئيسية.

## 2. مكونات الصفحة

### 2.1. هيكل شجري (Tree Structure)
- عرض خريطة الموقع بشكل هرمي (شجري) مع روابط قابلة للنقر لجميع الصفحات:
  - **الصفحة الرئيسية** (`/`)
  - **عن الإدارة** (`/about`)
  - **الخدمات الإلكترونية** (`/services`) — كتاب الخدمات (كتالوج قائم على الخلفية، 9 فئات)
    - الادوات الذكية (`/services/tools`)
    - خدمات المسافرين (`/services/travelers` + `/registration`, `/declaration`, `/trip`, `/documents`, `/vaccinations`, `/qr`, `/tracking`, `/amend`)
    - سلامة الأغذية (`/services/food-safety` + `/import`, `/export`, `/inspection`, `/sampling`, `/laboratory`, `/certificates`, `/fees`, `/track-shipment`, `/release-decision`)
    - شركات النقل (`/services/carriers` + `/flights`, `/manifest`, `/crew`, `/integration`, `/api`)
    - صحة نقاط الدخول (`/services/point-of-entry-health` + `/airport`, `/port`, `/land`)
    - مكافحة النواقل (`/services/vector-control` + `/guidelines`, `/alerts`, `/info`)
    - الترصد الصحي (`/services/surveillance` + `/alerts`, `/events`, `/diseases`, `/reports`)
    - المختبرات (`/services/laboratory` + `/sample-lookup`, `/analysis-status`, `/results`, `/reports`)
    - الجهات الحكومية (`/services/government` + `/verify`, `/release-decisions`, `/shipments`, `/data-exchange`, `/api`, `/reports`)
    - العامة والتحقق (`/services/verify` + `/lookup`, `/qr`, `/certificate`, `/notices`, `/assistant`)
    - المساعد الذكي (`/services/assistant`)
    - التسجيل المسبق للمسافرين (`/traveler/register`)
  - **متطلبات السفر** (`/travel-requirements`)
  - **الأخبار والإعلانات** (`/news`)
  - **الأمراض والإرشادات الصحية** (`/diseases`)
    - (قائمة بجميع الأمراض كروابط فرعية إن أمكن)
  - **مركز الوثائق** (`/documents`)
  - **الأسئلة الشائعة** (`/faq`)
  - **اتصل بنا** (`/contact`)
  - **سياسة الخصوصية** (`/privacy-policy`)
  - **شروط الاستخدام** (`/terms-of-use`)
  - **تسجيل الدخول** (`/login`)
  - **القطاعات والمنافذ** (`/sectors`)
    - تفاصيل القطاع (`/sectors/:id`)
    - تفاصيل المنفذ (`/ports/:id`)
  - **التحقق الذكي** (`/verify`) — بحث/QR/شهادة/إشعارات
  - **التعميمات** (`/circulars`)
    - تفاصيل التعميم (`/circulars/:id`)

> **المؤشرات والإحصاءات:** عُرضت سابقاً كمستند/صفحة مستقلة (`/statistics`). تم نقلها إلى الصفحة الرئيسية كقسم **"📈 مؤشرات الأداء (KPI)"** (بطاقات المؤشرات الـ12)، تُغذّى من `/api/v1/public/statistics/`، دون مسار مستقل.

**أسماء مسارات بديلة (`/portal/*`):** جميع مسارات الخدمات العميقة لها نسخة بديلة مفتوحة تحت بادئة `/portal/*` تُرسم إلى نفس أكواد الخدمات، مثال: `/portal/travelers/registration`، `/portal/food-safety/import`، إلخ. كما يتوفر `/portal` (كتالوج الخدمات).

### 2.2. خريطة الموقع بتنسيق XML (SEO)
- (تقني) يتم إنشاء ملف `sitemap.xml` تلقائياً في الخلفية (Django) وإرساله إلى محركات البحث (Google, Bing) عبر إرسال تلقائي أو يدوي.
- يتم تحديث هذا الملف تلقائياً عند إضافة صفحات أو أخبار جديدة.

## 3. نقاط النهاية الخلفية (API Endpoints)
| الطريقة | المسار | الوصف |
| :--- | :--- | :--- |
| `GET` | `/sitemap.xml` | ملف XML لخريطة الموقع (لأغراض SEO). |
| `GET` | `/api/v1/cms/sitemap` | (اختياري) استرجاع بيانات خريطة الموقع بتنسيق JSON للواجهة الأمامية. |