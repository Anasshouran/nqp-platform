"""فحص اتصال WHO المُتحقَّق منه (Phase 2B) — تمييز صريح بين الإعداد والاتصال.

لماذا هذه الوحدة:
    ``last_success_at`` على ``WHOIntegration`` يُكتب عند نجاح *أي* عملية
    (مزامنة، إرسال…). استخدمه كدليل على الاتصال الحالي خطأ: قد يكون نجاح
    قديماً أو من عملية أخرى. لذلك يسجَّل الفحص Controlled هنا منفصلاً في
    ``WHOSyncLog`` بعملية ``STATUS_CHECK`` — عملية موجودة أصلاً في النموذج،
    فلا حاجة لهجرة قاعدة بيانات.

قواعد ثابتة:

* التسلسل: إعدادات ← OAuth ← طلب مصادَق واحد ← تحقّق من الرد ← تطبيع.
* **لا يُعاد أي توكن أو سر**: ``WHOConnectivityResult`` لا يحمل ``access_token``
  ولا ``client_secret``، ورأس ``Authorization`` لا يخرج من نطاق
  ``apps.who.clients``.
* النقطة المُختبَرة هي مورد التوثيق الرسمي ``GET {base}/icd/entity`` — وهي
  نفسها مثال المصادقة في وثائق WHO (تحتاج ``API-Version: v2``).
* لا IHR: ``WHO_IHR_*`` تبقى فارغة، ولا يوجد مسار حالة مُختلَق.
* لا فحص DNS/TLS: لا نُبلّغ عنهما لأننا لا نُقيسهما.
* النقل كله عبر ``httpx`` داخل ``apps.who.clients`` لتسهيل التثليث.
"""

import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

import httpx
from django.utils import timezone

from apps.who.clients.base_client import (
    WHOClientError,
    WHOClientValidationError,
    WHOExternalAccessDisabled,
)
from apps.who.clients.icd_client import ICD11Client
from apps.who.config import (
    ConfigurationState,
    load_ihr_configuration,
    load_icd_configuration,
)
from apps.who.models import WHOSyncLog, WHOIntegration

#: مورد التوثيق الرسمي لمثال المصادقة في ICD-API v2.
#: ``GET https://id.who.int/icd/entity`` — لا يُشتق، ويُثبَّت كعقد موثّق.
ICD_VERIFICATION_PATH = '/icd/entity'


class ConnectivityState(str, Enum):
    """حالة الاتصال كما يثبتها الفحص المتحكَّم به — لا استنتاج ولا افتراض."""

    DISABLED = 'DISABLED'          # WHO_ENABLED=false — لم يُرسل أي طلب
    UNCONFIGURED = 'UNCONFIGURED'  # مفعّل لكن ينقصه اعتماد
    INVALID = 'INVALID'            # مفعّل لكن أحد الإعدادات مشوّه
    CONFIGURED = 'CONFIGURED'      # اعتماد + إعدادات سليمة، بلا فحص شبكة بعد
    READY = 'READY'                # OAuth + طلب مصادَق نجحان والتحقق من الرد نجح
    ERROR = 'ERROR'                # فحص قُيِّم وفشل

    @property
    def is_verified(self) -> bool:
        """هل هناك دليل تشغيلي حديث؟ ``CONFIGURED`` وحدها ليست دليلاً."""
        return self is ConnectivityState.READY


#: الحالات التي تعني «لا يوجد دليل تشغيلي» — لا تُعرض كـ«متصل».
UNVERIFIED_STATES = frozenset(
    {
        ConnectivityState.DISABLED,
        ConnectivityState.UNCONFIGURED,
        ConnectivityState.INVALID,
        ConnectivityState.CONFIGURED,
    }
)

#: نفس المجموعة كأسماء نصية، للفلترة في ``describe_connectivity``.
UNVERIFIED_STATE_NAMES = frozenset(state.value for state in UNVERIFIED_STATES)


