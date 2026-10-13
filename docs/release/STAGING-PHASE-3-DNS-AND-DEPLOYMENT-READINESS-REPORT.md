# STAGING PHASE 3 — DNS DELEGATION RESOLUTION & DEPLOYMENT READINESS REPORT

- **Date:** 2026-10-09T04:12–04:15Z
- **Execution host:** local `parrot` (root) — read-only diagnostics; no DNS/TLS/VPS/Compose/deployment mutations performed.
- **Repo:** `/home/anas/Desktop/Project-3/backup-2/nqp-platform`, branch `staging`, HEAD `32150714ba40e7b96400530dd890138d2208ae29`
- **VPS (read-only SSH):** `196.1.246.63` = `SudaniCloudVPS5291139`, Ubuntu 24.04.5 LTS, Docker Compose 2.40.3
- **Verdict:** **BLOCKED** — public DNS for `staging.afyatna.com` cannot resolve to the VPS because the `.com` parent zone still delegates `afyatna.com` to `ns1/ns2.verification-hold.suspended-domain.com` (a registrar-controlled verification hold). Staging public HTTPS deployment is additionally **not ready** until the VPS compose/env/cert gaps are closed. Everything downstream (cert issuance, HTTPS activation, public staging rollout) is gated on clearing the DNS hold first.

---

## 1. Objective

1. Determine, with multi-source evidence, why `staging.afyatna.com` does not resolve publicly to `196.1.246.63`, and identify the responsible party + remediation path.
2. Produce a ready-to-send registrar support escalation (no secrets, no account IDs) for the domain owner to submit.
3. Produce a read-only Staging deployment readiness matrix with the precise gaps remaining between the repo baseline and the VPS.

Constraint: **diagnostic and planning only.** No changes to DNS/registrar/registry, no cert issuance, no host nginx/firewall/VPS `.env`/Compose/container/image/volume/network changes, no git mutations, no service reloads.

## 2. Gate 1 — DNS Delegation Chain (Evidence, timestamps 2026-10-09T04:12–04:14Z)

### 2.1 Root → `.com`
Root zone intact: `.` NS with DNSSEC RPZ (RRSIG), `com.` DS present. Normal.

### 2.2 `.com` parent delegation for `afyatna.com` (authoritative gTLD, non-recursive)
Queried `a/c/m/l.gtld-servers.net` directly. **All four servers agree:**

```
afyatna.com.  172800  IN  NS  ns1.verification-hold.suspended-domain.com.
afyatna.com.  172800  IN  NS  ns2.verification-hold.suspended-domain.com.
```

Glue returned in the additional section:

```
ns1.verification-hold.suspended-domain.com. 172800 IN A 162.251.82.254
ns2.verification-hold.suspended-domain.com. 172800 IN A 162.251.82.2
```

`SOA` queries to the parent return only the NS answer (no parent SOA for the zone) — consistent with a verification-hold marker zone.

### 2.3 DNSSEC
- `DS afyatna.com @a.gtld`: **empty** → unsigned domain at the parent. Not a DNSSEC mismatch.
- `DNSKEY afyatna.com @orderbox`: 0 bytes → authoritative side also has no DNSKEY.

### 2.4 Registrar-configured nameservers (OrderBox) — what the child zone actually declares
OrderBox hostnames resolve:

```
expresso.earth.orderbox-dns.com   162.251.82.119/.247/.118/.246
expresso.mars.orderbox-dns.com    162.251.82.124/.253/.125/.252
expresso.mercury.orderbox-dns.com 162.251.82.250/.123/.251/.122
expresso.venus.orderbox-dns.com   162.251.82.120/.121/.249/.248
```

NS as served **by OrderBox authoritative** (`162.251.82.246` and `.248`, queried directly):

```
NS afyatna.com @162.251.82.246 → expresso.{earth,venus,mercury,mars}.orderbox-dns.com
NS afyatna.com @162.251.82.248 → expresso.{mars,mercury,venus,earth}.orderbox-dns.com
```

A records as served by OrderBox for **all** hostnames:

```
afyatna.com / www / staging / dev / api-dev.afyatna.com  →  196.1.246.63
SOA serial @162.251.82.246 → 2026100904 (updated 2026-10-09)
```

