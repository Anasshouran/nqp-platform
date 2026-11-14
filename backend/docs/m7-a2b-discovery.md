# M7-A2b Discovery — Integration Design (Read-Only)

**التاريخ:** 2026-11-13 · **الفرع:** `feat/organizational-registry-m7-a2b-discovery` · **الأساس:** `main@120164d`
**النوع:** Discovery فقط — لا كود إنتاجي، لا migrations، لا تعديل أي ملف موجود
**الوقت:** 2-3 ساعات
**الهدف:** تصميم دمج السجل التنظيمي (registry) في تطبيق surveillance أولاً — الإجابة على Q1-Q6 قبل أي prompt تنفيذي

---

## الملخص التنفيذي

M7-A2 أثبت أن السجل التنظيمي (M1-M6) جزيرة معزولة: **0/7 تطبيق تجاري يشير إلى أي نموذج سجل**، معدل التكامل ~4%.

M7-A2b يقترح دمجاً عميقاً: إضافة `reporting_node` FK لنماذج الأعمال، مكون `<RegistryTreeSelector />` واجهة أمامية، Endpoint تجميع هرمي.

هذا المستند يجيب على 6 أسئلة حرجة قبل إصدار Execution Prompt لـ A2b. **لا كود، لا migrations.**

> ⚠️ **اقرأ §Errata في نهاية المستند أولاً.** بعد مراجعة المالك، صُحِّحت أرقام Q5 (14 لا 15-20)، ورُفض `save()` sync في Q2 (management command بدلاً منه)، وثبت أن A2b-full يكسر اختبارَي تدقيق يؤكدان غياب الحقل. §Errata يعلو على أي نص يناقضه أعلاه.

---

## Q1 — أي تطبيق أولاً؟ (اختيار التطبيق)

### المرشحون

| التطبيق | النماذج ذات FKs تنظيمية | عدد FKs | نقاط resolver | تعقيد | القيمة |
|---|---|---|---|---|---|
| **surveillance** | HealthCase, HealthEvent, SurveillanceAlert, Outbreak | 4 لكل نموذج (port, sector, locality, health_facility) | 4 نقاط (M5-A) | متوسط | **الأعلى** — الأكثر استخداماً، ترصد وبائي |
| vaccination | VaccinationRecord | 1 (entry_point) | منخفض | منخفض | منخفض —FK واحد فقط |
| borders_health | Multiple (crossing OneToOne) | 1 OneToOne | منخفض | منخفض | منخفض —مجال منفصل |

### التوصية: **surveillance أولاً**

**تبرير:**
1. **أعلى قيمة:** HealthCase هو نموذج الترصد المركزي — كل حالة وبائية تمر من خلاله
2. **أعلى استعداد تقني:** 4 FKs تنظيمية موجودة بالفعل (port, sector, locality, health_facility) — الإضافة سهلة (FK خامس: reporting_node)
3. **أكثر استخداماً:** 4 نقاط resolver من M5-A، 11 ملف اختبار، Frontend صفحة كاملة (SurveillanceModulePage)
4. **FK مباشرة موجودة:** `health_facility` موجود بالفعل على HealthCase — يمكن اشتقاق `reporting_node` منه عبر `HealthFacilityNodeAssignment`

### التطبيقات الأخرى (مؤجلة)
- **vaccination:** FK واحد (entry_point) — مؤجل إلى A2b fase 2
- **borders_health:** OneToOne entry_point — مجال منفصل، مؤجل

---

## Q2 — FK إلى ماذا؟ (design)

### الخيارات الثلاثة

| الخيار | التعريف | المزايا | العيوب | التوصية |
|---|---|---|---|---|
| **A. `reporting_node` FK diretto** | `reporting_node = FK(ReportingNode, null=True, blank=True, on_delete=SET_NULL)` على HealthCase | بسيط، استعلام مباشر (`case.reporting_node.path`)، no join عبر assignment | لا يضمن تطابق `health_facility.locality` مع `node.path` — يمكن أن يكون غير متسق | **المختار** — أسهل، أقل مخاطرة |
| **B. FK إلى `HealthFacilityNodeAssignment`** | `facility_node_assignment = FK(HealthFacilityNodeAssignment)` | يضمن التطابق عبر assignment، историкية مضمونة | FK إلى جدول تعيينات (غير تقليدي)، يحتاج valid_to__isnull في الاستعلامات | مؤجل — معقد أكثر |
| **G. `facility_path` CharField (مشتق)** | حقل مشتق من `health_facility.node_assignments` | لا migration على apps (إذا محسوب في الـ property)، لا FK constraint | لا FK constraint، يمكن أن يكون قديم، استعلام أبطأ | مرفوض — لا מיפוי حقيقي |

