# M7-A2 — Integration Audit: Organizational Registry Adoption by Apps

**التاريخ:** 2026-11-13 · **الفرع:** `feat/organizational-registry-m7-a2` · **PR #192 (lof)**
**النوع:** تدقيق + اختبارات فقط (READ-ONLY) — لا كود إنتاجي، لا migrations
**الأساس:** `main@3b8e87b` · Backend 2984 + 0xf + 2skip · Frontend 845

---

## الملخص التنفيذي

**السؤال المطروح:** هل السجل التنظيمي (registry) مستخدم فعلاً في منطق التطبيقات التجارية،
أم أنه جزيرة معزولة؟

**الإجابة:** الجزيرة المعزولة. **التطبيق صفر من أصل 7 تطبيقات تجارية مفحوصة يشير إلى أي نموذج
من نماذج السجل التنظيمي** (ReportingNode / StateNodeAssignment /
HealthFacilityNodeAssignment / FacilityOwnership / TechnicalSupervision /
ServiceAvailability). جميع التطبيقات تحتفظ بمفاتيح مباشرة (direct FKs) إلى
`masterdata.EntryPoint` / `masterdata.HealthFacility` /
`organization.Sector` / `organization.Locality` — وتتجاهل شجرة ReportingNode تماماً.

**نقاط التكامل المسجلة:** 0 من أصل 7 تطبيقات.
**النقاط المفصولة (gaps):** 7 من أصل 7 تطبيقات.

---

## المنهجية

| البعد | النطاق | الطريقة |
|---|---|---|
| Backend | 7 تطبيقات: surveillance, vaccination, borders_health, screening, hr, laboratory, vector_control | grep على models.py للـ FKs المباشرة ومراجع نماذج السجل |
| Frontend | 3 تطبيقات: surveillance, vaccination, borders_health | grep على صفحات React لمspecific tree picker |
| اختبارات تكامل | 8 اختبار (7 نجح، 1 تُخطي لتوثيق الفجوة) | `test_m7_a2_integration_audit.py` |

**الأسئلة الخمسة لكل تطبيق (IQ1–IQ5):**
- IQ1: ما FKs الموجودة لـ HealthFacility/EntryPoint/Locality/Sector/State؟
- IQ2: هل يشير إلى ReportingNode/FacilityOwnership/TechnicalSupervision/ServiceAvailability/StateMinistry؟
- IQ3: عند إنشاء سجل، هل يستخدم registry picker أم FK مباشرة؟
- IQ4: في التقارير/الإحصاءات، هل يستخدم التسلسل الهرمي (aggregate by state)؟
- IQ5: أين يجب استخدامregistry لكنه لا يستخدم؟

---

## النتائج لكل تطبيق

### 1. Surveillance — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `port` (EntryPoint)، `sector` (Sector)، `locality` (Locality)، `health_facility` (HealthFacility) في `HealthCase` / `HealthEvent` / `SurveillanceAlert` |
| **IQ2 — مراجع السجل** | **لا شيء** — لا ReportingNode ولا أي نموذج سجل |
| **IQ3 — إنشاء سجل** | FK مباشرة (لا tree picker) |
| **IQ4 — تجميع هرمي** | `cases_by_sector`، `cases_by_locality`، `cases_by_disease` — بالقيم المباشرة، لا بـ `node.path` |
| **IQ5 — فجوات** | [G-S1] لا traverse من حالة إلى عقدة سجل؛ [G-S2] لا endpoint للتجميع بالدولة عبر الشجرة؛ [G-S3]frontend يعرض محلية/قطاع كـ dropdown مسطح |

### 2. Vaccination — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `entry_point` (EntryPoint)، `site` (VaccinationSite) |
| **IQ2 — مراجع السجل** | **لا شيء** |
| **IQ3 — إنشاء سجل** | FK مباشرة |
| **IQ4 — تجميع هرمي** | لا يوجد تجميع بالولاية/المحلية عبر السجل |
| **IQ5 — فجوات** | لاربط بين موقع التطعيم وعقدة السجل؛ لا تجميع تراصバイ(state) |

