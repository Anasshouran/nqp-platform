# M7-airport Discovery — airport_health Registry Feasibility

**Date:** 2026-11-15
**Discovery run:** read-only audit of airport_health app
**Reference:** A2c Discovery (PR #198) — 6-app audit did NOT cover airport_health
**Status:** READ-ONLY — 0 code, 0 migrations, 0 tests

---

## Executive Summary

| Finding | Value |
|---|---|
| airport_health models | AirportTerminal, ScreeningPoint, AirportScreening, AircraftInspection, CrewHealthRecord, AirportStaff, AirportActivityLog |
| `HealthFacility` FK | **None** — no model references masterdata.HealthFacility |
| `EntryPoint` FK | **None** — no model references masterdata.EntryPoint |
| Dev rows | **0** across all 7 models |
| by-state endpoint | **None** |
| Frontend UI | **None** |
| Audit tests affected | **0** |
| Pattern | screening-like (no facility FK) → **skip** |

**Recommendation: Skip airport_health** — same outcome as screening/vaccination in A2c Discovery (PR #198).

---

## Q1 — FK Design

| Model | facility FK | entry_point FK | sector FK | locality FK | OneToOne |
|---|---|---|---|---|---|
| AirportTerminal | ❌ | ❌ | ❌ | ❌ | ❌ |
| ScreeningPoint | ❌ | ❌ | ❌ | ❌ | ❌ |
| AirportScreening | ❌ | ❌ | ❌ | ❌ | ❌ |
| AircraftInspection | ❌ | ❌ | ❌ | ❌ | ❌ |
| CrewHealthRecord | ❌ | ❌ | ❌ | ❌ | ❌ |
| AirportStaff | ❌ | ❌ | ❌ | ❌ | ❌ |
| AirportActivityLog | ❌ | ❌ | ❌ | ❌ | ❌ |

**No airport_health model has a `masterdata.HealthFacility` FK or `masterdata.EntryPoint` FK.** The domain has no organizational registry linkage possible.

---

## Q2 — Dev Rows

| Model | Count |
|---|---|
| AirportTerminal | 0 |
| ScreeningPoint | 0 |
| AirportScreening | 0 |
| AircraftInspection | 0 |
| CrewHealthRecord | 0 |
| AirportStaff | 0 |
| AirportActivityLog | 0 |

**All 0** — consistent with every other app in A2c Discovery.

---

## Q3 — Existing Endpoints + UI

| Check | Result |
|---|---|
| by-state endpoint | ❌ None in `apps/borders_health/views.py` or `apps/airport_health/views.py` |
| Frontend UI | ❌ None in `frontend/src/pages/` or `frontend/src/api/endpoints/` |
| Routes | None referencing airport_health |

---

## Q4 — Audit Tests

| Check | Result |
|---|---|
| `not_referenced_by\|no_registry\|has_no_registry` in airport_health/tests/ | 0 |
| audit tests referencing airport_health | 0 |

**0 audit tests affected** — adding `reporting_node` FK to any airport_health model would not break any existing test.

---

## Q5 — Pattern Classification

| App | Pattern | Viable? |
|---|---|---|
| surveillance | `reporting_node` FK (A2b-full) | ✅ |
| laboratory/vector_control | `facility` FK → node (A2c-1) | ✅ |
| hr | `OrgAssignment.facility` FK → node (A2c-2-hr) | ✅ |
| borders_health | `entry_point` → STATE node (A2c-2-borders) | ✅ STATE-only |
| screening/vaccination | no facility FK | ❌ skip |
| **airport_health** | **no facility FK, no entry_point FK** | **❌ skip** |

**airport_health has no `health_facility` FK and no `entry_point` FK.** Neither surveillance-pattern (`facility → node`) nor borders-pattern (`entry_point → state`) can be applied.

---

## Q7 — Strategy Decision

| Option | Cost | Value | Recommendation |
|---|---|---|---|
| **Full** (`reporting_node` FK + by-state) | 4-6 days | 0 (no facility FK to derive from) | ❌ Skip |
| **STATE-only** (via entry_point) | 4 days | 0 (no entry_point FK either) | ❌ Skip |
| **Skip** | 0 | 0 | ✅ **Recommended** |

## Open Questions

1. None — all 7 airport_health models have no facility FK, no entry_point FK, 0 dev rows.

## Decision

**Skip airport_health.** Same outcome as screening/vaccination in A2c Discovery (PR #198). No code, no migrations, no tests needed.

---

## Related

- A2c Discovery: `backend/docs/m7-a2c-discovery.md` (PR #198) — original 6-app audit did NOT cover airport_health
- A2c-2-borders mapping: `backend/docs/m7-a2c-2-borders-mapping.md` (PR #203) — same conclusion (no data source)