### التصميم المختار (الخيار A)

```python
# apps/surveillance/models/case.py — HealthCase
reporting_node = models.ForeignKey(
    'registry.ReportingNode',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='surveillance_cases',
    verbose_name='عقدة التبليغ',
    help_text='عقدة التبليغ المرتبطة بالحالة (مشتقة من المنشأة الصحية عبر HealthFacilityNodeAssignment)',
)
```

### خطة الملء (backfill) للخيار A

```python
# في save() أو signal أو migration لمرة واحدة:
# لكل HealthCase حيث health_facility غير فارغ且 يوجد HealthFacilityNodeAssignment نشط:
#   case.reporting_node = facility.node_assignments.filter(valid_to__isnull=True).first().node
# الحالات بدون منشأة أو بدون تعيين نشط → reporting_node يبقى NULL (آمن، fail-closed)
```

**تخصيص الملء:** Migration لمرة واحدة + `save()` override يضمن التزامن عند الإنشاء/التعديل المستقبلي.

---

## Q3 — كيف يُستخدم في UI؟ (frontend)

### الوضع الحالي (SurveillanceModulePage.tsx)

| العنصر | التنفيذ الحالي | المشكلة |
|---|---|---|
| health_facility picker | `FormSelect` Flat dropdown، الخيارات من `/master-data/health-facilities/` | قائمة مسطحة، لا شجرة، لا عرض هرمي |
| port picker | `FormSelect` Flat dropdown من `/master-data/entry-points/` | منعزل عن health_facility |
| sector picker | `FormSelect` Flat dropdown من `/organization/sectors/` | منعزل |
| locality picker | `FormSelect` Flat dropdown من `/organization/localities/` | منعزل |
| إنشاء حالة | `blankCase` لا يحتوي على health_facility | الحقل اختياري |

### التغيير المطلوب (Q3)

| الشاشة | التغيير الحالي | التغيير المطلوب |
|---|---|---|
| Create/Edit HealthCase | FormSelect مسطح لـ health_facility | `<RegistryTreeSelector />` — شجرة تُمكّن اختيار الدولة → المحلية → المنشأة |
| List View | يعرض `facility_name` أو `port_code` | يضيف عمود `reporting_node_path` (مسار الهرمي) |
| Filters | filter by health_facility id فقط | يضيف filter by state/locality عبر ReportingNode path |

### المكون المطلوب

```tsx
// frontend/src/components/registry/RegistryTreeSelector.tsx
// - يعرض شجرة ReportingNode (GLOBAL → STATE → LOCALITY → FACILITY)
// - يختار عقدة واحدة، يعيد node.id + node.path
// - يُستخدم في Create/Edit HealthCase بدلاً من FormSelect مسطح
// - الخلفية: GET /api/v1/registry/nodes/ (موجود بالفعل)
// - frontend type: ReportingNodeTree (موجود بالفعل في types/registry.ts)
```

**لا توجد صفحة surveillance تستخدم tree picker حالياً** — هذا المكون جديد بالكامل.

---

## Q4 — Endpoint التجميع (reporting)

### الوضع الحالي

| الملف | الدالة | التجميع الحالي | الحقل المستخدم |
|---|---|---|---|
| `apps/surveillance/views/__init__.py` | `dashboard` | `cases_by_sector`, `cases_by_locality`, `cases_by_port`, `cases_by_disease` | `sector__name_ar`، `locality__name_ar`، `port__name_ar` (قيم مباشرة) |
| `apps/surveillance/services/gis_export.py` | `export` | `cases_by_disease`, `cases_by_locality`, `cases_by_port`, `cases_by_status` | قيم مباشرة |

