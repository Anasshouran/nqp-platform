
---

### 📄 3. `Airport_Codes.md` (رموز المطارات - IATA)

```markdown
# رموز المطارات (Airport Codes) - IATA

## 1. نظرة عامة
هذه القائمة تحتوي على رموز المطارات حسب معيار (IATA) المستخدم في منصة NQP. تُستخدم هذه الرموز لتحديد مطارات المغادرة والوصول في جداول الرحلات وقوائم الركاب.

## 2. تنسيق الرموز
- **IATA Code**: رمز مكون من ثلاثة أحرف (مثل: `KRT` لمطار الخرطوم).
- **ICAO Code**: رمز مكون من أربعة أحرف (مثل: `HSSK` لمطار الخرطوم) - اختياري.

## 3. قائمة المطارات الأساسية

| IATA | ICAO | الاسم العربي | الاسم الإنجليزي | المدينة | الدولة | النوع |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **KRT** | HSSK | مطار الخرطوم الدولي | Khartoum International Airport | الخرطوم | SDN | دولي |
| **PZU** | HSPN | مطار بورتسودان الدولي | Port Sudan International Airport | بورتسودان | SDN | دولي |
| **ATB** | HSAT | مطار عطبرة | Atbara Airport | عطبرة | SDN | داخلي |
| **DNC** | HSDN | مطار الدامر | Damazin Airport | الدامر | SDN | داخلي |
| **ELF** | HSFS | مطار الفاشر | El Fasher Airport | الفاشر | SDN | داخلي |
| **GBU** | HSKG | مطار الخرطوم الجديد (قيد الإنشاء) | Khartoum New Airport | الخرطوم | SDN | دولي |
| **JUB** | HJJJ | مطار جوبا الدولي | Juba International Airport | جوبا | SSD | دولي |
| **CAI** | HECA | مطار القاهرة الدولي | Cairo International Airport | القاهرة | EGY | دولي |
| **JED** | OEJN | مطار الملك عبد العزيز | King Abdulaziz International Airport | جدة | SAU | دولي |
| **RUH** | OERK | مطار الملك خالد | King Khalid International Airport | الرياض | SAU | دولي |
| **DXB** | OMDB | مطار دبي الدولي | Dubai International Airport | دبي | ARE | دولي |
| **AUH** | OMAA | مطار أبو ظبي الدولي | Abu Dhabi International Airport | أبو ظبي | ARE | دولي |
| **DOH** | OTHH | مطار حمد الدولي | Hamad International Airport | الدوحة | QAT | دولي |
| **KWI** | OKBK | مطار الكويت الدولي | Kuwait International Airport | الكويت | KWT | دولي |
| **BAH** | OBBI | مطار البحرين الدولي | Bahrain International Airport | المنامة | BHR | دولي |
| **MCT** | OOMS | مطار مسقط الدولي | Muscat International Airport | مسقط | OMN | دولي |
| **AMM** | OJAI | مطار الملكة علياء | Queen Alia International Airport | عمان | JOR | دولي |
| **BEY** | OLBA | مطار رفيق الحريري | Beirut-Rafic Hariri International Airport | بيروت | LBN | دولي |
| **IST** | LTFM | مطار إسطنبول الدولي | Istanbul Airport | إسطنبول | TUR | دولي |
| **LHR** | EGLL | مطار هيثرو | London Heathrow Airport | لندن | GBR | دولي |
| **CDG** | LFPG | مطار شارل ديغول | Charles de Gaulle Airport | باريس | FRA | دولي |
| **FRA** | EDDF | مطار فرانكفورت | Frankfurt Airport | فرانكفورت | DEU | دولي |
| **AMS** | EHAM | مطار سخيبول | Amsterdam Schiphol Airport | أمستردام | NLD | دولي |
| **JFK** | KJFK | مطار جون إف كينيدي | John F. Kennedy International Airport | نيويورك | USA | دولي |
| **LAX** | KLAX | مطار لوس أنجلوس | Los Angeles International Airport | لوس أنجلوس | USA | دولي |
| **YUL** | CYUL | مطار مونتريال | Montréal-Pierre Elliott Trudeau International Airport | مونتريال | CAN | دولي |
| **SYD** | YSSY | مطار سيدني | Sydney Kingsford Smith Airport | سيدني | AUS | دولي |

## 4. تحديث البيانات
- **التكرار**: تحديث رموز المطارات عند إضافة مطارات جديدة أو تغيير الرموز.
- **المسؤول**: مسؤول النظام عبر Django Admin.
- **المصدر**: اتحاد النقل الجوي الدولي (IATA).

## 5. استخدام الرموز في Django
```python
# apps/airports/models.py
from django.db import models

class Airport(models.Model):
    AIRPORT_TYPES = (
        ('INTERNATIONAL', 'دولي'),
        ('DOMESTIC', 'داخلي'),
    )
    iata_code = models.CharField(max_length=3, unique=True)
    icao_code = models.CharField(max_length=4, unique=True, null=True, blank=True)
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    country = models.ForeignKey('countries.Country', on_delete=models.PROTECT)
    airport_type = models.CharField(max_length=20, choices=AIRPORT_TYPES, default='DOMESTIC')
    is_active = models.BooleanField(default=True)

6. مراجع

    IATA Code Search: IATA Code Search Tool.