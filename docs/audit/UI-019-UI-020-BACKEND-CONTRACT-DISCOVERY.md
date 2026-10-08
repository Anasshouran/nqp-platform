# UI-019 + UI-020 — Backend Contract Discovery & Acceptance Audit

**Date:** 2026-10-08
**Mode:** DISCOVERY AND CONTRACT VALIDATION ONLY (read-only; no application code, schema, migration, API, permission, route, or UI changes)
**Scope:** UI-019 (Request / Operational Timeline) · UI-020 (Emergency / EOC Workflow)

---

## 1. Executive Summary

This phase audited the **actual backend contracts** for the two explicitly-deferred UI findings from Wave 2, without modifying any code.

**UI-019 (Shipment Timeline).** The backend already contains a canonical, immutable, chronologically-ordered timeline source: the `FoodShipmentEvent` model (`backend/apps/food_quarantine/models.py:211`) with a ready `FoodShipmentEventSerializer` (`backend/apps/food_quarantine/serializers.py:92`) and 10 workflow write-points via `_log_event()`. However, **no endpoint exposes these events**: the backend registers no `timeline` route and `grep timeline` across `apps/food_quarantine` returns zero matches. The frontend `RequestTimeline` component calls `GET /api/v1/food/shipments/{id}/timeline/`, which therefore returns 404 and silently renders the empty state. A canonical timeline **endpoint does not exist**; a small additive backend contract is required. **Recommendation: `ADD_BACKEND_CONTRACT`** (a single `timeline` action on the existing `ShipmentViewSet`, reusing the existing serializer and model).

**UI-020 (Emergency/EOC).** The `emergency_eoc` app (`/api/v1/emergency/`) is real and supports a truthfully-identifiable subset of the intended workflow. `Create` (POST `/emergency/alerts/`, requires `surveillance:add` = PoE Manager / Inspector) and `Resolve/Close` (POST `/emergency/alerts/{id}/close/`, requires `surveillance:edit`) are **directly implementable** by the frontend against existing endpoints. `ACKNOWLEDGE` is only **partially** represented — there is no dedicated ack action; a raw `PATCH /alerts/{id}/` can move `NEW → PROCESSING` (`surveillance:edit`) but with **no transition validation**. `ESCALATE` is **not established** in this app (an escalation contract exists only in the parallel `apps/surveillance` module for a different object type); it must not be invented. The frontend is 100% read-only today. **Recommendation: `IMPLEMENT_EXISTING_CONTRACT`** for the truthful scope (Create + Resolve/Close; optional acknowledge-as-`PROCESSING` via PATCH), with `ESCALATE` explicitly excluded.

**Decision outcome:** UI-019 requires a disciplined additive backend contract (no new deps, no schema change, reusable existing model/serializer). UI-020 can proceed frontend-first against the real lifecycle. No defect in either area is fixed in this phase — anything requiring implementation stops here for the next implementation phase.

---

## 2. Baseline Integrity

Confirmed — no accepted phase was reopened or modified during this audit:

| Accepted phase | Status | Evidence |
| --- | --- | --- |
| UI/UX Phase 1 — Discovery & Design Audit | Preserved | Read-only session |
| UI/UX Phase 2A — P1 Operational & Privacy Remediation | Preserved | Read-only session |
| Backend Verification Privacy Hardening | Preserved | Read-only session |
| UI/UX Phase 2B Wave 1 | Preserved | Read-only session |
| UI/UX Phase 2B Wave 2 (ACCEPTED WITH EXPLICIT DEFERRED ITEMS) | Preserved | Wave 2 findings untouched; only UI-019/UI-020 re-examined as required |
| M2-D2 Mobile Privacy Hardening | Preserved | No mobile/contracts/classification edits |

**Scope discipline:** only read commands were executed (`glob`, `grep`, `read`, `git status`). No source file, migration, schema, dependency, route, permission, or UI file was modified. The only artifact created is this report.

---

## 3. UI-019 Timeline Backend Inventory

