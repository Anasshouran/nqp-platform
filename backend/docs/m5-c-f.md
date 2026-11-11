# M5-C-F — نطاق المنشأة الصحية (ScopeType.FACILITY)

**الفرع:** `feat/organizational-registry-m5` · **PR:** #172 (يبقى OPEN)
**الحالة:** منفَّذ ومُتحقَّق منه — بانتظار مراجعة المالك ثم commit
**البيئة:** dev فقط (`DEBUG=True`) · **البوابة:** `PROD_SCOPING_ENABLED` (default `False`)

---

## 1. الملخّص (Summary)

| البند | التغيير |
|---|---|
| `ScopeType.FACILITY` | أُضيف بعد `LOCALITY` في `accounts/models.py` |
| Migration | `accounts/0020_add_facility_scope_type` — **choices-only** (`AlterField ×2`) |
| التحقّق (`_validate_scope_id`) | `'FACILITY': ('masterdata.HealthFacility', 'المنشأة الصحية')` |
| الجسر | `_facility_entry_point_ids` → `HealthFacility.entry_point` (SET_NULL) |
| المحلّل | فرع `FACILITY` في `resolve_authorized_entry_points` (اتحاد) |
| السجل | اتحاد `get_user_facility_ids` في **موقعَي الفرض** + مسار شجرة `facility_path_q` |
| التطبيقات | **لا فروع جديدة** — سياسة deny-all لـ screening/HR/lab/vector (D-F-1/2/3) |
| الواجهة | `'FACILITY'` في النوع + منتقي منشأة في `RoleAssignmentFormDialog` |
| الاختبارات | **17** اختباراً جديداً (Baseline 706 → 723) |

### 1.1 الحقل الوحيد المتاح للجسر (English technical)

`HealthFacility.entry_point` (FK → `masterdata.EntryPoint`, `on_delete=SET_NULL`) هو
**الوحيد** الرابط بين المنشأة ونقطة الدخول. لا يوجد:

- `HR.OrgAssignment.facility` FK
- `screening.HealthScreening.facility` FK
- `laboratory.*.facility` FK

ولهذا اقتصر FACILITY على: (1) تحويله إلى نقاط دخول في المحلّل المعتمد،
(2) اتحاد مرئية عقد السجل عبر `HealthFacilityNodeAssignment`. أي شيء آخر يحتاج
مخططاً جديداً ⇒ مؤجّل إلى M6.

---

## 2. سياسة deny-all (D-F-1/2/3)

| التطبيق | سلوك FACILITY | السبب | الدَّين |
|---|---|---|---|
| surveillance, vaccination, borders_health, food_quarantine, airport_health, emergency_eoc, carriers, VectorControlDashboard | ✅ يرث عبر `resolve_authorized_entry_points` (منشأة → نقطة دخول) | يستهلك المحلّل المعتمد | — |
| **screening** | 🚫 deny-all | `_entry_point_ids_for` لا يعرف FACILITY؛ دلالة المنفذ ≠ دلالة المنشأة | `D-M5-C-F-2` |
| **HR** | 🚫 deny-all | لا `OrgAssignment.facility` FK؛ `SCOPE_LOOKUPS` بلا FACILITY | `D-M5-C-F-1` (M6) |
| **laboratory** | 🚫 deny-all | `SectorFieldScopedMixin` بلا `facility_path` (ولا حقل منشأة) | `D-M5-C-F-3` |
| **vector_control (VectorUnit)** | 🚫 deny-all | sector-only (D-M5-B-1) | `D-M5-C-F-3` |
| **port_health, shipping** | 🚫 deny-all لمستخدم FACILITY وحده | `CompanyPortScopedMixin` + `asserts_geographic_scope` **بلا** FACILITY ⇒ `has_port=False`, `has_company=False` ⇒ `qs.none()` | fail-closed مقصود |

### 2.1 `D-M5-C-F-4` — FACILITY مُتجاهَل على port_health/shipping (مستخدم هجين)

**الوضع:** مستخدم بـ **FACILITY + COMPANY** على `port_health`/`shipping`:

- `asserts_geographic_scope` لا يحتوي FACILITY (D-F-3 fail-closed).
- بُعد COMPANY يعمل.
- **النتيجة:** يرى الموانئ المرتبطة بـ COMPANY فقط (FACILITY مُتجاهَل).

**التقييم:** سلوك صحيح — نطاق الميناء ≠ نطاق المنشأة، ولا widening (FACILITY
لا يفتح موانئ). **الأثر:** ملاحظة UX — إن أراد المستخدم الموانئ فعليه COMPANY/PORT
صريح. **القرار:** توثيق، لا إصلاح. M6 قد يفتح `FACILITY → port` derivation إن لزم.