### الاقتراح (Q4)

```
GET /api/v1/surveillance/reports/by-state/
```

**المعاملات:**
- `state` (optional): معرف ReportingNode من نوع STATE
- `locality` (optional): معرف ReportingNode من نوع LOCALITY
- `facility` (optional): معرف ReportingNode من نوع FACILITY
- `period_start`, `period_end` (optional): نطاق تواريخ

**الاستجابة:**
```json
{
  "state": {"id": "...", "code": "...", "name_ar": "..."},
  "localities": [
    {"id": "...", "code": "...", "name_ar": "...", "cases_count": 120, "confirmed_count": 45},
    ...
  ],
  "total_cases": 120,
  "confirmed_cases": 45,
  "by_facility": [
    {"id": "...", "code": "...", "name_ar": "...", "cases_count": 60},
    ...
  ]
}
```

**التنفيذ:**
- يستنبط ReportingNode من `state` معامل، ثم يحصل على جميع LocalityNodeAssignment و HealthFacilityNodeAssignment تحت الشجرة
- يجمع HealthCase عبر `reporting_node__path__startswith=node.path` أو عبر FKs مباشرة

**الملف المستهدف:** `apps/surveillance/views/reports.py` (جديد) أو إضافة إلى `views/__init__.py`

---

## Q5 — اختبارات 2984 (التأثير على الاختبارات الحالية)

### الاختبارات التي ستتأثر

| الملف | عدد اختبارات تنشئ HealthCase | ما يستخدم |
|---|---|---|
| `apps/surveillance/tests/test_cases.py` | ~10 اختبار (الـ `case` fixture يُنشئ HealthCase مباشرة) | `port`, `sector`, `locality`, `health_facility` FKs مباشرة |
| `apps/surveillance/tests/test_contacts.py` | ~2 اختبار يُنشئ HealthCase عبر `world` fixture | port, sector, locality |
| `apps/surveillance/tests/test_dashboard.py` | ~2 اختبار يُنشئ HealthCase | port, sector |
| `apps/surveillance/tests/test_ewars.py` | ~3 اختبار يُنشئ HealthCase | port, sector, locality, health_facility |
| `apps/surveillance/tests/test_reports.py` | ~1 اختبار يُنشئ HealthCase | port, sector |
| `apps/registry/tests/test_m5_integration/` | ~10 اختبار | نماذج السجل مباشرة |

### التقدير: ~15-20 اختبار سيشملون HealthCase مباشرة

### خطة التكييف (لا كسر لاختبارات موجودة)

| الخطوة | الإجراء |
|---|---|
| 1. إضافة `reporting_node` FK nullable | لا كسر — nullable، الاختبارات الحالية لا تمرر قيمة → stays NULL |
| 2. في `save()` أو signal: ملء `reporting_node` من `health_facility.node_assignments` | إذا لم يكن هناك تعيين نشط → يبقى NULL (اختبارات العالم `world` fixture لا تُنشئ HealthFacilityNodeAssignment → reporting_node NULL — الاختبارات لا تتعطل) |
| 3. إضافة اختبارات جديدة لـ reporting_node | ~5 اختبار جديد (ملء، استعلام، التجميع) |
| 4. لا تعديل أي اختبار موجود | عدد الاختبارات يزداد، لا يقل |

**تقدير التأثير على 2984 اختبار:** 0 كسر، +5 اختبار جديد = 2989

---

## Q6 — DoD للتبني (كيف نقيس النجاح؟)

| المقياس | الهدف | كيف يُقاس |
|---|---|---|
| **FK مملوء** | ≥ 80% من surveillance_cases التي لها health_facility لها reporting_node غير NULL | `HealthCase.objects.exclude(health_facility__isnull=True).exclude(reporting_node__isnull=True).count() / total` |
| **UI tree picker** | Create/Edit HealthCase يستخدم `<RegistryTreeSelector />` بدلاً من FormSelect مسطح | فحص الكود + اختبار واجهة (إذا وجد) |
| **Endpoint يعمل** | `GET /api/v1/surveillance/reports/by-state/` يعيد بيانات صحيحة | اختبار API جديد |
| **هierarchical reporting ممكن** | يمكن استعلام الحالات by state عبر ReportingNode path | اختبار استعلام: `HealthCase.objects.filter(reporting_node__path__startswith=state_node.path)` |
| **لا كسر لاختبارات موجودة** | 2984 اختبار يبقى ناجحاً | CI Backend |

