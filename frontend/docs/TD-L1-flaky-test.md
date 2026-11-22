# TD-L1 — Flaky test in `NationalFinancePage.functional.test.tsx`

## Symptom
`NationalFinancePage.functional.test.tsx` occasionally times out (10s) on
the first run after a fresh test DB. A retry passes 100%.

## Root cause (suspected)
The page refreshes many read endpoints in parallel on mount (`summary`,
`invoices`, `payments`, `receipts`, `fees`, reports). On a cold test DB the
first mount can exceed the default 10s timeout — a timing issue, not a
logical failure.

## Related production defect (documented, not fixed here)
`ProcessNull()` calls `useTranslation()` but is invoked as a plain function
from the home view. Switching views removes those hooks and React 19 throws
"Rendered fewer hooks than expected". The test file therefore keeps a
deliberate hook-free `vi.mock('react-i18next')` so the real Arabic strings are
still asserted via the real i18n instance. **F5d does not remove this mock** —
fixing the conditional hook requires a production change and is out of scope.

## Mitigation (current)
- Retry on failure.
- `F15` assertions in this PR only check endpoint call counts on mount; no
  view switching is added that would trigger the conditional-hook defect.

## Long-term options
1. Raise `testTimeout` to 15s for this file only.
2. Split the mock setup into smaller `describe` blocks.
3. Fix the conditional `useTranslation()` call in `ProcessNull()` in a
   dedicated production PR, then remove the hook-free mock.

## Tracking
- Observed since F5a (label maps refactor).
- Owner: TBD.
