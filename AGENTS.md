# AGENTS.md — NQP Platform

## Project Overview

National Quarantine Platform (NQP) — full-stack web application for managing quarantine, screening, and disease surveillance at Sudan's ports of entry.

- **Domain:** `nqp.gov.sd`
- **Bilingual:** Arabic (primary) / English
- **Timezone:** `Africa/Khartoum`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13+ / Django 5.2 (>=5.2.17) / DRF |
| Frontend | React 19 / TypeScript 5.5 / Vite 5 |
| Mobile | Expo 57 / React Native 0.86 |
| Database | PostgreSQL 16 (+ PostGIS when `DB_ENGINE=…postgis`, production) |
| Cache | Redis 7 |
| Queue | Celery 5.4 |
| Storage | MinIO (S3-compatible) |
| Deploy | Docker Compose (dev + staging); k8s manifests are aspirational/dormant |

## Project Structure

```
backend/
  nqp_backend/    # Django project (settings, urls, celery)
  apps/           # 34 domain modules
  core/           # Shared: BaseModel, pagination, permissions, renderers
frontend/
  src/
    api/          # Axios client + 40 endpoint modules
    components/   # Shared UI components
    pages/        # 59 page directories (335 files)
    store/        # Redux Toolkit (auth + ui slices)
    types/        # 30 TypeScript type files
    hooks/        # 12 custom hooks
mobile/           # Expo/React Native app (14 modules, 19 test files) — see mobile/AGENTS.md
contracts/        # Shared TS/Zod schemas (12 files) consumed by mobile + web + CI
deploy/           # Docker Compose (dev + staging); k8s manifests aspirational
docs/             # 20 documentation directories
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

### Mobile
```bash
cd mobile
npm install                         # Install deps
npx expo start                      # Dev server
npx tsc --noEmit                    # TypeScript check
npx expo lint                       # ESLint
npx jest --runInBand                # Run tests (Jest)
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
3. **Mobile:** typecheck + lint + jest (path-filtered on `mobile/**` + `contracts/**`)
4. **Docker:** Build and push backend/frontend images to GHCR (on main branch)
5. **Mirroring:** `mirror-infra-images.yml`, `mirror-postgres-image.yml` keep base images mirrored to GHCR
