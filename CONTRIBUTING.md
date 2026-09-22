# Contributing to NQP Platform

Thank you for your interest in contributing to the National Quarantine Platform!

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 22+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (optional)

### Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `make up` or follow the manual setup below

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/base.txt -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Code Standards

### Python / Django
- Follow PEP 8
- Use `pytest` for tests (not Django TestCase)
- All models must extend `core.models.BaseModel`
- Arabic comments and error messages (bilingual where appropriate)
- Run `python -m pytest apps -q` before committing

### TypeScript / React
- Use TypeScript strict mode
- Follow existing component patterns
- Run `npm run lint` and `npm run build` before committing
- Use Zod for form validation schemas

### Git
- Write clear, descriptive commit messages
- Keep commits focused (one logical change per commit)
- Reference issues when applicable

## Testing

### Backend
```bash
cd backend
python -m pytest apps -q
```

### Frontend
```bash
cd frontend
npm test -- --run
npm run lint
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run all tests and linters
4. Submit a PR with a clear description
5. Wait for CI to pass
6. Request review

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include environment details
- Attach screenshots if applicable

## Architecture Decisions

See `docs/ADR/` for architecture decision records. If you're making a significant architectural change, please create an ADR first.
