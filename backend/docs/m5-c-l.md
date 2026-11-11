# M5-C-L — نطاق LOCALITY (المحلية)

**الفرع:** `feat/organizational-registry-m5` · **PR:** #172 · **البيئة:** dev فقط
**التقدير المنفَّذ:** جلسة واحدة (backend + frontend minimal + tests + docs)
**Gate:** `PROD_SCOPING_ENABLED` (default **False**)

---

## 1. الملخّص

- `ScopeType.LOCALITY` أُضيف (`accounts/models.py`) مع migration **choices-only**
  (`0019_add_locality_scope_type` — AlterField على `Role.default_scope` و
  `RoleAssignment.scope_type`، بلا تغيير في المخطط الفعلي).
- `_validate_scope_id` mapping يقبل **LOCALITY** →
  `organization.Locality` (رسالة الخطأ: «المحلية المحدد غير موجود»).
- `resolve_authorized_entry_points` يدمج قناة LOCALITY عبر
  `_locality_entry_point_ids` (اتحاد بلا استبدال — نفس نمط STATE M4-1).
- `get_user_locality_ids` + بوابة `locality_scope_enabled()` في
  `core/utils/scoping.py`.
- `asserts_geographic_scope` تعرف LOCALITY **بلا بوابة** (fail-closed في prod
  بدل اعتبار المستخدم «غير جغرافي» ⇒ وصول عام).
- `SectorFieldScopedMixin.locality_path` (نظير `state_path` — M5-B-1).
- الفروع التطبيقية: screening (`_entry_point_ids_for`)، HR
  (`SCOPE_LOOKUPS['LOCALITY']` + `resolve_own_org_scope_keys`)،
  registry (`_visible_reporting_node_ids` + `get_queryset` inline: union +
  subtree path عبر `LocalityNodeAssignment`)، laboratory (2 viewsets)،
  vector_control (VectorTeam فقط — VectorUnit يبقى D-M5-B-1).
- 7 تطبيقات ترث تلقائياً عبر الـ resolver (surveillance/vaccination/
  borders_health/food_quarantine/airport_health/emergency_eoc/carriers) —
  بلا أي تعديل عليها.
- Frontend: `'LOCALITY'` في `ScopeType`/`SCOPE_TYPES`، تسميات `scopeType`
  (STATE كانت ناقصة أيضاً)، `getLocalities` endpoint، ومنتقي محلية في
  `RoleAssignmentFormDialog.tsx` (نفس نمط منتقي STATE).
- **22 اختباراً جديداً** — كلها تمر.

## 2. البوابة — `PROD_SCOPING_ENABLED`

`backend/nqp_backend/settings.py`:

```python
PROD_SCOPING_ENABLED = os.environ.get('PROD_SCOPING_ENABLED', 'False').lower() in ('true', '1', 'yes')
```

السلوك (`core.utils.scoping.locality_scope_enabled`):

| `DEBUG` | `PROD_SCOPING_ENABLED` | LOCALITY |
|---|---|---|
| True (dev) | أي قيمة | ✅ تعمل |
| False (prod) | False (الافتراضي) | 🚫 **deny-all** — fail-safe |
| False (prod) | True (بعد التحقق) | ✅ تعمل |

نقاط الإنفاذ (كلها عبر `locality_scope_enabled()` أو داخل الدوال المعتمدة عليه):

1. `get_user_locality_ids` → `set()` عند الإغلاق (يمنع SectorFieldScopedMixin
   وregistry node union وHR role-keys).
2. `_locality_entry_point_ids` → `set()` (يمنع resolver/CompanyPortScopedMixin/
   RegistryScopedViewSet).
3. `screening._entry_point_ids_for` → فرع LOCALITY لا يضيف شيئاً.
4. `hr.resolve_hr_scope_keys` → إسقاط كل مفاتيح `('LOCALITY', ...)`.
5. `hr.resolve_own_org_scope_keys` → لا يُصدر `('LOCALITY', ...)`.

**استثناء مقصود واحد:** `asserts_geographic_scope` تعرف LOCALITY **دائماً**
(بلا بوابة) — حتى لا يُصنَّف مستخدم LOCALITY في prod المغلقة كـ«بلا بُعد
جغرافي» فيفتح `CompanyPortScopedMixin` كل الصفوف. النتيجة عند الإغلاق:
`has_port_scope=True` + `port_ids=[]` ⇒ `qs.none()` (fail-closed).

## 3. قائمة التفعيل في الإنتاج (Activation Checklist)

1. COUNT على staging: تغطية `EntryPoint.locality` (المستهدف ≥ 80%)، وتغطية
   `HealthFacility.entry_point` (لـ M5-C-F لاحقاً).
2. مراجعة عيّنة يدوية: محليات بلا EntryPoints ستبقى deny-all (سلوك مقصود).
3. ضبط `PROD_SCOPING_ENABLED=True` في بيئة النشر.
4. تحقق staging: LOCALITY user يرى محليته فقط ولا يرى محلية أخرى.
5. النشر إلى prod + مراقبة سجلات `resolve_authorized_entry_points` (تحذيرات
   scope_type غير معروفة).