@dataclass(frozen=True)
class WHOConnectivityResult:
    """نتيجة فحص واحد — آمنة للتسلسل إلى الواجهة (بلا أسرار ولا توكن)."""

    state: ConnectivityState
    message: str = ''
    http_status: int | None = None
    latency_ms: int | None = None
    endpoint: str = ''
    api_version: str = ''
    oauth_verified: bool = False
    api_verified: bool = False
    checked_at: datetime | None = None

    @property
    def is_verified(self) -> bool:
        return self.state.is_verified

    def as_payload(self) -> dict:
        """تمثيل للواجهة — قيم مشتقة فقط، لا سرّ ولا توكن ولا رأس تفويض."""
        return {
            'state': self.state.value,
            'verified': self.is_verified,
            'message': self.message,
            'http_status': self.http_status,
            'latency_ms': self.latency_ms,
            'endpoint': self.endpoint,
            'api_version': self.api_version,
            'oauth_verified': self.oauth_verified,
            'api_verified': self.api_verified,
            'checked_at': self.checked_at,
        }


def _config_only_state(config) -> ConnectivityState:
    """حالة ما قبل الشبكة: إعدادات فقط، بلا أي دليل على الاتصال."""
    return {
        ConfigurationState.DISABLED: ConnectivityState.DISABLED,
        ConfigurationState.UNCONFIGURED: ConnectivityState.UNCONFIGURED,
        ConfigurationState.INVALID: ConnectivityState.INVALID,
        ConfigurationState.CONFIGURED: ConnectivityState.CONFIGURED,
    }[config.state]


def _verification_url(config) -> str:
    return f'{config.base_url}{ICD_VERIFICATION_PATH}'


def _validated_payload(response: httpx.Response) -> dict:
    """يرفض الرد الذي لا يطابق شكل مورد ICD الموثّق.

    الرد الناجح على ``/icd/entity`` يحمل ``@id`` و ``availableLanguages``.
    نتحقق من ذلك فقط: لا نحتفظ بالحمولة (قد تكون كبيرة) ولا نكتبها anywhere.
    """
    try:
        body = response.json()
    except ValueError as exc:
        raise WHOClientValidationError('رد WHO ليس JSON صالحاً.') from exc
    if not isinstance(body, dict):
        raise WHOClientValidationError('رد WHO ليس كائن JSON كما هو متوقع.')
    if '@id' not in body:
        raise WHOClientValidationError(
            'رد WHO لا يحمل معرّف المورد (@id) — لا يمكن اعتباره تحقّقاً ناجحاً.'
        )
    return body


def verify_icd11_connectivity(*, client: ICD11Client | None = None) -> WHOConnectivityResult:
    """فحص واحد محكوم: OAuth ← طلب مصادَق ← تحقّق ← تطبيع.

    لا يكتب في قاعدة البيانات ولا يلمس ``WHOIntegration`` — التسجيل مسؤولية
    :func:`record_connectivity_check`. لا يرسل أي طلب إن كانت الإعدادات مغلقة.
    """
    config = load_icd_configuration()
    endpoint = _verification_url(config) if config.base_url else ''

    if not config.can_connect:
        return WHOConnectivityResult(
            state=_config_only_state(config),
            message=_pre_network_message(config),
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )

    icd_client = client or ICD11Client()
    started = time.perf_counter()

    # --- الخطوة 1: مصادقة OAuth ---
    try:
        icd_client._token()
    except httpx.TimeoutException:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message='انتهت مهلة طلب التوكن إلى WHO.',
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except httpx.HTTPStatusError as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=_auth_failure_message(exc.response.status_code),
            http_status=exc.response.status_code,
            endpoint=config.token_url,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except (WHOClientValidationError, WHOExternalAccessDisabled) as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=str(exc),
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except WHOClientError:
        # يشمل «لم يصدر رمز وصول ICD-11» أي أن الرد بلا access_token.
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message='لم يصدر رمز وصول صالح من WHO.',
            endpoint=config.token_url,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except (httpx.RequestError, ValueError, KeyError) as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=f'تعذّر الوصول إلى نقطة التوكن: {type(exc).__name__}.',
            endpoint=config.token_url,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )

    # --- الخطوة 2: طلب WHO واحد مصادَق ---
    request_started = time.perf_counter()
    try:
        response = httpx.get(
            endpoint,
            # بلا معاملات: التوثيق الرسمي يعرّف ``GET {base}/icd/entity``
            # بلا query. ``releaseId`` يخصّ نقطة البحث
            # ``/icd/entity/search`` لا هذه — وإرساله يجعل WHO يردّ
            # 404 «Requested resource could not be found».
            headers=icd_client._api_headers('en'),
            timeout=icd_client.timeout,
        )
    except httpx.TimeoutException:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message='انتهت مهلة الطلب المصادَق إلى WHO.',
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except httpx.HTTPStatusError as exc:
        # ``httpx.get`` لا يرفع على رمز غير 2xx افتراضياً، لكن أي نقل طبقة
        # قد يفعل — نتعامل معه كخطأ HTTP لا كنجاح.
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=f'رفض WHO الطلب: HTTP {exc.response.status_code}.',
            http_status=exc.response.status_code,
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except (WHOClientValidationError, WHOExternalAccessDisabled) as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=str(exc),
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )
    except httpx.RequestError as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=f'تعذّر الوصول إلى مورد WHO: {type(exc).__name__}.',
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )

    api_latency_ms = round((time.perf_counter() - request_started) * 1000, 1)
    total_latency_ms = round((time.perf_counter() - started) * 1000, 1)

    if response.status_code < 200 or response.status_code >= 300:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=f'رفض WHO الطلب: HTTP {response.status_code}.',
            http_status=response.status_code,
            latency_ms=api_latency_ms,
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )

    # --- الخطوة 3: تحقّق من الشكل ---
    try:
        _validated_payload(response)
    except WHOClientValidationError as exc:
        return WHOConnectivityResult(
            state=ConnectivityState.ERROR,
            message=str(exc),
            http_status=response.status_code,
            latency_ms=api_latency_ms,
            oauth_verified=True,
            endpoint=endpoint,
            api_version=config.api_version,
            checked_at=timezone.now(),
        )

    # --- الخطوة 4: تطبيع ---
    return WHOConnectivityResult(
        state=ConnectivityState.READY,
        message='نجح فحص الاتصال: OAuth + مورد ICD الرسمي.',
        http_status=response.status_code,
        latency_ms=api_latency_ms,
        oauth_verified=True,
        api_verified=True,
        endpoint=endpoint,
        api_version=config.api_version,
        checked_at=timezone.now(),
    )


