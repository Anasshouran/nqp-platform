
---

### 📄 5. `QR_Code.md` (تحليل وتوليد QR Codes)

```markdown
# تحليل وتوليد رمز QR (QR Code Generation & Analysis)

## 1. الهدف
توفير آلية متقدمة لتوليد وتحليل رموز QR الخاصة بالمسافرين، مع ضمان الأمان (منع التزوير) وسهولة التحقق. يتم استخدام (QR Codes) كوسيلة رئيسية لربط المسافر بملفه الصحي عند الوصول إلى المنافذ.

## 2. هيكل بيانات رمز QR (QR Payload)
رمز QR ليس مجرد رقم عشوائي، بل هو **كائن JSON مشفر ومضغوط** يحتوي على بيانات أساسية وآمنة:

| الحقل | النوع | الوصف | مثال |
| :--- | :--- | :--- | :--- |
| `traveler_id` | UUID | المعرف الفريد للمسافر في قاعدة البيانات. | `"123e4567-e89b-12d3-a456-426614174000"` |
| `passport_hash` | String | بصمة (SHA-256) لرقم جواز السفر (للتحقق من التطابق دون تخزين الرقم في الـ QR نفسه). | `"5e884898da28047151d0e56f8dc..."` |
| `issued_at` | Timestamp (ISO) | وقت إصدار رمز QR. | `"2024-07-26T10:00:00+03:00"` |
| `expires_at` | Timestamp (ISO) | وقت انتهاء صلاحية رمز QR (افتراضياً: 24 ساعة من الإصدار). | `"2024-07-27T10:00:00+03:00"` |
| `signature` | String | توقيع رقمي (HMAC-SHA256) للبيانات السابقة باستخدام مفتاح سري خاص بالمنصة، لمنع التزوير. | `"a8f5f167f44f4964e6c998d..."` |

**ملاحظة تقنية**: يتم تشفير الـ Payload باستخدام `Base64URL` لتقليل حجم البيانات وضمان توافقها مع معايير QR (إصدار 2 أو 3).

## 3. التنفيذ في Django

### 3.1. توليد رمز QR
```python
# apps/ai/services/qr_service.py
import json
import hmac
import hashlib
import base64
from datetime import datetime, timedelta
import qrcode
from io import BytesIO
from django.conf import settings

class QRService:
    SECRET_KEY = settings.QR_SECRET_KEY

    def generate_qr(self, traveler_id: str, passport_number: str) -> dict:
        # 1. إنشاء Payload
        issued_at = datetime.now()
        expires_at = issued_at + timedelta(hours=24)

        payload = {
            'traveler_id': traveler_id,
            'passport_hash': hashlib.sha256(passport_number.encode()).hexdigest(),
            'issued_at': issued_at.isoformat(),
            'expires_at': expires_at.isoformat()
        }

        # 2. إضافة التوقيع الرقمي
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            self.SECRET_KEY.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        payload['signature'] = signature

        # 3. تشفير الـ Payload
        payload_b64 = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode()

        # 4. توليد صورة QR
        qr = qrcode.QRCode(
            version=3,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(payload_b64)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # 5. تحويل الصورة إلى Base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()

        return {
            'qr_code': f"data:image/png;base64,{img_base64}",
            'qr_data': payload,
            'qr_payload': payload_b64,
            'expires_at': expires_at.isoformat()
        }

3.2. التحقق من رمز QR
# apps/ai/services/qr_service.py (متابعة)
class QRService:
    def verify_qr(self, qr_payload: str) -> dict:
        try:
            # 1. فك تشفير الـ Payload
            payload_json = base64.urlsafe_b64decode(qr_payload).decode()
            payload = json.loads(payload_json)

            # 2. التحقق من التوقيع
            signature = payload.pop('signature')
            payload_str = json.dumps(payload, sort_keys=True)
            expected_signature = hmac.new(
                self.SECRET_KEY.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()

            if signature != expected_signature:
                return {'valid': False, 'reason': 'INVALID_SIGNATURE'}

            # 3. التحقق من انتهاء الصلاحية
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if expires_at < datetime.now():
                return {'valid': False, 'reason': 'EXPIRED'}

            # 4. التحقق من صحة traveler_id (في قاعدة البيانات)
            traveler = self._get_traveler(payload['traveler_id'])
            if not traveler:
                return {'valid': False, 'reason': 'TRAVELER_NOT_FOUND'}

            return {
                'valid': True,
                'traveler_id': payload['traveler_id'],
                'passport_hash': payload['passport_hash'],
                'issued_at': payload['issued_at'],
                'expires_at': payload['expires_at']
            }

        except Exception as e:
            return {'valid': False, 'reason': str(e)}

4. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/ai/qr/generate/	توليد رمز QR لمسافر.	TRAVELER (نفسه)
POST	/api/v1/ai/qr/verify/	التحقق من صحة رمز QR.	PORT_OFFICER, SYSTEM
GET	/api/v1/ai/qr/{traveler_id}/	استرجاع رمز QR الحالي لمسافر.	TRAVELER (نفسه)
5. اعتبارات الأمان

    المفتاح السري: يتم تخزينه في متغيرات البيئة (غير مكشوف في الكود).

    انتهاء الصلاحية: صلاحية QR محدودة بـ 24 ساعة (أو أقل حسب السياسة).

    إلغاء QR: يمكن إلغاء QR يدوياً من قبل المسؤول (في حال السرقة أو الخطأ).

    تسجيل المحاولات: يتم تسجيل كل محاولة تحقق (ناجحة/فاشلة) في (Audit Log).

