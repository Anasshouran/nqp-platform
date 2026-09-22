# أوامر توليد قاعدة البيانات (Database Prompts) - NQP

## 1. إنشاء نموذج Django جديد
**الأمر**: `/database create model <model_name> fields:<field1:type,field2:type>`

**مثال**:
```
/database create model AirportTerminal fields:port_id:fk:Port,terminal_code:str,name_ar:str,name_en:str
```

## 2. إنشاء هجرة (Migration)
**الأمر**: `/database create migration <app_name> <description>`

**مثال**:
```
/database create migration airport add_aircraft_inspections
```

## 3. إنشاء فهرس (Index)
**الأمر**: `/database create index <model_name> <field_name>`

**مثال**:
```
/database create index AirportScreening traveler_id
```

## 4. إنشاء علاقة (Relationship)
**الأمر**: `/database create relationship <model1> <model2> type:<type>`

**مثال**:
```
/database create relationship AirportTerminal Port type:ForeignKey
```

## 5. إنشاء JSON Field
**الأمر**: `/database create jsonfield <model_name> <field_name>`

**مثال**:
```
/database create jsonfield AirportScreening symptoms
```

## 6. إنشاء Constraint
**الأمر**: `/database create constraint <model_name> <constraint_type>`

**مثال**:
```
/database create constraint AirportScreening CheckConstraint risk_level
```

## 7. إنشاء Query Optimized
**الأمر**: `/database create query <model_name> <method_name>`

**مثال**:
```
/database create query AirportScreening get_active_screenings
```
