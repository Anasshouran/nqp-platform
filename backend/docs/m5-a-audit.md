# M5-A-1 — Audit: STATE scope across applications

> Read-only inventory of every scoping call site in the codebase. No production
> change was made. Companion to `backend/docs/m5-a-known-debt.md`.

## 1. Scope of scan

- **Date:** 2026-11-10
- **Branch:** `feat/organizational-registry-m5`
- **Files scanned:** `backend/apps/**/*.py` (excluding `__pycache__`, `migrations`, `tests`)
- **Scoping call/reference count:** ~140 sites across 18 applications
- **`core/utils/scoping.py` (`M4-1`) is the central implementation** — reviewed
  line-by-line. Assumption: applications that delegate to
  `resolve_authorized_entry_points` (via `resolve_user_port_ids`) inherit the
  STATE support added in M4-1 (`_state_entry_point_ids`). Applications that
  parse scopes **manually** do not.

## 2. Call-site inventory

Legend: ✅ works via resolver (M4-1) · 🟡 works but asymmetric/no sector granularity ·
🔴 deny-all silent (fail-safe, silent) · ⚠️ suspected wrong-widening fallback · ⚪ display-only

| App | File:Line | Function | Assumed scopes | STATE behaviour | Severity |
|---|---|---|---|---|---|
| surveillance | `views/__init__.py:138` | `resolve_user_port_ids` | SECTOR, REGION (+ ports via resolver) | ✅ port-dimension works (entry points in the STATE come from `_state_entry_point_ids`). `active_scopes('surveillance')` only reads SECTOR/REGION → no sector floor for STATE | 🟡 |
| surveillance | `views/__init__.py:167` | `_surveillance_scope_q` | empty Q `pk=None` when nothing resolvable | ✅ if `port_ids=[]` (STATE with no entry points) → `Q(pk=None)` → empty list | ✅ |
| surveillance | `views/gis.py:29` | `resolve_user_port_ids` | SECTOR, REGION | ✅ same as above — GIS gets port_ids (no STATE-sector fallback) | 🟡 |
| screening | `views.py:74` | manual `active_scopes` filter | POINT, PORT, SECTOR **only** | 🔴 STATE never matches `_ENTRY_POINT_SCOPE_TYPES` nor SECTOR → `port_ids=[]` → `qs.none()` (silent deny-all) | 🔴 P0 |
| screening | `views.py:98` | manual `qs.filter(port_id__in=port_ids)` | POINT, PORT | 🔴 same | 🔴 P0 |
| vaccination | `views.py:161` | `SectorScopedMixin` (`port_field='entry_point'`) | SECTOR, POINT, PORT (+ STATE via resolver) | ✅ entry-point restriction via resolver; `port_field` path uses entry_point FK | ✅ |
| vaccination | `views.py:189` | `SectorScopedMixin` (`port_field='site__entry_point'`) | SECTOR, POINT, PORT (+ STATE via resolver) | ✅ ditto (path filter on `site__entry_point`) | ✅ |
| vaccination | `views.py:227` | `resolve_user_port_ids` (create guard) | SECTOR, POINT, PORT (+ STATE) | ✅ create rejected 400 if site entry_point not in resolved set | ✅ |
| vaccination | `views.py:300-331` | `SectorScopedMixin` + `resolve_user_port_ids` | SECTOR, POINT, PORT (+ STATE) | ✅ dose/record protection | ✅ |
| vaccination | `views.py:452` | `SectorScopedMixin` ReadOnly | SECTOR, POINT, PORT (+ STATE) | ✅ certificates filtered by resolved EPs | ✅ |
| vaccination | `views.py:467` | `SectorScopedMixin` ReadOnly Dashboard | SECTOR, POINT, PORT (+ STATE) | ✅ dashboard filtered by resolved EPs | ✅ |
| vaccination | `views.py:527` | `resolve_user_port_ids` | SECTOR, POINT, PORT (+ STATE) | ✅ | ✅ |
| airport_health | `views.py:17,401,424,96` | `SectorScopedMixin`, `resolve_user_port_ids` | SECTOR, POINT, PORT (+ STATE) | ✅ via resolver | ✅ |
| food_quarantine | `views.py:227,29` | `resolve_user_port_ids` | SECTOR, POINT, PORT (+ STATE) | ✅ via resolver | ✅ |
| emergency_eoc | `views.py:139,306,16` | `resolve_user_port_ids`, `_surveillance_scope_q` | SECTOR, REGION | ✅ ports via resolver; empty combo → `Q(pk=None)` (safe) | ✅ |
| borders_health | `views.py:125-136,280-282` | `resolve_authorized_entry_points` (direct) + `_entry_point_scope_ids` | all resolver-supported (STATE ✅) | ✅ direct resolver; `create()` enforces `ep_ids ⊆ authorized` (STATE included) | ✅ |
| borders_health | `permissions.py:101-99` | `resolve_authorized_entry_points` (object-level) | all resolver-supported | ✅ object check uses same resolver | ✅ |
| port_health | `views.py:104-129` (`PortHealthScopedMixin`) | manual `active_scopes` filter then `resolve_user_sector` fallback | POINT/PORT + SECTOR-fallback | 🔴 STATE matches no `scope_type == self.scope_type` → `port_ids=[]` → falls back to `user.sector` (if set) → **sector-wide entry points granted** even though scope is STATE; if `user.sector` is null → deny-all silent | ⚠️ P0 |
| port_health | `scoping.py:106-113` | `resolve_user_port_ids` (wrapper) | SECTOR, POINT, PORT (+ STATE) | ✅ wrapper delegates to resolver | ✅ |
| port_health | `views.py:308,326` | `CompanyPortScopedMixin` | PORT/COMPANY (assertion via `asserts_geographic_scope`) | 🔴 `asserts_geographic_scope` does **not** include STATE → `has_port_scope=False`; no COMPANY scope either → qs.none() silently for STATE-only users | 🔴 P0 |
| shipping | `views.py:16,337,472,705` | `CompanyPortScopedMixin` | PORT/COMPANY | 🔴 same gap — STATE-only users see nothing | 🔴 P0 |
| it_management | `views.py:65,83,90,97,110,121,131,158,173,186,212` | `ItSectorScopedMixin` + `resolve_user_sector` | SECTOR only | 🔴 STATE → `resolve_user_sector(user)` = None → `qs.none()`; `perform_create` raises PermissionDenied (good) but readers see zero rows | 🔴 P1 |
| hr | `scoping.py:36-66` | `SCOPE_LOOKUPS` (manual scope_type → OrgAssignment paths) | SECTOR, REGION, DEPARTMENT, STATION, POINT, PORT | 🔴 no `STATE` entry → STATE-only HR user gets `keys=∅` → `visible=∅` → `qs.none()` silently | 🔴 P0 |
| hr | `scoping.py:184-217` | `HRScopedMixin.get_queryset` | same | 🔴 same — fail-closed but zero visibility | 🔴 P0 |
| vector_control | `views.py:14,224-975` (13 sites) | `SectorScopedMixin` (`sector`?) | SECTOR, POINT, PORT (+ STATE via resolver) | ✅ if `SectorScopedMixin` used — but many are `SectorFieldScopedMixin`, see below | ✅/🔴 |
| vector_control | `views.py:224,244,484...` | `SectorFieldScopedMixin` | SECTOR only | 🔴 STATE → `resolve_user_sectors(user)=[]` → deny-all (silent) | 🔴 P1 |
| laboratory | `views.py:126,1290-1293` | `resolve_user_sectors` + `has_global_scope` | SECTOR only | 🔴 STATE → `qs.none()` (silent deny-all) | 🔴 P1 |
| laboratory | `views.py:199,729,1050-1260` (12 sites) | `SectorFieldScopedMixin` | SECTOR only | 🔴 same | 🔴 P1 |
| carriers | `views.py:1424,1431` | `resolve_user_port_ids` | SECTOR, POINT, PORT (+ STATE) | ✅ via resolver; COMPANY dimension unaffected | ✅ |
| cms | `views.py:12,104,135,140,171,204,412,443` | `resolve_user_sector` | SECTOR only | 🔴 STATE → deny-all silent (display/admin pages) | 🟡 P2 |
| organization | `views.py:74,311,389` | `active_scopes` manual (`OrgScopedMixin`) | self.scope_type only | 🔴 STATE matches nothing → deny-all silent (reference data) | 🟡 P2 |
| accounts | `serializers.py:328` | `resolve_user_sectors` (display) | SECTOR/REGION | ⚪ resolve for display; returns `[]` for STATE-only → `sector_codes=[]` in profile (false-negative UI badge, no leak) | ⚪ P3 |
| registry | `views.py:106,111,251-693,882` | `resolve_authorized_entry_points`, `_visible_reporting_node_ids` | resolver-supported | ✅ M4 work — tested (M5 not needed here) | ✅ |
| utils | `scoping.py:352-368` | `asserts_geographic_scope` | SECTOR, REGION, POINT, PORT, DEPARTMENT, STATION | **STATE excluded** — root cause for both `CompanyPortScopedMixin` P0 issues | 🔴 P0 (M5-A-3 candidate) |
| utils | `scoping.py:296-328` | `resolve_authorized_entry_points` | incl. STATE | ✅ M4-1 implementation | ✅ |

