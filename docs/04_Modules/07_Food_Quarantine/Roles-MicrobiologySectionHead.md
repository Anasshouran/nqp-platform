# Microbiology Section Head — Roles & Console

## Summary

Added a new **`MICRO_SECTION_HEAD`** role (`رئيس قسم الأحياء الدقيقة`) and seeded account
`microhead@nqp.gov.sd` (password follows convention: `Nqp@Lab2026`). The role is scoped to
`STATION` and has limited permissions: it can **review** results, **mark QC**, **return** to
analyst, **assign** analysts to samples, and view applicable micro‑specification limits — but it
**cannot** final‑approve results (that is the `LAB_MANAGER`/`ADMIN` prerogative) nor edit results
directly. The Arabic console (`/app/microbiology`) implements the full spec:
sample distribution, result review with auto‑evaluation (n/c/m/M), non‑compliant handling,
QC dashboard, SLA monitoring, and read‑only specification viewer.

## Backend Changes

### 1. Role seeding (`seed_rbac.py`)

Added `MICRO_SECTION_HEAD` role definition after the `CHEM_SECTION_HEAD` block (see lines 347‑360 of the
file). The role inherits the same pattern:

- **code**: `MICRO_SECTION_HEAD`
- **name**: `Microbiology Section Head`
- **name_ar**: `رئيس قسم الأحياء الدقيقة`
- **default_scope**: `ScopeType.STATION`
- **resources**: `laboratory`, `reports`, `travelers`, `port_health`, `notifications` (view‑only,
  assign‑and‑review actions; no `final approve`)

After running `manage.py seed_rbac`, the role and its permissions are created in the DB.

### 2. User account

Created `microhead@nqp.gov.sd` via `manage.py shell`:

```python
User = get_user_model()
u, _ = User.objects.get_or_create(email='microhead@nqp.gov.sd', defaults={
    'full_name': 'رئيس قسم الأحياء الدقيقة',
    'user_type': User.UserType.CITIZEN,
    'is_active': True,
})
u.role = Role.objects.get(code='MICRO_SECTION_HEAD')
u.organization_name = 'قسم الأحياء الدقيقة — المختبر الاتحادي'
u.save()
RoleAssignment.objects.get_or_create(
    user=u, role=u.role, scope_type=ScopeType.STATION, defaults={'is_active': True},
)
```

Password `Nqp@Lab2026` works for all lab accounts; tokens are regenerated via
`RefreshToken.for_user` in the shell.

### 3. Guard logic (`views.py`)

Added `_block_section_head_tasks` method on `SampleTestViewSet` that blocks
`CHEM_SECTION_HEAD` and `MICRO_SECTION_HEAD` from entering/editing results and from the final
`approve` action:

- **blocked actions**: `start`, `save-result`, `enter-result`, `evaluate`, `approve`
- **allowed actions**: `review`, `return-result`, `mark-qc`, `applicable-limits`

The guard is enforced before any business‑logic checks (HTTP 403 with message
`{purpose} — تنفيذي فقط ولا يتاح لرئيس القسم`). The existing `_block_non_analyst_role` continues
to block only `LAB_RECEPTIONIST` / `LAB_COORDINATOR`.

### 4. New endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/food/samples/micro-dashboard/` | KPIs: total/under_testing/ready_for_approval/approved/dispatched/completed/today_tests/urgent/draft_results/submitted/reviewed/pending_results/overdue_tests/at_risk_tests/non_compliant/avg_tat_hours/sla_compliance{qc_pending,qc_failed,analysts_count,workload_by_analyst,specs_active,evaluated_tests}. |
| `GET /api/v1/food/sample-tests/analyst-workload/?bench=MICROBIOLOGY` | Per‑analyst workload: `id, full_name, in_progress, draft, review, overdue, completed, total, load_level {idle/normal/high/overloaded}`. |
| `POST /api/v1/food/sample-tests/{id}/review/` | Review result → sets `status=REVIEWED`, records `reviewed_by`, `reviewed_at`, optional `decision`. |
| `POST /api/v1/food/sample-tests/{id}/return-result/` | Return to analyst with reason (required). Triggers `notes += '[إعادة للتحلیل] <reason>'`, `status=DRAFT`, clears `reviewed_by/at`. |
| `POST /api/v1/food/sample-tests/{id}/mark-qc/` | Mark QC: `qc_status` ∈ {PASSED, FAILED} + `qc_notes`. |
| `GET /api/v1/food/sample-tests/{id}/applicable-limits/` | Returns `product, spec_version, limits (n/c/m/M, plan, unit, microorganism)`. |
| `POST /api/v1/food/sample-tests/{id}/evaluate/` | Run auto‑evaluation engine (requires units payload + optional `limit`). Sets `micro_limit`, `spec_snapshot`, `evaluation`, `evaluation_reason`, `decision`. |
| `POST /api/v1/food/samples/{id}/assign-section/` / `set-parameters/` / `set-priority/` | Distribute sample to analyst with optional priority and test parameters. |