### 2.5 Recursive resolvers — what the public sees
```
A afyatna.com / www / staging / dev / api-dev:
  1.1.1.1   → 127.0.0.1   (TTL 600, flags qr rd ra, AUTHORITY: 0)
  9.9.9.9   → 127.0.0.1
  8.8.8.8   → <none> (REFUSED class)
  dns.google → Status 5 REFUSED, comment: "Private name servers (no query sent) [127.0.0.1]"
```

The resolvers follow the parent delegation down to `ns1/ns2.verification-hold.suspended-domain.com` (ACL-answering private `127.0.0.1`). This is a **delegation-follow** artifact, not a stale cache: 8.8.8.8 refuses to send to private ranges, hence REFUSED; 1.1.1.1/9.9.9.9 return the marker `127.0.0.1`.

### 2.6 Direct probe of the verification-hold NS
```
A staging.afyatna.com @162.251.82.254 (ns1 glue) → 127.0.0.1
A staging.afyatna.com @162.251.82.2   (ns2 glue) → 127.0.0.1
SOA afyatna.com @162.251.82.254 → ns1.verification-hold.suspended-domain.com.
                                 admin.suspended-domain.com. 2012022012 ...
```

### 2.7 Local-interference check
- `/etc/hosts`: no `afyatna` / `196.1.246.63` entries.
- `/etc/resolv.conf`: nameserver `10.158.201.45` (private network resolver) — but all evidence above used explicit `@resolver` queries, so the local resolver only affects the default `+trace` path (which matched public results).

### 2.8 WHOIS (registry + registrar)
```
Registrar:               PDR Ltd. d/b/a PublicDomainRegistry.com
Domain Status:           clientTransferProhibited (EPP)
Name Server (registry):  NS1.VERIFICATION-HOLD.SUSPENDED-DOMAIN.COM
                         NS2.VERIFICATION-HOLD.SUSPENDED-DOMAIN.COM
Registrar whois Name Server: ns1/ns2.verification-hold.suspended-domain.com
Registry Updated Date:   2026-10-06T03:30:08Z
Registrar Updated Date:  2026-10-09T03:08:56Z
Creation Date:           2026-09-20T08:58:41Z
Registry Expiry:         2027-09-20T08:58:41Z
DNSSEC:                  unsigned
Registrant Org:          N/A
```

### 2.9 Gate 1 assessment (root cause)
- **Root cause is a registrar-side verification hold at the registry parent**, not propagation: the `.com` parent has delegated `afyatna.com` to `ns1/ns2.verification-hold.suspended-domain.com` (TTL 172800) consistently across 4 independent gTLD servers for the entire investigation period, while the registrar's own DNS config (OrderBox) declares the correct `expresso.*.orderbox-dns.com` set with a live, today-updated zone (`SOA serial 2026100904`) serving `196.1.246.63`.
- **The hold is enforced by the registrar's own infrastructure:** the verification-hold glue IPs (`162.251.82.254`, `162.251.82.2`) live in the **same `162.251.82.0/24`** as the OrderBox NS (`162.251.82.118–253`). The registrar has not released the hold or refreshed the registry delegation to the OrderBox NS set.
- This is **not** a stale-resolver-cache situation and **not** a wait-for-propagation situation: all gTLD servers serve the same hold delegation, and the registrar's authoritative zone is already correct. The domain appears to remain in verification-pending state at the registry.

## 3. Gate 2 — Responsible Party & Escalation

### 3.1 Responsible party
**PDR Ltd. d/b/a PublicDomainRegistry.com** (the registrar; OrderBox/ResellerClub claims UI is the account front-end) is responsible. The domain is listed `clientTransferProhibited` and delegated to the registrar's own verification-hold NS. The registry (VeriSign for `.com`) only publishes what the accredited registrar pushes; clearing the hold and re-delegating to `expresso.*.orderbox-dns.com` must be done by the registrar.

### 3.2 Owner-verifiable facts to include
- Domain: `afyatna.com` (Creation 2026-09-20, Expiry 2027-09-20, Registrar PDR Ltd d/b/a PublicDomainRegistry.com).
- Registrant email on public WHOIS (protected here): `an***@gmail.com` — the owner must log in with the account holding the domain.
- WHOIS shows `NS1/NS2.VERIFICATION-HOLD.SUSPENDED-DOMAIN.COM` and status `clientTransferProhibited`.

