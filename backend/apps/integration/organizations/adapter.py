"""واجهة المحوّل (adapter) — نقطة التماس الوحيدة مع أي منظمة خارجية.

الفصل المقصود بين الطبقات، بالترتيب:

    العقد  →  بناء الطلب  →  النقل  →  تحليل الاستجابة

* **العقد**: ``AuthenticationContract`` / ``EndpointContract`` — وصف بلا I/O.
* **بناء الطلب**: ``build_request`` — ينتج ``IntegrationRequest`` وصفية.
* **النقل**: كائن ``Transport`` **يُحقن**. لا يُبنى من أي شيء هنا.
* **التحليل**: ``parse_response`` — دالة بحتة على حمولة، بلا شبكة.

ضمانSafety الأساسي: ``RefusingTransport`` هو النقل الافتراضي. أي محوّل
يُبنى **بلا** نقل مُحقن يرفض كل عملية برسالة صريحة بدل أن يمرّ إلى
``httpx``. هذا يعني أن الإهمال لا يتحول إلى اتصال خارجي.

``IntegrationRequest`` لا يحمل حقل رؤوس (headers) إطلاقاً: المصادقة مسؤولية
النقل عبر ``auth``. هذا يجعل تسريب ``Authorization`` مستحيلاً عبر مسار
البناء، لا merely نادراً.
"""

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, runtime_checkable

from .contract import (
    Capability,
    IntegrationStatus,
    IntegrationStatusReport,
    Organization,
)
from .endpoints import AuthenticationContract, EndpointContract, EndpointContractError
from .results import ErrorCategory, IntegrationError, IntegrationResult, map_error


@dataclass(frozen=True)
class IntegrationRequest:
    """طلب **وصفي** لا مُنفَّذ.

    لا يوجد ``headers`` ولا ``auth_headers``. المصادقة تُوصف عبر ``auth``
    وتُنفَّذ في طبقة النقل المُحقنة — فلا تلمس بنية الطلب سرّاً واحداً.
    """

    organization: str
    capability: Capability
    operation: str
    method: str
    url: str
    auth: AuthenticationContract
    endpoint: EndpointContract
    json_body: dict = field(default_factory=dict)
    query: dict = field(default_factory=dict)
    timeout: float = 0.0

    def __post_init__(self):
        object.__setattr__(self, 'method', str(self.method or '').strip().upper())
        object.__setattr__(self, 'json_body', dict(self.json_body or {}))
        object.__setattr__(self, 'query', dict(self.query or {}))

    def describe(self) -> dict:
        """وصف آمن — لا رؤوس، لا حمولة خام، لا اعتمادات."""
        return {
            'organization': self.organization,
            'capability': self.capability.value,
            'operation': self.operation,
            'method': self.method,
            'url': self.url,
            'timeout': self.timeout,
            'authentication_type': self.auth.authentication_type.value,
            'credential_references': list(self.auth.credential_references),
            'body_keys': sorted(self.json_body.keys()),
            'query_keys': sorted(self.query.keys()),
        }

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<IntegrationRequest {self.method} {self.url} op={self.operation}>'


@runtime_checkable
class Transport(Protocol):
    """نقل قابل للحقن — التنفيذ الفعلي خارج هذه الطبقة."""

    def send(self, request: IntegrationRequest) -> Any:
        ...


class RefusingTransport:
    """النقل الافتراضي: يرفض كل عملية. لا شبكة، لا استيراد httpx.

    وجوده يجعل «نسيان حقن النقل» خطأً صريحاً عند أول عملية، لا اتصالاً
    خارجياً صامتاً.
    """

    def send(self, request: IntegrationRequest):
        raise IntegrationError(
            ErrorCategory.CONFIGURATION_ERROR,
            'لا يوجد نقل مُحقن: transport is not injected. '
            'البناء والفحص لا يجريان أي طلب — الحقن صريح دائماً.',
        )

    def __repr__(self) -> str:  # pragma: no cover
        return '<RefusingTransport>'


