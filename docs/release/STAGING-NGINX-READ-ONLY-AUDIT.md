# STAGING-NGINX-READ-ONLY-AUDIT

Read-only diagnostics audit of Nginx, DNS, TLS, and Docker routing for `staging.afyatna.com`, `dev.afyatna.com`, `afyatna.com`.

- **Audit timestamp:** 2026-10-09 ~03:08–03:30 UTC (local probes) / VPS commands executed live
- **Type:** READ-ONLY. No config/DNS/cert/service/container/application changes.
- **Analyst:** opencode agent (big-pickle)

---

## 1. Audit timestamp and environment

| Item | Value |
|---|---|
| Execution host | Local development machine `parrot` (user `root`) — **NOT the VPS** |
| Git repo | `/home/anas/Desktop/Project-3/backup-2/nqp-platform` |
| Branch / HEAD | `staging` / `3215071` (`test+docs(staging): STAGING-0-R7 closeout …`) |
| Worktree | Clean for tracked files; pre-existing untracked entries preserved |
| VPS | `SudaniCloudVPS5291139` @ `196.1.246.63`, Ubuntu 24.04.5 LTS, kernel 6.8.0-139 |
| VPS access | Reachable via already-configured authorized SSH key (no password/token used) |
| VPS identity | Verified: hostname `SudaniCloudVPS5291139`, root via key |

## 2. Checks performed & outcomes (exact commands, redacted)

- `systemctl is-active nginx` → `active` (running since 2026-09-25, 1 week 6 days)
- `nginx -t` → `syntax is ok` / `test is successful`
- `ss -ltnp` → ports 80/443 owned by nginx; 8001/8080 by docker-proxy; **no 8443 listener**
- `nginx -T` → vhost/server_name/proxy_pass/cert paths extracted (values below, no key material)
- `docker ps --format …` → 9 containers; port mappings listed
- `openssl x509 … -dates -subject -ext subjectAltName` on the 3 live certs (no private keys)
- `dig` A/AAAA/CNAME/NS/SOA/`+trace`/`+norecurse` against `1.1.1.1`, `9.9.9.9`, `8.8.8.8`, `.com` gTLD servers, registrar OrderBox nameservers
- `whois afyatna.com` (registry status/NS delegation)
- `curl` bounded probes (connect-timeout 5, max-time 10) external + `--resolve` to VPS IP (diagnostic only)
- `tail` bounded nginx access/error logs (sanitized)

## 3. Nginx service/configuration findings

| Check | Result |
|---|---|
| Service | **PASS** — active, enabled, running |
| Config syntax | **PASS** — `nginx -t` ok |
| Public listeners | nginx owns `0.0.0.0:80`, `0.0.0.0:443`, `[::]:80`, `[::]:443` exclusively |
| Loopback listeners | 8001 (docker-proxy → dev backend), 8080 (docker-proxy → dev frontend) |
| 8443 | **NOT LISTENING** — staging nginx container is not running (no listener exists) |
| Vhosts present | `afyatna.com/www` (static), `dev.afyatna.com`, `api-dev.afyatna.com` |
| **Staging vhost** | **ABSENT** — no `staging.afyatna.com` server block anywhere |
| proxy_pass | `api-dev → http://127.0.0.1:8001`, `dev → http://127.0.0.1:8080` — **both match live docker-proxy listeners** |
| HTTP→HTTPS | present for afyatna/api-dev/dev (Certbot `return 301 …`); port-80 servers otherwise `return 404` |
| Duplicates/conflicts | none found |
| Staging vs dev/prod routing | staging is **not routed at all** by host nginx (isolated by absence) |

## 4. DNS delegation and record findings

