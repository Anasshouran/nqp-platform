# M7-A2c-2-hr — HR OrgAssignment Registry Integration

**Status:** ✅ Delivered (Phase 1 of A2c-2)
**PR:** #202
**Baseline:** 3038 → 3052 backend

---

## Delivered

| App | Model | Migration | Serializer | Backfill | Endpoint | Tests |
|---|---|---|---|---|---|---|
| hr | OrgAssignment | 0011 (AddField) | OrgAssignmentSerializer | backfill_orgassignment_reporting_node | GET /api/v1/hr/reports/assignments-by-state/ | 14 |

- `reporting_node = FK(ReportingNode, null=True, blank=True, SET_NULL)` on OrgAssignment
- No save() override, no signal on OrgAssignment
- `reporting_node` in serializer `fields` (List + Write)
- Backfill: `facility → HealthFacilityNodeAssignment(valid_to__isnull=True).first().node`, ambiguous → NULL
- `--dry-run` / `--limit` supported
- Reconciliation: `total == matched + node_no_state + unassigned_facility + unassigned_node` (asserted)
- Walk-up over `reporting_node.parent` chain until `kind == 'STATE'` (no N+1)
- Scoping via `resolve_authorized_entry_points(user)` (`entry_point_id__in`)
- `select_related('reporting_node', 'facility', 'sector')`

---

## Phase 0 Notes

- **`OrgAssignment.facility` FK موجود** (M6-bis، D-M5-C-F-1) — لا حاجة لإضافة FK جديد
- **0 dev rows** — backfill = 0 في dev، القياس الحقيقي @ Q7
- **0 audit tests affected** — لا اختبار موجود يشير إلى registry isolation لـ hr

---

## What's NOT in Phase 2-hr

- **No frontend** — 0 UI forms for OrgAssignment creation
- **No audit rewrites** — 0 tests affected
- **Real measurement** — deferred to Q7 (0 dev rows in OrgAssignment)

---

## Rollback

1. `git revert <merge-commit>` (PR #202)
2. `migrate organization 0010_orgassignment_facility` (drops reporting_node)
3. Endpoint removed (urls.py revert)
4. 0 impact on other apps (independent)

---

## Related

- A2c-1: `m7-a2c-1.md` (PR #201)
- A2c Discovery: `m7-a2c-discovery.md` (PR #198)
- A2c-2 Discovery: `m7-a2c-2-discovery.md` (this branch, deleted after decision)
- ADR: `docs/registry-architectural-decision.md`
