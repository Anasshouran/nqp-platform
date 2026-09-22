
---

### 📄 10. `WHO_IHR.md` (المركز الوطني للوائح الصحية الدولية)

```markdown
# المركز الوطني للوائح الصحية الدولية - IHR Focal Point

## 1. الهدف
تمكين المركز الوطني للوائح الصحية الدولية (IHR Focal Point) من استلام التقارير الوبائية الرسمية من منصة NQP، وفقاً للوائح الصحية الدولية (IHR 2005)، لرفعها إلى منظمة الصحة العالمية (WHO). يمثل هذا التكامل التزام الدولة بالإبلاغ عن الأحداث الصحية العامة التي قد تشكل طارئاً صحياً عاماً (PHEIC).

## 2. نقاط التكامل (Integration Points)

| الاتجاه | البيانات المرسلة | التوقيت | البروتوكول | التنسيق |
| :--- | :--- | :--- | :--- | :--- |
| **من NQP → IHR** | تقرير PHEIC الفوري (حدث طارئ). | فوري (عند الحدث) | SFTP / REST API | XML / JSON (متوافق مع SPAR) |
| **من NQP → IHR** | التقرير الأسبوعي للأمراض المدرجة في IHR. | أسبوعياً (الأحد) | SFTP / REST API | XML / JSON |
| **من NQP → IHR** | التقرير السنوي لقدرات الرصد والاستجابة. | سنوياً | SFTP / REST API | XML / PDF |

## 3. نموذج تقرير PHEIC (SPAR-compliant XML - مختصر)
```xml
<IHRReport xmlns="http://www.who.int/ihr/report/1.0">
    <Header>
        <Country>SDN</Country>
        <EventDate>2024-07-25</EventDate>
        <ReportDate>2024-07-25</ReportDate>
        <EventType>PHEIC</EventType>
    </Header>
    <Event>
        <Disease>
            <Code>RA01</Code>
            <Name>COVID-19</Name>
        </Disease>
        <Location>
            <Port>KRT</Port>
            <City>Khartoum</City>
        </Location>
        <Cases>
            <Confirmed>1</Confirmed>
            <Probable>0</Probable>
        </Cases>
        <ActionsTaken>
            <Action>Isolation of patient</Action>
            <Action>Contact tracing initiated</Action>
        </ActionsTaken>
    </Event>
</IHRReport>
4. آلية العمل

    يتم توليد التقرير تلقائياً عند اكتشاف حالة PHEIC (عبر بوابة الفحص 4، أو العيادات 5، أو المختبرات 6).

    يقوم النظام بإرسال إشعار إلى المركز الوطني (عبر البريد الإلكتروني والإشعار داخل البوابة) بوجود تقرير جديد بانتظار المراجعة.

    يقوم مسؤول المركز الوطني بمراجعة التقرير (عبر واجهة مخصصة في بوابة الإدارة الاتحادية 8) وإما الموافقة عليه أو طلب تعديله.

    بعد الموافقة، يتم إرسال التقرير إلى منظمة الصحة العالمية عبر المنصة الإلكترونية المخصصة (EIS) أو عبر SFTP.

5. الأمان

    المصادقة: مفتاح API ومستخدم SFTP مخصص للمركز الوطني.

    التشفير: TLS 1.3 و SSH لـ SFTP.

    التوقيع الرقمي: يتم توقيع التقارير رقمياً من قبل المركز الوطني قبل الإرسال.

6. نقاط النهاية (API Endpoints)
الطريقة	المسار	الوصف
GET	/api/v1/integration/ihr/report/pheic	توليد تقرير PHEIC.
POST	/api/v1/integration/ihr/report/submit	إرسال التقرير إلى المركز الوطني.
GET	/api/v1/integration/ihr/report/weekly	توليد التقرير الأسبوعي.