### DoD مقترح لـ A2b fase 1 (surveillance فقط)

1. ✅ `reporting_node` FK مضاف إلى `HealthCase` (nullable)
2. ✅ Migration لمرة واحدة تملأ الحالات الموجودة
3. ✅ `save()` يضمن التزامن عند الإنشاء/التعديل
4. ✅ `<RegistryTreeSelector />` يُستخدم في Create/Edit HealthCase
5. ✅ `GET /api/v1/surveillance/reports/by-state/` يعمل ويعيد بيانات صحيحة
6. ✅ ~5 اختبار جديد ينجح
7. ✅ 2984 اختبار موجود لا يتكسر (CI Backend pass)
8. ✅ ADR محدث: الحالة = "Accepted — Deliberate Integration (owner decision)"

---

## خطة التنفيذ — 3 مراحل

### المرحلة 1: Backend (الأسبوع 1)

| المهمة | الملفات | التقدير |
|---|---|---|
| إضافة `reporting_node` FK إلى HealthCase | `apps/surveillance/models/case.py` | 0.5 يوم |
| Migration لمرة واحدة لملء الحالات الموجودة | `apps/surveillance/migrations/00XX_*` | 0.5 يوم |
| `save()` override أو signal للملء التلقائي | `apps/surveillance/models/case.py` أو `signals.py` | 0.5 يوم |
| Endpoint `GET /api/v1/surveillance/reports/by-state/` | `apps/surveillance/views/reports.py` (جديد) + `urls.py` | 1 يوم |
| اختبار دمج: reporting_node يُملأ من health_facility | `apps/surveillance/tests/test_reporting_node.py` (جديد) | 0.5 يوم |
| اختبار API: by-state endpoint يعيد بيانات صحيحة | نفس الملف | 0.5 يوم |
| **المجموع المرحلة 1** | | **~3.5 أيام** |

### المرحلة 2: Frontend (الأسبوع 2)

| المهمة | الملفات | التقدير |
|---|---|---|
| مكون `<RegistryTreeSelector />` | `frontend/src/components/registry/RegistryTreeSelector.tsx` (جديد) | 1 يوم |
| استخدام المكون في Create/Edit HealthCase | `frontend/src/pages/surveillance/SurveillanceModulePage.tsx` | 0.5 يوم |
| اختبار واجهة: tree picker يعرض عقد contract | `frontend/src/pages/surveillance/__tests__/` (جديد) | 0.5 يوم |
| **المجموع المرحلة 2** | | **~2 أيام** |

### المرحلة 3: Workflow و ADR (3-5 أيام)

| المهمة | الملفات | التقدير |
|---|---|---|
| تحديث ADR: الحالة = "Accepted — Deliberate Integration" | `docs/registry-architectural-decision.md` | 0.5 يوم |
| توثيق endpoint الجديد في API docs | `docs/` | 0.5 يوم |
| مراجعة الكود + CI | — | 1 يوم |
| **المجموع المرحلة 3** | | **~2 أيام** |

### الإجمالي: ~7.5 أيام (قرابة أسبوعين مع هامش)

---

## اعتبارات المخاطرة

| المخاطر | المستوى | التخفيف |
|---|---|---|
| `reporting_node` و `health_facility` غير متناسقين | متوسط | `save()` يضمن التزامن؛ الإشارة تُطبع عند عدم التطابق |
| تطبيق surveillance التجريبي معقد (4 FKs موجودة) | منخفض | surveillance هو الأكثر استعداداً |
| UI tree picker قد يحتاج State管理 معقد | منخفض | مكون معزول، لا يؤثر على صفحات أخرى |
| 2984 اختبار قد يتكسر | منخفض جداً | `reporting_node` nullable، الاختبارات الحالية لا تمرر قيمة |

---

## القرارات المتفق عليها (في هذا discovery)