| Component | Finding | Evidence | Status |
| --- | --- | --- | --- |
| `FoodShipmentEvent` model | Canonical, immutable timeline record; FK `shipment` (`related_name='events'`); 18 `Stage` choices (CREATED…REJECTED, CORRECTION, OTHER); `stage`, `message`, `actor` (FK User, SET_NULL), `occurred_at` (default now); `Meta.ordering = ['occurred_at', 'created_at']` | `backend/apps/food_quarantine/models.py:211-259` | **EXISTS** |
| `FoodShipmentEventSerializer` | Ready; fields `id, shipment, stage, stage_label (get_stage_display), message, actor, actor_name (actor.full_name), occurred_at`; all write paths read-only | `backend/apps/food_quarantine/serializers.py:92-102` | **EXISTS** |
| `_log_event()` write-point | Creates events; non-critical (`try/except pass`) | `backend/apps/food_quarantine/views.py:249-253` | **EXISTS** |
| Event write call sites | 10 workflow triggers: CREATED (360), SUBMITTED (362 submit=true, 428 submit action), REFERRED_TO_INSPECTOR (456 review, 666 assign), FEES_CONFIRMED (496), INSPECTION (540), SAMPLING (569), AWAITING_DECISION (580), DECISION (637), RELEASED (652) | `backend/apps/food_quarantine/views.py` | **EXISTS** |
| `timeline` URL/action | **MISSING** — `urls.py` registers only `shipments → ShipmentViewSet`; no `@action(url_path='timeline')`; `grep -rn timeline` over the app → 0 matches | `backend/apps/food_quarantine/urls.py:50`; `views.py` | **ABSENT** |
| `GET /api/v1/food/shipments/{id}/timeline/` | **404 today** (unregistered route) | DRF router (no such pattern) | **NOT A CONTRACT** |
| Generic audit trail `AuditLog` | General object audit (CREATE/UPDATE/DELETE/REVIEW/…), not a per-shipment stage timeline; exposed at `GET /api/v1/food/qa/audit-logs/` filterable by `object_type/object_id` | `models.py:2195-2233`; `serializers.py:1137-1147`; `views.py:2020-2022`; `urls.py:79` | Exists, **NOT canonical for timeline** |
| `ShipmentViewSet` permission context | `FoodPermissionMixin`: `permission_resource='food'`, `permission_classes=[PermissionAction, ScopeFilter]`; default action maps `view`/`add`/`edit`/`delete` | `backend/apps/food_quarantine/views.py:191-215, 256` | **APPLIES to any timeline action** |
| Frontend `getShipmentTimeline()` | calls `GET /food/shipments/${id}/timeline/` | `frontend/src/api/endpoints/food.ts:72-73` | Targets absent endpoint |
| Frontend `RequestTimeline` component | Renders vertical stepper; fetch `ShipmentDetailView.tsx:248`; refresh button; loading + empty states; **no error state** (catch → `[]`) | `frontend/src/pages/clerk/components/ShipmentDetailView.tsx:241-351` | Consumes absent contract |
| Frontend `FoodShipmentEvent` type | `id, shipment, stage, stage_label, message, actor, actor_name, occurred_at` — **exact match** to `FoodShipmentEventSerializer` | `frontend/src/types/food.ts:86-95` | Contract-aligned |

---

## 4. UI-019 Canonical Contract

**Does a canonical timeline endpoint exist?** **NO.**

- No route, no `@action`, no URL pattern anywhere in `apps/food_quarantine` exposes `FoodShipmentEvent`.
- The generic audit endpoint (`/api/v1/food/qa/audit-logs/`) is a *general* audit trail, not a per-shipment stage timeline; it does not satisfy the shipment timeline contract (different fields, different semantics, not per-shipment-scoped in a timeline shape).

**What backend source is canonical?**

- **`FoodShipmentEvent` is the canonical timeline source.** It is an immutable append-only event log (written via `_log_event()` only; no update/delete path), chronologically ordered by `(occurred_at, created_at)`, per-shipment via `shipment.events`.

**Is a new endpoint required?** **YES — a small additive one.**

- The frontend already encodes the target contract (`GET /api/v1/food/shipments/{id}/timeline/`) and the type exactly matches the existing serializer. Only the transport layer is missing.
- Required addition (next implementation phase, **not** performed here): a single detail action on `ShipmentViewSet`:
  - route: `GET /api/v1/food/shipments/{id}/timeline/`
  - permission: inherited `food:view` via `PermissionAction` + `ScopeFilter` (sector/port object scope)
  - queryset: `shipment.events.select_related('actor').order_by('occurred_at', 'created_at')`
  - serializer: existing `FoodShipmentEventSerializer(many=True)`
  - opaque envelope via `core.utils.response.success_response`