**Totals:** ~140 references, 18 applications.

## 3. Root cause

`core/utils/scoping.py` supports STATE end-to-end **only when callers delegate**
(`resolve_authorized_entry_points` / `resolve_user_port_ids` wrappers mirroring it).
Every app that **manually parses** `active_scopes(…)` or calls
`resolve_user_sectors()` / `resolve_user_sector()` / consults
`SCOPE_LOOKUPS` behaves as follows for a STATE-only user:

- no entry in the manual scope-type map → empty set → **deny-all** (fail-safe,
  but the STATE user sees zero rows — not a leak).
- or wrong fallback (`user.sector` sector-first path) → **sector-wide grant**
  wider than intended (port_health worst case, ⚠️ row above).
- or null-dimension asserted/excluded (`asserts_geographic_scope`) → qs.none()
  silently (shipping, port_health CompanyPortScopedMixin).

No silent cross-scope **leak** found; the worst class is **deny-all**, the best
is **correct filtering**. One potential widening found (`port_health` ⚠️).

## 4. Priority targets (M5-A-2 focus)

| # | Apps | Why | Suspicion |
|---|---|---|---|
| P0-1 | **screening** | manual scope parsing, no STATE branch | silent deny-all |
| P0-2 | **port_health / shipping** | `CompanyPortScopedMixin` + `asserts_geographic_scope` miss STATE | deny-all **or sector-wide grant fallback** |
| P0-3 | **hr** | `SCOPE_LOOKUPS` has no `STATE` key | silent deny-all |
| P1 | **laboratory / vector_control / it_management** | `resolve_user_sectors` / `resolve_user_sector` no STATE | deny-all |
| P2 | **cms / organization** | sector-only copies of same helpers | deny-all (minor) |
| P3 | **accounts serializer** | display-only sector_codes | false-negative UI badge |

