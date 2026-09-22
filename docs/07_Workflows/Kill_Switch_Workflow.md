
---

### 📄 3. `Kill_Switch_Workflow.md` (آلية تفعيل Kill Switch)

```markdown
# WF-12: آلية تفعيل Kill Switch (Emergency Shutdown)

## 1. الهدف
توثيق الآلية الأمنية لتعليق جميع عمليات الإفراج الصحي في منفذ معين فوراً في حالات الطوارئ القصوى (مثل اكتشاف تفشي سريع لمرض خطير). توضح هذه العملية خطوات التفعيل، المصادقة المزدوجة، والإلغاء.

## 2. الممثلون (Actors)
- **مدير الطوارئ (Emergency Director)**: يمتلك صلاحية التفعيل.
- **مسؤول الأمن (Security Officer)**: يمتلك صلاحية المصادقة المزدوجة.
- **مسؤول EOC**: يقوم بالمراقبة والإلغاء (بعد السيطرة).

## 3. تدفق العملية

```mermaid
sequenceDiagram
    participant EOC as مسؤول EOC
    participant System as نظام NQP (Django)
    participant Director as مدير الطوارئ
    participant Security as مسؤول الأمن
    participant Port as المنفذ المتأثر

    EOC->>System: 1. يفتح صفحة Kill Switch في بوابة (9)
    System-->>EOC: 2. يعرض زر "تفعيل Kill Switch" (أحمر)
    EOC->>System: 3. الضغط على الزر
    System-->>EOC: 4. فتح نافذة تأكيد (اختيار المنفذ، السبب)
    EOC->>System: 5. إدخال البيانات والضغط على "تأكيد"
    
    Note over System: طلب المصادقة المزدوجة
    System->>Director: 6. طلب كلمة مرور مدير الطوارئ
    Director-->>System: 7. إدخال كلمة المرور
    System->>Security: 8. طلب كلمة مرور مسؤول الأمن
    Security-->>System: 9. إدخال كلمة المرور
    
    alt المصادقة صحيحة
        System->>System: 10. تفعيل Kill Switch
        System->>Port: 11. إرسال أمر إيقاف (WebSocket) لبوابات المنفذ
        Port-->>System: 12. تأكيد الإيقاف
        System->>System: 13. تحديث حالة المنفذ إلى "INACTIVE"
        System->>EOC: 14. عرض رسالة نجاح + شريط تحذيري
        System->>System: 15. إرسال إشعارات (SMS/Email) لجميع موظفي المنفذ
    else المصادقة خاطئة
        System-->>EOC: 16. عرض رسالة خطأ (كلمة مرور غير صحيحة)
        Note over System: تسجيل المحاولة الفاشلة في Audit Log
    end

4. صلاحيات وإجراءات الأمان

    المصادقة المزدوجة (Dual Authorization): لا يمكن التفعيل دون موافقة (مدير الطوارئ) و (مسؤول الأمن).

    سجل التدقيق: تسجيل كل محاولة (ناجحة/فاشلة) مع (الموظفين، التوقيت، IP).

    الإلغاء: لا يمكن إلغاء Kill Switch إلا عبر نفس آلية المصادقة المزدوجة.