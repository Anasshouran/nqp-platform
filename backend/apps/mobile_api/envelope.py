"""غلاف الاستجابة المعتمد لـ API الجوال + ترويسة أخطاء ثنائية اللغة.

الشكل المعتمد (عقد المرحلة الأولى §11):

    نجاح:  {"status": "success", "data": {...}, "message": null}
    خطأ:   {"status": "error", "data": null,
            "message": {"code": "...", "ar": "...", "en": "..."}}

عربي أول (لغة المستخدم الأساسية). لا تُعرض أي معلومات داخلية:
لا تتبع استثناءات، ولا أخطاء قواعد بيانات، ولا أسماء نماذج، ولا SQL، ولا أسرار.
"""

from __future__ import annotations

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

# رموز الأخطاء المعتمدة -> (عربي، إنجليزي). العربية لغة المستخدم الأساسية.
ERROR_MESSAGES: dict[str, tuple[str, str]] = {
    'AUTH_REQUIRED': ('يجب تسجيل الدخول', 'Authentication required'),
    'AUTH_INVALID': ('بيانات الدخول غير صحيحة', 'Invalid credentials'),
    'FORBIDDEN': ('لا تملك إذناً للوصول إلى هذه الميزة', 'You do not have permission to access this feature'),
    'NOT_FOUND': ('العنصر غير موجود', 'Not found'),
    'METHOD_NOT_ALLOWED': ('طريقة الطلب غير مدعومة', 'Method not allowed'),
    'RATE_LIMITED': ('طلبات كثيرة جداً — يرجى المحاولة لاحقاً', 'Too many requests — please try again later'),
    'NOT_IMPLEMENTED': ('هذه الميزة قيد الإعداد ولم تُفعَّل بعد', 'This feature is not implemented yet'),
    'VALIDATION_ERROR': ('بيانات غير صالحة', 'Invalid input'),
    'SERVER_ERROR': ('حدث خطأ مؤقت — يرجى المحاولة لاحقاً', 'A temporary error occurred — please try again later'),
    'CONTRACT_VERSION_UNSUPPORTED': ('إصدار العقد غير مدعوم', 'Unsupported API contract version'),
}

# حالة HTTP لكل رمز — تُستخدم حين لا يوجد ردّ DRF جاهز.
ERROR_STATUS: dict[str, int] = {
    'AUTH_REQUIRED': http_status.HTTP_401_UNAUTHORIZED,
    'AUTH_INVALID': http_status.HTTP_401_UNAUTHORIZED,
    'FORBIDDEN': http_status.HTTP_403_FORBIDDEN,
    'NOT_FOUND': http_status.HTTP_404_NOT_FOUND,
    'METHOD_NOT_ALLOWED': http_status.HTTP_405_METHOD_NOT_ALLOWED,
    'RATE_LIMITED': http_status.HTTP_429_TOO_MANY_REQUESTS,
    'NOT_IMPLEMENTED': http_status.HTTP_501_NOT_IMPLEMENTED,
    'VALIDATION_ERROR': http_status.HTTP_400_BAD_REQUEST,
    'SERVER_ERROR': http_status.HTTP_500_INTERNAL_SERVER_ERROR,
    'CONTRACT_VERSION_UNSUPPORTED': http_status.HTTP_400_BAD_REQUEST,
}

# تطابق حالات DRF مع رموزنا المعتمدة (يُستخدم في handle_exception).
_HTTP_TO_CODE = {
    400: 'VALIDATION_ERROR',
    401: 'AUTH_REQUIRED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    429: 'RATE_LIMITED',
}


def success_payload(data, message: str | None = None) -> dict:
    return {'status': 'success', 'data': data, 'message': message}


def error_payload(code: str) -> dict:
    ar, en = ERROR_MESSAGES.get(code, ERROR_MESSAGES['SERVER_ERROR'])
    return {
        'status': 'error',
        'data': None,
        'message': {'code': code, 'ar': ar, 'en': en},
    }


def error_response(code: str, status_code: int | None = None) -> Response:
    return Response(error_payload(code), status=status_code or ERROR_STATUS[code])


def _error_code_for(exc, status_code: int) -> str:
    """يفرّق بين غياب ال_credentials (AUTH_REQUIRED) ورمز فاسد (AUTH_INVALID)."""
    from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated

    if status_code == 401:
        if isinstance(exc, NotAuthenticated):
            return 'AUTH_REQUIRED'
        if isinstance(exc, AuthenticationFailed):
            # رمز مقدَّم لكنه غير صالح/منتهٍ — الإرسال تم فعلاً.
            return 'AUTH_INVALID'
        if exc is None:
            return 'AUTH_REQUIRED'
    return _HTTP_TO_CODE.get(status_code, 'SERVER_ERROR')


class MobileAPIView(APIView):
    """أساس كل نقاط نهاية في مساحة ``/api/v1/mobile/``.

    يحوّل أي استثناء DRF (401/403/404/429/…) إلى الغلاف المعتمد ذي
    الرمز ثنائية اللغة، فلا يتسرب شكل DRF الخام (``detail``) إلى العميل.
    """

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        if response is None:
            return None
        data = response.data
        if isinstance(data, dict) and data.get('status') in ('success', 'error'):
            return response
        code = _error_code_for(exc, response.status_code)
        response.data = error_payload(code)
        return response

    def not_implemented(self) -> Response:
        """ردّ صريح 501 — التنفيذ مؤجَّل عمداً (لا بيانات مُختلقة)."""
        return error_response('NOT_IMPLEMENTED')