**What exact response contract should the frontend consume?**

```
{ status, data: FoodShipmentEvent[] }   // envelope renderer
FoodShipmentEvent = {
  id, shipment, stage, stage_label, message,
  actor: string|null, actor_name: string|null, occurred_at
}
```
Chronological ascending by `occurred_at` (ties broken by `created_at`). No pagination is required for a per-shipment timeline (one shipment → bounded event set); if pagination is later added it must use stable ordering on `(occurred_at, created_at, id)`.

---

## 5. UI-019 Security / Scope Analysis

| Concern | Analysis | Verdict |
| --- | --- | --- |
| Authentication | Required (DRF; `PermissionAction` denies anonymous) | Satisfied by inheritance |
| Authorization | Any `timeline` action inherits `PermissionAction` on resource `food`; action `view` (via `ACTION_TO_PERMISSION`) | Satisfied by inheritance |
| Object-level access | `ScopeFilter` enforces object access against resolved entry-point scope (superuser bypass; fail-closed when scope unresolvable) | Sector/port scoping enforced |
| Cross-sector/port prevention | `ScopeFilter` on the shipment's `port`; non-scoped users get 403/empty | Enforced |
| Data exposure | Exposed fields are operational only: event id, shipment UUID, stage code + Arabic `stage_label`, free-text `message`, `actor` UUID, `actor_name` (user full name), `occurred_at`. **No** secrets, tokens, credentials, internal security metadata, passport/identity PII, or medical/health data. Classification: authenticated-operational (actor full name is the only personal element; justified by "who performed this stage" in an authorized operational workflow) | Acceptable operational exposure |
| Internal/audit-only risk fields | Not serialized (risk/internal scoring, decision documents, fees, financial details are NOT in `FoodShipmentEventSerializer`) | No leak |
| Ordering | Model `ordering = ['occurred_at', 'created_at']` — chronological + deterministic tie-break | Deterministic |
| Duplicate handling | Events are append-only; duplicates cannot arise from writes (no update/delete); consumer may treat `occurred_at,created_at,id` as unique key | No dedupe needed |
| Audit integrity | **Immutable audit records**, not derived state; written solely by `_log_event()`; cursor over source of truth | Immutable |

**Blocking security issue:** none. The proposed contract is the least-exposure profile that satisfies the workflow and reuses existing, already-vetted enforcement.

---

## 6. UI-019 Recommendation

### `ADD_BACKEND_CONTRACT`

**Why:** The canonical timeline *source* (model + serializer + event writes) fully exists, but **no canonical timeline *endpoint* exists**. The frontend cannot consume anything meaningful against a 404 today, so `IMPLEMENT_EXISTING_CONTRACT` is false. The gap is a single additive detail action reusing the existing model, serializer, permission, and scope machinery — no new dependency, no schema change, no new role, no weakening of permissions. `KEEP_DEFERRED` is not required because the backend source is real, mature (10 write-points), and the contract is unambiguous. The next implementation phase should add the `timeline` action + a small set of focused tests (see §13 Gate D/Gap list), and add an error state to `RequestTimeline` so a failed fetch is distinguishable from an empty timeline.

---

## 7. UI-020 Emergency/EOC Backend Inventory

**Mount:** `path('api/v1/emergency/', include('apps.emergency_eoc.urls'))` — `backend/nqp_backend/urls.py:34`.

### Models (`backend/apps/emergency_eoc/models.py`)

