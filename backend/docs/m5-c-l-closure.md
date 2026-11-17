# M5-C-L Closure Certificate — LOCALITY Scope

**الحالة:** مكتمل تقنياً — **بانتظار attestation المالك** (نمط M5-B).
**الفرع:** `feat/organizational-registry-m5` · **الـ commit:** `8465803`
**PR:** #172 (OPEN — 39 commits، بلا merge) · **التاريخ:** 2026-11-11

---

## 1. نطاق التسليم

| البند | الحالة |
|---|---|
| `ScopeType.LOCALITY` + migration `0019` (choices-only) | ✅ |
| `_validate_scope_id` → `organization.Locality` | ✅ |
| `_locality_entry_point_ids` + `get_user_locality_ids` + resolver branch | ✅ |
| `asserts_geographic_scope` + LOCALITY (بلا بوابة — fail-closed) | ✅ |
| `SectorFieldScopedMixin.locality_path` | ✅ |
| screening · HR · registry (union + subtree) · laboratory ×2 · VectorTeam | ✅ |
| 7 تطبيقات تلقائية (surveillance/vaccination/borders_health/food_quarantine/airport_health/emergency_eoc/carriers) | ✅ بلا تعديل |
| بوابة `PROD_SCOPING_ENABLED` (default False) + إنفاذ في 3 وحدات | ✅ |
| Frontend: type + picker + labels (+ STATE label المفقود) · `tsc` = 0 | ✅ |
| 22 اختبار جديد | ✅ كلها تمر |

## 2. التحققات الخمس (V-1 → V-5) — كلها PASS

| V | النتيجة |
|---|---|
| **V-1** | 21 مدخلاً: 17 modified + 4 جديد (migration، اختباران، docs). لا ملفات غريبة. |
| **V-2** | `0019` = **AlterField ×2 فقط** (`Role.default_scope`، `RoleAssignment.scope_type`) — لا AddField/RemoveField/RunPython/RunSQL. |
| **V-3** | `_visible_reporting_node_ids`: `user_locality_ids` + union + `locality_path_q` subtree + `localitynodeassignment_set__locality_id__in` **مع** `valid_to__isnull=True`. |
| **V-4** | `RegistryScopedViewSet.get_queryset`: نفس الشرط حرفياً مع `valid_to__isnull=True` — متسق تماماً مع V-3 (لا تسريب historical). |
| **V-5** | البوابة منفَّذة في 3 وحدات: `scoping.py` (تعريف + نقطتا إنفاذ)، `screening/views.py:100`، `hr/scoping.py:109,141`. لا skips في ملفات LOCALITY؛ الـ2 skipped القائمان موثّقان: `test_csrf_trusted_origins.py:68` (reason: deploy file غائب) و`test_seed_border_officers_phase3b.py:209` (skip بياناتي). |

## 3. الأرقام النهائية

| النطاق | النتيجة |
|---|---|
| registry + organization + accounts | **706 passed + 1 xfailed + 2 skipped** (684 → 706 = **+22 بالضبط**) |
| HR | 261 passed |
| screening + vector_control | 25 passed |
| laboratory | 28 passed |
| xfail | `D-M5-B-1` VectorUnit (`strict=True`) — بلا xpass |
| فشل وحيد | `test_openapi_schema.py::test_dev_vps_gunicorn_command_sets_schema_safe_timeout` — **قائم قبل M5-C-L** (ملف deploy غائب في حاوية dev؛ تحقق `git stash` في M5-C-0) |
| `makemigrations --check` | صفر drift في accounts (surveillance geometry قائم مسبقاً) |

## 4. القرارات المحفوظة

- **H1′:** القطاع المنزلي + نطاقات الأدوار = اتحاد بالخيار — LOCALITY تُضاف بالتوازي، لا تستبدل (اختبار union صريح).
- **Fail-closed:** `asserts_geographic_scope` تعرف LOCALITY بلا بوابة ⇒ في prod المغلقة: `has_port_scope=True` + `port_ids=[]` ⇒ `qs.none()` (لا فتح عام).
- **VectorUnit:** بقي بلا `locality_path` — D-M5-B-1 ساري.

## 5. الشروط المتبقية قبل تفعيل prod

1. COUNT على staging/prod: تغطية `EntryPoint.locality` (≥ 80% مستهدف) — المالك.
2. تحقق staging ببوابة مفتوحة.
3. `PROD_SCOPING_ENABLED=True` في بيئة النشر.

## 6. المعلَّق (مُدوَّن بوعي)

- **M5-C-F** (FACILITY) — خطة في `m5-c-f-planning.md`؛ بوابته الخاصة.
- **D-M5-C-F-1:** HR/FACILITY → M6 (لا FK منشأة في `OrgAssignment`).
- **M5-D** (Vitest) · **M6** (Sector.state_ids) — بلا تغيير.

**إقرار الإغلاق:** يُطلب من المالك بعد مراجعة PR #172 — كإقرار M5-B.
