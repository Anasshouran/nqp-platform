# M7-A2c-vaccination — `VaccinationRecord.reporting_node` (STATE-only)

**Date:** 2026-11-16
**PR:** #209
**Scope:** `VaccinationRecord` only · **Pattern:** STATE-only · **Policy:** (ii) strict
**Baseline:** 3096 + 0 xfail + 3 skip → **3111 + 0 xfail + 3 skip** (+15)

---

## Discovery (PR #207 + هذا الـ PR)

| البند | النتيجة |
|---|---|
| `facility` FK في التطبيق | ❌ **لا يوجد** (`grep -rn "facility" apps/vaccination/` = 0) |
| المسار الجغرافي الوحيد | `VaccinationSite.entry_point` (SET_NULL، **nullable**) |
| `VaccinationRecord.site` | SET_NULL، **nullable** |
| dev rows | 0 (`Record`/`Site`/`site.entry_point`/`site` occupied = 0) |
| Audit tests | 0 |
| `views.py` | ملف واحد (لا `views/` package)؛ لا by-state سابق |
| `urls.py` | router + `records` prefix؛ `include` أولاً ثم `public/...` |
| **Pattern** | **STATE-only** (مثل borders_health / airport_health) |

**لا Facility FK مخفي** — درس airport (#205 → #206) طُبِّق: جرد FK كامل
(`grep -nE "models\.(ForeignKey|OneToOneField)\("`) قبل الحكم.

---

## السلسلة (STATE-only، snapshot)

```
VaccinationRecord.site (nullable)
  → VaccinationSite.entry_point (nullable)
    → EntryPoint.state_id
      → StateNodeAssignment(valid_to IS NULL, is_primary=True)
        → ReportingNode (kind = STATE)
          → سلف STATE (walk-up في الذاكرة)
```

- **لا `save()` sync، لا signal** — snapshot تاريخي.
- `VaccinationSite` **0 diff** — لم يُعدَّل.

---

## المسلمات

| البند | التفصيل |
|---|---|
| Model | `VaccinationRecord.reporting_node` (nullable, `SET_NULL`, no sync) |
| Migration | `vaccination/0004_vaccinationrecord_reporting_node` — **AddField only**، rollback `migrate vaccination 0003` |
| Serializer | `reporting_node` في `VaccinationRecordSerializer.Meta.fields` (writable, `allow_null`) |
| Backfill | `backfill_vaccinationrecord_reporting_node` (`--dry-run`, `--limit`) |
| Endpoint | `GET /api/v1/vaccination/reports/records/by-state/` |
| Scoping | `resolve_authorized_entry_points` → `site__entry_point_id__in` |
| Queries | `select_related('reporting_node')` + `_node_map()` + walk-up — ≤ 3 استعلامات لـ 20 صفاً |
| Tests | **15** (10 FK/backfill + 5 endpoint) |

### الملفات

```
backend/apps/vaccination/models.py                                         (+11)
backend/apps/vaccination/migrations/0004_vaccinationrecord_reporting_node.py (new)
backend/apps/vaccination/serializers.py                                    (+7)
backend/apps/vaccination/management/commands/backfill_vaccinationrecord_reporting_node.py (new)
backend/apps/vaccination/views.py                                          (+~115)
backend/apps/vaccination/urls.py                                           (+7)
backend/apps/vaccination/tests/test_vaccinationrecord_reporting_node.py    (new, 10)
backend/apps/vaccination/tests/test_records_by_state_endpoint.py           (new, 5)
backend/docs/m7-a2c-vaccination.md                                         (new)
docs/registry-architectural-decision.md                                    (update)
```

**0 diff:** `VaccinationSite`، `core/utils/scoping.py`، أي تطبيق آخر،
`PROD_SCOPING_ENABLED`.

---

## Backfill — bulk map، 2 استعلامات (لا N+1)

```python
# 1) خريطة state → [node_ids] (استعلام واحد)
active = {}
for state_id, node_id in (
    StateNodeAssignment.objects
    .filter(valid_to__isnull=True, is_primary=True)
    .values_list('state_id', 'node_id')
):
    active.setdefault(state_id, []).append(node_id)

# 2) السجلات الناقصة (استعلام واحد + select_related)
qs = VaccinationRecord.objects.filter(
    reporting_node__isnull=True,
    site__isnull=False,
    site__entry_point__isnull=False,
    site__entry_point__state__isnull=False,
).select_related('site__entry_point')

for record in qs.iterator():
    nodes = active.get(record.site.entry_point.state_id, [])
    if len(nodes) == 1:        # → يُملأ
    elif len(nodes) == 0:      # → No STATE node
    else:                       # → Ambiguous (NULL، لا اختيار عشوائي)
```

- **سياسة (ii) strict:** `count == 1` فقط.
- `filter(reporting_node__isnull=True)` → لا يُعاد كتابة snapshot موجود.
- `bulk_update(..., batch_size=500)`.
- سجلات بلا `site`/`entry_point`/`state` لا تدخل المعالجة (تبقى NULL).

---

## Endpoint — 3 buckets + walk-up (fail-safe)

| الفئة | الشرط |
|---|---|
| `matched` | `reporting_node NOT NULL` + سلف `STATE` موجود |
| `node_no_state` | `reporting_node NOT NULL` + بلا سلف `STATE` |
| `unassigned` | `reporting_node IS NULL` (site=NULL أو بلا تعيين) |

**Reconciliation:** `total == matched + node_no_state + unassigned` (assert).

> **لماذا 3 buckets وليس 2؟** `reporting_node` **writable** — قد يُضبط يدوياً على
> عقدة non-STATE. افتراض «STATE دائماً» كان سيُفشل المصالحة (AssertionError/500).
> الـ walk-up (`_state_ancestor` على `_node_map`) يجعل non-STATE يُحسب
> `node_no_state` بدل crash.

---

## النطاق (scoping)

- `resolve_authorized_entry_points(user)`:
  - `None` → بلا تقييد (`scoped=False`).
  - `[]` → حجب كامل (`scoped=True`، `_empty()`).
  - list → `filter(site__entry_point_id__in=ids)` (`scoped=True`).
- سجلات `site=NULL` لا تدخل نطاق المستخدم المقيَّد (فشل-آمن — مطابق لتعليق
  `VaccinationRecordViewSet`: «سجل بلا عيادة … يُرى للمدير العام فقط»).

---

## القيود (STATE-only)

- لا LOCALITY/FACILITY — المسار ينتهي عند `EntryPoint.state`.
- `site` و`site.entry_point` **nullable** → سجلات بلا مسار تبقى `unassigned`.
- لا قناة `facility` — التطبيق كله بلا `HealthFacility` FK.

---

## Rollback

`python manage.py migrate vaccination 0003` — AddField فقط → DROP COLUMN آمن.

---

## Open Questions

| # | السؤال | التوصية |
|---|---|---|
| Q-1 | هل نُضيف `VaccinationCertificate.reporting_node` (وثيقة لا حدث)؟ | **لا** — الحدث هو `Record` |
| Q-2 | هل نضيف LOCALITY لاحقاً إن أُضيف `facility` FK؟ | مؤجَّل — يحتاج تصميم A2b-full |
| Q-3 | تقرير مواقع التطعيم (`VaccinationSite`) بدل السجلات؟ | لا — الحدث أنسب للقياس |