| السؤال | القرار |
|---|---|
| Q1: أي تطبيق؟ | **surveillance** (HealthCase أولاً) |
| Q2: FK إلى ماذا؟ | **`reporting_node = FK(ReportingNode, null=True, blank=True)`** على HealthCase |
| Q3: UI؟ | **`<RegistryTreeSelector />`** في Create/Edit HealthCase، استبدال FormSelect مسطح |
| Q4: Endpoint؟ | **`GET /api/v1/surveillance/reports/by-state/`** |
| Q5: اختبارات؟ | **+5 اختبار جديد، 0 كسر لاختبارات موجودة** |
| Q6: DoD؟ | FK مملوء ≥ 80%، tree picker مستخدم، endpoint يعمل، لا كسر لاختبارات |

---

## الخطوة التالية (عند اعتماد Discovery)

إصدار **M7-A2b Execution Prompt** مع:
- Migration plan دقيق
- Model change لـ HealthCase
- Serializer changes ( HealthCaseWriteSerializer يضيف reporting_node )
- ViewSet/endpoint للتجميع
- Frontend component +页面 التغيير
- اختبار جديد (~5 اختبار)
- ADR update

**لا كود، لا migrations، لا تعديل أي ملف موجود — هذا المستند فقط.**

---

## §Errata — تصحيحات بعد طلب المالك (2026-11-14)

> **سبب الإضافة:** المالك طلب ثلاث تحفظات (Q2/Q5/Q6) قبل أي Execution Prompt. كل رقم أدناه **مُتحقَّق من الريبو** في `main@120164d` بأوامر موثّقة. حيث يتعارض هذا القسم مع نص أعلاه، **§Errata هو المرجع**.

### E-1 — Q5: العدد الحقيقي 14 لا 15-20

```text
apps/surveillance/tests/  →  14 استدعاء HealthCase.objects.create
  test_ewars.py 4 · test_contacts.py 2 · test_dashboard.py 2 · test_outbreaks.py 2
  test_cases.py 1 · test_investigations.py 1 · test_reports.py 1 · test_specimens.py 1
apps/registry/tests/      →  3 ملفات
  test_no_regression.py · test_surveillance_h6.py · test_m7_a2_integration_audit.py
```

### E-2 — ادعاء "0 كسر" خاطئ في حالة A2b-full: اختباران يؤكدان **غياب** الحقل

| الاختبار | السطر | ما يؤكده |
|---|---|---|
| `test_m7_a2_integration_audit.py::test_reporting_node_not_referenced_by_surveillance` | 140 | `'reporting_node' not in fields` لـ HealthCase و HealthEvent |
| `test_m7_a2_integration_audit.py::test_no_registry_node_path_aggregation_endpoint` | ~186 | `'reporting_node_id' not in fields` لـ HealthCase |

هذان الاختباران **يوثّقان حالة M7-A2** (السجل جزيرة معزولة). إضافة FK إلى `HealthCase` **تُفشِلهما حتماً**. في A2b-full يجب استبدالهما — لا حذفهما صامتاً — مع الإبقاء على نسخة تاريخية في `m7-a2-integration-audit.md` وربطها بالأدلة.

**أثر ذلك:** A2b-full لا يعني "+5 اختبار، 0 كسر" بل "+5 اختبار، تعديل 2 اختبار تدقيق". أما A2b-lite (بلا FK) فيُبقيهما أخضرين بلا تغيير.

### E-3 — 0 اختبار ترصد يمرّر `health_facility`

```text
grep -rn "health_facility" apps/surveillance/tests/*.py   →  لا نتائج
```

كل `world` fixture ينشئ `Sector/State/EntryPoint/Locality/Disease` فقط. النتيجة:
- أي ملء عبر `save()` سينتج `NULL` في كل الـ 14 اختبار ⇒ الاختبارات تبقى خضراء **لكنها لا تُثبت شيئاً** عن الملء (تغطية زائفة).
- اختبارات A2b-full يجب أن تبني `HealthFacility` + `HealthFacilityNodeAssignment` صراحةً، وإلا فالـ DoD "≥80%" غير مقيس.

### E-4 — Q2: `HealthCase.save()` موجود بالفعل