| Item | Result |
|---|---|
| `staging.afyatna.com A` @ `1.1.1.1` / `9.9.9.9` | `127.0.0.1` (TTL ~597) |
| `staging.afyatna.com A` @ `8.8.8.8` | (empty/REFUSED) |
| `dev.afyatna.com A` @ public resolvers | `127.0.0.1` |
| `afyatna.com A` @ public resolvers | `127.0.0.1` |
| AAAA / CNAME for staging | none everywhere |
| Public `NS afyatna.com` | empty at resolver level (delegation unresolved) |
| **Parent (.com) delegation** via `+trace`/`+norecurse` on multiple gTLD servers | `ns1.verification-hold.suspended-domain.com.`, `ns2.verification-hold.suspended-domain.com.` (TTL 172800) — **unchanged** |
| SOA (parent) | `ns1.verification-hold.suspended-domain.com. admin.suspended-domain.com. 2012022012 …` |
| `whois afyatna.com` registry | Domain Status: `clientTransferProhibited`; **Name Server: NS1/NS2.VERIFICATION-HOLD.SUSPENDED-DOMAIN.COM**; Updated 2026-10-06; Registrar PDR Ltd (PublicDomainRegistry); DNSSEC unsigned |
| Registrar dashboard (owner-stated) | NS = `expresso.{earth,mars,mercury,venus}.orderbox-dns.com` |
| Registrar OrderBox nameservers | Resolvable (e.g. `162.251.82.246/248…`), live |
| **Authoritative zone @ OrderBox** | **`staging.afyatna.com`, `dev.afyatna.com`, `www.afyatna.com`, `afyatna.com` → `196.1.246.63`**; SOA `expresso.earth.orderbox-dns.com. anasshouran2018.gmail.com. 2026100904` (**updated today, 2026-10-09**) |

**Delegation vs authoritative mismatch (root cause):**
- The **registrar zone (OrderBox)** is correct and freshly updated — it serves `196.1.246.63` for all four names, including `staging.afyatna.com`.
- The **parent-zone delegation at the `.com` registry still points at the `verification-hold.suspended-domain.com` marker** (registry hold), which serves the parked `127.0.0.1` / REFUSED answers.
- Result: public resolvers follow the parent delegation → parked `127.0.0.1`; the correct records are not yet visible publicly. The registrar's configured NS (OrderBox) and the registry-level delegation (verification-hold) **disagree** — a classic "NS update not yet propagated/applied at registry" or pending-hold condition.

## 5. TLS certificate and hostname findings

| Host | Cert | Validity | SAN | Status |
|---|---|---|---|---|
| `afyatna.com` | Let's Encrypt (Certbot) | 2026-09-21 → 2026-12-20 | `afyatna.com`, `www.afyatna.com` | **PASS** — covers host |
| `dev.afyatna.com` | Let's Encrypt | 2026-09-21 → 2026-12-20 | `dev.afyatna.com` | **PASS** |
| `api-dev.afyatna.com` | Let's Encrypt | 2026-09-21 → 2026-12-20 | `api-dev.afyatna.com` | **PASS** |
| `staging.afyatna.com` | **NONE** | — | — | **MISSING** (expected; no issuance performed) |

Certbot 2.9.0 + `certbot.timer` active. No private key contents displayed. No duplicate vhosts/cert collisions.

## 6. TLS/HTTP diagnostics (bounded, read-only)

External (follows public DNS → parked `127.0.0.1` / REFUSED):

| Probe | Result |
|---|---|
| `https://dev.afyatna.com/` | `curl: (6) Could not resolve host` |
| `https://staging.afyatna.com/` | `curl: (6) Could not resolve host` |
| `http://staging.afyatna.com/` | `curl: (6) Could not resolve host` |

**These tests do NOT exercise the VPS** — they fail at resolution. They prove nothing about the VPS staging vhost. Noted per mandate.

Direct-to-VPS diagnostic (`--resolve host:80|443:196.1.246.63`, no DNS/EUID change; purely a diagnostic request):

