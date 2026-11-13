# Registry — Architectural Decision Record

**Date:** 2026-11-13
**Status:** Accepted — Infrastructure for future adoption
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
- `backend/docs/m5-c-known-debt.md` — Q7 command, debt register
- `backend/docs/m6-bis.md` — facility FKs
- `backend/docs/git-safety.md` — process safety
- `backend/docs/m5-a-audit.md` — scoping audit
