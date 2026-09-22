
---

### 📄 4. `Kubernetes.md` (تنسيق الحاويات)

```markdown
# تنسيق الحاويات (Kubernetes) - NQP

## 1. نظرة عامة
يتم استخدام **Kubernetes (K8s)** لتنسيق وإدارة جميع الخدمات في بيئة الإنتاج وبيئة الاختبار (Staging). يوفر Kubernetes ميزات (التوسع التلقائي، الاسترداد الذاتي، التحديثات المتداولة، وإدارة الأسرار).

## 2. هيكل مجلد Kubernetes
```text
deploy/k8s/
├── namespace.yaml
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-deployment.yaml
├── frontend-service.yaml
├── postgres-statefulset.yaml
├── postgres-service.yaml
├── redis-deployment.yaml
├── redis-service.yaml
├── celery-deployment.yaml
├── nginx-ingress.yaml
└── secrets.yaml

3. ملفات النشر (Deployments)
3.1. Backend Deployment (backend-deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: nqp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/nqp/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
        env:
        - name: DJANGO_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        - name: REDIS_HOST
          value: "redis-service"
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-name
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-password
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: secret-key
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1000m"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /api/v1/health/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5

3.2. Frontend Deployment (frontend-deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
  namespace: nqp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  strategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ghcr.io/nqp/frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10

3.3. Celery Deployment (celery-deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-deployment
  namespace: nqp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: celery
  template:
    metadata:
      labels:
        app: celery
    spec:
      containers:
      - name: celery
        image: ghcr.io/nqp/backend:latest
        command: ["celery", "-A", "nqp_backend", "worker", "--loglevel=info"]
        env:
        - name: DB_HOST
          value: "postgres-service"
        - name: REDIS_HOST
          value: "redis-service"
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-name
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-password
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "1000m"
            memory: "2Gi"

4. الخدمات (Services)
4.1. Backend Service
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: nqp
spec:
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP


4.2. PostgreSQL StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-statefulset
  namespace: nqp
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-password
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: nqp-secrets
              key: db-name
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi

5. Ingress (Nginx Ingress)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nqp-ingress
  namespace: nqp
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - nqp.gov.sd
    secretName: nqp-tls
  rules:
  - host: nqp.gov.sd
    http:
      paths:
      - path: /api/
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80

6. إدارة الأسرار (Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: nqp-secrets
  namespace: nqp
type: Opaque
data:
  db-name: <base64-encoded>
  db-user: <base64-encoded>
  db-password: <base64-encoded>
  secret-key: <base64-encoded>

7. التوسع التلقائي (Auto-scaling)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: nqp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

8. مراجع

    Kubernetes Documentation: https://kubernetes.io/docs/

    Nginx Ingress: https://kubernetes.github.io/ingress-nginx/