**Recommended test scope for M5-A-2:**

1. screening endpoint — SECTOR user regression + STATE fail-closed check.
2. port_health — STATE-only user expects `qs.none()` (no entry-points; no leak);
   plus **no fallback to `user.sector` if the user's scope is STATE**.
3. hr — STATE-only user expects `qs.none()` (pre-change) and, after fix, rows for
   OrgAssignments under that state.
4. laboratory — STATE-only user expects `qs.none()` (documents current behaviour).

## 5. Hypotheses (not verified — for M5-A-2)

- **H1 (port_health ⚠️):** with `scope_type`=STATE and `user.sector` set,
  `PortHealthScopedMixin` widens visibility to every entry point of that sector.
- **H2:** `asserts_geographic_scope` omits `STATE` → `CompanyPortScopedMixin` treats
  STATE users as unscoped → deny-all; company-scope users unaffected.
- **H3:** `screening` STATE user is deny-all today (would pass a "fail-closed"
  test but never functional data).
- **H4:** HR returns empty queryset for STATE users regardless of true OrgAssignment
  membership. `resolve_visible_employee_user_ids` is never called with `keys=∅`.
- **H5:** Laboratory and vector_control discard STATE and filter by SECTOR only
  (`SectorFieldScopedMixin`).
- **H6:** Vaccination + Surveillance + Borders are **correct** for STATE via the
  M4-1 resolver — but no automated test asserts this; verified only by code review.

## 6. Out of scope for this audit

- ❌ no production code edited.
- ❌ `scoping.py` untouched (M4-1 closed).
- ❌ tests are M5-A-2 — pending explicit approval after this report.
- ❌ M5-A-3 fixes will each need an explicit owner sign-off (`FIX-{n}`).

## 7. Deliverable sign-off

- [x] All call sites listed (~140, 18 apps).
- [x] Priority targets identified (P0/P1/P2/P3).
- [x] Hypotheses listed, none confirmed.
- [x] Zero production edits.

**Next gate:** M5-A-2 — integration tests (~40 tests, 4 apps + regression),
ready on explicit approval.

## 8. M5-A-2 — Empirical confirmation (2026-11-10)

Suite: `apps/registry/tests/test_m5_integration/` (40 tests, executed with
`pytest apps/registry/tests/test_m5_integration/ apps/registry/ apps/organization/ -q --reuse-db`).
**Results: 418 passed + 7 xfailed (expected-red); 0 production files changed.**

