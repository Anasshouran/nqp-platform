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

---

## Update 2026-11-14 (A2c Discovery, PR #198)

**Owner decision:** Defer A2c (6-app expansion) until Q7 shows surveillance adoption signal.

### A2c Discovery — Read-Only Audit of 6 Apps

- `laboratory`, `vector_control`, `hr`, `borders_health`, `screening`, `vaccination`
- **Result: all 6 have 0 dev rows** — no adoption signal in dev environment
- `surveillance` (baseline): 50 dev rows (A2b-full pilot)
- Audit tests affected: **0** across all 6 apps

### Recommendation

**Skip A2c entirely until Q7.** The decisive criterion (dev rows > 0 AND frontend routes > 0) is not met by any of the 6 apps.
- `laboratory` + `vector_control`: viable FK path (M6-bis `facility`) but 0 dev rows → defer
- `hr` + `borders_health`: design needed (entry_point only / complex model) + 0 dev rows → defer
- `screening` + `vaccination`: incompatible / low value + 0 dev rows → skip

Full status: `docs/architecture-status.md`.

### Status

**M7-A2c: CLOSED (deferred pending Q7).** No further A2c investment without a surveillance adoption signal.

---

## Update 2026-11-15 (A2c-1, PR #201)

**Owner decision:** Extend registry integration to laboratory + vector_control (deliberate override of A2c Discovery skip recommendation).

### Delivered

- `LabSample.reporting_node` FK (nullable, SET_NULL, no save sync)
- `VectorUnit.reporting_node` FK (nullable, SET_NULL, no save sync)
- 2 migrations (AddField only, rollback verified)
- Serializers: `reporting_node` in List + Write (E3 fix)
- 2 backfill commands (`--dry-run`, `--limit`, ambiguous → NULL)
- `GET /api/v1/laboratory/reports/by-state/` + `GET /api/v1/vector-control/reports/by-state/`
- Reconciliation: `total == matched + node_no_state + unassigned_facility + unassigned_node`
- 26 new tests (20 FK/backfill + 6 endpoint)

### Adoption Measurement

Deferred to Q7 — both apps have 0 dev rows, no UI forms, no usage signal.

### Value

0 until Q7 shows demand. Rollback safe (DROP COLUMN on both migrations).

---

## Update 2026-11-15 (A2c-2-hr, PR #202)