### 3.3 Ready-to-send support ticket (no secrets, no account IDs)
> **Subject:** Domain `afyatna.com` stuck on `verification-hold.suspended-domain.com` delegation — please clear verification hold and update registry NS
>
> Hello,
>
> I have a domain registered with PublicDomainRegistry (OrderBox account): `afyatna.com`.
>
> **Problem:** The public DNS is broken. The `.com` parent zone (checked directly against `a/c/m/l.gtld-servers.net` on 2026-10-09, TTL 172800) still delegates `afyatna.com` to:
> - `ns1.verification-hold.suspended-domain.com` (162.251.82.254)
> - `ns2.verification-hold.suspended-domain.com` (162.251.82.2)
>
> **What we configured:** The nameservers in the account are `expresso.earth/mars/mercury/venus.orderbox-dns.com`. We verified these are live and serve the zone correctly:
> - `dig NS afyatna.com @162.251.82.246` returns all four `expresso.*.orderbox-dns.com` nameservers.
> - `SOA serial 2026100904` is current (updated today).
> - `A` records for `afyatna.com`, `www`, `staging`, `dev`, `api-dev` all return `196.1.246.63`.
>
> **Result:** Public resolvers return `127.0.0.1` (1.1.1.1/9.9.9.9) or REFUSED (8.8.8.8 / dns.google) for every host on the domain, because the registry delegation still points at the verification-hold nameservers.
>
> **Request:** Please release the domain from verification-hold and update the `.com` registry delegation to the configured `expresso.*.orderbox-dns.com` nameservers, and confirm it is visible at the parent zone. If any account or domain verification step is still open (contact email link, form, document, or pending payment), tell me exactly what is missing so I can complete it.
>
> This is blocking our production-grade HTTPS deployment, so I would appreciate priority handling. I'm happy to confirm account ownership through whatever channel you require.
>
> Regards,

