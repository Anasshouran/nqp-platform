# M5-C Known Debt — دفتر ديون M5-C

> يُحدَّث مع كل sub-phase. كل بند هنا **موثَّق ومقصود** (fail-closed أو قرار
> سياسة)، وليس خطأً مفتوحاً. M5-C = STATE (C-0) + LOCALITY (C-L) + FACILITY (C-F).

**القاعدة الحاكمة:** كل بند يبقى **deny-all** حتى يُحسم في M6 أو بقرار مالك.
لا بند هنا يفتح بيانات بالخطأ؛ الاتجاه الوحيد المسموح هو الحجب.

---

## D-M5-C-F-4: port_health / shipping — FACILITY مُتجاهَل للمستخدم الهجين

**الحالة:** 🟡 **DEFERRED إلى M7+** — متطلبات مسبقة صريحة (2026-11-13)

**الوضع الحالي:**
- `asserts_geographic_scope` لا يحتوي `FACILITY` — قرار **Q8** (فصل النطاقات).
- مستخدم `FACILITY + COMPANY` على `port_health`/`shipping` → يرى **COMPANY فقط**،
  و FACILITY مُتجاهَل.
- `PROD_SCOPING_ENABLED=False` ⇒ FACILITY deny-all في الإنتاج ⇒ **غير مرئي اليوم**.
- M6-bis (2026-11-13) لم يمسّ `port_health`/`shipping`: أضاف `facility` FK على 4
  نماذج (HR/Screening/Lab/Vector) فقط، وأبقى `asserts_geographic_scope` FACILITY-free.

**النطاقات التي يقرأها `asserts_geographic_scope` فعليًا**
(`core/utils/scoping.py`، الدالة عند السطر 464):

| المصدر | النطاقات |
|---|---|
| `SECTOR_LIKE_SCOPES` (سطر 297) | `SECTOR` · `REGION` |
| `ENTRY_POINT_SCOPES` (سطر 300) | `POINT` · `PORT` |
| صريحة في الشرط (سطر 477) | `DEPARTMENT` · `STATION` · `STATE` · `LOCALITY` |
| `_has_entry_point_assignment(user)` | تعيين مباشر على نقطة دخول |
| **FACILITY** | ❌ **غائب عمدًا** — قرار **Q8** |

**التقييم:** سلوك صحيح (fail-safe):

| الجانب | التقييم |
|---|---|
| الأمان | ✅ لا widening — FACILITY لا يفتح ports |
| المنطق | ✅ domain الموانئ = ports/companies، لا facilities |
| الاتساق | ✅ مطابق لـ D-F-3 |
| الشفافية | ⚠️ المستخدم يرى COMPANY فقط — UX note |

**القرار:** لا يُنفَّذ الآن. توسيع `asserts_geographic_scope` لـ FACILITY يعيد فتح
**Q8**، ويحتاج مبررًا **منتجيًا** لا تقنيًا. **التصنيف:** دَين UX — **ليس** دَين أمان.

### المتطلبات المسبقة (كلها إلزامية قبل B)

1. **Q7** — backfill counts على staging/prod (D-M5-C-ACT-1).
   **حاليًا محجوب:** لا وصول شبكي إلى الـ VPS من بيئة التطوير (SSH ⇒ `No route to host`).
2. **طلب منتج صريح** — «نحتاج مستخدم FACILITY يرى port_health»، لا «لأننا نستطيع».
3. **مراجعة Q8** — قرار بنيوي (port ≠ facility) يجب نقضه صراحةً ومكتوبًا.
4. **fixtures جديدة في dev** — `HealthFacility` مع `entry_point`
   (**0/12 اليوم**، متحقَّق 2026-11-13) ⇒ بدونه اختبارات B سطحية.

### سيناريو B عند التنفيذ (للمرجع فقط)

- `asserts_geographic_scope` += `'FACILITY'` (إضافة `'FACILITY'` إلى شرط
  `scope_type__in`، سطر 476–478).
