# M6-bis — Facility FKs (HR / screening / lab / vector)

**الفرع:** `feat/organizational-registry-m6-bis` · **الأساس:** main@`bd15481`
**الحالة:** منفَّذ ومُتحقَّق محليًا — بانتظار مراجعة المالك ثم commit/push
**النطاق:** D-M5-C-F-1 · D-M5-C-F-2 · D-M5-C-F-3

---

## 1. الملخّص

| البند | القيمة |
|---|---|
| 4 حقول FK جديدة | `OrgAssignment.facility` · `HealthScreening.facility` · `LabSample.facility` · `VectorUnit.facility` |
| النوع | `ForeignKey(masterdata.HealthFacility, null=True, blank=True, on_delete=SET_NULL)` — **additive فقط** |
| `related_name` | `org_assignments` · `screenings` · `lab_samples` · `vector_units` |
| Migrations | organization `0010` · screening `0003` · laboratory `0006` · vector_control `0002` |
| Backfill | 4 أوامر إدارة (`--dry-run` + `--limit`) |
| Scoping | HR FACILITY · screening قناة facility · `SectorFieldScopedMixin.facility_path` (lab + vector) |
| اختبارات | 2958 → **2983** (+25) |
| `PROD_SCOPING_ENABLED` | False (بدون تغيير — البوابة تمنع التفعيل في الإنتاج) |
| Q7 | لم يعد حاجبًا للتطوير؛ يبقى شرطًا لـ backfill/تفعيل prod |

## 2. Models & Migrations

| App | Migration | Field |
|---|---|---|
| organization | `0010_orgassignment_facility` | `OrgAssignment.facility` → `HealthFacility`، `related_name='org_assignments'` |
| screening | `0003_healthscreening_facility` | `HealthScreening.facility` → `HealthFacility`، `related_name='screenings'` |
| laboratory | `0006_labsample_facility` | `LabSample.facility` → `HealthFacility`، `related_name='lab_samples'` |
| vector_control | `0002_vectorunit_facility` | `VectorUnit.facility` → `HealthFacility`، `related_name='vector_units'` |

كلها `AddField` واحد فقط، nullable، `SET_NULL`. لا `NOT NULL`، لا backfill داخل الـ migration
(الـ backfill أوامر إدارة منفصلة قابلة للتدقيق والتشغيل المتدرّج).

الترحيل مُطبَّق في بيئة التطوير، و`makemigrations --check` للتطبيقات الأربعة = **لا تغييرات**.

## 3. Backfill Commands

| Command | الجسر | الملف |
|---|---|---|
| `backfill_org_assignment_facility` | `OrgAssignment.entry_point` → `HealthFacility.entry_point` | `apps/organization/management/commands/` |
| `backfill_healthscreening_facility` | `HealthScreening.port` → `HealthFacility.entry_point` | `apps/screening/management/commands/` (مجلد جديد) |
| `backfill_labsample_facility` | `LabSample.entry_point` → `HealthFacility.entry_point` | `apps/laboratory/management/commands/` |
| `backfill_vectorunit_facility` | `VectorUnit.sector` → `HealthFacility.sector` | `apps/vector_control/management/commands/` |

الخيارات: `--dry-run` (لا يكتب) و`--limit N` (حد أقصى للصفوف المعالجة).
المخرجات: `scanned / updated / ambiguous / skipped`.

### 3.1 سياسة السلامة — ربط حصري فقط (تحسين على الـ prompt)

الـ prompt المقترح استخدم `.first()`، أي **اختيار منشأة عشوائية** عند تعدد المنشآت
على نفس الجسر. هذا مرفوض أمنيًا: ربط خاطئ يوسّع نطاق مستخدم FACILITY إلى سجلات
لا تخصّه (خرق least-privilege).

التنفيذ الحالي:

- يُملأ السجل **فقط** إذا كان للجسر **منشأة نشطة واحدة**.
- إن وُجدت أكثر من منشأة نشطة → يُترك الحقل `NULL` ويُحتسب `ambiguous` (لا تخمين).
- السجلات المملوءة مسبقًا لا تُلمس (idempotent: `facility__isnull=True`).

