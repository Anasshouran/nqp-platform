# M5-C Discovery Report — LOCALITY + FACILITY Scopes

**الفرع:** `feat/organizational-registry-m5` · **التاريخ:** 2026-11-11
**الحالة:** Discovery فقط — لا كود، لا migrations، لا scope types جديدة.
**المرجع التشغيلي:** `m5-a-audit.md` (H1′) · `m5-b-known-debt.md` · `m5-b-closure.md`
**Baseline معاد التحقق منه:** 443 passed + 1 xfailed (D-M5-B-1) + 0 xpassed (`pytest apps/registry/ apps/organization/`)

## Executive Summary

- **LOCALITY ترجمة ممكنة** عبر `EntryPoint.locality` (FK موجود) بنفس نمط STATE
  (`_state_entry_point_ids` → `locality_id__in=...`). لا حاجة لأي schema جديد.
- **FACILITY ترجمة ممكنة لكن مقيدة:** `HealthFacility.entry_point` موجود، لكن
  في **بيئة dev الحالية كل الـ 12 منشأ صحي بلا entry_point (0/12)** — الترجمة تُعيد
  `[]` دائماً في dev. قرار البيانات مطلوب قبل التنفيذ (staging/prod COUNT).
- **7 تطبيقات H6 ترث تلقائياً** إن أُضيفت LOCALITY/FACILITY إلى
  `resolve_authorized_entry_points` (نفس قناتي `_state_entry_point_ids`).
- **5 تطبيقات تحتاج branches:** screening · laboratory · vector_control · hr
  · registry · (port_health + shipping عبر `asserts_geographic_scope` والـ
  notification tuples). تحديد: جدول الأثر أدناه.
- **فجوة قائمة وجدها الـ Discovery (ليست من M5-C، مرتبطة):**
  `_validate_scope_id` في `accounts/serializers.py` لا يعرف `STATE` أصلاً →
  أي RoleAssignment(scope_type=STATE) عبر الـ API تُرفض بـ «نوع النطاق STATE
  غير معروف». الـ frontend (`RoleAssignmentFormDialog.tsx`) يُرسل STATE →
  المستخدم يرى 400 اليوم. M5-C يجب أن يصلح STATE أيضاً أو يتركها بقرار مالك.
- **الخلاصة:** المسار آمن للانطلاق بعد قرارات المالك (أسئلة حرجة أدناه).
  التقدير: **~2–3 أسابيع** (واقعياً 3).

---

## Q1 — كيف تُترجم LOCALITY؟

**الحالة الحالية (`_state_entry_point_ids`, `scoping.py:171`):**
```python
EntryPoint.objects.filter(state_id__in=state_ids, is_active=True)
```
**المقترح — نفس النمط تماماً:**
```python
# in resolve_authorized_entry_points():
locality_ids = {a.scope_id for a in _active_assignments(user)
                if a.scope_type == 'LOCALITY' and a.scope_id}
entry_point_ids.update(
    EntryPoint.objects.filter(locality_id__in=locality_ids,
                              is_active=True)
    .values_list('id', flat=True))
```
مع مساعدَي نمط `has_state_scope()` / `get_user_state_ids()`:
`has_locality_scope()` و `get_user_locality_ids()` (Union للاتحاد مع بقية القنوات).

**البنية المتوفرة:** `masterdata.EntryPoint.locality` = FK(`organization.Locality`,
SET_NULL, nullable, related_name='entry_points') — موجود منذ M1.
لا حاجة لأي migration لـ LOCALITY نفسها.

**فحص البيانات (dev، 2026-11-11):**
```
EntryPoint total=0  locality_null=0  (لا توجد منافذ في dev أصلاً!)
Locality total=6    (كلها TEST fixtures)
```
**التحفظ:** dev لا يمكن أن تُثبت اكتمال `EntryPoint.locality` — لا توجد EntryPoints.
قرار: إما seed staging fixture يشمل EntryPoints بمحلية، أو تشغيل:
```sql
SELECT count(*) FILTER (WHERE locality_id IS NULL) AS no_loc, count(*) FROM masterdata_entrypoint;
```
على staging/production **قبل** M5-C-2.

