# M4-3 Known Debt — Registry Tree UI

## D-M4-3-1: لا Vitest

**الوضع:** M4-3 اعتمد manual verification. لا اختبارات آلية.

**الحل المقترح (M5):** إضافة `@testing-library/react` + Vitest، اختبارات:
- Tree renders correctly
- Picker filters
- Loading/error states

## D-M4-3-2: لا pagination

**الوضع:** الشجرة تُجلب كاملة. يعمل مع <1000 nodes. لو تجاوزت 5000، قد يبطؤ.

**الحل المقترح (M5):** lazy-load children on expand، أو API يدعم `?parent_id=`.

## D-M4-3-3: Facility detail page غائب

**الوضع:** المستخدم يرى الشجرة لكن لا يستطيع النقر على منشأة لرؤية تفاصيلها.

**الحل المقترح (M4-4):** صفحة تفاصيل مع tabs (ownership, supervision, services).

## D-M4-3-4: لا edit/create

**الوضع:** read-only فقط.

**الحل المقترح (M4-4):** forms + validation + optimistic updates.

## D-M4-3-5: Dashboard tree endpoint — scoping added (deviation)

**الوضع:** `/dashboard/tree/` كان غير مُقيَّد (ViewSet عادي، لا RegistryScopedViewSet). M4-3 أضاف scoping عبر reuse of RegistryScopedViewSet.get_queryset() logic. deviation from "no backend changes" but necessary for STATE user scoping.

**الحل (M4-4/M5):** refactor: extract `_visible_reporting_node_ids(user)` helper used by both get_queryset and tree action. Currently duplicated logic.

## D-M4-3-6: STATE user tree — root becomes state node (not FEDERAL)

**الوضع:** STATE user لا يرى FEDERAL root. The state node becomes the root of the displayed tree (depth preserved but parent null in output). This is correct (no leak) but depth labels may be confusing.

**الحل (M4-4):** adjust depth display or add "scope indicator" in UI.
