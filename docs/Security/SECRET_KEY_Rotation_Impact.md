# SECRET_KEY Rotation Impact Assessment (SEC-PLAT-002)

> Status: DRAFT — for Tech Lead + IT Security review
> Baseline: main @ 6ef1d98
> Related: SEC-PLAT-001 (QR key separation), DEC-SEC-001..005
> Scope: impact analysis only — no code, configuration, or migration changes accompany this document.

## 1. Executive Summary

Django `SECRET_KEY` is referenced across the codebase, but the actual dependency surface is narrower than a naive "9 systems" count suggests. This document corrects the inventory to **6 mechanisms** (some shared) plus **2 documented non-dependencies** (sessions, CSRF).

Key corrections established by reading the source:

- **QR signing is one key, not three systems.** Traveler QR signing, vaccination certificate signatures, and public QR verification all call the same `sign_payload()` helper (`core/utils/qr_payload.py`).
- **WHO and Integration share one Fernet key.** `apps/integration/models.py` imports `_fernet` from `apps/who/models.py`; both stores are encrypted with `SHA256(SECRET_KEY)`.
- **JWT is an additional dependency** whenever `JWT_SECRET_KEY` is unset: SimpleJWT falls back to `settings.SECRET_KEY` as its signing key.
- **Sessions and CSRF do not depend on `SECRET_KEY`** under the current settings (DB-backed sessions; random CSRF tokens).
- **VAPID depends on `SECRET_KEY` only when env keys are absent.**

Rotation without a migration plan still causes cascading failures, most severely for long-lived printed vaccination certificates (yellow fever certificates are valid for 10 years under the IHR; in code, validity is data-driven via `validity_days`), which would fail public verification immediately after rotation.

## 2. Corrected Inventory — 6 Mechanisms

| # | Mechanism | File:Line | Dependency | Impact of rotation |
|---|---|---|---|---|
| 1 | HMAC signing — traveler QR + vaccination certificate + public verify | `core/utils/qr_payload.py:20-27`, `:44-58`; `apps/vaccination/models.py:263-272`; `apps/public/views.py:116`; `apps/travelers/views.py:339` | `HMAC-SHA256(SECRET_KEY, canonical-JSON)` | All previously issued QR payloads fail verification. Printed certificates remain physically in circulation for years (yellow fever: 10 years per IHR) and would be reported as invalid by public verify. |
| 2 | Fernet encryption — WHO credentials + Integration credentials (shared key) | `apps/who/models.py:14-20` (`_fernet`), `:60,65`; `apps/integration/models.py:214-225` | `SHA256(SECRET_KEY)` → `base64.urlsafe_b64encode` → `Fernet` | All encrypted secrets become undecryptable: WHO `client_secret`, and every `EncryptedCredentialValue.encrypted_value` (integration API keys/tokens). `reveal()` currently swallows the exception and returns `''`, so failure is silent until an integration call fails. |
| 3 | Password reset tokens | `apps/accounts/views.py:195,212`; `apps/travelers/auth_views.py:71`; `apps/travelers/auth_serializers.py:152` | `django.contrib.auth.tokens.default_token_generator` (`PasswordResetTokenGenerator`, signs with `SECRET_KEY`) | All pending reset links become invalid. Both the staff (`accounts`) and traveler (`travelers`) flows are affected because they share the same generator. |
| 4 | JWT access/refresh tokens (conditional) | `nqp_backend/settings.py:286-300`; SimpleJWT default `SIGNING_KEY = settings.SECRET_KEY` | `HS256(SECRET_KEY)` when `JWT_SECRET_KEY` is unset | Every access/refresh token is rejected. If `JWT_SECRET_KEY` is set explicitly, JWT is unaffected by `SECRET_KEY` rotation. |
| 5 | VAPID web push (conditional) | `core/utils/vapid.py:27-47` | `VAPID_PRIVATE_KEY`/`VAPID_PUBLIC_KEY` env vars, else `SHA256(b'afyatna:vapid:v1:' + SECRET_KEY)` | If env keys are set, no impact. If not, the derived EC private key changes and existing push subscriptions can no longer be decrypted/used; clients must re-subscribe. |
| 6 | Django messages cookie storage | `django/contrib/messages/storage/cookie.py:92` (signer); default `MESSAGE_STORAGE` = `FallbackStorage` | `django.core.signing` (keyed by `SECRET_KEY`) | Pending flash messages stored in the cookie are dropped. Limited, transient impact (messages are short-lived). |