| Model | Lines | Key state fields / choices |
| --- | --- | --- |
| `EmergencyAlert` | 7-48 | `alert_type` RED_ALERT/OUTBREAK; `status` **NEW / PROCESSING / RESOLVED** (default NEW); `traveler`, `port`, `description`, `location_geo`, `triggered_at`, `resolved_at` |
| `KillSwitch` | 51-71 | `port`, `activated_by`, `reason`, `activated_at`, `deactivated_at` |
| `ResponsePlan` | 74-87 | `name`, `steps`, `required_resources`, `is_active` |
| `EmergencyEvent` | 90-191 | `status` IDENTIFIED / VERIFIED / RESPONDING / CONTROLLED / CLOSED / REJECTED; `severity` LOW/MODERATE/HIGH/CRITICAL; `source_type`; `case_count`/`death_count`; `rel. team_members` |
| `CrisisTeamMember` | 194-218 | team roster per event (`role` INCIDENT_COMMANDER/LOGISTICS/MEDICAL_TEAM/COMMUNICATIONS) |
| `ReportableDisease` | 221-260 | `notification_timeline` IMMEDIATE/WITHIN_24H/WEEKLY; `ewars_threshold`; `surveillance_mode` |
| `HealthCase` | 263-416 | `case_type` SUSPECTED/PROBABLE/CONFIRMED/NOT_A_CASE; `status` UNDER_INVESTIGATION/ISOLATED/UNDER_TREATMENT/RECOVERED/DEAD/LOST_FOLLOWUP/CLOSED |
| `CaseStatusLog` | 419-449 | immutable transition archive for `HealthCase` (`field` case_type|status, old/new, note, changed_by, changed_at) |
| `SurveillanceAlert` | 452-541 | `alert_type` EWARS_THRESHOLD/SINGLE_EVENT/LAB_POSITIVE/CONFIRMED_OUTBREAK; `level` LEVEL_0..3; `status` **NEW / ACKNOWLEDGED / RESPONDING / CLOSED** |
| `ContactTrace` / `ContactFollowUp` | 544-639 | contact monitoring + daily follow-ups |
| `Investigation` | 642-685 | `status` OPEN / IN_PROGRESS / COMPLETED / CLOSED |
| `WeeklySurveillanceReport` (+ `WeeklyReportLine`) | 688-774 | period reports |

### Endpoints (`backend/apps/emergency_eoc/urls.py`)

| Route | ViewSet | Actions available |
| --- | --- | --- |
| `alerts` | `AlertViewSet` | GET list/retrieve, PATCH, POST create, `POST …/close/` (→ RESOLVED) |
| `kill-switch` | `KillSwitchViewSet` | GET, POST create, PATCH, `POST activate/`, `POST deactivate/`, `GET status/` |
| `plans` | `ResponsePlanViewSet` | full CRUD (no `permission_resource` configured — see §11) |
| `events` | `EmergencyEventViewSet` | GET, POST, PATCH, `POST …/verify/`, `POST …/activate-plan/`, `POST …/team/`, `POST …/close/` |
| `reportable-diseases` | `ReportableDiseaseViewSet` | read-only list/retrieve |
| `cases` | `HealthCaseViewSet` | GET, POST, PATCH, `POST …/transition/`, `GET …/history/` |
| `surveillance-alerts` | `SurveillanceAlertViewSet` | GET, PATCH; create → **405** (auto-generated); `POST …/ack/`, `POST …/respond/`, `POST …/close/`, `POST run-ewars/` |
| `contacts` | `ContactTraceViewSet` | GET, POST, PATCH, `POST …/follow-up/` |
| `investigations` | `InvestigationViewSet` | GET, POST, PATCH |
| `weekly-reports` | `WeeklySurveillanceReportViewSet` | GET, POST, PATCH, `POST …/review/` |
| `dashboard/` | `DashboardViewSet` | GET `stats/` |
| `surveillance/dashboard/` | `SurveillanceDashboardViewSet` | GET `stats/` |

### Permission machinery

- `SurveillanceAccessMixin` (`views.py:62-72`): `permission_resource='surveillance'`, `permission_classes=[PermissionAction]`; custom/CRUD actions resolved via `SURVEILLANCE_EDIT_ACTIONS` + `ACTION_TO_PERMISSION` (`views.py:286-296`): list/retrieve→`view`, create→`add`, update/partial_update→`edit`, destroy→`delete`; custom set `{transition, ack, close, respond, review, add_follow_up, run_ewars}` → `edit`.
- `SurveillanceScopeMixin` + `_surveillance_scope_q` (`views.py:75-81, 299-323`): queryset scoping by resolved entry-point ids and sector/region scopes (`resolve_user_port_ids` + `active_scopes('surveillance')`); superuser/global → unrestricted; otherwise cross-port/cross-sector rows are filtered out.
- `PermissionAction` (`core/permissions/__init__.py:89-130`): checks `request.user.can('{resource}:{action}')`; optional object-level `get_scoped_queryset` gate. Fail-closed when resource/action missing.
- `ScopeFilter` (`core/permissions/__init__.py:133-275`): object-level entry-point/sector scope enforcement; fail-closed on unresolvable scope.

