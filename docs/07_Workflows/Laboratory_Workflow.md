
---

### 📄 6. `Laboratory_Workflow.md` (دورة العينة المخبرية)

```markdown
# WF-06: دورة العينة المخبرية (Laboratory Workflow)

## 1. الهدف
توثيق رحلة العينة المخبرية بدءاً من تسجيلها في المختبر، مروراً بالتحليل وإدخال النتيجة، وانتهاءً باعتمادها وإرسالها للجهات المعنية عبر Django Signals.

## 2. تدفق العملية

```mermaid
sequenceDiagram
    participant Clinic as العيادة (5 - React)
    participant LabTech as فني المختبر
    participant Supervisor as مشرف المختبر
    participant System as بوابة المختبرات (6 - Django)
    participant Surveillance as نظام الترصد (Django Service)
    participant EOC as غرفة الطوارئ (WebSocket)

    Clinic->>System: 1. طلب فحص مخبري + باركود (REST API)
    LabTech->>System: 2. مسح الباركود (تسجيل العينة) - React
    System-->>LabTech: 3. عرض بيانات المريض والفحص المطلوب
    LabTech->>System: 4. تحديث حالة العينة إلى "قيد التحليل" - PATCH API
    LabTech->>System: 5. إدخال النتيجة (مثل: Ct Value = 32) - POST API
    LabTech->>System: 6. حفظ النتيجة (حالة: "بانتظار الاعتماد")
    System-->>Supervisor: 7. إشعار (WebSocket) بأن هناك نتيجة بانتظار الاعتماد
    Supervisor->>System: 8. مراجعة النتيجة (مع إمكانية التعديل) - React UI
    
    alt النتيجة صحيحة
        Supervisor->>System: 9. اعتماد النتيجة - POST /approve API
        System->>Clinic: 10. إرسال النتيجة للعيادة (لتحديث التشخيص) - WebSocket
        System->>Surveillance: 11. إرسال النتيجة للترصد (مجموع) - Django Signal
        alt إذا كانت إيجابية (مرض PHEIC)
            System->>EOC: 12. إرسال إنذار فوري (WebSocket)
        end
    else النتيجة غير صحيحة / مشكوك فيها
        Supervisor->>System: 9. رفض النتيجة (طلب إعادة الفحص) - POST /reject API
        System->>LabTech: 10. إشعار بإعادة التحليل - WebSocket
    end
    
3. سياسة الاعتماد (Approval Policy)

    الأولوية القصوى (STAT): يتم اعتماد النتائج خلال 30 دقيقة (يتم تمييزها في لوحة المشرف).

    النتائج الإيجابية: لا يمكن تغييرها بعد الاعتماد (إلا بصلاحية المدير العام).

    النتائج السلبية: يتم اعتمادها تلقائياً إذا لم يعترض المشرف خلال ساعتين (Celery Beat Task).