### 5. Permission matrix (micro head)

| Action | Result |
|---|---|
| `start` | **403** – not allowed (analyst‑only) |
| `save-result` | **403** – not allowed |
| `enter-result` | **403** – not allowed |
| `evaluate` | **403** – not allowed |
| `review` | **200** – allowed (sets REVIEWED) |
| `return-result` | **200** – allowed (requires reason) |
| `mark-qc` | **200** – allowed (PASSED/FAILED) |
| `approve` | **403** – blocked (final approval = LAB_MANAGER/ADMIN) |
| `applicable-limits` | **200** – allowed |

## Frontend Changes

### 1. Types (`frontend/src/types/food.ts`)

Added three new interfaces:

- **`WorkloadItem`** – per‑analyst workload metrics (`id`, `full_name`, counts, `load_level`).
- **`MicroDashboard`** – dashboard KPI payload (`total_samples`, `under_testing`, `ready_for_approval`,
  `approved`, `dispatched`, `completed`, `today_tests`, `urgent`, `draft_results`, `submitted`,
  `reviewed`, `pending_results`, `overdue_tests`, `at_risk_tests`, `non_compliant`,
  `avg_tat_hours`, `sla_compliance {count, on_time, percent}`, `qc_pending`, `qc_failed`,
  `analysts_count`, `workload`, `specs_active`, `evaluated_tests`).
- Updated `ChemistryDashboard` unchanged.

### 2. API endpoints (`frontend/src/api/endpoints/foodlab.ts`)

Added export functions:

- `getMicroBiologyDashboard()` → `MicroDashboard`
- `getMicroWorkload()` → `{ bench, workload: WorkloadItem[] }`
- `getMicroSpecifications()` → `PaginatedResponse<MicrobiologicalSpecification>`
- Updated imports to include the new types.

### 3. New page (`frontend/src/pages/foodlab/MicrobiologyLabPage.tsx`)

Full‑featured console implementing the Arabic spec:

| Tab | Content |
|---|---|
| **0 – لوحة عامة** | KPI cards (total, today, under review, approved, non‑compliant, SLA‑overdue, QC‑pending, avg TAT, SLA‑compliance %), workload mini‑table, alerts panel. |
| **1 – العينات والتوزيع** | Server‑table of micro samples (رقم، المنتج، المصدر، الأولوية، الحالة، القسم، المحلل). Actions: **فتح**، **توزيع** (opens assign‑analyst dialog). |
| **2 – مراجعة النتائج** | Server‑table of micro tests (فحص، الحالة، النتيجة، القرار، QC, SLA). Per‑test actions: **مراجعة** (opens review dialog), **QC** (mark PASSED/FAILED), **عرض المواصفة** (applicable‑limits dialog). |
| **3 – المحللون والعبء** | Workload table (`load_level` chips: idle ⚪, normal 🟢, high 🟡, overloaded 🔴) with analyst name/in‑progress/draft/review/overdue/completed/total. |
| **4 – مراجعة الجودة QC** | Per‑test QC mark dialog (PASSED/FAILED + notes). |
| **5 – متابعة SLA** | Tests table filtered by SLA status (ON_TIME/DUE_SOON/DELAYED/COMPLETED). |
| **6 – المواصفات** | Read‑only cards for each active `MicrobiologicalSpecification`: code, name, reference, current version (effective_from/to), limits table (microorganism, n/c/m/M, plan, unit). |
| **7 – التنبيهات** | Alerts panel derived from dashboard KPIs (overdue, urgent, submitted/reviewed counts, QC failures, non‑compliant, success “لا تنبيهات”). |

**Dialogs** (all modal, RTL Arabic, MUI components):

- **Assign analyst**: pick analyst (filtered `LAB_TECHNICIAN`/`LAB_MANAGER`), priority dropdown,
  checkboxes of micro parameters; on submit calls `assignSampleAnalyst` / `setSamplePriority`
  / `setSampleParameters`.
- **Review result**: shows test details, unit results, auto‑evaluation (n/c/m/M) from the
  `evaluate` engine, applicable limits table, decision select (`COMPLIANT`/`NON_COMPLIANT`/`INCONCLUSIVE`/`NOT_APPLICABLE`) and notes; buttons: **اعتماد المراجعة وإحالة للمدير** → `reviewSampleTest`; **إعادة للمحلل** → `returnSampleTest` with reason from list (`exceeded_M`, `exceeded_c`, `method`, `qc`, `sample`, `other`).
- **QC mark**: `qc_status` select + notes → `markSampleTestQC`.
- **Specs viewer**: read‑only expandable cards, limits table (filter `active=true`), not editable.

### 4. Routes & navigation

- **Route**: `<Route path="/app/microbiology" element={withSuspense(<MicrobiologyLabPage />)} />` (AdminLayout).
- **AdminLayout nav**: added `{ label: 'قسم الأحياء الدقيقة', path: '/app/microbiology',
  icon: <BiotechIcon />, roles: ['MICRO_SECTION_HEAD', 'LAB_MANAGER', 'ADMIN'] }`.