| Probe | Result | Interpretation |
|---|---|---|
| `http://staging.afyatna.com/` → VPS | HTTP 404 | No staging vhost; default host-nx server answers (normal) |
| `https://staging.afyatna.com/` → VPS | TLS verify fail (`ssl_verify_result` mismatch: "no alternative certificate subject name matches target hostname `staging.afyatna.com`") | No cert for staging hostname — expected |
| `https://dev.afyatna.com/` → VPS | HTTP 200, tls=0 | **PASS** — dev vhost + valid cert served from VPS |
| `https://afyatna.com/` → VPS | HTTP 200, tls=0 | **PASS** |
| `https://api-dev.afyatna.com/api/v1/health/` → VPS | HTTP 200 | **PASS** — dev API through host nginx |

## 7. Docker/upstream routing findings

| Item | Value |
|---|---|
| Compose file | `/opt/nqp-platform/deploy/docker-compose.yml` exists (7,575 B; content not dumped) |
| Dev backend | `nqp-backend-dev` — `127.0.0.1:8001 -> 8000/tcp`, healthy |
| Dev frontend | `nqp-frontend-dev` — `127.0.0.1:8080 -> 80/tcp`, healthy |
| Dev celery/beat/redis/postgres | running (celery/beat no published ports; redis/postgres internal) |
| Staging backend | `nqp-staging-backend` running, **no published port** (internal only) |
| Staging postgres/redis | running, internal only |
| Staging nginx container | **NOT RUNNING** (no 8443 binding, consistent with R7 `127.0.0.1:8443:443` config awaiting activation) |
| Upstream ↔ listener match | nginx `proxy_pass 127.0.0.1:8001/8080` ↔ docker-proxy listeners confirmed **matched** |
| Staging route | currently **not proxied** by host nginx (no vhost) |

No container shells executed; no container state mutated; no env/secret values printed.

## 8. Health-check results

| Target | Result |
|---|---|
| Dev backend container `nqp-backend-dev` | `healthy` |
| Dev frontend container `nqp-frontend-dev` | `healthy` |
| Dev API through host nginx (`api-dev` health endpoint, direct-to-VPS) | **200** |
| `127.0.0.1:8001/api/v1/health/` (VPS-local) | **200** |
| `127.0.0.1:8080/` (VPS-local) | **200** |
| Staging backend (inside container, `localhost:8000/api/v1/health/`) | **200** |
| Staging backend (with `Host: staging.afyatna.com`) | **HTTP 400** — Docker/ALLOWED_HOSTS rejects the hostname (see §10) |
| Staging backend container healthcheck | **NOT CONFIGURED** (no `.State.Health.Status`) |
| M4-A DNS readiness report | **BLOCKED** (previous phase) |

## 9. Findings classification

| Finding | Class |
|---|---|
| Host nginx service + syntax + listeners | **PASS** |
| Dev HTTPS endpoints via VPS (`dev`, `afyatna.com`, `api-dev`) with valid certs | **PASS** |
| Nginx upstream destinations match real listeners (8001/8080) | **PASS** |
| Registrar authoritative zone (OrderBox) has correct records → `196.1.246.63` | **PASS** (freshly updated) |
| `staging.afyatna.com` publicly resolvable to `196.1.246.63` | **BLOCKED** (parent delegation still on verification-hold marker) |
| Staging vhost + staging TLS cert | **NOT CHECKED / MISSING** — by design (no issuance/activation this phase) |
| Staging nginx container/8443 | **NOT RUNNING** (by design, awaiting activation) |
| Staging backend ALLOWED_HOSTS/CSRF contains `staging.afyatna.com` | **FAIL** — not present in staging `.env` (presence check; values not printed); health with that Host = 400 |
| Worktree integrity / secret handling | **PASS** — unchanged; no secrets printed |

## 10. Root-cause assessment (evidence + confidence)

