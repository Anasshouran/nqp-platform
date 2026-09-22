
---

### 📄 2. `Unit_Testing.md` (اختبارات الوحدة)

```markdown
# اختبارات الوحدة (Unit Testing) - NQP

## 1. الهدف
اختبار المكونات الفردية (النماذج، الخدمات، الدوال، المكونات) في عزلة عن باقي النظام، للتأكد من أنها تعمل كما هو متوقع، ولتوفير شبكة أمان للمطورين أثناء إعادة الهيكلة (Refactoring).

## 2. متطلبات الاختبار
- **التغطية**: 80% على الأقل للوحدات الجديدة.
- **السرعة**: يجب ألا تتجاوز مدة تشغيل جميع اختبارات الوحدة 5 دقائق.
- **العزلة**: يجب أن تكون الاختبارات مستقلة عن بعضها البعض (لا تعتمد على حالة اختبار آخر).
- **التسمية**: استخدام أسماء وصفية للاختبارات (مثل: `test_calculate_risk_score_high_fever`).

---

## 3. اختبارات Backend (Django + pytest)

### 3.1. هيكل الاختبارات
```text
backend/
├── apps/
│   ├── travelers/
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_serializers.py
│   │   │   ├── test_services.py
│   │   │   └── test_views.py
│   │   └── ...
│   ├── risk_engine/
│   │   ├── tests/
│   │   │   ├── test_risk_calculator.py
│   │   │   └── ...
│   └── ...
└── pytest.ini

3.
أدوات الاختبار
المستوى	الأداة (Backend)	الأداة (Frontend)	البيئة
اختبار الوحدة	pytest + pytest-django	Vitest + React Testing Library	Development
اختبار التكامل	pytest-django (Test Client)	Vitest + React Testing Library	Development / Staging
اختبار API	Django REST Framework Test Client	-	Staging
اختبار End-to-End	-	Cypress / Playwright	Staging
اختبار الأداء	Locust / k6	Locust / k6	Staging
اختبار الأمان	OWASP ZAP / Bandit	OWASP ZAP / ESLint Security	Staging
اختبار التوافق	-	BrowserStack / LambdaTest	Staging
اختبار قابلية الوصول	-	axe-core / WAVE	Development
4. مراحل الاختبار في دورة التطوير
المرحلة	النشاط	المسؤول	المخرجات
التطوير	اختبار الوحدة (Unit Testing)	المطور	تغطية كود > 80%
قبل الدمج (Pre-merge)	اختبار التكامل السريع (CI)	المطور + CI/CD	تمرير جميع الاختبارات
بيئة الاختبار (Staging)	اختبار التكامل الكامل، اختبار الأداء	فريق QA	تقرير الاختبارات
ما قبل الإطلاق (Pre-release)	اختبار قبول المستخدم (UAT)	المستخدمون النهائيون + QA	موافقة على الإطلاق
بعد الإطلاق (Post-release)	مراقبة الأداء والأخطاء (Monitoring)	فريق العمليات	تقارير الأداء
5. معايير القبول (Acceptance Criteria)

    تغطية الكود: لا تقل عن 80% للوحدات الأساسية، و 90% للمنطق الحرج (تقييم المخاطر، المتابعة الصحية).

    زمن استجابة API: لا يتجاوز 200ms للعمليات العادية، و 500ms لعمليات التقييم.

    الأخطاء (Bugs): عدم وجود أخطاء حرجة (Critical) أو خطيرة (Major) عند الإطلاق.

    التوافق: دعم أحدث إصدارين من (Chrome, Firefox, Safari, Edge).

    الأمان: اجتياز اختبارات OWASP Top 10.

6. بيئة الاختبار

    قاعدة بيانات: PostgreSQL منفصلة للاختبار (تُحذف وتُعاد إنشاؤها لكل اختبار).

    Redis: تشغيل Redis في الخلفية (Docker) لاختبار Celery.

    Mock Services: استخدام (WireMock) لمحاكاة خدمات وزارة الصحة والجمارك و WHO.

    CI/CD: تشغيل الاختبارات تلقائياً في GitHub Actions لكل Pull Request.

7. جدول اختبارات UAT
اليوم	السيناريوهات المغطاة	المسؤول
اليوم 1	التسجيل المسبق، الفحص الصحي (بوابة 2، 4)	موظفو الحجر + مسافرون
اليوم 2	العيادات، المختبرات (بوابة 5، 6)	أطباء + فنيو مختبر
اليوم 3	المتابعة المنزلية، الشهادات (تطبيق الجوال)	مرضى
اليوم 4	الطوارئ، التقارير (بوابة 9، 8)	إدارة + EOC
text


---

### 📄 2. `Unit_Testing.md` (اختبارات الوحدة)

```markdown
# اختبارات الوحدة (Unit Testing) - NQP

## 1. الهدف
اختبار المكونات الفردية (النماذج، الخدمات، الدوال، المكونات) في عزلة عن باقي النظام، للتأكد من أنها تعمل كما هو متوقع، ولتوفير شبكة أمان للمطورين أثناء إعادة الهيكلة (Refactoring).

## 2. متطلبات الاختبار
- **التغطية**: 80% على الأقل للوحدات الجديدة.
- **السرعة**: يجب ألا تتجاوز مدة تشغيل جميع اختبارات الوحدة 5 دقائق.
- **العزلة**: يجب أن تكون الاختبارات مستقلة عن بعضها البعض (لا تعتمد على حالة اختبار آخر).
- **التسمية**: استخدام أسماء وصفية للاختبارات (مثل: `test_calculate_risk_score_high_fever`).

---

## 3. اختبارات Backend (Django + pytest)

### 3.1. هيكل الاختبارات
```text
backend/
├── apps/
│   ├── travelers/
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   ├── test_serializers.py
│   │   │   ├── test_services.py
│   │   │   └── test_views.py
│   │   └── ...
│   ├── risk_engine/
│   │   ├── tests/
│   │   │   ├── test_risk_calculator.py
│   │   │   └── ...
│   └── ...
└── pytest.ini

