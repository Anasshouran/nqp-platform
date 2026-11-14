# M7-A2b-lite — تقرير الترصد حسب الولاية (Phase 0)

**التاريخ:** 2026-11-14 · **الفرع:** `feat/organizational-registry-m7-a2b-lite` · **الأساس:** `main@b3831c0` (Merge #194)
**النطاق:** Phase 0 فقط — إثبات القيمة قبل أي استثمار في A2b-full.

---

## 1. الملخص

يضيف هذا العمل **قناة قراءة واحدة** من بيانات الترصد إلى شجرة السجل التنظيمي:

```
GET /api/v1/surveillance/reports/by-state/
HealthCase.health_facility → HealthFacilityNodeAssignment (نشط) → ReportingNode → سلف STATE
```

**لا FK. لا migration. لا `save()` sync. لا تعديل أي نموذج قائم.** العبور يحدث وقت القراءة فقط، فالسجل يبقى بنية تحتية غير مُقحَمة في نماذج الأعمال، ويمكن التراجع عن كل شيء بحذف endpoint واحد.

| البند | القيمة |
|---|---|
| Backend | endpoint + serializer + `seed_surveillance_testcases` + 10 اختبارات |
| Frontend | صفحة `/app/surveillance/reports/by-state` + شريط مصالحة + جدول + i18n + 3 اختبارات |
| Migration | **0** |
| FK جديد | **0** |
| `save()` override جديد | **0** |
| اختبارات التدقيق M7-A2 | **ما زالت خضراء** (لم تُعدَّل) |

---

## 2. الملفات

| الملف | النوع |
|---|---|
| `backend/apps/surveillance/views/reports.py` | جديد — `build_by_state_report` + `SurveillanceByStateReportViewSet` |
| `backend/apps/surveillance/serializers/reports.py` | **إضافة** — `StateBucketSerializer` + `ByStateReportSerializer` في نهاية ملف قائم (لم تُحذف أي فئة) |
| `backend/apps/surveillance/urls.py` | سطر import + مسار قبل `include(router.urls)` |
| `backend/apps/surveillance/management/commands/seed_surveillance_testcases.py` | جديد — بيانات عرض idempotent |
| `backend/apps/surveillance/tests/test_by_state_report.py` | جديد — 10 اختبارات |
| `frontend/src/pages/surveillance/ReportsByStatePage.tsx` | جديد |
| `frontend/src/pages/surveillance/ReportsByStatePage.test.tsx` | جديد — 3 اختبارات (مكان الاختبار مجاور للصفحة كاصطلاح المشروع) |
| `frontend/src/api/endpoints/surveillance.ts` | إضافة نوعين + دالة واحدة |
| `frontend/src/routes.tsx` | lazy import + مسار |
| `frontend/src/i18n/locales/{ar,en}.json` | مفاتيح `surveillance.reports.byState.*` |
| `docs/registry-architectural-decision.md` | §Update 2026-11-14 |

---

## 3. الانحرافات عن نص الـ prompt (Disclosure)

كل انحراف أدناه إمّا حقيقة من الريبو أو قرار معتمد صراحةً من المالك. لم يُنفَّذ أي بند «حرفياً» إن كان يخالف الكود الفعلي.

| # | نص الـ prompt | المنفَّذ | السبب |
|---|---|---|---|
| **D1** | scoping على `health_facility.entry_point` فقط | `_surveillance_scope_q(user, 'port', entry_links=['health_facility__entry_point'])` | **Option B (معتمد):** الحرفي يُسقِط الحالات بلا منشأة (5 من 50) فينكسر شرط المصالحة. القائم يجمع بـ OR: منفذ الحالة / منفذ منشأتها / قطاعها |
| **D2** | `HealthCase.reported_at` | `reported_date` | لا يوجد `reported_at` في النموذج (`case.py:197`) — التنفيذ الحرفي يرمي `FieldError` |
| **D3** | `health_facility__healthfacilitynodeassignment_set` | `health_facility__node_assignments` | `related_name="node_assignments"` (`registry/models.py:267`) — الاسم الافتراضي غير مستخدم |
| **D4** | «لا GLOBAL root في dev» | `ReportingNode.Kind` فيه **FEDERAL** لا GLOBAL، والجذر `FED` **موجود** | walk-up مبرَّر بـ**المتانة** (سلسلة `parent` مرجع قانوني) لا بغياب الجذر. الـ seed **يعيد استخدام** الجذر القائم ولا ينشئ ثانياً (`reporting_node_single_root`) |
| **D5** | الـ seed يأخذ حالات «node-unassigned» من بيانات قائمة | ينشئ 5 منشآت `SEED_FAC_UNASSIGNED_*` بلا تعيين | dev فيه **12/12** منشأة بتعيين نشط ⇒ لا توجد منشأة صالحة للفئة الثالثة |
| **D6** | `unwrap` من `registry.ts` | `apiClient.get<ApiResponse<T>>` | اصطلاح `surveillance.ts` نفسه (معتمد) |
| **D7** | 1-2 اختبار frontend | **3** | تغطية: العرض + التحديث + الخطأ. الأثر: 845 → **848** |
| **D8** | التجميع بـ DB aggregate | تصنيف في Python على صفوف مُجهَّزة مسبقاً | walk-up يحتاج الشجرة؛ والقياس **استعلامان فقط** لـ 50 حالة (لا N+1). التجميع في DB (CTE) مؤجل حتى تظهر حاجة قياس |
| **D9** | — | إصلاح فخّ Django: `filter(node_assignments__valid_to__isnull=True)` يطابق أيضاً منشآت **بلا أي تعيين** (LEFT JOIN) | أُضيف `node_assignments__isnull=False`؛ بدونه كان الـ seed ينتج 6 matched بدل 40 (رُصد أثناء التشغيل وأُصلح) |

---

## 4. تصحيح Errata E-7 (من #194، بعد الدمج)

`m7-a2b-discovery.md §E-7` قال «0 GLOBAL nodes in dev». **هذا خطأ مزدوج:**

- `ReportingNode.Kind` لا يحتوي `GLOBAL` أصلاً: `FEDERAL / STATE / LOCALITY / FACILITY / DEPARTMENT / SERVICE`.
- الجذر **موجود**: `FED` (depth 0، parent NULL).

الشجرة الفعلية على dev (2026-11-14): `FED` → 3 STATE → 6 LOCALITY → 12 FACILITY (كل FACILITY في depth 3).
`node_no_state` المتوقع = 0 ✅ (مؤكَّد بالقياس: 0 من 50).

القيد المستفاد: `reporting_node_single_root` (فريد على `parent IS NULL`) — الـ seed يحترمه عبر إعادة استخدام الجذر، و`ReportingNode.save()` يستدعي `full_clean` فيرفض الجذر الثاني حتى على مستوى ORM.

---

## 5. البراهين (Proofs)

### 5.1 المصالحة (الضابط 3) — dev، `seed --clean --count 50`

```text
total                 50
matched               40
node_no_state          0
unassigned_node        5
unassigned_facility    5
reconciliation_ok      True
by_state               KRT=28, RS=12   (28 + 12 = 40 = matched)
```

`50 == 40 + 0 + 5 + 5` ✅ — وكل صف مصالحة مرئي في الواجهة (لا صف مخفي).

### 5.2 لا N+1 (الضابط 4)

```text
queries: 2
  - SELECT ... FROM surveillance_healthcase LEFT OUTER JOIN masterdata_healthfacility ...
  - SELECT ... FROM registry_healthfacilitynodeassignment ...
```

**استعلامان ثابتان لـ 50 حالة** (بدون `count()` منفصل: الإجمالي يُحسب أثناء المرور). الاختبار `test_no_n_plus_1` يقيس العدد بحالة واحدة ثم يؤكد **نفس العدد** بـ 50 حالة، ويشترط `<= 5`.

### 5.3 اختبارات التدقيق M7-A2

```
apps/registry/tests/test_m7_a2_integration_audit.py  →  7 passed, 1 skipped
apps/surveillance                                    →  123 passed, 1 skipped
```

`test_reporting_node_not_referenced_by_surveillance` و`test_no_registry_node_path_aggregation_endpoint` **لم يُعدَّلا** وما زالا يثبتان غياب `reporting_node` — أي أن A2b-lite لم يمسّ حالة M7-A2 الموثقة.

### 5.4 الـ seed idempotent

```
$ seed_surveillance_testcases --count 50
Created 50 cases across 11 facilities, 2 states (matched=40, unassigned_node=5, unassigned_facility=5).
$ seed_surveillance_testcases --count 50
Created 0 cases across 11 facilities, 2 states (...).
```

يرفض العمل مع `DEBUG=False` (حماية إنتاج). `--clean` يحذف `SEED_*` فقط.

---

## 6. DoD — الحالة

| البند | الحالة |
|---|---|
| seed: 50 حالة (40/5/5، idempotent، يرفض prod) | ✅ |
| endpoint: `reported_date`، `node_assignments`، `node__parent__parent` | ✅ (تصحيح D2/D3) |
| Scoping Option B — لا إسقاط للحالات | ✅ `test_scoped_user_sees_subset` |
| المصالحة `total == matched + node_no_state + unassigned_node + unassigned_facility` | ✅ مُختبر + مبرهن على dev |
| `assertNumQueries <= 5` مستقل عن عدد الحالات | ✅ (فعلي: 2) |
| frontend: شريط مصالحة + جدول + صفوف «غير معيَّن» + i18n | ✅ |
| 10 اختبارات backend | ✅ |
| اختبارات frontend | ✅ 3 (بدل 1-2 — D7) |
| اختبارا التدقيق يبقيان خضراوين | ✅ |
| 0 migration، 0 FK، 0 `save()` override | ✅ |
| `apiClient.get<ApiResponse<T>>` | ✅ |
| `m7-a2b-lite.md` مع Deviation + E-7 | ✅ هذا المستند |
| Baseline 2984 → 2994 backend | ✅ (انظر تقرير التشغيل) |
| Frontend 845 → 848 | ✅ |

---

## 7. التشغيل

```bash
# بيانات عرض (dev فقط)
python manage.py seed_surveillance_testcases --count 50
python manage.py seed_surveillance_testcases --clean

# التقرير
curl -s -H "Authorization: Bearer <token>" \
  'http://localhost:8000/api/v1/surveillance/reports/by-state/?date_from=2026-10-01&date_to=2026-11-14'
```

الواجهة: `/app/surveillance/reports/by-state` (تاريخ من/إلى، زر تحديث، شريط مصالحة، جدول).

---

## 8. ما لم يُسلَّم (A2b-full مؤجل)

| البند | السبب |
|---|---|
| `reporting_node` FK على `HealthCase` | اختباران في `test_m7_a2_integration_audit.py` يؤكدان **غياب** الحقل ⇒ إضافته تُفشِلهما (يجب استبدالهما، لا حذفهما صامتاً) |
| `save()` sync | تغيير التعيين/حذفه يُعيد كتابة تاريخ الحالة أو يمحو مرجعه (4 أسئلة تاريخية غير محلولة — §E-5) |
| `<RegistryTreeSelector />` | عمل واجهة كامل بلا دليل استخدام |
| backfill + DoD «FK ≥ 80%» | لا معنى له قبل وجود الحقل؛ يحتاج `backfill_healthcase_reporting_node` وقياساً على staging/prod |

**قرار الانتقال إلى Phase 1:** يُقاس باستخدام endpoint/الصفحة في staging/prod بعد Q7. لا استثمار إضافي قبل ذلك.

---

## 9. قيود معروفة

1. **تصنيف في Python:** يقرأ كل صفوف النطاق. لـ Phase 0 مقبول (50 حالة = استعلامان). عند بيانات وطنية (>100k) يلزم تجميع بـ CTE/`path` في DB — يُقيَّم في Phase 1.
2. **`scoped` مشتق من `scope_q is not None`**، لا من `has_global_scope`: superuser بلا تفويض GLOBAL نشط يُعامل كعرض غير مقيَّد، وهو ما يعكس سلوك الاستعلام فعلاً.
3. **`node_no_state` مرئي لا مخفي:** إن ظهر > 0 فهو خلل جودة بيانات في الشجرة، ويُعرض كما هو.
4. **بيانات dev عقدها `TEST_NODE_*`:** ليست بيانات إنتاج؛ الـ seed ينشئ `SEED_*` فقط عند الحاجة.
