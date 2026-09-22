# 01_Notification_Engine - محرك الإشعارات والتنبيهات الموحد

## 1. الهدف
توحيد جميع قنوات الاتصال الخارجية في واجهة برمجية واحدة (Unified API) باستخدام Django، بحيث لا يحتاج كل مطور بوابة إلى كتابة كود خاص بكل مزود خدمة (SMS، بريد، Push). يتم إرسال الإشعارات بشكل غير متزامن عبر **Celery** لضمان عدم إبطاء استجابة واجهات الـ API.

## 2. القنوات المدعومة (Channels Matrix)
| القناة | التقنية المستخدمة | حالة التشغيل | قيود الاستخدام |
| :--- | :--- | :--- | :--- |
| **رسائل الجوال (SMS)** | REST API عبر بوابة محلية (Sudani / Zain) أو Twilio. | أساسي | يُستخدم للإشعارات الفورية (الجرعات، التنبيهات الحمراء). |
| **البريد الإلكتروني** | Django's EmailBackend (SMTP / SendGrid). | أساسي | يُستخدم للتقارير الرسمية وشهادات التعافي. |
| **الإشعارات الفورية (Push)** | Firebase Cloud Messaging (FCM) عبر `pyfcm`. | أساسي | يُستخدم لتطبيق المسافرين (التذكيرات اليومية). |
| **واتساب / تليجرام** | واجهة برمجة (Business API) - (مستقبلي). | اختياري | للتواصل التفاعلي مع المريض (روبوت محادثة). |
| **WebSocket (لحظي)** | Django Channels. | أساسي | يُستخدم لإشعار غرفة الطوارئ (EOC) بالحالات الحرجة خلال 3 ثوانٍ. |

## 3. هيكل نموذج الإشعار في Django
```python
# apps/notifications/models.py
class NotificationTemplate(models.Model):
    name = models.CharField(max_length=100)  # welcome, alert, reminder
    subject = models.CharField(max_length=255)
    body_text = models.TextField()
    body_html = models.TextField(blank=True)  # للبريد الإلكتروني
    sms_body = models.CharField(max_length=160)
    channel = models.CharField(max_length=20)  # email, sms, push, websocket

class NotificationLog(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    template = models.ForeignKey(NotificationTemplate, on_delete=models.SET_NULL, null=True)
    channel = models.CharField(max_length=20)
    recipient = models.CharField(max_length=255)  # email or phone
    subject = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=20)  # sent, failed, pending
    sent_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)

4. آلية قوالب الإشعارات (Templates)

يتم تخزين جميع الإشعارات كـ (قوالب) قابلة للتعديل من قبل الإدارة عبر Django Admin، مما يسمح بتغيير صياغة الرسائل دون الحاجة لتعديل في الكود البرمجي.
مثال: قالب إشعار الجرعة: "مرحباً {Name}، حان موعد تناول دواء {Drug} بجرعة {Dose}. يرجى التأكيد بعد التناول."
5. سياسة إعادة المحاولة (Retry Policy) عبر Celery

في حال فشل إرسال الإشعار (مثل: شبكة الجوال مقطوعة)، يقوم Celery بإعادة المحاولة بـ (فترات متزايدة: 1 دقيقة، 5 دقائق، 30 دقيقة، ثم يتم إيداع الإشعار في سجل الأخطاء مع إشعار المشرف عبر البريد الإلكتروني).
6. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/notifications/send	إرسال إشعار (يُستخدم داخلياً بواسطة الأنظمة الأخرى).	System Internal
GET	/api/v1/notifications/templates	قائمة قوالب الإشعارات.	Federal Admin
PUT	/api/v1/notifications/templates/{id}	تحديث قالب.	Federal Admin