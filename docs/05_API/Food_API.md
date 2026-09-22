
---

### 📄 9. Food_API.md (واجهات الحجر الغذائي)

```markdown
# واجهات بوابة الحجر الغذائي (Food Quarantine API)

## 1. نظرة عامة
تدير هذه الواجهات عمليات تسجيل الشحنات الغذائية، التفتيش، والعينات، وإصدار شهادات الإفراج.

## 2. المسارات (Endpoints)

### 2.1. تسجيل شحنة وارد (Register Shipment)
- **المسار**: `POST /api/v1/food/shipments`
- **الوصف**: تسجيل شحنة غذائية واردة إلى المنفذ.
- **الصلاحيات**: محمي (FOOD_INSPECTOR, CUSTOMS).
- **الطلب (Body)**:
```json
{
  "manifest_number": "SHIP-2024-100",
  "port_id": "uuid",
  "supplier_name": "Global Meat Co.",
  "origin_country": "البرازيل",
  "product_list": [
    { "name": "لحم بقري مجمد", "quantity": 1000, "unit": "كجم" }
  ],
  "arrival_date": "2024-07-23"
}
    الاستجابة (201):

json

{
  "status": "success",
  "data": { "shipment_id": "uuid", "status": "RECEIVED" }
}

2.2. بدء عملية التفتيش (Start Inspection)

    المسار: POST /api/v1/food/shipments/{shipment_id}/inspection

    الوصف: تسجيل نتائج التفتيش الظاهري.

    الصلاحيات: محمي (FOOD_INSPECTOR).

    الطلب (Body):

json

{
  "inspection_notes": "العبوات سليمة، درجة الحرارة مناسبة",
  "decision": "COMPLIANT" // أو NON_COMPLIANT
}

2.3. تسجيل عينة غذائية (Register Food Sample)

    المسار: POST /api/v1/food/shipments/{shipment_id}/samples

    الوصف: أخذ عينة من الشحنة وإرسالها للمختبر.

    الصلاحيات: محمي (FOOD_INSPECTOR).

2.4. إصدار شهادة الإفراج (Release Certificate)

    المسار: POST /api/v1/food/shipments/{shipment_id}/release

    الوصف: إصدار شهادة إفراج صحي بعد اكتمال جميع الفحوصات واعتماد النتائج.

    الصلاحيات: محمي (FOOD_INSPECTOR, ADMIN).

    الاستجابة (201):

json

{
  "status": "success",
  "data": {
    "certificate_number": "FQ-2024-001",
    "issued_at": "2024-07-23T14:00:00Z"
  }
}

    يتم إرسال الشهادة تلقائياً إلى نظام الجمارك عبر التكامل الخارجي.

## 3. المسارات المضافة (دورة الطلب التشغيلية — تم البناء)

### 3.1. تسجيل شحنة بأصناف (مع حساب تلقائي)
- **المسار**: `POST /api/v1/food/shipments/`
- **الوصف**: الكاتب يسجل الشحنة مع الأصناف (`items[]`) ونوع الرسالة؛ يُعيد النظام
  `total_weight_kg`, `samples_required`, و`fee_preview`.
- **الطلب (Body)**:
```json
{
  "manifest_number": "MAN-2024-0901",
  "port_id": "uuid",
  "supplier_name": "شركة الألبان الحديثة",
  "origin_country": "السودان",
  "shipment_type": "IMPORT",
  "message_type": "COMMERCIAL",
  "items": [
    { "product_name": "حليب مجفف", "weight_kg": 2000, "package_count": 40, "package_type": "جوال" },
    { "product_name": "زبادي", "weight_kg": 300, "package_count": 60, "package_type": "كوب" }
  ]
}
```
- **الاستجابة (201)**: بيانات `FoodShipmentSerializer` كاملة شاملة `items`, `samples_required`,
  `total_weight_kg`, `fee_preview`.

### 3.2. عرض تفاصيل الرسوم (Fee Preview)
- **المسار**: `GET /api/v1/food/shipments/{id}/fee-preview`
- **الاستجابة**:
```json
{ "status": "success", "data": { "exempt": false, "samples": 3, "total": "155000",
  "lines": [ { "name": "رسوم إدارية", "fee": "5000", "fee_type": "ADMIN" } ] } }
```

