
---

### 📄 3. `GitHub_Actions.md` (CI/CD باستخدام GitHub Actions)

```markdown
# CI/CD باستخدام GitHub Actions (Continuous Integration & Deployment) - NQP

## 1. نظرة عامة
يتم استخدام **GitHub Actions** لأتمتة عملية البناء والاختبار والنشر (CI/CD) بالكامل. كل عملية دفع (Push) إلى الفرع `main` أو `develop` تُشغل سير العمل (Workflow) المناسب.

## 2. هيكل ملفات GitHub Actions
```text
.github/
└── workflows/
    ├── ci-cd.yml        # سير العمل الرئيسي
    ├── test-backend.yml # اختبارات Backend فقط
    └── test-frontend.yml # اختبارات Frontend فقط

3. سير العمل الرئيسي (ci-cd.yml)
3.1. مرحلة الاختبار (Test)

يتم تشغيلها لكل عملية دفع (Push) إلى أي فرع.
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  # ========== اختبار Backend ==========
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements/dev.txt

      - name: Run Lint (Flake8)
        run: |
          cd backend
          flake8 apps/ nqp_backend/

      - name: Run Django Tests
        env:
          DJANGO_ENV: test
          DB_NAME: test_db
          DB_USER: postgres
          DB_PASSWORD: test_password
          DB_HOST: localhost
          DB_PORT: 5432
        run: |
          cd backend
          python manage.py test

  # ========== اختبار Frontend ==========
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run ESLint
        run: |
          cd frontend
          npm run lint

      - name: Run Vitest Tests
        run: |
          cd frontend
          npm run test

      - name: Build
        run: |
          cd frontend
          npm run build


3.2. مرحلة بناء ودفع الصور (Build & Push)

يتم تشغيلها فقط عند الدفع إلى فرع main أو عند إنشاء (Release).
  # ========== بناء ودفع الصور ==========
  build-and-push:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/backend:latest

      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/frontend:latest


3.3. مرحلة النشر (Deploy)

يتم تشغيلها فقط عند الدفع إلى فرع main (بيئة الإنتاج).
  # ========== النشر ==========
  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG }}" > $HOME/.kube/config

      - name: Update Kubernetes manifests
        run: |
          sed -i "s|:latest|:${{ github.sha }}|g" deploy/k8s/backend-deployment.yaml
          sed -i "s|:latest|:${{ github.sha }}|g" deploy/k8s/frontend-deployment.yaml

      - name: Apply to Kubernetes
        run: |
          kubectl apply -f deploy/k8s/
          kubectl rollout status deployment/backend-deployment -n nqp
          kubectl rollout status deployment/frontend-deployment -n nqp

      - name: Health Check
        run: |
          curl -f https://nqp.gov.sd/api/v1/health || exit 1

4. إدارة الأسرار (Secrets)
الاسم (Secret Name)	الوصف
GITHUB_TOKEN	(مقدم تلقائياً) للوصول إلى GitHub Container Registry.
KUBE_CONFIG	ملف إعداد (kubeconfig) للاتصال بكلاستر Kubernetes.
DB_PASSWORD	كلمة مرور قاعدة بيانات الإنتاج.
SECRET_KEY	مفتاح Django السري.
JWT_SECRET	مفتاح JWT السري.
5. مراجع

    GitHub Actions Documentation: https://docs.github.com/en/actions

    GitHub Container Registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

    