### Hypotheses — verdict

| # | Verdict | Evidence |
|---|---------|----------|
| **H1** (port_health `PortHealthScopedMixin` → sector-wide widening) | **REFUTED** | `resolve_user_sector()` (singular) reads only SECTOR *role assignments* and ignores `user.sector` entirely; STATE-only users fall through to fail-closed `qs.none()`. Test `test_state_widening_h1.py::test_state_user_with_sector_does_not_widen_to_that_sector` passes and pins the invariant. |
| **H1′** (home-sector visibility leak outside user's STATE — home-sector) | **DOCUMENTED** | `resolve_user_sectors()` (plural, `SectorFieldScopedMixin`) DOES include `user.sector_id` by design; a STATE user with `user.sector=B` sees sector-B lab samples. Tests `test_state_widening_h1.py::test_state_user_sees_home_sector_sample_not_third_sector` pin: home-sector rows visible, unrelated sector rows never visible. No cross-scope leak found. |
| **H2** (`asserts_geographic_scope` omits STATE → deny-all in shipping + port_health) | **CONFIRMED** | Red tests (`test_port_health_h2.py::test_state_user_sees_own_state_vessels`, `test_shipping_h2.py::test_state_user_sees_own_state_pre_arrivals`) xfail now; leak guards green. **FIX-1 candidate — M5-A-3.** |
| **H3** (screening silent deny-all) | **DOCUMENTED** | `test_screening_h3.py` — STATE user sees 0 screenings today; cross-scope leaks: none. Needs an explicit STATE branch (M5-A-3, only if owner approves — client-visible change). |
| **H4** (hr scope-lookup silent deny-all) | **DOCUMENTED** | HR `scope_type in ('SECTOR','REGION','DEPARTMENT','STATION','POINT','PORT')` — masterdata `State` never matches; `OrgAssignment` has no state FK. `test_hr_h4.py`. **Not fixable without a schema/product decision — deferred to known-debt.** |
| **H5** (laboratory / vector_control — no STATE branch) | **CONFIRMED (partial)** | `SectorFieldScopedMixin` silently denies STATE data; `SectorScopedMixin` (`VectorSiteViewSet`) is STATE-aware via the resolver since M4-1 (verified green). Red tests xfail (`test_laboratory_h5.py`, `test_vector_control_h5.py::test_state_user_sees_own_state_vector_unit`). |
| **H6** (surveillance / vaccination / borders_health via resolver) | **CONFIRMED POSITIVE** | All three stay green; empty-world = deny-all; unrelated-state data never leaks. |

### Fix candidates (to be signed off in M5-A-3 — DO NOT apply now)

- **FIX-1** — `core/utils/scoping.py::asserts_geographic_scope()` + STATE.
  Justified by failing (xfail) tests `test_port_health_h2.py::test_state_user_sees_own_state_vessels` and `test_shipping_h2.py::test_state_user_sees_own_state_pre_arrivals`. Minimal single-function change; regression tests already exist in the same files.
- **FIX-2** — If H1′ ever widens (e.g. user.sector leak), `SectorFieldScopedMixin` needs an `asserts_state_scope` gate mirroring `SectorScopedMixin`. Current invariants hold; no action now.
- **FIX-3 (deferred)** — H3 (screening) STATE branch — **not approved here**; requires explicit owner sign-off and product decision.
- **FIX-4 (deferred)** — H4 (hr) STATE resolution — requires schema decision (OrgAssignment.state or HR-specific STATE resolver). Out of scope.
- **FIX-5 (deferred)** — H5 breadth across laboratory/vector_control — requires the same P1/P2 state-decision pattern; do not implement under M5-A-3 without a dedicated plan.

### Baseline status

- `pytest apps/registry/ apps/organization/ -q --reuse-db` → **418 passed + 7 xfailed** (expected red, documented above).
- No production files changed. No migrations. No UI.

---

## §8 Amendment — M5-A-3

H2 (`asserts_geographic_scope` missing STATE) → ✅ **CLOSED** in FIX-1.

- `port_health` STATE-only users: unblocked (Vessel via `CompanyPortScopedMixin`).
- `shipping` STATE-only users: unblocked (PreArrivalNotificationViewSet).
- Business functionality restored: vessel visibility, pre-arrival visibility.
- Regression coverage: permanent SECTOR / GLOBAL / plain / boundary-id tests.

Remaining hypotheses (H3, H4, H5) → deferred to M5-B (product/schema decisions).
H1 REFUTED (fail-closed, permanent guard). FIX-1 regression: 0.
