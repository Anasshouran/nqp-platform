# Kubernetes Manifests — Aspirational / Dormant

> ⚠️ **STATUS: NOT IN USE.**
> These manifests describe an aspirational production-k8s topology
> (last touched 2026-09-22, commit 3be318c). They are not applied anywhere.
> The actual deploy targets are Docker Compose files:
> - `deploy/docker-compose.dev-vps.yml` — dev stack
> - `deploy/staging/docker-compose.yml` — staging stack

## Known gaps before any use

1. **Images** point to `ghcr.io/nqp/*` (nonexistent org) and use `:latest` tags.
   - Correct org: `ghcr.io/anasshouran/*`
   - Pin by digest, not tag.
2. **Secrets** — almost all values are `REPLACE_ME_BASE64` placeholders.
   - One stale literal exists: `db-name: bnFwX2Ri` (decodes to `nqp_db`, a DB name
     that does not exist on any current environment).
3. **Database name** — the manifest declares `nqp_db`; real environments use
   `afyatna` (dev) and `staging_afyatna` (staging).
4. **Ingress** targets `nqp.gov.sd` / `api.nqp.gov.sd` — not provisioned.
5. **Persistence** — Postgres uses a StatefulSet + PVC; a real deployment would
   need a decision (StatefulSet vs managed DB).
6. **CI/CD** — no workflow references this directory; there is no apply pipeline.

## What this directory *is* good for

A record of the intended production topology (ingress hostnames, service layout,
namespace `nqp`, TLS approach). Useful when planning production-k8s later.
Treat it as a design sketch, not deployable config.

## If you intend to use these manifests

1. Fix the gaps above.
2. Wire into a CI/CD workflow with explicit approval.
3. Provision ingress hosts and TLS.
4. Decide persistence model.
5. Test in a throwaway cluster first.