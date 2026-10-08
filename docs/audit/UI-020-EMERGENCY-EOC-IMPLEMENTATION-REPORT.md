# UI-020 — Emergency / EOC Workflow Implementation Report

- **Phase:** UI-020 (Emergency / EOC Workflow) — Controlled Frontend-First Implementation
- **Scope:** `IMPLEMENT_EXISTING_CONTRACT` (from `docs/audit/UI-019-UI-020-BACKEND-CONTRACT-DISCOVERY.md`)
- **Modes allowed:** frontend only; backend unchanged; UI-019 untouched
- **Date:** 2026-10-08

---

## 1. Executive Summary

The Emergency/EOC frontend (`EmergencyPage`) was converted from read-only presentation
into a truthful operational workflow exposing exactly what the backend already supports:

**Create → Active/Open → Resolve/Close**

Only two existing backend contracts were consumed:

- `POST /api/v1/emergency/alerts/` (permission `surveillance:add`)
- `POST /api/v1/emergency/alerts/{id}/close/` (permission `surveillance:edit`)

No new endpoint, no new role, no new permission, no new state, no schema change, no
dependency change, and no modification of UI-019 or any backend file. ESCALATE was not
implemented (no `emergency_eoc` escalation contract exists). A formal ACKNOWLEDGE workflow
was not implemented (only the existing `PROCESSING` status semantics are displayed).

The implementation passed its focused test suite (17 tests), the full frontend regression
suite (48 files / 326 tests), `tsc -b`, and ESLint with zero errors. Backend contracts were
re-verified against repository code and match the accepted discovery report exactly.

---

## 2. Backend Contracts Used

Re-verified against repository evidence (no guesswork):

| Operation | Route | Method | Permission | Backend authority |
| --- | --- | --- | --- | --- |
| Create | `/api/v1/emergency/alerts/` | POST | `surveillance:add` | `AlertViewSet` — `actions.SurveillanceAccessMixin.get_permissions` maps `create` via `ACTION_TO_PERMISSION['create'] = 'add'` to `PermissionAction('surveillance','add')` (`backend/apps/emergency_eoc/views.py:62-72, 289-296`) |
| Resolve/Close | `/api/v1/emergency/alerts/{id}/close/` | POST | `surveillance:edit` | `close` action (`views.py:96-102`) — in `SURVEILLANCE_EDIT_ACTIONS` (`views.py:286-288`) → `permission_action = 'edit'` |
| List | `/api/v1/emergency/alerts/` | GET | `surveillance:view` | ModelViewSet `list` / `retrieve` via `ACTION_TO_PERMISSION` default `'view'` |

**Serializer contract (Create):** `EmergencyAlertSerializer` (`backend/apps/emergency_eoc/serializers.py:27-34`)

- Writable fields: `traveler`, `port`, `alert_type`, `description`, `location_geo`, `status`
- Read-only: `id`, `triggered_at`
- Model constraints (`models.py:7-48`): `alert_type` required (RED_ALERT / OUTBREAK); `description` `blank=True`; `port` / `traveler` nullable; `status` defaults to `NEW`; `location_geo` defaults to `{}`; `triggered_at` auto-set; `resolved_at` null until close.

The frontend form therefore submits **only fields with a backend contract**: `alert_type`
(required), `description` (optional), `port` (optional). `status`, `location_geo`, `traveler`,
and `triggered_at` are intentionally omitted and left to server defaults — no invented inputs.

**Response envelope:** all 2xx responses are wrapped by `core/renderers.py:4-19` as
`{ status: 'success', data }`; error responses are DRF bodies (`{field:[...]}` for 400
validation, `{detail}` for 403/404/409), consumed verbatim by the UI error layer.

---

## 3. Files Changed

