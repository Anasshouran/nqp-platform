
---

### 📄 3. `Integration_Testing.md` (اختبارات التكامل)

```markdown
# اختبارات التكامل (Integration Testing) - NQP

## 1. الهدف
اختبار كيفية تفاعل المكونات المختلفة للنظام مع بعضها البعض (API Gateway ← الخدمات ← قاعدة البيانات) ومع الأنظمة الخارجية الوهمية (Mocked External Services)، للتأكد من أن التكامل بينها يعمل بشكل صحيح.

## 2. أنواع اختبارات التكامل

| النوع | الوصف | أداة الاختبار |
| :--- | :--- | :--- |
| **اختبار API** | اختبار نقاط النهاية (Endpoints) بالكامل مع قاعدة بيانات حقيقية (اختبارية). | Django Test Client + pytest |
| **اختبار التكامل الخارجي** | اختبار التكامل مع الأنظمة الخارجية (الجمارك، وزارة الصحة) باستخدام Mock Servers. | WireMock / pytest-mock |
| **اختبار قاعدة البيانات** | اختبار استعلامات قاعدة البيانات المعقدة والترحيلات (Migrations). | pytest-django |
| **اختبار الطابور (Queue)** | اختبار مهام Celery مع Redis (Broker). | Celery Test |

---

## 3. اختبارات Backend (Django)

### 3.1. اختبار API (Django Test Client)
```python
# apps/screening/tests/test_api.py
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.travelers.models import Traveler
from apps.ports.models import Port

User = get_user_model()

@pytest.mark.django_db
def test_screening_endpoint():
    # Arrange
    client = APIClient()
    user = User.objects.create_user(email='officer@test.com', password='testpass', role='PORT_OFFICER')
    traveler = Traveler.objects.create(passport_number='A1234567', first_name='محمد', last_name='أحمد')
    port = Port.objects.create(code='KRT', name_ar='مطار الخرطوم', type='AIRPORT')
    
    client.force_authenticate(user=user)
    
    # Act
    response = client.post('/api/v1/screening/', {
        'traveler_id': str(traveler.id),
        'port_id': str(port.id),
        'body_temperature': 38.5,
        'oxygen_saturation': 95,
        'observed_symptoms': ['cough', 'fever']
    }, format='json')
    
    # Assert
    assert response.status_code == 201
    assert 'risk_assessment' in response.data['data']
    assert response.data['data']['risk_assessment']['level'] in ['GREEN', 'YELLOW', 'RED']

# apps/integration/tests/test_moh_integration.py
import pytest
from unittest.mock import patch
from apps.integration.services import send_report_to_moh

@pytest.mark.django_db
@patch('requests.post')
def test_send_report_to_moh_success(mock_post):
    # Arrange
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {'status': 'success'}
    
    # Act
    result = send_report_to_moh({'report': 'data'}, 'report-123')
    
    # Assert
    assert result['status'] == 'success'
    mock_post.assert_called_once()

@pytest.mark.django_db
@patch('requests.post')
def test_send_report_to_moh_failure(mock_post):
    # Arrange
    mock_post.return_value.status_code = 500
    mock_post.side_effect = Exception('Connection error')
    
    # Act & Assert
    with pytest.raises(Exception):
        send_report_to_moh({'report': 'data'}, 'report-123')

3.3. اختبار Celery Tasks
# apps/integration/tests/test_celery_tasks.py
import pytest
from celery import Celery
from apps.integration.tasks import process_manifest

@pytest.mark.django_db
def test_process_manifest_task():
    # Arrange
    manifest_id = '123e4567-e89b-12d3-a456-426614174000'
    
    # Act
    result = process_manifest.delay(manifest_id)
    
    # Assert
    assert result.ready() is False  # المهمة غير مكتملة بعد
    # انتظار اكتمال المهمة
    result.get(timeout=30)
    assert result.successful()

4. اختبارات Frontend (Cypress - E2E)
4.1. اختبار تدفق تسجيل الدخول
// cypress/e2e/login.cy.js
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should show error with invalid credentials', () => {
    cy.get('input[placeholder="البريد الإلكتروني"]').type('wrong@example.com');
    cy.get('input[placeholder="كلمة المرور"]').type('wrongpass');
    cy.get('button[type="submit"]').click();
    cy.contains('بيانات الدخول غير صحيحة').should('be.visible');
  });

  it('should login successfully and redirect to dashboard', () => {
    cy.get('input[placeholder="البريد الإلكتروني"]').type('admin@nqp.gov.sd');
    cy.get('input[placeholder="كلمة المرور"]').type('SecurePass123!');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('مرحباً، أحمد').should('be.visible');
  });
});


4.2. اختبار تدفق الفحص الصحي
// cypress/e2e/screening.cy.js
describe('Screening Flow', () => {
  beforeEach(() => {
    cy.login('officer@nqp.gov.sd', 'SecurePass123!');
    cy.visit('/port-health/dashboard');
  });

  it('should scan QR and perform screening', () => {
    // محاكاة مسح QR
    cy.get('[data-testid="qr-scanner"]').click();
    cy.get('[data-testid="qr-input"]').type('A1234567');
    cy.get('[data-testid="search-btn"]').click();
    
    // ظهور بيانات المسافر
    cy.contains('محمد أحمد').should('be.visible');
    
    // إدخال الفحص
    cy.get('[data-testid="temperature"]').type('38.5');
    cy.get('[data-testid="spo2"]').type('95');
    cy.get('[data-testid="symptoms"]').select(['cough', 'fever']);
    cy.get('[data-testid="submit-screening"]').click();
    
    // عرض النتيجة
    cy.contains('YELLOW').should('be.visible');
    cy.contains('إحالة للعيادة').should('be.visible');
  });
});

5. تشغيل اختبارات التكامل
5.1. Backend
# تشغيل اختبارات التكامل فقط
pytest -m integration

# تشغيل اختبارات API
pytest apps/*/tests/test_api.py

# تشغيل اختبارات Celery
pytest apps/*/tests/test_celery_tasks.py

5.2. Frontend (Cypress)
# تشغيل Cypress في الوضع التفاعلي
npx cypress open

# تشغيل Cypress في وضع الرأس (Headless)
npx cypress run

# تشغيل اختبار محدد
npx cypress run --spec cypress/e2e/login.cy.js

6. أفضل الممارسات

    استخدام Fixtures: إعداد بيانات الاختبار مسبقاً (مثل: مستخدمين، مسافرين، منافذ).

    Mocking: استخدام (unittest.mock) و (wiremock) لمحاكاة الخدمات الخارجية.

    التنظيف: تنظيف قاعدة البيانات بعد كل اختبار (pytest-django يوفر ذلك).

    الاختبارات المستقلة: يجب أن تكون الاختبارات مستقلة عن بعضها البعض.

    