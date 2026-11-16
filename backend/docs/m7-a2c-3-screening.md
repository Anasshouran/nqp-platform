# M7-A2c-3-screening — `HealthScreening.reporting_node` (A2b-full، FACILITY-level)

**Date:** 2026-11-16
**PR:** #208
**Scope:** `HealthScreening` only · **Pattern:** A2b-full · **Policy:** (ii) strict
**Baseline:** 3081 + 0 xfail + 3 skip → **3096 + 0 xfail + 3 skip** (+15)

---

## السياق — تصحيح Discovery

`m7-a2c-discovery.md` (PR #198) صنّف screening كـ skip، لكن ليس لغياب FK — بل لغياب
adoption signal (0 dev rows + Q7 محجوب). الـ FK موجود منذ M6-bis:

```python
# apps/screening/models.py:20
facility = models.ForeignKey(
    'masterdata.HealthFacility',
    on_delete=models.SET_NULL, null=True, blank=True,
    related_name='screenings',
    help_text='المنشأة المرتبطة بالفحص (M6-bis، D-M5-C-F-2)',
)
```

العبارة «no facility FK» في الـ Discovery الأصلي تنطبق على **vaccination فقط**.
Discovery (PR #207) حسم ذلك: screening = **A2b-full**، vaccination = STATE-only (مؤجَّل).

**قرار المالك:** تنفيذ screening الآن رغم 0 dev rows (قرار منتج، مخاطرة موثَّقة:
4–5 أيام، 0 قياس قبل Q7، rollback = DROP COLUMN).

---

## السلسلة (A2b-full)

```
HealthScreening.facility (nullable)
  → masterdata.HealthFacility
    → HealthFacilityNodeAssignment (valid_to IS NULL)
      → ReportingNode (kind = STATE | LOCALITY | FACILITY)
        → سلف STATE (عبور في الذاكرة عبر parent)
```

- **`reporting_node.kind` = FACILITY** عادةً (ليس STATE كما في borders/airport).
- الـ endpoint يصعد من العقدة إلى أول سلف `STATE` — نفس `_state_ancestor` في surveillance.
- **لا `save()` sync، لا signal** — snapshot تاريخي، تغيير التعيين لاحقاً لا ينعكس.

---

## المسلمات

| البند | التفصيل |
|---|---|
| Model | `HealthScreening.reporting_node` (nullable, `SET_NULL`, no sync) |
| Migration | `screening/0004_healthscreening_reporting_node` — **AddField only**، rollback `migrate screening 0003` |
| Serializer | `reporting_node` في `HealthScreeningSerializer.Meta.fields` (writable, `allow_null`) |
| Backfill | `backfill_healthscreening_reporting_node` (`--dry-run`, `--limit`) |
| Endpoint | `GET /api/v1/screening/reports/screenings/by-state/` |
| Scoping | `resolve_authorized_entry_points` → `port_id__in` (`HealthScreening.port` غير nullable) |
| Filter path | `port_id__in` (FK مباشر — مصدر الحقيقة للنطاق) |
| Queries | `select_related('reporting_node')` + `_node_map()` — ≤ 3 استعلامات لـ 20 صفاً |
| Tests | **15** (10 FK/backfill + 5 endpoint) |

### الملفات

```
backend/apps/screening/models.py                                            (+12)
backend/apps/screening/migrations/0004_healthscreening_reporting_node.py     (new)
backend/apps/screening/serializers.py                                       (+7)
backend/apps/screening/management/commands/backfill_healthscreening_reporting_node.py (new)
backend/apps/screening/views.py                                             (+~110)
backend/apps/screening/urls.py                                              (+6)
backend/apps/screening/tests/test_healthscreening_reporting_node.py         (new, 10)
backend/apps/screening/tests/test_screenings_by_state_endpoint.py           (new, 5)
backend/docs/m7-a2c-3-screening.md                                          (new)
docs/registry-architectural-decision.md                                     (update)
```

**0 diff:** `HealthScreening.save()`، `_entry_point_ids_for`، `port`/`facility` FKs،
`core/utils/scoping.py`، أي تطبيق آخر، `PROD_SCOPING_ENABLED`.

---

## السياسة (ii) — strict `count == 1` else NULL

```python
node_ids = active.get(screening.facility_id, [])
if len(node_ids) == 1:      # تعيين نشط واحد → يُملأ
    screening.reporting_node_id = node_ids[0]
elif len(node_ids) == 0:    # صفر → NULL (unassigned)
    ...
else:                       # متعدد → NULL (ambiguous) — لا اختيار عشوائي
    ...
```

- خريطة `facility → node` تُبنى باستعلام **واحد** (`.values_list`) — لا N+1.
- `bulk_update(..., batch_size=500)` — لا `save()` لكل صف.
- **لا `port` fallback:** `facility=NULL` يبقى NULL (تطابقاً مع A2b-full/surveillance).
- `filter(reporting_node__isnull=True)` → لا يُعاد كتابة snapshot موجود.

---

## الفئات (3 buckets)

| الفئة | الشرط |
|---|---|
| `matched` | `reporting_node NOT NULL` + سلف `STATE` موجود |
| `node_no_state` | `reporting_node NOT NULL` + بلا سلف `STATE` (شجرة غير مكتملة) |
| `unassigned_node` | `reporting_node IS NULL` (facility=NULL أو بلا تعيين) |

**مصالحة:** `total == matched + node_no_state + unassigned_node` (assert داخل الـ endpoint).

> لماذا 3 لا 4؟ A2b-full/surveillance يفصل `unassigned_facility` عن `unassigned_node`.
> في screening، `facility` nullable لكن **الفحص نفسه** قد يكون منفذياً بلا منشأة؛
> ولأن المطلوب هو إجمالي «غير المُسنَد»، دُمجا في `unassigned_node` مع توضيح في `note`.

---

## النطاق (scoping)

- `resolve_authorized_entry_points(user)`:
  - `None` → بلا تقييد (`scoped=False`) — superuser/GLOBAL.
  - `[]` → حجب كامل (`scoped=True`، `_empty()`).
  - list → `filter(port_id__in=ids)` (`scoped=True`).
- `HealthScreening.port` **غير nullable** ⇒ كل صف قابل للتصنيف ضمن النطاق،
  والمصالحة لا تُسقِط صفوفاً.

---

## الاختبارات (15)

**10 FK/backfill:**
nullable default · set explicitly · no sync on save · SET_NULL on node delete ·
serializer includes · dry-run · count==1 · count==0 · count>1 strict · no overwrite.

**5 endpoint:**
empty · matched grouping (2 states) · reconciliation (3 buckets) · scoped PORT subset · no N+1 (≤3).

---

## القيمة والمخاطرة

- **القيمة:** تقرير «فحوص/منشأة» قابل للتجميع حسب الولاية فور توفر البيانات.
- **المخاطرة (موثَّقة):** dev rows = 0؛ لا قياس قبل Q7. إن لم يُظهر Q7 استخداماً
  → كود غير مستخدم (مثل A2c-1/A2c-2)، والتراجع متاح.
- **Rollback:** `python manage.py migrate screening 0003` (AddField فقط → DROP COLUMN آمن).

---

## Open Questions

| # | السؤال | التوصية |
|---|---|---|
| Q-1 | هل نضيف STATE-only fallback عبر `port` للصفوف ذات `facility=NULL`؟ | **لا** — تطابقاً مع A2b-full |
| Q-2 | هل نفصل `unassigned_facility` كـ bucket رابع؟ | **لا** حالياً — 3 buckets كافية؛ يمكن إضافته لاحقاً بلا migration |
| Q-3 | vaccination (STATE-only) | **مؤجَّل** حتى Q7 — Discovery #207 |
