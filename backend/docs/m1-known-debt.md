# M1 Known Debt — Organizational Registry

هذا الملف يوثّق الديون التقنية المقبولة في M1، التي يجب معالجتها في M2 أو لاحقاً.

**آخر تحديث:** 2026-11-09
**المرجع:** M1 Closure Review v2 → M1-bis Micro-Audit
**المرحلة:** M1 — Organizational Registry Foundation

---

## D-1: RegistryChangeLog يدوي

**الوضع:** التسجيل يتم يدوياً في `seed_registry_testdata.py` فقط. لا Signals، لا `save()` override.

**الأثر:**
| العملية | مسجّلة؟ |
|---|---|
| CREATE (من Seed) | ✅ نعم |
| UPDATE | ❌ لا |
| DELETE | ❌ لا |
| تعديلات Django Admin | ❌ لا |
| تعديلات API (M2) | ❌ لن تُسجَّل حتى يُضاف الـ hook |

**الحل المقترح (M2):** `apps/registry/signals.py` مع `post_save` + `post_delete` لكل النماذج الستة.

**السبب في التأجيل:** M1 Scope Document §8 نصّ صراحةً على عدم إضافة signals في M1.

---

## D-2: ReportingNode.clean() workaround

**الوضع:** `is_new` يُكتشف بـ `not ReportingNode.objects.filter(pk=self.pk).exists()` — استعلام إضافي لكل `clean()`.

**السبب:** `BaseModel.id` يُولَّد في `__init__` (UUID default)، فـ `pk is None` لا يعمل — الكائن غير المحفوظ لديه pk فعلي (UUID) مُولَّد مسبقاً.

