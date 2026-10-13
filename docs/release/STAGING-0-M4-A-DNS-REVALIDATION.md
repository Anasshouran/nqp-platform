# STAGING-0-M4-A — DNS Revalidation Report (`staging.afyatna.com`)

- **Phase:** STAGING-0-M4-A-DNS-REVALIDATION (read-only re-check after owner added the DNS record)
- **Date:** 2026-10-09
- **Type:** Read-only. No DNS changes, no certificate issuance, no Nginx/config/service or firewall changes, no deployment.

---

## Verdict

```
BLOCKED
```

`staging.afyatna.com` **still resolves to `127.0.0.1` (loopback), not the approved
`196.1.246.63`**, from every independent resolver queried — including the zone's
own authoritative nameservers. The added DNS record has **not taken effect** (or
was added in a zone that remains overridden by the registrar suspension marker).
The public DNS state is unchanged from the BLOCKED M4-A readiness report.

Because DNS does not pass, per the mandate: no meaningful public HTTP
reachability test for the VPS was possible, no certificate action was taken, and
the phase stops here. (Read-only probe below was executed for evidence only; it
followed the A record to `127.0.0.1`, i.e. the local machine, not the VPS.)

---

## 1. A record — resolver matrix (timestamps)

| Resolver | Answer for `A staging.afyatna.com` | TTL | Status | Timestamp (UTC) |
|---|---|---|---|---|
| `1.1.1.1` (Cloudflare, UDP) | `127.0.0.1` | 600 | NOERROR | 2026-10-09T03:08:37Z |
| `9.9.9.9` (Quad9, UDP) | `127.0.0.1` | — | NOERROR | 2026-10-09T03:08:37Z |
| `8.8.8.8` (Google, UDP) | *(no answer)* | — | **REFUSED** (EDE 22 "No Reachable Authority: At delegation afyatna.com") | 2026-10-09T03:08:37Z |
| Google DNS-over-HTTPS (`dns.google/resolve?type=A`) | *(no answer)* | — | **Status 5 (REFUSED)** — "Private name servers (no query sent) [127.0.0.1]" | 2026-10-09T03:08:37Z |
| VPS local resolver | *(empty)* | — | — | 2026-10-09T03:09:xxZ |
| VPS via `9.9.9.9` | `127.0.0.1` | — | NOERROR | 2026-10-09T03:09:xxZ |
| **Authoritative `162.251.82.2`** (private/verification-hold NS IP, direct) | `127.0.0.1` | — | NOERROR | 2026-10-09T03:09:38Z |

**Target:** expected `196.1.246.63` — **not observed anywhere.**

## 2. Google DNS-over-HTTPS raw responses

```
A    : Status 5 (REFUSED); Comment "Private name servers (no query sent) [127.0.0.1]";
       extended_dns_errors EDE 22 "At delegation afyatna.com for staging.afyatna.com/a"
AAAA : Status 5 (REFUSED); EDE 22 ".../aaaa"
```

## 3. Authoritative NS delegation for `afyatna.com`

| Check | Result |
|---|---|
| `.com` TLD referral (`g.gtld-servers.net`, `j.gtld-servers.net`, non-recursive) | `afyatna.com` NS = `ns1.verification-hold.suspended-domain.com.`, `ns2.verification-hold.suspended-domain.com.` (TTL 172800) |
| Glue / A of those NS | `162.251.82.2` (ns2 glue); `ns1`/`ns2.verification-hold.suspended-domain.com` A queries → `127.0.0.1` |
| SOA `afyatna.com` | `ns1.verification-hold.suspended-domain.com. admin.suspended-domain.com. 2012022012 …` |
| Direct authoritative query | `dig @162.251.82.2 A staging.afyatna.com` → `127.0.0.1` |
| Registrar suspension indicator | **present** — the zone is delegated to the registrar's `verification-hold.suspended-domain` nameservers and answers with the parked `127.0.0.1` placeholder |

Conclusion: the **authoritative zone is still the registrar suspension marker**; a
new A record added by the owner is not (or not yet) served, and the `.com`-level
delegation itself still points at the suspended-domain NS pair. Propagation is
therefore not the only issue — the authority remains the parked zone.

## 4. Target confirmation

- `staging.afyatna.com` → `127.0.0.1` (loopback) — **NOT `196.1.246.63`**.
- No resolver returned the approved VPS address.

## 5. AAAA and CNAME answers

| Type | Resolver | Answer |
|---|---|---|
| AAAA | `1.1.1.1`, `9.9.9.9`, Google DoH | none |
| CNAME | `1.1.1.1`, Google DoH | none (no CNAME, no chain) |

## 6. External HTTP reachability (evidence-only, read-only)

Per the mandate, HTTP reachability is meaningful only when DNS passes. DNS did
not, so this is recorded for completeness only:

```
curl http://staging.afyatna.com/  → HTTP 200  (resolve=127.0.0.1, t=0.40s) [local machine, NOT the VPS]
curl https://staging.afyatna.com/ → HTTP 000  (t=0.036s) [no TLS route]
getent ahosts staging.afyatna.com → 127.0.0.1
```

If the A record later points at `196.1.246.63`, the correct reachability check is
`curl -sSI --resolve staging.afyatna.com:80:196.1.246.63 http://staging.afyatna.com/`
from an external v4 network — to be performed in the next phase, not now.

## 7. Exact record change still required of the DNS administrator

1. **Resolve the registrar verification-hold / suspended-domain state** for
   `afyatna.com` so that real authoritative nameservers (owner's DNS provider)
   are delegated at the `.com` level (currently `ns1/ns2.verification-hold.suspended-domain.com`).
2. On the owner-authorized zone, add:
   ```
   staging.afyatna.com.   IN  A   196.1.246.63   (TTL 300-600)
   ```
3. Delete/replace any `127.0.0.1` record for `staging.afyatna.com`.
4. After change, verify with the same matrix:
   ```
   dig +short A staging.afyatna.com @1.1.1.1        → 196.1.246.63
   dig +short A staging.afyatna.com @9.9.9.9         → 196.1.246.63
   dig +short A staging.afyatna.com @8.8.8.8         → 196.1.246.63   (NOT REFUSED)
   dig +short A staging.afyatna.com @<owner-authorized NS>  → 196.1.246.63
   ```
5. Only then re-run the reachability and TLS readiness checks (M4-A follow-up).

## 8. Stop statement

DNS revalidation **BLOCKED**. No certificates issued, no DNS modified, no Nginx/
firewall/service changes, no deployment. Report ends the phase; M4 activation and
HTTPS remain unauthorized until DNS resolves to `196.1.246.63`.