| File | Change | Kind |
| --- | --- | --- |
| `frontend/src/api/endpoints/emergency.ts` | Added `CreateEmergencyAlertPayload`, `createAlert`, `closeAlert` (existing GET functions untouched) | Modified |
| `frontend/src/pages/emergency/EmergencyPage.tsx` | Permission-aware Create dialog + Resolve/Close Confirm action, state-aware gating, truthful error handling, authoritative refresh. Removed 3 pre-existing unused imports. | Modified |
| `frontend/src/pages/emergency/EmergencyPage.test.tsx` | New focused test suite (17 tests) | Added |
| `docs/audit/UI-020-EMERGENCY-EOC-IMPLEMENTATION-REPORT.md` | This report | Added |

**No other files were modified.** No backend file, no UI-019 file, no migration, no
`package.json`, no lockfile, no requirements file was touched.

---

## 4. Create Workflow

- Entry point: `DataTable` `toolbar` renders **"إنذار جديد"** only when the user has
  `surveillance:add` (`EmergencyPage.tsx` — `canAdd` gate, toolbar prop).
- `FormDialog` **"إنذار جديد"** with three controls mapped strictly to the serializer:
  - `FormSelect` **نوع الإنذار** (alert_type, RED_ALERT/OUTBREAK, required)
  - `FormTextField` **الوصف** (description, optional, multiline)
  - `FormSelect` **المنفذ** (port, optional, options from `GET /master-data/entry-points/`)
- Validation: submit is disabled until `alert_type` is chosen (no API call can fire without it).
  Server-side validation errors are displayed inline and the dialog stays open (no silent coercion).
- Duplicate-submit prevention: `creating` state disables the submit control and switches its label
  to **"جارٍ الحفظ..."** (FormDialog contract).
- Success: `createAlert(payload)` → `notifySuccess('تم إنشاء الإنذار بنجاح')` → dialog closes →
  `refresh()` (re-validation via `useServerTable`).
- Failure: inline `Alert` with the server message (`{message}`/`{detail}`/DRF field error) or a
  truthful fallback; **no optimistic list insertion**; form values preserved.

---

## 5. Resolve/Close Workflow

- Entry point: `DataTable` `actions` column renders **"إنهاء"** per row **only** when the user has
  `surveillance:edit` **and** the row's backend status is not already `RESOLVED` (state-aware).
- `ConfirmDialog` titled "إنهاء الإنذار" explains the consequence in Arabic
  ("…سيُنهى الإنذار وتُسجَّل حالته «تم الحل» عند الخادم").
- Confirmation: `closeAlert(id)` → `POST /emergency/alerts/{id}/close/` → on success
  `notifySuccess('تم إنهاء الإنذار واعتماد الحالة عند الخادم')` → dialog closes → `refresh()`.
  The corrected `RESOLVED` status is rendered **only after** the authoritative server refetch.
- During action: confirm button disabled with loading indicator — duplicate close blocked.
- On failure: dialog stays open with the backend rejection `{detail}` inline; **no local status
  change** (the list continues to show the server's last-known status); no false success toast.

---

## 6. Permission Model

- Uses the platform's existing RBAC mechanism (`useAuth()` → `user.permissions`, the exact same
  fail-open semantics as `RoleNavMenu`): `can(code)` returns true only when the code is present,
  and treats an empty permission array as unrestricted, matching the accepted baseline.
- `canAdd = can('surveillance:add')` gates Create (toolbar).
- `canEdit = can('surveillance:edit')` gates Resolve/Close (actions column).
- No role names are hardcoded; no new permission introduced.
- The backend remains the security boundary — the UI hiding a button is cosmetic; any 403 from the
  server is surfaced verbatim (see §8).

---

## 7. State Model

State is represented exactly as the backend defines it (`models.py:12-15`):

- `NEW` → "جديد" (`alertStatus` in `frontend/src/utils/status/emergency.ts`)
- `PROCESSING` → "قيد المعالجة" — displayed per existing status semantics; **not** reinterpreted
  as an acknowledgement lifecycle
- `RESOLVED` → "تم الحل" — produced by the close contract; when already `RESOLVED`, no close action
  is offered.

No new status value, no new transition, no severity level, and no escalation level was invented.

---

## 8. Error Handling

