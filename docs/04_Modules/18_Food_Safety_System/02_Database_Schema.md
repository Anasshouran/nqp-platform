# 02_Database_Schema — خريطة نماذج سلامة الغذاء (محدثة مقابل الكود)

> **المرجع الفعلي**: `backend/apps/food_quarantine/models.py` — **51 نموذجًا**.
> هذه الوثيقة خريطة تجميعية وليست قائمة أعمدة كاملة؛ راجع الكود للتفاصيل.

## 1. الشحنات والتسجيل
| النموذج | الدور |
| :--- | :--- |
| `FoodShipment` | الشحنة الأم: بيان/بوليصة، منفذ (`port → masterdata.EntryPoint`)، نوع الرسالة (تجارية/إغاثة/إعفاء)، الحالة (RECEIVED→FEES_DUE→AWAITING_INSPECTION→UNDER_INSPECTION→AWAITING_DECISION→نهائية) |
| `FoodShipmentItem` | أصناف الشحنة (وزن/وحدة) — أساس حساب العينات والرسوم تلقائيًا |
| `FoodDecisionCertificate` | شهادة القرار النهائي (نوعها يتبع `final_decision`) |

## 2. الرسوم والتحصيل
`FoodFeeInvoice` + بنودها · سداد بإيصال فريد `RCPT-…` · إعفاءات حسب `message_type` · تقرير المحاسب (`accounting`)

## 3. التفتيش والعينات والنتائج
`FoodInspection` (تفتيش ظاهري بقرار COMPLIANT / NEEDS_ANALYSIS / NON_COMPLIANT — لا تكرار) · `FoodSample` (+ SLA 48 ساعة) · `AnalysisCertificate`

## 4. سياسات العينات
`SamplingPolicy`: نطاق (وارد/صادر) + معيار (وزن/قيمة/عدد) + عتبة + عدد العينات + سبب افتراضي

## 5. الترصّد الغذائي (التطبيق الشقيق)
أنظمة الترصّد في `apps/food_surveillance` — انظر `03_Food_Surveillance_System.md`

## 6. ملاحظات معمارية
- **المنافذ موحدة**: كل مراجع المنفذ تشير إلى `masterdata.EntryPoint` (المطارات/الموانئ/المعابر) — السجل القديم `ports.Port` مهمل ومجسر عبر `ports.0003_bridge_to_entrypoint`.
- تصفية الشحنات حسب نوع المنفذ: `?port_type=LAND_PORT` (يُترجم داخليًا إلى `port__kind`).
- الأرقام التلقائية (فاتورة/إيصال/شهادة) عبر نمط `AutoNumberedModel` المشترك.

## ⚙️ حالة التنفيذ مقابل الكود

| الجدول/المجموعة | الحالة | ملاحظة |
| :--- | :--- | :--- |
| نماذج `apps/food_quarantine/models.py` | ✅ مطابقة | هذه الوثيقة خريطة مرجعية للنماذج الفعلية 1:1 |
| سجل المنافذ الموحد | ✅ مطبَّق (محدث) | `masterdata.EntryPoint` مع `kind` وقطاع `organization.Sector` الموحد |
| ميجرشنز | ✅ متسقة | `makemigrations --check` بلا تغييرات معلقة |