`apps/surveillance/models/case.py:244` — الجسم كامل:

```python
def save(self, *args, **kwargs):
    if not self.case_number:
        self.case_number = self.generate_case_number()
    super().save(*args, **kwargs)
```

- الإضافة ستكون داخل override قائم (3 أسطر)، لا override جديد ⇒ التعارض التقني ليس العائق.
- العائق الحقيقي هو **الدلالة**: `save()` يُستدعى في كل كتابة (بما فيها `update_fields`)، فإعادة حلّ التعيين عند كل حفظ تفتح أسئلة التاريخية (E-5).

### E-5 — أسئلة التاريخية الأربعة (غير محلولة) ⇒ `save()` sync مرفوض

| الحالة | سلوك `save()` sync | القرار |
|---|---|---|
| لا يوجد assignment نشط | `reporting_node = NULL` | fail-safe مقبول |
| تغيّر التعيين لاحقاً | إعادة الحلّ تُعيد كتابة تاريخ الحالة القديمة | **مرفوض** — يكسر التاريخ |
| حُذف التعيين | `SET_NULL` يمحو مرجع الحالة | **مرفوض** — فقدان دليل |
| `health_facility` = NULL | يبقى NULL | مقبول |

**الحل المعتمد:** `reporting_node` nullable يُملأ **فقط** عبر management command (نمط M6-bis)، و`save()` لا يلمسه. أي sync لاحق = M7-A2b-ب منفصل بقرار مستقل.

### E-6 — Q6: آلية الملء غير موجودة اليوم

```text
grep -rn "reporting_node" apps/surveillance/models/   →  لا نتائج
```

لا `save()` sync، لا signal، لا command. لذا:

```bash
python manage.py backfill_healthcase_reporting_node --dry-run   # تقرير فقط
python manage.py backfill_healthcase_reporting_node --apply     # كتابة
```

قياس DoD: `HealthCase.objects.exclude(health_facility__isnull=True).exclude(reporting_node__isnull=True).count()` ÷ `exclude(health_facility__isnull=True).count()` — **على staging/prod بعد التشغيل**، لا على dev.

### E-7 — واقع البيانات على dev (2026-11-14) — يصبّ في صالح A2b-lite

| الجدول | العدد | ملاحظة |
|---|---|---|
| `ReportingNode` | 22 | 3 STATE · 6 LOCALITY · 12 FACILITY · **0 GLOBAL** |
| `HealthFacilityNodeAssignment` | 12 (كلها نشطة) | **12/12 منشأة لها تعيين نشط** |
| `HealthFacility` | 12 | — |
| `HealthCase` | **0** | لا حالات ⇒ تقرير by-state سيعرض أصفاراً على dev |

**الاستنتاج:** العبور `HealthFacility → assignment → node` **يعمل** على بيانات dev (12/12). العائق ليس التعيين بل **غياب الحالات**: A2b-lite يحتاج بيانات عرض (fixtures/seed) وإلا سيبدو "فاشلاً" لسبب خاطئ. كذلك **لا عقدة GLOBAL** — أي تجميع "على مستوى الدولة" يجب أن يتعامل مع غياب الجذر أو يُنشأ في seed.

### E-8 — خلاصة التحفظات الثلاثة

| التحفظ | الحالة | القرار |
|---|---|---|
| **1 — `save()` sync** | `save()` قائم، 0 معالجة للتعيين، 4 أسئلة تاريخية مفتوحة | ❌ مرفوض — management command فقط |
| **2 — عدد الاختبارات** | 14 (surveillance) + 3 (registry)؛ **0** يمرّر `health_facility`؛ **2** يؤكدان غياب الحقل | 🟠 A2b-full يكسر اختبارين تدقيق — A2b-lite لا يكسر شيئاً |
| **3 — آلية 80%** | لا آلية موجودة؛ تحتاج command + قياس على staging/prod | 🟠 مؤجل حتى يوجد ملء فعلي |

**الأثر على القرار:** التحفظات الثلاثة **تُقوّي** A2b-lite ولا تُضعفه — كلها تنشأ من الـ FK نفسه، وA2b-lite لا يضيف FK.
