# AFYATNA MOBILE — PHASE 1.5
# MINIMAL VERIFICATION PAYLOAD (F-M1-3)

**Date:** 2026-10-08  
**Binding contract:** any mobile verification flow returns **only** the fields below. Machine-readable mirror: `backend/apps/mobile_api/verification.py`.

## 1. Approved minimal payload

| Field | Purpose | Classification | Source | Consumer | Required? | Retention |
| --- | --- | --- | --- | --- | --- | --- |
| `verified` | قاطع: اعتماد الشهادة (سارية/غير سارية) | PUBLIC | verification result | traveler / verifier | Yes | not persisted client-side |
| `signature_valid` | سلامة التوقيع المقروء من QR | PUBLIC | signature check | traveler / verifier | Yes | not persisted |
| `verified_at` | طابع زمني للتحقق (تدقيق/نزاع) | PUBLIC | server time | verifier / audit | Yes | audit log (server) |
| `certificate_number` | مرجع الشهادة للتواصل مع جهة الإصدار | SECURITY_SENSITIVE | certificate record | traveler / verifier | Yes | server record |
| `status` | حالة دورة حياة الشهادة (يكشف الصحة) | SENSITIVE_HEALTH | certificate record | traveler / verifier | Yes | rendered on demand only |
| `valid_until` | نافذة السريان (دليل تحقق) | SENSITIVE_HEALTH | certificate record | traveler / verifier | Yes | rendered on demand only |
| `signature` (echo) | التوقيع المقروء اختيارياً لإعادة التحقق | SECURITY_SENSITIVE | input QR | verifier | Optional | not persisted |

## 2. Explicitly forbidden in any mobile verification response

`vaccine_name_ar`, `vaccine_name`, `vaccine_code`, `issued_at`, `passport_number`, `passport_hash`, `traveler_id`, `traveler_name`, `full_name`, `nationality`, `rejection_reason`, `risk_score`, `risk_assessment`, `internal_notes`, `staff_notes`, `operator_notes`.

**Rule (§20):** these exist in earlier responses (`vaccination/views.py:546-557` includes `vaccine_name_ar`/`vaccine_code`/`issued_at`; `VerifyCertificateView` includes `disease`/`passport_number`/`traveler_name`) but **are not exposed** to the mobile flow until an owner approves a business necessity. That approval has **not** been given → stay excluded.

## 3. Classification rules enforced (§21)

- `SECURITY_SENSITIVE` / `INTERNAL` → never in traveler mobile responses.
- `SENSITIVE_HEALTH` → allowed here **only** because an explicit purpose is recorded for each field (`status`, `valid_until`).
- New field added later without an entry in `verification.VERIFICATION_FIELDS` and without a passing purpose → contract guard test fails (`test_verification_payload.py`).

## 4. Data minimization & purpose limitation

- Purpose: prove/verify a presented vaccination certificate — nothing else.
- No national identifiers, no travel documents, no internal lifecycle metadata.
- Delay/show-on-demand: sensitive fields rendered only while the verification screen is active; not cached in plaintext (on-device storage rules per phase-09/phase-10/phase-15).

## 5. Enforcement tests

`backend/apps/mobile_api/tests/test_verification_payload.py` — approved levels only, explicit SENSITIVE_HEALTH purposes, forbidden fields are never allowed, guarded future additions.

**Owner approval still required (DECISION PENDING)** before exposing any field outside this set; Q4 (`phase-17`) remains the decision record for the broader public-verification payload.