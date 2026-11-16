# M7-A2c-2-airport — `AirportScreening.reporting_node` (STATE-only)

**Date:** 2026-11-16
**PR:** #206
**Scope:** A (AirportScreening only) · **Policy:** (ii) strict
**Baseline:** 3066 + 0 xfail + 3 skip → **3081 + 0 xfail + 3 skip** (+15)

---

## Discovery correction (PR #205 closed)

PR #205 claimed `airport_health` had **0 FK to any geographic entity**. That was wrong:
the first grep searched for a *field name* `entry_point`, while the actual field is `port`
with a **string reference** to `masterdata.EntryPoint`:

```python
# apps/airport_health/models.py:7
class AirportTerminal(BaseModel):
    port = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.CASCADE,
        related_name='airport_terminals', verbose_name='المنفذ',
    )
```

Chain (3 levels, vs 2 for borders_health):

```
AirportScreening.screening_point
  → ScreeningPoint.terminal
    → AirportTerminal.port            (FK masterdata.EntryPoint)
      → EntryPoint.state_id
        → StateNodeAssignment(state_id, valid_to=NULL, is_primary=True)
          → ReportingNode (kind = STATE)
```

**Lesson:** Discovery must start with a full FK inventory (`grep -nE "models\.(ForeignKey|OneToOneField)\("`),
not a name-targeted search. Field names do not have to match target model names.

---

## Delivered

| Item | Detail |
|---|---|
| Model | `AirportScreening.reporting_node` (nullable, `SET_NULL`, no sync) |
| Migration | `airport_health/0008_airportscreening_reporting_node` — **AddField only** |
| Serializer | `reporting_node` in `AirportScreeningSerializer.Meta.fields` (writable, `allow_null`) |
| Backfill | `backfill_airportscreening_reporting_node` (`--dry-run`, `--limit`) |
| Endpoint | `GET /api/v1/airport/reports/screenings/by-state/` |
| Scoping | `resolve_user_port_ids` (airport module convention — `SectorScopedMixin`) |
| Filter path | `screening_point__terminal__port_id__in` (same as `AirportScreeningViewSet.port_field`) |
| Queries | `select_related('reporting_node')` — no N+1 (≤ 3 queries for 20 rows) |
| Tests | **15** (10 FK/backfill + 5 endpoint, incl. standalone N+1) |

### Files

```
backend/apps/airport_health/models.py                                         (+12)
backend/apps/airport_health/migrations/0008_airportscreening_reporting_node.py (new)
backend/apps/airport_health/serializers.py                                    (+7)
backend/apps/airport_health/management/commands/backfill_airportscreening_reporting_node.py (new)
backend/apps/airport_health/views.py                                          (+~95)
backend/apps/airport_health/urls.py                                           (+6)
backend/apps/airport_health/tests/test_airportscreening_reporting_node.py     (new, 10)
backend/apps/airport_health/tests/test_screenings_by_state_endpoint.py        (new, 5)
backend/docs/m7-a2c-2-airport.md                                              (new)
docs/registry-architectural-decision.md                                       (update)
```

---

## Policy (ii) — strict `count == 1` else NULL

The backfill resolves a STATE node only when **exactly one** active primary assignment exists:

```python
assignments = StateNodeAssignment.objects.filter(
    state_id=state_id, valid_to__isnull=True, is_primary=True,
)
count = assignments.count()
if count == 1:
    ... assignments.first().node          # .first() only inside count == 1
elif count == 0:
    no_state_node += 1
else:
    ambiguous += 1                        # stays NULL — never guess
```

