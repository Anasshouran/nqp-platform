# M5-C-F Planning — FACILITY Scope (نطاق المنشأة الصحية)

**الحالة:** تخطيط + اكتشاف مصغّر — **لا تنفيذ** قبل موافقة المالك.
**التقدير:** 4–6 أيام · **بوابة:** `PROD_SCOPING_ENABLED` (نفس نمط M5-C-L)
**شرط سابق إلزامي:** COUNT على staging/prod لتغطية `HealthFacility.entry_point`
(dev حالياً **0/12** — التحقق مستحيل محلياً).

---

## 1. الاكتشاف المصغّر (m5-c-f mini-discovery)

### 1.1 الحقائق من الكود (متحقَّق منها الآن)

| الكيان | الحقل | ملاحظة |
|---|---|---|
| `masterdata.HealthFacility` | `entry_point` FK (SET_NULL, nullable) | الجسر الوحيد المتاح للترجمة |
| `masterdata.HealthFacility` | `locality`, `sector` FK | لا تُستخدم للتوسيع (least privilege) |
| `screening.HealthScreening` | `port` FK → EntryPoint فقط | **لا `facility` FK** |
| `organization.OrgAssignment` | `entry_point` فقط | **لا `facility` FK** → D-M5-C-F-1 |
| `registry.HealthFacilityNodeAssignment` | `facility` FK | جاهز منذ M1 → union + subtree |
| `laboratory.LabSample` | `entry_point` FK | `facility_path` عبر entry_point |

### 1.2 قيود دلالية يجب اعتمادها قبل التنفيذ

1. **screening لا يملك بُعد منشأة:** ترجمة FACILITY → `HealthFacility.entry_point`
   ⇒ ``HealthScreening.port__in=facility_ep_ids``. النتيجة: FACILITY scope تفتح
   **كل فحوصات المنفذ** الذي تتبعه المنشأة — لا فحوصات المنشأة وحدها (أدق
   حبيبة متاحة في المخطط). بدائل: (أ) قبول القيد وتوثيقه؛ (ب) `screening_deny`
   حتى يضاف `HealthScreening.facility` (M6+). **قرار مطلوب.**
2. **منشآت متعددة على نفس المنفذ:** FACILITY على منشأة واحدة تفتح صفوف
   المنفذ المشترك — سلوك متوقع وموثّق.
3. **منشأة بلا entry_point:** FACILITY scope → `[]` ⇒ deny-all (fail-safe).
   لذلك COUNT ≥ 80% شرط تفعيل البوابة.
4. **HR:** deny-all حتى M6 — لا تغيير في `resolve_hr_scope_keys` لـ FACILITY
   (D-M5-C-F-1).
5. **registry:** الأثر الوحيد المباشر الآمن — `HealthFacilityNodeAssignment`
   (facility_id) + subtree path، مناظر تماماً لمساري STATE/LOCALITY.

## 2. خطة التنفيذ المقترحة (بنفس بنية M5-C-L)

### M5-C-F-1 — Enum + Validation + Migration
- `ScopeType.FACILITY = ('FACILITY', 'منشأة صحية')`
- migration choices-only (نمط 0019)
- `_validate_scope_id`: `'FACILITY': ('masterdata.HealthFacility', 'المنشأة')`

### M5-C-F-2 — scoping.py
- `facility_scope_enabled()` (أو إعادة استخدام `locality_scope_enabled` كـ
  `scoping_scope_enabled()` إن اعتمد المالك توحيد البوابة)
- `get_user_facility_ids(user)` (gate داخلياً)
- `_facility_entry_point_ids(facility_ids)`:
  `HealthFacility.objects.filter(id__in=..., entry_point__isnull=False).values_list('entry_point_id')`
- resolver: فرع `FACILITY` + union (لا استبدال)
- `asserts_geographic_scope`: + FACILITY (بلا بوابة — fail-closed)

### M5-C-F-3 — تطبيقات
- **registry:** `user_facility_ids` union في `facility_ids` +
  `facility_path_q` (HealthFacilityNodeAssignment subtree) في **الموقعين**
  (`_visible_reporting_node_ids` + `get_queryset`) — نفس حرص V-3/V-4.
- **screening:** فرع FACILITY في `_entry_point_ids_for` (بعد قرار القيد 1.2-1).
- **laboratory:** `facility_path` في Mixin — **تصميم جديد**: يحتاج
  `ep_path` (مسار الصف إلى EntryPoint، مثل `entry_point_id` أو
  `sample__entry_point_id`) ثم `Q(**{f'{ep_path}__in': facility_ep_ids})`.
  بديل أبسط: بدون Mixin — `facility_path` غير ضروري إن اكتفينا بترجمة
  الـ resolver (SectorFieldScopedMixin لا يستدعي resolver). **قرار مطلوب.**
- **vector_control:** VectorTeam `ep_path='entry_point_id'` (اختياري).
- **HR:** خارج النطاق (D-M5-C-F-1).

### M5-C-F-4 — Frontend
- `'FACILITY'` في `ScopeType`/`SCOPE_TYPES`
- منتقي منشأة (`/api/v1/master-data/facilities/` أو المكافئ) في Dialog
- label `scopeType` = «منشأة صحية»

### M5-C-F-T — الاختبارات (~20)
- resolver: own/cross/union/plain · gate off/on · combined fail-closed
- registry node + subtree (facility assignment)
- screening: منفذ المنشأة مرئي / لا تسرب منشأة أخرى (مع توثيق القيد)
- laboratory: عبر ep_path (إن اعتُمد)
- API validation: 201/400

### M5-C-F-D — Docs
`backend/docs/m5-c-f.md` + Activation Checklist (COUNT أولاً).

## 3. قرارات مطلوبة من المالك قبل البدء

1. **القيد الدلالي screening:** (أ) قبول «منفذ المنشأة» وتوثيقه، أم
   (ب) screening-deny حتى M6؟
2. **laboratory:** إضافة `ep_path` للـ Mixin (توسيع معماري محدود) أم
   ترك المختبر على قنوات SECTOR/STATE/LOCALITY فقط مع FACILITY-deny؟
3. **البوابة:** `PROD_SCOPING_ENABLED` مشتركة (LOCALITY+FACILITY) أم مفتاح
   منفصل `PROD_FACILITY_SCOPING_ENABLED`؟
4. **COUNT:** تشغيله على staging/prod قبل أي كود (شرط التفعيل، وليس شرط
   التنفيذ في dev — التنفيذ ممكن بالبوابة مغلقة).
5. **الترتيب:** مباشرة بعد M5-C-L أم بعد M5-D؟

## 4. المخاطر

| المخاطرة | التخفيف |
|---|---|
| ترجمة FACILITY عبر EP أوسع من المنشأة | توثيق + اختبار مقارنة + قرار 1.2-1 |
| 0% تغطية entry_point في dev | fixtures كاملة + COUNT staging/prod قبل التفعيل |
| تباين الموقعين في registry | نفس حرص V-3/V-4 + اختبار تسريب تاريخي (`valid_to`) |
| تسرب historical assignments | `valid_to__isnull=True` في كل فرع (نمط M4-2-bis) |
