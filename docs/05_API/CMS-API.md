# واجهات إدارة المحتوى (CMS API)

## 1. نظرة عامة
تُستخدم هذه الواجهات من قبل مسؤولي الموقع العام (البوابة 1) لإدارة الأخبار، الصفحات، الأسئلة الشائعة، الوثائق، وإعدادات الموقع.

## 2. المسارات (Endpoints)

### 2.1. إدارة الأخبار (News Management)
- **GET** `/api/v1/cms/news/` - قائمة الأخبار (مع التصفية حسب الفئة والتاريخ).
- **POST** `/api/v1/cms/news/` - إنشاء خبر جديد (Admin only).
- **PUT** `/api/v1/cms/news/{id}/` - تحديث خبر.
- **DELETE** `/api/v1/cms/news/{id}/` - حذف خبر.

### 2.2. إدارة الصفحات (Pages)
- **GET** `/api/v1/cms/pages/{slug}/` - الحصول على محتوى صفحة (عام).
- **PUT** `/api/v1/cms/pages/{id}/` - تحديث محتوى الصفحة (Admin only).

### 2.3. إدارة الأسئلة الشائعة (FAQ)
- **GET** `/api/v1/cms/faq/` - قائمة الأسئلة (عام).
- **POST** `/api/v1/cms/faq/` - إضافة سؤال وجواب (Admin only).
- **PUT** `/api/v1/cms/faq/{id}/` - تحديث.
- **DELETE** `/api/v1/cms/faq/{id}/` - حذف.

### 2.4. إدارة الوثائق (Documents)
- **GET** `/api/v1/cms/documents/` - قائمة الوثائق (مع التصفية).
- **POST** `/api/v1/cms/documents/` - رفع وثيقة جديدة (Admin only).
- **GET** `/api/v1/cms/documents/{id}/download/` - تحميل وثيقة.
- **DELETE** `/api/v1/cms/documents/{id}/` - حذف وثيقة.

### 2.5. إعدادات الموقع (Site Settings)
- **GET** `/api/v1/cms/settings/` - الحصول على إعدادات الموقع.
- **PUT** `/api/v1/cms/settings/` - تحديث الإعدادات (Super Admin only).