**Confidence:** MEDIUM — الآلية مُثبتة (نفس STATE)، اكتمال البيانات غير مُثبَت في dev.

---

## Q2 — كيف تُترجم FACILITY؟

**البنية المتوفرة:**
- `masterdata.HealthFacility.entry_point` = FK(`EntryPoint`, SET_NULL, nullable,
  related_name='health_facilities') — الموجود.
- `masterdata.HealthFacility.locality` = FK(`organization.Locality`, CASCADE, nullable) — موجود.
- `EntryPoint` **لا** يحمل FK مباشر للمنشأة (الرابط من جهة HealthFacility فقط).

**المقترح:**
```python
facility_ids = {a.scope_id for a in _active_assignments(user)
                if a.scope_type == 'FACILITY' and a.scope_id}
entry_point_ids.update(
    EntryPoint.objects.filter(health_facilities__in=facility_ids,
                              is_active=True)
    .values_list('id', flat=True))
```
(أو عبر `HealthFacility.objects.filter(id__in=facility_ids).values_list('entry_point_id', …)`
مباشرة — استعلام واحد، لا join، أنظف.)

**FACILITY scope لا يتوسع للمحلية** — least privilege: المنشأة فقط (لا "كل منافذ
المحلية"). FACILITY ≠ LOCALITY ولا يجوز استبداله بها.

**فحص البيانات (dev):**
```
HealthFacility total=12
entry_point_null=12  (100% بلا entry_point)
locality_null=0      (كلها مرتبطة بمحلية)
```
**في dev: الترجمة تُنتج `[]` دائمًا.** كل اختبارات FACILITY يجب أن تبني fixture
مكتملة (fac = create(entry_point=EP)). لا يمكن التحقق من staging/prod من هنا.

**Confidence:** LOW–MEDIUM — الآلية واضحة؛ **تغطية البيانات غير مُثبتة إطلاقاً في dev**.

---

## Q3 — `scope_optional` semantics

**الاستخدام الحالي:** فقط في `apps/organization/views.py` (3 viewsets على جداول
مرجعية مشتركة — بلا بُعد نطاق أصلاً) + `core/utils/scoping.py:scope_is_optional`.
لا يوجد أي viewset محلي/منشأة يعلنها.

**القاعدة المطلوب حفظها:** LOCALITY/FACILITY لا يتعاملان مع `scope_optional=True`
بأي شكل خاص — أي viewset يعلنها يتخطى الفحص كله (الوضع الحالي للجداول المرجعية).
أي viewset لا يعلنها ولا يوجد فيه path → **deny-all fail-safe** (لا توسيع، لا
تسريب). لا تغيير في الـ semantics.

**Confidence:** HIGH.

---

## Q4 — التطبيقات التي ترث تلقائياً (عبر `resolve_authorized_entry_points`)

بمجرد إضافة قناتي Q1/Q2 إلى resolver، التطبيقات التي تستدعي
`resolve_authorized_entry_points` / `resolve_user_port_ids` /
`SectorScopedMixin` / `borders_health direct` سترث LOCALITY/FACILITY
**بنفس آلية STATE تماماً**:

| التطبيق | القناة الحالية | الوَراثة |
|---|---|---|
| surveillance | `resolve_user_port_ids` | ✅ auto (H6) |
| vaccination | `SectorScopedMixin` + `resolve_user_port_ids` | ✅ auto (H6) |
| borders_health | `resolve_authorized_entry_points` مباشر + permissions object-level | ✅ auto (H6) |
| food_quarantine | `resolve_user_port_ids` + direct gate `views.py:858` | ✅ auto (H6) |
| airport_health | `SectorScopedMixin` + resolver | ✅ auto (H6) |
| emergency_eoc | `resolve_user_port_ids` + `_surveillance_scope_q` | ✅ auto (H6) |
| carriers | `resolve_user_port_ids` | ✅ auto (H6) |
| registry | `_visible_reporting_node_ids` — يستدعي resolver ⇒ EPs مُشتقة تدخل في الاتحاد (facility_ids/locality_ids/sector ids من الـ EPs) | ✅ جزئي auto + branch صريح مطلوب (Q8) |

**التطبيقات التي تحتاج branches صريحة (لا تعتمد على resolver وحده):**

| التطبيق | الموقع | ما يلزم |
|---|---|---|
| screening | `screening/views.py:67 _entry_point_ids_for()` | إضافة LOCALITY/FACILITY branch (union مع STATE/SECTOR/home-sector) |
| laboratory | `laboratory/views.py` viewsets — `state_path` مُضاف في M5-B-1 | إعلان `locality_path` / `facility_path` أو defer بـ D-M5-C-1 |
| vector_control | `vector_control/views.py` — `SectorFieldScopedMixin` + `_scoped` في dashboard | نفس المسار (قراءة EP فقط عبر ID field اختياري) |
| hr | `hr/scoping.py SCOPE_LOOKUPS` + `resolve_own_org_scope_keys` | `'LOCALITY': ('entry_point__locality_id',)` + إصدار مفتاح من تعيين الفاعل؛ **FACILITY مستحيل** بلا schema |
| port_health | `asserts_geographic_scope` في scoping.py:353-370 (`SECTOR_LIKE + ENTRY_POINT + DEPARTMENT + STATION + STATE`) | إضافة `'LOCALITY', 'FACILITY'` ← بدونها مستخدم LOCALITY-only يظهر «غير مُقيَّد» = **بوابة مفتوحه بالخطأ**. هذا **critical**. |
| shipping | `shipping/services.py:252,746,1006` — tuples `('POINT','PORT')` / `('SECTOR','REGION')` مباشرة + `active_scopes` | إضافة LOCALITY/FACILITY handling صريح أو المشتق من resolver |
| registry | `registry/views.py:94 _visible_reporting_node_ids` | union مباشر لـ `LocalityNodeAssignment` / `HealthFacilityNodeAssignment` |

---

## Q5 — `SectorFieldScopedMixin` — LOCALITY/FACILITY؟

**لا توجد أي FK للمحلية أو المنشأة في نماذج laboratory أو vector_control**
(`grep -n "locality\|facility" models.py` → فراغ). أي path يجب أن يمر عبر
`entry_point`:
- LOCALITY: `entry_point__locality_id` — نفس نمط `state_path='entry_point__state_id'`.
- FACILITY: `entry_point__health_facilities__id` — multi-valued reverse FK
  (لا `__in` معdistinct على مسار واحد — يتطلب `.distinct()` أو subquery).

**التصميم المقترح (للمراجعة لاحقاً — ليس جزءاً من الاستكشاف):** viewsets قابلة
للتوسعة بإعلان `locality_path` و `facility_path` صراحةً، مع نفس دلالات
STATE: scope لا يُترجم → deny (fail-safe). النماذج القطاعية بدون EP تبقى كما هي.

**Confidence:** MEDIUM — آلية STATE مثبتة؛ FACILITY path متعدد القيم يحتاج
doklaring حذر (قد يُنشئ duplicates → `distinct()` مثل STATE).

---

## Q6 — HR `SCOPE_LOOKUPS` — LOCALITY/FACILITY

**`OrgAssignment` ليس فيه `locality` ولا `facility` FK** (تمت القراءة). كل الجسور
تمر عبر `entry_point`:

**LOCALITY (ممكن):**
```python
'LOCALITY': ('entry_point__locality_id',),
```
و `resolve_own_org_scope_keys` يصدر `('LOCALITY', a.entry_point.locality_id)`
لكل تعيين نشط يحمل EP + LOCALITY — **بنفس نمط STATE تماماً** (ADDITION لا
استبدال، مع `select_related('entry_point__locality')` لمنع N+1).
ملاحظة: STATE نفسه يعمل هكذا — نفس القيود (employee بـ `entry_point=None`
→ لا يظهر؛ **سلوك موثق ومقبول**؛ ليست widening ولا تسريب).

**FACILITY (مستحيل بلا schema):**
لا يوجد مسار من `OrgAssignment` إلى هوية `HealthFacility`. الخيارات:
- A — `OrgAssignment.facility` FK nullable (migration — قرار M6).
- B — HR FACILITY = **deny-all** (fail-safe) موقوف حتى قرار منتج.
**التوصية: الخيار B الآن، A كـ M6.**

**Confidence:** LOCALITY MEDIUM (جاهز، مع نفس قيد EP) · FACILITY HIGH (لا يمكن
بلا schema).

---

## Q7 — `screening._entry_point_ids_for` — LOCALITY/FACILITY

`HealthScreening.port` = FK(`masterdata.EntryPoint`). الإضافة للفرع:
```python
locality_ids = [s['scope_id'] for s in scopes
                if s['scope_type'] == LOCALITY and s['scope_id']]
facility_ids = [s['scope_id'] for s in scopes
                if s['scope_type'] == FACILITY and s['scope_id']]
if locality_ids:
    port_ids += list(EntryPoint.objects.filter(
        locality_id__in=locality_ids, is_active=True)
        .values_list('id', flat=True))
if facility_ids:
    port_ids += list(EntryPoint.objects.filter(
        health_facilities__id__in=facility_ids, is_active=True)
        .values_list('id', flat=True).distinct())
```
**أي screening ستظهر لـ FACILITY user؟** الفحوصات التي `port` (الـ EntryPoint)
يملك منشأة واحدة تربطه بها — أي `health_facilities` من FACILITY-scope موجودة
في هذا الـ EntryPoint. لا تسريب آخر، لأن العلاقة هي EP↔facility مباشرة.
إن كان للمنشأة بلا EP (واقع dev!) → المستخدم لا يرى شيئاً — نفس fail-safe
المقبول في STATE بدون ولاية ذات منافذ.

**Confidence:** HIGH (آلية) · مع **تحفظ dev** (لا EP في dev أصلاً).

---

## Q8 — `registry._visible_reporting_node_ids` — LOCALITY/FACILITY

**المتوفر منذ M1:**
- `LocalityNodeAssignment.locality` → `organization.Locality` (valid_to history)
- `HealthFacilityNodeAssignment.facility` → `masterdata.HealthFacility` (valid_to history)
- الفرع STATE path في `_visible_reporting_node_ids` (M4-2-bis) يعالج
  subtree expansion عبر `ReportingNode.path` (`path` و `path__startswith('p/')`) ثم
  union التعيينات — **نفس القالب**.

**للمقترح:**
- LOCALITY: `user_locality_ids = get_user_locality_ids(user)` (مساعد جديد)
  → ∪ `LocalityNodeAssignment.objects.filter(locality_id__in=…,
  valid_to__isnull=True).values_list('node_id')` → subtree path expand →
  ∪ `HealthFacilityNodeAssignment` + `StateNodeAssignment` كما في STATE، لكن
  باستخدام `healthfacilitynodeassignment_set__facility_id__in=…` و
  `localitynodeassignment_set__locality_id__in=…` مباشرةً أيضًا (كما يفعل
  الكود اليوم مع قيم مشتقة من EPs — لكن بلا اشتقاق هذه المرة).
- FACILITY: نفس الشيء بـ `get_user_facility_ids()` → لا يحتاج subtree بالضرورة
  (مرآة المنشأة → العقدة مباشرة عبر `HealthFacilityNodeAssignment`)؛ subtree
  optional للوضع المتفرع.

**خطر التسريب:** داخل نفس الضبط — كل union يُفلتر بـ `valid_to__isnull=True`
و `path` prefix بنفس دلالات STATE؛ لا يُوسّع أحد النطاقين إلى الآخر.
الاختبار يجب أن يتحقق: LOCALITY user في locality A لا يرى عقد locality B.

**Confidence:** MEDIUM–HIGH (القالب مثبت في M4-2-bis؛ مخاطرة regex-like
issues في path موجودة أصلاً).

---

## Application Impact Matrix

| التطبيق/الموديول | الحالي (M5-B) | LOCALITY | FACILITY | الإجراء المطلوب |
|---|---|---|---|---|
| surveillance | ✅ H6 | ✅ auto | ✅ auto | none |
| vaccination | ✅ H6 | ✅ auto | ✅ auto | none |
| borders_health | ✅ H6 | ✅ auto | ✅ auto | none |
| food_quarantine | ✅ H6 | ✅ auto | ✅ auto | none |
| airport_health | ✅ H6 | ✅ auto | ✅ auto | none |
| emergency_eoc | ✅ H6 | ✅ auto | ✅ auto | none |
| carriers | ✅ H6 | ✅ auto | ✅ auto | none |
| screening | ✅ H3 closed | ⚠️ needs branch | ⚠️ needs branch | Q7 |
| laboratory | ✅ H5 partial | ⚠️ needs path (EP-locality) | ⚠️ multi-valued EP path | Q5 + D-M5-C-1 |
| vector_control | ✅ H5 partial | ⚠️ needs path | ⚠️ needs path | Q5 |
| hr | ✅ H4 closed | ✅ put LOCALITY in SCOPE_LOOKUPS | ❌ impossible without schema | Q6 |
| port_health | ✅ H2 fixed | ⚠️ **critical** — asserts_geographic_scope | ⚠️ same | scoping.py:366 tuple |
| shipping | ✅ H2 fixed | ⚠️ notification tuples direct | ⚠️ same | views/services updates |
| registry | ✅ M4-3-bis | ⚠️ union via LocalityNodeAssignment | ⚠️ union via HealthFacilityNodeAssignment | Q8 |

---

## ScopeType Impact

### `ScopeType.LOCALITY` / `ScopeType.FACILITY`
- إضافة إلى `ScopeType.TextChoices` (Labels: «محلية» / «منشأة صحية»).
- **Migration:** AlterField options-only على `accounts_role_assignment.scope_type`
  + `default_scope` — لا تغيير على مستوى SQL (VARCHAR) — سابقة: migration
  `0018_alter_role_default_scope_and_more` (STATE) — **لكنها migration file
  → تحتاج إذن مالك** (M5-B gates تمنع migrations ضمن الفرع الحالي).
- `test_scope_lookups.py` (`test_scope_lookups` structural guard: «كل ScopeType
  يجب أن يُعالَج») يجب أن يضيف `'LOCALITY', 'FACILITY'` إلى handled set —
  حتى لا يفشل CI (وهذا اختبار موجود اليوم).

### `_validate_scope_id` — **فجوة STATE القائمة + الإصلاح المطلوب**
`accounts/serializers.py:250` — mapping الحالي:
`SECTOR, DEPARTMENT, STATION, POINT, PORT, REGION, COMPANY` **ولا يوجد STATE**
⇒ أي `RoleAssignment(scope_type='STATE', scope_id=<state uuid>)` عبر الـ API
→ 400 «نوع النطاق STATE غير معروف». الـ frontend
(`RoleAssignmentFormDialog.tsx:96`) يُرسل STATE اليوم → المستخدم يواجه خطأ
عند الإنشاء. اختبارات M4-1/M5-A تتجاوز الواجهة عبر `objects.create` مباشرة.

**الإصلاح المقترح (قرار مالك):**
```python
'STATE':    ('masterdata.State', 'الولاية'),
'LOCALITY': ('organization.Locality', 'المحلية'),
'FACILITY': ('masterdata.HealthFacility', 'المنشأة'),
```
بدون STATE، M5-C يضيف scope لا يمكن إسناده فعلياً عبر الواجهة — عمل ضائع جزئياً.

### نمط Migration
`makemigrations` سيولد AlterField choices-only (options لا schema) — لا حاجة
لأي SQL حقيقي. لكن لا يزال يُصنَّف migration في CI.

### نقاط لا تتأثر
- `active_assignments()` في authorization.py — type-agnostic (filter على
  `scope_id__isnull=False` فقط) ⇒ LOCALITY/FACILITY تدفق بدون تعديل.
- `check_grant_capability()` — type-agnostic (ينجح عبر `(scope_type, scope_id) in scopes`).
- `has_active_global_scope` — بلا أثر.

---

## Risk Assessment

| المخاطرة | الخطورة | التخفيف |
|---|---|---|
| **LOCALITY → widening** (توسيع عبر محلية بغير منافذها) | 🟡 LOW | الترجمة مباشرة على عمود `EntryPoint.locality_id` — لا توسع عبر sector/state |
| **FACILITY → widening** | 🟡 LOW | EP الوحيد المرتبط بالمنشأة؛ لا توسع للمحلية ولا للقطاع |
| **Silent deny-all** (viewset بلا path يعلن FACILITY بلا ترجمة) | 🟠 MEDIUM | يفشل بالأمان — يوثق كـ D-M5-C-1 (نظير D-M5-B-2)؛ viewsets الـ EP-based ترث تلقائياً |
| **`asserts_geographic_scope` لا يضم LOCALITY/FACILITY** | 🔴 HIGH | مستخدم LOCALITY-only يصبح «غير مُقيَّد» ⇒ بوابة مفتوحة. **إلزامي في M5-C-2** |
| **Regression على STATE/SECTOR/PORT الحالية** | 🟠 MEDIUM | مصفوفة 4-scope × 13 تطبيقًا في M5-C-4؛ pytest + build إلزاميون |
| **`_validate_scope_id` STATE القائم** | 🔴 HIGH (وجدها هذا الاستكشاف) | قرار مالك: تضمين STATE في الإصلاح |
| **dev DB فارغة من EntryPoints** | 🟠 MEDIUM | fixture كاملة في كل اختبار (EP + locality + facility + entry_point) |
| **Migration AlterField choices-only** | 🟢 LOW | سابقة 0018 مُثبتة؛ لا SQL |
| **تسريب بين المحليات عبر registry subtree** | 🟠 MEDIUM | نفس انضباط STATE (valid_to + path prefix) مع tests صريحة anti-cross-locality |

---

## Effort Estimate

| المرحلة | التقدير |
|---|---|
| M5-C-1 (Discovery — هذا التقرير) | ~1 يوم (تم) |
| M5-C-2 (scoping.py: resolver + `asserts_geographic_scope` + ScopeType + `_validate_scope_id` incl. STATE gap) | 2–3 أيام |
| M5-C-3 (branches: screening · hr · laboratory/vector paths · registry nodes · shipping tuples) | 3–4 أيام |
| M5-C-4 (matrix tests 4-scope × 13 apps + cross-locality leak) | 3–4 أيام |
| M5-C-5 (docs + debt + known-risk) | 1 يوم |
| **المجموع** | **2–3 أسابيع** (واقعياً 3 مع أي surprise) |

---

## Critical Questions for Owner

1. **النطاق: PRIMARY قرار** — LOCALITY و FACILITY في phase واحد أم منفصلين؟
   (توصيتي: phase واحد، sub-phases مجزأة H-ت-نمط: M5-C-2 scoping، M5-C-3 branches،
   M5-C-4 tests، مع 7 موجودات H6 تُرك كما هي.)
2. **FACILITY لـ HR:** هل نؤجل FACILITY في `hr` كلياً (لا SCOPE_LOOKUPS) حتى
   schema لاحق (M6) — deny-all — أم نرى حلاً آخر (مثل liaison EP-ف.assignمنشأة)؟
   (توصيتي: التأجيل مع D-M5-C-2 موثق.)
3. **جاهزية البيانات:** dev فيها **0 EntryPoints** (locality coverage غير قابل
   للقياس) و **0/12 منشأة لها entry_point**. هل نشغّل `COUNT` على staging/prod
   قبل M5-C-2 (يعطي تقدير تغطية + بؤر الفحص) — نعم/لا؟
4. **فجوة `_validate_scope_id` (STATE):** هل نصلحها في M5-C (سطور 3 + test واحد)
   أم منفصلة؟ (توصيتي: داخل M5-C-2 — بند hygiene إلزامي.)
5. **registry node union (Q8):** يدخل scope M5-C أم يؤجل؟ (توصيتي: داخل M5-C-3
   لأنه يحتاج نفس helperَيْ `get_user_locality_ids` / `get_user_facility_ids`.)

---

## DoD — Discovery

- [x] `m5-c-discovery.md` بـ 8 أقسام + matrix + risk + estimate + 5 أسئلة حرجة.
- [x] Data checks (COUNT) على EntryPoint.locality و HealthFacility.entry_point.
- [x] لا كود · لا migrations · لا ScopeType جديدة.
- [x] Baseline معاد التحقق: 443 passed + 1 xfailed + 0 xpassed.
- [x] PR-first محفوظ — لا دفع، لا PR إلى main.
