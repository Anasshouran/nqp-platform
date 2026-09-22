# 02_Database_Schema - هيكل جداول نظام التطعيم

## 1. الجداول الأساسية (PostgreSQL)

### جدول `vaccination_certificates` (شهادات التطعيم)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف الفريد للشهادة. |
| `traveler_id` | UUID | FOREIGN KEY (travelers) | المسافر المرتبط بهذه الشهادة. |
| `disease_id` | UUID | FOREIGN KEY (diseases) | المرض الذي يقي منه اللقاح (مرتبط بـ ICD-11). |
| `vaccine_name` | VARCHAR(100) | NOT NULL | اسم اللقاح (مثل: Pfizer-BioNTech, Sinopharm). |
| `batch_number` | VARCHAR(50) | - | رقم دفعة اللقاح (للتحقق من المصدر). |
| `dose_number` | INT | NOT NULL | رقم الجرعة (1، 2، 3، جرعة معززة). |
| `dose_date` | DATE | NOT NULL | تاريخ أخذ الجرعة. |
| `expiry_date` | DATE | - | تاريخ انتهاء صلاحية المناعة (إن وجد). |
| `issuing_country` | VARCHAR(3) | - | رمز الدولة المصدرة للشهادة (ISO 3166). |
| `issuing_authority` | VARCHAR(255) | - | الجهة المصدرة (وزارة الصحة، مستشفى خاص). |
| `file_url` | TEXT | - | رابط ملف الشهادة (صورة/PDF) في نظام التخزين (S3/MinIO). |
| `qr_hash` | VARCHAR(255) | UNIQUE | بصمة رمز QR الموجود على الشهادة (للتحقق من التزوير). |
| `verification_status` | VARCHAR(20) | DEFAULT 'PENDING' | حالة التحقق (PENDING, VERIFIED, REJECTED, EXPIRED). |
| `verified_by_id` | UUID | FOREIGN KEY (users) | معرف الموظف الذي قام بالتحقق (إن تم يدوياً). |
| `verified_at` | TIMESTAMP | - | وقت التحقق. |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت رفع الشهادة. |
| `updated_at` | TIMESTAMP | - | آخر تحديث. |

### جدول `vaccination_logs` (سجل التطعيمات - لتدقيق التعديلات)
| العمود | النوع | القيد | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | المعرف الفريد. |
| `certificate_id` | UUID | FOREIGN KEY | معرف الشهادة التي تم تعديلها. |
| `action_type` | VARCHAR(30) | NOT NULL | (CREATE, UPDATE, DELETE, VERIFY). |
| `performed_by_id` | UUID | FOREIGN KEY (users) | المستخدم الذي قام بالإجراء. |
| `old_data` | JSONB | - | البيانات القديمة (قبل التعديل). |
| `new_data` | JSONB | - | البيانات الجديدة (بعد التعديل). |
| `performed_at` | TIMESTAMP | DEFAULT NOW() | وقت الإجراء. |

## 2. العلاقات (Relationships)
```mermaid
erDiagram
    travelers ||--o{ vaccination_certificates : "owns"
    diseases ||--o{ vaccination_certificates : "covers"
    vaccination_certificates }o--|| users : "verified_by"
    vaccination_certificates ||--o{ vaccination_logs : "has"

3. الفهارس (Indexes)
الجدول	العمود	نوع الفهرس	الغرض
vaccination_certificates	traveler_id	B-Tree	استرجاع سجل تطعيمات مسافر معين.
vaccination_certificates	qr_hash	UNIQUE B-Tree	البحث السريع عند مسح QR.
vaccination_certificates	verification_status	B-Tree	عرض الشهادات التي تنتظر التحقق.
vaccination_certificates	disease_id	B-Tree	إحصائيات التطعيم حسب المرض.