---

## 8. UI-020 Lifecycle Matrix

### EmergencyAlert (`/api/v1/emergency/alerts/`) — the focus of UI-020

| Transition | Supported | Endpoint/Service | Permission | Validation | Tests |
| --- | ---: | --- | --- | --- | --- |
| CREATE (→ NEW) | **YES** | `POST /alerts/` (ModelViewSet.create; `EmergencyAlertSerializer`) | `surveillance:add` | Serializer fields only (`alert_type`, `port`, etc.); no domain rules | **NONE in `emergency_eoc`** |
| OPEN | n/a | Status `NEW` set on create; no named transition | n/a | — | — |
| ACKNOWLEDGE (→ PROCESSING) | **PARTIAL** | No dedicated action. Raw `PATCH /alerts/{id}/` with `status=PROCESSING` (`http_method_names=['get','patch','post']`), serializer validates against `AlertStatus.choices` only | `surveillance:edit` | **No explicit NEW→PROCESSING state rule**; PATCH bypasses lifecycle (e.g. RESOLVED can be re-opened) | **NONE** (`PROCESSING` never exercised) |
| ESCALATE | **NO** | No endpoint/action in `emergency_eoc`; `escalate_to_outbreak` lives in `apps/surveillance` on a different model (`SurveillanceAlert`, module `/api/v1/surveillance/`) | — | — | Not applicable to this app |
| RESOLVE / CLOSE | **YES** | `POST /alerts/{id}/close/` (`AlertViewSet.close`, `views.py:96-102`) → `status=RESOLVED`, `resolved_at=now` | `surveillance:edit` | **No pre-condition** (can close a NEW alert; idempotent re-close resets `resolved_at`) | `test_eoc.py:81` (close → RESOLVED) |
| CANCEL | **NO** | — | — | — | — |

### Other lifecycle contracts (context, not UI-020 scope)

| Object | Supported transitions | Endpoint/Service | Tests |
| --- | --- | --- | --- |
| `EmergencyEvent` | create(→IDENTIFIED); verify (→VERIFIED/REJECTED); activate-plan (→RESPONDING); team; close (→CLOSED) | `events` viewset actions | `test_eoc.py:136` happy path |
| `HealthCase` | create; transition (free-form `case_type`/`status` via `transition` action) + `CaseStatusLog` archive + `history` GET | `cases` viewset | **NONE** |
| `SurveillanceAlert` | create blocked (405); ack (NEW→ACKNOWLEDGED); respond (NEW/ACKNOWLEDGED→RESPONDING); close (→CLOSED); run-ewars | `surveillance-alerts` viewset | **NONE** in `emergency_eoc` |
| `KillSwitch` | activate / deactivate | `kill-switch` viewset | `test_eoc.py:96` |

---

## 9. UI-020 Permission Matrix

Effective gate = `surveillance:{action}` on the `surveillance` resource (NOT the `emergency` resource; `emergency:view/export` exists for FEDERAL_DIRECTOR/VIEWER but is not what the EOC views enforce). Derived from `apps/accounts/management/commands/seed_iam_roles.py` (canonical IAM) and cross-checked with `seed_rbac.py`.

| Role | `surveillance:view` | `surveillance:add` (CREATE alert) | `surveillance:edit` (CLOSE / ack-PATCH / escalate-n/a) | Default scope | Source |
| --- | --- | --- | --- | --- | --- |
| FEDERAL_DIRECTOR | YES | no | no | GLOBAL | IAM:25-39 |
| POE_MANAGER | YES | **YES** | **YES** | POINT | IAM:41-55 |
| INSPECTOR | YES | **YES** | **YES** | POINT | IAM:79-92 |
| FOOD_CONTROL_MANAGER | YES | no | no | SECTOR | IAM:57-70 |
| VECTOR_NATIONAL_MANAGER | YES | no | no | GLOBAL | IAM:146-157 |
| VIEWER | YES | no | no | GLOBAL | IAM:140-145 |