def _pre_network_message(config) -> str:
    """سبب عدم إجراء فحص شبكي — مُصاغ كعائق إعداد لا كفشل اتصال."""
    if not config.enabled:
        return 'التكامل مع WHO معطّل — لم يُرسل أي طلب.'
    if config.issues:
        return 'إعدادات ICD-11 غير صالحة: ' + '، '.join(config.issues)
    if not config.has_credentials:
        return 'بيانات الاعتماد غير مضبوطة (WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET).'
    return 'الإعدادات مكتملة — لم يُجرَ فحص شبكي بعد.'


def _auth_failure_message(status_code: int) -> str:
    """رسالة فشل المصادقة — بلا أي اقتباس من جسم الرد أو السر."""
    if status_code in (400, 401):
        return f'رفضت WHO بيانات الاعتماد (HTTP {status_code}).'
    if status_code == 403:
        return f'حساب WHO غير مخوّل لهذا المورد (HTTP {status_code}).'
    return f'فشل طلب التوكن (HTTP {status_code}).'


# ============================================================
# التسجيل والقراءة — لا حاجة لهجرة: عملية STATUS_CHECK موجودة أصلاً
# ============================================================


def record_connectivity_check(
    result: WHOConnectivityResult,
    integration: WHOIntegration | None = None,
) -> WHOSyncLog:
    """يسجّل الفحص في ``WHOSyncLog`` بعملية ``STATUS_CHECK``.

    ``request_payload`` و ``response_payload`` يُكتبان بيانات وصفية فقط
    (الحالة، رمز HTTP، الزمن، المسار). **لا** يُكتب توكن ولا سر ولا حمولة
    WHO — هذا هو الفارق عن ``WHOClient.request`` الذي يحفظ جسم الرد كاملاً.
    """
    if integration is None:
        integration = WHOIntegration.objects.filter(is_active=True).first()

    return WHOSyncLog.objects.create(
        integration=integration,
        operation=WHOSyncLog.Operation.STATUS_CHECK,
        direction=WHOSyncLog.Direction.OUTBOUND,
        resource_type='icd11:entity',
        request_payload={},
        response_payload={
            'state': result.state.value,
            'oauth_verified': result.oauth_verified,
            'api_verified': result.api_verified,
            'http_status': result.http_status,
            'latency_ms': result.latency_ms,
            'api_version': result.api_version,
            'endpoint_path': ICD_VERIFICATION_PATH,
        },
        status=(
            WHOSyncLog.Status.SUCCESS
            if result.state is ConnectivityState.READY
            else WHOSyncLog.Status.FAILED
        ),
        http_status=result.http_status,
        error_message='' if result.state is ConnectivityState.READY else result.message,
        completed_at=timezone.now(),
    )


