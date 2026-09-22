# مجلد النشر (Deploy) - NQP

## 1. الهدف
يحتوي هذا المجلد على جميع ملفات النشر والتوزيع اللازمة لتشغيل منصة NQP في بيئات مختلفة (التطوير، الاختبار، الإنتاج).

## 2. هيكل المجلدات

```text
deploy/
├── README.md                    # هذا الملف
├── docker-compose.yml           # تشغيل جميع الخدمات (Development/Staging)
├── docker-compose.db.yml        # تشغيل قاعدة البيانات فقط
├── nginx/
│   └── nginx.conf               # تكوين Nginx
├── ssl/
│   ├── fullchain.pem            # شهادة SSL (الإنتاج)
│   ├── privkey.pem              # المفتاح الخاص (الإنتاج)
│   └── README.md                # إرشادات SSL
├── init-scripts/
│   └── 01-init-db.sql           # تهيئة قاعدة البيانات
└── k8s/                         # Kubernetes (الإنتاج)
    ├── namespace.yaml
    ├── secrets.yaml
    ├── persistent-volume-claims.yaml
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    ├── postgres-statefulset.yaml
    ├── postgres-service.yaml
    ├── redis-deployment.yaml
    ├── redis-service.yaml
    ├── minio-deployment.yaml
    ├── minio-service.yaml
    ├── celery-deployment.yaml
    ├── celery-beat-deployment.yaml
    ├── ingress.yaml
    └── create-tls-secret.sh


3. بيئات التشغيل
البيئة	الأداة	الملفات
التطوير (Development)	Docker Compose	docker-compose.yml
الاختبار (Staging)	Docker Compose / Kubernetes	docker-compose.yml / k8s/
الإنتاج (Production)	Kubernetes	k8s/
4. بدء التشغيل
4.1. التطوير (Docker Compose)
bash

# تشغيل جميع الخدمات
docker-compose -f deploy/docker-compose.yml up -d

# تشغيل قاعدة البيانات فقط
docker-compose -f deploy/docker-compose.db.yml up -d

# إيقاف الخدمات
docker-compose -f deploy/docker-compose.yml down

# عرض السجلات
docker-compose -f deploy/docker-compose.yml logs -f

4.2. الإنتاج (Kubernetes)
bash

# إنشاء Namespace
kubectl apply -f deploy/k8s/namespace.yaml

# إنشاء Secrets
kubectl apply -f deploy/k8s/secrets.yaml

# نشر الخدمات
kubectl apply -f deploy/k8s/

# إنشاء Secret شهادة TLS قبل Ingress
./deploy/k8s/create-tls-secret.sh

# مراقبة النشر
kubectl get pods -n nqp -w

# عرض السجلات
kubectl logs -f deployment/backend-deployment -n nqp

5. متغيرات البيئة

    قم بإنشاء ملف .env في جذر المشروع لتخصيص المتغيرات.

    انظر ملف .env.example للحصول على قائمة المتغيرات المطلوبة.

6. مراجع

    Docker Compose: https://docs.docker.com/compose/

    Kubernetes: https://kubernetes.io/docs/

    Nginx: https://nginx.org/en/docs/

    Let's Encrypt: https://letsencrypt.org/