# STAGING-HTTPS-ACTIVATION-REPORT

Authoritative report for the NQP staging HTTPS activation run for `staging.afyatna.com`.

- **Audit timestamp:** 2026-10-09 ~03:35–03:44 UTC
- **Execution host:** local development machine `parrot` (user `root`) — commands were issued locally against the VPS over authorized SSH
- **VPS:** `SudaniCloudVPS5291139` / `196.1.246.63`
- **Run type:** gated activation run. Stopped at **Gate 1 (DNS)** per the Stop Rule — no certificate issuance, no public activation.

---

## 1. Repository branch and HEAD

- Branch: `staging`
- HEAD: `32150714ba40e7b96400530dd890138d2208ae29`
- Working tree (baseline, preserved, all pre-existing untracked entries remain):

```
?? ",\necho"
?? .backups/
?? .dev-run/
?? backend/afyatna
?? docs/release/STAGING-0-M4-A-DNS-REVALIDATION.md
?? docs/release/STAGING-0-M4-A_DNS_TLS_READINESS_REPORT.md
?? docs/release/STAGING-0-R5_VPS_DEV_CONFIGURATION_AUDIT_REPORT.md
?? docs/release/STAGING-0-R6_VPS_STABILIZATION_DEPLOYMENT_RECOVERY_REPORT.md
?? docs/release/STAGING-0-R7_CLOSEOUT_AUDIT_REPORT.md
?? docs/release/STAGING-NGINX-READ-ONLY-AUDIT.md
?? frontend/src/utils/labels.ts.bak
```

No tracked modifications existed at baseline and none were introduced by this run.

## 2. Environment baseline (Gate 0 — PASS)

Verified with evidence:

| Item | Evidence |
|---|---|
| VPS host/OS | `SudaniCloudVPS5291139`, Ubuntu 24.04.5 LTS |
| Authorized SSH | Yes — key-only, no new credentials, no password |
| Host nginx | owns `0.0.0.0/443` and `0.0.0.0/80` (checked in prior read-only audit; unchanged) |
| Production vhost | `afyatna.com www.afyatna.com` (sites-enabled/afyatna) |
| Dev vhosts | `dev.afyatna.com` → `127.0.0.1:8080`, `api-dev.afyatna.com` → `127.0.0.1:8001` |
| Staging compose | `/opt/nqp-platform/deploy/staging/docker-compose.yml` (2,301 B, updated Oct 8 15:46) |
| Dev compose | `/opt/nqp-platform/deploy/docker-compose.yml` (7,575 B) |
| Staging running containers | `nqp-staging-backend` (Up 2h), `nqp-staging-postgres` (Up 17h), `nqp-staging-redis` (Up 17h) |
| Staging network | `nqp-staging-net` (bridge); backend `172.19.0.4`, postgres `172.19.0.2`, redis `172.19.0.3` |
| **Staging NOT running** | `nqp-staging-frontend` and `nqp-staging-nginx` containers **do not exist** (compose declares them; images/containers not started) |
| Frontend image | only `ghcr.io/anasshouran/afyatna-frontend:dev` present; no `:latest`/`:staging` tag |
| Backend image | `ghcr.io/anasshouran/nqp-backend@sha256:2b5d…2ffd8fd` (working) |
| Staging backend env keys | `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `SECURE_SSL_REDIRECT=False`, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True` (names only; values not printed) |
| Repo vs VPS compose drift | VPS compose: nginx `443:443`, no restart/health-condition/static+media volume mount. Repo compose (R7): `127.0.0.1:8443:443`, `restart: unless-stopped`, `depends_on: service_healthy/service_started`, static+media volumes, HSTS + TLS1.2/1.3 hosting — **VPS file is stale**, not synced with repo |
| Staging nginx conf | VPS `/opt/nqp-platform/deploy/staging/nginx/staging.conf` is the old 770 B **template** (upstreams `backend:8000`, `frontend:80`, placeholder `<staging-host>`, no :80 ACME listener, no static/media/headers). Repo `staging.conf` is the fuller production-grade template |
| Staging TLS dir | `/opt/nqp-platform/deploy/staging/tls/` **does not exist** (no fullchain/key material present) |

**Gate 0: PASS** — target host, repository, configuration, and staging upstream identified with evidence.

## 3. Public DNS and delegation verification (Phase 1)

**Gate 1: FAIL / BLOCKED.**

All queries executed live at 2026-10-09 ~03:40–03:44 UTC:

| Query | Result |
|---|---|
| `afyatna.com NS @1.1.1.1` | no answer |
| `afyatna.com NS @9.9.9.9` | no answer |
| `staging.afyatna.com A @1.1.1.1` | `127.0.0.1` |
| `staging.afyatna.com A @9.9.9.9` | `127.0.0.1` |
| `staging.afyatna.com AAAA @1.1.1.1` | none |
| `dig +trace afyatna.com NS @1.1.1.1` | `ns1.verification-hold.suspended-domain.com.`, `ns2.verification-hold.suspended-domain.com.` (TTL 172800) |
| Parent-zone (gTLD) `+norecurse` @ a/c/m.gtld-servers.net | same: `ns1/ns2.verification-hold.suspended-domain.com.` |
| WHOIS (PDR/PublicDomainRegistry) | Name Servers: `NS1.verification-hold.suspended-domain.com`, `NS2.verification-hold.suspended-domain.com`; Status `clientTransferProhibited`; registry Updated 2026-10-06; DNSSEC unsigned |
| Registrar authoritative zone @ orderbox (`162.251.82.246`) | `staging.afyatna.com` → `196.1.246.63`; `dev.afyatna.com` → `196.1.246.63`; SOA serial `2026100904`; NS = `expresso.{earth,mars,mercury,venus}.orderbox-dns.com` |

