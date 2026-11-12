# M6 Discovery Report — Sector.state_ids + Facility FKs

**المرحلة:** M6 Discovery (read-only)
**الفرع:** `feat/organizational-registry-m6` (من `main@3f01600`)
**البيئة:** dev (COUNTs) + staging/prod (قوالب جاهزة للمالك)
**الحالة:** **لا كود، لا migrations، لا ScopeType جديدة.**

---

## Executive Summary

1. **Dev data فارغة** — 0 EntryPoints، 0 HealthScreening، 0 LabSample، 0 VectorUnit، 0 OrgAssignment. **Q1/Q7 على dev تُعطي 0% — غير تمثيلية.** prod counts (قوالب جاهزة) هي التي تحسم M2M vs derivation.
2. **`Sector` لا يملك `state_id`** (لا FK، لا M2M) — Option B derivation (EntryPoint.sector → distinct state) **يُمكن** أن يكون كافياً، إن كانت ≥ 70% من Sectorات prod لها EntryPoints. **لا يمكن تحديد ذلك من dev.**
3. **`Locality` لا يملك `state_id`** (M0-bis) → Option C (derivation عبر locality) **يحتاج migration** إضافي. **لا توصية** قبل prod counts.
4. **Q4 (model-by-model):** 9 نماذج في D-M5-B-1:
   - `LabEquipment`, `QCRecord`: `sector` FK → derive عبر `sector → state_ids` M2M (أو derivation إذا M2M نُفِّذ).
   - `LabSample`, `SampleTest`: `entry_point` + `sector` FK → derive state مباشرة عبر `entry_point__state_id` (لا حاجة M2M).
   - `VectorUnit`: `sector` FK فقط → نفس LabEquipment.
   - `Reagent`, `ReagentLot`, `MaterialIssue`, `NonConformity`, `CapaRecord`, `CriticalResultNotification`: **لا `sector` FK (transitive)** — derive عبر `reagent.sector`، `lot.reagent.sector`، `non_conformity.sector`، `test.sample.sector` (لا حاجة M2M، derivation chains موجودة).
5. **Q7 (Facility FKs):** 4 نماذج (OrgAssignment, HealthScreening, LabSample, VectorUnit) — **كلها 0 rows في dev**. Backfill volume يُحدد على prod. توصية: **derive facility via entry_point/sector على prod أولاً** قبل migration FK (Q7a-d).
6. **Q8:** `asserts_geographic_scope` لا يحتوي FACILITY (D-M5-C-F-4). **توصية: إبقاء fail-closed** (لا إضافة FACILITY) ما لم يُطلب port_health/shipping FACILITY explicitly — port domain ≠ facility domain.
7. **القرار (M2M vs derivation) يعتمد على prod counts** — dev 0% derivation is an artifact, not a signal.

---

## Q1 — Sector + EntryPoint coverage (dev)

| metric | dev value | prod (owner to run) |
|---|---|---|
| `Sector` count | **7** | Q1-template |
| `EntryPoint` count | **0** | Q1-template |
| Sectors with `ep_count > 0` | **0 (0%)** | Q1-template |
| Sectors with `ep_count = 0` | **7 (100%)** | Q1-template |

**Per-sector (dev):**

| Sector code | ep_count |
|---|---|
| RED_SEA | 0 |
| EL_OBEID | 0 |
| NORTHERN | 0 |
| KASSALA | 0 |
| KORDOFAN | 0 |
| GEDAREF | 0 |
| KHARTOUM | 0 |

**Dev states:** 4 · **Dev localities:** 6 · **Dev facilities:** 12 (0 with entry_point) · **Dev entry_points:** 0.

> **Dev is not representative** — all fixtures live in tests, not in the dev DB. Prod counts are decisive.

---

## Q2 — Derivation viability (Option B)

**Rule:**
- ≥ 70% sectors with `ep_count > 0` → Option B suffices (no M2M).
- 30–70% → hybrid (B + manual M2M override).
- < 30% → M2M necessary.

**Dev result:** 0% (artifact). **Decision pending prod counts.**

**Recommendation:** Plan for **hybrid** (B + manual M2M override) as the safe default — it covers both cases without a second migration if prod counts surprise us. If prod ≥ 70%, drop the M2M table (keep derivation only).

