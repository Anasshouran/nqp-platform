# M7-A2b-full — HealthCase.reporting_node FK + RegistryTreeSelector

**Status:** ✅ Delivered (Phase 1 + 2 + 3)
**PR:** #196
**Baseline:** Backend 3012 + 0 xfail + 3 skip · Frontend 855

---

## What Was Delivered

### Backend (Phase 1)

**FK:** `HealthCase.reporting_node = FK(registry.ReportingNode, null=True, blank=True, SET_NULL)`

**Migration:** `surveillance/0003_healthcase_reporting_node` — AddField only. Rollback verified (`migrate 0003` ↔ `migrate 0002`).

**Serializer:** `HealthCaseWrite.reporting_node` (optional, nullable) + List (read-only, `reporting_node` included).

**Backfill command:** `backfill_healthcase_reporting_node --dry-run / --limit`
- `count == 1` active assignment → fill
- `count == 0` → NULL
- `count > 1` → NULL + ambiguous count (fail-safe)

**by-state endpoint:** refactored from traversal to FK direct (2 queries: cases + tree map).

### Frontend (Phase 2)

**`RegistryTreeSelector`** (`frontend/src/components/registry/`):
- MUI Autocomplete + flattened tree rendering (indentation by depth)
- Filter by `kind` (default: `['FACILITY']`)
- Search on `code` + `name_ar` + `name_en`
- Returns `SelectedNode { nodeId, facilityId, code, nameAr, path (breadcrumb), kind }`

**`SurveillanceModulePage.tsx` line ~820 only:**
- Replaced flat `FormSelect` with `<RegistryTreeSelector />`
- Payload: `health_facility = node.facilityId` + `reporting_node = node.nodeId`
- `line ~901` (report form) **NOT touched** (Phase 2b, deferred)

**i18n:** `registry.selector.*` (ar/en, 6 keys each)

---

## Design Decisions

### No save() sync

`HealthCase.reporting_node` is a **snapshot** at creation time:
- Changes to `HealthFacilityNodeAssignment` **do NOT** propagate to existing `HealthCase.reporting_node`
- Rationale: historical integrity — "where was the case when it was recorded", not "where is it now"
- Consequence: `HealthCase.reporting_node` may become stale if the facility moves in the tree; that's accepted

### Backfill fail-safe (no random binding)

Multiple active assignments (rare but possible) → **`reporting_node = NULL`, not `.first()`**.
- Same pattern as M6-bis facility FKs
- Consequence: some cases may remain NULL in prod until assignments are cleaned

### Audit tests rewritten (not deleted)

Three tests that documented "registry is isolated" were rewritten to "registry is integrated":
- `test_reporting_node_not_referenced_by_surveillance` → `test_reporting_node_is_referenced_by_surveillance`
- `test_no_registry_node_path_aggregation_endpoint` → `test_registry_aggregation_endpoint_exists`
- `test_health_case_has_no_registry_fk` → `test_health_case_references_reporting_node_only`

Each with historical comment: "Original (M7-A2): documented isolation. Rewritten (M7-A2b-full): documents integration."

### 27 existing tests unchanged

27 `HealthCase.objects.create(...)` calls exist across test suite. **All pass without modification** — `reporting_node` is nullable, defaults to NULL. No test touches the FK.

### RegistryTreeSelector — no `path` field in ReportingNodeTree

Discovery confirmed `ReportingNodeTree` has `id, kind, code, name_ar, name_en, depth, facility_id, children` — **no `path`**.
- `path` (breadcrumb) is computed during flatten (`ancestors.join(' / ')`)
- `facilityId` comes from `ReportingNodeTree.facility_id` directly (present in M4-3-bis)

---

## What's NOT in Phase 1-3

- **line ~901** (report form) — Phase 2b, separate small PR
- **6 other apps** (vaccination, borders_health, screening, hr, laboratory, vector_control) — surveillance as pilot; expansion pending product signal
- **Real-time sync** — not designed (snapshot semantics, see above)
- **Prod backfill** — requires Q7 (staging/prod access); command is ready with `--dry-run`
- **`<RegistryTreeSelector />` in other pages** — pilot scope only

---

## Rollback Plan

If Phase 1-3 needs to be reverted:

1. `git revert` merge commit (preserves history) — restores A2b-lite traversal implementation
2. Backend migration: `python manage.py migrate surveillance 0002` (drops the column — safe, no data loss on other columns)
3. Frontend: `RegistryTreeSelector` removed; `SurveillanceModulePage` reverts to flat `FormSelect`
4. `HealthCase` rows with `reporting_node` set → column dropped, no data loss elsewhere

**Rollback tested:** `migrate 0003 → 0002` verified locally (Phase 1).

---

## Evidence

**Backend:**
- `3001 → 3012 passed` (+11: 8 FK tests + 3 by-state tests)
- `0 xfail`, `3 skip` (unchanged)
- 27 existing `HealthCase.objects.create` calls unmodified
- 3 audit tests rewritten

**Frontend:**
- `848 → 855 passed` (+7: 5 selector + 2 page)
- `tsc 0`, `build 0`, `lint 0 errors`

**Dev fixtures (backfill):**
- `--dry-run` → `40 updated, 0 ambiguous, 5 unassigned`
- Actual → same result
- Endpoint: `total=50 = matched 40 + node_no_state 0 + unassigned_node 5 + unassigned_facility 5`
- `by_state`: KRT=28, RS=12 (sum=40=matched), reconciliation_ok=True

---

## Related

- ADR: `docs/registry-architectural-decision.md` (updated 2026-11-14)
- Phase 0 (A2b-lite): `backend/docs/m7-a2b-lite.md`
- Discovery: `backend/docs/m7-a2b-discovery.md`
- Scoping audit: `backend/docs/m5-a-audit.md`
- Facility FKs (M6-bis): `backend/docs/m6-bis.md`

---

## Deferred to Phase 2b

`line ~901` in `SurveillanceModulePage.tsx` — report form's `health_facility` field.
- Currently: flat `FormSelect` (same as line 820 was)
- Phase 2b: use `<RegistryTreeSelector />` for consistency
- Not in current scope: Phase 2b is UI-only, no backend changes, ~2-3 hours
