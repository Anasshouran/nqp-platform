
---

### 📄 3. `Health_Screening.md` (الفحص الصحي عند الوصول)

```markdown
# WF-02: الفحص الصحي وتقييم المخاطر (Health Screening)

## 1. الهدف
توثيق عملية الفحص الظاهري التي يقوم بها موظف الحجر الصحي لحظة وصول المسافر، وكيفية تفاعل النظام (Django Backend) معه لإصدار القرار الأولي (دخول، حجر، إحالة).

## 2. متطلبات مسبقة
- المسافر مسجل مسبقاً في النظام (لديه ملف في قاعدة البيانات).
- الموظف مسجل دخوله إلى بوابة (4) (React) ومصادق عليه عبر JWT.

## 3. تدفق العملية (مع التركيز على السرعة)

```mermaid
sequenceDiagram
    participant Traveler as المسافر
    participant Officer as موظف الحجر
    participant System as بوابة الفحص (4 - React)
    participant Risk as محرك المخاطر (Django Service)

    Traveler->>Officer: 1. يصل ويسلم جواز السفر (أو يعرض QR)
    Officer->>System: 2. مسح QR أو إدخال رقم الجواز
    System-->>Officer: 3. عرض بيانات المسافر (صورة، اسم، تاريخ) - من PostgreSQL
    Officer->>System: 4. قياس الحرارة (38.5) وإدخالها
    Officer->>System: 5. قياس SpO2 (94%) وإدخاله
    Officer->>System: 6. اختيار الأعراض الظاهرة (سعال، احتقان)
    Officer->>System: 7. الضغط على زر "تقييم المخاطر"
    
    System->>Risk: 8. إرسال البيانات (الأعراض، العلامات، البلد، التطعيم) - عبر REST API
    Risk-->>System: 9. إرجاع التصنيف (YELLOW) + التوصية (إحالة) - خلال 500ms
    System-->>Officer: 10. عرض النتيجة (بطاقة صفراء) - React Component
    
    alt تصنيف أخضر
        System->>System: إصدار تصريح دخول (PDF)
        Officer-->>Traveler: 11. "مرحباً، يمكنك الدخول"
    else تصنيف أصفر/أحمر
        System->>System: توليد إحالة إلكترونية للعيادة (Django ORM)
        Officer-->>Traveler: 11. "يرجى التوجه للعيادة رقم 3"
        System->>Clinic: 12. إرسال الإحالة + بيانات المسافر (WebSocket / REST)
    end

4. نقاط القرار الرئيسية (Decision Points)

    إذا تجاوزت الحرارة 39 درجة ← تصنيف (أحمر) فوري، بغض النظر عن الأعراض الأخرى.

    إذا كان SpO2 أقل من 93% ← تصنيف (أحمر) فوري + إشعار غرفة الطوارئ (EOC) عبر WebSocket.

    إذا كانت دولة القدوم مصنفة (حمراء) ← رفع التصنيف درجة واحدة تلقائياً (يتم جلبه من Redis Cache).