**Owner decision:** Extend registry integration to hr (laboratory + vector_control done in PR #201).

### Delivered

- `OrgAssignment.reporting_node` FK (nullable, SET_NULL, no save sync) — facility FK already existed (M6-bis, D-M5-C-F-1)
- Migration `organization/0011` (AddField only, rollback verified)
- Serializer: `reporting_node` in List + Write
- Backfill command (`--dry-run / --limit`, ambiguous → NULL fail-safe)
- `GET /api/v1/hr/reports/assignments-by-state/` — reconciliation + scoping + select_related
- 14 new tests (10 FK/backfill + 4 endpoint)

### Adoption Measurement

Deferred to Q7 — OrgAssignment has 0 dev rows, no UI forms, no usage signal.

### Value

0 until Q7 shows demand. Rollback safe (DROP COLUMN).

---

## Update 2026-11-15 (A2c-2-borders Option 2, PR #203)

**Owner decision:** Extend registry integration to borders_health via STATE-only derivation.

### Delivered

- `QuarantineCase.reporting_node` FK (nullable, SET_NULL, no save sync)
- Migration `borders_health/0008` (AddField only, rollback verified)
- Serializer: `reporting_node` in List + Write
- Backfill command: `crossing.entry_point.state_id → StateNodeAssignment → STATE node`
- `GET /api/v1/borders-health/reports/quarantine-cases/by-state/` — reconciliation + scoping + select_related
- 14 new tests (10 FK/backfill + 4 endpoint)

### Limitation — STATE-only

`QuarantineCase.reporting_node` = STATE node فقط.
- لا LOCALITY/FACILITY — لا يوجد `HealthFacility` FK على `BorderCrossing`/`QuarantineCase`
- Phase 0 (PR #203) أثبت: `BorderFacility.health_facility` غير موجود، لا مصدر بيانات للربط
- Option 4-full = 9-10 أيام بلا قيمة بدون مصدر بيانات خارجي

### Value

تقرير "كم حالة حجر في ولاية X" — فعال فوراً عند توفر بيانات.

### Rollback

Safe (DROP COLUMN on migration 0008).

---

## Update 2026-11-16 (A2c-2-airport Scope A, PR #206)

**Discovery correction:** PR #205 (closed) claimed `airport_health` had no FK to any geographic
entity. Wrong: `AirportTerminal.port = FK('masterdata.EntryPoint')` — the field is named `port`
and uses a string reference, so a name-targeted grep missed it. A2c-2-airport was therefore
un-skipped and implemented as STATE-only.

### Delivered

- `AirportScreening.reporting_node` FK (nullable, `SET_NULL`, no save sync)
- Migration `airport_health/0008` (AddField only, rollback verified)
- Serializer: `reporting_node` writable in `AirportScreeningSerializer`
- Backfill: `screening_point.terminal.port.state_id → StateNodeAssignment(is_primary=True, valid_to=NULL) → STATE node`
  - **Policy (ii) strict:** `count == 1` else NULL (no `.first()` on ambiguous)
- `GET /api/v1/airport/reports/screenings/by-state/` — reconciliation + scoping + `select_related`
- Scoping: `resolve_user_port_ids` (airport convention, not `resolve_authorized_entry_points` directly)
- 15 new tests (10 FK/backfill + 5 endpoint)

### Limitation — STATE-only

- No LOCALITY (chain ends at `EntryPoint.state`)
- No FACILITY (`airport_health` has no `HealthFacility` FK)

### Scope B/C deferred

`AircraftInspection` and `CrewHealthRecord` can derive via `flight.destination_port` (2-level chain)
— deferred (Scope B). `AirportStaff` / `AirportActivityLog` rejected (Scope C).

### Policy delta (`D-M7-A2c-2-policy-delta`)

airport uses strict `count == 1`; borders (PR #203) uses `.first()` on `valid_to IS NULL`.
Backport to borders is out of scope pending explicit owner instruction.

### Value

STATE-level report available immediately on data availability.

### Rollback

Safe (DROP COLUMN on migration 0008).

---

## Update 2026-11-16 (A2c-3-screening, A2b-full, PR #208)

**Owner decision:** implement screening now despite 0 dev rows (deliberate override of the
Discovery (PR #207) defer recommendation). Documented risk: 4–5 days, 0 measured value
pre-Q7, rollback via DROP COLUMN.

### Delivered

- `HealthScreening.reporting_node` FK (nullable, `SET_NULL`, no save sync)
- Migration `screening/0004` (AddField only, rollback `migrate screening 0003`)
- Serializer: `reporting_node` writable (model `facility` FK untouched, not exposed)
- Backfill: `facility → HealthFacilityNodeAssignment(valid_to=NULL) → node`
  - **Policy (ii) strict:** `count == 1` else NULL (no `.first()` on ambiguous)
  - **No `port` fallback** — `facility=NULL` stays NULL (A2b-full parity with surveillance)
- `GET /api/v1/screening/reports/screenings/by-state/` — FACILITY-level `reporting_node`
  walked up to STATE in memory (`_node_map` + `_state_ancestor`, no N+1)
- Scoping: `resolve_authorized_entry_points` → `port_id__in`
- 3 buckets: `matched` / `node_no_state` / `unassigned_node` (reconciliation assert)
- 15 new tests (10 FK/backfill + 5 endpoint)

### Correction of A2c Discovery wording

`m7-a2c-discovery.md` said "screening, vaccination (no geographic FK)" in the closure
summary. That was imprecise: `HealthScreening.facility` has existed since M6-bis
(`0003_healthscreening_facility`). "no facility FK" applied to **vaccination only**.
The original skip rationale was 0 dev rows + Q7, not a missing FK.

### Value / risk

Report available immediately on data availability. Pre-Q7 there is no adoption signal;
if Q7 shows no usage, the code is dormant and rollback is safe.

---

## A2c closure (2026-11-16)

**7 apps integrated:** surveillance (A2b-full), laboratory, vector_control (A2c-1),
hr (A2c-2-hr), borders_health (A2c-2-borders, STATE-only), airport_health
(A2c-2-airport, STATE-only), screening (A2c-3-screening, A2b-full).

**Deferred / skipped:** vaccination (STATE-only design ready, deferred until Q7),
borders-full (no data source).


**Q7 remains the only gate:** staging/prod backfill (4 facility FKs + 4 `reporting_node`
backfills) then `PROD_SCOPING_ENABLED=True`, staging → prod.



