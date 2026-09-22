# Services

---

### 2.3. صفحة "الخدمات الإلكترونية" (E-Services)

 المسار:  `/services`  
 الهدف:  بوابة شاملة تعرض جميع الخدمات المتاحة، وتوجه المستخدمين إلى البوابات المناسبة.

> ✅ **حالة التنفيذ (2026-08-27):** مطبّق كـ **كتالوج خدمات قائم على قاعدة البيانات** في `pages/public/ServicesCatalogPage.tsx`
> مع 9 فئات و50 خدمة مزروعة عبر `seed_services`، ونهاية خلفية `ServiceCategory`/`Service` في `apps/public`.
> الأدوات التفاعلية (بحث/QR/شهادة/إشعارات/مساعد) محفوظة ضمن **`/services/tools`** في `SmartServicesPage.tsx`.

## كتالوج الخدمات (/services)

- **النهاية البرمجية:** `GET /api/v1/public/service-categories/` (الفئات مع خدماتها المتداخلة)،
  `GET /api/v1/public/services/` (مع `?category=` و `?search=`)، `GET /api/v1/public/services/<code>/`.
- **النموذج:** `ServiceCategory` (كود، اسم ع/إ، أيقونة، ترتيب) و `Service` (كود، فئة، جمهور، هوية، مسار، نظام مستهدف، حالة).
- **الفئات العشر:** المسافرون، سلامة الأغذية، شركات النقل، صحة نقاط الدخول، مكافحة النواقل، الترصد الصحي، المختبرات، الجهات الحكومية، العامة والتحقق، **المساعد الذكي**.

### المسارات التفصيلية (Deep Routes)
كل خدمة لها صفحة تعريفية (`ServicePage.tsx`) تُحمَّل بياناتها من الخلفية حسب الكود وتقدّم زر الانتقال إلى النظام التشغيلي:

| الفئة | مسار الجذر | التاريخ |
| :--- | :--- | :--- |
| المسافرون | `/services/travelers[/registration|declaration|trip|documents|vaccinations|qr|tracking|amend]` | مفتوح → إجراء |
| سلامة الأغذية | `/services/food-safety[/import|export|inspection|sampling|laboratory|certificates|fees|track-shipment|release-decision]` | مفتوح → إجراء |
| شركات النقل | `/services/carriers[/flights|manifest|crew|integration|api]` | مفتوح → بوابة |
| صحة نقاط الدخول | `/services/point-of-entry-health[/airport|port|land]` | مفتوح → نظام |
| مكافحة النواقل | `/services/vector-control[/guidelines|alerts|info]` | عام |
| الترصد الصحي | `/services/surveillance[/alerts|events|diseases|reports]` | عام |
| المختبرات | `/services/laboratory[/sample-lookup|analysis-status|results|reports]` | عام/أعمال |
| الجهات الحكومية | `/services/government[/verify|release-decisions|shipments|data-exchange|api|reports]` | سوداباس |
| العامة والتحقق | `/services/verify[/lookup|qr|certificate|notices|assistant]` → `/services/tools` | عام |
| المساعد الذكي | `/services/assistant` | عام |

## المساعد الذكي (/services/assistant)
- **الوحدة:** NQP Smart Assistant — بوابة ذكية وليست مجرد chatbox.
- **المصدر:** المحتوى الرسمي المنشور حصراً (FAQ + متطلبات السفر + الإشعارات + خدمات المنصة)، لا بيانات شخصية في الوضع العام.
- **النهاية:** `POST /api/v1/public/assistant/chat/` → `{answer, answer_type, action, sources, confidence, language}`،
  `GET /api/v1/public/assistant/suggestions/`، `GET /api/v1/public/assistant/topics/`.
- **محرك الإجابة:** في `backend/apps/public/assistant.py` (تصنيف نيّة + توليد إجابة من مصادر رسمية مع مصدر ودرجة ثقة)؛
  قابل للتوسعة لاحقاً إلى RAG/LLM مع بقاء المصادر الرسمية مرجعاً أساسياً.
- **الواجهة:** `pages/public/AssistantPage.tsx` (هيرو + عمود محادثة + لوحة موضوعات/دعم).