**التصنيف:** دَين توثيق UX — **ليس** دَين أمان (لا تسريب ولا توسيع).
التفصيل الكامل في `m5-c-known-debt.md`.

### 2.2 لماذا لا فروع في التطبيقات؟

كل تطبيق من الأربعة يملك مسار النطاق الخاص به، ولا يقرأ `scope_type=FACILITY`:

- `screening`: `_entry_point_ids_for` — تفرّع صريح على `STATE` و`LOCALITY` فقط.
- `hr`: `SCOPE_LOOKUPS` + `resolve_own_org_scope_keys` — بلا مفتاح FACILITY.
- `laboratory`: `SectorFieldScopedMixin` — `state_path`/`locality_path` فقط.
- `vector_control`: `VectorUnit` sector-only (D-M5-B-1).

وجود `HealthFacility.entry_point` **لا** يوسّعها لأنها لا تستدعي المحلّل المعتمد
في مسار FACILITY. الاختبارات الثلاثة في `test_facility_deny_all.py` تُثبت ذلك
تجريبياً (عينات/فحوصات/موظفون في نفس منفذ المنشأة تبقى غير مرئية).

---

## 3. البوابة (D-F-5 — مشتركة، لا مفتاح جديد)

```python
def locality_scope_enabled():
    if getattr(settings, 'DEBUG', False):
        return True
    return bool(getattr(settings, 'PROD_SCOPING_ENABLED', False))

# M5-C-F (D-F-5): FACILITY تشترك في نفس البوابة — لا مفتاح جديد.
facility_scope_enabled = locality_scope_enabled
```

| DEBUG | PROD_SCOPING_ENABLED | السلوك |
|---|---|---|
| `True` (dev) | أي قيمة | FACILITY يعمل |
| `False` | `False` (الافتراضي) | **deny-all** — المحلّل `[]`، `get_user_facility_ids` = `set()`، عقد السجل غير مرئية |
| `False` | `True` | يعمل (بعد COUNT فقط) |

`PROD_SCOPING_ENABLED` يبقى `False` افتراضياً — لم يُفعَّل في أي بيئة غير dev.

---

## 4. الفروق (Deltas)

- **Delta 6 (ضمني):** `get_user_facility_ids` يُدمج في `allowed['facilities']`
  في **موقعَي الفرض** بالسجل (`_visible_reporting_node_ids` + `RegistryScopedViewSet.get_queryset`)،
  مع `valid_to__isnull=True` في كل استعلام، ومسار شجرة `facility_path_q`
  (نفس نمط `state_path_q`/`locality_path_q`) — H1′ محفوظ (اتحاد لا استبدال).
- **Delta 7 (ضمني):** `get_user_facility_ids` يعيد `None` للوطني (GLOBAL)
  و`set()` عند البوابة المغلقة — نفس عقد LOCALITY حرفياً.

---

## 5. الملفات المتغيّرة

| الملف | التغيير |
|---|---|
| `backend/apps/accounts/models.py` | `ScopeType.FACILITY` |
| `backend/apps/accounts/migrations/0020_add_facility_scope_type.py` | choices-only |
| `backend/apps/accounts/serializers.py` | `_validate_scope_id['FACILITY']` |
| `backend/core/utils/scoping.py` | `facility_scope_enabled` (alias)، `get_user_facility_ids`، `_facility_entry_point_ids`، فرع المحلّل |
| `backend/apps/registry/views.py` | اتحاد المنشآت + `facility_path_q` في الموقعين |
| `backend/apps/registry/tests/test_m5_integration/test_facility_scope.py` | 10 اختبارات |
| `backend/apps/registry/tests/test_m5_integration/test_facility_deny_all.py` | 3 اختبارات |
| `backend/apps/registry/tests/test_m5_integration/test_facility_consistency.py` | 2 اختباران |
| `backend/apps/accounts/tests/test_scope_validation.py` | 2 اختباران |
| `backend/docs/m5-c-f.md` | سجل التنفيذ + D-M5-C-F-4 |
| `backend/docs/m5-c-known-debt.md` | دفتر ديون M5-C (جديد) |
| `backend/apps/registry/tests/test_scope_lookups.py` | `'FACILITY'` في مجموعة `handled` (حرس إنشائي إلزامي) |
| `frontend/src/types/user.ts` | `ScopeType` + `SCOPE_TYPES` |
| `frontend/src/utils/status/rbac.ts` | تسمية `FACILITY` |
| `frontend/src/components/forms/RoleAssignmentFormDialog.tsx` | منتقي منشأة صحية |

**لم يُلمس:** `screening/`، `hr/`، `laboratory/`، `vector_control/`،
`asserts_geographic_scope`، `SectorFieldScopedMixin.facility_path`، H1–H6،
اختبارات M5-C-L.

---

## 6. تغطية الاختبارات (17)

