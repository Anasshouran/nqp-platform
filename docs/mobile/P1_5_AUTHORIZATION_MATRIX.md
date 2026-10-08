# AFYATNA MOBILE — PHASE 1.5
# AUTHORIZATION MATRIX — SCREENING (SEC-M0-1)

**Date:** 2026-10-08  
**Source of truth for roles:** `backend/apps/accounts/management/commands/seed_iam_roles.py` — only documented roles are listed (no invented roles).

Matrix key: ✅ allowed · ⛔ denied (403) · 🚫 hidden (404) · — not applicable · * scoped

| Role | Endpoint | Read | Create | Update | Delete | Scope |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| Anonymous | `/api/v1/screening/` | 401 ⛔ | 401 ⛔ | — (GET/POST only) | — | none |
| Traveler | `/api/v1/screening/` | 403 ⛔ | 403 ⛔ | — | — | none |
| Bystander role (e.g. food:view, no screening perm) | `/api/v1/screening/` | 403 ⛔ | 403 ⛔ | — | — | none |
| Inspector (`screening:add/edit/view/export`) | `/api/v1/screening/` | 200 ✅ * | 201 ✅ * | — | — | POE/PORT scope: rows filtered `port__in`; cross-port detail →404 🚫; cross-port create →403 ⛔ |
| POE Manager (`screening:add/edit/view/export`) | `/api/v1/screening/` | 200 ✅ * | 201 ✅ * | — | — | POE/PORT scope as above |
| Federal Director (`screening:view/export`, GLOBAL) | `/api/v1/screening/` | 200 ✅ | — | — | — | GLOBAL ⇒ all rows |
| Superuser / is_staff admin | `/api/v1/screening/` | 200 ✅ | 201 ✅ | — | — | unrestricted (RBAC unchanged) |

## Enforcement layers (Authentication + Authorization + Object/POE scope)

1. **Authentication** — JWT required (DRF default); anonymous → 401.
2. **Authorization** — `PermissionAction('screening', action)`; any authenticated principal without `screening:*` → 403 (traveler tokens included).
3. **Object/POE scope** — `get_queryset()` fail-closed: rows limited to caller's entry-point scope(s); sector scope expands to its entry points; no scope ⇒ zero rows. `create()` validates `port` is within scope (403 otherwise). Scope enforcement for lists is queryset-based (per `core/permissions/__init__.py` ScopeFilter doc) and object/detail checks inherit the same queryset restriction.

## Negative proof (runtime)

- Anonymous 401 (list + create).
- Traveler 403 (list) — former SEC-M0-1 xfail, now real PASS.
- Bystander-with-valid-role 403.
- Inspector cross-port retrieve → 404; cross-port create → 403; same-port read → 200; same-port create → 201.
- Search/filter/latest-risk across ports → no leakage.
- No-scope staff with valid permission → **empty list** (fail-closed, not a leak).

Evidence file: `backend/apps/screening/tests/test_security_matrix.py`.