### Notes on the inventory

- **Mechanism 2 has a process-level cache.** `_FERNET_KEY` is memoized in `apps/who/models.py:17`; a rotated key requires a full process restart, and the old ciphertext is still unreadable without the old key.
- **Mechanism 2 uses a raw, un-salted derivation.** `SHA256(SECRET_KEY)` is used directly as the Fernet key, with no per-purpose salt or KDF. WHO and Integration therefore cannot be rotated independently without a code change (see Phase 2).
- **Mechanism 1 is the only place a `key_id` could be introduced.** `verify_payload()` reconstructs the signed subset from four fixed fields (`traveler_id`, `passport_hash`, `issued_at`, `expires_at`) and ignores any extra field, so a `key_id` in new payloads is currently not consulted during verification.
- **No fallback keys are configured.** `SECRET_KEY_FALLBACKS` does not appear in `nqp_backend/settings.py`, so Django cannot accept values signed with a previous key during a rotation window.

## 3. Documented Non-Dependencies (corrected from earlier list)

| Item | Status | Evidence |
|---|---|---|
| Django sessions | **NOT dependent** (DB backend) | `SESSION_ENGINE` is unset, so the default `django.contrib.sessions.backends.db` applies. The session cookie carries a random session key; `backends/db.py` does not reference `SECRET_KEY`. Existing sessions survive rotation. |
| CSRF tokens | **NOT dependent** | `django/middleware/csrf.py` contains no `SECRET_KEY` reference. Tokens are random secrets plus a random mask, validated by constant-time comparison. CSRF tokens are not invalidated by rotation. |

> Note: sessions would depend on `SECRET_KEY` only if `SESSION_ENGINE` were changed to `django.contrib.sessions.backends.signed_cookies` (not configured today, see `django/contrib/sessions/backends/signed_cookies.py`). This is documented for completeness and as a constraint on future configuration changes.

## 4. Migration Strategy (phased)

Ordering is deliberate: isolate every other consumer first, so that the final `SECRET_KEY` rotation only affects password-reset links and transient messages.

### Phase 1 — Isolate QR signing key (SEC-PLAT-001)

- Introduce a dedicated `QR_SIGNING_KEY` env var (with `SECRET_KEY` as a temporary fallback).
- Add `key_id` to the QR payload and read it in `verify_payload()` so multiple keys can coexist.
- Verification accepts both the new and the retained old key for a defined window; signing always uses the new key.
- Enables G-SEC-1, G-SEC-4, G-SEC-5.

### Phase 2 — Isolate Fernet keys (WHO + Integration)

- Introduce `WHO_FERNET_KEY` and `INTEGRATION_FERNET_KEY` (or one shared `PLATFORM_FERNET_KEY` if the coupling is intentional).
- Re-encrypt existing records with the new key via a reversible batch job (read with old, write with new), keeping the old key available until the batch completes and is verified.
- Add a key identifier alongside the ciphertext (or a version prefix) so decryption does not depend on guessing which key was used.
- Remove the `_FERNET_KEY` process cache dependency on `SECRET_KEY` only after the batch is verified.

### Phase 3 — Isolate VAPID

- Set `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` explicitly in every environment.
- This removes the `SECRET_KEY`-derived fallback entirely; existing subscriptions remain valid because the key pair does not change.
- If a new key pair is introduced instead, notify clients to re-subscribe.

### Phase 4 — Set `JWT_SECRET_KEY` explicitly

