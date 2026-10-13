# STAGING-0-M4-A — Approved Hostname, DNS & TLS Readiness Report

- **Phase:** STAGING-0-M4-A (Approved Hostname, DNS & TLS readiness gate for `staging.afyatna.com`)
- **Date:** 2026-10-09
- **Decision gate:** Controlled DNS + TLS readiness assessment. **No DNS changes, no certificate issuance, no Nginx activation, no public HTTPS.**
- **Analyst:** opencode agent (big-pickle)

---

## Overall verdict

```
BLOCKED
```

**`staging.afyatna.com` does not resolve to the approved staging destination `196.1.246.63`.**
The hostname returns the loopback address `127.0.0.1` (the same parked/loopback
record carried by all `*.afyatna.com` names), and the `afyatna.com` zone at the
`.com` TLD is delegated to the registrar suspension marker
`ns1/ns2.verification-hold.suspended-domain.com.` — the domain currently sits on a
registrar "verification hold" and has **no reachable authoritative nameservers**.
Certificate issuance, HTTP routing for the host, and M4 activation are all
**blocked** until the owner/DNS administrator resolves the domain suspension and
adds the correct A record. **(Gate 2 = FAIL → mandatory stop before Gate 4.)**

---

## 1. Repository and runtime baseline

| Item | Value |
|---|---|
| Local repo | `/home/anas/Desktop/Project-3/backup-2/nqp-platform` |
| Branch | `staging` |
| HEAD | `3215071` — `test+docs(staging): STAGING-0-R7 closeout — CSRF trusted-origins tests and report` (child of `687d6b9` `954dfbb`) |
| Worktree | clean for tracked files; only untracked pre-existing entries preserved (`.tmp` gone, `",\necho"`, `.backups/`, `.dev-run/`, `backend/afyatna`, `labels.ts.bak`, R5/R6/CLOSEOUT reports) |
| VPS | `196.1.246.63` — `SudaniCloudVPS5291139` (Ubuntu 24.04.5 LTS, kernel 6.8.0-139) — identity confirmed, matches approved staging address |
| Docker | Server 29.1.3, overlayfs; 9 containers running / 21 images; healthy |
| Dev stack | 6 `nqp-*-dev` containers up 11–12d; health 200 (`127.0.0.1:8001` backend, `127.0.0.1:8080` frontend) — **operational, preserved** |
| Staging stack | `nqp-staging-{backend,postgres,redis}` up; backend `@2b5d61aec43d`; internal health **200** |
| Disk / load | 26G/97G (28%), 67G free; load 0.05 — healthy |
| Databases | staging `nqp_staging`, dev `nqp_db` — isolated (no access taken) |

No repo files were modified. Gate-1 safety checks (identity, nginx, docker,
health, secret handling) all **PASSED**; runtime is healthy and staging is
clearly distinguished from development and production (no production present).

## 2. DNS results and evidence (Gate 2)

Target: `staging.afyatna.com` → should be `196.1.246.63`.

| Query | Resolver | Result |
|---|---|---|
| A `staging.afyatna.com` | 1.1.1.1 (UDP, DoH) | `127.0.0.1` (TTL 556) — **loopback, wrong city** |
| A `staging.afyatna.com` | 9.9.9.9 (UDP) | `127.0.0.1` (TTL 556) |
| A `staging.afyatna.com` | 8.8.8.8 (UDP) | **REFUSED** — EDE 22 "No Reachable Authority: At delegation afyatna.com" |
| A `staging.afyatna.com` | Google DoH | Status 5 REFUSED — "Private name servers (no query sent) [127.0.0.1]" |
| A `staging.afyatna.com` | VPS local + 9.9.9.9 (from VPS) | `127.0.0.1` |
| AAAA `staging.afyatna.com` | 1.1.1.1 / 9.9.9.9 | none |
| CNAME `staging.afyatna.com`, `www.afyatna.com` | 1.1.1.1 | none (no chain) |
| TXT `afyatna.com` | 1.1.1.1 | none |
| NS `afyatna.com` | `.com` TLD via `dig +trace` | `ns1.verification-hold.suspended-domain.com.`, `ns2.verification-hold.suspended-domain.com.` |
| SOA `afyatna.com` | 1.1.1.1 | `ns1.verification-hold.suspended-domain.com. admin.suspended-domain.com. 2012022012 …` |
| Direct authoritative query | `ns1.verification-hold.suspended-domain.com` | connection refused → 127.0.0.1#53 (unreachable) |
| Any `*afyatna.com` name pointing at `196.1.246.63` | 1.1.1.1 | **none** (afyatna.com, www, dev, api-dev, staging all → 127.0.0.1) |