def latest_connectivity_check() -> WHOSyncLog | None:
    """آخر فحص مسجَّل، أو ``None`` — لا يُستنتج أي حالة من غيابه."""
    return (
        WHOSyncLog.objects.filter(operation=WHOSyncLog.Operation.STATUS_CHECK)
        .select_related('integration')
        .order_by('-started_at', '-created_at')
        .first()
    )


def connectivity_from_log(log: WHOSyncLog | None) -> WHOConnectivityResult | None:
    """يعيد بناء النتيجة من السجل المسجَّل — للقراءة في ``status`` بلا شبكة."""
    if log is None:
        return None
    payload = log.response_payload if isinstance(log.response_payload, dict) else {}
    raw_state = payload.get('state', '')
    try:
        state = ConnectivityState(raw_state)
    except ValueError:
        # سجل قديم أو مكتوب يدوياً: لا نخمّن — نعتبره غير متحقَّق.
        return WHOConnectivityResult(
            state=ConnectivityState.CONFIGURED,
            message='سجل فحص سابق غير قابل للتفسير — لا يوجد دليل حديث.',
            checked_at=log.completed_at or log.started_at,
        )
    return WHOConnectivityResult(
        state=state,
        message=log.error_message or '',
        http_status=log.http_status,
        latency_ms=payload.get('latency_ms'),
        endpoint=payload.get('endpoint_path', ''),
        api_version=payload.get('api_version', ''),
        oauth_verified=bool(payload.get('oauth_verified')),
        api_verified=bool(payload.get('api_verified')),
        checked_at=log.completed_at or log.started_at,
    )


def describe_connectivity() -> dict:
    """تقرير الحالة للواجهة: إعداد + آخر فحص **مسجَّل** — بلا أي طلب شبكة.

    ``connected`` يُشتق من الفحص المتحكَّم به فقط، لا من ``last_success_at``.
    """
    config = load_icd_configuration()
    ihr = load_ihr_configuration()
    integration = WHOIntegration.objects.filter(is_active=True).first()
    verification = connectivity_from_log(latest_connectivity_check())

    if verification is not None:
        state = verification.state
    else:
        state = _config_only_state(config)

    # ``configured`` = «يوجد تعريف تكامل» (سجل نشط أو اعتماد في البيئة).
    # هذا لا يعني أن الاتصال قائم — لذلك دقة «هل يمكن الاتصال؟» تحملها
    # ``state`` وحدها: UNCONFIGURED / DISABLED / INVALID تعني «لا».
    has_definition = bool(
        integration is not None or (config.has_credentials and not config.issues)
    )

    return {
        'state': state.value,
        'configured': has_definition,
        'connected': state.is_verified,
        'verified': verification.is_verified if verification else False,
        'enabled': config.enabled,
        'environment': integration.environment if integration else '',
        'last_sync_at': integration.last_sync_at if integration else None,
        'last_success_at': integration.last_success_at if integration else None,
        'last_error': integration.last_error if integration else '',
        # ``verified_at`` = وقت **تحقّق ناجح** فقط. فحص فاشل (ERROR) يُسجَّل
        # في ``verified_http_status``/``verification_message`` زمنه، لكن لا
        # يُنسب إلى ``verified_at``: وإلا عرضت الواجهة «آخر تحقّق» لفشل.
        'verified_at': (
            verification.checked_at
            if verification and verification.is_verified
            else None
        ),
        'verified_endpoint': verification.endpoint if verification else '',
        'verified_http_status': verification.http_status if verification else None,
        'verified_latency_ms': verification.latency_ms if verification else None,
        'oauth_verified': verification.oauth_verified if verification else False,
        'api_verified': verification.api_verified if verification else False,
        'api_version': config.api_version,
        'verification_message': verification.message if verification else _pre_network_message(config),
        # IHR: تُبلَّغ حالة الإعداد فقط. لا مسار حالة معتمد ⇒ لا دليل.
        'ihr_state': ihr.state.value,
        'ihr_configured': ihr.state.value not in UNVERIFIED_STATE_NAMES,
    }