class OrganizationAdapter:
    """العقد المجرّد لكل منظمة خارجية.

    فئات فرعية يجب أن تنفّذ ``organization`` و ``capabilities`` و
    ``get_status`` و ``build_request``. الباقي له افتراضات معقولة.
    """

    #: هوية المنظمة — ثابتة عبر العملية الواحدة.
    organization: Organization = None
    #: القدرات **المعلنة** في العقد.
    capabilities: tuple = ()

    def __init__(self, transport: Transport = None):
        # الحقن صريح: الافتراضي يرفض. لا بناء شبكة هنا.
        self._transport = transport if transport is not None else RefusingTransport()

    @property
    def transport(self) -> Transport:
        return self._transport

    @property
    def has_injected_transport(self) -> bool:
        return not isinstance(self._transport, RefusingTransport)

    # ---- العقد المطلوب تنفيذه ----

    def get_status(self) -> IntegrationStatusReport:
        raise NotImplementedError('يجب أن ينفّذ المحوّل get_status.')

    def build_request(
        self,
        capability: Capability,
        operation: str,
        *,
        endpoint: EndpointContract,
        auth: AuthenticationContract,
        json_body: dict = None,
        query: dict = None,
    ) -> IntegrationRequest:
        raise NotImplementedError('يجب أن ينفّذ المحوّل build_request.')

    # ---- افتراضات معقولة ----

    def declares(self, capability: Capability) -> bool:
        """هل القدرة معلنة في عقد المنظمة؟ لا تعني أنها متاحة."""
        return capability in tuple(self.capabilities or ())

    def available_capabilities(self) -> tuple:
        """القدرات المتاحة **الآن**.

        تقاطع بين المعلن وقدرات المكوّن المفعّل والمهيّأ. هذا التمييز
        الصريح هو ما يمنع قدرة معلنة من الظهور وكأنها مفعّلة.
        """
        report = self.get_status()
        if report.status not in (IntegrationStatus.CONFIGURED, IntegrationStatus.READY):
            return ()
        return tuple(c for c in tuple(self.capabilities or ()) if c in report.detail.get('ready_capabilities', ()))

    def validate_configuration(self) -> IntegrationResult:
        """نتيجة تحقق من الإعدادات محلياً — بلا أي طلب.

        success هنا تعني «الإعدادات سليمة» لا «الاتصال يعمل».
        """
        report = self.get_status()
        if report.status is IntegrationStatus.DISABLED:
            return IntegrationResult.failure(
                'DISABLED',
                ErrorCategory.CONFIGURATION_ERROR,
                f'تكامل {report.organization} معطّل صراحةً.',
            )
        if report.issues:
            return IntegrationResult.failure(
                report.status.value,
                ErrorCategory.CONFIGURATION_ERROR,
                '، '.join(report.issues),
            )
        return IntegrationResult.ok(
            report.status.value,
            external_reference=report.organization,
            response_data=report.describe(),
        )

    def parse_response(self, payload: Any) -> Any:
        """تحليل استجابة — دالة بحتة افتراضياً تعيد الحمولة كما هي.

        لا decrypt، لا تطبيع قسري: كل منظمة قد تعرّف شكلها بنفسها بعد
        تأكيد العقد الرسمي.
        """
        if isinstance(payload, Mapping) and 'data' in payload:
            return payload['data']
        return payload

    def map_error(self, exc: BaseException) -> ErrorCategory:
        """تصنيف الأخطاء — قابل للتوسيع من الفئات الفرعية.

        التوقيع يبقى ``(exc) -> ErrorCategory`` كما في الطبقة الأساسية.
        """
        return map_error(exc)

    def execute(self, request: IntegrationRequest) -> IntegrationResult:
        """ينفّذ طلباً عبر النقل المُحقن ويوحّد النتيجة.

        لا يلتقط استثناءات من بنية ``IntegrationRequest`` itself — بناؤه
        مرفوض مسبقاً بـ ``build_request``. أي خطأ في النقل يصير نتيجة
        فشل مُصنَّفة، ومهلة لا تصير نجاحاً.
        """
        try:
            raw = self._transport.send(request)
        except Exception as exc:  # noqa: BLE001 — توحيد الأخطاء مقصود هنا
            return IntegrationResult.from_exception(
                exc,
                status='ERROR',
                extra_categories=self._extra_error_categories(),
            )
        try:
            data = self.parse_response(raw)
        except Exception as exc:  # noqa: BLE001 — تحليل تالف = استجابة غير صالحة
            return IntegrationResult.from_exception(
                exc,
                status='INVALID_RESPONSE',
                extra_categories=self._extra_error_categories(),
            )
        reference = ''
        if isinstance(raw, Mapping):
            reference = str(raw.get('external_reference') or raw.get('id') or '')
        return IntegrationResult.ok(
            'SUCCESS',
            external_reference=reference,
            response_data=data if isinstance(data, Mapping) else {'data': data},
        )

    def _extra_error_categories(self) -> dict:
        """تصنيفات خاصة بالمنظمة — يوسّعها المحوّل لا الأساس."""
        return {}

    def refuse(self, message: str, category: ErrorCategory = ErrorCategory.CONFIGURATION_ERROR):
        """رفض صريح قبل أي نقل — نقطة نهاية واحدة للرفض."""
        raise IntegrationError(category, message)

    def _assert_declared(self, capability: Capability) -> None:
        if not self.declares(capability):
            self.refuse(
                f'القدرة {capability.value} غير معلنة في عقد {self.organization.identifier}.',
                ErrorCategory.CONTRACT_ERROR,
            )

    def _assert_endpoint_complete(self, endpoint: EndpointContract) -> None:
        try:
            endpoint.resolve_resource()
        except EndpointContractError as exc:
            self.refuse(str(exc), ErrorCategory.CONFIGURATION_ERROR)

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        org = self.organization.identifier if self.organization else '?'
        return f'<{self.__class__.__name__} {org} transport={type(self._transport).__name__}>'
