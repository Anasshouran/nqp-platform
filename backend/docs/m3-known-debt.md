# M3 Known Debt — Organizational Registry

**آخر تحديث:** 2026-11-09
**المرجع:** M3-1 Debt Closure

---

## D-M2-1 (M1) — مغلق

`RegistryChangeLog.user` يُملأ الآن عبر `CurrentUserMiddleware` + `RegistryScopedViewSet.initial()`.

**التحقق:** `test_middleware_user.py` — 3 tests pass.

**المنطق:**
- Middleware (عند Django level) يلتقط `request.user` للطلبات Session-based.
- `initial()` (عند DRF level) يلتقط `request.user` للطلبات `force_authenticate` والطلبات JWT-based.
- Signals تقرأ من contextvar.

---

## D-M2-2 (M1) — مغلق

`http_method_names = ['get', 'post', 'patch', 'head', 'options']` في `RegistryScopedViewSet` يمنع DELETE.

**تحقق:** `test_delete_not_allowed` in `test_api_nodes.py`.

---

## D-M2-3 (M1) — مغلق جزئياً

`RegistryScopedViewSet.get_queryset()` ينفّذ scoping كامل:
- GLOBAL/superuser: كل شيء.
- SECTOR/DEPARTMENT/POINT: عبر `resolve_authorized_entry_points` → entity IDs (states/localities/facilities).
- بلا scope: `qs.none()` (fail-safe).

**الناقص:**
- `RegistryChangeLog` scoping مؤجل (polymorphic — entity_type متنوع).
- scoping متقدم (e.g., مسؤول ولاية يرى ولاياته فقط عبر State scope) يحتاج `ScopeType.STATE` (مؤجل — DP-7).

**تحقق:** `test_scoping_sector.py` — 2 tests pass.

---

## D-4 (M1) — مغلق

جميع فحوص `check_facility_consistency` الثلاثة مختبرة الآن:
1. `locality.sector != facility.sector` ✅
2. `entry_point.sector != facility.sector` ✅ (جديد — TestConsistencyEntryPoint)
3. `locality.sector != entry_point.sector` ✅ (جديد — TestConsistencyEntryPoint)

**تحقق:** 4 tests في `test_consistency_check.py` (2 قديمة + 2 جديدة).

---

## D-3 (M1) — bulk_create لا يُطلق signals

يبقى كما هو في M1. `test_bulk_create_no_signals` يُوثّق السلوك.

---

## D-M3-1 (جديد) — RegistryChangeLog scoping مؤجل

**الوضع:** `RegistryChangeLogViewSet.get_queryset()` حالياً يفعل `qs` للـ GLOBAL، و `qs.none()` لغيره. scoping على `entity_type/entity_id` Polymorphic معقد.

**الحل المقترح (M3-bis):** فلترة حسب entity_type:
- ReportingNode logs → filtered by visible node IDs
- StateNodeAssignment logs → filtered by visible state IDs
- إلخ.

**الأولوية:** 🟡 متوسطة — القارئ الحالي يرى Logs الكاملة (GLOBAL) أو لا شيء (non-GLOBAL).
