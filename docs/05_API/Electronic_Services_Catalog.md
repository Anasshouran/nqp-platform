# Electronic Services Catalog - National Quarantine Portal

## Overview
This catalog documents all electronic services available in the National Quarantine Portal (NQP), organized by category and mapped to backend systems responsible for implementation.

### Catalog Structure
- **8 main categories** covering all portal functionalities
- **Service-to-system mapping** for ownership clarity
- **API status** referencing existing endpoints
- **Frontend readiness** referencing implemented pages

---

## 1. خدمات المسافرين (Traveler Services)
*System: Traveler Health System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| التسجيل الصحي للمسافر | `POST /api/v1/travelers/register` | ✅ مطوَّر |
| الإقرار الصحي | `POST /api/v1/travelers/register` (included) | ✅ مطوَّر |
| التحقق من التطعيمات | `GET /api/v1/airport/vaccinations/verify/{traveler_id}/` | ⚠️ جزئي (منفذ في airport) |
| تحميل QR الصحي | `GET /api/v1/travelers/{traveler_id}/qr-code` | ✅ مطوَّر |
| متابعة حالة التسجيل | `GET /api/v1/travelers/{traveler_id}/status` | ✅ مطوَّر |
| تحديث الملف الصحي | `PUT /api/v1/travelers/{traveler_id}/profile` | ✅ مطوَّر (غير موثّق في OpenAPI) |

*Frontend components: Registration form, QR code display, Status dashboard*

---

## 2. خدمات الاستيراد والتصدير (Import & Export Services)
*System: Food Safety System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| طلب استيراد غذاء | `POST /api/v1/food/shipments` | ✅ مطوَّر |
| طلب تصدير غذاء | `POST /api/v1/food/shipments` (with type) | ✅ مطوَّر |
| رفع مستندات الشحنة | `POST /api/v1/food/shipments/{id}/documents` | ❌ غير مطوَّر (endpoint غير موجود) |
| طلب شهادة المنشأ | `GET /api/v1/food/shipments/{id}/export-form` | ✅ مطوَّر |
| تتبع الشحنة | `GET /api/v1/food/shipments/{id}/` (detail serializer) | ⚠️ جزئي (لا يوجد status منفصل) |
| طلب الإفراج الصحي | `POST /api/v1/food/shipments/{id}/release` | ✅ مطوَّر |

*Frontend: Shipment tracking page, document upload, certificate viewer*

---

## 3. خدمات الشهادات (Certificate Services)
*System: Certificate Management System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| طلب شهادة صحية | `POST /api/v1/food/shipments/{id}/release` | ✅ مطوَّر |
| طلب شهادة الإفراج | `POST /api/v1/food/shipments/{id}/to-decision` | ✅ مطوَّر (غير موثّق في OpenAPI) |
| طلب شهادة صحة السفن | `لا يوجد` | ❌ غير مطوَّر |
| طلب شهادة التطعيم | `GET /api/v1/travelers/{id}/qr-code` (qr-data) | ✅ مطوَّر |
| إصدار الشهادات الإلكترونية | `POST /api/v1/food/shipments/{id}/decide` | ✅ مطوَّر (غير موثّق في OpenAPI) |
| التحقق من صحة الشهادة | `POST /api/v1/public/verify-certificate/` | ⚠️ جزئي (مسار مختلف عن المقترح) |

*Frontend: Certificate issuance workflow, verification page*

---

## 4. خدمات الاعتماد (Accreditation Services)
*System: Accreditation Management System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| طلب اعتماد | `لا يوجد - new endpoint needed` | ❌ غير مطوَّر |
| تجديد الاعتماد | `لا يوجد - new endpoint needed` | ❌ غير مطوَّر |
| تعديل بيانات الاعتماد | `لا يوجد - new endpoint needed` | ❌ غير مطوَّر |
| متابعة طلب الاعتماد | `لا يوجد - new endpoint needed` | ❌ غير مطوَّر |
| تنزيل شهادة الاعتماد | `لا يوجد - new endpoint needed` | ❌ غير مطوَّر |

*Note: This category requires new API development. Can be phased in later.*

---

## 5. خدمات التفتيش (Inspection Services)
*System: Health Inspection Management System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| طلب زيارة تفتيش | `POST /api/v1/food/shipments/{id}/inspection` | ⚠️ جزئي (مضمّن في food، لا يوجد /api/v1/inspections/) |
| حجز موعد التفتيش | `GET /api/v1/inspections/available-slots` | ❌ غير مطوَّر |
| متابعة حالة التفتيش | `GET /api/v1/food/inspections/{id}/` (detail) | ⚠️ جزئي (لا يوجد /status منفصل) |
| عرض نتائج التفتيش | `GET /api/v1/food/inspections/{id}/` (detail) | ⚠️ جزئي (لا يوجد /results منفصل) |
| رفع إجراءات التصحيح | `POST /api/v1/food-surveillance/corrective-actions/` | ⚠️ جزئي (مسار مختلف) |
| طلب إعادة التفتيش | `POST /api/v1/inspections/{id}/reinspection` | ❌ غير مطوَّر |

