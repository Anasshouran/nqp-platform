# M7-A2b-full — HealthCase.reporting_node FK (Phase 1-3)

**التاريخ:** 2026-11-14 · **الفرع:** `feat/organizational-registry-m7-a2b-full` (من `main@a99dff1` — Merge PR #195)
**النطاق:** `HealthCase.reporting_node` FK + backfill + by-state endpoint FK-direct. Phase 2 (frontend tree picker) و Phase 3 (docs/ADR) لاحقة.
**Baseline:** Backend 3001 + 0xf + 3skip · Frontend 848

---

## 1. الملخص

يستبدل هذا العمل عبور `A2b-lite` (traversal عبر `health_facility → node_assignments → node → parent chain`)
بمفتاح أجنبي مباشر:

```
HealthCase.reporting_node → ReportingNode (FK, nullable, SET_NULL)
```

`reporting_node` هو **snapshot تاريخي**: «أين كانت الحالة وقت التسجيل»، لا «أين هي الآن».
يُملأ صراحةً — من الواجهة (الحالات الجديدة) أو أمر `backfill` (الموجودة) — ولا ينعكس عليه
أي تغيير لاحق في `HealthFacilityNodeAssignment`.

| البند | القيمة |
|---|---|
| Migration | `surveillance.0003_healthcase_reporting_node` — `AddField` واحد فقط |
| `save()` / signal / `clean()` | **0** — لم يُلمس `HealthCase.save()` (`case.py:244`) |
| Backfill | `backfill_healthcase_reporting_node` — fail-safe (ambiguous → NULL) |
| by-state endpoint | FK-direct + خريطة عقد في الذاكرة (بدون path string) |
| الاختبارات | +11 (8 FK + 3 by-state) · 3 audit tests أُعيدت كتابتها · 0 اختبار قائم عُدّل |

---

## 2. القيود الإلزامية (T1-T3) — محفوظة

| # | القيد | الحالة |
|---|---|---|
| **T1** | audit tests: إعادة كتابة لا حذف | ✅ 3 أُعيدت كتابتها (بما فيها الثالثة غير المتوقعة — D2) |
| **T2** | 27 استدعاء `HealthCase.objects.create` القائم بلا FK | ✅ FK nullable — كلها تمرّ بدون تعديل |
| **T3** | لا `save()` sync، لا signal، لا `clean()` | ✅ snapshot فقط؛ تغيير/حذف التعيين لا يمسّ الحالة |

---

## 3. الانحرافات عن نص الـ prompt (Disclosure)

| # | نص الـ prompt | المنفَّذ | السبب |
|---|---|---|---|
| **D1** | 14 استدعاء `create()` بلا facility | **27** استدعاء (3 تمرر facility) | عدّ الـ grep الضيق؛ الأثر نفسه: FK nullable |
| **D2** | 2 audit tests تُعاد كتابتها | **3** — `test_health_case_has_no_registry_fk` (IQ2) كان سينكسر أيضاً | اكتشاف أثناء التنفيذ؛ أُعيدت كتابته `test_health_case_references_reporting_node_only` |
| **D3** | lite tests «إلا الـ2 audit» لم تُلمس | fixtures 4 اختبارات lite أُضيف لها `reporting_node=` + اختبار `test_audit_tests_still_green` أُعيدت كتابته | مصدر matched انتقل من traversal إلى FK؛ البوابات والأرقام متطابقة |
| **D4** | endpoint = 1 query | **2 queries** (cases + خريطة الشجرة) | `select_related('reporting_node__parent__parent')` يكسر عند عمق ≠ 3؛ الخريطة تغطي أي عمق |
| **D5** | backfill حلقة لكل حالة | قاموس `facility→nodes` + `bulk_update` | بلا N+1؛ نفس المنطق (unique→ملء، ambiguous/unassigned→NULL) |
| **D6** | makemigrations = AddField فقط | طُردت 4 `AlterField` انجراف قديم (mapfeature geometry…)| مُضمّنة تلقائياً؛ استُبعدت يدوياً من الـ migration |
| **D7** | `CaseCreatePage.tsx` | غير موجود — النموذج داخل `SurveillanceModulePage.tsx` modal (line ~820) | اكتشاف Phase 2؛ 901 = weekly report (خارج A2b-full) |

---

## 4. البراهين (Proofs)

### 4.1 Backfill على dev (بيانات A2b-lite: 50 حالة)

```text
$ backfill_healthcase_reporting_node --dry-run
[DRY-RUN] Updated: 40, Ambiguous: 0, Unassigned: 5
$ backfill_healthcase_reporting_node
Updated: 40, Ambiguous: 0, Unassigned: 5
```

### 4.2 by-state endpoint (FK-direct) — نفس أرقام lite

```text
total 50 = matched 40 + node_no_state 0 + unassigned_node 5 + unassigned_facility 5
by_state: KRT=28, RS=12 (40) · reconciliation_ok True
```

### 4.3 Migration

`makemigrations surveillance --name healthcase_reporting_node` → `AddField` واحد.
`migrate surveillance 0002` → `Unapplying ... OK` (DROP COLUMN آمن) → `migrate surveillance` → OK.
`makemigrations --check --dry-run`: لا انجراف جديد (الانجراف الهندسي القديم قائم مسبقاً).

### 4.4 OpenAPI

`manage.py spectacular --file …` exit 0؛ `reporting_node` موجود في schema (4 مرات)؛
`/reports/by-state/` موجود (3 مرات). نفس عدد الأخطاء السابق (239/21) — لا جديد.

### 4.5 الاختبارات

| المجموعة | النتيجة |
|---|---|
| `test_reporting_node_fk.py` + `test_by_state_report.py` | **21 passed** |
| `test_m7_a2_integration_audit.py` (مُعاد كتابته) | **7 passed, 1 skipped** |
| `apps/surveillance` كامل | **123 passed** |
| `apps` كامل (full suite) | **قيد التشغيل** — المتوقع 3012 + 0xf + 3skip |

---

## 5. DoD — Phase 1

| البند | الحالة |
|---|---|
| FK nullable SET_NULL، بعد `health_facility` | ✅ |
| Migration `AddField` فقط، rollback-able | ✅ |
| لا `save()` override، لا signal | ✅ |
| Backfill (--dry-run/--limit، ambiguous→NULL) | ✅ |
| Serializer يقبل `reporting_node` (list read-only + write) | ✅ |
| by-state FK-direct (2 queries، لا N+1) | ✅ |
| 8 FK + 3 by-state جديدة | ✅ |
| 27 create قائم لم تُلمس (FK=NULL) | ✅ |
| 3 audit tests مُعاد كتابتها (تعليق تاريخي) | ✅ |
| `PROD_SCOPING_ENABLED` لم يُمس | ✅ |

---

## 6. Rollback

1. `migrate surveillance 0002` (DROP COLUMN) — مُختبَر.
2. Revert الكود — A2b-lite logic مستبدلة لكن الأرقام متطابقة؛ التراجع يعيد traversal تلقائياً
   (الـ endpoint السابق محفوظ في git history).
3. البيانات: `reporting_node` المُملأة تبقى أثراً تاريخياً بلا ضرر (عمود مُضاف فقط).

---

## 7. ما لم يُسلَّم (مؤجل)

| البند | السبب |
|---|---|
| Phase 2 — `RegistryTreeSelector` + line 820 | بعد commit Phase 1 (prompt مخصص) |
| Phase 3 — `m7-a2b-full.md` هذا الملف + ADR | Phase 3 يُكمل بعد Phase 2 |
| backfill إنتاج | محجوب على Q7 (VPS) |
| line 901 (weekly report form) | Phase 2b اختياري — نموذج `WeeklySurveillanceReport` لا يلمس `reporting_node` |
