"""عقد الأخطاء ونتائج التكامل المُطبَّعة.

قرارات تصميم مقصودة:

* **الطبقة الأساسية لا تعرف WHO.** ``map_error`` هنا يتعامل مع الأخطاء
  العامة و ``httpx`` فقط. أي أخطاء خاصة بمنطقة (مثل ``WHOClientError``)
  يوسّعها المحوّل في ``adapters/who.py`` — وهذا يبقي الأساس قابلاً لإعادة
  الاستخدام مع IOM و UNICEF دون أي تعديل.
* **التحديد حتمي.** نفس الاستثناء ⇐ نفس ``ErrorCategory`` دائماً.
* **المهلة لا تُترجم إلى نجاح ولا إلى اتصال.** ``TIMEOUT`` نتيجة ``False``.
* **لا أسرار في النتيجة.** ``error_message`` يمرّ على ``redact_text`` قبل
  التخزين، و ``response_data`` لا يُبنى إلا من حمولة يمرّرها المستدعي.
"""

import re
from dataclasses import dataclass, field

from .contract import IntegrationStatusError, LabeledEnum

# ============================================================
# التنقية
# ============================================================

#: أنماط تُحذف من أي نص قبل تخزينه أو عرضه.
#:
#: كل نمط يحمل ``(?!\[REDACTED\])`` قبل قيمته، وهذا يجعل ``redact_text``
#: **idempotent**: تنقية نص منقّى تُبقيه كما هو. بدون هذا الشرط فإن كل طبقة
#: تنقية لاحقة (سجل ⇐ نتيجة ⇐ تقرير) ستحوّل ``[REDACTED]`` إلى شكل جديد،
#: وهو ما يجعل كشف التسرّب عبر مقارنة نصوص غير موثوقة.
#:
#: الترتيب مهم: ``Authorization`` أولاً لأنه البنية الأكثر شيوعاً في نصوص
#: httpx، و ``token=`` قبل ``secret=`` حتى لا يبتلع الثاني الأول.
_REDACTIONS = (
    (re.compile(r'(?i)\bauthorization\s*[:=]\s*(?!\[REDACTED\])\S+(\s+\S+)?'), 'Authorization=[REDACTED]'),
    (re.compile(r'(?i)\bbearer\s+(?!\[REDACTED\])\S+'), 'Bearer [REDACTED]'),
    (re.compile(r'(?i)\bbasic\s+(?!\[REDACTED\])\S+'), 'Basic [REDACTED]'),
    (re.compile(
        r'(?i)\b(access_token|refresh_token|id_token|token)\s*[:=]\s*(?!\[REDACTED\])\S+',
    ), 'token=[REDACTED]'),
    (re.compile(
        r'(?i)\b(client_secret|client_id|api_key|apikey|secret|password|passwd)\s*[:=]\s*(?!\[REDACTED\])\S+',
    ), 'secret=[REDACTED]'),
    (re.compile(
        r'(?i)("?(?:client_secret|access_token|api_key|password)"?\s*:\s*")(?!\[REDACTED\])[^"]*(")',
    ), r'\1[REDACTED]\2'),
)

#: حدّ أقصى لطول أي نص خطأ — يمنع تمرير استجابات كاملة كـ«رسالة خطأ».
MAX_ERROR_LENGTH = 300


def redact_text(value, limit: int = MAX_ERROR_LENGTH) -> str:
    """يزيل أنماط الأسرار ويقصّ الطول. آمن للتسجيل والتخزين والعرض."""
    text = '' if value is None else str(value)
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    text = ' '.join(text.split())
    if limit and len(text) > limit:
        text = text[: limit - 1].rstrip() + '…'
    return text


def contains_sensitive_text(value) -> bool:
    """هل يحتوي النص على نمط سرّي **قبل** التنقية؟ يُستخدم في الاختبارات."""
    text = '' if value is None else str(value)
    return redact_text(text, limit=0) != ' '.join(text.split())


# ============================================================
# تصنيف الأخطاء
# ============================================================



class ErrorCategory(LabeledEnum):
    """فئات الأخطاء المتوقعة في أي تكامل خارجي."""

    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR', 'خطأ إعداد'
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', 'فشل مصادقة'
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR', 'غير مُرخَّص'
    TIMEOUT = 'TIMEOUT', 'انتهت المهلة'
    NETWORK_ERROR = 'NETWORK_ERROR', 'خطأ شبكة'
    HTTP_ERROR = 'HTTP_ERROR', 'خطأ HTTP'
    INVALID_RESPONSE = 'INVALID_RESPONSE', 'استجابة غير صالحة'
    CONTRACT_ERROR = 'CONTRACT_ERROR', 'انتهاك عقد'