- helper مقترح `_facility_port_ids(facility_ids)` عبر `HealthFacility.entry_point`.
- `CompanyPortScopedMixin.get_queryset` (سطر 569) += `Q(entry_point_id__in=...)`.
- 6–8 اختبارات: 4 scopes × 2 حراس widening.
- **اختبار widening حرج:** «منشأة قرب ميناء لا ترى سفن الميناء» يجب أن ينجح.
- التقدير: 3–4 ساعات + CI ~20 دقيقة.

**المخاطر في B:**

- **Widening** — منشأة لها `entry_point` (عيادة قرب معبر) → ترى سفن الميناء.
- **فجوة بيانات dev** — 0/12 facilities مع `entry_point` ⇒ الاختبارات لا تُثبت
  الاشتقاق فعليًا.
- **عكس Q8** يحتاج تبريرًا مكتوبًا، وإلا يصبح سابقة لتوسيع النطاقات بلا ضابط.

**البديل الآمن اليوم:**

- مستخدم FACILITY يرى `registry` (tree + facility detail) — **يعمل**.
- `port_health`/`shipping` تبقى COMPANY/SECTOR/POINT/PORT — **صحيح**.
- الهجين → COMPANY يعمل — **مقبول**.

**التوثيق المرافق:** `m5-a-audit.md §9` · `m5-c-f.md §2.1` · `m5-c-l-closure.md`.
**مرجع الكود:** `core/utils/scoping.py:297/300/464/476-478/569` ·
`apps/port_health/views.py:308/326` · `apps/shipping/views.py:337/472`.

---

## D-M5-C-F-1: HR / FACILITY — deny-all (→ M6-bis ✅ CLOSED)

**الوضع السابق:** `OrgAssignment` لا يملك FK إلى منشأة، لذا لا يوجد جسر
FACILITY → موظفين. `SCOPE_LOOKUPS` بلا مفتاح FACILITY ⇒ HR deny-all لمستخدم
FACILITY مهما كان دوره.

**الخطر السابق:** حجب كامل (لا تسريب). المستخدم يرى 0 موظفين.

