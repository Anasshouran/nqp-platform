# AGENTS.md — NQP Platform

## Project Overview

National Quarantine Platform (NQP) — full-stack web application for managing quarantine, screening, and disease surveillance at Sudan's ports of entry.

- **Domain:** `nqp.gov.sd`
- **Bilingual:** Arabic (primary) / English
- **Timezone:** `Africa/Khartoum`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13+ / Django 5.0 / DRF |
| Frontend | React 19 / TypeScript 5.5 / Vite 5 |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| Queue | Celery 5.4 |
| Storage | MinIO (S3-compatible) |
| Deploy | Docker Compose / Kubernetes |

## Project Structure

```
backend/
  nqp_backend/    # Django project (settings, urls, celery)
  apps/           # 26 domain modules
  core/           # Shared: BaseModel, pagination, permissions, renderers
frontend/
  src/
    api/          # Axios client + 33 endpoint modules
    components/   # Shared UI components
    pages/        # 56 page directories
    store/        # Redux Toolkit (auth + ui slices)
    types/        # 23 TypeScript type files
    hooks/        # 8 custom hooks
deploy/           # Docker Compose + Kubernetes manifests
docs/             # 21 documentation directories
```

## Key Commands

### Backend
```bash
cd backend
python manage.py runserver          # Dev server
python manage.py migrate            # Run migrations
python manage.py makemigrations     # Check for missing migrations
python -m pytest apps -q            # Run all tests (reuses test DB by default)
python -m pytest apps --create-db    # Run tests against a freshly built test DB
```

### Frontend
```bash
cd frontend
npm install                         # Install deps
npm run dev                         # Dev server (Vite)
npm run build                       # Production build (tsc + vite)
npm run lint                        # ESLint
npm test -- --run                   # Run tests (Vitest)
```

### Full Stack
```bash
make up                             # docker-compose up -d
make down                           # docker-compose down
make test                           # Run all tests
```

## Conventions

### Backend
- All models extend `core.models.BaseModel` (UUID PK, timestamps)
- API responses use `EnvelopeRenderer` — `{ status, data, message }`
- Authentication: JWT via `simplejwt`
- Tests: `pytest` with `pytestmark = pytest.mark.django_db`
- Arabic error messages (bilingual assertions in tests)

### Frontend
- Lazy-loaded pages with `React.lazy()`
- Role-based route guards via `ProtectedRoute`
- Redux Toolkit for state (auth, ui)
- MUI + Tailwind CSS for styling
- Zod schemas for form validation

### API
- All endpoints under `/api/v1/`
- OpenAPI schema at `/api/schema/`
- Swagger UI at `/api/docs/`
- Health check at `/api/v1/health/`

## Environment Variables

Required in production:
- `SECRET_KEY` — Django secret key
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL
- `REDIS_HOST` — Redis broker
- `JWT_SECRET_KEY` — JWT signing key (optional, uses Django SECRET_KEY if not set)

## CI/CD

GitHub Actions pipeline:
1. **Backend:** pytest against PostgreSQL
2. **Frontend:** lint + test + build (tsc + vite)
3. **Docker:** Build and push to GHCR (on main branch)
