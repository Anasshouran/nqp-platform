# Q7 — A2c Adoption Runbook (VPS Session)

> **Status:** Pending execution — blocked on VPS SSH access.
> **Owner:** TBD (requires SSH key + maintenance window approval).
> **Prerequisites:** 8 backfill commands merged (A2c-1/2/3 + vaccination).
> **Decision criteria:** `backend/docs/m7-a2c-discovery.md` §5.

---

## 1. Preconditions

### 1.1 Access
- [ ] VPS SSH key available (`~/.ssh/nqp_vps` — verify with infra team)
- [ ] DNS: `staging.afyatna.com` / production host resolves
- [ ] `PROD_SCOPING_ENABLED=False` currently in `settings.py:32-35` (default)
- [ ] Maintenance window approved (backfills are idempotent, flag flip is not)

### 1.2 Backup
- [ ] `pg_dump` the 6 target apps' tables + `organization_*`
- [ ] Snapshot `PROD_SCOPING_ENABLED` in `.env` (current value)
- [ ] Record current `MigrationRecorder` state:
  ```sql
  SELECT app, name FROM django_migrations
  WHERE app IN ('airport_health','borders_health','laboratory',
                'organization','screening','surveillance',
                'vaccination','vector_control')
  ORDER BY app, name;
  ```

### 1.3 Baseline measurement (BEFORE backfill)
- [ ] Count rows with `reporting_node_id IS NULL` per app:
  ```sql
  SELECT 'surveillance' AS app, COUNT(*) FROM surveillance_healthcase WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'laboratory', COUNT(*) FROM laboratory_labsample WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'airport_health', COUNT(*) FROM airport_health_airportscreening WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'borders_health', COUNT(*) FROM borders_health_quarantinecase WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'screening', COUNT(*) FROM screening_healthscreening WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'vaccination', COUNT(*) FROM vaccination_vaccinationrecord WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'vector_control', COUNT(*) FROM vector_control_vectorunit WHERE reporting_node_id IS NULL
  UNION ALL SELECT 'organization', COUNT(*) FROM organization_orgassignment WHERE reporting_node_id IS NULL;
  ```

---

## 2. Phase 1 — Dry-run all backfills

Run each command with `--dry-run --limit 5` to verify syntax + safe state.

```bash
cd /path/to/backend
source /path/to/venv/bin/activate
export DJANGO_SETTINGS_MODULE=nqp_backend.settings

python manage.py backfill_healthcase_reporting_node --dry-run --limit 5
python manage.py backfill_labsample_reporting_node --dry-run --limit 5
python manage.py backfill_airportscreening_reporting_node --dry-run --limit 5
python manage.py backfill_quarantinecase_reporting_node --dry-run --limit 5
python manage.py backfill_healthscreening_reporting_node --dry-run --limit 5
python manage.py backfill_vaccinationrecord_reporting_node --dry-run --limit 5
python manage.py backfill_vectorunit_reporting_node --dry-run --limit 5
python manage.py backfill_orgassignment_reporting_node --dry-run --limit 5
```

**Decision point:** For each command, if `--dry-run` reports `ambiguous > 0`:
- Record the count + sample rows.
- **Do NOT proceed to Phase 2 for that app** — investigate ambiguity first.

---

## 3. Phase 2 — Execute backfills

**Order:** surveillance first (pilot), then others one at a time.

```bash
# Pilot
python manage.py backfill_healthcase_reporting_node

# Wait for completion, then:
python manage.py backfill_labsample_reporting_node
python manage.py backfill_airportscreening_reporting_node
python manage.py backfill_quarantinecase_reporting_node
python manage.py backfill_healthscreening_reporting_node
python manage.py backfill_vaccinationrecord_reporting_node
python manage.py backfill_vectorunit_reporting_node
python manage.py backfill_orgassignment_reporting_node
```

**After each app:** re-run the count query from §1.3. Record Δ rows filled.

**Abort criteria:** if a command fails → STOP, do not proceed, capture traceback + notify.

---

## 4. Phase 3 — Flip `PROD_SCOPING_ENABLED`

### 4.1 Per-app endpoints (baseline — flag still False)
| App | Endpoint | Expected (flag=False) |
|---|---|---|
| surveillance | `GET /api/v1/surveillance/reports/by-state/` | 200 |
| laboratory | `GET /api/v1/laboratory/reports/by-state/` | 403 / empty |
| vector_control | `GET /api/v1/vector-control/reports/by-state/` | 403 / empty |
| screening | `GET /api/v1/screening/reports/screenings/by-state/` | 403 / empty |
| airport_health | `GET /api/v1/airport/reports/screenings/by-state/` | 403 / empty |
| borders_health | `GET /api/v1/borders-health/reports/quarantine-cases/by-state/` | 403 / empty |
| vaccination | `GET /api/v1/vaccination/reports/records/by-state/` | 403 / empty |
| hr | `GET /api/v1/hr/reports/assignments-by-state/` | 403 / empty |

### 4.2 Flip
```bash
# On VPS:
echo 'PROD_SCOPING_ENABLED=True' >> /path/to/backend/.env
sudo systemctl restart nqp-backend   # أو docker-compose restart backend
```

