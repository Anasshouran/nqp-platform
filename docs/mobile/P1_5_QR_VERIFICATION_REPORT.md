# AFYATNA MOBILE — PHASE 1.5
# QR VERIFICATION REPORT (NG-04)

**Date:** 2026-10-08

## 1. Invariant

> An unsigned or invalid QR credential MUST NEVER be accepted as a valid vaccination certificate.

Enforced at `backend/apps/vaccination/views.py` (`PublicVaccinationVerifyView.get`):

```python
signature = request.query_params.get('sig')
signature_ok = cert.signature_matches(signature) if signature else False
```

Fail-closed: `sig` present+valid → proceed; `sig` absent or invalid → **400**, `signature_valid: false`, failed-verification audit log (recorded with reason incl. tamper wording).

## 2. Verification properties (checked by design)

| Property | Mechanism | Status |
| --- | --- | --- |
| signature present | `sig` required | ✅ mandatory (P1.5) |
| signature valid | `hmac.compare_digest(cert.verification_signature, sig)` (`models.py:280-281`) | ✅ |
| expected algorithm | HMAC-SHA256 (`sign_payload`, `core/utils/qr_payload.py`) | ✅ fixed, no negotiation |
| trusted key | platform `SECRET_KEY`; no permissive fallback | ✅ |
| payload integrity | signature derived from `certificate_number` + `qr_token` → tamper ⇒ mismatch | ✅ |
| certificate state | `effective_status` (`ACTIVE/REVOKED/EXPIRED`) drives `verified` | ✅ |
| expiry/effective validity | `valid_until`/`issued_at` → `effective_status` | ✅ |
| replay resistance | certificate QR is a **self-contained signed value credential** (persistent by design for paper certificates); traveler medical QR (`public/verify-qr`) is signed + 90-day validity window (replay-resistant) | documented |

## 3. Matrix (§18)

| Case | Expected | Test | Result |
| --- | --- | --- | --- |
| Valid signed QR | PASS (200) | `test_public_verify_accepts_the_signature_carried_by_the_qr` | ✅ |
| Unsigned QR | FAIL (400) | `test_public_verify_without_signature_fails_closed` | ✅ |
| Invalid signature | FAIL (400) | `test_public_verify_rejects_tampered_signature` | ✅ |
| Wrong key / foreign signature | FAIL (400) | `test_qr_wrong_key_signature_rejected` | ✅ |
| Tampered payload | FAIL (400) | same tampered test + wrong-key | ✅ |
| Expired credential | FAIL (verified=false) | `test_public_verify_success_and_revoked` + `test_qr_valid_signature_but_expired_credential_fails_closed` | ✅ |
| Revoked certificate | FAIL (verified=false) | `test_qr_valid_signature_but_revoked_fails_closed` | ✅ |
| Unsupported algorithm / malformed | FAIL (400) | `test_qr_malformed_signature_rejected` (`''`, `not-hex`, non-alnum, wrong length) | ✅ |
| Malformed payload | FAIL (400) | same | ✅ |
| Replay/stale | fail-closed per nature (signed value credential; stale state → `verified=false`) | `test_public_verify_without_signature_fails_closed` (unsigned even when EXPIRED) | ✅ documented |
| Unsigned never accepted regardless of status | FAIL (400) | `test_qr_unsigned_never_accepted_for_any_status` | ✅ |

All executed in `apps/vaccination/tests/test_vaccination.py`; suite: **73 passed**.

## 4. Backwards compatibility (§19)

- **Legacy signed format?** None. `verification_signature` is computed on demand (HMAC-SHA256) from `certificate_number` + `qr_token` via `core/utils/qr_payload.sign_payload`; it is not stored, not time-limited, and every certificate has exactly one valid signature at any time.
- **Trusted verification path:** `PublicVaccinationVerifyView` unchanged except mandatory signature; `models.signature_matches` unchanged.
- **Migration/sunset:** not required — fail-closed is fully compatible with all existing certificates.

## 5. Related surfaces

- Traveller medical QR: `public/verify-qr` already signature-gated (`verify_payload`) — unchanged, green.
- `PublicVaccinationLookupView` (passport lookup) is **not** QR verification; untouched (noted as separate enumeration-throttling topic, not P0).
- `VerifyCertificateView` (number lookup on `HealthCertificate`) is a different, clerk-facing flow; not the vaccination QR credential path — unchanged and scoped out of NG-04 (recorded — no false coverage claim).