*Frontend: Inspection scheduling, results display, corrective action forms*

---

## 6. خدمات المختبر (Laboratory Services)
*System: Laboratory Information System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| تسجيل / تقديم عينة | `POST /api/v1/food/shipments/{shipment_id}/samples` | ✅ مطوَّر |
| متابعة حالة العينة | `PATCH /api/v1/laboratory/samples/{id}/status` | ⚠️ جزئي (لا يوجد GET /samples/{id}/status) |
| متابعة التحاليل | `GET /api/v1/food/sample-tests/{id}/` (detail) | ⚠️ جزئي (لا يوجد /tests route) |
| عرض نتائج التحليل | `POST /api/v1/food/sample-tests/{id}/enter-result` | ⚠️ جزئي (via food domain) |
| تنزيل تقرير المختبر | `POST /api/v1/food/samples/{id}/report/` | ⚠️ جزئي (POST لا GET، مستوى العينة) |
| طلب إعادة الفحص | `لا يوجد` | ❌ غير مطوَّر |

*Frontend: Sample submission, test tracking, report download*

---

## 7. خدمات الدفع (Payment Services)
*System: Finance & Revenue System*

| الخدمة | endpoint/api | الحالة |
|---|---|---|
| عرض الرسوم المستحقة | `GET /api/v1/food/shipments/{id}/fee-preview` | ✅ مطوَّر |
| إنشاء الفاتورة | `POST /api/v1/food/shipments/{id}/invoice` | ✅ مطوَّر |
| الدفع الإلكتروني | `POST /api/v1/food/shipments/{id}/pay` | ✅ مطوَّر |
| تحميل إيصال الدفع | داخل استجابة `pay`/`invoice` (receipt_number) | ⚠️ جزئي (لا يوجد endpoint تنزيل منفصل) |
| سجل المدفوعات | `GET /api/v1/food/shipments/accounting/?period=day|week|month` | ⚠️ جزئي (يستخدم accounting بدل finance) |

*Frontend: Fee calculator, invoice generator, payment receipt viewer*

---

## 8. خدمات المتابعة (Tracking Services)
*System: Unified Tracking (Portal-layer aggregation)*

| الخدمة | التنفيذ | الحالة |
|---|---|---|
| تتبع الطلبات | Aggregation from: Traveler + Food shipments | ✅ مطوَّر (واجهة) |
| تتبع الشحنات | Aggregation from: Food Safety system | ✅ مطوَّر (واجهة) |
| تتبع الشهادات | Aggregation from: Certificate Management | ⚠️ جزئي |
| تتبع المواعيد | Aggregation from: Inspection + Laboratory | ⚠️ جزئي |
| تتبع العينات | Aggregation from: Laboratory system | ✅ مطوَّر (واجهة) |
| تتبع الشكاوى | Aggregation from: All systems | ❌ غير مطوَّر |

*واجهةtracking service aggregation layer that queries multiple backend systems through the API Gateway and presents unified status to the user.*

---

## 📊 System Mapping Summary

| Category | System Owner | API Status | Frontend Status |
|--------|------------|------------|-----------------|
| 1. Traveler Services | Traveler Health System | 6/6 ✅ | 5/5 ✅ |
| 2. Import/Export Services | Food Safety System | 3/6 ✅ 1⚠️ 1❌ | 4/6 ⚠️ |
| 3. Certificate Services | Certificate Management | 4/6 ✅ 1⚠️ 1❌ | 3/6 ⚠️ |
| 4. Accreditation Services | Accreditation System | 0/5 ❌ | 0/5 ❌ |
| 5. Inspection Services | Health Inspection System | 0/6 ✅ 4⚠️ 2❌ | 2/6 ⚠️ |
| 6. Laboratory Services | Lab Information System | 1/6 ✅ 4⚠️ 1❌ | 1/6 ⚠️ |
| 7. Payment Services | Finance System | 3/5 ✅ 2⚠️ | 3/5 ⚠️ |
| 8. Tracking Services | Unified Portal Layer | 4/6 ✅ | 4/6 ✅ |

---

## 🔍 Validation Report (2026-08-20)

Cross-checked every catalog endpoint against `docs/05_API/` API files + backend code (`backend/apps/*/urls.py`, `views.py`).

### Summary
**16 fully-existing, 10 partial, 11 missing** across 37 endpoint references.

