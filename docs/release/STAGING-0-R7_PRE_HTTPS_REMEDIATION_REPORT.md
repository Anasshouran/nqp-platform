# STAGING-0-R7 — Pre-HTTPS Remediation & Safety Gates Report

- **Phase:** STAGING-0-R7 (Pre-HTTPS Remediation & Safety Gates)
- **Date:** 2026-10-09
- **Decision gate:** HTTPS readiness remediation + safety gates A–K. This phase does **NOT** activate HTTPS, DNS, certificates, or host Nginx changes.
- **Analyst:** opencode agent (big-pickle)

---

## 1. Scope and decision executed

Minimum verified remediation to prepare staging for eventual HTTPS, keeping the
recovered R6 VPS/dev state untouched, plus 11 safety gates (A–K). No production
access, no destructive DB/volume operations, no DNS/TLS/firewall changes, no
certificate issuance, no app identity changes, no SUDAPASS, no Declaration
Write, no unrelated refactors. Mandatory stop after this report.

## 2. Environment snapshot

| Item | Value |
|---|---|
| VPS | `196.1.246.63` (`SudaniCloudVPS5291139`, Ubuntu 24.04.5 LTS, kernel 6.8.0-139, Docker 29.1.3, Compose 2.40.3) |
| Local repo | `/home/anas/Desktop/Project-3/backup-2/nqp-platform`, branch `staging` |
| Local HEAD | `687d6b9` (and `954dfbb`), remote `https://github.com/Anasshouran/nqp-platform.git` |
| VPS repo | `/opt/nqp-platform`, branch `main` HEAD `8b2b02b`; `deploy/staging/*` are untracked runtime artifacts |
| Staging stack | `nqp-staging-{backend,postgres,redis}` up 13min/15h; health HTTP 200; DB `nqp_staging` |
| Dev stack | `deploy_*` containers up ~12d; health 200; DB `nqp_db` |
| Disk | 26G/97G used (28%), 67G free; load 0.13–0.16; mem 2.8Gi available |

## 3. Integrity baseline (Gate A)

Baseline recorded at R7 start to `/tmp/opencode/r7/gate_a_baseline.txt`
(`git status --short/--stat/--name-only`). 10 modified tracked files (+440/−90),
5 untracked entries.

**Material mid-session event:** while R7 was running, the pre-existing worktree
changes (HR serializer, settings CSRF wiring, staging compose/env/docs, CI
files, frontend package.json) were **committed by the owner** as
`954dfbb` (fix: blocking gates, immutable images, CSRF wiring, HR & public test
fixes) and `687d6b9` (docs: R4 remediation report). This moved HEAD from
`bb32042` → `687d6b9`. The R7 code changes to `settings.py` and
`docker-compose.yml` were included in `954dfbb` at that moment.

At report time the worktree is **clean for tracked files** (no tracked
modifications) — the only untracked entries are R7's new test file
`backend/apps/accounts/tests/test_csrf_trusted_origins.py` and R7-deliverable
reports. The R5/R6/R7 reports and the new test file are intentionally left
uncommitted per directive; the owner may commit them at their discretion.

Unexpected entries inspected and preserved (all pre-existing, none created by
R6/R7, none overlapping R7 target files):
`backend/apps/hr/serializers.py` (tracked +13, TrainingEnrollment duplicates
check — pre-existing, uncommitted at baseline, later committed by owner),
`.tmp` (0 bytes), `",\necho"` (0 bytes, newline-in-name), `backend/afyatna`
(0 bytes), `.backups/`, `.dev-run/`, `frontend/src/utils/labels.ts.bak`,
R5/R6 reports.

## 4. Gate-by-gate acceptance matrix