class IntegrationError(IntegrationStatusError):
    """خطأ تكامل مُصنَّف — البديل الوحيد للاستثناءات الحرة في هذه الطبقة.

    يرث ``IntegrationStatusError`` حتى يستطيع المتصل التقاط **كل** أخطاء
    طبقة التكامل (``EndpointContractError`` و ``IntegrationError`` معاً)
    باستثناء واحد، مع الاحتفاء بـ ``.category`` للتصنيف الحتمي.
    """

    def __init__(self, category: ErrorCategory, message: str, *, status_code=None):
        self.category = category
        self.safe_message = redact_text(message)
        self.status_code = status_code
        super().__init__(self.safe_message)

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<IntegrationError {self.category.value}: {self.safe_message}>'


def map_error(exc: BaseException) -> ErrorCategory:
    """تصنيف حتمي للاستثناء → ``ErrorCategory``.

    لا يعرف هذا التصنيف أي منظمة بعينها؛ التصنيفات الخاصة بالمنطقة
    تُضاف في المحوّل (adapter).
    """
    if isinstance(exc, IntegrationError):
        return exc.category

    import httpx

    if isinstance(exc, httpx.TimeoutException) or isinstance(exc, TimeoutError):
        return ErrorCategory.TIMEOUT
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code in (401, 407):
            return ErrorCategory.AUTHENTICATION_ERROR
        if code in (403, 451):
            return ErrorCategory.AUTHORIZATION_ERROR
        return ErrorCategory.HTTP_ERROR
    if isinstance(exc, (httpx.TransportError, ConnectionError, OSError)):
        return ErrorCategory.NETWORK_ERROR
    if isinstance(exc, ValueError):
        # فشل فك ترميز JSON أو تحليل مشابه — استجابة غير صالحة لا خطأ إعداد.
        return ErrorCategory.INVALID_RESPONSE
    # الافتراضي المتعمّد لسوء التصنيف: CONTRACT_ERROR. اختير على
    # NETWORK_ERROR تحديداً لأن افتراض «فشل شبكة» يختلق علاقة لم تحدث، بينما
    # CONTRACT_ERROR يبقى محافظاً ويصرّح بعدم اليقين. المهم في الحالتين:
    # لا نجاح ولا ادعاء اتصال.
    return ErrorCategory.CONTRACT_ERROR


# ============================================================
# النتيجة المُطبَّعة
# ============================================================


@dataclass(frozen=True)
class IntegrationResult:
    """نتيجة تكامل موحّدة عبر كل المنظمات.

    ``success`` مشتق من ``error_code is None`` — لا يمكن أن يوجد نجاح مع خطأ
    أو فشل بلا خطأ. ``external_reference`` هو المرجع لدى الطرف الخارجي فقط
    (رقم طلب، معرّف كيان) — لا رمز وصول ولا معرّف سرّي.
    """

    status: str
    success: bool
    external_reference: str = ''
    response_data: dict = field(default_factory=dict)
    error_code: ErrorCategory = None
    error_message: str = ''

    def __post_init__(self):
        if self.success and self.error_code is not None:
            raise IntegrationError(
                ErrorCategory.CONTRACT_ERROR,
                'نتيجة ناجحة لا تحمل خطأ — تناقض في العقد.',
            )
        if not self.success and self.error_code is None:
            object.__setattr__(self, 'error_code', ErrorCategory.CONTRACT_ERROR)
        object.__setattr__(self, 'error_message', redact_text(self.error_message))
        object.__setattr__(self, 'response_data', dict(self.response_data or {}))

    @classmethod
    def ok(cls, status: str, *, external_reference: str = '', response_data: dict = None) -> 'IntegrationResult':
        return cls(
            status=status,
            success=True,
            external_reference=str(external_reference or ''),
            response_data=dict(response_data or {}),
        )

    @classmethod
    def failure(
        cls,
        status: str,
        category: ErrorCategory,
        message: str,
        *,
        external_reference: str = '',
    ) -> 'IntegrationResult':
        return cls(
            status=status,
            success=False,
            external_reference=str(external_reference or ''),
            error_code=category,
            error_message=message,
        )

    @classmethod
    def from_exception(
        cls,
        exc: BaseException,
        *,
        status: str = 'ERROR',
        extra_categories: dict = None,
    ) -> 'IntegrationResult':
        """يبني نتيجة فشل من استثناء، مع تصنيف حتمي وتنقية الرسالة.

        ``extra_categories`` يسمح للمحوّل بإضافة تصنيفاته المنطقةية
        (مثل ``WHOClientError``) دون أن تعرف الطبقة الأساسية أي منظمة.
        """
        category = map_error(exc)
        if extra_categories:
            for exc_type, mapped in tuple(extra_categories.items()):
                if isinstance(exc, exc_type):
                    category = mapped
                    break
        return cls.failure(
            status,
            category,
            str(exc) or exc.__class__.__name__,
            external_reference=(
                str(getattr(exc, 'status_code', '') or ''),
            ),
        )

    def describe(self) -> dict:
        """وصف آمن للواجهات والتشخيص — الرسالة منقّاة بالفعل."""
        return {
            'status': self.status,
            'success': self.success,
            'external_reference': self.external_reference,
            'error_code': self.error_code.value if self.error_code else None,
            'error_message': self.error_message,
        }