Distinguishes error classes using the project's existing patterns
(`utils/toast.ts` `extractErrorMessage` + a local DRF-body reader):

| Error class | Source | UI behaviour |
| --- | --- | --- |
| Validation (400) | DRF `{field:[msg]}` | Inline alert inside the create dialog; dialog stays open |
| Permission denied (403) | `{detail}` | Inline alert; action not optimistically applied |
| Not found / conflict | `{detail}` | Inline alert; state preserved |
| Network/server failure | no response | Truthful Arabic fallback text (create/close) |
| Throttled (429) | `Retry-After` header | `extractErrorMessage` throttling message |

Failed mutations never convert into successful UI state: no `resolved_at`/status is set locally,
rows are not inserted optimistically, and `notifySuccess` is not called on rejection.

---

## 9. Unsupported Operations

- **ESCALATE — absent.** No button, no menu item, no API function, no state. The `emergency_eoc`
  domain has no escalation contract; surveillance's separate escalation domain is not reused
  (`frontend/src/api/endpoints/emergency.ts` exposes no escalate call; page renders no "ترقية"/تصعيد UI).
- **FORMAL ACKNOWLEDGE — absent.** No ACKNOWLEDGE button/workflow/transition/endpoint.
  `PROCESSING`, if present, is rendered only via the existing status label. No frontend-only state.
- **No invented lifecycle.** `EmergencyAlert.status` values mirror backend choices only.

---

## 10. Accessibility

Follows the accepted Phase 2B baseline; no new abstraction introduced:

- All controls reuse existing components (`FormDialog`, `ConfirmDialog`, `FormTextField`,
  `FormSelect`, `DataTable`) which carry accessible names/labels per the baseline.
- Dialog titles act as accessible names (`DialogTitle`); dialogs are non-dismissable while a
  mutation is in flight (`onClose` guarded on `loading`).
- Buttons are text-labelled (no icon-only controls): "إنذار جديد", "إنهاء"; row action also gets a
  descriptive `aria-label`.
- `FormTextField` binds label↔input via `htmlFor`/`id` (component contract); `FormSelect` labels
  each select; required fields carry an asterisk and `required` semantics.
- Keyboard operation and focus behaviour inherit from the existing MUI dialog/select behaviours
  already covered by the accepted accessibility baseline.

---

## 11. Tests

New suite: `frontend/src/pages/emergency/EmergencyPage.test.tsx` — **17 tests, all passing**.

**Create (surveillance:add)**
- authorized user sees Create (`إنذار جديد`)
- unauthorized user does not see Create
- validation (submit disabled until `alert_type`) → zero API calls
- successful POST with exact backend payload (`{alert_type, description, port}`), success toast, dialog closes, revalidation triggers a second list fetch
- server-side validation failure → inline `هذا الحقل مطلوب.`, dialog stays open
- network/server failure → truthful fallback, no success toast
- duplicate-submit prevention → single `createAlert` call while submitting

**Resolve/Close (surveillance:edit)**
- authorized user sees the action for an open alert
- unauthorized user does not
- action hidden for an already-`RESOLVED` row (state-aware)
- confirmation dialog message → successful close → toast → authoritative refetch renders `تم الحل`
- backend rejection → inline detail preserved, no optimistic resolution, list still shows `جديد`
- network failure → truthful fallback
- duplicate-submit prevention → single `closeAlert` call

**Unsupported operations**
- no ESCALATE control (no "ترقية"/تصعيد button or text)
- no formal ACKNOWLEDGE control (no "اعتماد"/"استلام"/"قبول الإنذار" button)
- `PROCESSING` renders only as "قيد المعالجة" with no ack lifecycle UI

---

## 12. Regression Results