| الملف | العدد | التغطية |
|---|---|---|
| `test_facility_scope.py` | 10 | المحلّل (ذاتي/بلا EP/اتحاد مع SECTOR/عادي/STATE لا يوسّع FACILITY) + البوابة (3) + عقد السجل (بلا EP/subtree) |
| `test_facility_deny_all.py` | 3 | screening + HR + laboratory — عينة/فحص/موظف في نفس منفذ المنشأة تبقى غير مرئية |
| `test_facility_consistency.py` | 2 | اتفاق موقعَي الفرض (`nodes` vs `service-node-assignments`) + حارس `valid_to` التاريخي |
| `test_scope_validation.py` | 2 | POST FACILITY صالح → 201، UUID عشوائي → 400 |

### 6.1 نتائج التشغيل

| المجموعة | النتيجة |
|---|---|
| registry + organization + accounts | **723 passed** + 1 failed (بيئي معروف) + 2 skipped + 1 xfailed |
| hr | 261 passed |
| screening + vector_control | 25 passed |
| laboratory | 28 passed |
| `npx tsc --noEmit` | 0 |
| `makemigrations accounts --check` | No changes detected |

Baseline قبل المرحلة: **706 + 1xf + 2skip** → بعدها **723 + 1xf + 2skip** (+17 بالضبط).

الفشل الوحيد pre-existing/بيئي:
`test_openapi_schema.py::test_dev_vps_gunicorn_command_sets_schema_safe_timeout`
(غياب `/deploy/docker-compose.dev-vps.yml` داخل الحاوية — يفشل على HEAD نظيف أيضاً).

---

## 7. قائمة تفعيل الإنتاج (Activation Checklist)

نفس قائمة LOCALITY (`m5-c-l.md`):

1. **COUNT على staging/prod:**
   - `EntryPoint.locality` — تغطية ≥ 80%
   - **`HealthFacility.entry_point` — التغطية الفعلية (حالياً 0/12 في dev)**
2. تفعيل `PROD_SCOPING_ENABLED=True` (مشترك مع LOCALITY).
3. التحقّق على staging: فحوصات UAT لنطاقات STATE/LOCALITY/FACILITY.
4. النشر إلى الإنتاج.

> ملاحظة: حتى مع `PROD_SCOPING_ENABLED=False` في الإنتاج، FACILITY **fail-closed**
> (لا تسريب)، لكن المستخدمين المفوَّضين بهذا النطاق لن يروا شيئاً. التفعيل قرار مالك
> مرتبط بنتائج COUNT — لم يُفعَّل في هذه المرحلة.

---

## 8. المؤجَّل إلى M6

| المعرّف | البند |
|---|---|
| `D-M5-C-F-1` | HR/FACILITY — يحتاج `OrgAssignment.facility` FK + `SCOPE_LOOKUPS['FACILITY']` |
| `D-M5-C-F-2` | screening/FACILITY — يحتاج `HealthScreening.facility` أو قرار سياسة (منفذ ≠ منشأة) |
| `D-M5-C-F-3` | laboratory/vector/FACILITY — يحتاج حقل منشأة على النماذج + `facility_path` |
| `D-M5-C-F-4` | FACILITY مُتجاهَل على port_health/shipping للمستخدم الهجين — **دَين توثيق UX** (لا أمان)؛ M6 قد يفتح `FACILITY → port` |
| `D-M5-B-1` | `VectorUnit` sector-only (xfail قائم) |
| `D-M5-C-L-*` | نفس بنود LOCALITY القائمة |

---

## 9. الانحرافات عن نص التنفيذ (موثّقة)

1. **`test_scope_lookups.py`:** أُضيف `'FACILITY'` إلى مجموعة `handled` — حرس
   إنشائي يفشل حتماً مع أي `ScopeType` جديد (سبق أن عولج بنفس الطريقة في M5-C-L).
2. **`frontend/src/utils/status/rbac.ts`:** أُضيفت تسمية `FACILITY` (لازمة لعرض
   الشارة في شاشة التعيينات؛ خارج الملفين المذكورين في النص، لا UI جديد).
3. **`facility_scope_enabled = locality_scope_enabled`:** alias بدل مفتاح/دالة جديدة
   — التزاماً بـ D-F-5 (بوابة مشتركة).
4. **الحراسة المبكرة (early fail-safe)** في موقعَي السجل أُدرج فيها
   `user_facility_ids` — وإلا لأصبح مستخدم FACILITY (بمنشأة بلا EP) غير مرئي
   لعقدته المباشرة، وهو ما يناقض الغرض من اتحاد `HealthFacilityNodeAssignment`.
5. **عدد الاختبارات:** 17 بالضبط (10 + 3 + 2 + 2) — لم يُتجاوز السقف.

---

**لا commit قبل مراجعة تقرير M5-C-F.** PR #172 يبقى OPEN.