3.2. مثال: اختبار نموذج (Model Test)
python

# apps/travelers/tests/test_models.py
import pytest
from django.db import IntegrityError
from apps.travelers.models import Traveler

@pytest.mark.django_db
def test_create_traveler():
    traveler = Traveler.objects.create(
        passport_number="A1234567",
        first_name="محمد",
        last_name="أحمد",
        date_of_birth="1990-05-15"
    )
    assert traveler.full_name == "محمد أحمد"
    assert str(traveler) == "محمد أحمد (A1234567)"

@pytest.mark.django_db
def test_unique_passport_number():
    Traveler.objects.create(passport_number="A1234567", first_name="محمد", last_name="أحمد")
    with pytest.raises(IntegrityError):
        Traveler.objects.create(passport_number="A1234567", first_name="علي", last_name="حسن")

3.3. مثال: اختبار خدمة (Service Test)
python

# apps/risk_engine/tests/test_risk_calculator.py
import pytest
from apps.risk_engine.services import RiskCalculator

@pytest.mark.django_db
def test_risk_calculation_high_fever():
    calculator = RiskCalculator()
    result = calculator.calculate(
        temperature=39.5,
        oxygen_saturation=95,
        symptoms=["cough", "fever"],
        origin_risk="RED",
        is_vaccinated=False,
        chronic_diseases=[]
    )
    assert result['level'] == 'RED'
    assert result['score'] > 30

@pytest.mark.django_db
def test_risk_calculation_low_risk():
    calculator = RiskCalculator()
    result = calculator.calculate(
        temperature=36.5,
        oxygen_saturation=98,
        symptoms=[],
        origin_risk="GREEN",
        is_vaccinated=True,
        chronic_diseases=[]
    )
    assert result['level'] == 'GREEN'
    assert result['score'] < 15

3.4. مثال: اختبار Serializer
python

# apps/travelers/tests/test_serializers.py
import pytest
from apps.travelers.serializers import TravelerSerializer

@pytest.mark.django_db
def test_traveler_serializer_valid():
    data = {
        'passport_number': 'A1234567',
        'first_name': 'محمد',
        'last_name': 'أحمد',
        'date_of_birth': '1990-05-15'
    }
    serializer = TravelerSerializer(data=data)
    assert serializer.is_valid()
    assert serializer.validated_data['first_name'] == 'محمد'

@pytest.mark.django_db
def test_traveler_serializer_invalid():
    data = {
        'passport_number': '123',  # غير صحيح
        'first_name': 'محمد',
        'last_name': 'أحمد'
    }
    serializer = TravelerSerializer(data=data)
    assert not serializer.is_valid()
    assert 'passport_number' in serializer.errors

4. اختبارات Frontend (React + Vitest + React Testing Library)
4.1. هيكل الاختبارات
text

frontend/src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   └── LoginForm.test.tsx
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── utils/
    ├── validators.ts
    └── validators.test.ts

4.2. مثال: اختبار مكون (Component Test)
tsx

// frontend/src/components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  test('renders button with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disables button when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});

4.3. مثال: اختبار نموذج (Form Test)
tsx

// frontend/src/components/forms/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  test('shows error when email is empty', async () => {
    render(<LoginForm onSubmit={() => {}} />);
    const submitButton = screen.getByText(/تسجيل الدخول/i);
    fireEvent.click(submitButton);
    expect(await screen.findByText(/يرجى إدخال البريد الإلكتروني/i)).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByPlaceholderText(/البريد الإلكتروني/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/كلمة المرور/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByText(/تسجيل الدخول/i));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
    });
  });
});

4.4. مثال: اختبار Hook (Custom Hook)
tsx

// frontend/src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from '../contexts/AuthContext';

describe('useAuth', () => {
  test('returns initial state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('login sets user state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toHaveProperty('email', 'test@example.com');
  });
});

5. تشغيل الاختبارات
5.1. Backend (pytest)
bash

# تشغيل جميع الاختبارات
pytest

# تشغيل اختبارات تطبيق معين
pytest apps/travelers/

# تشغيل اختبار معين
pytest apps/travelers/tests/test_models.py

# تشغيل مع تقرير التغطية
pytest --cov=apps --cov-report=html

5.2. Frontend (Vitest)
bash

# تشغيل جميع الاختبارات
npm run test

# تشغيل في وضع المراقبة (Watch)
npm run test -- --watch

# تشغيل مع تقرير التغطية
npm run test -- --coveragea

6. أفضل الممارسات

    AAA Pattern: Arrange, Act, Assert (ترتيب، تنفيذ، تأكيد).

    Fixtures: استخدام (pytest fixtures) لإنشاء بيانات الاختبار مسبقاً.

    Mocking: استخدام (unittest.mock) و (vi.fn()) لمحاكاة الدوال والخدمات الخارجية.

    التنظيف: تنظيف قاعدة البيانات بعد كل اختبار (pytest-django يوفر ذلك تلقائياً).

    الوصف: كتابة وصف واضح لكل اختبار باستخدام (docstring).