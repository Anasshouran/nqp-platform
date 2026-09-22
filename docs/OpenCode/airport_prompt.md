# أوامر توليد نظام صحة المطارات (Airport Health Prompts) - NQP

## 1. إنشاء نظام صحة المطارات
**الأمر**: `/airport create system`

**الوصف**: إنشاء الهيكل الكامل لنظام صحة المطارات (المجلدات، النماذج، واجهات API، الشاشات).

**المخرجات**:
- `backend/apps/airport_health/` مع جميع الملفات.
- `frontend/src/pages/AirportHealth/` مع جميع الشاشات.
- `docs/04_Modules/17_Airport_Health_System/` مع جميع الملفات.

**مثال**:
```
/airport create system
```

## 2. إنشاء نموذج صالة مطار
**الأمر**: `/airport create terminal <terminal_code>`

**مثال**:
```
/airport create terminal T1
```

## 3. إنشاء نقطة فحص
**الأمر**: `/airport create screening-point <point_code> type:<ARRIVAL|DEPARTURE|TRANSIT|CREW>`

**مثال**:
```
/airport create screening-point SP-01 type:ARRIVAL
```

## 4. تسجيل فحص مسافر
**الأمر**: `/airport create screening <traveler_id> <flight_id>`

**مثال**:
```
/airport create screening traveler-123 flight-456
```

## 5. تسجيل مسافر عابر
**الأمر**: `/airport create transit <traveler_id> <arrival_flight> <departure_flight>`

**مثال**:
```
/airport create transit traveler-123 flight-456 flight-789
```

## 6. تفعيل طوارئ في المطار
**الأمر**: `/airport create emergency <terminal_id> type:<SUSPECTED_CASE|OUTBREAK|BIOHAZARD>`

**مثال**:
```
/airport create emergency terminal-123 type:SUSPECTED_CASE
```

## 7. تتبع مخالطين
**الأمر**: `/airport create tracing <case_id>`

**مثال**:
```
/airport create tracing case-123
```

## 8. إنشاء تقرير مطار
**الأمر**: `/airport create report <period>`

**مثال**:
```
/airport create report daily
```
