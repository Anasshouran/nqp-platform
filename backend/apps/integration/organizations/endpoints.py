"""عقد المصادقة وعقد نقاط النهاية — حدود المعرفة مع أي منظمة خارجية.

قواعد غير قابلة للكسر في هذه الوحدة:

* **لا اشتقاق.** ``token_url`` و ``resource_path`` لا يُشتقّان أبداً من
  ``base_url``. الفراغ =فراغ، ويبقى فراغاً. لا بديل مخفي ولا مسار افتراضي.
* **لا أسرار.** العقد يحمل *أسماء* الاعتمادادات (``credential_references``)
  لا قيمها. لا ``client_secret`` ولا ``access_token`` في أي حقل هنا.
* **لا مصادقة حيّة.** كل دالة في هذه الوحدة نصية بحتة: لا شبكة، ولا وقت.
* **لا افتراضات لمسارات WHO.** مسارات IHR تبقى فارغة حتى تأكيد العقد الرسمي؛
  المسار الداخلي ``/api/v1/...`` ليس نقطة WHO خارجية ولا يجوز وسمه كذلك.
"""

from dataclasses import dataclass

from .contract import IntegrationStatusError, LabeledEnum

#: بادئة تُستخدم في رسائل الرفض لتمييز عقد نقطة النهاية عن خطأ الاتصال.
_ENDPOINT_GUARD = 'EndpointContract'


class AuthenticationType(LabeledEnum):
    """نمط المصادقة المدعوم في العقد.

    ``WEBHOOK_SECRET`` يصف التحقق من **توقيع** وباي هوك واردة، وهو نمط
    منفصل عن ``API_KEY`` (مفتاح صادر). لا يُنفَّذ أي نمط حيّاً في Phase 1.
    """

    NONE = 'NONE', 'بدون'
    OAUTH2_CLIENT_CREDENTIALS = 'OAUTH2_CLIENT_CREDENTIALS', 'OAuth2 تفويض العميل'
    API_KEY = 'API_KEY', 'مفتاح API'
    WEBHOOK_SECRET = 'WEBHOOK_SECRET', 'سر توقيع وباي هوك'


class EndpointContractError(IntegrationStatusError):
    """انتهاك عقد نقطة نهاية — مثال: مسار ناقص أو مسار مرفوض."""


@dataclass(frozen=True)
class AuthenticationContract:
    """وصف **كيف** تُصادَق المنظمة، بلا أي قيمة سرّية.

    ``credential_references`` قائمة **أسماء** إعدادات أو مراجع مخزن
    (``WHO_ICD_CLIENT_ID`` …). لا تُقرأ ولا تُفكّ أي قيمة من هنا.

    ``token_endpoint`` نص وصفي: وصفه لا يعني أنه مُفعّل أو مُختبَر.
    """

    authentication_type: AuthenticationType
    credential_references: tuple = ()
    token_endpoint: str = ''
    scopes: tuple = ()

    def __post_init__(self):
        if not isinstance(self.authentication_type, AuthenticationType):
            raise EndpointContractError('authentication_type يجب أن يكون AuthenticationType.')
        object.__setattr__(self, 'credential_references', tuple(self.credential_references))
        object.__setattr__(self, 'scopes', tuple(self.scopes))

    @property
    def credential_reference(self) -> str:
        """عرض أسماء الاعتمادادات فقط — لا قيم."""
        return ', '.join(self.credential_references)

    @property
    def requires_credentials(self) -> bool:
        return self.authentication_type is not AuthenticationType.NONE

    @property
    def requires_token_endpoint(self) -> bool:
        """OAuth2 يحتاج نقطة توكن صريحة. غيرها لا يحتاج."""
        return self.authentication_type is AuthenticationType.OAUTH2_CLIENT_CREDENTIALS

    def missing_requirements(self) -> tuple:
        """النقص الموصوف — يُستخدم لتقرير الحالة، لا لجلب أي سر.

        لا يستطيع هذا العقد معرفة ما إذا كانت القيم موجودة فعلاً: معرفةُ
        ذلك مسؤولية المحوّل (adapter) الذي يقرأ الإعدادات محلياً.
        """
        missing = []
        if self.requires_credentials and not self.credential_references:
            missing.append('لا يوجد مرجع اعتماد معرَّف')
        if self.requires_token_endpoint and not self.token_endpoint:
            missing.append('نقطة التوكن غير مضبوطة — لا تُشتق من الأساس')
        return tuple(missing)

    def describe(self) -> dict:
        """وصف آمن للتشخيص — يُبلّغ وجود الت-reference لا قيمته."""
        return {
            'authentication_type': self.authentication_type.value,
            'credential_references': list(self.credential_references),
            'credential_reference': self.credential_reference,
            'token_endpoint_configured': bool(self.token_endpoint),
            'scopes': list(self.scopes),
            'requires_credentials': self.requires_credentials,
        }

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<AuthenticationContract type={self.authentication_type.value} refs={len(self.credential_references)}>'


