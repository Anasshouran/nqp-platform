# أوامر توليد واجهات API (API Prompts) - NQP

## 1. إنشاء نقطة نهاية API جديدة
**الأمر**: `/api create endpoint <path> method:<method>`

**مثال**:
```
/api create endpoint /airport/screenings method:POST
```

## 2. إنشاء Serializer
**الأمر**: `/api create serializer <model_name>`

**مثال**:
```
/api create serializer AirportScreening
```

## 3. إنشاء Filter
**الأمر**: `/api create filter <model_name>`

**مثال**:
```
/api create filter AirportScreening
```

## 4. إنشاء Permission
**الأمر**: `/api create permission <permission_name>`

**مثال**:
```
/api create permission IsAirportHealthOfficer
```

## 5. إنشاء Documentation (OpenAPI)
**الأمر**: `/api create docs <app_name>`

**مثال**:
```
/api create docs airport
```

## 6. إنشاء API Test
**الأمر**: `/api create test <endpoint_name>`

**مثال**:
```
/api create test airport_screening
```

## 7. إنشاء Throttle
**الأمر**: `/api create throttle <throttle_name>`

**مثال**:
```
/api create throttle AirportScreeningThrottle
```
