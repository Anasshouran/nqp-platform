# Reporting - التقارير الموجهة لمنظمة الصحة العالمية

## 1. الهدف
توفير آلية آلية لتوليد وتصدير التقارير الإجبارية المطلوبة من قبل منظمة الصحة العالمية (WHO) والمركز الوطني للوائح الصحية (IHR Focal Point) وفقاً للوائح الصحية الدولية (IHR 2005).

## 2. أنواع التقارير

### 2.1. تقرير PHEIC الفوري (Event-Based Report)
- **الغرض**: الإبلاغ عن حدث طارئ صحي عام (PHEIC) خلال 24 ساعة من اكتشافه.
- **المحتوى**:
  - اسم المرض (كود ICD-11).
  - عدد الحالات المؤكدة والمشتبه بها.
  - الموقع الجغرافي (المنفذ، المدينة).
  - التاريخ الزمني للاكتشاف.
  - الإجراءات المتخذة (عزل، حجر، إشعار).
- **التنسيق**: JSON (عبر REST API) أو XML (عبر SFTP).

### 2.2. التقرير الأسبوعي (Weekly Summary Report)
- **الغرض**: عرض ملخص للحالات الوبائية خلال الأسبوع الماضي.
- **المحتوى**:
  - إجمالي الفحوصات.
  - عدد الحالات الإيجابية لكل مرض (حسب ICD-11).
  - توزيع الحالات حسب المنافذ.
  - اتجاهات التفشي (زيادة / انخفاض).
- **التنسيق**: XML (متوافق مع IHR) و PDF (للمراجعة الداخلية).

### 2.3. تقرير الأمراض المدرجة في IHR (IHR Notifiable Diseases)
- **الغرض**: الإبلاغ عن جميع الحالات المؤكدة للأمراض المدرجة في قائمة IHR.
- **المحتوى**:
  - جدول بجميع الأمراض المدرجة في IHR.
  - عدد الحالات الجديدة خلال الفترة.
  - إجمالي الحالات التراكمي من بداية العام.
- **التنسيق**: XML و CSV.

### 2.4. تقرير قدرات الرصد والاستجابة (Surveillance & Response Capacity Report)
- **الغرض**: (سنوي) تقييم قدرات الدولة في الرصد والاستجابة وفقاً لـ IHR.
- **المحتوى**:
  - مؤشرات أداء المنافذ (عدد الفحوصات، زمن الاستجابة).
  - حالة المخزون الاستراتيجي.
  - جاهزية فرق RRT.
- **التنسيق**: PDF (منظم ومعتمد).

## 3. عملية توليد التقرير في Django
- **النموذج (Model)**: `WHOReport` في تطبيق `who`.
- **الحقول**: `report_type`, `report_date`, `content` (JSONField), `status` (draft, generated, submitted).
- **المهمة (Celery Task)**: `generate_who_report(report_type, date_range)`.
- **الجدولة (Celery Beat)**: يتم توليد التقرير الأسبوعي كل يوم أحد الساعة 3 صباحاً.

## 4. مثال على تقرير IHR (XML - مختصر)
```xml
<IHRReport xmlns="http://www.who.int/ihr/report/1.0">
    <Header>
        <Country>SDN</Country>
        <ReportingPeriod>2024-07-14 to 2024-07-20</ReportingPeriod>
        <GeneratedAt>2024-07-21T03:00:00Z</GeneratedAt>
    </Header>
    <Diseases>
        <Disease>
            <Code>RA01</Code> <!-- COVID-19 -->
            <Name>COVID-19</Name>
            <NewCases>45</NewCases>
            <TotalCases>1250</TotalCases>
        </Disease>
        <Disease>
            <Code>1B50</Code> <!-- Cholera -->
            <Name>Cholera</Name>
            <NewCases>0</NewCases>
            <TotalCases>5</TotalCases>
        </Disease>
    </Diseases>
    <Ports>
        <Port name="Khartoum International Airport">
            <Screenings>15000</Screenings>
            <PositiveCases>30</PositiveCases>
        </Port>
    </Ports>
</IHRReport>

5. واجهة المستخدم (UI) في React

    مسار: /federal-admin/who-reports.

    المكونات:

        زر: "توليد تقرير IHR" (يفتح نموذج لاختيار نوع التقرير والفترة الزمنية).

        جدول: يعرض التقارير السابقة (رقم التقرير، النوع، التاريخ، الحالة، زر "تنزيل" وزر "إرسال إلى المركز الوطني").

        زر: "إرسال إلى المركز الوطني" (يقوم بتفعيل مهمة Celery لإرسال التقرير عبر SFTP أو REST API).

6. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/who/reports/generate	توليد تقرير جديد (غير متزامن).	IHR Focal Point
GET	/api/v1/who/reports/	قائمة التقارير السابقة.	IHR Focal Point
GET	/api/v1/who/reports/{id}/download	تنزيل التقرير بصيغة (XML/PDF).	IHR Focal Point
POST	/api/v1/who/reports/{id}/submit	إرسال التقرير إلى المركز الوطني (عبر SFTP/REST).	IHR Focal Point