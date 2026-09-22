
---

### 📄 7. `Deployment.md` (النشر)

```markdown
# استراتيجية النشر (Deployment Strategy)

## 1. بيئات النشر
| البيئة | الرابط | طريقة النشر |
| :--- | :--- | :--- |
| **التطوير** | `dev.nqp.gov.sd` | Docker Compose محلي |
| **الاختبار** | `staging.nqp.gov.sd` | Kubernetes (K8s) |
| **الإنتاج** | `nqp.gov.sd` | Kubernetes + Load Balancer |

## 2. إعدادات Django للإنتاج
```python
DEBUG = False
ALLOWED_HOSTS = ['api.nqp.gov.sd']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

3. Nginx (Reverse Proxy)
upstream django {
    server backend:8000;
}

upstream react {
    server frontend:80;
}

server {
    listen 443 ssl;
    server_name nqp.gov.sd;

    location /static/ { alias /app/backend/staticfiles/; }
    location /media/ { alias /app/backend/media/; }

    location /api/ { proxy_pass http://django; }
    location /admin/ { proxy_pass http://django; }
    location / { proxy_pass http://react; }
}