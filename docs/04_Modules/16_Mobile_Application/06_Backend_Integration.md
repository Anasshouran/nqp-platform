# 06_Backend_Integration - نقاط التكامل مع الـ API

## 1. المسارات الأساسية (Endpoints)

### 1.1. المصادقة (Authentication)
| المسار | الطريقة | الوصف |
| :--- | :--- | :--- |
| `/api/v1/auth/login/` | POST | تسجيل الدخول (بريد/جوال + كلمة مرور). |
| `/api/v1/auth/refresh/` | POST | تحديث Access Token. |
| `/api/v1/auth/logout/` | POST | تسجيل الخروج (إبطال Refresh Token). |
| `/api/v1/auth/change-password/` | POST | تغيير كلمة المرور. |

### 1.2. المتابعة الصحية (Health Follow-up)
| المسار | الطريقة | الوصف |
| :--- | :--- | :--- |
| `/api/v1/followup/daily-log/` | POST | إرسال الإبلاغ اليومي. |
| `/api/v1/followup/my-status/` | GET | الحصول على حالة المتابعة الحالية. |
| `/api/v1/followup/history/` | GET | تاريخ الإبلاغات السابقة. |
| `/api/v1/followup/medications/` | GET | الحصول على الأدوية الموصوفة. |
| `/api/v1/followup/medications/{id}/confirm/` | POST | تأكيد تناول الدواء. |

### 1.3. الشهادات (Certificates)
| المسار | الطريقة | الوصف |
| :--- | :--- | :--- |
| `/api/v1/certificates/my/` | GET | الحصول على شهادة التعافي (إن وجدت). |
| `/api/v1/certificates/my/download/` | GET | تنزيل الشهادة بصيغة PDF. |

### 1.4. الملف الشخصي (Profile)
| المسار | الطريقة | الوصف |
| :--- | :--- | :--- |
| `/api/v1/profile/` | GET | الحصول على بيانات الملف الشخصي. |
| `/api/v1/profile/update/` | PUT | تحديث بيانات الملف الشخصي. |

### 1.5. الطوارئ (Emergency)
| المسار | الطريقة | الوصف |
| :--- | :--- | :--- |
| `/api/v1/emergency/sos/` | POST | إرسال طلب إسعاف (مع إحداثيات GPS). |

## 2. مثال على طلب (Daily Log Submission)
```json
POST /api/v1/followup/daily-log/
{
  "temperature": 37.2,
  "oxygen_saturation": 98,
  "symptoms": ["cough", "headache"],
  "mood_score": 7,
  "notes": "أشعر بتحسن طفيف"
}


3. مثال على الاستجابة
json

{
  "status": "success",
  "data": {
    "risk_level": "GREEN",
    "message": "قراءاتك مستقرة. تابع يومك بشكل طبيعي.",
    "next_check_in": "2024-07-24T08:00:00Z"
  }
}

4. إدارة الأخطاء (Error Handling)

    401 Unauthorized: يتم تحديث الـ Token تلقائياً باستخدام Refresh Token.

    422 Unprocessable Entity: يتم عرض رسائل الخطأ من الخادم.

    500 Internal Server Error: يتم عرض رسالة "حدث خطأ ما. يرجى المحاولة لاحقاً."