# Organizations Integration Portal — بوابة تكامل المنظمات

## 1. الهدف

توفير واجهة إدارة موحّدة للجهات الخارجية التي تتبادل البيانات مع منصة NQP:
المنظمة، نقاط الـAPI المتاحة، التكاملات بينها، نطاقات البيانات المسموحة،
بيانات الاعتماد، اشتراكات Webhooks، سجلات الصحة، وسجلات المراجعة.

المبدأ الحاكم: **لا يُعلن عن اتصال ناجح دون دليل مسجَّل، ولا يُعرض سرّ كامل إطلاقاً.**

## 2. النموذج المعتمد

`Organization` هو النموذج المرجعي للمنظمة الخارجية. يحل محل `ExternalEntity`
(الذي كان يحمل `name`, `api_key`, `is_active` فقط) ويضيف النوع والبلد
وبيانات الاتصال وحالة المزامنة.

| النموذج | الدور | ملاحظات |
| :--- | :--- | :--- |
| `Organization` | الجهة الشريكة | يستخدم الجدول `integration_externalentity` للتوافق التاريخي |
| `ApiEndpoint` | خدمة خارجية في الكتالوج | مربوطة إلزامياً بـ`Organization` |
| `Integration` | ربط منظمة بنقطة API | unique على `(organization, endpoint)` |
| `IntegrationHealth` | دليل فحص اتصال | للقراءة + تسجيل عبر `run_check` |
| `DataScope` | صلاحية قراءة/كتابة لمورد | unique على `(organization, endpoint, direction, resource)` |
| `EncryptedCredentialValue` | سر تكامل مشفّر | Fernet، لا يُعاد عرضه |
| `WebhookSubscription` / `WebhookDelivery` | اشتراكات الأحداث ومحاولات الإرسال | `secret` write-only |
| `AuditLog` | تتبّع العمليات | للقراءة فقط |

### 2.1 ترحيل الجدول

Migration `0004` كان يسجّل حقول `Organization` في Django state فقط دون DDL،
فبقي الجدول بمخطط `ExternalEntity` القديم.migration `0005` عالج ذلك:

1. إضافة الأعمدة الجديدة كـ nullable.
2. نقل `name` → `name_en`/`name_ar` وتوليد `code` فريد.
3. تشفير `api_key` القديم إلى `api_key_encrypted` (Fernet).
4. فرض NOT NULL/unique وإسقاط العمودين القديمين.

حذف `ExternalEntity` من migration state تم عبر `SeparateDatabaseAndState`
لأن الجدول نفسه أعيد استخدامه — `DeleteModel` المباشر كان سيسقطه.

## 3. نقاط الـAPI

| المسار | الوصف |
| :--- | :--- |
| `GET/POST /api/v1/integration/entities/` | المنظمات (المسار التاريخي محفوظ) |
| `GET/POST /api/v1/integration/api-endpoints/` | كتالوج نقاط الـAPI |
| `GET/POST /api/v1/integration/integrations/` | التكاملات |
| `GET /api/v1/integration/health/` | سجلات الصحة (قراءة) |
| `POST /api/v1/integration/health/run_check/` | تسجيل نتيجة فحص موثّقة |
| `GET/POST /api/v1/integration/data-scopes/` | نطاقات البيانات (أدمن) |
| `GET/POST /api/v1/integration/credentials/` | بيانات الاعتماد (أدمن) |
| `GET/POST /api/v1/integration/webhook-subscriptions/` | الاشتراكات (أدمن) |
| `GET /api/v1/integration/webhook-deliveries/` | محاولات التوصيل (قراءة) |
| `GET /api/v1/integration/audit-logs/` | سجلات المراجعة (قراءة) |

## 4. الشاشات

| المسار | الشاشة |
| :--- | :--- |
| `/app/integration/portal` | لوحة البوابة (ملخص + وصول سريع) |
| `/app/integration/portal/organizations` | المنظمات |
| `/app/integration/portal/integrations` | التكاملات |
| `/app/integration/portal/integrations/:id` | تفاصيل تكامل |
| `/app/integration/portal/api-catalog` | كتالوج الـAPI |
| `/app/integration/portal/data-scopes` | نطاقات البيانات |
| `/app/integration/portal/credentials` | بيانات الاعتماد |
| `/app/integration/portal/webhooks` | الويب هوك + محاولات التوصيل |
| `/app/integration/portal/health` | الصحة والمراقبة |
| `/app/integration/portal/audit-logs` | سجلات المراجعة |

القائمة متاحة في Sidebar الدور `admin` تحت «بوابة المنظمات».

## 5. الأمن

### 5.1 الأسرار

- `EncryptedCredentialValue` يشفّر عبر Fernet بمفتاح مشتق من `SECRET_KEY`
  (نفس نمط `apps.who.models.WHOIntegration`).
- حقل الاستقبال في الـAPI هو `value` (write-only). `encrypted_value` لا يظهر
  في أي استجابة إطلاقاً.
- `WebhookSubscription.secret` write-only؛ يُحفظ لكن لا يُعاد.
- تسجيل فحص الصحة يمرّ على `redact_text()` قبل التخزين، فتبقى الأسرار
  مثل `api_key=...` محجوبة داخل التفاصيل.

### 5.2 الصلاحيات

الموارد الحساسة (`credentials`, `data-scopes`, `webhook-subscriptions`)
تتطلب `IsAdmin`. سجلات المراقبة ومحاولات التوصيل والصحة قراءة فقط
(`405` على أي كتابة). راجع `seed_rbac` لترميز الأدوار.

## 6. فلسفة حالة الصحة

`Integration.status` خلاصة وقائعية، لا تفاؤل:

| من | إلى | الشرط |
| :--- | :--- | :--- |
| `NOT_CONFIGURED` | `PENDING` | إضافة التكامل يدوياً |
| `PENDING` | `CONFIGURED` | ضبط auth/base_url |
| `CONFIGURED` | `VERIFIED` | **فحص ناجح مسجَّل فقط** عبر `run_check` |

فحص فاشل لا يرفع الحالة. كل نتيجة تُخزَّن كسطر `IntegrationHealth`
بـ`checked_by` و`checked_at`، فتكون قابلة للتدقيق.

## 7. الاختبارات

```bash
cd backend
DB_HOST=127.0.0.1 POSTGRES_DB=afyatna python -m pytest apps/integration -q
```

`tests/test_organization_portal.py` يغطي: CRUD، توافق المسار التاريخي، فك
تشفير الاعتمادات، عدم تسريب الأسرار، تسجيل الدليل وانتقال الحالة،
صلاحيات الأدمن، وعدم قابلية القراءة للكتابة.

## 8. Known gaps

- `MoH` / `Customs` / `Airport Health` ما زالت stubs تسجّل فقط.
- `State Party registry` غير منفّذ — لا يوجد نموذج مستقل.
- بوابة WHO/IHR الخارجية تبقى `WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED=False`.