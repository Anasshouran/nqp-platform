# Registry — Architectural Decision Record

**Date:** 2026-11-13
**Status:** Accepted — Infrastructure for future adoption → **Phase 0 integration (A2b-lite) delivered, evidence pending (2026-11-14)**
**Supersedes:** None
**Related:** M1-M6-bis, M7-A2 audit

---

## Context

AFYATNA built a national organizational registry (M1-M6) covering:
- 11 scope types (GLOBAL → COMPANY)
- 3 dimensions (Reporting Line · Institutional Ownership · Technical Supervision)
- Complete UI (tree, facility detail, edit/create, pagination, scope pickers)
- Complete API (ReportingNode, assignments, StateMinistry, ownership, supervision, services)

Total investment: 21 PRs (#172-#192), 3829 tests (2984 backend + 845 frontend), 9 registry migrations.

---

## Decision

**The registry is complete and correct. It is not currently used by any business application.**

M7-A2 integration audit (2026-11-13) established this with evidence:
- **0/7 business apps** reference any registry model (surveillance, vaccination, borders_health, screening, hr, laboratory, vector_control)
- All 6 cross-app checks empty (serializers, Celery tasks, migrations, integration app, WHO app, model imports outside `apps/registry`)
- Integration score: **~4%**

**We accept this state without further investment.** No M7-A2b (deep integration), no M7-A2c (surface integration), no C1 (public API expansion for unused registry), no B2 (analytics on empty data).

> **Update 2026-11-14 — M7-A2b-lite (PR #195), owner decision.**
>
> The owner decided to proceed with a **narrow, reversible** integration despite no external
> product signal — a deliberate evidence-gathering investment rather than an assumption of demand.
>
> **Phase 0 delivered (A2b-lite):**
> - `GET /api/v1/surveillance/reports/by-state/` — aggregate cases by state via
>   `health_facility → HealthFacilityNodeAssignment (active) → ReportingNode → STATE ancestor`
> - Frontend: `/app/surveillance/reports/by-state` with a reconciliation bar
> - **0 migrations, 0 FK, 0 `save()` sync** — read-time traversal only, reversible by deleting one URL
> - Adoption metric: endpoint usage + page visits, to be measured in staging/prod **after Q7**
>
> **Phase 1-3 deferred (A2b-full):**
> - `reporting_node` FK on `HealthCase` — **only if Phase 0 proves value**; note it would break two
>   audit tests that assert the field's absence (`test_reporting_node_not_referenced_by_surveillance`,
>   `test_no_registry_node_path_aggregation_endpoint`) — they must be superseded, not silently dropped
> - `<RegistryTreeSelector />` — only if Phase 0 proves value
> - `save()` sync — **never as designed**; assignment change/delete would rewrite or erase case history
>
> **Status:** A2b-lite = deliberate investment, evidence pending.
> Evidence and deviations: `backend/docs/m7-a2b-lite.md`.

---

## Rationale

### Why not retrofit integration

Building adoption features (`reporting_node` FKs in apps, tree pickers, aggregate endpoints) before any product signal is building for no users. This pattern was tested during M7 planning and rejected.

### Why the registry is still valuable

The registry is **infrastructure**, not a product. It is complete and ready:
- All scope types work
- All tests pass
- `PROD_SCOPING_ENABLED=False` gate is intact (safe, fail-closed)
- CI guard prevents silent test failures (from M5-D-ب)

When an organizational adoption signal arrives (MOH, States, WHO), the foundation is ready. The alternative — waiting for the signal before building — would have taken the same time once started, with no foundation in place.

### Why this is a bet, not a failure

Infrastructure without an adoption signal is a **bet on future use**. The bet is reasonable for a national registry because:
1. National scale requires upfront scope (can't add 11 scope types incrementally)
2. MOH/States/WHO adoption is organizational, not technical
3. The registry is small, isolated, and doesn't interfere with existing apps

---

## Adoption Path (when signal arrives)

1. **Q7** — staging/prod pre-backfill counts → backfill → `PROD_SCOPING_ENABLED=True`
2. **Integration** — Choose one based on signal type:
   - **M7-A2b** (deep): `reporting_node` FK in target apps + `<RegistryTreeSelector />` + `/api/v1/reports/by-state/`
   - **C1** (external): public read-only API for MOH/WHO
3. **Data** — A3: real MOH/state/facility data (requires official sources)

---

## Current State

| Metric | Value |
|---|---|
| PRs merged | 21 (#172-#192) |
| Backend tests | 2984 + 0 xfail + 2 skip |
| Frontend tests | 845 (CI-protected, guard live) |
| Registry migrations | 9 |
| Integration score | ~4% |
| `PROD_SCOPING_ENABLED` | False (gate intact) |
| Last tag | `v1.0.0-m6-bis` on `753e676` (merge #190) |
| Current main | `a1b98b5` |

### Blocked Gate

**Q7** (`D-M5-C-ACT-1`): staging/prod pre-backfill counts. Requires VPS session — no network path from development environment. Ready-to-run command documented in `backend/docs/m5-c-known-debt.md`.

---

## Lessons

1. **Infrastructure without adoption signal is a bet.** Built deliberately, not accidentally.
2. **Not all bets win.** This one may or may not — depends on organizational adoption.
3. **Registry is complete and correct.** No technical debt. No bug. No half-implementation.
4. **Adoption is organizational, not technical.** No amount of engineering can substitute for an MOH/State decision to use hierarchical organizational data.

---

## References

- `backend/docs/m7-a2-integration-audit.md` — audit evidence
- `backend/docs/m7-a2b-lite.md` — Phase 0 delivery, deviations, reconciliation proof
- `backend/docs/m7-a2b-discovery.md` — integration discovery (Q1-Q6) + errata
- `backend/docs/m5-c-known-debt.md` — Q7 command, debt register
- `backend/docs/m6-bis.md` — facility FKs
- `backend/docs/git-safety.md` — process safety
- `backend/docs/m5-a-audit.md` — scoping audit

---

## Update 2026-11-14 (A2b-full, PR #196)

**Owner decision:** Proceed with A2b-full after A2b-lite Phase 0 demonstrated value (endpoint works, reconciliation correct, no production code impact).

### Phase 1-3 Delivered

- `HealthCase.reporting_node` FK (nullable, SET_NULL, no save sync)
- Migration `surveillance/0003` (AddField only, rollback verified)
- Backfill command (`--dry-run / --limit`, ambiguous → NULL fail-safe)
- `RegistryTreeSelector` component
- `SurveillanceModulePage.tsx` line ~820 uses tree picker
- `by-state` endpoint refactored to FK direct (2 queries)
- 3 audit tests rewritten (with historical comments)
- 8 FK tests + 3 by-state tests + 5 selector tests + 2 page tests

### Design Decisions

- **Snapshot semantics:** `HealthCase.reporting_node` does not sync with assignment changes — preserves historical integrity
- **Pilot scope:** surveillance only; 6 other apps pending product signal
- **line ~901 not touched:** report form's facility field remains flat `FormSelect` (Phase 2b deferred)
- **No production activation:** `PROD_SCOPING_ENABLED=False` unchanged; backfill in prod requires Q7

### Adoption Metrics (TBD after Q7)

- `HealthCase.reporting_node` fill rate (% of cases with FK set)
- by-state endpoint usage (requests per week from MOH / State surveillance)
- `<RegistryTreeSelector />` usage in create form (all new cases)

### Status

**M7-A2b-full: DELIVERED.** Integration is now real (not just infrastructure).
- Backend: 3012 + 0 xfail + 3 skip
- Frontend: 855
- 0 migrations on other tables
- `PROD_SCOPING_ENABLED=False`

**Blocked gate:** Q7 — staging/prod backfill + activation remains blocked on VPS access.

**Next decision:** Evaluate adoption metrics after Q7. If positive → consider expanding to other apps (Phase 1-3 pattern). If not → this pilot remains a single-app integration; ADR §Lessons applies.
