
---

### 📄 7. `Follow_Up.md` (المتابعة المنزلية للمريض)

```markdown
# WF-07: المتابعة المنزلية للمريض (Health Follow-up)

## 1. الهدف
توثيق كيفية متابعة المريض بعد خروجه من الحجر الصحي (أو العيادة) عبر تطبيق الجوال (Flutter/React Native)، وكيفية التعامل مع تدهور حالته باستخدام محرك التقييم الديناميكي (Django Service).

## 2. تدفق العملية

```mermaid
flowchart TD
    Start([بداية: خروج المريض من العيادة]) --> Step1[1. تفعيل ملف المتابعة<br/>تحديد المدة المتوقعة (7-14 يوم) - Django ORM]
    Step1 --> Step2[2. إرسال رسالة للمريض<br/>لتحميل التطبيق وإدخال البيانات - Celery Task (SMS/Email)]
    Step2 --> Step3[3. المريض يسجل الدخول<br/>ويبدأ الإبلاغ اليومي - React Native App]
    
    subgraph Daily_Loop [الحلقة اليومية - Django Scheduler]
        Step4[4. إدخال الأعراض والعلامات<br/>(الحرارة، SpO2، الأعراض) - Mobile App]
        Step4 --> Step5[5. المحرك يقيم البيانات - Django Service]
        Step5 --> Decision1{التقييم}
        Decision1 -- أخضر (مستقر) --> Step6[6. رسالة تطمين<br/>+ تذكير بالغد - Push Notification]
        Decision1 -- أصفر (انتباه) --> Step7[7. إشعار للطبيب<br/>وإرسال نصائح للمريض - WebSocket/Email]
        Decision1 -- أحمر (خطير) --> Step8[8. إشعار فوري لغرفة الطوارئ<br/>+ طلب إسعاف إلى موقع المريض - WebSocket]
        Step8 --> Step9[9. تدخل طبي عاجل - EOC]
    end
    
    Step6 --> Step10[10. هل انتهت المدة؟]
    Step7 --> Step10
    Step9 --> Step10
    
    Step10 -- لا --> Step4
    Step10 -- نعم --> Step11[11. تحقق من استقرار الأعراض<br/>لمدة 3 أيام متتالية - Django Check]
    Step11 --> Decision2{مستقر؟}
    Decision2 -- لا --> Step12[12. تمديد المدة<br/>مع إعادة التقييم - Django Service]
    Step12 --> Step4
    Decision2 -- نعم --> Step13[13. إصدار شهادة تعافي رقمية<br/>(QR Code) - Django Report]
    Step13 --> End([النهاية])

3. آليات التنبيه (Alert Mechanisms)

    SMS/واتساب: إشعار يومي لتذكير المريض بالإبلاغ (Celery Task).

    Push Notification: إشعار فوري عبر تطبيق الجوال (Firebase Cloud Messaging).

    WebSocket: إشعار فوري لغرفة الطوارئ في الحالة الحمراء (Django Channels).