**الحل المقترح (M2):** مراجعة `BaseModel` نفسه — إضافة flag `_state.adding` (Django's mechanism) بدل استعلام DB في كل `clean()`.

**الأثر الأدائي:** استعلام `EXISTS` إضافي لكل `clean()` — ضئيل الآن (عمليات يدوية)، سيكون ملحوظاً في M2 عند بناء API.

---

## D-3: ReportingNode.clean() لا يحمي من bulk_create

**الوضع:** `bulk_create` يتجاوز `clean()` (Django behavior — لا يستدعي `full_clean()`).

**الحماية الحالية:**
| الحماية | المستوى | يحمي من |
|---|---|---|
| `UniqueConstraint(parent=NULL)` [X-4] | DB | جذرين |
| `UniqueConstraint(code)` | DB | تكرار code |
| `CheckConstraint(no_self_parent)` | DB | self-parent |
| `clean()` — الجذر يجب أن يكون FEDERAL | Python | جذر غير FEDERAL |

**الحماية الناقصة:**
- `kind=FEDERAL` للجذر **فقط** في `clean()` — أي `bulk_create` بجذر STATE سيمرّ عبر الـ DB.
- التحققات المركبة (مثل `depth` متسق مع `path`) لا تُفرَض على DB.

**الحل المقترح (M2):** 
- إضافة `CheckConstraint` على DB: `(parent IS NULL AND kind='FEDERAL') OR (parent IS NOT NULL)`.
- مراجعة كل سيناريوهات `bulk_create` قبل استخدامها في API.

---

## D-4: check_facility_consistency — 2 من 3 فحوص غير مختبرة

**الوضع:**
| الفحص | مختبر؟ | السبب |
|---|---|---|
| `facility.locality.sector != facility.sector` | ✅ نعم | `test_mismatch_exits_with_code_1` |
| `entry_point.sector != facility.sector` | ❌ لا | كل المنشآت في dev بلا `entry_point` |
| `locality.sector != entry_point.sector` | ❌ لا | نفس السبب |

**الأثر:** الفحصان غير المُختبَران قد لا يعملان فعلياً على بيانات إنتاجية. لا ضمان أن exit code = 1 عند وجود تناقض في `entry_point`.

**الحل المقترح (M2):** بعد إدخال بيانات حقيقية أو بذر `EntryPoint` اختبارية — إضافة اختبارين يغطيان P2/P3.

---

## D-5: CheckConstraint.check deprecated (Django 5.2)

**الوضع:** `CheckConstraint(check=...)` مُهمَل في Django 5.2. البديل `condition=` متاح في 5.1+.

**المواقع:**
- `apps/registry/models.py` — 1 قيد (`reporting_node_no_self_parent`)
- تطبيقات أخرى (port_health, shipping) — قيود مشابهة

**التحذير:**
```
RemovedInDjango60Warning: CheckConstraint.check is deprecated in favor of .condition.
```

**الحل المقترح (M2):** تحويل دفعة واحدة لكل `CheckConstraint` في المشروع (وليس في registry فقط) — لتجنب migration مبعثرة.

**السبب في التأجيل:** التحويل الفردي في registry سيخلق migration لا معنى لها بينما بقية المشروع على `.check=`.

---

## D-6: FED root — Manual shell artifact + Seed deviation

**الوضع:** العقدة الجذرية في DB تحمل `code='FED'` بدلاً من `TEST_FMOH` المتوقع من Seed.

**التشخيص (X-2 evidence):**
| الحقيقة | القيمة |
|---|---|
| `FED` created_at | 2026-11-09 09:25:48 UTC |
| Seed run | 2026-11-09 09:54:08 UTC |
| `FED` ChangeLog entries | 0 |
| Root count in DB | 1 |
| `TEST_FMOH` exists | NO |
| `--reuse-db` active | YES (`addopts = --import-mode=importlib --reuse-db`) |
| `test_create_root_and_child` transaction | NO (`@pytest.mark.django_db` بلا `transaction=True`) |

**مصدر `FED`:** **Manual shell artifact** — أُنشئت عبر `python manage.py shell` أثناء التحقق من سلوك `pk is None` في `ReportingNode.clean()`. **ليست** من اختبار (rollback افتراضي يمنع بقاء بيانات الاختبار)، و**ليست** من Seed (الذي يكتب ChangeLog).

**انحراف Seed عن M1 Spec:**
`seed_registry_testdata` يفحص وجود **أي** جذر (`parent=None`) ويعيد استخدامه. لا يُنشئ `TEST_FMOH` إلا إذا لم يوجد جذر. M1 Scope Document §2 الخطوة 7 حدد `TEST_FMOH` كمعرّف الجذر — التنفيذ الفعلي يتجاوز هذا.

**الأثر:**
- اصطلاح `TEST_` prefix مكسور للجذر.
- `FED` لا يبدأ بـ `TEST_` — يخلق التباساً عند قراءة البيانات (يبدو كبيانات إنتاج).

**الحل المقترح (M2):**
- إما تحديث Seed ليرفض العمل إن وُجد جذر بـ code لا يبدأ بـ `TEST_` (fail-loud).
- أو إضافة `management command rename_root` للتحويل من `FED` إلى `TEST_FMOH`.
- أو توثيق `FED` كاسم رسمي معتمد (إن كان مقصوداً).

**لا يُنفَّذ في M1.** `FED` صالح وظيفياً، وRoot count = 1 سليم.

---

## D-7: `--reuse-db` + `transaction=True` — خطر تلوث مستقبلي

**الوضع:** `pytest.ini`/`setup.cfg` يستخدم `--reuse-db`. الاختبارات الحالية تستخدم `@pytest.mark.django_db` فقط (rollback افتراضي) — آمنة.

**الخطر:** أي اختبار مستقبلي بـ `@pytest.mark.django_db(transaction=True)` سيترك بياناته في القاعدة. مع `--reuse-db`، البيانات المتروكة تنتقل بين التشغيلات، وقد تُسبّب فشلاً في اختبارات مستقلة أو `UniqueViolation` (كما حدث في M1 سابقاً مع `registry_reportingnode`).

**الحل المقترح (M2 أو CI):**
- إما `--create-db` افتراضياً في CI (بطيء لكن آمن).
- أو فرض مراجعة صارمة عند إضافة أي `transaction=True`.
- أو استخدام fixture تنظيف شامل (`django_db_reset_sequences` + teardown).

**السبب في التأجيل:** لا اختبار حالي يستخدم `transaction=True` — الخطر نظري حتى الآن.

---

## D-8: `docker-compose.override.yml` غير gitignored

**الوضع (X-1 evidence):**
| السؤال | الإجابة |
|---|---|
| Gitignored | NO |
| In prior commit | NO |
| In remote | NO |
| Contains secrets | NO (فقط مراجع متغيرة `${DB_PASSWORD}`، لا قيم) |
| Production patterns | NO |

**الملف آمن حالياً** — لا أسرار فعلية، فقط image references & build directives.

**الخطر الكامن:** الملف غير متتبع لكنه **غير gitignored**. أي `git add .` عرضي سيضمّه إلى commit. إن أُضيف لاحقاً متغيرات بقيم حقيقية، يصبح تسريباً.

**الحل المقترح (قبل أول push لـ M1):** إضافة السطر التالي إلى `.gitignore`:
```
deploy/docker-compose.override.yml
```

**لا يُنفَّذ في M1-bis** (خارج نطاق التشخيص — إنما يُنفَّذ في تحضير commit M1 Closure).

---

## D-9: transaction=True في test_reject_nonexistent_facility_id

**الوضع:** اختبار FK rejection يستخدم `@pytest.mark.django_db(transaction=True)` لضمان ظهور `IntegrityError` (Django يغلّف الاختبارات في transaction افتراضياً، فيؤجل الـ FK check حتى commit).

**الأثر الحالي:** لا شيء — الاختبار يفشل قبل commit، فلا بيانات تُترك في القاعدة.

**الخطر الكامن:** مع `--reuse-db` (D-7)، أي تعديل مستقبلي على الاختبار قد يترك بيانات متراكمة بين التشغيلات.

**البديل المرفوض:** استخدام `pytest.raises` مع `save()` منفصل لا يُظهر الخطأ في Django ORM — الاختبار الحالي هو الأنسب عملياً.

**الحل المقترح (M2):** مراجعة عند تنظيف D-7 — إما `--create-db` في CI، أو تدقيق كل `transaction=True` عند إضافته.

---

## D-10: Test suite بطيء مع --create-db (349s لـ 21 اختبار)

**الوضع:** 21 اختباراً تستغرق ~349s عند التشغيل مع `--create-db` (إنشاء test DB من الصفر). لكن مع `--reuse-db` تستغرق **2.8s** فقط.

**التشخيص (Task 1 evidence):**
```
pytest --durations=10 --reuse-db → 17 passed in 2.80s
pytest --create-db              → 21 passed in 349.82s

Top durations (reuse-db):
  1.70s setup    test_valid_to_before_valid_from  (first test — DB setup)
  0.59s call     test_seed_twice_same_count        (seed idempotency)
  0.08s call     test_move_updates_descendant_paths
  ... كل الاختبارات الأخرى: 0.02-0.04s
```

**السبب الجذري:**
- الـ 349s **ليست** من الاختبارات نفسها — هي من إنشاء test database من الصفر.
- إنشاء test DB يتطلب تشغيل **كل migrations** لكل التطبيقات (~30+ تطبيقاً).
- pytest.ini يستخدم `--reuse-db` افتراضياً، لكن عند تعديل migrations (مثل squash في Group B)، يجب استخدام `--create-db` لإعادة إنشاء DB — وهنا تحدث البطء.
- `--reuse-db` يختصر الإنشاء إلى seconds (الاختبارات نفسها سريعة: ~0.02s average).

**الفرضيات المرفوضة:**
- ❌ `transaction=True` في `test_reject_nonexistent_facility_id` — ليس السبب (يستغرق ~17s فقط).
- ❌ overhead من PostGIS/seed — لا، الـ migrations هي السبب.

**الحل المقترح (M2 Day 1):**
- استخدم `--reuse-db` افتراضياً في CI (موجود أصلاً في pytest.ini).
- عند تعديل migrations، استخدم `--create-db` مرة واحدة فقط.
- إعداد `conftest.py` مع fixtures مشتركة لتقليل تكرار الإنشاء.

**السبب في التأجيل:** لا يعيق M1. الـ 349s حدثت مرة واحدة بسبب squash migrations. التشغيلات التالية مع `--reuse-db` تستغرق ~3s.

---

## ملخص الديون

| # | البند | الأولوية | المرحلة المستهدفة |
|---|---|---|---|
| D-1 | RegistryChangeLog يدوي | 🟠 عالية | M2 (مع API) |
| D-2 | ReportingNode.clean() workaround | 🟡 متوسطة | M2 |
| D-3 | bulk_create يحتمي فقط بـ DB constraints | 🟡 متوسطة | M2 |
| D-4 | consistency check — 2 حالات غير مختبرة | 🟡 متوسطة | M2 |
| D-5 | CheckConstraint.check deprecated | 🟢 منخفضة | M2 (دفعة واحدة) |
| D-6 | FED root — naming deviation | 🟡 متوسطة | M2 أو pre-commit |
| D-7 | --reuse-db + transaction=True risk | 🟡 متوسطة | M2 أو CI |
| D-8 | docker-compose.override.yml not gitignored | 🟠 عالية | pre-commit |
| D-9 | transaction=True in FK test — reuse-db risk | 🟡 متوسطة | M2 |
| D-10 | `--create-db` overhead يبطئ test suite | 🟢 منخفضة | M2 |

## D-10 تفاصيل إضافية

**الحالة:** التشخيص مكتمل (Task 1). الأثر الحقيقي هو migration overhead لـ `--create-db` وليس اختبارات بطيئة.

**الدلتا:** 349s (create-db) vs 2.8s (reuse-db).
