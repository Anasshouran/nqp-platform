# National Quarantine Platform (NQP) — منصة الحجر الصحي القومي

A comprehensive digital health platform for managing quarantine, screening, and disease surveillance at all ports of entry in Sudan (airports, seaports, land borders).

## Tech Stack

- **Backend:** Python 3.13+, Django 5.0, Django REST Framework
- **Frontend:** React 19, TypeScript, Vite, Material UI, Tailwind CSS
- **Database:** PostgreSQL 16 + PostGIS
- **Cache/Queue:** Redis 7 + Celery
- **Storage:** MinIO (S3-compatible)
- **Deployment:** Docker, Kubernetes, GitHub Actions

## Quick Start

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev

# Docker (full stack)
docker compose -f deploy/docker-compose.yml up --build
```

## Documentation

See the `docs/` directory for architecture, API specs, database design, and workflows.
