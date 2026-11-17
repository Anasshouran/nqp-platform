# M7-A2c-3 — Discovery: screening + vaccination

**Date:** 2026-11-16
**Branch:** `feat/organizational-registry-m7-a2c-3-discovery` (from `main` @ `8cea366`)
**Type:** read-only — لا كود، لا migrations، لا تغيير schema
**Output:** هذا الملف

---

## 0. الملخص التنفيذي — حسم التناقض

| السؤال | الجواب |
|---|---|
| هل `HealthScreening.facility` موجود؟ | ✅ **نعم** — FK → `masterdata.HealthFacility` (`SET_NULL`, nullable) + migration `0003_healthscreening_facility` (M6-bis / D-M5-C-F-2) |
| هل التناقض (M6-bis vs A2c Discovery) حقيقي؟ | **لا** — `m7-a2c-discovery.md` **وثّق** الـ FK صراحةً (سطر 34، 39، 53). عبارة «no facility FK» تنطبق على **vaccination فقط** (سطر 54) |
| لماذا صُنِّف screening كـ skip في A2c؟ | **ليس** لغياب الـ FK — بل لغياب adoption signal: dev rows = 0 + Q7 محجوب (سطور 21، 117، 136) |
| هل vaccination فيه facility FK؟ | ❌ **لا** — فقط `VaccinationSite.entry_point` |
| Pattern المقترح — screening | **A2b-full** (نمط surveillance حرفياً): `facility → HealthFacilityNodeAssignment → node` |
| Pattern المقترح — vaccination | **STATE-only** (نمط airport): `site.entry_point.state_id → StateNodeAssignment → ReportingNode(kind=STATE)` |

---

## 1. screening — الأدلة verbatim

### 1.1 Model (`apps/screening/models.py`)

```
class HealthScreening(BaseModel):          # سطر 7
    traveler   → travelers.Traveler        (CASCADE)   # 8
    port       → masterdata.EntryPoint     (PROTECT)   # 14
    facility   → masterdata.HealthFacility (SET_NULL, null=True, blank=True)  # 20
        help_text='المنشأة المرتبطة بالفحص (M6-bis، D-M5-C-F-2)'
    officer    → settings.AUTH_USER_MODEL  (PROTECT)   # 29
```

### 1.2 Migrations (`apps/screening/migrations/`)

```
0001_initial.py
0002_alter_healthscreening_port.py
0003_healthscreening_facility.py     ← AddField facility (SET_NULL, nullable)
```

### 1.3 Dev rows (dev container)

```
HealthScreening total: 0
with facility:         0
with port:             0
```

### 1.4 Audit tests

```
grep -rn "not_referenced|no_registry|has_no_registry" apps/screening/tests/ apps/registry/tests/
→ 0 نتائج
```

### 1.5 Path derivation

```
HealthScreening.facility (nullable)
  → masterdata.HealthFacility
  → HealthFacilityNodeAssignment (valid_to__isnull=True)     # apps/registry/models.py
  → ReportingNode
```

- **نفس نمط `HealthCase` (surveillance, A2b-full) حرفياً** — بما فيه backfill
  `apps/surveillance/management/commands/backfill_healthcase_reporting_node.py`
  (تعيين واحد → يُملأ؛ صفر → NULL؛ متعدد → NULL fail-safe).
- `HealthScreening.port` (PROTECT، **غير nullable**) متاح كـ fallback STATE-only
  للصفوف ذات `facility=NULL` — لكن surveillance **لا** يفعل ذلك؛ التوصية: لا،
  حفاظاً على تطابق الأنماط (انظر Q-2).

### 1.6 التصنيف

| البند | القيمة |
|---|---|
| Pattern | **A2b-full** (نمط D في `m7-a2c-discovery.md:53`) |
| التقدير | 4–5 أيام |
| القيمة | **عالية** عند وجود بيانات prod (حالات فحص/منشأة) |
| الجاهزية التقنية | ✅ كاملة — FK + migration + نمط backfill موجود |

---

## 2. vaccination — الأدلة verbatim

### 2.1 Model (`apps/vaccination/models.py`)

```
class VaccinationSite(BaseModel):          # سطر 73
    kind         CLINIC | PORT_POINT
    entry_point  → masterdata.EntryPoint (SET_NULL, null=True, blank=True)  # 83

class VaccinationRecord:                   # سطر ~118
    traveler → Traveler        (CASCADE)
    vaccine  → Vaccine         (PROTECT)
    batch    → VaccineBatch    (SET_NULL, nullable)
    site     → VaccinationSite (SET_NULL, null=True, blank=True)            # 124
    vaccinator → AUTH_USER_MODEL
```

