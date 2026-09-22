# Airport_API - واجهات نظام صحة المطارات

## 1. نظرة عامة
تدير هذه الواجهات جميع عمليات نظام صحة المطارات، بما في ذلك إدارة المطارات، الرحلات، شركات الطيران، فحص المسافرين، إدارة الطاقم، تفتيش الطائرات، العزل والحجر الصحي، الطوارئ الصحية، الترصد الوبائي، وتتبع المخالطين.

## 2. المسارات (Endpoints)

### 2.1. إدارة المطارات (Airport Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/airports/` | قائمة المطارات | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/airports/` | إضافة مطار جديد | ADMIN |
| `GET` | `/api/v1/airport/airports/{id}/` | تفاصيل مطار | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/airports/{id}/` | تحديث مطار | ADMIN |

### 2.2. إدارة الرحلات (Flight Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/flights/` | قائمة الرحلات | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/flights/` | إضافة رحلة جديدة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/{id}/` | تفاصيل رحلة | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/flights/{id}/` | تحديث رحلة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/arriving/` | الرحلات القادمة | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/flights/departing/` | الرحلات المغادرة | AIRPORT_OPERATOR |

### 2.3. إدارة شركات الطيران (Airline Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/airlines/` | قائمة شركات الطيران | AIRPORT_OPERATOR |
| `POST` | `/api/v1/airport/airlines/` | إضافة شركة طيران جديدة | ADMIN |
| `GET` | `/api/v1/airport/airlines/{id}/` | تفاصيل شركة طيران | AIRPORT_OPERATOR |
| `PUT` | `/api/v1/airport/airlines/{id}/` | تحديث شركة طيران | ADMIN |

### 2.4. فحص المسافرين (Passenger Screening)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/screenings/` | تسجيل فحص جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/{id}/` | تفاصيل فحص | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/screenings/flight/{flight_id}/` | فحوصات رحلة | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/screenings/{id}/status/` | تحديث حالة الفحص | AIRPORT_HEALTH_OFFICER |

### 2.5. إدارة صحة الطاقم (Crew Health)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/crew/` | قائمة الطاقم | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/crew/` | تسجيل طاقم جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/crew/{id}/` | تفاصيل طاقم | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/crew/{id}/health/` | تحديث الحالة الصحية | AIRPORT_HEALTH_OFFICER |

### 2.6. الإقرار الصحي (Health Declaration)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/declarations/` | تسجيل إقرار صحي | TRAVELER |
| `GET` | `/api/v1/airport/declarations/{id}/` | تفاصيل إقرار | TRAVELER (نفسه) |
| `GET` | `/api/v1/airport/declarations/flight/{flight_id}/` | إقرارات رحلة | AIRPORT_HEALTH_OFFICER |

### 2.7. التحقق من التطعيمات (Vaccination Verification)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/vaccinations/verify/{traveler_id}/` | التحقق من تطعيمات مسافر | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/vaccinations/required/{country}/` | التطعيمات المطلوبة لدولة | AIRPORT_HEALTH_OFFICER |

### 2.8. تفتيش الطائرات (Aircraft Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/inspections/` | تسجيل تفتيش جديد | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/` | قائمة عمليات التفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/{id}/` | تفاصيل تفتيش | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/inspections/aircraft/{registration}/` | تفتيشات طائرة | HEALTH_INSPECTOR |

### 2.9. العزل والحجر الصحي (Quarantine & Isolation)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/quarantine/` | بدء عزل جديد | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/active/` | حالات العزل النشطة | AIRPORT_HEALTH_OFFICER |
| `GET` | `/api/v1/airport/quarantine/{id}/` | تفاصيل عزل | AIRPORT_HEALTH_OFFICER |
| `PATCH` | `/api/v1/airport/quarantine/{id}/status/` | تحديث حالة العزل | AIRPORT_HEALTH_OFFICER |
| `POST` | `/api/v1/airport/quarantine/{id}/end/` | إنهاء العزل | AIRPORT_HEALTH_OFFICER |

### 2.10. الإحالة الطبية (Medical Referral)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/referrals/` | إنشاء إحالة طبية | DOCTOR |
| `GET` | `/api/v1/airport/referrals/` | قائمة الإحالات | DOCTOR |
| `GET` | `/api/v1/airport/referrals/{id}/` | تفاصيل إحالة | DOCTOR |
| `PATCH` | `/api/v1/airport/referrals/{id}/status/` | تحديث حالة الإحالة | DOCTOR |