**Consequence:** in the seeded IAM set, **only POE_MANAGER and INSPECTOR can create and resolve/close `EmergencyAlert`**, and both are point-scoped (via `SurveillanceScopeMixin`). `seed_rbac.py` additionally seeds legacy roles with `surveillance:add/edit` (lines 341, 358, 403, 717, 737, 1258, 1281) — same resource gate. Superusers bypass via `PermissionAction.has_permission` (`is_superuser → True`). No new role is required and none is proposed.

Full trace (UI-020): Frontend route `/app/emergency` (`routes.tsx:460`, lazy `EmergencyPage` `routes.tsx:113`) → `getAlerts()` `emergency.ts:5` → `GET /api/v1/emergency/alerts/` → `AlertViewSet.list` → `PermissionAction(surveillance:view)` → `_surveillance_scope_q` port/sector filter → `EmergencyAlertSerializer`. **There is no frontend path at all to any mutation endpoint.**

---

## 10. UI-020 Frontend Contract Gap

| Area | Current state | Gap vs. backend |
| --- | --- | --- |
| Data consumed | `EmergencyPage.tsx` renders `alert_type`, `description`, `port`, `status`, `triggered_at`; kill-switch banner (`getKillSwitchStatus`) | Matches backend serializer fields; `traveler`/`location_geo`/`resolved_at` typed but unused |
| Actions available | **None.** Page is a read-only table (search/filter/sort/paginate/export/refresh) | No create/ack/escalate/resolve/close controls |
| Endpoints called | `GET /alerts/` (`useServerTable`), `GET /kill-switch/status/` | Only reads |
| API client (`emergency.ts`) | 5 functions, **all GET** (`getAlerts`, `getEmergencyEvents`, `getKillSwitches`, `getKillSwitchStatus`, `getEmergencyStats`) | **Zero POST/PATCH** — no mutation functions exist |
| State-name alignment | `utils/status/emergency.ts`: `NEW/PROCESSING/RESOLVED`, `RED_ALERT/OUTBREAK` | **Exact match** to `EmergencyAlert.AlertStatus` / `AlertType` choices |
| Unsupported suggestions | None — UI shows status labels only; it never suggests acknowledge/escalate | Compliant (no fabrication) |
| Missing controls for a truthful implementation | Create button + resolve/close action per row; optional “processing” (ack) via PATCH | Create + Resolve are implementable directly; ACKNOWLEDGE only via partial PATCH |

---

## 11. UI-020 Security / Scope Analysis

| Concern | Analysis | Verdict |
| --- | --- | --- |
| Authentication | Required; `PermissionAction` denies anonymous | OK |
| Authorization (create/close) | `surveillance:add` / `surveillance:edit` enforced point-scoped | OK for stated workflow |
| Object-level scope | `EmergencyAlert.port` scoped via `SurveillanceScopeMixin`+`_surveillance_scope_q` (port/sector); cross-port rows filtered | OK |
| Escalation | `EmergencyEvent`s (`location_port`) and `HealthCase`s (`port`/`sector`) also point/sector-scoped | OK |
| Audit logging | `HealthCase` transitions archived via `CaseStatusLog` (`views.py:335-345`); **no transition log for `EmergencyAlert`** (`close`/ack are status flips with no history record). Documentation-level gap; low risk for the stated workflow | Gap (documented) |
| Serializer minimization | `EmergencyAlertSerializer` and `EmergencyEventSerializer` expose contract fields only (no internal notes, no risk internals beyond HealthCase’s operational PII required by the surveillance workflow) | OK |
| `HealthCaseSerializer` PII | Exposes `phone`, `passport_number`, `person_name`, `exposure_history` — this is the authorized surveillance data model (server domain); serializer is minimal for that domain but contains sensitive identity data; must be subject to the same display rules as existing surveillance screens | Documented; not a UI-020 blocker |
| ResponsePlan / Dashboard defaults | `ResponsePlanViewSet` (`views.py:187-193`) and `DashboardViewSet` (`views.py:265-283`) set **no** `permission_resource`/`permission_classes` → fall back to project default (authenticated-only) rather than `surveillance:*`. Lower-priority observations, not part of the immutable UI-020 create/resolve path | Documented |
| Transition validation | Alert close/ack actions do **not** validate source state (a NEW alert can be closed, RESOLVED can be un-resolved via PATCH) — there is **no enforced state machine** for `EmergencyAlert`; transitions are permissive field assignments | Documented (do not assume rigidity) |
| Race/concurrency | `close` sets two fields then saves with `update_fields` — atomic at row level; re-close overwrites `resolved_at` (no lock, no conflict) | Acceptable |
| CSRF/CORS/rate-limit | JWT-authenticated API (no session CSRF); standard DRF throttling — nothing abnormal for these endpoints | OK |