- Ensure `JWT_SECRET_KEY` is set (not falling back to `SECRET_KEY`) in all environments.
- Rotating `SECRET_KEY` then no longer affects JWT; `JWT_SECRET_KEY` rotation is handled separately (all sessions/tokens invalidated at that point).

### Phase 5 — Rotate `SECRET_KEY` (residual scope)

At this point the residual impact is limited to:

- **Password reset links** — pending links become invalid; users request new ones. This is acceptable and should be communicated.
- **Django messages** — pending flash messages are lost; negligible.
- **Sessions / CSRF** — unaffected (see Section 3).

Operational requirements:

- Schedule during a low-traffic window.
- Update the secret in the vault and in every running process (workers, beat, web, ASGI) — a partial rollout creates mixed-key behavior.
- Document the change in release notes.
- Do not delete the previous key until the retention window defined in DEC-SEC-003 has elapsed.

## 5. Backup and Recovery

### Current gap

No documented backup or restore procedure exists for `SECRET_KEY` in this repository. If the only copy is lost, every mechanism in Section 2 becomes unrecoverable: existing QR/certificate signatures cannot be reproduced, and Fernet-encrypted secrets cannot be decrypted (the WHO and Integration credentials would have to be re-issued and re-entered).

### Required

- Store `SECRET_KEY` in a secrets vault (not `.env`, not git, not CI variables in plaintext).
- Document a recovery procedure per environment, including who is authorized to retrieve it and how retrieval is audited.
- Test the restore procedure quarterly and record the result.
- Restrict access: no engineer should need the raw value for daily work.
- Maintain at least one offline/escrow copy with dual control for disaster recovery.

## 6. Compromise Response Plan

If `SECRET_KEY` is compromised:

1. Declare an incident and freeze deployments that would consume the compromised key.
2. Perform an emergency rotation following Phases 1–5 (Phase 1 is mandatory before re-issuing certificates).
3. Re-issue all QR payloads and vaccination certificates; after Phase 1, new certificates are signed with `QR_SIGNING_KEY`, while retained old keys cover the transition window.
4. Force re-login where sessions/tokens are affected (only relevant if `JWT_SECRET_KEY` is still falling back to `SECRET_KEY`; DB sessions are unaffected).
5. Re-encrypt WHO and Integration secrets with the new Fernet key (Phase 2), then rotate the upstream credentials themselves — treat them as disclosed.
6. Notify integration partners to rotate the API keys they issued to NQP.
7. Assess whether the compromise also exposed the vault or the hosts; rotate any co-located secrets.
8. Document the incident: what was rotated, when, by whom, residual risk, and evidence of completion.

## 7. Open Decisions (from D4)

- **DEC-SEC-001**: QR key separation (Tech Lead + IT Security).
- **DEC-SEC-002**: Rotation procedure (steps, approvals, windows, rollback).
- **DEC-SEC-003**: Retired key retention (duration and destruction).
- **DEC-SEC-004**: Backup/restore procedure for `SECRET_KEY`.
- **DEC-SEC-005**: `key_id` in QR payload (format, allowed values, verification precedence).

## 8. Acceptance Gates

| Gate | Description | Status |
|---|---|---|
| G-SEC-1 | SEC-PLAT-001 design approved | NOT_RUN |
| G-SEC-2 | Backup/restore tested | NOT_RUN |
| G-SEC-3 | Rotation tested (staging, with rollback) | NOT_RUN |
| G-SEC-4 | `key_id` in QR payload | NOT_RUN |
| G-SEC-5 | Backward compatibility tested (old + new keys) | NOT_RUN |
| G-SEC-6 | Breach scenario tested | NOT_RUN |

## 9. References

- SEC-PLAT-001 / SEC-PLAT-002 (SIVS-GAP-001).
- Source files cited inline in Sections 2 and 3.
- Django settings: `nqp_backend/settings.py` (`SECRET_KEY` loading and placeholder guard at lines 14–29; JWT configuration at lines 286–300).
- No `SECRET_KEY` values are printed in this document — variable names and locations only.