| Gate | Result | Basis |
|---|---|---|
| A — Repo/worktree integrity | **PASS** | Baseline captured; unexpected entries identified and preserved; mid-session commit by owner noted and reconciled; no overlap conflicts. |
| B — Runtime recovery still healthy | **PASS** | daemon healthy, all containers up, staging+dev health 200, disk 28%, no new failures. |
| C — Tracked TLS private-key exposure | **PASS** | No private key tracked in any ref (only `deploy/ssl/README.md`); ignored for long time by `.gitignore` lines 50–52; disk key blob not in object store; never committed. R5 "tracked" claim does not hold for the current tree. No removal required. |
| D — Django `CSRF_TRUSTED_ORIGINS` | **PASS** | Environment-driven parser (already pre-existing in worktree) extracted to pure helper `parse_csrf_trusted_origins` (identical behavior); 8 new tests pass; staging compose maps `CSRF_TRUSTED_ORIGINS: ${STAGING_CSRF_TRUSTED_ORIGINS}`. |
| E — Staging Nginx port-443 conflict | **PASS** | Host nginx owns `0.0.0.0:443` + `[::]:443` (exclusive, Let's Encrypt). Staging nginx `443:443` would fail-to-start/hijack → changed to loopback `127.0.0.1:8443:443`. `docker compose config --quiet` OK; rendered port `published 8443/target 443`. Host nginx not reloaded. |
| F — Poller safety & convergence | **PASS** | `deploy-poll.sh` (VPS): `flock -n` + 900s timeout + atomic state write; `bash -n` OK; convergence run exit 0, no new log lines; no stacked pulls; state file matches poller's digested image. |
| G — Image & DB isolation | **PASS** | staging backend `@sha256:2b5d61…` (CI `d83602a`); dev `d11b2e7`; rollback `ab9066…` preserved; DBs `nqp_staging`/`nqp_db`; volumes distinct (`staging_staging-*`, `deploy_nqp_*`); networks `nqp-staging-net`/`deploy_nqp_internal`. |
| H — Regression validation | **PASS** | 53 tests passed (8 new CSRF + security-hardening + health); `python manage.py check` — no issues (Django 5.2.18); compose config OK; tracked-file secret scan clean; no CI/manifest regression visible. |
| I — No production impact | **PASS** | No prod compose/k8s/cert/DB changes; prod images/dev stack untouched; no container/volume touched. |
| J — DNS & TLS unchanged | **PASS** | No cert issuance/renewal, no host nginx reload, no DNS records touched, no public listener changed. |
| K — SUDAPASS / sealing deferred | **CONDITIONED** | SUDAPASS not present in any scanned scope; Declaration Write API untouched; deferral is the authorized state for this phase. |

**Verdict: ACCEPTED WITH CONDITIONS** (conditions below in §11).

## 5. Files changed (this phase) + rationale

R7 code changes (now in HEAD via owner commit `954dfbb`):

| File | Change | Rationale |
|---|---|---|
| `backend/nqp_backend/settings.py` | Extracted pre-existing inline `CSRF_TRUSTED_ORIGINS` parsing into `parse_csrf_trusted_origins(raw)` (identical behavior, single comma-split + strip + filter-empties; no wildcards) | Makes Gate D behavior directly unit-testable and load-order-independent. |
| `deploy/staging/docker-compose.yml` | nginx `ports: - "443:443"` → `- "127.0.0.1:8443:443"` with comment | Eliminates deterministic bind conflict with host nginx's exclusive 0.0.0.0:443; staging TLS exposed only on loopback; reversible one-line rollback. |

New (deliverable, left uncommitted):
| File | Change |
|---|---|
| `backend/apps/accounts/tests/test_csrf_trusted_origins.py` | 8 tests: single/multiple HTTPS origin, empty/missing default-empty, whitespace handling, no wildcard injection, scheme preserved, staging compose maps `${STAGING_CSRF_TRUSTED_ORIGINS}`, CSRF list ≠ host list. |
| `docs/release/STAGING-0-R7_PRE_HTTPS_REMEDIATION_REPORT.md` | This report. |

No changes to: host nginx config/live state, `deploy/docker-compose.yml`
(production line 223 mounts `./ssl` — informational only), VPS files,
scheduled surveillance migrations, CI workflows.

## 6. Commands executed (representative, all read-only except the two edits above)

- `git status --short / --stat / --name-only` ; `git log --oneline -2`
- `git ls-files -z | xargs -0 grep -lE "-----BEGIN .*PRIVATE KEY|AKIA…"` → nothing
- `git cat-file -e HEAD:…test_csrf_trusted_origins.py` → absent (still new)
- `python -m pytest apps/accounts/tests/test_csrf_trusted_origins.py -q` → 8 passed
- `python -m pytest apps/accounts/tests/test_csrf_trusted_origins.py apps/accounts/tests/test_security_hardening.py apps/accounts/tests/test_health.py -q` → 53 passed (86s)
- `python manage.py check` → no issues
- `docker compose config --quiet` (placeholder env) → CONFIG SYNTAX OK; rendered `nginx published:"8443", target:443`
- VPS: `ss -tlnp` , `python -m pytest …` equivalent, `bash -n deploy-poll.sh`, poller convergence run, `docker ps`, `ss` ports, DB enumeration — all PASS.

## 7. New/changed tests

`backend/apps/accounts/tests/test_csrf_trusted_origins.py` — 8 tests, all passing,
no DB needed (pure function + repo-file assertions). Covers every Gate-D
requirement including the staging env-variable wiring. These are the only tests
in the repo covering settings/CSRF config.

## 8. Secrets & key-exposure assessment

- `deploy/ssl/privkey.pem` + `fullchain.pem`: self-signed dev cert (CN=nqp.gov.sd,
  2026-09-13→2027-09-13, 4096-bit RSA); key↔cert fingerprint matches
  (`a6c16f99…`); file blobs (disk `d95a01af…`) are **not** in the Git object
  store; `.gitignore` (lines 50–52) already covers `privkey.pem`, `*.pem`, `*.key`;
  tracked secret scan across all refs → nothing. No live container or host nginx
  consumes it. **No removal action needed; no exposure in the current tree.**
- R5 finding "privkey tracked in git" does not reproduce; recorded as revised.
- No CI-embedded secrets, no `.env` (chmod 600 on VPS, gitignored) in repo, no
  AWS/SSH key material found among tracked files.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Staging nginx loopback-only port means no public TLS yet | Intended; M4 will route host nginx → internal staging upstream once hostname exists. |
| R7 changes committed by owner mid-phase | Documented in §3; reversible; worktree clean and consistent. |
| Full `accounts` suite not run to completion (timed out) | Targeted 53-test regression covering this phase's surface passed; note for CI. |
| Poller on VPS is an untracked artifact | Preserved; no local change affects the live poller; convergence verified. |

## 10. Residual findings / owner inputs

- (R5#4) Sandbox/environment isolation, non-Arabic placeholder text — still
  open, out of R7 scope.
- (R5#5) `CSRF_TRUSTED_ORIGINS` "not read" finding is superseded: the parser is
  implemented, env-wired in staging compose, and now tested (Gate D).
- (R5#6) `ALLOWED_HOSTS` vs trusted-origin mismatch: verified distinct in code
  (§4/D, test `test_csrf_trusted_origins_matches_allowed_hosts_is_not_assumed`).
- K8s manifests (`deploy/k8s/create-tls-secret.sh`, `secrets.yaml`) reference
  `deploy/ssl/` paths for FUTURE staging — unchanged, informational.

## 11. Owner / ops inputs required before M4 (HTTPS activation)

1. **Staging hostname** (owner-approved DNS name, e.g. `staging.<domain>`) —
   NOT yet provisioned; all `*.afyatna.com` currently resolve publicly to
   `127.0.0.1`.
2. Authorize public DNS record for the staging host (this phase must not).
3. Authorize a real certificate (Let's Encrypt) for staging; supply to
   `deploy/staging/tls/` (or adjust) — do not reuse `deploy/ssl/` dev cert.
4. Owner commit of R7 deliverables (R7 report + CSRF test file) if desired.
5. SUDAPASS decision for the later sealing phase (deferred by design).

## 12. M4 (HTTPS activation) readiness

This phase explicitly does **not** activate HTTPS. Readiness after R7: all
internal safety gates passed; remaining blockers are owner inputs (§11 items
1–3) plus a short Enable-HTTPS runbook (host nginx vhost → internal staging
upstream route, cert path wiring, host nginx `nginx -t` + reload, staging nginx
loopback port consumption, `SECURE_SSL_REDIRECT`/cookies already "True" in
compose). DNS, cert issuance, firewall, and host nginx reload remain
**out of scope here** — a separate R8/M4 phase must perform them.

## 13. Rollback & reversibility

- Settings helper: revert line `CSRF_TRUSTED_ORIGINS = parse_csrf_trusted_origins(…)`
  to the inline list comprehension — behavior identical either way.
- Compose nginx port: change `127.0.0.1:8443:443` back to `443:443` (one line);
  no host nginx/docker state depends on the new mapping.
- Test file: deletable; no runtime dependency.
- No migrations, no DB ops, no container/volume changes were performed.

## 14. Confirmation / stop statement

All R7 gates A–K validated. **Verdict: ACCEPTED WITH CONDITIONS** (§11). No
production access, no DNS/TLS/firewall/HTTPS activation, no destructive
operations, no SUDAPASS/Declaration Write, no history force-push were performed.
As mandated, work **stops here**; public HTTPS activation awaits owner inputs and
a separate activation phase.