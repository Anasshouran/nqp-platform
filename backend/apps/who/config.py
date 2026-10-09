"""عقد الإعدادات والتحقق من صحتها للتكامل مع منظمة الصحة العالمية.

هذا الوحدة هي **مصدر الأسماء القانوني** (single source of truth) لأعدادات WHO،
وتقوم بفصل ما يلي صراحةً:

* ``apps.who.config`` — configuration فقط: ماذا نحتاج، وما الناقص، وما الفاسد.
* ``apps.who.clients`` — transport فقط: كيف نُرسل الطلب.

قواعد ثابتة في هذه الوحدة:

* لا يوجد أي طلب شبكي — التحقق من الإعدادات (configuration validation) ليس
  التحقق من الاتصال (connectivity validation).
* لا يوجد أي وصول لقاعدة البيانات.
* لا تُطبع الأسرار: كل وصف عام أو تشخيصي يمرّ عبر ``redacted()``.
* قراءة الإعدادات آمنة خارج تهيئة Django (لا كسر استيراد).
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

# ============================================================
# الأسماء القانونية (canonical setting names)
# ============================================================

SETTING_ENABLED = 'WHO_ENABLED'
SETTING_TIMEOUT = 'WHO_TIMEOUT'

SETTING_ICD_BASE_URL = 'WHO_ICD_BASE_URL'
SETTING_ICD_TOKEN_URL = 'WHO_ICD_TOKEN_URL'
SETTING_ICD_CLIENT_ID = 'WHO_ICD_CLIENT_ID'
SETTING_ICD_CLIENT_SECRET = 'WHO_ICD_CLIENT_SECRET'
SETTING_ICD_TIMEOUT = 'WHO_ICD_TIMEOUT'
SETTING_ICD_API_VERSION = 'WHO_ICD_API_VERSION'
SETTING_ICD_SCOPE = 'WHO_ICD_SCOPE'

SETTING_IHR_BASE_URL = 'WHO_IHR_BASE_URL'
SETTING_IHR_TOKEN_URL = 'WHO_IHR_TOKEN_URL'
SETTING_IHR_CLIENT_ID = 'WHO_IHR_CLIENT_ID'
SETTING_IHR_CLIENT_SECRET = 'WHO_IHR_CLIENT_SECRET'
SETTING_IHR_TIMEOUT = 'WHO_IHR_TIMEOUT'
SETTING_IHR_EVENTS_PATH = 'WHO_IHR_EVENTS_PATH'
SETTING_IHR_STATUS_PATH = 'WHO_IHR_STATUS_PATH'

#: أسماء قديمة (deprecated) تُقرأ كـfallback لـICD-11 حصراً: نشرها السابق
#: (deploy/.env.who و docker-compose) لم يحمل سوى قيم ICD-11، ولا يجب أن
#: تُستخدم لإعداد IHR لأن نطاق IHR منفصل.
LEGACY_ICD_ALIASES = {
    'WHO_BASE_URL': SETTING_ICD_BASE_URL,
    'WHO_TOKEN_URL': SETTING_ICD_TOKEN_URL,
    'WHO_CLIENT_ID': SETTING_ICD_CLIENT_ID,
    'WHO_CLIENT_SECRET': SETTING_ICD_CLIENT_SECRET,
}

# --- افتراضيات ICD-11 الرسمية كما هي موثّقة في كود العميل الحالي ---
ICD_DEFAULT_BASE_URL = 'https://id.who.int'
ICD_DEFAULT_TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
ICD_DEFAULT_API_VERSION = 'v2'
ICD_DEFAULT_SCOPE = 'icdapi_access'
ICD_DEFAULT_RELEASE = 'mms'

# --- نطاقات اللغة المدعومة في عقد ICD-11 ---
SUPPORTED_ICD_LANGUAGES = ('ar', 'en')
_LANGUAGE_RE = re.compile(r'^[a-z]{2}(-[A-Za-z]{2,8})?$')

DEFAULT_TIMEOUT_SECONDS = 15.0


class ConfigurationState(str, Enum):
    """حالة إعداد — بدون أي أثر شبكي."""

    DISABLED = 'DISABLED'          # معطّل صراحةً عبر WHO_ENABLED
    UNCONFIGURED = 'UNCONFIGURED'  # مفعّل لكن ينقصه اعتماد
    INVALID = 'INVALID'            # مفعّل لكن أحد الإعدادات مشوّه
    CONFIGURED = 'CONFIGURED'      # مفعّل + اعتماد + إعدادات سليمة


# ============================================================
# أدوات قراءة آمنة (تعمل قبل تهيئة settings أيضاً)
# ============================================================


def setting(name, fallback=''):
    """قراءة إعداد من Django settings مع الرجوع للافتراضي.

    تعيد ``fallback`` بدل رفع ``ImproperlyConfigured`` حتى يبقى استيراد
    الوحدات آمناً خارج بيئة Django أو قبل تهيئة الإعدادات.
    """
    try:
        value = getattr(settings, name, fallback)
    except ImproperlyConfigured:
        return fallback
    return value or fallback


def text_setting(name: str, fallback: str = '') -> str:
    """قراءة نصية آمنة لإعداد بعد تشذيب الفراغات.

    عامة عمداً ليست خاصة: تعتمد عليها السلاسل الطويلة (صريح ← settings ← سجل)
    دون تكرار منطق السقوط.
    """
    return str(setting(name, fallback) or '').strip()


def _flag(name, fallback=False):
    raw = str(setting(name, 'true' if fallback else 'false')).strip().lower()
    return raw in ('1', 'true', 'yes', 'on')


def _timeout(name, fallback=DEFAULT_TIMEOUT_SECONDS):
    try:
        value = float(setting(name, ''))
    except (TypeError, ValueError):
        return float(fallback)
    if value <= 0:
        return float(fallback)
    return value


def is_http_url(value) -> bool:
    """فحص شكلي للرابط — تحليل نصي بحت بلا أي وصول للشبكة."""
    if not value:
        return False
    try:
        parsed = urlparse(str(value))
    except ValueError:
        return False
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)


def is_valid_language(value) -> bool:
    """صيغة اللغة كما يدعمها عقد ICD-11 (ar / en مدعومان رسمياً)."""
    return bool(_LANGUAGE_RE.match(str(value or '')))


def is_valid_relative_path(value) -> bool:
    """مسار نسبي يبدأ بـ/ وبدون مخطط أو مضيف — يمنع تمرير رابط كامل كمسار."""
    text = str(value or '')
    if not text.startswith('/'):
        return False
    return '://' not in text


def legacy_env_in_use() -> tuple:
    """الأسماء القديمة المستخدمة فعلياً في البيئة (تُبلّغ كتحذير configuration)."""
    try:
        names = getattr(settings, 'WHO_LEGACY_ENV_IN_USE', ())
    except ImproperlyConfigured:
        return ()
    return tuple(names or ())


# ============================================================
# ICD-11
# ============================================================


@dataclass(frozen=True)
class ICDConfiguration:
    """لقطة إعدادات ICD-11 محمّلة من البيئة أو مُمرّرة صراحةً."""

    enabled: bool = False
    base_url: str = ''
    token_url: str = ''
    client_id: str = ''
    client_secret: str = ''
    timeout: float = DEFAULT_TIMEOUT_SECONDS
    api_version: str = ICD_DEFAULT_API_VERSION
    scope: str = ICD_DEFAULT_SCOPE
    issues: tuple = field(default_factory=tuple)
    legacy_env_names: tuple = field(default_factory=tuple)

    @property
    def has_credentials(self) -> bool:
        return bool(self.client_id and self.client_secret)

    @property
    def state(self) -> ConfigurationState:
        if not self.enabled:
            return ConfigurationState.DISABLED
        if self.issues:
            return ConfigurationState.INVALID
        if not self.has_credentials:
            return ConfigurationState.UNCONFIGURED
        return ConfigurationState.CONFIGURED

    @property
    def can_connect(self) -> bool:
        """صلاحية الاتصال لا تُفترض: تتطلب تفعيل + اعتماد + إعدادات سليمة."""
        return self.enabled and self.has_credentials and not self.issues

    def redacted(self) -> dict:
        """وصف آمن للطباعة والتشخيص — لا يحتوي أي قيمة سرّية."""
        return {
            'namespace': 'ICD-11',
            'state': self.state.value,
            'enabled': self.enabled,
            'base_url': self.base_url,
            'token_url': self.token_url,
            'api_version': self.api_version,
            'oauth_scope': self.scope,
            'timeout_seconds': self.timeout,
            'client_id_set': bool(self.client_id),
            'client_secret_set': bool(self.client_secret),
            'legacy_env_names': list(self.legacy_env_names),
            'issues': list(self.issues),
        }


def load_icd_configuration(
    *,
    base_url=None,
    token_url=None,
    client_id=None,
    client_secret=None,
    timeout=None,
) -> ICDConfiguration:
    """يبني إعدادات ICD-11: قيمة صريحة ← settings ← افتراضي رسمي.

    لا يجري أي طلب، ولا يكتب شيئاً؛ يمكن استدعاؤه في أي وقت (تشخيص/اختبار).
    """
    resolved_base = (base_url or text_setting(SETTING_ICD_BASE_URL, ICD_DEFAULT_BASE_URL)).rstrip('/')
    resolved_token = (token_url or text_setting(SETTING_ICD_TOKEN_URL, ICD_DEFAULT_TOKEN_URL)).rstrip('/')
    resolved_id = client_id or text_setting(SETTING_ICD_CLIENT_ID)
    resolved_secret = client_secret or text_setting(SETTING_ICD_CLIENT_SECRET)
    resolved_timeout = float(timeout) if timeout else _timeout(SETTING_ICD_TIMEOUT, _timeout(SETTING_TIMEOUT))

    issues = []
    if not is_http_url(resolved_base):
        issues.append(f'{SETTING_ICD_BASE_URL} ليس رابط http/https صالحاً')
    if not is_http_url(resolved_token):
        issues.append(f'{SETTING_ICD_TOKEN_URL} ليس رابط http/https صالحاً')
    if not text_setting(SETTING_ICD_API_VERSION, ICD_DEFAULT_API_VERSION):
        issues.append(f'{SETTING_ICD_API_VERSION} فارغ')

    return ICDConfiguration(
        enabled=_flag(SETTING_ENABLED),
        base_url=resolved_base,
        token_url=resolved_token,
        client_id=resolved_id,
        client_secret=resolved_secret,
        timeout=resolved_timeout,
        api_version=text_setting(SETTING_ICD_API_VERSION, ICD_DEFAULT_API_VERSION),
        scope=text_setting(SETTING_ICD_SCOPE, ICD_DEFAULT_SCOPE),
        issues=tuple(issues),
        legacy_env_names=legacy_env_in_use(),
    )


# ============================================================
# IHR
# ============================================================


@dataclass(frozen=True)
class IHRConfiguration:
    """لقطة إعدادات IHR. لا تفترض أي نقطة نهاية خارجية."""

    enabled: bool = False
    base_url: str = ''
    token_url: str = ''
    client_id: str = ''
    client_secret: str = ''
    timeout: float = DEFAULT_TIMEOUT_SECONDS
    events_path: str = ''
    status_path: str = ''
    issues: tuple = field(default_factory=tuple)
    legacy_env_names: tuple = field(default_factory=tuple)

    @property
    def has_credentials(self) -> bool:
        return bool(self.client_id and self.client_secret)

    @property
    def has_events_endpoint(self) -> bool:
        """مسار الإرسال يُعتبر مضبوطاً فقط بعد تأكيد العقد الرسمي من WHO."""
        return is_valid_relative_path(self.events_path)

    @property
    def has_status_endpoint(self) -> bool:
        return is_valid_relative_path(self.status_path)

    @property
    def has_token_endpoint(self) -> bool:
        """نقطة التوكن لا تُشتق أبداً — ``WHO_IHR_TOKEN_URL`` إلزامية."""
        return is_http_url(self.token_url)

    @property
    def state(self) -> ConfigurationState:
        if not self.enabled:
            return ConfigurationState.DISABLED
        if self.issues:
            return ConfigurationState.INVALID
        if not self.has_credentials or not is_http_url(self.base_url) or not self.has_token_endpoint:
            return ConfigurationState.UNCONFIGURED
        return ConfigurationState.CONFIGURED

    @property
    def can_connect(self) -> bool:
        return (
            self.enabled
            and self.has_credentials
            and is_http_url(self.base_url)
            and self.has_token_endpoint
            and not self.issues
        )

    def redacted(self) -> dict:
        """وصف آمن — مسارات IHR تُبلّغ كـ«مضبوطة/غير مضبوطة» لا كقيم."""
        return {
            'namespace': 'IHR',
            'state': self.state.value,
            'enabled': self.enabled,
            'base_url': self.base_url,
            'token_url': self.token_url,
            'timeout_seconds': self.timeout,
            'client_id_set': bool(self.client_id),
            'client_secret_set': bool(self.client_secret),
            'events_path_configured': self.has_events_endpoint,
            'status_path_configured': self.has_status_endpoint,
            'legacy_env_names': list(self.legacy_env_names),
            'issues': list(self.issues),
        }


def load_ihr_configuration(
    *,
    base_url=None,
    token_url=None,
    client_id=None,
    client_secret=None,
    timeout=None,
) -> IHRConfiguration:
    """يبني إعدادات IHR: قيمة صريحة ← settings ← فارغ (لا افتراضيات).

    ``base_url`` الافتراضي فارغ عمداً: لا يوجد خادم IHR رسمي معتمد في
    المشروع، والقيمة تُؤخذ من ``WHOIntegration.base_url`` عند التشغيل.
    """
    resolved_base = (base_url or text_setting(SETTING_IHR_BASE_URL)).rstrip('/')
    # لا اشتقاق لنقطة التوكن: WHO_IHR_TOKEN_URL يجب ضبطه صراحةً. الاشتقاق
    # التاريخي من الأساس أُزيل (سلوك سابق موثّق في الـrunbook فقط).
    resolved_token = (token_url or text_setting(SETTING_IHR_TOKEN_URL)).rstrip('/')
    resolved_id = client_id or text_setting(SETTING_IHR_CLIENT_ID)
    resolved_secret = client_secret or text_setting(SETTING_IHR_CLIENT_SECRET)
    resolved_timeout = float(timeout) if timeout else _timeout(SETTING_IHR_TIMEOUT, _timeout(SETTING_TIMEOUT))

    resolved_events_path = text_setting(SETTING_IHR_EVENTS_PATH)
    resolved_status_path = text_setting(SETTING_IHR_STATUS_PATH)

    issues = []
    if resolved_base and not is_http_url(resolved_base):
        issues.append(f'{SETTING_IHR_BASE_URL} ليس رابط http/https صالحاً')
    if resolved_token and not is_http_url(resolved_token):
        issues.append(f'{SETTING_IHR_TOKEN_URL} ليس رابط http/https صالحاً')
    # مسار مكتوب لكنه غير صالح يجب أن يُبلَّغ كخطأ إعداد صريح لا أن يُهمَل بصمت.
    if resolved_events_path and not is_valid_relative_path(resolved_events_path):
        issues.append(
            f'{SETTING_IHR_EVENTS_PATH} يجب أن يكون مساراً نسبياً يبدأ بـ/ '
            '(رابط كامل مرفوض — تأكد من العقد الرسمي قبل ضبطه)'
        )
    if resolved_status_path and not is_valid_relative_path(resolved_status_path):
        issues.append(
            f'{SETTING_IHR_STATUS_PATH} يجب أن يكون مساراً نسبياً يبدأ بـ/ '
            '(رابط كامل مرفوض — تأكد من العقد الرسمي قبل ضبطه)'
        )

    return IHRConfiguration(
        enabled=_flag(SETTING_ENABLED),
        base_url=resolved_base,
        token_url=resolved_token,
        client_id=resolved_id,
        client_secret=resolved_secret,
        timeout=resolved_timeout,
        events_path=resolved_events_path,
        status_path=resolved_status_path,
        issues=tuple(issues),
        legacy_env_names=legacy_env_in_use(),
    )


def describe_configurations() -> dict:
    """تقرير تشخيصي موحّد (بدون أسرار) لحالة التكاملين."""
    return {
        'enabled': _flag(SETTING_ENABLED),
        'timeout_seconds': _timeout(SETTING_TIMEOUT),
        'icd11': load_icd_configuration().redacted(),
        'ihr': load_ihr_configuration().redacted(),
    }