### 2.11. الطوارئ الصحية (Emergency Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/emergency/` | تسجيل بلاغ طارئ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `GET` | `/api/v1/airport/emergency/active/` | البلاغات النشطة | AIRPORT_OPERATOR, EOC_OPERATOR |
| `PATCH` | `/api/v1/airport/emergency/{id}/status/` | تحديث حالة البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |
| `POST` | `/api/v1/airport/emergency/{id}/resolve/` | حل البلاغ | AIRPORT_OPERATOR, EOC_OPERATOR |

### 2.12. تتبع المخالطين (Contact Tracing)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/tracing/{case_id}/` | تتبع مخالطي حالة | EOC_OPERATOR |
| `GET` | `/api/v1/airport/tracing/flight/{flight_id}/` | مخالطي رحلة | EOC_OPERATOR |
| `POST` | `/api/v1/airport/tracing/notify/` | إرسال تنبيهات للمخالطين | EOC_OPERATOR |

### 2.13. إدارة الشهادات (Certificate Management)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/certificates/traveler/{traveler_id}/` | شهادات مسافر | TRAVELER (نفسه) |
| `POST` | `/api/v1/airport/certificates/aircraft/` | إصدار شهادة إفراج للطائرة | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/certificates/verify/{hash}/` | التحقق من شهادة | PUBLIC |

### 2.14. التفتيش على الأغذية والتموين (Food & Catering Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/food-inspections/` | تسجيل تفتيش غذائي | FOOD_INSPECTOR |
| `GET` | `/api/v1/airport/food-inspections/flight/{flight_id}/` | تفتيشات رحلة | FOOD_INSPECTOR |

### 2.15. تفتيش جودة المياه (Water Quality Inspection)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/water-inspections/` | تسجيل تفتيش مياه | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/water-inspections/flight/{flight_id}/` | تفتيشات رحلة | HEALTH_INSPECTOR |

### 2.16. مكافحة النواقل (Vector Surveillance)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/vector-surveillance/` | تسجيل مراقبة نواقل | HEALTH_INSPECTOR |
| `GET` | `/api/v1/airport/vector-surveillance/` | قائمة المراقبات | HEALTH_INSPECTOR |

### 2.17. التقارير ولوحات المعلومات (Reporting & Dashboard)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/airport/dashboard/stats/` | إحصائيات المطار | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/flights/` | إحصائيات الرحلات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/cases/` | إحصائيات الحالات | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/dashboard/inspections/` | إحصائيات التفتيش | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/reports/export/` | تصدير التقارير | AIRPORT_OPERATOR |

### 2.18. مركز الإشعارات (Notification Center)
| الطريقة | المسار | الوصف | الصلاحية |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/airport/notifications/` | إرسال إشعار | AIRPORT_OPERATOR |
| `GET` | `/api/v1/airport/notifications/history/` | سجل الإشعارات | AIRPORT_OPERATOR |

## 3. نماذج الطلبات والاستجابات

### 3.1. تسجيل فحص مسافر (Request)
```json
{
  "traveler_id": "uuid",
  "flight_id": "uuid",
  "temperature": 38.5,
  "symptoms": ["cough", "fever"],
  "risk_level": "MEDIUM",
  "decision": "QUARANTINED",
  "notes": "المسافر يبدو عليه التعب"
}
```

### 3.2. استجابة العزل (Response)
```json
{
  "status": "success",
  "data": {
    "quarantine_id": "uuid",
    "traveler_name": "محمد أحمد",
    "start_date": "2024-08-01",
    "expected_end_date": "2024-08-08",
    "location": "غرفة العزل رقم 3",
    "status": "ACTIVE"
  }
}
```

### 3.3. تسجيل تفتيش طائرة (Request)
```json
{
  "flight_id": "uuid",
  "inspection_date": "2024-08-01",
  "inspector": "أحمد محمد",
  "inspection_type": "HEALTH",
  "cabin_condition": "PASSED",
  "toilets_condition": "PASSED",
  "water_tanks_condition": "PASSED",
  "ventilation_condition": "PASSED",
  "pest_control": "PASSED",
  "result": "PASSED",
  "decision": "CLEARED",
  "notes": "جميع الإجراءات مطابقة للمعايير"
}
```

## 4. رموز الاستجابة (Status Codes)
| الكود | الوصف |
| :--- | :--- | :--- |
| `200 OK` | نجاح العملية |
| `201 Created` | تم إنشاء المورد بنجاح |
| `400 Bad Request` | طلب غير صحيح |
| `401 Unauthorized` | غير مصرح |
| `403 Forbidden` | ممنوع (صلاحية غير كافية) |
| `404 Not Found` | المورد غير موجود |
| `409 Conflict` | تعارض (مورد مكرر) |
| `500 Internal Server Error` | خطأ في الخادم |
