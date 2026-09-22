
---

### 📄 6. `JWT.md` (JSON Web Tokens)

```markdown
# JSON Web Tokens (JWT) - NQP

## 1. نظرة عامة
يتم استخدام (JSON Web Tokens - JWT) كآلية المصادقة الرئيسية في منصة NQP. يوفر JWT حل **عديم الحالة (Stateless)** و **آمن** و **سهل التكامل** للتحقق من هوية المستخدمين والصلاحيات.

## 2. هيكل JWT
يتكون JWT من ثلاثة أجزاء مفصولة بنقاط (`.`):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
text


### 2.1. الـ Header (رأس)
```json
{
  "alg": "HS256",
  "typ": "JWT"
}

2.2. الـ Payload (الحمولة)
json

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@nqp.gov.sd",
  "role": "PORT_OFFICER",
  "port_id": "123e4567-e89b-12d3-a456-426614174001",
  "exp": 1722000000,
  "iat": 1721996400,
  "jti": "123e4567-e89b-12d3-a456-426614174002"
}

2.3. الـ Signature (التوقيع)
text

HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)

3. أنواع الـ Tokens
النوع	الوصف	مدة الصلاحية	الاستخدام
Access Token	يستخدم للوصول إلى الموارد المحمية.	30 دقيقة	جميع الطلبات المحمية.
Refresh Token	يستخدم لتجديد Access Token.	7 أيام	عند انتهاء صلاحية Access Token.
4. إعدادات JWT في Django
python

# nqp_backend/settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=30),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

5. استخدام JWT في العميل
5.1. تخزين Access Token
typescript

// تخزين في الذاكرة (آمن من XSS)
let accessToken: string | null = null;

// تخزين Refresh Token في HttpOnly Cookie (آمن من XSS)
// يتم ذلك تلقائياً من الخادم

5.2. إرسال Access Token في الطلبات
typescript

// Axios Interceptor
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// تحديث Access Token (عند انتهاء الصلاحية)
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            const response = await axios.post('/api/v1/auth/refresh/', {
                refresh: refreshToken
            });
            localStorage.setItem('access_token', response.data.access);
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return axios(originalRequest);
        }
        return Promise.reject(error);
    }
);

6. أمان JWT
الإجراء	الوصف
استخدام مفتاح سري قوي	مفتاح بطول 32 حرفاً على الأقل.
صلاحية قصيرة للـ Access Token	30 دقيقة لتقليل مخاطر السرقة.
تخزين آمن للـ Refresh Token	في (HttpOnly Cookie) لمنع هجمات (XSS).
إبطال Refresh Token	عند تسجيل الخروج أو تغيير كلمة المرور.
استخدام (HTTPS)	لمنع اعتراض الـ Token أثناء النقل.
التحقق من (JTI)	منع استخدام الـ Token أكثر من مرة.
7. مراجع

    JWT.io: https://jwt.io/

    djangorestframework-simplejwt: https://github.com/jazzband/djangorestframework-simplejwt

    OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

    