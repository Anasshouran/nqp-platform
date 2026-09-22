
---

### 📄 4. `Backend_Architecture.md` (عمارة Django)

```markdown
# عمارة الخادم الخلفي (Backend Architecture - Django)

## 1. الإطار المستخدم
- **Django** (الإصدار 4.2 LTS) مع **Django REST Framework (DRF)**.
- **التقنيات الداعمة**: Celery (مهام خلفية)، Redis (تخزين مؤقت وطابور)، PostgreSQL (قاعدة بيانات).

## 2. طبقات التطبيق (Layers)

| الطبقة | المسؤولية | المثال |
| :--- | :--- | :--- |
| **النماذج (Models)** | تعريف جداول قاعدة البيانات. | `class Traveler(models.Model)` |
| **الـ Viewsets** | استقبال طلبات HTTP. | `class TravelerViewSet(viewsets.ModelViewSet)` |
| **Serializers** | تحويل البيانات والتحقق من صحتها. | `class TravelerSerializer(serializers.ModelSerializer)` |
| **Permissions** | التحقق من الصلاحيات (RBAC). | `class IsPortOfficer(permissions.BasePermission)` |
| **Services** | منطق الأعمال المعقد. | `class RiskCalculatorService` |

## 3. إدارة المصادقة والصلاحيات
- **JWT**: باستخدام `djangorestframework-simplejwt`.
- **نقاط النهاية**:
  - `/api/v1/auth/token/` (POST) - الحصول على JWT.
  - `/api/v1/auth/token/refresh/` (POST) - تحديث JWT.
  - `/api/v1/auth/token/verify/` (POST) - التحقق من JWT.

## 4. المهام غير المتزامنة (Celery)
```python
# apps/integration/tasks.py
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def process_manifest(self, manifest_id):
    try:
        # منطق المعالجة
        return {'status': 'success'}
    except Exception as e:
        raise self.retry(exc=e, countdown=60)


5. التخزين المؤقت (Redis)
from django.core.cache import cache
cache.set('country_risks', data, timeout=3600)
risk_data = cache.get('country_risks')