- **roleHome**: added `'MICRO_SECTION_HEAD': '/app/microbiology'` so clicking the home button
  from the micro head dashboard navigates to the micro console.

### 5. Frontend verification

- `npx tsc --noEmit` passes with zero errors.
- Vite build exits 0; module transforms at `:3000` work as before.

## Critical Context & Boundary Conditions

- **Bench filter**: micro uses `FoodSample.LabBench.MICROBIOLOGY` (same enum as chemistry CHEMISTRY).
- **Approval workflow**: المحلل → **رئيس المايكرو** (review/return/QC) → **مدير المختبر** (final approve). The micro head cannot call `approve` → 403.
- **Result entry**: micro head cannot `start`/`save-result`/`enter-result`/`evaluate` → 403. These are analyst / coordinator tasks.
- **QC & review**: micro head **can** `mark-qc`, `review`, `return-result` → 200 (but state‑preconditions may return 400 if test not in SUBMITTED/REVIEWED).
- **Spec limits**: fetched via `applicable-limits`; displayed read‑only in the specs tab. No edit UI.
- **Non‑compliant reasons**: standardized list (`exceeded_M`, `exceeded_c`, `method`, `qc`, `sample`, `other`);
  when returning to analyst the reason prefix `[إعادة للتحلیل] <reason>` is auto‑appended.
- **Alerts**: derived from dashboard (`overdue_tests`, `urgent`, `submitted`, `reviewed`,
  `at_risk_tests`, `qc_pending`, `qc_failed`, `non_compliant`). Shown on tab 0 and as a persistent
  panel.
- **User passwords**: all lab accounts `Nqp@Lab2026`; admin `@nqp.gov.sd` unknown (not reset).
- **27 active users** total (roles include DG_MANAGER, CHEM_SECTION_HEAD, FOOD_DIRECTOR,
  SECTOR_MANAGER, STATION_HEAD, CLERK, ACCOUNTANT, various Inspectors, etc.).
- **Backend running** with reception + micro code (restarted ~10:26; pid changes). Token regen
  via `manage.py shell RefreshToken.for_user`.
- **Vite :3000, Backend :8000** both up; micro‑head login verified; dashboard + workload +
  guard matrix all operational.

## Files Modified / Added

| File | Change |
|---|---|
| `backend/apps/accounts/management/commands/seed_rbac.py` | Added `MICRO_SECTION_HEAD` role definition (lines 346‑360). |
| `backend/apps/food_quarantine/views.py` | Added `_block_section_head_tasks` guard; applied to `start`, `save-result`, `enter-result`, `evaluate`, `approve`; added `analyst_workload` action; added `micro_dashboard` action; added `_build_micro_workload` helper. |
| `frontend/src/types/food.ts` | Added `WorkloadItem`, updated `MicroDashboard`, kept `ChemistryDashboard`. |
| `frontend/src/api/endpoints/foodlab.ts` | Added `getMicroBiologyDashboard`, `getMicroWorkload`, `getMicroSpecifications` + imports. |
| `frontend/src/pages/foodlab/MicrobiologyLabPage.tsx` | **New file** – full microbiology section‑head console (8 tabs, 5 dialogs, KPI/alerts/workload/specs). |
| `frontend/src/utils/roleHome.ts` | Added `'MICRO_SECTION_HEAD': '/app/microbiology'` entry. |
| `frontend/src/routes.tsx` | Added `MicrobiologyLabPage` lazy import + `/app/microbiology` route. |
| `frontend/src/components/layouts/AdminLayout.tsx` | Added nav entry `قسم الأحياء الدقيقة` with roles `MICRO_SECTION_HEAD/LAB_MANAGER/ADMIN`. |
| `backend/apps/food_quarantine/models.py` | `LabBench` already had `MICROBIOLOGY`; `LabParameter.bench` same; no model changes needed. |
| `docs/04_Modules/07_Food_Quarantine/Roles-MicrobiologySectionHead.md` | **New doc** (this file). |

## Next Steps (post‑deployment)

1. **End‑to‑end smoke**: as `microhead@nqp.gov.sd` → login → dashboard loads KPIs; assign analyst →
   sample appears under analyst; review result → REVIEWED; attempt `approve` → 403; manager `approve` → APPROVED.
2. **QC flow**: mark QC PASSED → decision auto‑sets to COMPLIANT per engine; mark FAILED → NON_COMPLIANT.
3. **Non‑compliant handling**: review → select NON_COMPLIANT + reason → return to analyst; analyst fixes; micro head re‑reviews.
4. **SLA monitoring**: dashboard alerts for `at_risk_tests` (within 24 h of SLA) and `overdue_tests`;
   workload `load_level` updates in real‑time as tests change status.
5. **Read‑only spec viewer**: verify each active spec renders limits and version dates correctly; no edit buttons visible.
6. **Documentation**: this markdown file distributed to the QA/ops team.
7. **Run full test suite** (`pytest` or project‑specific) to confirm no regressions on existing chemistry/reception flows.