**Blocking security issue:** none for the truthful scope. The absence of an enforced alert state machine and of alert transition history are integrity gaps to document (not silently “fix” in the UI).

---

## 12. UI-020 Recommendation

### `IMPLEMENT_EXISTING_CONTRACT`

**Why:** The frontend’s minimum intended workflow is **truthfully implementable today** against existing backend contracts, with real permissions intact:
- **Create** → `POST /api/v1/emergency/alerts/` (`surveillance:add`, PoE Manager / Inspector)
- **Resolve/Close** → `POST /api/v1/emergency/alerts/{id}/close/` (`surveillance:edit`, sets `RESOLVED` + `resolved_at`)
- **Acknowledge (optional, partial)** → raw `PATCH /api/v1/emergency/alerts/{id}/` with `status=PROCESSING` (`surveillance:edit`); **no dedicated transition endpoint and no state validation** — if a first-class, validated ACKNOWLEDGE is later required, that is `ADD_BACKEND_CONTRACT` (a `surveillance:edit` `ack` action mirroring `SurveillanceAlertViewSet.ack`), and must be a separately-scoped decision.
- **Escalate** → **not supported** in `emergency_eoc`; **EXCLUDED** from the implementable scope (escalation exists only in `apps/surveillance` for a different domain). Do not fabricate an escalate control or state on `EmergencyAlert`.

`ADD_BACKEND_CONTRACT` is not selected for create/resolve because no backend change is required for them; `KEEP_DEFERRED` is not selected because the create/resolve contract is real and tested. **Implementation must not weaken the `surveillance:*` gate, must respect point/sector scope, must not invent `ESCALATE` or a non-existent ack endpoint, and the UI must not suggest transitions the backend will reject.**

---

## 13. Acceptance Gates (A–N)

| Gate | Area | Result | Evidence |
| --- | --- | --- | --- |
| A | Scope Integrity (UI-019 + UI-020 only) | **PASS** | Report limited to the two deferred findings; no other deferred finding re-opened |
| B | No Code Modification | **PASS** | Read-only commands only (`glob/grep/read/git status`); `git status` shows pre-existing changes only; sole artifact is this report |
| C | Baseline Protection | **PASS** | §2 table; Wave 2 + M2-D2 states untouched |
| D | Timeline Evidence | **PASS** | `FoodShipmentEvent` model/serializer/log sites + absence of any `timeline` route proven via code listings (§3) |
| E | Timeline Contract | **PASS** | §4: canonical endpoint = **none**; canonical source = `FoodShipmentEvent`; new endpoint required → `ADD_BACKEND_CONTRACT` |
| F | Timeline Security | **PASS** | §5: auth, permission (`food:view`), object scope, sector/port scope, exposure classification, ordering, audit immutability all analyzed |
| G | Emergency Evidence | **PASS** | §7: models/endpoints/views/permissions traced to `apps/emergency_eoc` code with line refs |
| H | Emergency State Machine | **PASS** | §8: supported (CREATE, RESOLVE/CLOSE) vs partial (ACKNOWLEDGE=PATCH, no validation) vs unsupported (ESCALATE, CANCEL) explicitly distinguished |
| I | Emergency Permissions | **PASS** | §9: role/permission matrix from `seed_iam_roles.py` + `seed_rbac.py`; create/close = PoE Manager & Inspector |
| J | Frontend Contract | **PASS** | §10: read-only page; 5 GET-only client functions; missing controls; status-name exact match; no unsupported suggestions |
| K | No Fabrication | **PASS** | No invented endpoint, state, role, or action; `ESCALATE`/`CANCEL`/validated-ack explicitly recorded as not supported |
| L | Test Evidence | **PASS** | §14 below: `food_quarantine/tests` 11 files/97 tests (1 touches events; 0 timeline); `emergency_eoc/tests/test_eoc.py` 4 tests (10 of 14 route groups untested); frontend 0 tests for both features |
| M | Recommendation Integrity | **PASS** | UI-019 → `ADD_BACKEND_CONTRACT` (§6); UI-020 → `IMPLEMENT_EXISTING_CONTRACT` (§12) — each exactly one of the three allowed values |
| N | Report | **PASS** | `docs/audit/UI-019-UI-020-BACKEND-CONTRACT-DISCOVERY.md` exists with all required sections 1–12 (13–14 add the mandated gates + verdict output) |