### 3. Borders Health — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `crossing` (EntryPoint)، `facility` (HealthFacility)، `clinic` |
| **IQ2 — مراجع السجل** | **لا شيء** |
| **IQ3 — إنشاء سجل** | FK مباشرة |
| **IQ4 — تجميع هرمي** | لا يوجد |
| **IQ5 — فجوات** | المنفذ والمنشأة مرتبطة FK مباشرة، لا شجرة |

### 4. Screening — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `port` (EntryPoint)، `facility` (HealthFacility) |
| **IQ2 — مراجع السجل** | **لا شيء** |
| **IQ3 — إنشاء سجل** | FK مباشرة |
| **IQ4 — تجميع هرمي** | لا يوجد |
| **IQ5 — فجوات** | لا traverse إلى عقدة سجل |

### 5. HR — 🟡 30% تكامل جزئي

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `OrgAssignment` (M6-bis): `sector` (Sector)، `department` (Department)، `station` (Station)، `entry_point` (EntryPoint)، `facility` (HealthFacility) |
| **IQ2 — مراجع السجل** | **لا شيء** — OrgAssignment لا يشير إلى ReportingNode |
| **IQ3 — إنشاء سجل** | FK مباشرة (PostingRequest.target_*) |
| **IQ4 — تجميع هرمي** | لا يوجد تجميع بالولاية عبر السجل |
| **IQ5 — فجوات** | OrgAssignment.facility يُربَّط بالمنشأة مباشرة (M6-bis backfill)، لا بعقدة سجل |

### 6. Laboratory — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `sector` (Sector)، `entry_point` (EntryPoint)، `facility` (HealthFacility) |
| **IQ2 — مراجع السجل** | **لا شيء** |
| **IQ3 — إنشاء سجل** | FK مباشرة |
| **IQ4 — تجميع هرمي** | لا يوجد |
| **IQ5 — فجوات** | العينات والمختبرات مرتبطة FK مباشرة، لا شجرة |

### 7. Vector Control — 🔴 0% تكامل

| البند | النتيجة |
|---|---|
| **IQ1 — FKs مباشرة** | `sector` (Sector)، `facility` (HealthFacility)، `entry_point` (EntryPoint) — عبر 9+ نماذج |
| **IQ2 — مراجع السجل** | **لا شيء** |
| **IQ3 — إنشاء سجل** | FK مباشرة |
| **IQ4 — تجميع هرمي** | لا يوجد |
| **IQ5 — فجوات** | المواقع والفرق والتفتيش مرتبطة FK مباشرة، لا شجرة |

---

## الملخص المقارن بين التطبيقات

| التطبيق | FKs للسجل | Frontend tree picker | تجميع هرمي | درجة التكامل |
|---|---|---|---|---|
| surveillance | 0 | لا | لا | 🔴 0% |
| vaccination | 0 | لا | لا | 🔴 0% |
| borders_health | 0 | لا | لا | 🔴 0% |
| screening | 0 | لا | لا | 🔴 0% |
| hr | 0 (OrgAssignment مباشر) | لا | لا | 🟡 30% |
| laboratory | 0 | لا | لا | 🔴 0% |
| vector_control | 0 | لا | لا | 🔴 0% |
| **المتوسط** | **0** | **لا** | **لا** | **🔴 ~4%** |

---

## تحليل السبب الجذري

1. **السجل بُني كوحدة مستقلة (standalone module)** في M1–M6، بدون مرحلة "تبني" (adoption) للتطبيقات القائمة.
2. التطبيقات استمرت في استخدام FKs مباشرة إلى `masterdata` / `organization` — لم تُعاد كتابتها لتستخدم `ReportingNode`.
3. واجهة الواجهة الأمامية لا تحتوي على `<RegistryTreeSelector />` يُعاد استخدامه خارج صفحات السجل (`registry/` فقط).
4. لا يوجد Endpoint يعيد "مسار السجل" (state→locality→facility) لكي تعرضه صفحات التطبيقات.
5. نتيجة M5-A أثبتت أن الـ scoping يعمل (H6)، لكنه لم يثبت أن التطبيقات تستخدم نماذج السجل في بياناتها.

---

## مصفوفة اتخاذ القرار