---

## Q3 — VectorUnit derivation

**Model fields (from code):** `code`, `name_ar`, `kind`, `sector` (FK → organization.Sector, CASCADE), `description`, `is_active`. **No** `entry_point`, `locality`, `facility`, `state`.

**Can VectorUnit derive state directly?** **No.** Only `sector` FK.

**Path to state:** `VectorUnit.sector_id → Sector.state_ids (M2M) → State`. Requires M2M (or a sector→state map) — **no direct derivation**.

**Conclusion:** VectorUnit is the **canonical case for M2M** (or a `Sector.state_ids` array). It cannot be solved by derivation alone.

---

## Q4 — Model-by-model derivation table (D-M5-B-1)

| Model | entry_point? | locality? | sector? | facility? | Derivation possible? | Mechanism |
|---|---|---|---|---|---|---|
| LabEquipment | ❌ | ❌ | ✅ | ❌ | Via `sector → state_ids` (M2M) | `sector_field='sector'`, `state_path='sector__state_ids'` (M2M) |
| Reagent | ❌ | ❌ | ❌ (via `reagent.sector`) | ❌ | Via `reagent.sector → state_ids` | `sector_field='sector'`, `state_path='reagent__sector__state_ids'` |
| ReagentLot | ❌ | ❌ | ❌ (via `lot.reagent.sector`) | ❌ | Via `lot.reagent.sector → state_ids` | `sector_field='reagent__sector'` (chain) |
| MaterialIssue | ❌ | ❌ | ❌ (via `lot.reagent.sector`) | ❌ | Via `lot.reagent.sector → state_ids` | `sector_field='lot__reagent__sector'` (chain) |
| QCRecord | ❌ | ❌ | ✅ | ❌ | Via `sector → state_ids` (M2M) | `sector_field='sector'` |
| NonConformity | ❌ | ❌ | ❌ (via `non_conformity.sector`) | ❌ | Via `non_conformity.sector → state_ids` | `sector_field='sector'` (on NonConformityViewSet) |
| CapaRecord | ❌ | ❌ | ❌ (via `non_conformity.sector`) | ❌ | Via `non_conformity__sector → state_ids` | `sector_field='non_conformity__sector'` |
| CriticalResultNotification | ❌ | ❌ | ❌ (via `test.sample.sector`) | ❌ | Via `test.sample.sector → state_ids` | `sector_field='test__sample__sector'` |
| VectorUnit | ❌ | ❌ | ✅ | ❌ | Via `sector → state_ids` (M2M) | `SectorFieldScopedMixin`? (VectorUnit uses `resolve_user_port_ids`-style? check) |
| **LabSample** | ✅ | ❌ (via EP) | ✅ | ❌ | **Direct: `entry_point__state_id`** (already declared) | `state_path='entry_point__state_id'` ✅ already |
| **SampleTest** | ✅ (via sample) | ❌ | ❌ | ❌ | **Direct: `sample__entry_point__state_id`** (already declared) | `state_path='sample__entry_point__state_id'` ✅ already |

**Key insight:** LabSample + SampleTest **already derive state directly** (no M2M needed). All other 9 models need `Sector.state_ids` M2M (or a sector→state map). **No direct entry_point derivation possible for them** (they lack the FK).

**Conclusion for M6:** M2M (or equivalent sector→state map) is required for the 9 sector-only models. Derivation alone covers only LabSample/SampleTest (already done).

---

## Q5 — Locality.state FK

**Result:** `organization.Locality` has **no** `state` FK (only `sector` FK). Confirmed from code (`Locality` model fields: `code, name_ar, name_en, sector, location, description, order, is_active`).

**Impact:** Option C (derivation via `locality → state`) **requires a migration** (`Locality.state_id` nullable FK + backfill). Not recommended unless prod shows `entry_point` coverage < 70% (i.e., sectors derive states poorly).

**Recommendation:** Prefer `Sector.state_ids` M2M (Option A) over `Locality.state_id` FK (Option C) — M2M is more flexible and avoids a second migration chain.

---

## Q6 — Alternatives to M2M per model