| Category | Catalog claim | Actual: EXISTS | PARTIAL | MISSING | Verdict |
|---|---|---|---|---|---|
| 1. Traveler Services | 5/5 ✅ | 5 | 0 | 0 | **Accurate** |
| 2. Import/Export | 6/6 ✅ | 3 | 1 | 1 | **Overstated** (documents missing, status partial; export-form understated) |
| 3. Certificate Services | 4/6 ✅ | 4 | 1 | 1 | Mostly accurate (verify understated — public verify exists) |
| 4. Accreditation | 0/5 ❌ | 0 | 0 | 5 | **Accurate** |
| 5. Inspection | 3/6 ✅ | 0 | 2 | 4 | **Overstated** (status & results marked ✅ but don't exist) |
| 6. Laboratory | 1/6 ✅ | 1 | 4 | 1 | **Accurate** (paths don't match real lab API) |
| 7. Payment | 4/5 ✅ | 3 | 2 | 0 | Mostly accurate (core exists, 2 partial) |

### Key Findings
1. ~~**OpenAPI.yaml is significantly out of date**~~ ✅ **FIXED (2026-08-20)** — Regenerated from backend via `drf_spectacular` (492 paths / 591 schemas). Now includes the full operational food workflow (fee-preview, export-form, invoice, pay, to-decision, decide, samples, accounting), `PUT /travelers/{id}/profile`, and `POST /public/verify-certificate/`. Old file preserved at `OpenAPI.yaml.stale-20260820`.
   - *Serializer fixes applied during regeneration:* `FoodDecisionCertificateSerializer` (duplicate at serializer.py:1078) declared `decision_label`/`certificate_type_display` without valid sources — corrected. Missing `FoodInvoiceSerializer` import in views.py — added (fixed a runtime NameError on `/invoice` and `/pay`). `FoodSample` approve now sets `LifecycleStatus.COMPLETED` (was APPROVED) matching the lifecycle spec.
   - **Schema errors eliminated:** 116 errors → **0**. Added `serializer_class` to 19 dashboard/tree/verification views across 9 apps (public, clinic, db_admin, food_surveillance, airport_health, port_health, carriers, masterdata, organization, food_quarantine). "No response body" dropped 154 → 125 (remaining are legitimate 204/empty responses). Only harmless enum-name warnings remain (223).
2. **No `inspection` module under `/api/v1/inspections`** — inspection functionality is embedded in food (`/food/inspections`, `/food/shipments/{id}/inspection`), airport (`/airport/inspections`), and surveillance (`/food-surveillance/corrective-actions`) domains.
3. **No `/api/v1/payments`, `/api/v1/finance`, or `/api/v1/samples` top-level namespaces** — payments/finance are modeled as food-shipment sub-resources and accounting reports.
4. **No accreditation module** and no `reanalysis`/`reinspection`/`available-slots` anywhere — genuinely missing, as the catalog states.
5. **Inspection status/results were overstated** in the original catalog (marked ✅ but no dedicated endpoints exist).

---

## 🔄 Unified Tracking Architecture

```text
                    User
                     │
                     ▼
          National Quarantine Portal
                     │
                 API Gateway
                     │
        ┌────────────┼────────────┼────────────┐
        ▼            ▼            ▼            ▼
   Traveler   Food Safety   Certificate   Inspection
        │            │            │            │
        └────────────┼────────────┼────────────┘
                     ▼
             Unified Tracking Service
                     │
                     ▼
                  User
```

**User view from single screen:**
> request → fees → inspection → sample → laboratory → decision → certificate → release

*Without needing to access each system individually.*

---

## 📌 Implementation Priority

### Phase 1 (Immediate - already done):
- ✅ Traveler Services (6/6 complete)
- ✅ Import/Export Services (core exists: shipments, export-form, release)

### Phase 2 (Short-term - close gaps):
- ⚠️ Import/Export: add `shipments/{id}/documents` + dedicated status endpoint
- ⚠️ Payment: add receipt download + payment history endpoint
- ⚠️ Laboratory: align paths with real API (`/food/samples`, `/food/sample-tests`), add report GET
- ⚠️ Inspection: add `/api/v1/inspections` top-level module with status/results endpoints
- ✅ OpenAPI.yaml regenerated (2026-08-20) — 492 paths / 591 schemas, 0 schema errors

### Phase 3 (Medium-term):
- ❌ Accreditation Services (new system required)
- ❌ Re-inspection / re-analysis endpoints
- ❌ Unified tracking aggregation layer

### Phase 4 (Long-term):
- 📦 Export vessel health certificates
- 📦 Advanced analytics dashboards
- 📦 Integration with external customs systems

---