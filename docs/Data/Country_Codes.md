
---

### 📄 2. `Country_Codes.md` (رموز الدول - ISO 3166)

```markdown
# رموز الدول (Country Codes) - ISO 3166

## 1. نظرة عامة
هذه القائمة تحتوي على رموز الدول حسب معيار (ISO 3166-1) المستخدم في منصة NQP. تُستخدم هذه الرموز في جميع أنحاء المنصة لتحديد جنسية المسافرين، دول المنشأ، ودول الوجهة.

## 2. تنسيق الرموز
- **Alpha-2**: رمز مكون من حرفين (مثل: `SD` للسودان).
- **Alpha-3**: رمز مكون من ثلاثة أحرف (مثل: `SDN` للسودان).
- **Numeric**: رمز رقمي (مثل: `729` للسودان).

## 3. قائمة الدول الأساسية

| Alpha-2 | Alpha-3 | الرقمي | الاسم العربي | الاسم الإنجليزي | تصنيف المخاطر |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SD** | SDN | 729 | السودان | Sudan | GREEN |
| **EG** | EGY | 818 | مصر | Egypt | YELLOW |
| **SA** | SAU | 682 | السعودية | Saudi Arabia | GREEN |
| **AE** | ARE | 784 | الإمارات | United Arab Emirates | GREEN |
| **QA** | QAT | 634 | قطر | Qatar | GREEN |
| **KW** | KWT | 414 | الكويت | Kuwait | GREEN |
| **BH** | BHR | 048 | البحرين | Bahrain | GREEN |
| **OM** | OMN | 512 | عمان | Oman | GREEN |
| **JO** | JOR | 400 | الأردن | Jordan | YELLOW |
| **LB** | LBN | 422 | لبنان | Lebanon | YELLOW |
| **PS** | PSE | 275 | فلسطين | Palestine | YELLOW |
| **IQ** | IRQ | 368 | العراق | Iraq | RED |
| **SY** | SYR | 760 | سوريا | Syria | RED |
| **YE** | YEM | 887 | اليمن | Yemen | RED |
| **LY** | LBY | 434 | ليبيا | Libya | YELLOW |
| **TN** | TUN | 788 | تونس | Tunisia | YELLOW |
| **DZ** | DZA | 012 | الجزائر | Algeria | YELLOW |
| **MA** | MAR | 504 | المغرب | Morocco | YELLOW |
| **MR** | MRT | 478 | موريتانيا | Mauritania | YELLOW |
| **US** | USA | 840 | الولايات المتحدة | United States | YELLOW |
| **GB** | GBR | 826 | المملكة المتحدة | United Kingdom | YELLOW |
| **FR** | FRA | 250 | فرنسا | France | YELLOW |
| **DE** | DEU | 276 | ألمانيا | Germany | YELLOW |
| **IT** | ITA | 380 | إيطاليا | Italy | YELLOW |
| **ES** | ESP | 724 | إسبانيا | Spain | YELLOW |
| **TR** | TUR | 792 | تركيا | Turkey | YELLOW |
| **IN** | IND | 356 | الهند | India | RED |
| **PK** | PAK | 586 | باكستان | Pakistan | RED |
| **BD** | BGD | 050 | بنغلاديش | Bangladesh | RED |
| **CN** | CHN | 156 | الصين | China | YELLOW |
| **JP** | JPN | 392 | اليابان | Japan | GREEN |
| **KR** | KOR | 410 | كوريا الجنوبية | South Korea | GREEN |
| **RU** | RUS | 643 | روسيا | Russia | YELLOW |
| **BR** | BRA | 076 | البرازيل | Brazil | YELLOW |
| **ZA** | ZAF | 710 | جنوب أفريقيا | South Africa | YELLOW |
| **NG** | NGA | 566 | نيجيريا | Nigeria | RED |
| **KE** | KEN | 404 | كينيا | Kenya | YELLOW |
| **ET** | ETH | 231 | إثيوبيا | Ethiopia | YELLOW |
| **SO** | SOM | 706 | الصومال | Somalia | RED |
| **SS** | SSD | 728 | جنوب السودان | South Sudan | RED |
| **ER** | ERI | 232 | إريتريا | Eritrea | YELLOW |
| **DJ** | DJI | 262 | جيبوتي | Djibouti | YELLOW |
| **CH** | CHE | 756 | سويسرا | Switzerland | GREEN |
| **SE** | SWE | 752 | السويد | Sweden | GREEN |
| **NO** | NOR | 578 | النرويج | Norway | GREEN |
| **DK** | DNK | 208 | الدنمارك | Denmark | GREEN |
| **FI** | FIN | 246 | فنلندا | Finland | GREEN |
| **NL** | NLD | 528 | هولندا | Netherlands | GREEN |
| **BE** | BEL | 056 | بلجيكا | Belgium | GREEN |
| **AT** | AUT | 040 | النمسا | Austria | GREEN |
| **GR** | GRC | 300 | اليونان | Greece | YELLOW |
| **AU** | AUS | 036 | أستراليا | Australia | GREEN |
| **NZ** | NZL | 554 | نيوزيلندا | New Zealand | GREEN |
| **CA** | CAN | 124 | كندا | Canada | GREEN |

## 4. تصنيفات المخاطر
| التصنيف | الوصف | اللون |
| :--- | :--- | :--- |
| **GREEN** | منخفضة الخطورة | 🟢 أخضر |
| **YELLOW** | متوسطة الخطورة | 🟡 أصفر |
| **RED** | عالية الخطورة | 🔴 أحمر |

## 5. تحديث التصنيفات
- يتم تحديث تصنيفات المخاطر بناءً على توجيهات وزارة الصحة السودانية.
- يتم التحديث عبر Django Admin (بوابة الإدارة الاتحادية 8).
- يمكن أيضاً مزامنة التصنيفات تلقائياً مع منظمة الصحة العالمية (WHO).

## 6. استخدام الرموز في Django
```python
# apps/countries/models.py
from django.db import models

class Country(models.Model):
    RISK_CHOICES = (
        ('GREEN', 'منخفضة'),
        ('YELLOW', 'متوسطة'),
        ('RED', 'عالية'),
    )
    code_alpha_2 = models.CharField(max_length=2, unique=True)
    code_alpha_3 = models.CharField(max_length=3, unique=True)
    numeric_code = models.CharField(max_length=3, unique=True)
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, default='GREEN')
    updated_at = models.DateTimeField(auto_now=True)


7. مراجع

    ISO 3166-1: المعيار الرسمي.

    قائمة الدول الكاملة: ISO Online Browsing Platform.