**Interpretation:**

- `staging.afyatna.com` currently resolves to the **loopback address `127.0.0.1`**
  from every independent resolver reached (Cloudflare, Quad9, Google DoH, VPS).
  This is a parked/placeholder record, NOT the approved destination.
- 8.8.8.8 and Google DoH independently **refuse** to answer, reporting that the
  authority for `afyatna.com` is unreachable/private (`[127.0.0.1]`).
- The `.com` registry's chosen nameservers are
  `ns1/ns2.verification-hold.suspended-domain.com.` — a **registrar-level
  suspension marker**. The zone's SOA is served from the same suspended-domain
  authority. This means the domain is under registrar **verification hold**;
  public authoritative resolution is effectively unusable for real A records.
- There is **no conflict/duplicate**, but also **no valid route** to the VPS.

**Gate 2 result: FAIL (BLOCKED).** The exact actions the DNS administrator must
take are in §7.

## 3. HTTP reachability (Gate 3) — NOT EXECUTED for the public host

Per mandate, Gate 3 runs only if DNS passes. DNS did not pass, so **public HTTP
reachability for `staging.afyatna.com` was not exercised** and no virtual host
was activated or configuration changed.

Local observations (read-only, no activation):
- Host Nginx owns `0.0.0.0:80`, `0.0.0.0:443`, `[::]:80`, `[::]:443` (exclusive);
  `nginx -t` = syntax ok. Sites: `afyatna`, `afyatna-dev`, `afyatna-api-dev`
  (Let's Encrypt). **No staging vhost present.**
- `ufw` inactive; port 80/443 reachable from the public network at the network
  layer (no evidence of inbound blocking; SSH/docker-proxy loopback-only).
- Staging upstream currently reachable **only inside Docker** (`staging-net`, backend
  `localhost:8000`); staging nginx is bound to loopback `127.0.0.1:8443:443` per R7.
- Because the A record points to `127.0.0.1`, a future Let's Encrypt HTTP-01
  validation from the internet would attempt to reach `127.0.0.1` on the
  challenger's side — it cannot succeed for a public name until DNS points to the VPS.

## 4. Proposed host Nginx routing design (documented, NOT activated)

Kept consistent with R5/R6/R7 intent — staged for M4-B once DNS is fixed:

1. Public internet → **host Nginx** (`0.0.0.0:443`, TLS termination).
2. New vhost file `afyatna-staging` with `server_name staging.afyatna.com;`
   proxying to a dedicated staging upstream over loopback or Docker internal net.
3. Upstream options (chosen at M4-B after DNS+HTTP verification):
   - `proxy_pass http://127.0.0.1:8003;` if staging backend is later published
     loopback-only; **or**
   - `proxy_pass http://127.0.0.1:8443;` toward the staging nginx container
     (loopback, TLS-internal); **or**
   - direct `proxy_pass http://<staging-net container IP>:8000;` via Docker network.
4. Forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` (already in
   `deploy/staging/nginx/staging.conf` template).
5. Leave `afyatna`, `afyatna-dev`, `afyatna-api-dev` vhosts and their certs
   untouched. `nginx -t` before reload; reload only in an activation phase.
6. `SECURE_SSL_REDIRECT: "True"`, `SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE`
   already set in the staging compose; `CSRF_TRUSTED_ORIGINS` and
   `CORS_ALLOWED_ORIGINS` must contain `https://staging.afyatna.com` in the
   staging `.env` (values not printed).

## 5. TLS issuance prerequisites (Gate 4) — NOT ACTED UPON

Certificate tooling verified (read-only):

| Item | Status |
|---|---|
| `certbot` | present **2.9.0**; `certbot.timer` **active** |
| Existing Let's Encrypt live dirs | `afyatna.com`, `dev.afyatna.com`, `api-dev.afyatna.com` (valid, exp 2026-12-20) — untouched |
| Staging cert | **absent** (expected; not issued) |
| ACME challenge viability | **BLOCKED**: HTTP-01 needs the A record → VPS + reachable port 80; DNS-01 needs authoritative DNS under owner control (currently registrar-hold NS). Neither is possible until §7 is done. |

No certificate was issued or renewed. No private key exposed. The dev
`deploy/ssl/*.pem` self-signed pair exists on disk but is gitignored and unused
by staging/host and must **not** be used as a substitute for trusted public TLS.

TLS issuance prerequisites (for the authorized M4-B phase only):
1. DNS fixed and re-verified (A `staging.afyatna.com` → `196.1.246.63`, reachable authority).
2. HTTP-01 (or DNS-01) challenge verified from the internet to the VPS.
3. Issue Let's Encrypt cert for `staging.afyatna.com` (Certbot), store under
   `/etc/letsencrypt/live/staging.afyatna.com/`.
4. Wire the new vhost to the cert; `nginx -t`; reload.
5. Confirm `CSRF_TRUSTED_ORIGINS`/`CORS` include the origin and health is public 200.

## 6. Exact blockers and owner actions

| # | Blocker | Owner / DNS-admin action | Gate |
|---|---------|--------------------------|------|
| 1 | `afyatna.com` delegated to registrar suspension nameservers (`ns1/ns2.verification-hold.suspended-domain.com`) | **Resolve the registrar verification hold / domain suspension** with the registrar; restore real authoritative nameservers for `afyatna.com` | 2 |
| 2 | `staging.afyatna.com` → `127.0.0.1` (loopback) | **Add an A record:** `staging.afyatna.com.  IN  A  196.1.246.63` (TTL 300–600). Ensure no conflicting `127.0.0.1` record remains for this name. No AAAA unless IPv6 is provisioned | 2 |
| 3 | Authoritative answers currently REFUSED/unreachable (8.8.8.8, Google DoH report "No Reachable Authority"/private NS) | After fixing NS, confirm `dig staging.afyatna.com @<authoritative-ns>` returns `196.1.246.63` from multiple resolvers | 2 |
| 4 | No staging TLS cert, no staging vhost, ACME not runnable | Deferred to M4-B **only after** #1–#3 verified | 3/4 |
| 5 | (carry-over) Mobile staging API URL placeholder | Set `EXPO_PUBLIC_API_URL=https://staging.afyatna.com/api/v1` after HTTPS live (M5, out of scope) | — |

## 7. Exact DNS record changes for the DNS administrator

```
1. Domain-level (registrar):  remove verification-hold / suspended-domain status
   for afyatna.com; set authoritative NS to the owner's DNS provider
   (e.g.  ns1.owner-dns   ns2.owner-dns).

2. Add A record:
   staging.afyatna.com.   IN  A   196.1.246.63     (TTL 300-600)

3. Remove/replace any existing loopback record:
   staging.afyatna.com.   IN  A   127.0.0.1        -> DELETE

4. Optional (none required now): no CNAME for the apex; no AAAA
   (VPS has no public IPv6); do NOT add wildcard records.

5. Verification after change:
   dig +short A staging.afyatna.com @1.1.1.1        => 196.1.246.63
   dig +short A staging.afyatna.com @9.9.9.9         => 196.1.246.63
   dig +short A staging.afyatna.com @8.8.8.8         => 196.1.246.63  (NO REFUSED)
```

Until #1 and #2 are done, certificate issuance and activation must NOT proceed
(verification-hold NS cannot host ACME challenges).

## 8. Decision on M4 activation

**NOT AUTHORIZED TO PROCEED.** Gate 2 (DNS) is blocked. M4 activation (cert
issuance, host Nginx staging vhost, public HTTPS) must wait for the domain
suspension to be resolved and the A record to point at `196.1.246.63`, then a
follow-up readiness pass (M4-B) with re-verified DNS, HTTP reachability, and ACL
checks. No staging Nginx, host Nginx, DNS, TLS, firewall, or deployment changes
were made in this phase.

## Compliance confirmation

- **Read-only:** no DNS changes; no cert issuance/renewal; no Nginx activation/
  reload/restart; no deployment or image pull; no migrations; no transaction
  writes; no production access; no firewall changes; no destructive cleanup; no
  SUDAPASS/Declaration Write.
- **Secrets:** no private keys, `.env` values, or tokens printed.
- **Worktree:** preserved; baseline recorded to `/tmp/opencode/r7/m4a_baseline.txt`;
  no tracked modifications.
- **Stop:** this report ends the phase. M4-B/HTTPS activation is deferred.