- **لا يوجد أي `facility` FK** في التطبيق كله (`grep -nE "models\.(ForeignKey|OneToOneField)\("`
  → لا نتائج لـ facility).

### 2.2 Dev rows

```
VaccinationSite:          0
VaccinationRecord:        0
sites with entry_point:   0
records with site:        0
```

### 2.3 Audit tests

```
grep -rn "not_referenced|no_registry" apps/vaccination/tests/ apps/registry/tests/
→ 0 نتائج
```

### 2.4 Path derivation (STATE-only)

```
VaccinationRecord.site (nullable)
  → VaccinationSite.entry_point (nullable)
  → EntryPoint.state_id
  → StateNodeAssignment (state_id, valid_to__isnull=True, is_primary=True)
  → ReportingNode (kind=STATE)
```

- **نفس سياسة airport (ii) strict:** `count == 1` فقط يُملأ؛ 0 → «No STATE node»؛
  >1 → «Ambiguous» (يبقى NULL — لا تخمين).
- **انقطاع السلسلة:** `site` nullable → السجلات بلا site تبقى NULL (unassigned).

### 2.5 التصنيف

| البند | القيمة |
|---|---|
| Pattern | **STATE-only** (نمط B في `m7-a2c-discovery.md:54`) |
| التقدير | ~4 أيام |
| القيمة | **متوسطة** (حالات تطعيم/ولاية) |
| الجاهزية التقنية | ✅ ممكن — لكن بلا facility domain |

---

## 3. Q6 — القرار المقترح

| App | `facility` FK؟ | Pattern | التقدير | القيمة | التوصية |
|---|---|---|---|---|---|
| **screening** | ✅ `HealthScreening.facility` (M6-bis) | **A2b-full** | 4–5 أيام | **عالية** (prod) | **تنفيذ عند تأكيد adoption (Q7)** |
| **vaccination** | ❌ — (`site.entry_point` فقط) | **STATE-only** | ~4 أيام | **متوسطة** | **تأجيل / اختياري** |

---

## 4. لماذا لا قرار تنفيذي الآن

1. **dev rows = 0** لكلا الجدولين — لا يمكن إثبات أي adoption محلياً.
2. **Q7 محجوب** (VPS access) ⇒ لا بيانات prod.
3. `m7-a2c-discovery.md:21-22` يوصي: «skip A2c كاملاً حتى Q7 يُظهر adoption signal
   حقيقي في prod … 6 تطبيقات إضافية قبل Q7 = 40-50 يوماً لمن لا يستخدم».
4. الكلفة الكاملة للثنائي: **8–9 أيام**.

---

## 5. Open Questions

| # | السؤال | التوصية |
|---|---|---|
| Q-1 | هل يوجد adoption signal في prod لـ screening/vaccination؟ | يحتاج Q7 (VPS) — لا حسم محلياً |
| Q-2 | إن نُفِّذ screening كـ A2b-full، هل نضيف STATE-only fallback عبر `port` للصفوف ذات `facility=NULL`؟ | **لا** — تطابقاً مع surveillance (A2b-full لا fallback) |
| Q-3 | vaccination: `VaccinationRecord` أم `VaccinationCertificate`؟ | **Record** — حدث التطعيم؛ certificate = إصدار وثيقة |
| Q-4 | endpoint by-state: واحد لكل تطبيق (مثل airport) أم موحّد؟ | **واحد لكل تطبيق** — اتساقاً مع airport/borders/hr |

---

## 6. الخلاصة

- **التناقض محسوم:** `screening.facility` **موجود** (FK + migration 0003) —
  A2b-full جاهز تقنياً. `vaccination` بلا facility FK — STATE-only.
- **التصنيف الأصلي (skip) لم يكن مبنياً على غياب FK** — بل على 0 rows + Q7
  (`m7-a2c-discovery.md:21، 117، 136`). عبارة «no facility FK» تنطبق على
  vaccination فقط.
- **التوصية:** تأجيل A2c-3 حتى Q7 (اتساقاً مع توصية A2c الأصلية)، مع تصميم
  جاهز: **screening = A2b-full**، **vaccination = STATE-only**.