| Check | Result |
| --- | --- |
| Frontend full suite `npx vitest run` | **48 files / 326 tests passed** (was 47/309 pre-UI-020; only the new suite added) |
| `npx tsc -b` | PASS (no errors) |
| `npx eslint` on changed files (emergency.ts, EmergencyPage.tsx, EmergencyPage.test.tsx) | 0 errors, 0 warnings |
| Backend `python manage.py makemigrations --check --dry-run` | No changes detected |
| Backend emergency suite `python -m pytest apps/emergency_eoc -q` | 3 passed, **1 pre-existing unrelated failure** (see §14) |
| UI-019 files | untouched by UI-020 (git status confirms emergency/ui-019 scope) |

The pre-existing emergency read-only list behaviour (kill-switch banner, alerts table, filters,
export) is unchanged and covered by the regression test at the top of the new suite.

---

## 13. Acceptance Matrix A–Q

| Gate | Result | Evidence |
| --- | --- | --- |
| A Scope Integrity | PASS | Only 3 UI-020 files touched (API client, EmergencyPage, its tests) + this report; no backend/UI-019/schema/deps |
| B Existing Contract | PASS | `createAlert` → `POST /emergency/alerts/` (`emergency.ts:15-16`); serializer contract respected |
| C Existing Close Contract | PASS | `closeAlert(id)` → `POST /emergency/alerts/{id}/close/` (`emergency.ts:18-19`) |
| D Permission Integrity | PASS | `surveillance:add` gates Create; `surveillance:edit` gates Resolve/Close; no role-name hardcoding |
| E Backend Authority | PASS | No optimistic success; mutations verified by server; failures surfaced; refresh revalidates |
| F Create Workflow | PASS | Operational and tested (7 tests) |
| G Resolve Workflow | PASS | Operational and tested (7 tests) |
| H Error Integrity | PASS | Validation/permission/not-found/network distinguished; no false success states |
| I State Integrity | PASS | Only NEW/PROCESSING/RESOLVED represented; state-aware close gating; PROCESSING not re-labelled as ack |
| J No Escalation | PASS | No ESCALATE UI/API in emergency_eoc; verified by test |
| K No Formal Acknowledge | PASS | No ACKNOWLEDGE UI/endpoint/state; PROCESSING = status label only |
| L Accessibility | PASS | Existing labelled controls only; no new abstraction; aria-label on row action |
| M Tests | PASS | 17/17 focused tests green |
| N Regression | PASS | Full frontend 326/326; prior emergency list behaviour intact |
| O No Dependencies | PASS | No package.json/lockfile/requirements change |
| P No Schema | PASS | `makemigrations --check` → no changes detected |
| Q Baseline Protection | PASS | UI-019 (timeline contract) and all accepted phases untouched |

---

## 14. Deferred Items

1. **Pre-existing backend KillSwitch test failure (out of scope, not caused by UI-020).**
   `backend/apps/emergency_eoc/tests/test_eoc.py::test_kill_switch_activate_deactivate` fails at
   assertion `assert status.json()['data']['active'] is False` (`test_eoc.py:126`) after
   `deactivate`. This concerns the KillSwitch enable/disable flow, which UI-020 does not touch
   (no backend file was modified this phase; the frontend only consumes alert create/close).
   It does **not** block or contradict the alert Create→Resolve/Close contract. Recommended as a
   separate backend bug-fix phase following the M2/project issue process.
2. **Optional `traveler` / `location_geo` inputs.** The serializer exposes them, but the minimum
   supported workflow does not require them; they remain server-defaulted/omitted per the "smallest
   safe scope" rule. Any future addition must map to the same serializer contract.
3. **ESCALATE / formal ACKNOWLEDGE** remain explicitly unsupported until the backend establishes a
   validated `emergency_eoc` contract for them.

---

## 15. Final Verdict

`UI-020 IMPLEMENTATION ACCEPTED`

All acceptance gates A–Q PASS. The Emergency/EOC frontend now exposes truthfully only what the
backend supports: **Create (POST /alerts/, `surveillance:add`) → Resolve/Close
(POST /alerts/{id}/close/, `surveillance:edit`)**. No backend change, no schema change, no new
dependency, no ESCALATE, no formal ACKNOWLEDGE, and no modification of UI-019 or any other
accepted phase.