### 3.2أ. استمارة كشف الموارد الغذائية الصادرة (Export Inspection Form)
- **المسار**: `GET /api/v1/food/shipments/{id}/export-form`
- **الوصف**: يجمع سجلًا إلكترونيًا موحّدًا للطباعة لشحنات الصادر: بيانات الطلب والمصدّر والموارد
  الغذائية والكشف والعينات والقرار والشهادة في حزمة واحدة.
- **الاستجابة**:
```json
{ "status": "success", "data": {
  "shipment": { "manifest_number": "…", "port_name": "…", "exporter_name": "…", "total_weight_kg": "2300.00", "status": "RECEIVED", "…": "…" },
  "items": [ { "product_name": "…", "weight_kg": "…", "package_count": 40, "…": "…" } ],
  "inspection": null,
  "samples": [ ],
  "decision": null,
  "certificate": null
} }
```
- **المقاطع الفارغة** تعود `null`/`[]` بلا أخطاء؛ الاستمارة للقراءة فقط (الكتابة عبر
  `inspection`/`samples`/`decide`).

### 3.3. إرسال الطلب (Submit — الكاتب)
- **المسار**: `POST /api/v1/food/shipments/{id}/submit`
- **الوصف**: من `RECEIVED` إلى `FEES_DUE` وتثبيت `submitted_at` (يقبل `items[]` لإعادة الحساب).

### 3.4. مراجعة مدير القسم (Review)
- **المسار**: `POST /api/v1/food/shipments/{id}/review`
- **الطلب**: `{ "decision": "APPROVE" | "RETURN" }`
- **النتيجة**: `APPROVE` → `AWAITING_INSPECTION`، `RETURN` → `RECEIVED`.

### 3.5. الفاتورة والدفع (المحاسب)
- **المسار**: `POST /api/v1/food/shipments/{id}/invoice` — ينشئ الفاتورة (تلقائياً من تفاصيل الرسوم
  إن لم تُرسل `items`).
- **المسار**: `POST /api/v1/food/shipments/{id}/pay` — يسجل الدفع، يفعّل `fees_paid=true`، وينشئ
  إيصالاً `RCPT-…`.

### 3.6. التفتيش والعينات (المفتش)
- **المسار**: `POST /api/v1/food/shipments/{id}/inspection`
- **الطلب**: `{ "decision": "NEEDS_ANALYSIS" | "NON_COMPLIANT" | "COMPLIANT", "temperature": -18,
  "production_date": "…", "expiry_date": "…", "container_condition": "…" }`.
- **المسار**: `POST /api/v1/food/shipments/{id}/samples` — يسجل العينة مع `sampling_reason`
  (`ROUTINE`/`SUSPECTED`/`FIRST_ENTRY`).

### 3.7. القرار النهائي (مدير القسم)
- **المسار**: `POST /api/v1/food/shipments/{id}/to-decision` — إحالة إلى `AWAITING_DECISION`
  (يتطلب سداداً مسبقاً).
- **المسار**: `POST /api/v1/food/shipments/{id}/decide`
- **الطلب**: `{ "decision": "COMPLIANT|CONDITIONAL_RELEASE|PARTIAL_RELEASE|TEMPORARY_RELEASE|REJECTED|HOLD|RE_EXPORT|TRANSFER|DESTROY", "reason": "…" }`
- **القيود**: يتطلب `fees_paid=true`؛ يمنع إعادة القرار على شحنة مغلقة؛ ينشئ
  `FoodDecisionCertificate` برقم `FCER-…`.

### 3.8. تقرير المحاسبة والإنذار السياسات
- **المسار**: `GET /api/v1/food/shipments/accounting/?period=day|week|month`
- **الاستجابة**: `{ period, paid_count, pending_count, total_collected, receipts[], payments_by_date[], by_status }`.
- **المسار**: `GET/POST /api/v1/food/sampling-policies/` — إدارة `SamplingPolicy`.