| Model | Alternative to M2M? | Verdict |
|---|---|---|
| LabEquipment | None (only sector) | M2M needed |
| QCRecord | None (only sector) | M2M needed |
| VectorUnit | None (only sector) | M2M needed |
| Reagent | None (only sector via reagent.sector) | M2M needed (chain) |
| ReagentLot | None (only sector via lot.reagent.sector) | M2M needed (chain) |
| MaterialIssue | None (only sector via lot.reagent.sector) | M2M needed (chain) |
| NonConformity | None (only sector) | M2M needed |
| CapaRecord | None (only sector via non_conformity.sector) | M2M needed (chain) |
| CriticalResultNotification | None (only sector via test.sample.sector) | M2M needed (chain) |

**Conclusion:** M2M is unavoidable for the 9 sector-only models. Derivation (Option B) covers 0% of them (they lack entry_point). LabSample/SampleTest already solved.

---

## Q7 — Facility FK backfill (M6-bis Discovery)

### Dev counts (non-representative)

| Debt | Model | FK needed | dev total | dev with link | backfill % (dev) |
|---|---|---|---|---|---|
| D-M5-C-F-1 | `OrgAssignment` | `facility` | **0** | 0 | n/a |
| D-M5-C-F-2 | `HealthScreening` | `facility` | **0** | 0 | n/a |
| D-M5-C-F-3 | `LabSample` | `facility` | **0** | 0 | n/a |
| D-M5-C-F-3 | `VectorUnit` | `facility` | **0** | 0 | n/a |

### Prod/staging templates (owner to run)

```sql
-- Q7a: OrgAssignment backfill (HR)
SELECT COUNT(*) AS total_active,
       COUNT(*) FILTER (WHERE entry_point_id IS NOT NULL) AS with_ep
FROM organization_orgassignment
WHERE is_active = true;

-- Q7b: HealthScreening backfill (via port → healthfacility)
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE port_id IS NOT NULL) AS with_port
FROM screening_healthscreening;

-- Q7c: LabSample backfill (via entry_point → healthfacility)
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE entry_point_id IS NOT NULL) AS with_ep
FROM laboratory_labsample;

-- Q7d: VectorUnit backfill (via sector → facilities in sector)
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE sector_id IS NOT NULL) AS with_sector
FROM vector_control_vectorunit;
```

### Decision rule

| Backfill % | Decision |
|---|---|
| ≥ 50% | M6-bis آمن (FK + backfill) |
| 30–50% | M6-bis with cleanup phase first |
| < 30% | Derivation-only (no FK) — derive facility via entry_point/sector at runtime |

### Facility FKs already absent (confirmed via grep)

- `OrgAssignment`: sector, entry_point, department, station — **no facility**.
- `HealthScreening`: traveler, port, officer — **no facility**.
- `LabSample`: sector, entry_point, section, collector — **no facility**.
- `VectorUnit`: sector — **no facility**.

**Conclusion:** M6-bis needs schema migrations on 4 models. Backfill volume determines feasibility.

---

## Q8 — `asserts_geographic_scope` + FACILITY

**Current state:** `asserts_geographic_scope` checks `SECTOR_LIKE_SCOPES + ENTRY_POINT_SCOPES + ('DEPARTMENT', 'STATION', 'STATE', 'LOCALITY')`. **FACILITY is absent.**

**After M6-bis (facility FKs):** Should FACILITY be added to port_health/shipping?

| Option | Effect | Recommendation |
|---|---|---|
| **A (keep absent)** | port_health/shipping stay fail-closed for FACILITY → COMPANY-only hybrid (D-M5-C-F-4). | ✅ **Recommended** — port domain ≠ facility domain, no widening |
| **B (add FACILITY)** | Hybrid FACILITY+COMPANY users see ports derived from facilities (needs facility→port derivation) | ❌ Requires `FACILITY → port` derivation (via `HealthFacility.entry_point`) — adds complexity, may leak facility-derived ports |

**Recommendation:** **Option A** — keep fail-closed. D-M5-C-F-4 remains as UX debt (documented). Revisit only if product explicitly requires facility-derived ports.

---

## Recommendations

### M6 scope (Sector.state_ids)