**✅ CLOSED in M6-bis (PR #182, commit `1d07b86`)**
- Migration: `organization/0010_orgassignment_facility` — `facility` FK
  (`null=True, blank=True, on_delete=SET_NULL`, `related_name='org_assignments'`).
- Backfill: `backfill_org_assignment_facility` (`--dry-run`/`--limit`;
  الحالات غير الحصرية تبقى NULL وتُحتسب `ambiguous`).
- Scoping: `SCOPE_LOOKUPS['FACILITY'] = ('facility_id',)` +
  `resolve_own_org_scope_keys` + بوابة `PROD_SCOPING_ENABLED`.
- `PROD_SCOPING_ENABLED=False` → backfill في prod ثم التفعيل بعد Q7.

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_hr_unlinked_assignment_stays_invisible`
(السجلات بلا `facility` تبقى محجوبة) + `hr/tests/test_facility_scope.py`.

---

## D-M5-C-F-2: screening / FACILITY — deny-all (→ M6-bis ✅ CLOSED)

**الوضع السابق:** `_entry_point_ids_for` تفرّع على STATE/LOCALITY فقط. دلالة
الفحص مرتبطة بالمنفذ (port) وليس بالمنشأة، لذا لا يوجد تحويل مشروع
FACILITY → فحوصات.

**الخطر السابق:** حجب كامل. الفحوصات المنفَّذة في منفذ المنشأة غير مرئية لمستخدم FACILITY.

**✅ CLOSED in M6-bis (PR #182, commit `1d07b86`)**
- Migration: `screening/0003_healthscreening_facility` — `facility` FK
  (`null=True, blank=True, on_delete=SET_NULL`, `related_name='screenings'`).
- Backfill: `backfill_healthscreening_facility` (`--dry-run`/`--limit`;
  ambiguous → NULL).
- Scoping: اتحاد قناتين — منفذ المنشأة عبر `HealthFacility.entry_point`
  + `HealthScreening.facility` مباشرةً (`Q(port_id__in=…) | Q(facility_id__in=…)`)،
  خلف بوابة `PROD_SCOPING_ENABLED`. منشأة بلا منفذ تعمل عبر القناة المباشرة.
- `PROD_SCOPING_ENABLED=False` → backfill في prod ثم التفعيل بعد Q7.

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_screening_facility_resolves_via_entry_point`
+ `screening/tests/test_facility_scope.py`.

---

## D-M5-C-F-3: laboratory + vector_control / FACILITY — deny-all (→ M6-bis ✅ CLOSED)

**الوضع السابق:** النماذج لا تحمل حقل منشأة، و`SectorFieldScopedMixin` لا يملك
`facility_path` (قرار المرحلة: لا حقل جديد بلا viewset يستهلكه). `VectorUnit`
sector-only (D-M5-B-1 قائم).

**الخطر السابق:** حجب كامل. عينات المختبر في منفذ المنشأة غير مرئية لمستخدم FACILITY.

**✅ CLOSED in M6-bis (PR #182, commit `1d07b86`)**
- Migrations:
  - `laboratory/0006_labsample_facility` — `LabSample.facility` (SET_NULL).
  - `vector_control/0002_vectorunit_facility` — `VectorUnit.facility` (SET_NULL).
- Backfill: `backfill_labsample_facility` (entry_point→facility) و
  `backfill_vectorunit_facility` (sector→facility) — كلاهما `--dry-run`/`--limit`،
  ambiguous → NULL.
- Scoping: `SectorFieldScopedMixin.facility_path = 'facility_id'` على
  `LabSampleViewSet` و`VectorUnitViewSet` (اتحاد مع sector/state/locality).
- `PROD_SCOPING_ENABLED=False` → backfill في prod ثم التفعيل بعد Q7.

**الاختبار الموثِّق:** `test_facility_deny_all.py::test_laboratory_unlinked_sample_stays_invisible`
+ `laboratory/tests/test_facility_scope.py` + `vector_control/tests/test_facility_scope.py`.

---

## D-M5-C-ACT-1: تفعيل الإنتاج معلَّق على COUNT

**الوضع:** `PROD_SCOPING_ENABLED=False` افتراضياً. LOCALITY وFACILITY
**fail-closed** في الإنتاج حتى التفعيل.

**الشرط المطلوب قبل التفعيل:**

| المؤشر | الحد الأدنى | الحالة في dev |
|---|---|---|
| `EntryPoint.locality` coverage | ≥ 80% | — (يُقاس على staging/prod) |
| `HealthFacility.entry_point` coverage | يُحدَّد بقرار مالك | **0/12** |

**الأثر:** لا تسريب إنتاجي؛ لكن مستخدمي LOCALITY/FACILITY لن يروا شيئاً قبل
التفعيل — وهو سلوك آمن مقصود.

**القرار:** بيد المالك بعد أرقام staging/prod.

---

## D-M5-C-L-FE-1: واجهة المحليات الأساسية فقط (اختياري)

**الوضع:** M5-C-L أضاف منتقي محلية في `RoleAssignmentFormDialog`؛ لا فلاتر
أو شجرة اختيار متقدمة.

**الخطر:** لا شيء أمنياً — UX فقط.

**الحل:** `M5-C-L-frontend` إن طلبه المنتج.

---

## D-M5-C-ACT-2: تصادم `Country.code` في اختبارات M5-A (عوم اختبار — مُغلق)

**الوضع السابق:** مولّدات `_screening()` في `apps/registry/tests/test_m5_integration/`
كانت تنشئ الدولة بكود `f'S{uid[:2]}'[:3]` = `S` + حرفان hex ⇒ **256 قيمة ممكنة**
فقط، بينما `Country.code` هو `unique=True, max_length=3`.

**الأثر:** كل اختبار ينشئ **دولتين** في نفس المعاملة (world A + world B) كان
يتصادم باحتمال **1/256 ≈ 0.39%**. المعدل الكلي ≈ **1.95% لكل تشغيل Backend**
(4 أزواج في `test_h3_deltas` + زوج في `test_h3_no_widening`).

**الدليل:** فشل CI #183 (docs-only) في
`test_h3_no_widening.py::TestH3NoWidening::test_state_plus_sector_union`
بـ `UniqueViolation: Key (code)=(S2d) already exists` — بينما نجح نفس الاختبار
في CI #182 ومحليًا 3/3. الكود المُدان من `f31d605` (2026-11-10، M5-C-L).

**الحل (fix/flaky-country-code):**
`Country.objects.get_or_create(code='TST', defaults={...})` في **6 ملفات**
(`test_h3_no_widening` · `test_screening_h3` · `test_h3_deltas` ·
`test_h1prime_consistency` · `test_locality_consistency` · `test_facility_deny_all`).
لا اختبار يعتمد على اختلاف الجنسية بين world A و world B — التحقق: كل إشارات
`country` هي `nationality=country` فقط، و`_build_world` لا ينشئ `Country`.

**التحقق:** 10 تشغيلات متتالية لـ `test_h3_no_widening` + `test_h3_deltas`
⇒ **10× `8 passed`** (0 تصادم)؛ والحزمة الكاملة للمجلد ⇒ **107 passed**.

---

## D-M5-C-ACT-3: `.env` المحلي يوجّه Celery إلى `127.0.0.1` (توثيق — مُغلق)

**الوضع السابق:** `backend/.env` المحلي (غير متتبَّع) يثبّت
`REDIS_HOST=127.0.0.1` و`CELERY_BROKER_URL=redis://127.0.0.1:6379/0`، بينما خدمة
Redis في `deploy/docker-compose.yml` اسمها **`redis`** (وتعمل بـ `--requirepass`).
النتيجة: `pytest apps/` داخل حاوية التطوير يفشل في كل اختبار يلمس Celery
(8 failed + 12 errors في تشغيل M6-bis المحلي)، بينما CI يمر لأن الـ runner
يستخدم اسم الخدمة `redis`.

**الإصلاح (chore 2أ، PR #185):**
- `backend/.env.example`: `REDIS_HOST=redis` (اسم خدمة Compose) + تعليق صريح
  بأن التشغيل على المضيف يستخدم `REDIS_HOST=127.0.0.1`، وأن
  `CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` يُشتقّان من `REDIS_*`، وأن
  **DB 1 هو كاش الـ throttle المشترك** — لا يُستخدم كنتيجة Celery.
- `README.md`: قسم «Redis / Celery (local)» بسطرين.
- `backend/.env` المحلي **لم يُمسّ**، و`.env` مُستثنى في `.gitignore` (تحقق).

**ملاحظة دائمة:** التوثيق يذكر أن `REDIS_PASSWORD` يجب أن يطابق قيمة
`deploy/.env` لأن Compose يشغّل redis بـ `--requirepass`.

---

## ملخّص التصنيف

| البند | النوع | الحالة |
|---|---|---|
| `D-M5-C-F-4` | port_health hybrid | 🟡 **DEFERRED M7+** — prerequisites موثَّقة |
| `D-M5-C-F-1` | حجب كامل (HR) | ✅ **مغلق — M6-bis (\#182, `1d07b86`)** |
| `D-M5-C-F-2` | حجب كامل (screening) | ✅ **مغلق — M6-bis (\#182, `1d07b86`)** |
| `D-M5-C-F-3` | حجب كامل (lab/vector) | ✅ **مغلق — M6-bis (\#182, `1d07b86`)** |
| `D-M5-C-ACT-1` | تفعيل إنتاج | بانتظار COUNT (Q7) |
| `D-M5-C-ACT-2` | عوم اختبار (`Country.code`) | ✅ **مغلق — `fix/flaky-country-code` (`#184`)** |
| `D-M5-C-ACT-3` | `.env`/Celery توثيق | ✅ **مغلق — chore 2أ (`#185`)** |
| `D-M5-C-L-FE-1` | UX اختياري | عند الطلب |
| `D-M5-B-1` | حجب كامل (VectorUnit) | ✅ مغلق — M6 |

**لا دَين أمني مفتوح في M5-C.** كل البنود إما حجب مقصود أو توثيق.
