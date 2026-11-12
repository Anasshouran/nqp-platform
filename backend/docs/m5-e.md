# M5-E — Small UX Debts

## Summary

Closed 3 small UX debts from M4-4. Frontend-only. No backend, no migrations.

| Debt | Change | Files |
|---|---|---|
| D-M4-3-6 | Virtual root banner for STATE users (context clarity) | `RegistryTreePage.tsx` + i18n |
| D-M4-4-B-3 | Clickable FACILITY breadcrumb in TreePositionTab | `TreePositionTab.tsx` |
| D-M4-4-C-5 | Pagination for OwnershipTab (Load more + Showing N of M) | `registry.ts` + `OwnershipTab.tsx` + i18n |

## D-M4-3-6 — Virtual Root Banner

STATE/LOCALITY users see their scoped subtree without a FEDERAL root. Added a small banner:
> "أنت تعرض نطاق: {{name}}" / "You are viewing: {{name}}"

Rendered only when `!hasFederalRoot && nodes.length > 0`, above the root picker.

## D-M4-4-B-3 — Clickable FACILITY Breadcrumb

`TreePositionTab` now renders FACILITY ancestors (with `facility_id`) as `MuiLink` → `/app/registry/facility/{facility_id}`. STATE/LOCALITY/DEPARTMENT ancestors remain non-clickable Chips.

Note: `ReportingNode` has no `facility_id` field; linkability depends on the node carrying `facility_id` (cast). Backend enrichment (adding `facility_id` to `/nodes/` or using tree endpoint) is a follow-up if full clickability is needed.

## D-M4-4-C-5 — Pagination (minimum)

- Added `PaginatedResponse<T>` interface + `listFacilityOwnershipsPaginated(facilityId, page)` (page_size 50).
- `OwnershipTab` now uses paginated fetch with "Load more" button + "Showing N of M" counter.
- Applied to OwnershipTab only (minimum). Supervision/Services/Departments tabs remain on `LIST_PARAMS` (500 cap) — follow-up M5-E-ب.

## i18n

Added keys:
- `registry.tree.virtual_root`
- `registry.common.load_more`
- `registry.common.showing_n_of_m`

## Tests

- Before: 827
- After: **831** (+4: virtual root banner, clickable FACILITY breadcrumb, OwnershipTab load-more, hide-when-no-more)
- `npm run test`: 831 passed
- `npm run build`: ✓
- `npx tsc --noEmit`: exit 0
- Coverage thresholds maintained

## DoD

- [x] D-M4-3-6: virtual root banner (ar + en)
- [x] D-M4-4-B-3: clickable FACILITY breadcrumb
- [x] D-M4-4-C-5: pagination minimum (OwnershipTab)
- [x] 4 new tests (827 → 831)
- [x] `npm run test` + `npm run build` + `tsc --noEmit` = 0
- [x] Coverage thresholds maintained
- [x] `m5-e.md` present
- [x] No backend changes
- [x] No migrations

## Deferred (M5-E-ب)

- Supervision/Services/Departments pagination (same pattern)
- `facility_id` enrichment on `/nodes/` endpoint for full breadcrumb clickability
- D-M4-4-C-5 initial-50-limit test (deferred per M5-E Fix Prompt Fix 3)
- Playwright e2e (M7)
EOF
echo "created"