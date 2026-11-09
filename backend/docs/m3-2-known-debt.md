# M3-2 Known Debt — FacilityOwnership

## D-M3-2-1: FacilityOwner.reference_id غير مُحقَّق

**الحالة:** ✅ **CLOSED** (M3-bis)

**الحل:** `FacilityOwner.clean()` يتحقق:
- `reference_type` مطلوب عند وجود `reference_id`.
- `reference_id` مطلوب عند وجود `reference_type`.
- إن كان `reference_type == 'StateMinistry'`، يتحقق من وجود الكيان.

**تحقق:** `test_reference_id_validation` + `test_reference_id_valid` — PASSED.

---

## D-M3-2-2: FacilityOwnership بدون scoping دقيق

**الحالة:** ✅ **CLOSED** (M3-bis)

**الحل:** `RegistryScopedViewSet.get_queryset` يحتوي حالة `FacilityOwnership` → `qs.filter(facility_id__in=allowed['facilities'])`.

**تحقق:** `test_sector_user_sees_own_sector_ownerships` — PASSED.

---

## D-M3-2-3: لا uniqueness على (facility, owner) النشط

**الحالة:** ✅ **CLOSED** (M3-bis)

**الحل:** `UniqueConstraint(fields=['facility', 'owner'], condition=Q(valid_to__isnull=True))` في `FacilityOwnership.Meta.constraints`.

**Migration:** `0004_facility_ownership_unique_active` — مطبقة في dev.

**تحقق:** `test_duplicate_active_ownership_same_owner_rejected` + `test_historical_same_owner_allowed` — PASSED.

---

## ملخص M3-bis

| Debt | Status |
|---|---|
| D-M3-2-1 (reference_id) | ✅ CLOSED |
| D-M3-2-2 (SECTOR scoping) | ✅ CLOSED |
| D-M3-2-3 (unique active) | ✅ CLOSED |

**M3-bis closed:** 2026-11-09
