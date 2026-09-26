# WHO ICD-11 Mapping Review API

## نظرة عامة

إدارة سير عمل **مراجعة خرائط ربط أمراض المنصة بأكواد/كيانات ICD-11**. العملية آمنة تماماً:
لا تعدّل أي بيانات للمرض (Disease) ولا أسماءه ولا أكواده، ولا توجد موافقة تلقائية — الاعتماد قرار بشري دائم.

سير العمل: `اقتراح → مراجعة → اعتماد / رفض`

| الانتقال | المسموح فقط من |
|----------|----------------|
| `PENDING → PROPOSED` | الإنشاء عبر API |
| `PROPOSED → REVIEW` | `POST …/{id}/review/` |
| `REVIEW → APPROVED` | `POST …/{id}/approve/` |
| `REVIEW → REJECTED` | `POST …/{id}/reject/` |

لا يمكن تجاوز هذه السلسلة (لا اعتماد مباشر من PROPOSED ولا إعادة اعتماد لمرفوض).

## Endpoints

### خرائط الربط (WHOICDMapping)

| Method | Endpoint | الوصف | الصلاحية |
|--------|----------|-------|----------|
| `GET` | `/api/v1/who/mappings/` | قائمة الاقتراحات (pagination) | `who_mappings:view` |
| `GET` | `/api/v1/who/mappings/{id}/` | تفاصيل اقتراح | `who_mappings:view` |
| `POST` | `/api/v1/who/mappings/` | إنشاء اقتراح (يُجبر على `PROPOSED`) | `who_mappings:add` |
| `PATCH` | `/api/v1/who/mappings/{id}/` | تعديل اقتراح غير محسوم | `who_mappings:edit` |
| `POST` | `/api/v1/who/mappings/propose/` | إثبات إنشاء اقتراح (نفس السلوك) | `who_mappings:add` |
| `POST` | `/api/v1/who/mappings/{id}/review/` | إرسال للمراجعة البشرية | `who_mappings:review` |
| `POST` | `/api/v1/who/mappings/{id}/approve/` | اعتماد نهائي + جعله الربط الحالي | `who_mappings:approve` |
| `POST` | `/api/v1/who/mappings/{id}/reject/` | رفض الاقتراح | `who_mappings:reject` |

### البحث في ICD-11 (قراءة فقط)

| Method | Endpoint | الوصف | الصلاحية |
|--------|----------|-------|----------|
| `GET` | `/api/v1/who/icd/search/?q=cholera` | بحث في تصنيف WHO ICD-11 | `who_mappings:search` |

البحث **لا يُنشئ اقتراحاً ولا يعدّل أي Mapping أو Disease**، ويستخدم تكامل WHO النشط
عبر بيانات اعتماده المشفرة (تُخزَّن مشفّرة داخل `WHOIntegration` ولا تُطبع في أي سجل).

### تصفية وفرز القائمة

- `search=` بحث نصي حر في `source_query/title_en/title_ar/icd_11_code`
- `?disease=`, `?who_release=`, `?mapping_status=`, `?match_type=`, `?is_current=`, `?icd_11_code=` تطابق تام
- `?ordering=-updated_at|created_at|confidence|who_release|icd_11_code`

## نموذج البيانات

| Field | Type | ملاحظات |
|-------|------|---------|
| `id` | UUID | للقراءة فقط |
| `disease` | UUID | **مطلوب** — لا يُغيَّر بعد الإنشاء |
| `disease_name_ar/En` | string | للقراءة فقط |
| `who_release` | string | إصدار WHO (مطلوب) |
| `foundation_uri` / `mms_uri` | string | روابط ICD-11 (اختيارية) |
| `icd_11_code` | string | كود ICD-11 (نص حر، اختياري) |
| `title_en` / `title_ar` | string | عناوين الكيان |
| `mapping_status` | enum | `PENDING/PROPOSED/REVIEW/APPROVED/REJECTED` — قراءة فقط |
| `confidence` | decimal(5,4) | 0.0 … 1.0 — خارج المدى يُرفض |
| `match_type` | enum | `EXACT/SEMANTIC/UNSPECIFIED/MANUAL/NO_MATCH` |
| `source_query` | string | استعلام المصدر الذي قاد للاقتراح |
| `is_current` | bool | قراءة فقط — الترابط الحالي للمرض/الإصدار |
| `reviewed_at` / `reviewed_by` | datetime / UUID | قراءة فقط، يُسجل عند الحسم |
| `notes` | text | ملاحظات المراجع |
| `created_at` / `updated_at` | datetime | تلقائية |

## القواعد

1. **لا تعديل لبيانات المرض**: لا تمس الواجهة ولا الخدمة حقول `Disease` (كود/أسماء/وصف/أهلية إبلاغ).
2. **لا موافقة تلقائية**: الإنشاء يجبر `mapping_status=PROPOSED` و`is_current=False`؛ حقل `is_current=True` لا يمكن إرساله من العميل.
3. **اقتراح واحد حالي لكل مرض وإصدار**: عند الاعتماد يُنزَّل الربط الحالي السابق داخل نفس المعاملة، ويبقى محفوظاً في التاريخ.
4. **الاعتماد/الرفض لا يكون إلا من حالة `REVIEW`**؛ الاقتراح المرفوض لا يُعاد اعتماده ولا يُعدَّل.
5. **حماية البيانات الحساسة**: لا تُرسل بيانات اعتماد WHO ولا `client_secret` في أي استجابة أو سجل؛ الأخطاء عامة.
6. **الأمان**: جميع النقاط تتطلب مصادقة JWT وصلاحية دقيقة (لا `AllowAny`). `review` ≠ `approve` — الفصل إجباري بالصلاحيات.

## رموز الأخطاء

| الحالة | المعنى |
|--------|--------|
| `400` | انتقال غير مسموح أو بيانات غير صالحة (ثقة خارج المدى، نوع تطابق خاطئ…) |
| `401/403` | غير مصادق أو صلاحية مفقودة |
| `502` | فشل الاتصال بخدمة ICD-11 أثناء البحث |

## الأدوار الافتراضية

- **WHO_INTEGRATION_OFFICER**: اقتراح وتعديل وبحث (`view/add/edit/export/search`) — ليس له اعتماد/رفض.
- **IHR_NFP**: مراجعة واعتماد/رفض (`view/review/approve/reject/export`) — لا يعدّل الإعدادات التقنية.
- **ADMIN/مدير عام**: وصول إداري (superuser) يمرّ دائماً.