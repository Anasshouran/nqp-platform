
---

### 📄 4. `Risk_Assessment.md` (آلية تقييم المخاطر الداخلية)

```markdown
# WF-03: آلية تقييم المخاطر الداخلية (Risk Engine Logic)

## 1. الهدف
شرح الخوارزمية والمنطق الذي يعتمده محرك المخاطر (Django Service) لحساب درجة الخطورة (Risk Score) وتحديد التصنيف (أخضر/أصفر/أحمر) بناءً على المدخلات.

## 2. المدخلات (Inputs)
| المدخل |        المصدر  |          النطاق |        نوع البيانات في Django |

| :---               | :---           | :---          | :---        |

| درجة الحرارة |   الفحص الظاهري |           35° - 42°    | Float       |

| تشبع الأكسجين (SpO2) | الفحص الظاهري |       80% - 100% | Integer     |

| الأعراض |    اختيار الموظف | (سعال، ضيق تنفس، إلخ)        | JSON Array   |

| بلد القدوم |    بيانات الرحلة | تصنيف (أخضر/أصفر/أحمر)       | ForeignKey (Country) |

| التطعيم |   المستندات المرفوعة | (مطعم / غير مطعم)         | Boolean     |

| الأمراض المزمنة | الملف الصحي للمسافر | (سكري، قلب، مناعة)   | JSON Array |

## 3. معادلة حساب درجة المخاطر (Risk Score Calculation)
يتم تنفيذ هذه المعادلة في Django Service (apps/risk_engine/services.py).

`Risk_Score = (Temp_Weight * Temp_Score) + (SpO2_Weight * SpO2_Score) + (Symptom_Weight * Symptom_Count) + (Origin_Weight * Origin_Score) + (Chronic_Weight * Chronic_Score) - (Vaccine_Weight * Vaccine_Discount)`


**الأوزان القياسية (قابلة للتعديل من قبل المسؤول عبر Django Admin):**
| المكون (Factor) | الوزن | الحد الأقصى للدرجة |

| :---           | :---            | :--- |

| **درجة الحرارة** | 0.5 | 10 نقاط (38° فأعلى) |

| **SpO2** | 0.7 | 10 نقاط (أقل من 93%) |

| **الأعراض** | 0.3 | 5 نقاط (كل عرض) |

| **بلد القدوم** | 0.6 | 10 نقاط (أحمر) |

| **الأمراض المزمنة** | 0.4 | 8 نقاط |

| **التطعيم** | -0.4 | خصم 4 نقاط (إذا كان مطعماً) |

**التصنيف النهائي:**
- **0 - 15 نقطة**: 🟢 **أخضر** (دخول آمن)
- **16 - 30 نقطة**: 🟡 **أصفر** (إحالة للعيادة)
- **31+ نقطة**: 🔴 **أحمر** (عزل فوري + طوارئ)

## 4. شجرة القرار (Decision Tree - الحالات الخاصة)
يتم تطبيق هذه الشجرة قبل المعادلة للتعامل مع الحالات الحرجة فوراً:

```mermaid
flowchart TD
    Start[المدخلات: الحرارة, SpO2, الأعراض] --> CheckTemp{الحرارة > 39°؟}
    CheckTemp -- نعم --> Red[تصنيف أحمر فوري]
    CheckTemp -- لا --> CheckSPO2{SpO2 < 90%؟}
    CheckSPO2 -- نعم --> Red
    CheckSPO2 -- لا --> CheckOrigin{بلد القدوم أحمر؟}
    CheckOrigin -- نعم --> Score[حساب درجة المخاطر + 10 نقاط إضافية]
    CheckOrigin -- لا --> Score2[حساب درجة المخاطر العادية]
    Score --> CheckChronic{أمراض مزمنة؟}
    Score2 --> CheckChronic
    CheckChronic -- نعم --> AddRisk[إضافة 8 نقاط]
    CheckChronic -- لا --> FinalScore[الدرجة النهائية]
    AddRisk --> FinalScore
    FinalScore --> Classify{الدرجة}
    Classify -- <16 --> Green[أخضر]
    Classify -- 16-30 --> Yellow[أصفر]
    Classify -- >30 --> Red2[أحمر]

5. تسجيل القرار (Audit)

يتم تسجيل جميع مدخلات ومخرجات المحرك في جدول risk_assessments (PostgreSQL) مع الطابع الزمني، لتغذية نموذج التعلم الآلي لتحسين الخوارزمية مستقبلاً.