# أوامر توليد Backend (Backend Prompts) - NQP

## 1. إنشاء تطبيق Django جديد
**الأمر**: `/backend create app <app_name>`

**المخرجات**: مجلد التطبيق في `backend/apps/<app_name>/` مع الملفات الأساسية.

**مثال**:
```
/backend create app airport_health
```

## 2. إنشاء نموذج Django
**الأمر**: `/backend create model <model_name> fields:<field1:type,field2:type>`

**مثال**:
```
/backend create model AirportTerminal fields:port_id:fk:Port,terminal_code:str,name_ar:str,name_en:str,capacity:int
```

## 3. إنشاء Serializer
**الأمر**: `/backend create serializer <model_name>`

**مثال**:
```
/backend create serializer AirportTerminal
```

## 4. إنشاء ViewSet
**الأمر**: `/backend create viewset <model_name>`

**مثال**:
```
/backend create viewset AirportTerminal
```

## 5. إنشاء Service
**الأمر**: `/backend create service <service_name>`

**مثال**:
```
/backend create service AirportScreeningService
```

## 6. إنشاء Celery Task
**الأمر**: `/backend create task <task_name>`

**مثال**:
```
/backend create task process_airport_manifest
```

## 7. إنشاء نموذج Admin
**الأمر**: `/backend create admin <model_name>`

**مثال**:
```
/backend create admin AirportTerminal
```

## 8. إنشاء URL
**الأمر**: `/backend create url <app_name> <path>`

**مثال**:
```
/backend create url airport /airport/
```

## 9. إنشاء Permission
**الأمر**: `/backend create permission <permission_name> resource:<resource> action:<action>`

**مثال**:
```
/backend create permission CAN_PERFORM_AIRPORT_SCREENING resource:AIRPORT action:SCREEN
```