**أثر متوقّع:** على بيانات الإنتاج قد تكون نسبة التعبئة أقل من 50% لحالات
`VectorUnit` (قطاع واحد يضم عدة منشآت) ولحالات المعابر المتعددة المنشآت.
هذا **ليس عطلًا** — إنه الفشل الآمن المطلوب، ويُقاس في Q7 ويُعالج ببيانات
أدق (ربط صريح) لا بتخمين.

## 4. Scoping Paths

### 4.1 HR — `apps/hr/scoping.py`

- `SCOPE_LOOKUPS['FACILITY'] = ('facility_id',)` — مسار صالح على مخطط `OrgAssignment`
  (اختبار `TestScopeLookupsAreValid` القائم يتحقق من كل المسارات).
- `resolve_own_org_scope_keys` يضيف `('FACILITY', a.facility_id)` عند وجودها.
- تعيينات الأدوار بنطاق `FACILITY` تُحترم تلقائيًا عبر `active_assignments(...)`.
- **البوابة:** `resolve_hr_scope_keys` تُسقط كل مفاتيح `FACILITY` عندما
  `facility_scope_enabled()` = False (إنتاج بلا `PROD_SCOPING_ENABLED`)
  ⇒ `set()` ⇒ حجب كامل، لا توسيع بلا بيانات.

### 4.2 Screening — `apps/screening/views.py`

قناتان في اتحاد (لا استبدال):

1. **قناة المعبر:** نطاق `FACILITY` → منافذ المنشأة عبر `HealthFacility.entry_point`
   (`_entry_point_ids_for`، محجوبة بالبوابة).
2. **قناة المنشأة المباشرة:** `HealthScreening.facility` عبر
   `get_user_facility_ids` في `get_queryset` (محجوبة بالبوابة).

`get_queryset` يبني `Q(port_id__in=...) | Q(facility_id__in=...)`؛ بلا أي قناة ⇒
`qs.none()` (الفشل الآمن السابق محفوظ). منشأة بلا `entry_point` تعمل عبر القناة
المباشرة فقط (اختبار مخصص).

### 4.3 Laboratory / Vector — `core/utils/scoping.py`

- `SectorFieldScopedMixin.facility_path` (افتراضي `None` = حجب FACILITY).
- `facility_path='facility_id'` على:
  - `LabSampleViewSet` (بجانب `state_path` و`locality_path`)
  - `VectorUnitViewSet` (بجانب `sector_field` و`state_path`)
- الاتحاد: قطاع ∪ ولاية ∪ محلية ∪ **منشأة**. غياب كل القنوات ⇒ `qs.none()`.
- `get_user_facility_ids` تُعيد `None` للوطني (GLOBAL) لكن المسار الوطني مُعالَج
  قبل ذلك في الـ mixin؛ القيمة `None` تُعامل كمجموعة فارغة احتياطيًا.

### 4.4 لم يُمسّ

- `asserts_geographic_scope` يبقى **FACILITY-free** (قرار Q8) — D-M5-C-F-4 تبقى دينًا.
- لا اشتقاق FACILITY→port في `port_health`/`shipping`.

## 5. Tests (+25)

| الملف | العدد | التغطية |
|---|---|---|
| `apps/hr/tests/test_facility_scope.py` | 6 | المسار، تعيين الدور، البوابة، الرؤية داخل المنشأة، عدم التوسيع الضمني |
| `apps/screening/tests/test_facility_scope.py` | 4 | منشأة/أخرى، الاتحاد عبر facility، منشأة بلا منفذ، البوابة |
| `apps/laboratory/tests/test_facility_scope.py` | 3 | عزل، اتحاد facility، البوابة |
| `apps/vector_control/tests/test_facility_scope.py` | 3 | عزل، اتحاد facility، البوابة |
| `apps/organization/tests/test_m6_bis_backfill.py` | 9 | nullability/SET_NULL، dry-run، limit، ambiguous، الأوامر الثلاثة الأخرى |
| **المجموع** | **25** | |

