# Host-level deploy configuration

Files under this directory are **host configs** — they live outside the
repo's Docker Compose stacks and must be placed manually on the VPS.

## daemon.json

Configures Docker's default log driver to `json-file` with rotation
(`max-size: 10m`, `max-file: 3` → 30MB cap per container).

**Install path:** `/etc/docker/daemon.json`

**Activation:** takes effect on the next `dockerd` restart. Containers we
manage via `deploy/docker-compose.dev-vps.yml` and
`deploy/staging/docker-compose.yml` already declare logging blocks at the
compose level, so they apply on their next recreate (no daemon restart
needed for them).

**Why both:** daemon.json covers containers started outside Compose
(`docker run`, ad-hoc); compose-level logging covers containers under our
control regardless of daemon state.

**To apply on a fresh VPS:**

```sh
install -m 644 deploy/host/daemon.json /etc/docker/daemon.json
systemctl restart docker   # brief (~10-60s) outage for all containers
```

## Current VPS state (applied during ops session)

- `/etc/docker/daemon.json` installed (rotation defaults for new containers)
- `deploy/staging/docker-compose.yml` logging applied and **containers recreated**
  (rotation active: 4 staging containers show `max-size:10m max-file:3`)
- `deploy/docker-compose.dev-vps.yml` logging committed but **not yet applied**
  (dev containers will pick it up on their next recreate; no dockerd restart done)