@dataclass(frozen=True)
class EndpointContract:
    """نقطة نهاية واحدة، موصوفة بالكامل أو مرفوضة.

    الحقول المطلوبة قبل بناء طلب: ``base_url`` و ``resource_path`` و
    ``http_method``. ``token_url`` مطلوب فقط لأنماط OAuth2.

    ``resolve_resource()`` هو نقطة الرفض: إن كان ``resource_path`` فارغاً
    ترفض العملية بدل ملء الفراغ من ``base_url``. هذا هو الضمان المادي
    لغياب الاشتقاق.
    """

    base_url: str
    token_url: str = ''
    resource_path: str = ''
    http_method: str = 'GET'
    timeout: float = 0.0

    def __post_init__(self):
        object.__setattr__(self, 'http_method', str(self.http_method or '').strip().upper())
        object.__setattr__(self, 'base_url', str(self.base_url or '').rstrip('/'))
        object.__setattr__(self, 'token_url', str(self.token_url or '').strip())
        object.__setattr__(self, 'resource_path', str(self.resource_path or '').strip())

    @property
    def is_fully_specified(self) -> bool:
        """هل كل ما يلزم لبناء طلب موجود صراحةً؟"""
        return bool(self.base_url and self.resource_path and self.http_method)

    def resolve_resource(self) -> str:
        """يرجع المسار الصريح أو يرفض — **لا اشتقاق في أي فرع**.

        لا يُضاف ``base_url`` إلى المسار ولا يُخمَّن أي بديل. المسار الفارغ
        ليس دعوة للافتراض.
        """
        if not self.is_fully_specified:
            raise EndpointContractError(
                f'{_ENDPOINT_GUARD}: نقطة النهاية غير مكتملة '
                f'(base_url={bool(self.base_url)}, resource_path={bool(self.resource_path)}, '
                f'method={self.http_method or "—"}). لا يوجد مسار افتراضي ولا اشتقاق من الأساس.'
            )
        return self.resource_path

    def resolve_token_endpoint(self) -> str:
        """يرجع نقطة التوكن الصريحة أو يرفض — لا تُشتق من ``base_url``."""
        if not self.token_url:
            raise EndpointContractError(
                f'{_ENDPOINT_GUARD}: نقطة التوكن غير مضبوطة. لا تُشتق من base_url — '
                'تُضبط صراحةً بعد تأكيد العقد الرسمي.'
            )
        return self.token_url

    def build_url(self) -> str:
        """مسار مطلق من الحقول الصريحة فقط."""
        return f'{self.base_url}{self.resolve_resource()}'

    def describe(self) -> dict:
        """وصف آمن — القيم هنا معرّفات endpoints لا أسرار، لكن التوكن
        يُبلَّغ كـ«مضبوط/غير مضبوط» فقط لتفادي تسجيل روابط تحمل معاملات."""
        return {
            'base_url': self.base_url,
            'token_url_configured': bool(self.token_url),
            'resource_path': self.resource_path,
            'http_method': self.http_method,
            'timeout': self.timeout,
            'fully_specified': self.is_fully_specified,
        }

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<EndpointContract {self.http_method} {self.base_url} path={self.resource_path!r}>'