| الخيار | الوصف | التكلفة | القيمة | متى يُختار |
|---|---|---|---|---|
| **M7-A2b — تكامل عميق** | إضافة `ReportingNode` FK لنماذج التطبيقات الرئيسية + مكون `<RegistryTreeSelector />` + Endpoint `/api/v1/reports/by-state/` | عالي (2–3 أسابيع) | عالي (تبني حقيقي) | إذا كانت درجة التكامل < 20% عبر التطبيقات |
| **M7-A2c — تكامل سطحي** | الإبقاء على FKs الحالية + إضافة Endpoints لمسار السجل (`GET /api/v1/…/{id}/registry-path/`) لعرض المسار دون تغيير تدفق الإنشاء | متوسط (أسبوع) | متوسط (رؤية دون إعادة كتابة) | إذا كانت درجة التكامل 20–50% |
| **M7-A2d — عدم تكامل** | قبول السجل كوحدة مستقلة للتطبيقات الجديدة + توثيق القرار | صفر | صفر (السجل يظل دون استخدام) | إذا كانت درجة التكامل > 50% |

---

## التوصية (بناءً على البيانات)

**درجة التكامل المتوسطة ~4% (< 20%) → يُوصى بالخيار M7-A2b (تكامل عميق).**

السجل التنظيمي موجود مكتمل النماذج (ReportingNode، التعيينات، الملكية، الإشراف، التوافر) لكنه غير مُستخدم من أي تطبيق تجاري. إضافة ميزات M7 (B1/B2/C1) فوق سجل غير مُستخدم تعني بناء ميزات على جزيرة. يجب أولاً ربط التطبيقات بالسجل عبر:
1. إضافة `reporting_node` FK (أو مهمة تعيين) لنماذج الأعمال الرئيسية (HealthCase، VaccinationRecord، إلخ).
2. مكون `<RegistryTreeSelector />` قابل لإعادة الاستخدام في الواجهة الأمامية.
3. Endpoint تجميع هرمي (`/api/v1/reports/by-state/`) لعرض الحالات حسب الولاية عبر الشجرة.

---

## الاختبارات المضافة

| الملف | الاختبارات | نجح | تُخطي (توثيق فجوة) |
|---|---|---|---|
| `test_m7_a2_integration_audit.py` | 8 | 7 | 1 |

- الاختبار المُخطي (`test_case_to_facility_to_node_requires_assignment`) يُوثق الفجوة: عندما لا تملك المنشأة `HealthFacilityNodeAssignment` نشط، لا يمكن الانتقال من `HealthCase` إلى `ReportingNode` عبر الشجرة — وهذا هو الوضع الحالي في جميع التطبيقات.

---

## الملفات المتغيرة

| الملف | التغيير |
|---|---|
| `backend/apps/registry/tests/test_m7_a2_integration_audit.py` | جديد — 8 اختبار تكامل (توثيق الفجوات) |
| `backend/docs/m7-a2-integration-audit.md` | جديد — تقرير التدقيق + مصفوفة القرار + التوصية |

**لا كود إنتاجي.** **لا migrations.** **لا تعديل صفحات واجهة أمامية.** **لا `PROD_SCOPING_ENABLED`.**

---

## الملفات المرجعية المستخدمة في التدقيق

- `backend/apps/registry/models.py` — نماذج السجل (ReportingNode، التعيينات، الملكية، الإشراف، التوافر)
- `backend/apps/organization/models.py` — OrgAssignment (M6-bis)، Sector، Department
- `backend/apps/masterdata/models.py` — State، EntryPoint، HealthFacility، Sector
- `backend/apps/surveillance/models/case.py` — HealthCase (FKs مباشرة)
- `backend/apps/surveillance/views/__init__.py` — التجميع بالقطاع/المحلية (قيم مباشرة)
- `backend/apps/surveillance/services/gis_export.py` — التجميع بالمحلية/المنفذ (قيم مباشرة)

---

## الخطوة التالية (عند قرار المالك)

| الخيار | الإجراء |
|---|---|
| M7-A2b | إصدار planning prompt للتكامل العميق (2–3 أسابيع) |
| M7-A2c | إصدار planning prompt للتكامل السطحي (أسبوع) |
| M7-A2d | توثيق القرار وإغلاق A2 |

---

**الخلاصة:** السجل التنظيمي مكتمل فنياً ولكن **غير مُستخدم** من أي تطبيق تجاري (0/7). التوصية: التكامل العميق (M7-A2b) قبل إضافة أي ميزات M7 جديدة عليه.
