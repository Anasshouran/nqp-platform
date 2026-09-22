# عمليات التطوير والبنية التحتية (DevOps) - NQP

## 1. الهدف
يوفر هذا المجلد جميع الوثائق والأدوات المتعلقة بعمليات (DevOps) لمنصة NQP، بما في ذلك (الحوسبة، التنسيق، التكامل المستمر، النشر المستمر، المراقبة، والتسجيل). تهدف هذه الممارسات إلى ضمان **الموثوقية، قابلية التوسع، الأمان، والمراقبة المستمرة** للمنصة.

## 2. هيكل المجلدات

```text
DevOps/
├── README.md                    # هذا الملف
├── Docker.md                    # أفضل ممارسات Docker
├── GitHub_Actions.md            # CI/CD باستخدام GitHub Actions
├── Kubernetes.md                # تنسيق الحاويات باستخدام Kubernetes
├── Prometheus.md                # جمع المقاييس (Metrics)
├── Grafana.md                   # لوحات المعلومات (Dashboards)
├── Monitoring.md                # استراتيجية المراقبة الشاملة
├── Logging.md                   # إدارة السجلات (Logging)
└── Uptime_Kuma.md               # مراقبة توفر الخدمات

3. الأدوات المستخدمة
الأداة	الاستخدام	الوثيقة المرجعية
Docker	حوسبة التطبيقات (Containerization)	Docker.md
Kubernetes	تنسيق الحاويات وإدارتها (Orchestration)	Kubernetes.md
GitHub Actions	التكامل والنشر المستمر (CI/CD)	GitHub_Actions.md
Prometheus	جمع المقاييس (Metrics) ومراقبة الأداء	Prometheus.md
Grafana	لوحات معلومات تفاعلية (Dashboards)	Grafana.md
ELK Stack	جمع وتحليل السجلات (Logging)	Logging.md
Uptime Kuma	مراقبة توفر الخدمات (Uptime Monitoring)	Uptime_Kuma.md


4. سير العمل (Workflow)
flowchart LR
    A[تطوير الكود] --> B[دفع إلى GitHub]
    B --> C[GitHub Actions: اختبارات CI]
    C --> D{نجاح الاختبارات؟}
    D -- لا --> A
    D -- نعم --> E[بناء صورة Docker]
    E --> F[دفع الصورة إلى Container Registry]
    F --> G[GitHub Actions: نشر (Deploy)]
    G --> H[Kubernetes: تحديث التطبيق]
    H --> I[مراقبة الأداء (Prometheus + Grafana)]
    I --> J[مراقبة السجلات (ELK Stack)]
    J --> K[مراقبة التوفر (Uptime Kuma)]


5. بيئات التشغيل
البيئة	الرابط	البنية التحتية	الغرض
التطوير (Development)	dev.nqp.gov.sd	Docker Compose (محلي)	اختبار المطورين.
الاختبار (Staging)	staging.nqp.gov.sd	Kubernetes (Cluster صغير)	اختبار قبول المستخدم (UAT).
الإنتاج (Production)	nqp.gov.sd	Kubernetes (Cluster كبير)	البيئة الحية.
6. مسؤوليات DevOps
المسؤولية	الفريق	الأدوات
إدارة البنية التحتية	فريق DevOps	Kubernetes, Docker, Nginx
CI/CD	فريق DevOps + المطورين	GitHub Actions
المراقبة	فريق العمليات	Prometheus, Grafana, Uptime Kuma
التسجيل	فريق العمليات	ELK Stack
الأمن	فريق الأمن + DevOps	Vault, Secrets Management
7. مراجع

    Docker: https://www.docker.com/

    Kubernetes: https://kubernetes.io/

    GitHub Actions: https://github.com/features/actions

    Prometheus: https://prometheus.io/

    Grafana: https://grafana.com/

    ELK Stack: https://www.elastic.co/what-is/elk-stack

    Uptime Kuma: https://uptime.kuma.pet/

3.2. مثال على سجل تدقيق
json

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "email": "doctor@nqp.gov.sd",
    "full_name": "د. أحمد محمد"
  },
  "action_type": "APPROVE_LAB_RESULT",
  "resource_type": "LabResult",
  "resource_id": "123e4567-e89b-12d3-a456-426614174002",
  "old_value": {"approval_status": "PENDING"},
  "new_value": {"approval_status": "APPROVED"},
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": "2024-07-26T10:30:00Z"
}

4. آلية التسجيل (Middleware)
python

# apps/audit/middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog
import json

class AuditMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # تسجيل فقط الطلبات التي تغير البيانات
        if request.path.startswith('/api/') and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # تجنب تسجيل طلبات تسجيل الدخول (لتجنب التكرار)
            if '/auth/' in request.path:
                return response

            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action_type=f"{request.method}_{request.path.split('/')[-2]}",
                resource_type=request.path.split('/')[-2],
                resource_id=request.path.split('/')[-1] if len(request.path.split('/')) > 3 else '',
                old_value=None,  # يمكن جلبها من قاعدة البيانات قبل التحديث
                new_value=json.loads(request.body) if request.body else None,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

5. صلاحيات الوصول إلى Audit Log
الدور	الصلاحية
Super Admin	يمكنه عرض جميع سجلات التدقيق.
Federal Admin	يمكنه عرض سجلات التدقيق الخاصة بقطاعه/منافذه.
EOC Operator	يمكنه عرض سجلات التدقيق الخاصة بعمليات الطوارئ.
المستخدمون العاديون	لا يمكنهم عرض سجلات التدقيق (ممنوع الوصول).
6. سياسة الاحتفاظ (Retention Policy)
نوع البيانات	مدة الاحتفاظ	الإجراء
سجلات التدقيق	5 سنوات	الأرشفة في (Cold Storage) بعد سنة، ثم الحذف الآمن بعد 5 سنوات.
النسخ الاحتياطي للتدقيق	5 سنوات	تخزين مشفر في موقع جغرافي مختلف.
7. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
GET	/api/v1/admin/audit-logs/	قائمة سجلات التدقيق (مع التصفية والترقيم).	Super Admin, Federal Admin
GET	/api/v1/admin/audit-logs/{id}/	تفاصيل سجل تدقيق محدد.	Super Admin, Federal Admin
GET	/api/v1/admin/audit-logs/export/	تصدير سجلات التدقيق (Excel/CSV).	Super Admin
8. مراجع

    GDPR Audit Requirements: https://gdpr-info.eu/

    HIPAA Audit Logs: https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/index.html
