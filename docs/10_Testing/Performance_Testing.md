
---

### 📄 4. `Performance_Testing.md` (اختبارات الأداء)

```markdown
# اختبارات الأداء (Performance Testing) - NQP

## 1. الهدف
تقييم أداء النظام تحت الضغط (Load) والتأكد من أنه يستطيع التعامل مع عدد المستخدمين المتوقع (خاصة في أوقات الذروة مثل موسم الحج) دون تدهور في سرعة الاستجابة أو استقرار النظام.

## 2. سيناريوهات الاختبار

| السيناريو | الوصف | عدد المستخدمين المتزامنين | المدة | الهدف |
| :--- | :--- | :--- | :--- | :--- |
| **اختبار التحميل العادي** | محاكاة الاستخدام اليومي العادي. | 500 | 30 دقيقة | زمن استجابة < 200ms |
| **اختبار الذروة (Peak)** | محاكاة أوقات الذروة (وصول عدة رحلات في نفس الوقت). | 2000 | 15 دقيقة | زمن استجابة < 500ms |
| **اختبار التحمل (Soak)** | محاكاة الاستخدام المستمر لفترة طويلة للكشف عن تسريبات الذاكرة. | 200 | 8 ساعات | لا يوجد تسريبات |
| **اختبار التوسع (Scalability)** | زيادة عدد المستخدمين تدريجياً حتى الوصول إلى نقطة الانهيار. | متغير | حتى الانهيار | تحديد سعة النظام القصوى |

## 3. أداة الاختبار: Locust

### 3.1. ملف Locust (locustfile.py)
```python
# locustfile.py
from locust import HttpUser, task, between

class NQPUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # تسجيل الدخول للحصول على JWT
        response = self.client.post("/api/v1/auth/login/", {
            "email": "test@example.com",
            "password": "testpass"
        })
        self.token = response.json()['data']['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def screening(self):
        self.client.post("/api/v1/screening/", 
            json={
                "traveler_id": "123e4567-e89b-12d3-a456-426614174000",
                "port_id": "123e4567-e89b-12d3-a456-426614174001",
                "body_temperature": 38.5,
                "oxygen_saturation": 95,
                "observed_symptoms": ["cough"]
            },
            headers=self.headers
        )
    
    @task(2)
    def get_traveler(self):
        self.client.get(
            "/api/v1/travelers/123e4567-e89b-12d3-a456-426614174000/",
            headers=self.headers
        )
    
    @task(1)
    def get_kpis(self):
        self.client.get("/api/v1/reports/kpis/", headers=self.headers)

3.2. تشغيل الاختبار
# تشغيل Locust في الوضع التفاعلي (UI)
locust -f locustfile.py --host=https://staging.nqp.gov.sd

# تشغيل Locust في وضع الرأس (Headless)
locust -f locustfile.py --host=https://staging.nqp.gov.sd --users=1000 --spawn-rate=100 --headless --html=report.html

4. المقاييس المستهدفة
المقياس	القيمة المستهدفة	الحد الأقصى المقبول
زمن استجابة API	< 200ms	< 500ms
زمن استجابة محرك المخاطر	< 500ms	< 1000ms
معدل الطلبات في الثانية (RPS)	500	1000
استخدام الـ CPU	< 50%	< 80%
استخدام الذاكرة (RAM)	< 70%	< 90%
معدل الخطأ (Error Rate)	< 1%	< 5%
5. تقارير الأداء

    يتم إنشاء تقرير تلقائي بعد كل اختبار يحتوي على:

        متوسط زمن الاستجابة (Average Response Time).

        النسبة المئوية 95 (95th Percentile).

        عدد الطلبات الناجحة والفاشلة.

        استخدام الموارد (CPU، RAM).

6. أفضل الممارسات

    اختبار في بيئة مشابهة للإنتاج: استخدام بيئة (Staging) مشابهة للإنتاج.

    مراقبة الموارد: استخدام (Prometheus + Grafana) لمراقبة الموارد أثناء الاختبار.

    التنظيف: تنظيف بيانات الاختبار بعد الانتهاء.

    تكرار الاختبار: إجراء الاختبارات بشكل دوري (قبل كل إطلاق رئيسي).

    