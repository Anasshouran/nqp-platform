# استراتيجية الاختبار الشاملة (Testing Strategy) - NQP

## 1. الهدف
تحديد استراتيجية اختبار شاملة لمنصة NQP، تضمن جودة البرمجيات، واكتشاف الأخطاء مبكراً، وتقليل المخاطر التشغيلية. تغطي هذه الاستراتيجية جميع مستويات الاختبار (الوحدة، التكامل، الأداء، الأمان، وقبول المستخدم) مع تحديد الأدوات والمسؤوليات لكل مستوى.

## 2. هرم الاختبار (Testing Pyramid)

```mermaid
flowchart TD
    subgraph Top["المستوى الأعلى - قليل العدد"]
        UAT["✅ اختبار قبول المستخدم (UAT)"]
        E2E["🔗 اختبار End-to-End (Cypress/Playwright)"]
    end
    
    subgraph Middle["المستوى المتوسط"]
        Integration["🔌 اختبار التكامل (pytest-django)"]
        API["🌐 اختبار API (DRF Test Client)"]
    end
    
    subgraph Bottom["المستوى الأساسي - كثير العدد"]
        Unit["🧩 اختبار الوحدة (pytest, Jest)"]
    end
    
    Bottom --> Middle
    Middle --> Top

3. أدوات الاختبار
المستوى
	الأداة (Backend)	الأداة (Frontend)	البيئة
اختبار الوحدة	pytest + pytest-django	Vitest + React Testing Library	Development
اختبار التكامل	pytest-django (Test Client)	Vitest + React Testing Library	Development / Staging
اختبار API	Django REST Framework Test Client	-	Staging
اختبار End-to-End	-	Cypress / Playwright	Staging
اختبار الأداء	Locust / k6	Locust / k6	Staging
اختبار الأمان	OWASP ZAP / Bandit	OWASP ZAP / ESLint Security	Staging
اختبار التوافق	-	BrowserStack / LambdaTest	Staging
اختبار قابلية الوصول	-	axe-core / WAVE	Development
4. مراحل الاختبار في دورة التطوير
المرحلة	النشاط	المسؤول	المخرجات
التطوير	اختبار الوحدة (Unit Testing)	المطور	تغطية كود > 80%
قبل الدمج (Pre-merge)	اختبار التكامل السريع (CI)	المطور + CI/CD	تمرير جميع الاختبارات
بيئة الاختبار (Staging)	اختبار التكامل الكامل، اختبار الأداء	فريق QA	تقرير الاختبارات
ما قبل الإطلاق (Pre-release)	اختبار قبول المستخدم (UAT)	المستخدمون النهائيون + QA	موافقة على الإطلاق
بعد الإطلاق (Post-release)	مراقبة الأداء والأخطاء (Monitoring)	فريق العمليات	تقارير الأداء
5. معايير القبول (Acceptance Criteria)

    تغطية الكود: لا تقل عن 80% للوحدات الأساسية، و 90% للمنطق الحرج (تقييم المخاطر، المتابعة الصحية).

    زمن استجابة API: لا يتجاوز 200ms للعمليات العادية، و 500ms لعمليات التقييم.

    الأخطاء (Bugs): عدم وجود أخطاء حرجة (Critical) أو خطيرة (Major) عند الإطلاق.

    التوافق: دعم أحدث إصدارين من (Chrome, Firefox, Safari, Edge).

    الأمان: اجتياز اختبارات OWASP Top 10.

6. بيئة الاختبار

    قاعدة بيانات: PostgreSQL منفصلة للاختبار (تُحذف وتُعاد إنشاؤها لكل اختبار).

    Redis: تشغيل Redis في الخلفية (Docker) لاختبار Celery.

    Mock Services: استخدام (WireMock) لمحاكاة خدمات وزارة الصحة والجمارك و WHO.

    CI/CD: تشغيل الاختبارات تلقائياً في GitHub Actions لكل Pull Request.

7. جدول اختبارات UAT
اليوم	السيناريوهات المغطاة	المسؤول
اليوم 1	التسجيل المسبق، الفحص الصحي (بوابة 2، 4)	موظفو الحجر + مسافرون
اليوم 2	العيادات، المختبرات (بوابة 5، 6)	أطباء + فنيو مختبر
اليوم 3	المتابعة المنزلية، الشهادات (تطبيق الجوال)	مرضى
اليوم 4	الطوارئ، التقارير (بوابة 9، 8)	إدارة + EOC