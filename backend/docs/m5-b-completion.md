# M5-B Completion Report

**Branch:** `feat/organizational-registry-m5`
**Sub-phases:** M5-B-1, M5-B-2, M5-B-3, M5-B-4
**Commits:** `4627af1` (M5-B-1) + `f31d605` (M5-B-2) + `f050536` (M5-B-3) + `<M5-B-4 hash>` (M5-B-4 docs) *(pending)*

## Closed Hypotheses

| Hypothesis | Status | Sub-phase |
|---|---|---|
| H3 (screening STATE) | ✅ CLOSED | M5-B-2 |
| H4 (HR STATE) | ✅ CLOSED | M5-B-3 |
| H5 (lab/vector STATE) | 🟡 PARTIAL (entry_point-bearing models) | M5-B-1 |
| H1′ (user.sector_id grant policy) | ✅ CONFIRMED (policy) | M5-B-4 |
| H2 (asserts_geographic_scope) | ✅ CLOSED (M5-A-3 FIX-1) | M5-A-3 |
| H1 (widening) | ✅ REFUTED (pinned guard) | M5-A-2 |

## Remaining xfail

- D-M5-B-1: `test_vector_control_h5.py::test_state_user_sees_own_state_vector_unit` — sector-only model
  (`xfail(strict=True)`); resolution requires M6 decision
- Stale marker (M5-B-T): `test_state_widening_h1.py:135` (`H5 reason`, currently xpassed) — to be removed in M5-B-T

## Deltas (all H1′-consistent)

See `m5-a-audit.md` §9 and `m5-b-known-debt.md` → "Deltas introduced in M5-B".
Enforcement suite `test_h1prime_consistency.py` lands in M5-B-T.

## Baseline

- Before M5-B: **420 passed + 5 xfailed** (M5-A-3 tip)
- After M5-B docs commit: **433 passed + 1 xfailed + 1 xpassed**
- After M5-B-T (planned): **~441 passed + 1 xfailed + 0 xpassed**

## What's NOT in M5-B

- LOCALITY / FACILITY scopes (M5-C)
- Vitest (M5-D)
- D-M5-B-1 resolution (M6 — requires `Sector.state_ids` or equivalent)
- `surveillance` / `vaccination` / `borders_health` (already H6 GREEN — no changes)
- `m5-a-known-debt.md` (full debt inventory)

**M5-B CLOSED** (pending M5-B-T final regression)
