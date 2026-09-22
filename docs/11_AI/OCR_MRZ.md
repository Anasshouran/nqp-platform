
---

### 📄 2. `OCR_MRZ.md` (قراءة جوازات السفر - OCR + MRZ)

```markdown
# قراءة جوازات السفر (OCR + MRZ)

## 1. الهدف
تمكين المنصة من قراءة بيانات جواز السفر تلقائياً من صورته باستخدام تقنيات (OCR) و (MRZ - Machine Readable Zone)، لتسريع عملية التسجيل المسبق وتقليل الأخطاء البشرية في إدخال البيانات.

## 2. التقنية المستخدمة

### 2.1. OCR (Optical Character Recognition)
- **المكتبة**: استخدام (Tesseract OCR) مع (OpenCV) لمعالجة الصورة.
- **البديل الاحترافي**: استخدام (Google Cloud Vision API) أو (Amazon Textract) للحصول على دقة أعلى.

### 2.2. معالجة الصورة (Image Processing)
- **المكتبة**: OpenCV (Python).
- **الخطوات**:
  1.  تحويل الصورة إلى (Grayscale).
  2.  تحسين التباين (Contrast Enhancement).
  3.  إزالة التشويش (Denoising).
  4.  تحديد منطقة (MRZ) في جواز السفر (عادةً في الأسفل).
  5.  تدوير الصورة إذا كانت مائلة (Deskewing).

### 2.3. استخراج بيانات MRZ
- **التنسيق**: تتبع معيار (ICAO Doc 9303) لجوازات السفر.
- **مثال على نص MRZ**:
```text
P<SDNMOHAMED<<AHMED<<<<<<<<<<<<<<<<<<<<<<<
A1234567<5SDN9005155M2501013<<<<<<<<<<<<<<04

    البيانات المستخرجة:

        نوع الوثيقة: P (جواز سفر)

        البلد: SDN (السودان)

        الاسم: MOHAMED AHMED

        رقم الجواز: A1234567

        تاريخ الميلاد: 1990-05-15

        الجنس: M (ذكر)

        تاريخ الانتهاء: 2025-01-01

3. التنفيذ في Django
3.1. نموذج الخدمة (Service)

# apps/ai/services/mrz_reader.py
import cv2
import pytesseract
from PIL import Image
import re

class MRZReader:
    def __init__(self):
        pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

    def read_mrz(self, image_path: str) -> dict:
        # 1. قراءة الصورة
        image = cv2.imread(image_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 2. تحسين الصورة
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

        # 3. تحديد منطقة MRZ (الجزء السفلي من الصورة)
        height, width = gray.shape
        mrz_region = gray[int(height*0.7):height, 0:width]

        # 4. OCR
        text = pytesseract.image_to_string(mrz_region, config='--psm 6')

        # 5. استخراج البيانات من نص MRZ
        return self._parse_mrz(text)

    def _parse_mrz(self, text: str) -> dict:
        # معالجة نص MRZ واستخراج البيانات
        lines = text.strip().split('\n')
        if len(lines) < 2:
            return {}

        # السطر الأول: الاسم
        name_line = lines[0]
        # السطر الثاني: رقم الجواز، البلد، تاريخ الميلاد، إلخ
        data_line = lines[1]

        # استخراج الاسم
        name_parts = name_line.split('<<')
        last_name = name_parts[0].replace('P<', '').strip()
        first_name = name_parts[1].replace('<', ' ').strip()

        # استخراج رقم الجواز
        passport_match = re.search(r'([A-Z0-9]{6,20})', data_line)
        passport_number = passport_match.group(1) if passport_match else ''

        # استخراج تاريخ الميلاد
        dob_match = re.search(r'(\d{6})', data_line)
        if dob_match:
            dob = dob_match.group(1)
            dob_formatted = f"{dob[0:2]}-{dob[2:4]}-{dob[4:6]}"

        # استخراج الجنس
        gender_match = re.search(r'[MF]', data_line)
        gender = gender_match.group(0) if gender_match else ''

        # استخراج تاريخ الانتهاء
        expiry_match = re.search(r'(\d{6})(?=[A-Z0-9]{2}\d)', data_line)
        if expiry_match:
            expiry = expiry_match.group(1)
            expiry_formatted = f"20{expiry[0:2]}-{expiry[2:4]}-{expiry[4:6]}"

        return {
            'full_name': f"{first_name} {last_name}".strip(),
            'last_name': last_name,
            'first_name': first_name,
            'passport_number': passport_number,
            'date_of_birth': dob_formatted if 'dob_formatted' in locals() else '',
            'gender': 'M' if gender == 'M' else 'F',
            'expiry_date': expiry_formatted if 'expiry_formatted' in locals() else '',
            'nationality': 'SDN'  # يتم استخراجها من السطر الثاني
        }

        3.2. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/ai/ocr/read-passport/	رفع صورة جواز السفر واستخراج البيانات.	محمي (Authenticated)

3.3. نموذج الطلب والاستجابة

الطلب (multipart/form-data)
{
  "image": (file)
}
الاستجابة (200):

{
  "status": "success",
  "data": {
    "full_name": "محمد أحمد",
    "first_name": "محمد",
    "last_name": "أحمد",
    "passport_number": "A1234567",
    "date_of_birth": "1990-05-15",
    "gender": "M",
    "expiry_date": "2025-01-01",
    "nationality": "SDN"
  }
}
4. واجهة المستخدم

    زر: "مسح جواز السفر" (في تطبيق الجوال) - يفتح الكاميرا.

    زر: "رفع صورة جواز السفر" (في بوابة المسافرين) - لرفع صورة من الجهاز.

    معاينة البيانات: عرض البيانات المستخرجة مع إمكانية التعديل اليدوي.

    زر: "تأكيد البيانات" (لحفظها في الملف الشخصي).

5. اعتبارات الأداء

    التخزين المؤقت: يتم تخزين نتائج OCR مؤقتاً في Redis لمدة 5 دقائق (لتجنب إعادة المعالجة في حالة تعديل الصورة).

    المعالجة غير المتزامنة: استخدام Celery لمعالجة الصور الثقيلة في الخلفية.

    