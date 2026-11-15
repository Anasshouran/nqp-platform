# AFYATNA — Architecture Status

**Last updated:** 2026-11-14
**Milestone:** v1.0.0-m6-bis (tag `753e676`) + M7 extensions
**Main:** `a2a9bcc` (#198)

---

## 1. What is AFYATNA

National health platform for Sudan — organizational registry, surveillance, vaccination, borders health, quarantine, HR, laboratory, vector control. Bilingual (Arabic primary / English). Timezone: Africa/Khartoum.

**Stack:** React 19 + TypeScript 5.5 + Vite 5 + MUI + Tailwind + Django 5.2 + DRF + PostgreSQL 16 + Docker Compose.

**Domain:** `nqp.gov.sd`

---

## 2. What Was Built (M1 → M7)

### M1: Organizational Registry Foundation
- `ReportingNode` tree: FEDERAL → STATE → LOCALITY → FACILITY → DEPARTMENT → SERVICE
- 4 node assignment tables (temporal, `valid_from`/`valid_to`)
- `StateMinistry`, `RegistryChangeLog`
- Single-root constraint at DB level (`NULLS NOT DISTINCT`)
- 21 tests

### M2: API Layer
- 7 ViewSets (nodes, ministries, assignments, changelog, dashboard)
- Signals auto-log CREATE/UPDATE/DELETE
- Frontend stubs (types + API client with envelope unwrap)
- 29 tests

### M3: Dimensions + ServiceRegistry
- `FacilityOwner` + `FacilityOwnership` (Institutional Ownership)
- `TechnicalSupervisor` + `TechnicalSupervision` (Technical Supervision)
- `Service` + `ServiceAvailability` (M2M via FACILITY or DEPARTMENT)
- `DepartmentNodeAssignment`
- 100+ tests (M3-1 → M3-6)

### M4: STATE Scope + Registry UI
- `ScopeType.STATE` (regional admin scope)
- Registry tree page + facility detail (6 tabs) + edit/create nodes
- Scope pickers (RoleAssignmentFormDialog)
- 100+ tests (M4-1 → M4-4-C)

### M5: Integration + Quality
- H1-H6 audit across 11 apps (144 scoping call sites)
- `ScopeType.LOCALITY` + `ScopeType.FACILITY`
- Vitest (frontend 857 tests) — CI guard added
- Pagination (4 facility tabs)
- git-safety.md (post-incident)

### M6: `Sector.state_ids` + Facility FKs
- `Sector.state_ids` M2M → closes D-M5-B-1 (VectorUnit)
- Facility FKs on `OrgAssignment`, `HealthScreening`, `LabSample`, `VectorUnit` → closes D-M5-C-F-1/2/3
- Conservative backfill (ambiguous → NULL)
- 8 migrations

### M7: Registry Adoption (pilot)
- **M7-A2:** Integration audit → 4% adoption (0/7 apps)
- **M7-A2b-lite:** `GET /surveillance/reports/by-state/` (traversal, PR #195)
- **M7-A2b-full:** `HealthCase.reporting_node` FK + `RegistryTreeSelector` (both case + report forms, PR #196)
- **M7-A2c Discovery:** 6-app audit → 0 dev rows → **deferred until Q7** (PR #198)

---

## 3. Scope Stack (Complete)

| Scope | Level | Status |
|---|---|---|
| GLOBAL | Superuser | ✅ |
| STATE | Regional | ✅ (M4-1) |
| LOCALITY | District | ✅ (M5-C-L) |
| FACILITY | Health facility | ✅ (M5-C-F) |
| SECTOR | Admin sector | ✅ (pre-M1) |
| REGION | Alias for SECTOR | ✅ |
| DEPARTMENT | Org unit | ✅ |
| STATION | Field station | ✅ |
| POINT | Entry point | ✅ |
| PORT | Seaport/airport | ✅ |
| COMPANY | Private company | ✅ |

**Enforcement:** `core/utils/scoping.py` → `resolve_authorized_entry_points()`. Fail-safe by default (`qs.none()` if no scope).

---

## 4. Three Dimensions (ADR-05)

| Dimension | Model | Status |
|---|---|---|
| Reporting Line | `ReportingNode` (tree) | ✅ |
| Institutional Ownership | `FacilityOwner` + `FacilityOwnership` | ✅ |
| Technical Supervision | `TechnicalSupervisor` + `TechnicalSupervision` | ✅ |

**Why separated:** A hospital can be federally owned, state-managed, and UN-supervised — three different entities. ADR-05 documents this.

---

## 5. Registry UI

| Page | Route | Status |
|---|---|---|
| Tree | `/app/registry/tree` | ✅ |
| Facility Detail | `/app/registry/facility/:id` | ✅ |
| Reports by State | `/app/surveillance/reports/by-state` | ✅ (A2b-lite) |

**Components:**
- `RegistryTreePage` (virtual root banner for scoped users)
- `RegistryNodeTree` (recursive, clickable FACILITY nodes)
- `RegistryRootPicker` (MUI Select)
- `RegistryTreeSelector` (Autocomplete + flat tree, used in surveillance case + report forms)
- `FacilityDetailPage` (6 tabs: Overview, Ownership, Supervision, Services, Departments, Tree Position)

---

## 6. What Works

✅ 11 scopes enforced across 11 apps
✅ Registry UI (tree, detail, edit/create, pagination, scope pickers)
✅ Backend 3012 + 0 xfail + 3 skip; Frontend 857 passed (total 3869)
✅ CI guard prevents silent test failures
✅ git-safety.md (post-incident)
✅ Conservative backfill (ambiguous → NULL, fail-safe)

---

## 7. What Does NOT Work

### Q7 — Production Activation (BLOCKED)
- `PROD_SCOPING_ENABLED=False` (gate intact, settings.py:35)
- Staging/prod pre-backfill counts require VPS session
- Command ready (documented in `backend/docs/m5-c-known-debt.md`)

### A2c — 6-App Expansion (DEFERRED)
- All 6 apps: 0 dev rows
- No adoption signal → skip until Q7 shows surveillance usage
- See `backend/docs/m7-a2c-discovery.md`

### Registry Adoption (4%)
- Pre-A2b-full: 0/7 business apps reference any registry model
- After A2b-full: surveillance uses `reporting_node` (pilot)
- **Adoption is organizational, not technical**

---

## 8. Known Debt (Open)

| Debt | Priority | Status |
|---|---|---|
| D-M5-C-ACT-1 (Q7 counts) | 🔴 | Blocked — VPS |
| D-M5-C-F-4 (port_health FACILITY hybrid UX) | 🟡 | Deferred M7+ |
| M5-D-ج-2b (functional coverage) | 🟡 | Deferred M7+ |
| M5-D-ج-3 (Playwright e2e) | 🟡 | Deferred M7+ |
| D-M5-C-L-FE-1 (LOCALITY picker UX) | 🟡 | Deferred M7+ |

**No security debts. No functional debts except Q7.**

---

## 9. How to Make a Decision

### "Should we add a new scope?"
1. Read `backend/docs/m5-a-audit.md` (H1′ policy, scoping architecture)
2. Read `backend/docs/m7-a2c-discovery.md` (feasibility for other apps)
3. Check ADR §Q8 (domain separation)
4. Verify: does it need a new ScopeType? Or reuse an existing one?
5. Fail-safe by default: `qs.none()` for unhandled scope types

### "Should we integrate app X?"
1. Check `backend/docs/m7-a2c-discovery.md` — feasibility matrix
2. Check Q7 — is there prod data?
3. Check dev rows: `SELECT COUNT(*) FROM <table>`
4. If dev rows = 0 AND no product signal → **skip**

### "How do we activate prod?"
1. Run Q7 counts on staging
2. Run backfill `--dry-run` on staging
3. Review counts
4. Set `PROD_SCOPING_ENABLED=True` in staging
5. Verify STATE/SECTOR/FACILITY users see expected reports
6. Repeat on prod

---

## 10. Documentation Index

### Core Architecture
- `docs/registry-architectural-decision.md` — ADR (updated 2026-11-14)
- `docs/git-safety.md` — Git safety rules

### Debt Registers
- `backend/docs/m5-c-known-debt.md` — M5-C debts (most recent)
- `backend/docs/m5-d-followup.md` — M5-D follow-ups
- `backend/docs/m1-known-debt.md` → `m5-b-closure.md` — historical

### Milestone Reports
- `backend/docs/m5-a-audit.md` — scoping audit (H1-H6)
- `backend/docs/m6-bis.md` — facility FKs
- `backend/docs/m7-a2-integration-audit.md` — 4% adoption finding
- `backend/docs/m7-a2b-lite.md` — by-state endpoint
- `backend/docs/m7-a2b-full.md` — FK + tree picker
- `backend/docs/m7-a2c-discovery.md` — 6-app audit

---

## 11. Current State (One-Pager)

```
Main:                a2a9bcc (#198)
PRs:                 26 (#172–#198)
Backend:             3012 + 0xf + 3skip
Frontend:            857
Tags:                v1.0.0-m6-bis (753e676)
PROD_SCOPING_ENABLED: False

STATUS: Production-ready (prod gate closed pending Q7)
        Registry complete; adoption is organizational
        Nothing to execute except Q7
```
