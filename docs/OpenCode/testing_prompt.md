# أوامر توليد اختبارات (Testing Prompts) - NQP

## 1. إنشاء اختبار وحدة (Unit Test) لـ Backend
**الأمر**: `/testing create unit <app_name> <target>`

**مثال**:
```
/testing create unit airport AirportScreeningModel
```

## 2. إنشاء اختبار وحدة (Unit Test) لـ Frontend
**الأمر**: `/testing create unit <component_name>`

**مثال**:
```
/testing create unit AirportScreeningForm
```

## 3. إنشاء اختبار تكامل (Integration Test)
**الأمر**: `/testing create integration <app_name> <feature>`

**مثال**:
```
/testing create integration airport screening_flow
```

## 4. إنشاء اختبار أداء (Performance Test)
**الأمر**: `/testing create performance <endpoint_name>`

**مثال**:
```
/testing create performance /api/v1/airport/screenings/
```

## 5. إنشاء اختبار أمان (Security Test)
**الأمر**: `/testing create security <endpoint_name>`

**مثال**:
```
/testing create security /api/v1/airport/screenings/
```

## 6. إنشاء اختبار UAT (User Acceptance Test)
**الأمر**: `/testing create uat <scenario_name>`

**مثال**:
```
/testing create uat airport_screening
```

## 7. إنشاء بيانات اختبار (Fixtures)
**الأمر**: `/testing create fixture <model_name>`

**مثال**:
```
/testing create fixture AirportTerminal
```