**Primary root cause — DNS delegation mismatch (confidence: high).**
- Evidence: public resolvers return `127.0.0.1` (parked); `.com` parent + `whois` show delegation to `ns1/ns2.verification-hold.suspended-domain.com` (registry hold marker, updated 2026-10-06, status `clientTransferProhibited`); the same queries against the registrar's live OrderBox nameservers return `196.1.246.63` with a zone serial bumped today (`2026100904`).
- Conclusion: the zone data is correct on the registrar side, but the **registry has not (yet) applied/released the NS delegation away from the verification-hold marker**, so public resolution cannot reach the correct authoritative answer. This is **external to Nginx/VPS** and is the same condition that blocked M4-A.
- Confidence: high (three independent evidence layers: public resolvers, .com gTLD delegation, whois, plus authoritative zone).

**Secondary — staging app/route gaps (confidence: high).**
- No host-nginx staging vhost, no staging cert, staging nginx container not started (all **by design** pending M4 activation).
- `STAGING_ALLOWED_HOSTS` / `STAGING_CSRF_TRUSTED_ORIGINS` / `STAGING_CORS_ALLOWED_ORIGINS` in the VPS staging `.env` do **not yet** contain `staging.afyatna.com` → staging backend returns HTTP 400 for that Host header. Must be wired before public TLS can work.

No Nginx, TLS, or upstream *defect* was found; dev routing is intact and healthy.

## 11. Minimal proposed remediation (NO changes executed)

1. **Owner/DNS admin:** complete the registry delegation change so `afyatna.com` NS at the `.com` level becomes the OrderBox nameservers (`expresso.*.orderbox-dns.com`). This may require resolving the verification-hold / confirming DNS host validation at the registrar. Contact registrar (PDR / PublicDomainRegistry) if the hold persists.
2. **Verify after delegation applies:**
   ```
   dig +short A staging.afyatna.com @1.1.1.1    → 196.1.246.63
   dig +short A staging.afyatna.com @9.9.9.9     → 196.1.246.63
   dig +short A staging.afyatna.com @8.8.8.8     → 196.1.246.63 (no REFUSED)
   ```
3. **Staging app wiring (staging `.env`, values not shown here):** set `STAGING_ALLOWED_HOSTS` to include `staging.afyatna.com`, and `STAGING_CSRF_TRUSTED_ORIGINS` / `STAGING_CORS_ALLOWED_ORIGINS` to `https://staging.afyatna.com`.
4. **M4 activation phase (separate, authorized):** issue Let's Encrypt cert for `staging.afyatna.com`; add host-nginx staging vhost proxying to the staging upstream (loopback/Docker net); `nginx -t` then reload; start staging nginx on `127.0.0.1:8443:443`; verify public 200 on `https://staging.afyatna.com/api/v1/health/`.
5. Optionally add a staging backend container healthcheck (currently missing).

**None of the above was performed in this audit.**

## 12. Compliance confirmation

No repository files, DNS records, certificates, Nginx configuration, firewall rules, Docker resources, containers, services, or application code were created, modified, deleted, restarted, reloaded, or rebuilt. No `certbot`, ACME, install, migration, deployment, `docker compose up/down`, `git clean/reset/checkout`, or destructive command was run. No secrets, private keys, credentials, tokens, or `.env` values were printed. Worktree state is unchanged.

---

## Final verdict

```
BLOCKED
```

Blocking cause: **external DNS/registrar issue** — the `.com` parent delegation for `afyatna.com` still points to the registry verification-hold marker (`verification-hold.suspended-domain.com`) while the registrar's authoritative zone (OrderBox) already serves the correct `196.1.246.63` records. This is explicitly distinguished from the Nginx/TLS/upstream layer, which is functional (dev/afyatna.com HTTPS 200 via VPS; upstreams match listeners). Additionally, staging is not ready because no staging vhost/cert exists (by design) and the staging `.env` does not yet include `staging.afyatna.com` in ALLOWED_HOSTS/CSRF/CORS (staging backend returns 400 for that Host).

The audit is **complete**: delegation failure vs Nginx/TLS/upstream failure are separated with evidence. Staging must NOT be declared ready merely because `nginx -t` passes. Public HTTPS for `staging.afyatna.com` cannot be enabled until the delegation is fixed and the staging app/route wiring is applied. No fixes were implemented.