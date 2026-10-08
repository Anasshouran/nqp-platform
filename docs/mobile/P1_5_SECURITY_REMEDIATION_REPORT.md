# AFYATNA MOBILE — PHASE 1.5
# SECURITY REMEDIATION REPORT

**Date:** 2026-10-08  
**Scope:** F-M1-2 (traveler isolation), SEC-M0-1 (screening authorization), NG-04 (QR fail-closed), F-M1-3 (minimum verification payload), classification enforcement.

---

## 1. F-M1-2 — Traveler object-level isolation (CLOSED)

### Change

`backend/apps/travelers/views.py`:

- New `_is_traveler_principal(user)`: authenticated + `user_type == TRAVELER` + **not** staff/superuser.
- `get_queryset()`: traveler principals are **always** `qs.filter(user=request.user)` — permission grants can no longer widen this (permission ≠ ownership).
- `get_object()`: ownership check for traveler principals **for all actions** (not only self-service) → retrieving/modifying/deleting another traveler's record = `404` (hide, no existence oracle), even with `travelers:edit` in hand.
- Superuser/staff behavior unchanged (staff keep institutional scope via existing RBAC).

### Evidence (runtime)

`backend/apps/mobile_api/tests/test_traveler_isolation.py` — matrix A–H + negatives:

| # | Case | Result |
|---|---|---|
| A | Traveler A lists (with `travelers:view`) | **own only** ✅ |
| B | A retrieves B | **404** ✅ |
| C | A updates B (even `travelers:edit`) / deletes B | **403/404** ✅ |
| D | A reads B's trip via mobile API | no 2xx ✅ |
| E | A reads B's certificate via mobile API + staff certificate surface | no 2xx / 403 ✅ |
| F | pagination / search / filter | no cross-user leakage ✅ |
| G | unauthenticated | 401 (list) / 404 (detail hide) ✅ |
| H | staff privileged access unchanged | broad scope retained ✅ |
| — | tampered object id | 404 ✅ |
| — | own retrieve / own self-service update | still works ✅ |

Run: `pytest apps/mobile_api` → 80 passed (2 former xfails now real passes).

## 2. SEC-M0-1 — Screening authorization (CLOSED)

### Change

`backend/apps/screening/views.py`:

- `permission_classes = [PermissionAction, ScopeFilter]` with `permission_resource = 'screening'` and `ACTION_TO_PERMISSION` (list/retrieve→view, create→add, scan_qr→view, latest_risk→view, refer→add).
- `get_queryset()` fail-closed by **POE/PORT/STATION scope** (`port_id__in`), SECTOR scope → all its entry points, GLOBAL scope / superuser → all. No scope at all ⇒ **zero rows**.
- `create()`: `_assert_port_in_scope()` rejects creating a screening outside the caller's scope (no side doors).

### Evidence (runtime)

`backend/apps/screening/tests/test_security_matrix.py`:

| Role | Endpoint | Read | Create | Delete | Scope enforcement |
| --- | --- | :-: | :-: | :-: | --- |
| Anonymous | `/api/v1/screening/` | 401 | 401 | n/a | — |
| Traveler | list/detail/create | 403 | 403 | n/a | — |
| Bystander role (food:view) | list/detail | 403 | 403 | n/a | — |
| Inspector (screening:view/add, PORT=KRT) | list | own port only | ✓ | n/a | cross-port create →403; cross-port detail →404 |
| No-scope staff (screening:view) | list | **empty** (fail-closed) | — | n/a | 0 rows |
| FEDERAL_DIRECTOR (GLOBAL) | list/detail | all | n/a | n/a | all |
| Superuser | list/detail | all | all | n/a | unaffected |

Also: mobile internal-boundary test (`test_screening_denied_for_traveler_token`) converted from xfail → **real 403 PASS**; search/filter/scan/latest-risk negative tests green.

## 3. NG-04 — QR verification fail-closed (CLOSED)

### Change

`backend/apps/vaccination/views.py`: `signature_ok = cert.signature_matches(signature) if signature else False`. An **unsigned or invalid** signature is now **400** with `signature_valid: false` and a failed-verification audit log. No permissive fallback.

### Backwards compatibility (§19)

No legacy unsigned format exists: `verification_signature` is **derived on-the-fly** via HMAC-SHA256 (`sign_payload`, `core/utils/qr_payload.py`) from `certificate_number` + `qr_token` for every certificate. Every issued certificate therefore has a computable valid signature at verification time — fail-closed is fully compatible with existing certificates. Traveller-QR path (`public/verify-qr`) already required `verify_payload()` (HMAC). Documented in `P1_5_QR_VERIFICATION_REPORT.md`.

## 4. F-M1-3 — Minimum verification payload (DEFINED + CLASSIFIED)

- Contract definition: `backend/apps/mobile_api/verification.py`.
- Full field table: `docs/mobile/MINIMAL_VERIFICATION_PAYLOAD.md`.
- Enforcement guard tests: `backend/apps/mobile_api/tests/test_verification_payload.py` (approved classifications; forbidden PII/health fields; SENSITIVE_HEALTH requires explicit purpose).
- Production wiring of the payload to a mobile endpoint is M2 (namespace defined but stubbed `501`).

## 5. Classification enforcement (§21)

- `SECURITY_SENSITIVE` / `INTERNAL` cannot enter mobile responses: existing `test_no_internal_or_forbidden_field_enters_mobile_schema` (green) + new verification guard.
- `SENSITIVE_HEALTH` requires an approved endpoint/field purpose — enforced in `verification.py`/tests.

## 6. Regression & scans

| Item | Result |
| --- | --- |
| `pytest apps/mobile_api apps/screening` | **80 passed** |
| `pytest apps/travelers` | **43 passed** |
| `pytest apps/vaccination` | **73 passed** (incl. QR matrix) |
| Mobile (jest, 7 suites) | **49 passed** (incl. `idp-claims` 6 tests) |
| contracts package | **11 passed** |
| bandit (-ll -ii) on changed surfaces | **0 High / 0 Medium** (exit 0) |
| secrets guard | clean |

## 7. XFAIL policy (§23) — reviewed

| Previous xfail | Finding | Action |
| --- | --- | --- |
| `test_screening_denied_for_traveler_token` | SEC-M0-1 | stripped → real PASS (403) |
| `test_traveler_type_user_with_view_permission_stays_scoped` | F-M1-2 | stripped → real PASS (scoped) |

No security test is xfail-suppressed. No security test unexpectedly XPASSed. Remaining xfails: **none** in the contract suite.