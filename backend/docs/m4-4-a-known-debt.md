# M4-4-A Known Debt — State Picker + Tree UX Polish

## D-M4-4-A-1: State picker UX

**الوضع:** Picker uses Autocomplete over all states (page_size=500). For large deployments, may be slow.

**الحل (M4-4-B):** server-side search with `?search=` param.

## D-M4-4-A-2: Helper unit test coverage

**الوضع:** `_visible_reporting_node_ids` has 3 unit tests (superuser, plain, state). Missing: SECTOR, combined STATE+SECTOR, historical assignment leak.

**الحل (M4-4-B):** add 3 more unit tests.

## D-M4-4-A-3: D-M4-3-6 partial

**الوضع:** Banner added for non-superuser. STATE user still sees state node as visual root (depth preserved but parent null in output). Minor UX confusion remains.

**الحل (M4-4-B):** adjust depth display or add "scope indicator" in UI.
