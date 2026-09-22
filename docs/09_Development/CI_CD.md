
---

### 📄 8. `CI_CD.md` (GitHub Actions)

```markdown
# CI/CD Pipeline (GitHub Actions)

## 1. اختبار Backend (Django)
```yaml
test-backend:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with: { python-version: '3.13' }
    - run: pip install -r requirements/dev.txt
    - run: flake8 apps/
    - run: pytest --cov=apps/

2. اختبار Frontend (React + Vitest)
test-frontend:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - run: npm ci
    - run: npm run lint
    - run: npm run test
    - run: npm run build

3. بناء ودفع الصور
build-and-push:
  needs: [test-backend, test-frontend]
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: docker/login-action@v3
      with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
    - uses: docker/build-push-action@v5
      with: { context: ./backend, push: true, tags: ghcr.io/nqp/backend:latest }
    - uses: docker/build-push-action@v5
      with: { context: ./frontend, push: true, tags: ghcr.io/nqp/frontend:latest }


4. النشر (Kubernetes)
deploy:
  needs: build-and-push
  steps:
    - run: kubectl set image deployment/backend backend=ghcr.io/nqp/backend:latest
    - run: kubectl rollout status deployment/backend


---

## ✅ ملخص التقنيات الجديدة

| الطبقة | التقنية | الإصدار |
| :--- | :--- | :--- |
| **Backend** | Python, Django, DRF | 3.13+, 4.2+ |
| **Frontend** | React, TypeScript, Vite | 19, 5.x |
| **قاعدة البيانات** | PostgreSQL | 16 |
| **التخزين المؤقت** | Redis | 7 |
| **المهام الخلفية** | Celery | 5.x |
| **مصادقة** | JWT (Simple JWT) | - |
| **تخزين الملفات** | MinIO / S3 | - |
| **خادم الويب** | Nginx | - |
| **خادم التطبيقات** | Gunicorn | - |
| **حاويات** | Docker | - |
| **إدارة الحالة** | Redux Toolkit | - |
| **النماذج** | React Hook Form + Zod | - |
| **UI** | Material UI + Tailwind CSS | - |
| **جداول** | AG Grid | - |
| **رسوم بيانية** | Recharts | - |
| **إشعارات** | React Toastify | - |
| **PWA** | Vite PWA Plugin | - |
| **اختبار** | Vitest + React Testing Library | - |

---

**هل ترغب في تحديث أي ملف آخر (مثل `Technology_Stack.md` في `02_Architecture` أو `PROJECT_TREE.md`) ليتوافق مع هذه التقنيات الجديدة؟** أخبرني.