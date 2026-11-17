# M7-A2c-2-borders Option 2 — QuarantineCase (STATE-only)

**Status:** ✅ Delivered (Option 2)
**PR:** #204
**Baseline:** 3052 → 3066 backend (+14)

---

## Delivered

| App | Model | Migration | Serializer | Backfill | Endpoint | Tests |
|---|---|---|---|---|---|---|
| borders_health | QuarantineCase | 0008 (AddField) | QuarantineCaseSerializer | backfill_quarantinecase_reporting_node | GET /api/v1/borders-health/reports/quarantine-cases/by-state/ | 14 |

- `reporting_node = FK(ReportingNode, null=True, blank=True, SET_NULL)` on QuarantineCase
- No save() override, no signal on QuarantineCase
- `reporting_node` in serializer `fields` (List + Write)
- Backfill: `crossing.entry_point.state_id → StateNodeAssignment → STATE node`
- `--dry-run` / `--limit` supported
- Reconciliation: `total == matched + unassigned` (STATE-only, 2 buckets)
- Scoping via `resolve_authorized_entry_points(user)` (`crossing__entry_point_id__in`)
- `select_related('reporting_node', 'crossing__entry_point')`

---

## Limit — STATE-only

**`QuarantineCase.reporting_node` = STATE node فقط** (ليس LOCALITY/FACILITY).

**السبب:** مرحلة 0 (PR #203) أثبتت:
- `BorderFacility.health_facility` FK = غير موجود
- لا يوجد مصدر بيانات لربط `BorderFacility` بـ `HealthFacility`
- `IsolationCase.facility` = FK(BorderFacility، ليس HealthFacility)
- Option 4-full = 9-10 أيام بلا قيمة بدون مصدر بيانات

**القيمة:** "كم حالة حجر في ولاية X" — تقرير فعلي موجود اليوم.

**المستقبل:** إن توفّر مصدر بيانات (CSV من وزارة الصحة / admin UI للربط اليدوي)، Option 4-full = PR منفصل مع `BorderFacility.health_facility` FK + `IsolationCase.reporting_node`.

## ما ليس ضمن Option 2

- `BorderFacility.health_facility` FK — غير موجود، لا تعديل
- `IsolationCase.reporting_node` — خارج النطاق
- `BorderCrossing` — لا تعديل (entry_point OneToOne موجود)
- LOCALITY/FACILITY nodes — مؤجل (يتطلب مصدر بيانات)
- Frontend UI — لا forms
- Audit test rewrites — 0 متضرر

## Rollback

1. `git revert <merge-commit>` (PR #204)
2. `migrate borders_health <previous>` (drops reporting_node)
3. Endpoint removed (urls.py revert)
4. 0 impact على hr/lab/vector/surveillance (تطبيقات مستقلة)

---

## Related

- A2c-1: `m7-a2c-1.md` (PR #201)
- A2c-2-hr: `m7-a2c-2-hr.md` (PR #202)
- A2c-2-borders Phase 0: `m7-a2c-2-borders-mapping.md` (PR #203) — يوثق سبب Skip borders full
- A2c Discovery: `m7-a2c-discovery.md` (PR #198)
- ADR: `docs/registry-architectural-decision.md`
