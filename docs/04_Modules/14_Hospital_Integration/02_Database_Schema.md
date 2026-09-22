# 02_Database_Schema - هيكل جداول نظام المستشفيات

## 1. الجداول الأساسية (PostgreSQL)

### جدول `hospitals` (المستشفيات - بيانات مرجعية)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف الفريد للمستشفى. |
| `name` | VARCHAR(255) | NOT NULL | اسم المستشفى. |
| `code` | VARCHAR(50) | UNIQUE | رمز المستشفى (في نظام وزارة الصحة). |
| `type` | VARCHAR(30) | NOT NULL | (GOVERNMENT, PRIVATE, MILITARY, FIELD). |
| `address` | TEXT | - | العنوان الكامل. |
| `contact_phone` | VARCHAR(20) | - | رقم الهاتف. |
| `contact_email` | VARCHAR(255) | - | البريد الإلكتروني للتواصل. |
| `api_endpoint` | VARCHAR(500) | - | نقطة نهاية API لاستقبال الإحالات (إن وجد). |
| `api_key` | VARCHAR(255) | - | مفتاح API للتحقق من الطلبات الصادرة. |
| `is_active` | BOOLEAN | DEFAULT TRUE | تفعيل/إيقاف التعامل مع المستشفى. |

### جدول `referrals` (الإحالات)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | معرف الإحالة. |
| `traveler_id` | UUID | FOREIGN KEY (travelers) | المريض المُحال. |
| `clinic_visit_id` | UUID | FOREIGN KEY (clinic_visits) | الزيارة التي نتجت عنها الإحالة. |
| `referring_doctor_id` | UUID | FOREIGN KEY (users) | الطبيب المُحيل. |
| `hospital_id` | UUID | FOREIGN KEY (hospitals) | المستشفى المُحال إليه. |
| `department` | VARCHAR(100) | - | القسم المطلوب (مثل: العناية المركزة، الجراحة). |
| `priority` | VARCHAR(20) | NOT NULL | (ROUTINE, URGENT, EMERGENCY, CRITICAL). |
| `reason` | TEXT | NOT NULL | سبب الإحالة (التشخيص المبدئي، الأعراض). |
| `clinical_summary` | JSONB | - | ملخص سريري (العلامات الحيوية، نتائج المختبر، الأدوية). |
| `attachments` | TEXT[] | - | روابط الملفات المرفقة (صور، نتائج فحوصات). |
| `status` | VARCHAR(30) | DEFAULT 'PENDING' | (PENDING, ACCEPTED, REJECTED, IN_TREATMENT, DISCHARGED, CANCELLED). |
| `external_reference_id` | VARCHAR(255) | - | رقم الإحالة في نظام المستشفى الخارجي. |
| `referred_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء. |
| `updated_at` | TIMESTAMP | - | آخر تحديث. |

### جدول `referral_updates` (تحديثات حالة الإحالة - من المستشفى)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `referral_id` | UUID | FOREIGN KEY (referrals) | الإحالة المرتبطة. |
| `status` | VARCHAR(30) | NOT NULL | الحالة الجديدة. |
| `note` | TEXT | - | ملاحظة من المستشفى (سبب الرفض، تفاصيل القبول). |
| `performed_by` | VARCHAR(255) | - | اسم الموظف في المستشفى. |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت التحديث. |

### جدول `hospital_medical_reports` (التقارير الطبية من المستشفى)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف. |
| `referral_id` | UUID | FOREIGN KEY (referrals) | الإحالة المرتبطة. |
| `report_type` | VARCHAR(30) | NOT NULL | (DISCHARGE_SUMMARY, OPERATION_REPORT, CONSULTATION). |
| `file_url` | TEXT | NOT NULL | رابط ملف التقرير (PDF/Word) في نظام التخزين (S3/MinIO). |
| `content_text` | TEXT | - | (اختياري) نص التقرير للبحث السريع. |
| `received_at` | TIMESTAMP | DEFAULT NOW() | وقت الاستلام. |
| `reviewed_by_doctor_id` | UUID | FOREIGN KEY (users) | الطبيب الذي راجع التقرير في العيادة. |
| `reviewed_at` | TIMESTAMP | - | وقت المراجعة. |

## 2. العلاقات (Relationships)
```mermaid
erDiagram
    travelers ||--o{ referrals : "has"
    clinic_visits ||--o{ referrals : "generates"
    users ||--o{ referrals : "referring_doctor"
    hospitals ||--o{ referrals : "receives"
    referrals ||--o{ referral_updates : "has"
    referrals ||--o{ hospital_medical_reports : "has"

3. الفهارس (Indexes)
الجدول	العمود	نوع الفهرس	الغرض
referrals	traveler_id	B-Tree	عرض تاريخ إحالات مريض معين.
referrals	hospital_id	B-Tree	إحصائيات الإحالات حسب المستشفى.
referrals	status	B-Tree	عرض الإحالات المعلقة/النشطة.
referrals	priority	B-Tree	تصفية الحالات الحرجة.
referral_updates	referral_id	B-Tree	تسلسل زمني لتحديثات إحالة معينة.