## 4. مصفوفة الأثر (تطبيقات)

| التطبيق | المسار | الحالة |
|---|---|---|
| screening | `_entry_point_ids_for` + LOCALITY branch | ✅ مباشر |
| hr | `SCOPE_LOOKUPS['LOCALITY']` + own-org keys | ✅ مباشر |
| laboratory | `locality_path` (LabSampleViewSet/SampleTestViewSet) | ✅ مباشر |
| vector_control | `locality_path` (VectorTeamViewSet فقط) | ✅ مباشر (VectorUnit = D-M5-B-1) |
| registry | node union + subtree via `LocalityNodeAssignment` | ✅ مباشر |
| port_health / shipping | `SectorScopedMixin`/`CompanyPortScopedMixin` → resolver | ✅ تلقائي |
| surveillance / vaccination / borders_health / food_quarantine / airport_health / emergency_eoc / carriers | resolver | ✅ تلقائي (بلا تعديل) |

## 5. الاختبارات (+22)

| الملف | العدد | التغطية |
|---|---|---|
| `apps/registry/tests/test_m5_integration/test_locality_scope.py` | 12 | resolver (own/cross/union/plain)، بوابة (off/on)، asserts + combined fail-closed، registry node + subtree |
| `apps/registry/tests/test_m5_integration/test_locality_consistency.py` | 8 | laboratory/screening/hr: own visible، لا تسرب عابر، بوابة HR/screening مغلقة |
| `apps/accounts/tests/test_scope_validation.py` | +2 | API: LOCALITY صالح → 201، LOCALITY غير موجود → 400 |
| `apps/registry/tests/test_scope_lookups.py` | (حرس) | إضافة LOCALITY إلى `handled` — structural guard |

**القاعدة:** كل اختبارات البوابة تفرض `settings.DEBUG`/`settings.PROD_SCOPING_ENABLED`
صراحةً — مستقلة عن بيئة التشغيل (dev الحالي `DEBUG=True`).

**Baseline (registry+organization+accounts):** 684 → **706 passed + 1 xfailed**
(+22 بالضبط). + HR 261، screening+vector 25، laboratory 28 — كلها خضراء.
xfail الوحيد: `D-M5-B-1` VectorUnit (`strict=True`) — بقي كما هو.

**ملاحظة اختبار قائم مسبقاً:** `apps/accounts/tests/test_openapi_schema.py::
test_dev_vps_gunicorn_command_sets_schema_safe_timeout` يفشل في حاوية dev
لغياب `/deploy/docker-compose.dev-vps.yml` — **قائم قبل M5-C-L** (تحقق عبر
`git stash` في M5-C-0) وغير متعلق بالنطاق.

## 6. القرارات (Deltas)

- **Delta 5:** `_visible_reporting_node_ids` + `RegistryScopedViewSet.get_queryset`
  يدمجان `user_locality_ids` في `locality_ids` ويضيفان `locality_path_q`
  (subtree) — تناظر تام مع مسار STATE (M4-2-bis). H1′ محفوظ: الاتحاد
  بالخيار، لا استبدال للقطاع.
- **Delta 6:** `hr.resolve_hr_scope_keys` يُسقط مفاتيح LOCALITY عند إغلاق
  البوابة (مركز إنفاذ واحد يغطي مفاتيح الأدوار والمشتقة من OrgAssignment).
- **Delta 7:** `asserts_geographic_scope` تعرف LOCALITY بلا بوابة —
  fail-closed مقصود (موثّق أعلاه).

## 7. خارج النطاق (Deferred)

- **FACILITY scope** → M5-C-F (يشترط COUNT على `HealthFacility.entry_point`
  — dev حالياً 0/12).
- **HR/FACILITY** → `D-M5-C-F-1` (M6 — لا FK منشأة في `OrgAssignment`).
- **M5-D** (Vitest) — لم يُلمس.
- **H6** (7 تطبيقات تلقائية) — لم تُلمس اختباراتها.
- **UI كامل للمحليات** (فلاتر/شجرة اختيار متقدمة) → `M5-C-L-frontend` إن لزم.
- **M6** (Sector.state_ids resolution) — بلا تغيير.

## 8. ما لم يُلمس (تأكيد)

- `test_state_widening_h1.py` (H1 REFUTED guard) — بلا تعديل.
- `test_screening_h3.py` / `test_hr_h4.py` / `test_h5` / `test_h3` /
  `test_h1prime_consistency.py` / H2 / H6 — بلا تعديل.
- `core/utils/scoping.py` STATE/SECTOR/POINT/DEPARTMENT/STATION semantics —
  بلا تغيير (إضافات LOCALITY فقط).
- لا migrations على جداول موجودة — choices-only واحد.
- VectorUnitViewSet — بلا `locality_path` (D-M5-B-1 قائم).