**Delta vs `borders_health` (PR #203, policy i):** borders uses `.first()` on the filtered
queryset (deterministic only because `StateNodeAssignment.Meta.ordering = ['-valid_from']`).
airport uses the stricter rule: multiple actives ⇒ NULL.

`D-M7-A2c-2-policy-delta` — documented; backport to borders is **out of scope** and requires
an explicit owner instruction.

Backfill output keys: `Updated`, `No STATE node` (no active *primary* assignment — includes
`count == 0`), `Ambiguous` (`count > 1`).

---

## LIMITATION — STATE-only

`AirportScreening.reporting_node` holds a **STATE node only**:

- ❌ No LOCALITY — the chain terminates at `EntryPoint.state` (no locality step).
- ❌ No FACILITY — `airport_health` has **no `HealthFacility` FK**; `AirportTerminal.port`
  is the only geographic anchor.

Value delivered: "كم فحص مسافرين في مطار ولاية X" — a STATE-level report. Honest and useful,
but not a facility-level rollup.

---

## Scope A — explicitly NOT included

| Deferred | Chain available | Reason |
|---|---|---|
| `AircraftInspection.reporting_node` | `flight.destination_port` (2 levels — even shorter) | Scope B, needs separate decision |
| `CrewHealthRecord.reporting_node` | `flight.destination_port` (2 levels) | Scope B |
| `AirportStaff` / `AirportActivityLog` | `airport` FK (EntryPoint) | Scope C — staff/audit records, not reporting subjects |
| Frontend UI | — | No forms for airport_health |
| Audit rewrites | — | 0 audit tests reference `airport_health` |

**Note for Scope B:** `Flight.destination_port = FK(EntryPoint, PROTECT, NOT NULL)` means
`AircraftInspection`/`CrewHealthRecord` are *easier* to backfill than `AirportScreening`
(2-level chain). Not implemented here to keep this PR a faithful mirror of A2c-2-borders.

---

## Endpoint contract

`GET /api/v1/airport/reports/screenings/by-state/`

```json
{
  "status": "success",
  "data": {
    "total": 0,
    "matched": 0,
    "node_no_state": 0,
    "unassigned": 0,
    "by_state": [{"state_id": "...", "state_name_ar": "...", "count": 3}],
    "scoped": false,
    "note": "STATE-only. unassigned = no active primary StateNodeAssignment or ambiguous (>1 primary, policy ii → NULL)."
  }
}
```

Reconciliation (asserted at runtime): `total == matched + node_no_state + unassigned`.

- `matched` — `reporting_node.kind == 'STATE'`
- `node_no_state` — defensive bucket: `reporting_node` set but kind ≠ STATE
- `unassigned` — `reporting_node IS NULL` (no/ambiguous assignment, or never backfilled)
- `scoped` — `true` only when an actual port restriction was applied

Scoping contract (`resolve_user_port_ids` → `resolve_authorized_entry_points`):

| Return | Meaning | Endpoint behavior |
|---|---|---|
| `None` | national / GLOBAL scope | no restriction, `scoped=false` |
| `[]` | no resolvable scope | deny all, `scoped=true`, empty payload |
| `[…ids]` | port list | filter by `screening_point__terminal__port_id__in`, `scoped=true` |

---

## Safety verification

- `AircraftInspection`, `CrewHealthRecord`, `AirportStaff`, `AirportActivityLog`,
  `ScreeningPoint`, `AirportTerminal` → **0 diff**
- `AirportScreening.save()` → **not touched** (no `save()` override exists; no sync)
- No signals, no `clean()` changes
- `core/utils/scoping.py` → **0 diff**
- Migration contains **one `AddField`**, no `AlterField` / `RunPython`
- 0 frontend changes, 0 audit rewrites
- `PROD_SCOPING_ENABLED` unchanged (`False`)

---

## Rollback

1. `git revert <merge-commit>`
2. `python manage.py migrate airport_health 0007` (drops `reporting_node`)
3. Endpoint disappears with the revert
4. Zero cross-app impact (no other app consumes `AirportScreening.reporting_node`)

---

## A2c status after this PR

6 apps integrated: **surveillance, laboratory, vector_control, hr, borders_health, airport_health**
3 skipped: screening, vaccination, borders-full (no data source)

**Q7** (staging/prod backfill + `PROD_SCOPING_ENABLED=True`) remains the only gate.
