
---

### 📄 6. `Docker.md` (Docker)

```markdown
# أفضل ممارسات Docker

## 1. Dockerfile لـ Backend (Django + Gunicorn)

```dockerfile
FROM python:3.13-slim AS builder

WORKDIR /app
COPY requirements/base.txt requirements/prod.txt ./
RUN pip install --no-cache-dir -r prod.txt

COPY . .
RUN python manage.py collectstatic --noinput

FROM python:3.13-slim AS production
WORKDIR /app
COPY --from=builder /app /app
RUN pip install --no-cache-dir gunicorn
RUN useradd --create-home nqp_user
USER nqp_user
EXPOSE 8000
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:8000", "nqp_backend.wsgi:application"]


2. Dockerfile لـ Frontend (React + Vite + Nginx)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

3. docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: nqp_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ../backend
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ../backend:/app

  frontend:
    build:
      context: ../frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro

volumes:
  postgres_data:
  redis_data:

  