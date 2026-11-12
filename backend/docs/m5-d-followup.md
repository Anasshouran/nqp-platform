# M5-D-ج — Follow-up (deferred)

## Scope (low priority)

### D-M5-D-ج-1: Spot-check additional files from the 98

Beyond the 10 sampled in M5-D-ب, spot-check 20 more files across:
- `pages/food/**` (12 files)
- `pages/airport/**`, `pages/airporthealth/**` (3 files)
- `pages/health/**` (1 file)
- `pages/carriers/**` (4 files)
- `pages/finance/**` (1 file)

Goal: confirm ≥ 80% real tests across a broader sample.

### D-M5-D-ج-2: Coverage gaps

Directories with < 30% function coverage (from Q3):
- Identify via `npm run test:coverage` per-directory report.
- Add targeted tests for uncovered handlers (onClick, onChange, submit).

### D-M5-D-ج-3: e2e (Playwright)

Full-app e2e for critical flows:
- Login + role-based routing
- Registry tree navigation + facility detail
- Role assignment (STATE/LOCALITY/FACILITY pickers)
- Screening flow (port → traveler → screening)

Deferred to M7 (after M6-bis).

## Priority

**Low.** M6-bis (Facility FKs, gated on prod Q7) and M5-E (debts) take precedence.

## Trigger

M5-D-ج starts only when:
1. M6-bis merged (or deferred).
2. M5-E completed.
3. Product requests broader frontend test coverage.
EOF