### 3.4 Owner actions (required, cannot be automated)
1. Log into the PDR/OrderBox account holding `afyatna.com`.
2. Confirm/completе any pending domain or account verification the registrar identifies.
3. Re-confirm the nameservers are `expresso.*.orderbox-dns.com` (already correct in the child zone).
4. Open the ticket above via registrar support; ask for the verification hold to be released and the registry delegation refreshed.
5. After the registrar confirms, re-run the Phase 3 Gate 1 diagnostic (this report's checks) to verify the parent now delegates to `expresso.*.orderbox-dns.com` before proceeding to HTTPS activation.

## 4. Gate 3 — Staging Deployment Readiness Matrix (read-only, timestamp 2026-10-09T04:09Z)
| # | Item | Repo baseline (local) | VPS actual | Status |
|---|------|----------------------|------------|--------|
| 1 | Public DNS `staging.afyatna.com` | must resolve to `196.1.246.63` | parent → verification-hold; resolvers see `127.0.0.1`/REFUSED | **BLOCKED** |
| 2 | Compose `nginx` port mapping | `127.0.0.1:8443:443` (loopback, per repo `deploy/staging/docker-compose.yml`, md5 `b1fffc15…`) | `443:443` (md5 `857be0ce…`) | **MISMATCH** |
| 3 | Compose healthchecks / restart / `depends_on: service_healthy` | present (repo) | absent (VPS container health status empty; stale compose) | **MISMATCH** |
| 4 | `staging.afyatna.com` in `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS`/`CORS_ALLOWED_ORIGINS` | present (Phase-2 `.env.example`, md5 `857d541c…`) | **ABSENT** from `/opt/nqp-platform/deploy/staging/.env` (presence check) | **MISMATCH** |
| 5 | `.env` required keys | N/A | `STAGING_DB_NAME/USER/PASSWORD`, `STAGING_ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS/CORS_ALLOWED_ORIGINS`, `STAGING_SECRET_KEY`, `STAGING_JWT_SECRET_KEY`, `STAGING_BACKEND_IMAGE`, `STAGING_FRONTEND_IMAGE` all present (10/10, presence-only) | OK |
| 6 | TLS directory `deploy/staging/tls/` | absent locally | absent on VPS (`No such file or directory`) — cert mount must exist **only** once a real issued cert exists | OK (pre-cert) |
| 7 | Cert for `staging.afyatna.com` | none | none | **BLOCKED** (DNS first) |
| 8 | Staging containers | n/a | `nqp-staging-backend` Up 3h, `-postgres` Up 17h, `-redis` Up 17h. **Frontend and nginx NOT running** | **MISMATCH** |
| 9 | `nqp-staging-net` isolation | bridge, no public publishes for DB/Redis | members: `postgres 172.19.0.2`, `backend 172.19.0.4`, `redis 172.19.0.3`; `5432/tcp` + `6379/tcp` unpublished | OK (frontend/nginx missing from net) |
| 10 | Backend image | CI pins immutable `<sha>` | running `ghcr.io/anasshouran/nqp-backend@sha256:2b5d61…`; `:staging` sha present (`ab9066b9…`, created 2026-09-26) | OK (verify snapshot vs intended rev) |
| 11 | Frontend image | CI publishes `:staging` + `<sha>` (`.github/workflows/staging.yml:164`) | VPS has **only `afyatna-frontend:dev` / `<none>`**; **`:staging` absent** | **MISMATCH** |
| 12 | VPS `nginx/staging.conf` | full template: HSTS, TLS1.2/1.3, static/media, `<staging-host>` placeholder (md5 `faba0bb2…`) | old 770B minimal template with `<staging-host>` placeholder (md5 `596f4326…`) | **MISMATCH** |
| 13 | Host nginx / firewall | n/a | host nginx owns `0.0.0.0:80`/`0.0.0.0:443`; `ufw` inactive; no `:8443` listener | OK (loopback mapping won't conflict) |
| 14 | Repo/VPS drift | local `staging` HEAD `3215071`, ancestor of `main feb29d7` | VPS git `main` @ `8b2b02b` (not present locally; `deploy/staging/` untracked there) | **DIVERGED** |
| 15 | Phase-2 config remediation (trusted origins/CSRF/CORS + `X-Forwarded-Proto: https` healthcheck) | verified (compose `-q` OK, `manage.py check` 0 issues, 9 tests passed) | not deployed to VPS | pending DNS+rollout |

## 5. Prerequisites Before Public Staging Deployment
1. **DNS (critical path):** registrar releases verification hold; parent `.com` zone re-delegates `afyatna.com` to `expresso.*.orderbox-dns.com` (validate with Gate 1 checks — all 4 gTLD servers + recursive resolvers must show `196.1.246.63` for `staging.afyatna.com`).
2. **Cert:** issue Let's Encrypt cert for `staging.afyatna.com` (and re-check apex/www as needed) **only after** (1) passes; then populate `deploy/staging/tls/` on the VPS.
3. **Config rollout:** sync VPS staging compose/`staging.conf`/`.env` additions (`staging.afyatna.com` in allowed hosts / CSRF / CORS) with the repo baseline (md5 values above), keeping DB/Redis unpublished and nginx on `127.0.0.1:8443:443`.
4. **Images:** confirm/pull immutable `afyatna-frontend:<sha>` + `nqp-backend:<sha>` (CI-produced) pinned in `.env`; start frontend + nginx; confirm all four services healthy on `nqp-staging-net`.
5. **Validation:** re-run the Phase-3 Gate 3 matrix and prior HTTPS-activation checks (loopback `8443` probe with `X-Forwarded-Proto: https`, Django check, CSRF/CORS tests) before exposing publicly.

## 6. Conclusion
- **BLOCKED on DNS.** The `.com` parent still delegates `afyatna.com` to `ns1/ns2.verification-hold.suspended-domain.com` (registrar-verification hold; consistent across 4 gTLD servers, TTL 172800) while the registrar's own OrderBox zone is correct (serial `2026100904`, all A records → `196.1.246.63`). This is a registrar-side status/verification issue at the registry, **not** a propagation delay — the hold marker nameservers run on the registrar's own `162.251.82.0/24`.
- **Ready for owner action:** submit the registrar ticket in §3.3, complete any open domain/account verification, and have the registrar release the hold + refresh the registry delegation.
- **Staging is not deploy-ready** until the §4 gaps (DNS, cert, VPS compose/env/nginx conf/images, frontend+nginx containers) are closed. Post-DNS, the Phase-2 config baseline already satisfies Django/CSRF/CORS wiring and the `X-Forwarded-Proto` healthcheck contract.

**No infrastructure, DNS, TLS, VPS, or deployment changes were made during this phase.**

— Agent, NQP Platform