### مكونات الواجهة الغنية (تم تنفيذها)
- **تبديل عربي/EN فعلي:** زر تبويب يرسل `language` إلى النهاية بدلاً من الترجمة المحلية فقط.
- **بطاقة قدرات الترحيب:** قائمة بما يستطيع المساعد فعله (✈️ متطلبات السفر / 📄 الخدمات / 🏥 الإرشادات الصحية / 🔔 التنبيهات / 🔎 الاستعلام).
- **شارات نوع الإجابة:** ℹ️ معلومات / ⚙️ إجراء / 🔔 تنبيه صحي / 📄 مصدر رسمي / ⚠️ لم أجد — لكل رسالة من الروبوت.
- **أزرار إجراء (CTA):** عند `answer_type=ACTION` تُعرض زر لبدء الخدمة أو زر `🔐 المتابعة عبر تسجيل الدخول` عندما `requires_auth=true`.
- **كتلة المصدر الرسمي:** عرض `آخر تحديث: <source_updated_at>` + زر `عرض المصدر` (عبر `source_url`).
- **إدخال صوتي حقيقي:** ميكروفون يعتمد على `webkitSpeechRecognition`/`SpeechRecognition` مع تدهور سلس (إيقاف الزر عند غياب الدعم).
- **تذييل خصوصية:** «لا يطلب المساعد بيانات شخصية إلا عند الحاجة لخدمة مصادق عليها».
- **صفحة `/services/assistant`:** هيرو مركز كبير (رأس بوت + عناوين + شرائح مواضيع)، عمودان (يمين = مواضيع شائعة مع عدّادات وأيقونات + بطاقة دعم؛ يسار = محادثة `SmartAssistant`).

### الأداة العائمة (Floating Widget)
- **`components/AssistantFab.tsx`:** زر عائم `🤖 اسأل NQP` في أسفل صفحات الواجهة العامة (أسفل يمين RTL) يفتح `Drawer`/كارت بمكوّن `SmartAssistant` نفسه.
- **يُخفى** في صفحة المساعد نفسها وفي صفحات الدخول واللوحات (تجنّب التكرار والصراعات).
- **تجاوبي:** شاشة كاملة تقريباً على الجوال (`82vh`) وكارت عائم على الحاسوب (عرض 460px).
- يُثبَّت في `components/layouts/PublicLayout.tsx` بجانب `BackToTop`.


## الأدوات التفاعلية (/services/tools و /verify)

> الأدوات الأربع (بحث/QR/شهادة/إشعارات) مستخلصة في مكوّن قابل لإعادة الاستخدام **`components/VerifyTools.tsx`**،
> ويُستدعى في صفحتين: **`/services/tools`** (`SmartServicesPage.tsx`) وصفحة مستقلة **`/verify`** (`VerifyPage.tsx`).

| التبويب | الخدمة | نهاية الواجهة البرمجية |
| :--- | :--- | :--- |
| 🔍 بحث عن الطلب | تتبّع حالة طلب المسافر برقم جواز السفر (الحالة + توفر QR) | `GET /api/v1/public/lookup/?passport=XXX` |
| QR Code | التحقق من صحة رمز QR (لصق JSON) | `POST /api/v1/public/verify-qr/` |
| شهادة صحية | التحقق من صحة الشهادة الصحية (رقم الشهادة) | `POST /api/v1/public/verify-certificate/` |
| إشعارات فورية | قائمة أحدث الإشعارات الصحية + تفعيل إشعارات المتصفح | `GET /api/v1/public/notices/` |

## نموذج تجريبي
- جواز سفر للبحث/التحقق: `P1234567` (محمد أحمد — حالة مكتملة)
- شهادة صحية صالحة: `NQP-YF-2026-0001`
- شهادة صحية منتهية/غير موجودة: تُرجع `EXPIRED` / `NOT_FOUND`

 التفاعل:

- كل بطاقة خدمة عبارة عن `Card` مرتبطة بمساره التفصيلي (أو رابط خارجي إن وُجد `external_url`).
- البحث يعمل على الاسم العربي/الإنجليزي والوصف، والفلاتر السريعة حسب الجمهور (الكل/المسافرون/الأعمال/الحكومة/الصحة والتحقق).

### أسماء المسارات البديلة /portal/*
- كل مسار خدمة عميق له نسخة مفتوحة تحت بادئة `/portal/*` تُرسم إلى نفس كود الخدمة، مثال: `/portal/travelers/registration`، `/portal/food-safety/import`، `/portal/verify/qr`، إلخ.
- النهاية: `/portal` يعادل كتالوج الخدمات، وتُعرَّف الأسماء في `routes/serviceRoutes.tsx` (`portalDeepServiceRoutes`).

### صفحات عامة جديدة (2026-08-27)
- قسم **"📈 مؤشرات الأداء (KPI)"** في الصفحة الرئيسية — `components/PerformanceKpiCards.tsx` (بطاقات المؤشرات الـ12، تُغذّى من `GET /api/v1/public/statistics/`). أُزيلت الصفحة المستقلة `/statistics` وعنصر "الإحصاءات" من قائمة الخدمات.
- `/sectors/:id` — `SectorDetailPage.tsx` (خريطة + منافذ قطاع).
- `/ports/:id` — `PortDetailPage.tsx` (+ `GET /api/v1/public/ports/{id}/stats/`).
- `/circulars` و `/circulars/:id` — `CircularsPage.tsx`/`CircularDetailPage.tsx` (التعميمات من CMS).
- خريطة القطاعات الثابتة: `components/PublicSudanMap.tsx` + `utils/sudanMapPoints.ts` (نقاط مطلقة معادة الاستخدام من لوحات المخرج).

--- 