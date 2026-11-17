# M7-A2c-1 Phase 0 — laboratory + vector_control Discovery

**Date:** 2026-11-15
**Decision:** Deliberate override of A2c Discovery (PR #198 recommendation to skip until Q7)
**Branch:** feat/organizational-registry-m7-a2c-1-discovery (from main@63f1aeb)
**Type:** Read-only audit — 0 code, 0 migrations, 0 tests

---

## Executive Summary

| Finding | Value |
|---|---|
| `LabSample.facility` FK | ✅ EXISTS (masterdata.HealthFacility, SET_NULL, null=True) |
| `VectorUnit.facility` FK | ✅ EXISTS (masterdata.HealthFacility, SET_NULL, null=True) |
| M6-bis backfill commands | ✅ EXISTS (backfill_labsample_facility, backfill_vectorunit_facility) |
| HealthFacilityNodeAssignment | ✅ EXISTS (apps/registry/models.py:261) |
| UI forms (frontend) | ❌ NONE for laboratory or vector_control |
| Audit tests affected | ✅ 0 |
| Dev rows | laboratory_labsample=0, vector_control_vectorunit=0 |
| Migration lock risk | ✅ LOW (0 rows, nullable ADD COLUMN = O(1)) |

**结论:** A2c-1 is **backend-only** (~6-7 days for 2 apps). No frontend Phase 2 (no UI forms exist).
**True measurement** still blocked on Q7 (prod backfill), same as A2b-full.

---

## Q1 — UI Forms (frontend)

| App | UI form exists? | Evidence | Impact |
|---|---|---|---|
| laboratory | ❌ No | `grep createLabSample/labsample/LabSample` in `src/pages/` + `src/api/` → 0 matches | Phase 2 frontend = 0 |
| vector_control | ❌ No | `grep createVectorUnit/vectorunit/VectorUnit` → 0 matches | Phase 2 frontend = 0 |

**Result:** No `createLabSample` / `createVectorUnit` forms. A2c-1 = **backend only**. No `RegistryTreeSelector` integration in forms (nothing to attach to).

---

## Q2 — Audit Tests Impact

| App | Audit tests found | Rewrite count |
|---|---|---|
| laboratory | 0 | 0 |
| vector_control | 0 | 0 |
| registry m5_integration | 0 (no lab/vector mentions) | 0 |

**Evidence:** `grep not_referenced_by\|has_no_registry\|no_registry` across `apps/laboratory/tests/`, `apps/vector_control/tests/`, `apps/registry/tests/test_m5_integration/` → none.

**Result:** No existing tests break when adding `reporting_node` FK. Unlike A2b-full (3 audit tests rewritten), A2c-1 needs **0 audit rewrites**.

---

## Q3 — M6-bis Facility FK Presence

| App | facility FK | FK target | null=True | SET_NULL | M6-bis help_text |
|---|---|---|---|---|---|
| laboratory (`LabSample`) | ✅ line 309 | masterdata.HealthFacility | ✅ | ✅ | "المنشأة المرتبطة بالعينة (M6-bis، D-M5-C-F-3)" |
| vector_control (`VectorUnit`) | ✅ line 127 | masterdata.HealthFacility | ✅ | ✅ | "المنشأة المرتبطة بالوحدة (M6-bis، D-M5-C-F-3)" |

**Result:** M6-bis facility FK applied to both models. **Single migration per app** (`reporting_node` FK only). No double migration needed.

---

## Q4 — Backfill Strategy

| Component | Status |
|---|---|
| Backfill command | ✅ EXISTS for both (`backfill_labsample_facility.py`, `backfill_vectorunit_facility.py`) |
| M6-bis backfill source | `entry_point` / `sector` → `HealthFacility` |
| `HealthFacilityNodeAssignment` | ✅ EXISTS (`apps/registry/models.py:261`, extends `_NodeAssignmentBase`) |
| Backfill pattern | `LabSample.facility → HealthFacilityNodeAssignment.filter(valid_to__isnull=True).first().node` |
| Fail-safe | ambiguous → NULL (same as surveillance A2b-full) |

**Result:** Backfill strategy mirrors surveillance exactly. `facility` is already populated (M6-bis), so `reporting_node` backfill is a direct derivation step.

---

## Q5 — Migration Lock Risk

| App | Table | Dev rows | Table size | Lock risk | Rollback |
|---|---|---|---|---|---|
| laboratory | laboratory_labsample | 0 | 128 kB | LOW | safe (DROP COLUMN) |
| vector_control | vector_control_vectorunit | 0 | 48 kB | LOW | safe (DROP COLUMN) |

**Evidence:** `pg_stat_user_tables` via `docker exec afyatna-db-dev psql -U afyatna -d afyatna` — both tables 0 rows.

**Result:** `ADD COLUMN reporting_node NULL` = O(1) in PostgreSQL 11+, no table rewrite, no lock risk. Safe even on larger prod tables.

---

## Feasibility Matrix (A2c-1)

| App | FK path | Dev rows | Routes | Audit tests | Migration | Phase |
|---|---|---|---|---|---|---|
| laboratory | D (facility → node) | 0 | 3 | 0 | low (1 FK) | A2c-1-1 |
| vector_control | D (facility → node) | 0 | 0 | 0 | low (1 FK) | A2c-1-1 |

---

## Recommended Phase Plan

### Phase A2c-1-1 — Backend (~3 days per app, ~6 days total)
Per app:
1. `reporting_node = FK(ReportingNode, null=True, blank=True, SET_NULL)` on model
2. Migration (AddField only, rollback verified)
3. Backfill command (`--dry-run / --limit`, ambiguous → NULL)
4. FK tests (8 per app, mirroring surveillance Phase 1)
5. by-state endpoint refactor (FK direct, 2 queries) + 3 by-state tests

### Phase A2c-1-2 — Frontend (~0 days)
**Skipped** — no UI forms exist for LabSample / VectorUnit creation. No `RegistryTreeSelector` integration.

### Phase A2c-1-3 — Docs (~1 day)
- `backend/docs/m7-a2c-1.md` (delivery report)
- ADR update
- PR #201

**Total estimate: ~7 days (not 2-3 weeks)** — because A2b-full was 7-8 days for ONE app with UI + audit rewrites; A2c-1 has no frontend and no audit rewrites.

---

## Open Questions (for owner)

1. Is backend-only acceptable (no frontend form integration)?
2. Should backfill run on staging immediately after merge, or wait for Q7 VPS session?
3. Accept fill-rate measurement deferred to Q7 (fixture-level testing only before Q7)?

---

## Next Step (pending owner approval of Phase 0)

- [ ] Approve Phase 0 findings
- [ ] Issue Phase 1 execution prompt (Backend, ~6 days)
- [ ] PR #200 (this doc) after approval

**No code. No migrations. No tests.** Report ready for review.