### 4.3 Post-flip smoke test
- [ ] `GET /api/v1/health/` → 200
- [ ] Each of the 8 endpoints above → 200 with data (for facility-scoped user)
- [ ] Login + dashboard load → no 500
- [ ] Log inspection (last 5 min): `journalctl -u nqp-backend -n 200 | grep -i error`

**Abort criteria:** any 500 or unhandled exception → **revert flag to False immediately** (§7.1) + capture logs.

---

## 5. Phase 4 — Adoption measurement (7 days)

### 5.1 Prod rows (daily)
```sql
SELECT 'surveillance' AS app, COUNT(*) AS total,
       COUNT(reporting_node_id) AS with_node,
       COUNT(*) - COUNT(reporting_node_id) AS missing
FROM surveillance_healthcase
UNION ALL
SELECT 'laboratory', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM laboratory_labsample
UNION ALL
SELECT 'airport_health', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM airport_health_airportscreening
UNION ALL
SELECT 'borders_health', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM borders_health_quarantinecase
UNION ALL
SELECT 'screening', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM screening_healthscreening
UNION ALL
SELECT 'vaccination', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM vaccination_vaccinationrecord
UNION ALL
SELECT 'vector_control', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM vector_control_vectorunit
UNION ALL
SELECT 'hr', COUNT(*), COUNT(reporting_node_id), COUNT(*) - COUNT(reporting_node_id)
FROM organization_orgassignment;
```
Record: `date | app | total | with_node | missing`

### 5.2 Endpoint usage (weekly) — per-app URLs
```bash
# From nginx access log — adapt paths to §4.1 table
for path in \
  /api/v1/surveillance/reports/by-state/ \
  /api/v1/laboratory/reports/by-state/ \
  /api/v1/vector-control/reports/by-state/ \
  /api/v1/screening/reports/screenings/by-state/ \
  /api/v1/airport/reports/screenings/by-state/ \
  /api/v1/borders-health/reports/quarantine-cases/by-state/ \
  /api/v1/vaccination/reports/records/by-state/ \
  /api/v1/hr/reports/assignments-by-state/; do
  count=$(grep -c "$path" /var/log/nginx/access.log)
  echo "$path → $count"
done
```
Record requests/day per endpoint.

### 5.3 Proposed adoption threshold (to be confirmed with product)
> **Note:** `m7-a2c-discovery.md` §121 defines the *dev* criterion
> (`dev rows > 0 AND routes > 0`). Translating to prod is a **proposal**,
> not a quoted rule. Adjust with product owner before making a decision.

**Proposed threshold:**
- App is "adopted" if **prod rows with reporting_node_id > 0** AND **by-state requests/week > 0**.
- **surveillance** is the pilot — its result gates the decision regardless of others.

---

## 6. Phase 5 — Decision matrix (after 7 days)

| surveillance | Any other app | Decision |
|---|---|---|
| ✅ adopted | ✅ adopted | **Expand A2c** — fund next integrations |
| ✅ adopted | ❌ 0 | **Keep surveillance only** — do not invest further in A2c |
| ❌ 0 | — | **Rollback A2c fully** — unjustified |

Record decision in `backend/docs/m7-a2c-adoption-results.md` (new file, out of Q7 scope).

---

## 7. Rollback procedures

### 7.1 Emergency flag rollback (do first)
```bash
# On VPS:
sed -i 's/^PROD_SCOPING_ENABLED=True/PROD_SCOPING_ENABLED=False/' /path/to/backend/.env
sudo systemctl restart nqp-backend
```

### 7.2 Per-app migration rollback (only if A2c fully rolled back)
Actual migration names (verified from origin/main):

| App | Forward migration | Rollback target | Impact |
|---|---|---|---|
| laboratory | `0007_labsample_reporting_node` | `0006_labsample_facility` | drops `reporting_node_id` column |
| vector_control | `0003_vectorunit_reporting_node` | `0002_*` (verify name) | drops `reporting_node_id` column |
| borders_health | (see `m7-a2c-2-borders.md` §49) | (verify) | STATE-only |
| organization | (see `m7-a2c-2-hr.md` §43) | (verify) | OrgAssignment |
| screening | (see `m7-a2c-3-screening.md` §147) | (verify) | DROP COLUMN |
| vaccination | (see `m7-a2c-vaccination.md` §147) | (verify) | DROP COLUMN |
| airport_health | (verify with `showmigrations`) | (verify) | — |
| surveillance | **DO NOT rollback** — core to M6 | — | — |

**Before rollback:**
```bash
python manage.py showmigrations <app>   # confirm exact name
```

**Example:**
```bash
python manage.py migrate laboratory 0006_labsample_facility
```

Each app rollback is independent. Surveillance remains untouched.

---

## 8. Out of scope

- Writing new backfill commands — already exist
- Modifying `PROD_SCOPING_ENABLED` logic — already correct
- Expanding to new apps — Phase 6, gated on §6 decision
- B-3 (staging DB migration verify) — separate pending-external item
