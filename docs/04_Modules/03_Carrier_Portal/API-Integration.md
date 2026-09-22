# التكامل عبر API (API Integration)

## 1. الهدف
تمكين شركات الطيران من أتمتة عملية إرسال بيانات الرحلات والركاب عبر واجهات برمجة (APIs) بدلاً من رفع الملفات يدوياً، مما يضمن تحديث البيانات في الوقت الفعلي ويقلل من احتمالية الأخطاء البشرية.

## 2. آلية التكامل (Integration Mechanism)
- **بروتوكول**: HTTPS (RESTful API) مع استخدام JSON.
- **المصادقة**: مفتاح API (API Key) يُمنح لكل شركة طيران، يُرسل في الـ Header: `X-API-Key: your_api_key_here`.
- **معدل الطلبات (Rate Limiting)**: حد أقصى 100 طلب في الدقيقة لكل مفتاح API (لمنع الإفراط في الاستخدام).

## 3. نقاط النهاية المتاحة للتكامل (Integration Endpoints)
| الطريقة | المسار | الوصف | ملاحظات |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/integration/flights/` | إرسال بيانات رحلة جديدة (أو تحديثها). | يجب أن تحتوي على رقم الرحلة، المسار، التواريخ. |
| `POST` | `/api/v1/integration/flights/{id}/manifest` | إرسال قائمة الركاب لهذه الرحلة (دفعة واحدة). | يجب أن تكون بيانات الركاب بصيغة (Array of Objects). |
| `GET` | `/api/v1/integration/flights/{id}/status` | الاستعلام عن حالة الرحلة وحالة معالجة قائمة الركاب. | - |
| `GET` | `/api/v1/integration/health-notices` | استرجاع الإشعارات الصحية النشطة (التي لم تنته صلاحيتها). | - |

## 4. نموذج لطلب إرسال قائمة الركاب (Request Example)
```json
{
  "flight_number": "KRT123",
  "scheduled_departure": "2024-07-26T10:00:00Z",
  "scheduled_arrival": "2024-07-26T14:00:00Z",
  "destination_port_code": "KRT",
  "passengers": [
    {
      "passport_number": "A1234567",
      "first_name": "Mohamed",
      "last_name": "Ahmed",
      "date_of_birth": "1990-05-15",
      "nationality_code": "SD",
      "seat_number": "12A"
    },
    {
      "passport_number": "B7654321",
      "first_name": "Ahmed",
      "last_name": "Hassan",
      "date_of_birth": "1985-10-20",
      "nationality_code": "EG",
      "seat_number": "14B"
    }
  ]
}

5. نموذج للاستجابة (Response Example)
json

{
  "status": "success",
  "data": {
    "flight_id": "uuid",
    "manifest_id": "uuid",
    "processing_status": "QUEUED",
    "total_passengers": 150,
    "message": "تم استلام قائمة الركاب بنجاح. سيتم معالجتها في الخلفية."
  }
}

6. استراتيجية التعامل مع الأخطاء (Error Handling)

    400 Bad Request: بيانات غير صحيحة (مثل: تنسيق خاطئ، رقم جواز مكرر داخل القائمة).

    401 Unauthorized: مفتاح API غير صحيح أو منتهي الصلاحية.

    404 Not Found: رقم الرحلة غير موجود في النظام.

    429 Too Many Requests: تجاوز عدد الطلبات المسموح بها في الدقيقة.

7. أفضل الممارسات للشركات

    التحديثات الجزئية: بدلاً من إرسال قائمة الركاب بالكامل في كل مرة، يمكن إرسال التغييرات فقط (إضافة/حذف ركاب) عن طريق تضمين (action: add أو action: remove) في كل كائن مسافر.

    التكامل عبر Webhooks: (مستقبلي) يمكن للنظام إرسال إشعارات (Webhooks) لشركة الطيران عند حدوث تغييرات مهمة (مثل: اكتشاف حالة إيجابية لأحد الركاب).