كل اختبارات "التسريب عبر المنشآت" صريحة (`foreign.id not in ids`) — ليست ضمنية.

### 5.1 اختبار M5-C-F مُحدَّث (سياسة متقادمة)

`apps/registry/tests/test_m5_integration/test_facility_deny_all.py` كان يثبّت سياسة
M5-C-F (deny-all). M6-bis يغلق هذا الدين عمدًا، لذا:

- `test_screening_deny_all` → **`test_screening_facility_resolves_via_entry_point`**
  (يثبت الآن أن الفحص مرئي عبر جسر المنشأة→المنفذ).
- `test_hr_deny_all` → `test_hr_unlinked_assignment_stays_invisible`
  و`test_laboratory_deny_all` → `test_laboratory_unlinked_sample_stays_invisible`
  (السلوك باقٍ صحيحًا: السجلات **بلا** `facility` FK تبقى غير مرئية).
- الـ class أُعيدت تسميته `TestFacilityUnlinkedRecordsDenyAll`.

العدد الكلي لم يتغيّر (إعادة تسمية/تحديث، لا إضافة/حذف).

## 6. التحقق (Verification)

| الفحص | النتيجة |
|---|---|
| `python manage.py check` | ✅ 0 issues |
| `makemigrations --check` (التطبيقات الأربعة) | ✅ No changes detected |
| `python manage.py migrate` | ✅ 4 migrations applied |
| الاختبارات المستهدفة | ✅ **25 passed** |
| الاختبارات القائمة للوحدات المتأثرة | ✅ **466 passed** (hr/screening/lab/vector/organization) |
| الحزمة الكاملة | ✅ **2983 passed · 0 xfail · 2 skip** |

> **ملاحظة بيئة محلية (لا تخص CI):** تشغيل الحزمة داخل حاوية التطوير يتطلب
> تمرير `REDIS_HOST=redis` و`CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` إلى
> عنوان خدمة redis (ملف `backend/.env` المحلي يثبّت `127.0.0.1`، وهو غير متاح
> داخل الحاوية)، ومحاذاة تخطيط المسارات (`/backend`→`/app` و`/deploy`) لأن
> بعض الاختبارات تقرأ ملفات المستودع من جذر المستودع كما في CI. لا تغيير في
> الكود بسبب ذلك.

## 7. Gate & Q7

`PROD_SCOPING_ENABLED` بقي `False`. الأثر في الإنتاج حتى تفعيله:

- أي مستخدم يملك **فقط** نطاق `FACILITY` يرى **صفر صفوف** في HR/screening/lab/vector.
- القنوات الأخرى (SECTOR/STATE/LOCALITY/POINT...) تعمل كما هي — FACILITY قناة إضافية.

**Q7 يقرر:** بعد backfill في staging/prod (بعد مراجعة المالك)، هل التعبئة كافية
(≥50%) لتفعيل `PROD_SCOPING_ENABLED=True`؟ إن كانت منخفضة، FACILITY يبقى deny-all
بلا أي أثر جانبي — وهذا هو التصميم المقصود.

## 8. ملاحظات للمالك قبل الدمج

1. **انحراف موثّق عن الـ prompt:** backfill يربط الحالات الحصرية فقط ويترك
   `ambiguous` بلا ربط (بدل `.first()` العشوائي). موصى به أمنيًا — يلزم اعتمادك.
2. `apps/screening` لم يكن لديه `management/` — أُنشئ (`__init__.py` × 2).
3. لا تغييرات في الـ serializers (لا حقول جديدة في الواجهات) — M6-bis طبقة بيانات/نطاق.
4. `backend/docs/m5-c-known-debt.md` لم يُعدَّل في هذا الفرع؛ يُقترح تسجيل إغلاق
   D-M5-C-F-1/2/3 بعده في commit توثيقي منفصل إن رغبت.
