# M5-A Known Debt

> This file records debt discovered through M5-A-1 (audit) and confirmed through M5-A-2
> (integration tests). Every entry below is either **CONFIRMED** (fixed in M5-A-3 or
> pending product decision) or **DEFERRED** (out of scope for current work).
> No code change until FIX-{n} is approved via an owner sign-off + regression test.

---

## Summary of open items after M5-A-2

| # | Fix candidate | App | Scope type | Impact | Verdict | Next gate |
|---|---|---|---|---|---|---|
| FIX-1 | `asserts_geographic_scope()` miss STATE in `core/utils/scoping.py:352` | shipping, port_health | STATE | deny-all silent for STATE-only users (Vessel/Visit/PreArrivalViewsets); fix is one line, minimal | CONFIRMED by failing tests `test_port_health_h2` / `test_shipping_h2` | Owner sign-off on M5-A-3. Existing regression tests already assert deny-all. |
| FIX-2 | `SectorFieldScopedMixin` / `resolve_user_sectors` never read STATE for apps without state semantics | laboratory, vector_control | STATE | zero visibility (deny-all) for STATE-only users; no leak | CONFIRMED by failing tests `test_laboratory_h5` / `test_vector_control_h5` | Product decision required first: should a STATE user see lab samples collected in their STATE via OrgAssignment, or should STATE be silently scoped to the home organization sector? No code branch exists yet — do not add one until the decision is made. |
| FIX-3 | STATE branch for custom `active_scopes` parsing in `screening/views.py:80` | screening | STATE | silent deny-all | DOCUMENTED; needs policy decision whether STATE = "screen everyone in my state" or "deny" | Pending explicit approval. |
| FIX-4 | HR-specific STATE resolver | hr | STATE | HR users see no employees under their state, even when legitimately assigned | DEFFERRED — `OrgAssignment` has no `State` FK; requires schema/product decision | Out of scope for M5-A; wait for architecture. |
| FIX-5 | `resolve_user_sector()` family (laboratory, vector_control SectorFieldScopedMixin) broaden to STATE | laboratory, vector_control, cms, organization | STATE | same as FIX-2 | Same product decision pattern as FIX-2 (above) | Deferred. |

## Current risk posture (post-M5-A-2)

**Security:**
- ✅ `CompanyPortScopedMixin` — safe defaults (deny-all for unasserted / assertions-omit-STATE).
- ✅ No widening paths confirmed by automated tests.
- ✅ STATE works correctly via the M4-1 resolver in surveillance, vaccination, borders_health,
  food_quarantine, emergency_eoc, carriers, airport_health, and registry.
- ⚠️ **Pending:** FIX-1 closes the shipping/port_health business gap; once applied, the
  P0 promise ("STATE users see their own state data everywhere") is fully covered.

**Functional:**
- ⚠️ State/HR/screening UX is currently deny-all for STATE-only users (no functional data);
  fix expected but approved components are awaiting owner sign-off.

**No production file changed in this phase.** All debt is documented; no commits yet.

---

## FIX-1: asserts_geographic_scope missing STATE

**الحالة:** ✅ CLOSED (M5-A-3)
**الملف:** `backend/core/utils/scoping.py`
**السطر:** 365 (inline tuple in `scope_type__in=` filter inside `asserts_geographic_scope()`)
**التعديل:** أُضيف `'STATE'` إلى `('DEPARTMENT', 'STATION', 'STATE')` — لا تغيير في الثوابت الموسومة `SECTOR_LIKE_SCOPES` / `ENTRY_POINT_SCOPES`، لا formatting، لا comments.

**الاختبارات التي كانت xfail → pass:**
- `test_port_health_h2.py` (4/4)
- `test_shipping_h2.py` (3/3)

**Regression:** 0 — `SECTOR` / `POINT` / `GLOBAL` / `COMPANY` untouched.

**التاريخ:** 2026-11-10
