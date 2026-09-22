# أوامر توليد النشر (Deployment Prompts) - NQP

## 1. إنشاء Dockerfile
**الأمر**: `/deployment create dockerfile <service>`

**مثال**:
```
/deployment create dockerfile backend
```

## 2. إنشاء docker-compose
**الأمر**: `/deployment create compose <services>`

**مثال**:
```
/deployment create compose backend,frontend,postgres,redis
```

## 3. إنشاء Kubernetes Deployment
**الأمر**: `/deployment create k8s <service>`

**مثال**:
```
/deployment create k8s backend
```

## 4. إنشاء GitHub Actions Workflow
**الأمر**: `/deployment create workflow <name>`

**مثال**:
```
/deployment create workflow ci-cd
```

## 5. إنشاء Nginx Config
**الأمر**: `/deployment create nginx <domain>`

**مثال**:
```
/deployment create nginx nqp.gov.sd
```

## 6. إنشاء SSL Certificate
**الأمر**: `/deployment create ssl <domain>`

**مثال**:
```
/deployment create ssl nqp.gov.sd
```

## 7. إنشاء Backup Script
**الأمر**: `/deployment create backup <service>`

**مثال**:
```
/deployment create backup postgres
```
