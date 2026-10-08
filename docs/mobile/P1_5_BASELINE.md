# AFYATNA MOBILE — PHASE 1.5
# P1.5 BASELINE

**Date:** 2026-10-08  
**Purpose:** capture repository integrity at the start of Phase 1.5 and classify every change stream (§4).

---

## 1. Captured State (start of Phase 1.5)

```text
branch: main
git status --short   → 398 entries
  modified tracked files: 233 (pre-existing at M0) + 2 (ours, Phase-1) = 235
  untracked: 154 entries (pre-existing + Phase-1 additions)
git log -1: feb29d7 feat(design): add accessibility primitives and a density scale
```

## 2. Change-stream Classification

| Stream | Definition | Inventory |
|---|---|---|
| **PRE_EXISTING_MODIFICATIONS** | Present in working tree before Phase 1 (M0 baseline, 368 entries incl. 233 tracked + untracked `borders_health/`, `hr/`, `shipping/`, many tests, migrations, etc.) | `git status` M0 snapshot in `docs/mobile/M0_BASELINE_REPORT.md` §0; **not to be reverted or overwritten** |
| **PHASE_1_MODIFICATIONS** | Added by M0→M1 execution (authored set): | See list below |
| **PHASE_1.5_MODIFICATIONS** | Added during this phase | Recorded at end in `P1_5_FINAL_ACCEPTANCE_REPORT.md` §Files Changed |

### Phase-1 additions inventory (untracked → will remain working-tree additions unless committed)

```text
.github/workflows/m1-mobile.yml
backend/apps/mobile_api/            (app: envelope, classification, serializers, views, urls, tests, snapshot)
contracts/                          (@afyatna/contracts shared package)
mobile/                             (Expo SDK 57 bootstrap + M1 foundations)
docs/mobile/                        (M0/M1 reports)
scripts/m1_measure_perf.py
```

Tracked-file edits from Phase-1 (only two; both additive):

```text
backend/nqp_backend/settings.py   +1 line  ('apps.mobile_api' in INSTALLED_APPS)
backend/nqp_backend/urls.py       +2 lines (mobile include + comment)
```

(`git diff --stat` also lists carriers/integration/public/vaccination `urls.py` and other files — these are **pre-existing** modifications, not authored by Phase-1.)

## 3. Phase-1.5 Modification Rules

- Author only: `backend/apps/travelers/views.py`, `backend/apps/screening/views.py`, `backend/apps/vaccination/views.py`, `backend/apps/public/views.py` (QR fail-closed), tests + docs — each change is scoped to a confirmed finding.
- No destructive migrations, no data deletion, no rewrite of unrelated apps (§24).
- All new/changed behavior is covered by runtime tests (§22/§23).

## 4. Integrity Check

Pre-existing work preserved: **YES** (this document + M0 report provide the audit trail; no pre-existing file reverted).