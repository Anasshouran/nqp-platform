# عافيتنا | AFYATNA

منصة الحجر الصحي القومي — National Quarantine Platform.

## Stack

| Tier | Technology |
|---|---|
| Backend | Django 5.2 (≥5.2.17) · DRF 3.17 · Celery 5.4 · Gunicorn · Python 3.13 |
| Frontend | React 19 · Vite 5.4 · TypeScript 5.5 · MUI 5 · i18next · TanStack Query |
| Mobile | Expo 57 · React Native 0.86 · Redux Toolkit · expo-secure-store |
| Contracts | TypeScript + Zod (shared API schemas, consumed by mobile + web + CI) |
| Database | PostgreSQL 16 (PostGIS optional, when `DB_ENGINE=…postgis`) |
| Cache / Queue | Redis 7 (Celery broker + result backend) |
| Storage | MinIO (S3-compatible) |
| Deploy | Docker Compose (dev + staging) · k8s manifests are aspirational |

## Structure

- `backend/` — Django project, 34 apps, ~120k LOC, 126 test files
- `frontend/` — React SPA (Vite), 12 modules, 48 test files
- `mobile/` — Expo / React Native app, 14 modules, 19 test files
- `contracts/` — shared TypeScript/Zod schemas (`@afyatna/contracts`)
- `deploy/` — compose (dev, staging, local), host configs, k8s (dormant)
- `docs/` — 22 topic directories, 450+ markdown files

## Quick Start

### Backend

```sh
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```sh
cd frontend
npm ci
npm run dev            # http://localhost:3001
```

### Mobile

```sh
cd mobile
npm ci
npx expo start         # then `a` for Android, `i` for iOS simulator
npx tsc --noEmit       # typecheck
npx jest --runInBand   # tests
```

### Full Stack (Docker)

```sh
make up                # dev stack (deploy/docker-compose.yml)
make test              # run all tests
```

### Local Review Stack

See `deploy/local/README.md` (not tracked; created locally).

## Docs

- [`docs/`](./docs/) — full documentation (architecture, modules, DB, API, UX, security)
- [`docs/09_Development/`](./docs/09_Development/) — setup + workflows
- [`AGENTS.md`](./AGENTS.md) — conventions for AI agents
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`mobile/AGENTS.md`](./mobile/AGENTS.md) — mobile conventions

## Environments

| Name | Host | Notes |
|---|---|---|
| Development | `dev.afyatna.com` | dev stack (backend 8001, frontend 8080) |
| Staging | `staging.afyatna.com` | staging stack (backend 9001, frontend 9080) |
| API dev | `api-dev.afyatna.com` | API-only alias to dev backend |
| Production | `afyatna.com` | static placeholder; production stack not yet deployed |

## Make Targets

`make help` · `make up` · `make down` · `make build` · `make backend` · `make frontend` · `make migrate` · `make shell` · `make test` · `make test-clean` · `make clean`

## License

See [LICENSE](./LICENSE) if present; otherwise contact the maintainers.
