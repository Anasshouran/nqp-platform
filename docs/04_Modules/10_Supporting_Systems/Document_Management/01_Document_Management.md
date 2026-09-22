# 01_Document_Management - نظام إدارة الوثائق والملفات (DMS)

## 1. أنواع المستندات المخزنة
- **مستندات المسافرين**: صور جوازات السفر، التأشيرات، شهادات التطعيم، نتائج الفحوصات السابقة.
- **المستندات الرسمية**: شهادات التعافي، شهادات الإفراج الغذائي، تقارير الفحص المخبري.
- **المستندات الإدارية**: خطابات التعميم الصحي، بروتوكولات التشغيل القياسية (SOPs).

## 2. آلية التخزين (Storage Strategy) في Django
- **التخزين المحلي (Development)**: `django.core.files.storage.FileSystemStorage`.
- **التخزين السحابي (Production)**: `django-storages` مع `boto3` لـ **Amazon S3** أو **MinIO** (متوافق مع S3).
- **البيانات الوصفية (Metadata)**: يتم فهرسة كل ملف بـ (معرف المريض، نوع المستند، تاريخ الرفع، معرف الموظف الذي رفعه) لتسهيل البحث والاسترجاع.

## 3. نموذج Django للمستندات
```python
# apps/documents/models.py
class Document(models.Model):
    DOCUMENT_TYPES = (
        ('PASSPORT', 'صورة جواز سفر'),
        ('VACCINE', 'شهادة تطعيم'),
        ('CERTIFICATE', 'شهادة تعافي'),
        ('FOOD_RELEASE', 'شهادة إفراج غذائي'),
        ('OTHER', 'أخرى'),
    )
    traveler = models.ForeignKey('travelers.Traveler', on_delete=models.CASCADE, null=True, blank=True)
    shipment = models.ForeignKey('food_quarantine.FoodShipment', on_delete=models.CASCADE, null=True, blank=True)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

4. التوقيع الرقمي والتحقق (Digital Signatures)

    التوقيع الإلكتروني: يتم إصدار شهادات التعافي مُوقعة رقمياً بـ (مفتاح خاص) باستخدام مكتبة cryptography في Django، مما يجعلها مقاومة للتزوير.

    التحقق عبر QR: يمكن لأي جهة (مثل شركة طيران) مسح QR الموجود على الوثيقة للتحقق من صحتها عبر API المنصة (/api/v1/documents/verify/{hash}) دون الحاجة لتنزيل الملف الأصلي.

5. إدارة دورة حياة الوثيقة (Retention Policy)

    الوثائق النشطة (الحالات تحت المتابعة): متاحة بشكل دائم.

    الوثائق المغلقة (حالات انتهت منذ أكثر من عام): يتم نقلها إلى أرشيف بارد (Cold Storage - مثلاً: S3 Glacier) لتوفير سعة التخزين، مع الاحتفاظ بالفهرس.

6. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/documents/upload	رفع مستند جديد.	Authenticated
GET	/api/v1/documents/{id}/download	تنزيل مستند (مع التحقق من الصلاحية).	Authenticated
GET	/api/v1/documents/verify/{hash}	التحقق من صحة مستند (عام - لا يتطلب تسجيل دخول).	Public
DELETE	/api/v1/documents/{id}	حذف مستند (صلاحية محدودة).	Admin+