| Decision | Recommendation |
|---|---|
| M2M vs derivation | **M2M (Option A)** — derivation covers 0% of the 9 models |
| Migration | 1 migration on `organization.Sector` (M2M `state_ids` → `masterdata.State`) |
| state_path declarations | Add `state_path='sector__state_ids'` (M2M lookup) to 8 viewsets (LabEquipment, Reagent, ReagentLot, MaterialIssue, QCRecord, NonConformity, CapaRecord, CriticalResultNotification, VectorUnit) |
| H1′ | Preserved (union with sector grant) |
| Risk | **Medium** — production table, but M2M is additive (nullable, default empty) |

### M6-bis scope (Facility FKs)

| Decision | Recommendation |
|---|---|
| FKs needed | OrgAssignment, HealthScreening, LabSample, VectorUnit |
| Backfill | Run Q7 templates on prod first |
| Risk | **High** — 4 schema migrations + backfill; gate on prod counts |

### Ordering

```
M6 (Sector.state_ids M2M + state_path declarations) — 2-3 days
  ↓
M6-bis (Facility FKs + backfill) — 2-3 days, gated on Q7 prod counts
  ↓
M5-D (Vitest) — independent, can run in parallel with M6
  ↓
M5-E (debts) — last
```

---

## Staging/Prod queries (owner to run)

### Q1 (Sector + EP coverage)
```sql
SELECT s.code, s.name_ar,
       COUNT(ep.id) FILTER (WHERE ep.is_active = true) AS ep_count
FROM organization_sector s
LEFT JOIN masterdata_entrypoint ep ON ep.sector_id = s.id AND ep.is_active = true
GROUP BY s.id, s.code, s.name_ar
ORDER BY ep_count ASC;
```

### Q2 (viability)
From Q1: `count(ep_count > 0) / total * 100`.

### Q7 (backfill)
See Q7 templates above (Q7a-d).

### Additional (state coverage)
```sql
SELECT COUNT(*) AS total_states,
       COUNT(*) FILTER (WHERE is_active = true) AS active_states
FROM masterdata_state;
```

---

## Decision Required

1. **M2M vs derivation for Sector.state_ids?**
   - dev: 0% derivation → M2M needed (Option A).
   - prod: run Q1 — if ≥ 70%, consider hybrid (B + override).
   - **Recommendation: M2M (Option A)** — safest, covers all cases.

2. **M6-bis (Facility FKs) — proceed or defer?**
   - Run Q7 on prod first.
   - If backfill ≥ 50% → proceed.
   - If < 50% → defer (derivation-only or data cleanup first).

3. **M6 alone or M6 + M6-bis in one PR?**
   - **Recommendation: separate PRs** (M6 first, M6-bis after Q7 prod counts).

4. **`asserts_geographic_scope` + FACILITY?**
   - **Recommendation: keep absent (Option A)** — fail-closed.

---

## DoD (Discovery)

- [x] `m6-discovery.md` موجود، 8 أقسام.
- [x] Q1 + Q7 على dev (أرقام فعلية: 0% / 0 rows).
- [x] Q3/Q4/Q5/Q6/Q8 من الكود (9 نماذج موثّقة).
- [x] قوالب staging/prod جاهزة.
- [x] توصيات واضحة (M2M + separate PRs + keep FACILITY absent).
- [x] **لا production code.**
- [x] **لا migrations.**
- [x] **لا ScopeType.**
- [x] **لا push** (الفرع فارغ).

---

## Commit

```bash
git add backend/docs/m6-discovery.md
git commit -m "docs(m6): discovery — Sector.state_ids + facility FK audit

- Q1-Q2: Sector→EntryPoint coverage (dev 0%; prod templates)
- Q3: VectorUnit derivation viability (no direct derivation — M2M needed)
- Q4: model-by-model derivation table (9 models; LabSample/SampleTest already direct)
- Q5: Locality.state FK absent (Option C needs migration)
- Q6: M2M unavoidable for 9 sector-only models
- Q7: facility FK backfill for OrgAssignment/HealthScreening/LabSample/VectorUnit (dev 0 rows; prod templates)
- Q8: asserts_geographic_scope + FACILITY (keep absent — fail-closed)

Read-only: no code, no migrations, no schema changes."
```

**لا push** — الفرع فارغ، يُدفع عند green light.