**Diagnosis — delegation vs authoritative disagreement (unchanged from prior audits):**

- The registrar-side authoritative zone (OrderBox) is correct and freshly updated (serial `2026100904`, Synced 2026-10-09): it returns `196.1.246.63` for `staging.afyatna.com`.
- The **registry-level parent delegation** (`.com` zone, what public resolvers actually follow) still points at the `verification-hold.suspended-domain.com` marker, which serves `127.0.0.1`.
- Therefore public resolvers resolve `staging.afyatna.com` → `127.0.0.1` (or REFUSED), never the VPS.

**Registrar-support remediation recommendation (per prompt; not performed):**

1. **Contact the registrar (PDR Ltd d/b/a PublicDomainRegistry / OrderBox) support** with: domain `afyatna.com`, registrar panel showing NS = `expresso.{earth,mars,mercury,venus}.orderbox-dns.com`, while WHOIS + `.com` parent zone still show `ns1/ns2.verification-hold.suspended-domain.com`. The requested change: **publish the OrderBox nameservers in the parent (registry) zone** so public resolvers are directed to the authoritative zone that already contains `staging.afyatna.com → 196.1.246.63`.
2. Request the registrar to **clear/confirm whether the domain is still under New-Registration/Hold verification** (`verification-hold.suspended-domain.com` delegation is the registry's suspension marker; the `clientTransferProhibited` status is unrelated to serving). Ask explicitly: *"Is afyatna.com subject to a registry hold preventing NS delegation? If so, what action is required to release it?"*
3. If the registrar confirms the NS change was submitted at 2026-10-09 serial/publish time, ask for **propagation ETA**; meanwhile re-delegate ownership of the verification flow — the marker NS means the delegation update has NOT taken effect regardless of what the registrar dashboard shows.
4. After delegation is corrected, re-verify publicly (read-only) before any TLS issuance:
   - `dig +short A staging.afyatna.com @1.1.1.1` → `196.1.246.63`
   - `dig +short A staging.afyatna.com @9.9.9.9` → `196.1.246.63`
   - `dig afyatna.com NS @1.1.1.1` → no `verification-hold` names
   - TCP 443/80 to `196.1.246.63` reachable

**Do not** issue a certificate, do not activate HTTPS, and do not reload host Nginx while this gate fails (per prompt safety rules 10, 11 and the Stop Rule).

## 4. Gates status

| Gate | Status |
|---|---|
| Gate 0 — Baseline Integrity | **PASS** |
| Gate 1 — DNS Acceptance | **FAIL / BLOCKED** |
| Gate 2 — Service Acceptance | **NOT CHECKED** (not reached) |
| Gate 3 — Nginx Configuration Acceptance | **NOT CHECKED** |
| Gate 4 — TLS Acceptance | **NOT CHECKED** |
| Gate 5 — Activation Approval | **NOT CHECKED** |
| Gate 6 — Activation & Verification | **NOT CHECKED** |

Stopped at Gate 1 per the Stop Rule: *"Do not continue to the next phase after a failed gate. Report the evidence and wait for explicit authorization."* No mutation of any kind was performed.

## 5. Changes made

None. No Nginx/Host/DNS/certificate/Docker/repository/`/etc`/firewall changes. No certificates issued. No service restarted or reloaded. No secrets/environment values/keys printed. Worktree unchanged (see section 1).

## 6. Pre-identified staging readiness gaps (for the next run, NOT addressed now)

Recorded as evidence/planning only — helpful when DNS is fixed:

1. VPS staging compose is stale vs repo: nginx port must be `127.0.0.1:8443:443` (not `443:443`), `restart`, health-condition `depends_on`, and static/media volume mounts per repo template.
2. `staging.afyatna.com` is **absent from** `STAGING_ALLOWED_HOSTS`, `STAGING_CSRF_TRUSTED_ORIGINS`, and `STAGING_CORS_ALLOWED_ORIGINS` in the VPS staging `.env` (presence check; values never printed). Backend currently returns HTTP 400 for that Host header.
3. `nqp-staging-frontend` and `nqp-staging-nginx` containers are not running; `afyatna-frontend:latest`/`:staging` image not present (only `:dev`).
4. `/opt/nqp-platform/deploy/staging/nginx/staging.conf` on VPS is the old template; `./tls/` directory absent.
5. Staging backend has no healthcheck configured (compose lacks `healthcheck:`; container has no `.State.Health`).

**None of the above are defects to fix pre-emptively without explicit authorization and the DNS gate passing.**

## 7. Final verdict

```
BLOCKED
```

Cause: public DNS delegation for `afyatna.com` still points to `ns1/ns2.verification-hold.suspended-domain.com` at the `.com` registry level (WHOIS 2026-10-06, parent-zone TTL 172800, resolvers return `127.0.0.1`), while the registrar's own authoritative zone already serves the correct `staging.afyatna.com → 196.1.246.63` (serial 2026100904). Per the task rules, certificate issuance and public activation are **not permitted** until Gate 1 passes. Awaiting registrar-side delegation correction and explicit owner authorization to resume at Phase 2.