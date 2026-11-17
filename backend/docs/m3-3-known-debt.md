# M3-3 Known Debt — Technical Supervision

## D-M3-3-1: target_type = FACILITY فقط

**الحالة:** ⏸️ DEFERRED to M4 — كما هو مقصود. لا تغيير.

---

## D-M3-3-2: TechnicalSupervision SECTOR scoping غير مختبر

**الحالة:** ✅ **CLOSED** (M3-bis)

`test_sector_user_sees_own_sector_supervisions` يثبت أن SECTOR user يرى supervisions الكيانات المرئية فقط.

---

## D-M3-3-3: `reference_id` في TechnicalSupervisor غير محقَّق وجودياً

**الحالة:** ✅ **CLOSED** (M3-bis)

`TechnicalSupervisor.clean()` يتحقق من وجود `reference_id` عند `reference_type='StateMinistry'` أو `'FacilityOwner'`.

**تحقق:** `test_reference_id_invalid_rejected` + `test_reference_id_valid` — PASSED.

---

## ملخص M3-bis

| Debt | Status |
|---|---|
| D-M3-3-2 (SECTOR scoping) | ✅ CLOSED |
| D-M3-3-3 (reference_id) | ✅ CLOSED |
| D-M3-3-1 (SERVICE_POINT) | ⏸️ DEFERRED to M4 |

**M3-bis closed:** 2026-11-09
