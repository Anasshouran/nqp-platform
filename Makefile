.PHONY: help up down build backend frontend migrate shell test test-clean clean

help:
	@echo "Usage: make <target>"
	@echo "  up          Start all services (Docker)"
	@echo "  down        Stop all services"
	@echo "  build       Build all Docker images"
	@echo "  backend     Run backend development server"
	@echo "  frontend    Run frontend development server"
	@echo "  migrate     Run Django migrations"
	@echo "  shell       Open Django shell"
	@echo "  test        Run tests (reuse DB)"
	@echo "  test-clean  Run tests (fresh DB)"
	@echo "  clean       Remove __pycache__, node_modules, etc."

up:
	docker compose -f deploy/docker-compose.yml up

down:
	docker compose -f deploy/docker-compose.yml down

build:
	docker compose -f deploy/docker-compose.yml build

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

migrate:
	cd backend && python manage.py migrate

shell:
	cd backend && python manage.py shell

test:
	cd backend && python -m pytest apps --reuse-db

test-clean:
	cd backend && python -m pytest apps --create-db

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/node_modules
	rm -rf .pytest_cache