## 14. Test Discovery (Gate L detail)

**UI-019 — timeline/shipment-history tests:**
- `backend/apps/food_quarantine/tests/` → 11 files / **97 tests**. Only `test_clerk_draft.py:170` (`test_create_with_submit_flag_is_atomic`, asserts `'SUBMITTED' in shipment.events`) touches `FoodShipmentEvent`. **Zero** tests for event retrieval/`timeline` endpoint (endpoint absent), serialization, ordering, actor attribution, stage-write coverage for 8 of 9 write-point stages (CREATED, REFERRED_TO_INSPECTOR, FEES_CONFIRMED, INSPECTION, SAMPLING, AWAITING_DECISION, DECISION, RELEASED), and zero role-visibility/scope tests.
- Frontend: **0** tests for `RequestTimeline` / `ShipmentDetailView` / `food.ts`.
- Golden example for the future tests: `apps/carriers/tests/test_health_declarations.py` (timeline empty/merge/cross-account 404/auth tests).

**UI-020 — emergency/EOC lifecycle tests:**
- `backend/apps/emergency_eoc/tests/test_eoc.py` → **4 tests**: alert close→RESOLVED (`:81`), kill-switch activate/deactivate/duplicate (`:96`), event workflow verify→activate-plan→team→close (`:136`), dashboard stats (`:193`). **10 of 14** registered route groups have **zero** tests (alerts create/list, plans, reportable-diseases, cases transition/history, surveillance-alerts ack/respond/close/run-ewars, contacts, investigations, weekly-reports, both dashboards).
- Parallel-but-distinct coverage lives in `apps/surveillance/tests/` (`test_alerts.py` 16 incl. `escalate_to_outbreak`; `test_cases.py` 20; etc.) — **not** the `emergency_eoc` API.
- Frontend: **0** tests for `EmergencyPage`, `api/endpoints/emergency.ts`, `utils/status/emergency.ts`.

**Missing/important coverage to add in the next implementation phase (documented here, not added in this phase):** timeline endpoint 200/shape/order/scope/404/permission tests + frontend error-state test; alert create (403 without `surveillance:add`, 201 with), close permission/scope/idempotency, ack-PATCH→PROCESSING behavior and its validation absence, cross-port denial on each emergency mutation.

---

## 15. Final Verdict

`DISCOVERY ACCEPTED`

**Gates A–N:** all **PASS** (see §13) — no non-PASS gates.

**Recommended next implementation phase (separate work items):**
1. **UI-019 — `ADD_BACKEND_CONTRACT`:** add `GET /api/v1/food/shipments/{id}/timeline/` detail action on `ShipmentViewSet` (existing `FoodShipmentEventSerializer`, `food:view` + `ScopeFilter`, `(occurred_at, created_at)` ordering, `success_response` envelope); add the timeline endpoint, scope, and permission tests; add an error state to `RequestTimeline` (currently `catch → []` collapses failures to “لا توجد أحداث بعد”).
2. **UI-020 — `IMPLEMENT_EXISTING_CONTRACT`:** frontend-only — Create (POST `/alerts/`, guard on real `surveillance:add` from the session role), Resolve/Close (`POST /alerts/{id}/close/`), optional “processing/acknowledge” via PATCH `status=PROCESSING` (documented as unvalidated); **no ESCALATE control**; add `emergency.ts` mutation functions + tests. Backend needs no change for this scope.

**Confirmed prohibitions honored:** no source/schema/migration/dependency/permission/route/UI edits; no new roles; no invented endpoints/lifecycle states/timeline events/emergency actions; no reopened decisions; nothing committed.

---

*This report is the deliverable of the discovery phase. Implementation is intentionally not performed here.*