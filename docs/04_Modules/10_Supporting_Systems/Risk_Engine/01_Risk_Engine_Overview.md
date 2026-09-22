
---

### 📄 3. `Risk_Engine/01_Risk_Engine_Overview.md` (محرك تقييم المخاطر)

```markdown
# 01_Risk_Engine - محرك تقييم المخاطر (Risk Assessment Engine)

## 1. الفرق بين هذا المحرك ومحرك المتابعة
- **هذا المحرك (Risk_Engine)**: يُستخدم **لحظة وصول المسافر** إلى المنفذ (بوابة 4)، لاتخاذ قرار الفحص الأولي (دخول/حجر/إحالة). يعتمد على بيانات محدودة وسريعة. زمن الاستجابة المستهدف < 500 مللي ثانية.

- **محرك المتابعة (في Health_Followup)**: يُستخدم **يومياً** لتقييم الحالات الموجودة تحت الرعاية المنزلية، ويعتمد على بيانات زمنية متسلسلة (Trends).

## 2. خوارزمية التصنيف الأولي (Initial Triage Algorithm)
يعتمد المحرك على نموذج **شجرة القرار (Decision Tree)** المبسطة لتوفير سرعة عالية. يتم تنفيذها كـ Django Service.

**المدخلات (Inputs) من بوابة الفحص (4):**
1.  درجة الحرارة (Body Temperature).
2.  تشبع الأكسجين (SpO2).
3.  الأعراض الظاهرة (Observed Symptoms) - قائمة.
4.  بلد القدوم (Origin Country) - يتم جلب تصنيفه من جدول `countries`.
5.  حالة التطعيم (Vaccination Status) - من ملف المسافر.
6.  الأمراض المزمنة (Chronic Diseases) - من ملف المسافر.

**شجرة القرار (مبسطة):**
```mermaid
flowchart TD
    Start[استلام بيانات الفحص] --> CheckTemp{الحرارة > 39°؟}
    CheckTemp -- نعم --> Red[تصنيف أحمر فوري]
    CheckTemp -- لا --> CheckSPO2{SpO2 < 93%؟}
    CheckSPO2 -- نعم --> Red
    CheckSPO2 -- لا --> CheckOrigin{بلد القدوم أحمر؟}
    CheckOrigin -- نعم --> Score[حساب درجة المخاطر + 10 نقاط إضافية]
    CheckOrigin -- لا --> Score2[حساب درجة المخاطر العادية]
    Score --> CheckChronic{أمراض مزمنة؟}
    Score2 --> CheckChronic
    CheckChronic -- نعم --> AddRisk[إضافة 5 نقاط]
    CheckChronic -- لا --> FinalScore[الدرجة النهائية]
    AddRisk --> FinalScore
    FinalScore --> Classify{الدرجة}
    Classify -- <15 --> Green[أخضر - إفراج]
    Classify -- 15-30 --> Yellow[أصفر - إحالة للعيادة]
    Classify -- >30 --> Red2[أحمر - عزل فوري + طوارئ]

معادلة حساب درجة المخاطر (Risk Score Calculation):
Risk_Score = (Temp_Weight * Temp_Score) + (SpO2_Weight * SpO2_Score) + (Symptom_Weight * Symptom_Count) + (Origin_Weight * Origin_Score) - (Vaccine_Weight * Vaccine_Discount)

الأوزان قابلة للتعديل من قبل المسؤولين عبر Django Admin (جدول RiskSettings).
3. مخرجات المحرك (Actionable Outputs)
التصنيف النهائي	الإجراء المتخذ تلقائياً
أخضر (منخفض)	إفراج فوري عن المسافر (يُطبع تصريح دخول صحي).
أصفر (متوسط)	إحالة إلى بوابة العيادات (5) لإجراء فحص سريري دقيق وطلب مسحة.
أحمر (مرتفع)	إحالة فورية إلى غرفة العزل في المنفذ، مع إشعار فوري لغرفة الطوارئ (EOC) عبر WebSocket.
4. التخزين المؤقت والتحسين (Caching)

    يتم تخزين تصنيفات الدول (Country Risk Levels) و تعريفات الأمراض في Redis لمدة ساعة واحدة لتسريع عمليات التقييم وتقليل استعلامات PostgreSQL.

    يتم تسجيل جميع مدخلات ومخرجات المحرك في جدول risk_assessments لتغذية نموذج التعلم الآلي لتحسين الخوارزمية مستقبلاً.

5. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/risk/evaluate	استدعاء المحرك لتقييم المخاطر (تُستخدم داخلياً بواسطة بوابة الفحص).	Port Officer
GET	/api/v1/risk/settings	استرجاع الأوزان الحالية.	Federal Admin
PUT	/api/v1/risk/settings	تحديث الأوزان.	Federal Admin