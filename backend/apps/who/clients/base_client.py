"""طبقة النقل (transport) للتواصل مع منظمة الصحة العالمية.

الفصل عن الإعدادات: الأسماء والقيم والتحقق منها في ``apps.who.config``؛
هنا فقط كيفية إرسال الطلب.

انضباط Phase 0:

* لا يُطلب أي توكن عند الاستيراد ولا عند البناء — التوكن كسول عند أول استخدام.
* لا تُطبع الأسرار ولا يُخزَّن التوكن في أي ``__repr__`` أو رسالة خطأ.
* لا يُفترض أن مساراً داخلياً من ``/api/v1/...`` هو نقطة WHO خارجية؛ مسارات
  IHR تأتي من الإعدادات صراحةً (WHO_IHR_EVENTS_PATH / WHO_IHR_STATUS_PATH)،
  وتبقى فارغة حتى تتأكد جهة الاتصال من العقد الرسمي.
"""

from typing import Optional

import httpx
from django.utils import timezone

from apps.who.config import (
    SETTING_ENABLED,
    SETTING_IHR_CLIENT_ID,
    SETTING_IHR_CLIENT_SECRET,
    SETTING_IHR_TOKEN_URL,
    load_ihr_configuration,
    text_setting,
)
from apps.who.models import WHOSyncLog, WHOIntegration


class WHOClientError(Exception):
    """خطأ في الاتصال بمنظمة الصحة العالمية."""


class WHOExternalAccessDisabled(WHOClientError):
    """التكامل مع WHO معطّل صراحةً (WHO_ENABLED=false) — لا تُرسل أي طلب."""


class WHOClientValidationError(WHOClientError):
    """مدخلات أو إعدادات غير صالحة — refus قبل أي طلب خارجي."""


class OAuth2TokenProvider:
    """مصدر رمز الوصول OAuth2 بتفويض client-credentials.

    التوكن كسول (lazy): لا يُطلب عند البناء، ويُحفظ في الذاكرة فقط.
    """

    def __init__(
        self,
        base_url: str,
        client_id: str,
        client_secret: str,
        timeout: Optional[float] = None,
        token_url: str = '',
    ):
        self.base_url = base_url
        # لا اشتقاق لنقطة التوكن: تُمرَّر صراحةً أو تُضبط عبر WHO_IHR_TOKEN_URL.
        # الاشتقاق التاريخي {base_url}/oauth2/token أُزيل بالكامل.
        self.token_url = (token_url or '').rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = float(timeout) if timeout else 15.0
        self._access_token: Optional[str] = None

    def get_token(self) -> str:
        if self._access_token:
            return self._access_token
        if not self.token_url:
            raise WHOClientError(
                f'لا يمكن طلب توكن IHR: نقطة التوكن غير مضبوطة — '
                f'اضبط {SETTING_IHR_TOKEN_URL} صراحةً (لا تُشتق من الأساس).'
            )
        if not self.client_id or not self.client_secret:
            raise WHOClientError(
                f'لا يمكن طلب توكن IHR: اضبط {SETTING_IHR_CLIENT_ID} و '
                f'{SETTING_IHR_CLIENT_SECRET} في البيئة.'
            )
        response = httpx.post(
            self.token_url,
            data={
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()
        self._access_token = payload.get('access_token', '')
        if not self._access_token:
            raise WHOClientError('لم يصدر رمز وصول من جهة الاصدار.')
        return self._access_token

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<OAuth2TokenProvider token_url={self.token_url} client_id_set={bool(self.client_id)}>'


class WHOClient:
    """عميل REST قصير العمر لمنظمة الصحة العالمية مع تسجيل السجلات.

    ترتيب مصدر الاعتمادادات: تمرير صريح ← الإعدادات (WHO_IHR_*) ← WHOIntegration (fallback أخير).
    يبقى WHOIntegration مصدراً لحالة التكامل (base_url/environment) ومرجعاً للتدقيق.
    """

    def __init__(
        self,
        integration: WHOIntegration,
        timeout: Optional[float] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: str = '',
    ):
        self.integration = integration
        # سلسلة المصدر كاملة: صريح ← الإعدادات (WHO_IHR_*) ← WHOIntegration
        # (fallback أخير للتوافق مع السجلات القائمة).
        resolved_client_id = (
            client_id or text_setting(SETTING_IHR_CLIENT_ID) or integration.client_id
        )
        resolved_client_secret = (
            client_secret or text_setting(SETTING_IHR_CLIENT_SECRET) or integration.client_secret
        )
        self.config = load_ihr_configuration(
            base_url=integration.base_url,
            client_id=resolved_client_id,
            client_secret=resolved_client_secret,
            token_url=token_url or None,
            timeout=timeout,
        )
        self.timeout = self.config.timeout
        self.base_url = self.config.base_url
        self.client_id = self.config.client_id
        self.client_secret = self.config.client_secret
        self._token_provider = None
        if integration.authentication_type == WHOIntegration.AuthType.OAUTH2:
            self._token_provider = OAuth2TokenProvider(
                self.base_url,
                self.client_id,
                self.client_secret,
                timeout=self.timeout,
                token_url=self.config.token_url or token_url,
            )

    @property
    def is_enabled(self) -> bool:
        """هل التكامل مفعّل عبر WHO_ENABLED؟"""
        return self.config.enabled

    @property
    def is_configured(self) -> bool:
        """هل تتوفر بيانات اعتماد صالحة لنمط المصادقة المستخدم؟"""
        auth_type = self.integration.authentication_type
        if auth_type == WHOIntegration.AuthType.NONE:
            return True
        if auth_type == WHOIntegration.AuthType.API_KEY:
            return bool(self.client_id)
        return bool(self.client_id and self.client_secret)

    def _assert_enabled(self) -> None:
        if not self.is_enabled:
            raise WHOExternalAccessDisabled(
                f'التكامل مع منظمة الصحة العالمية معطّل عبر {SETTING_ENABLED}=false — '
                'لم يُرسل أي طلب.'
            )

    def _headers(self) -> dict:
        self._assert_enabled()
        if not self.is_configured:
            raise WHOClientError(
                f'بيانات اعتماد WHO IHR غير مُهيّأة — يجب ضبط {SETTING_IHR_CLIENT_ID} '
                f'و {SETTING_IHR_CLIENT_SECRET} في البيئة أو تخزينها في تكامل WHO.'
            )
        headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
        if self.integration.authentication_type == WHOIntegration.AuthType.API_KEY:
            headers['Authorization'] = f'Bearer {self.client_id}'
        elif self._token_provider:
            headers['Authorization'] = f'Bearer {self._token_provider.get_token()}'
        return headers

    def _mark_failed(self, log: WHOSyncLog, message: str) -> None:
        log.status = WHOSyncLog.Status.FAILED
        log.error_message = message
        log.completed_at = timezone.now()
        log.save()
        self.integration.last_error = message
        self.integration.save(update_fields=['last_error'])

    def request(
        self,
        operation: str,
        method: str,
        path: str,
        resource_type: str = '',
        local_ref: str = '',
        payload: Optional[dict] = None,
    ) -> dict:
        log = WHOSyncLog.objects.create(
            integration=self.integration,
            operation=operation,
            direction=WHOSyncLog.Direction.OUTBOUND,
            resource_type=resource_type,
            local_ref=local_ref,
            request_payload=payload or {},
            status=WHOSyncLog.Status.PROCESSING,
        )
        try:
            response = httpx.request(
                method.upper(),
                f'{self.base_url}{path}',
                headers=self._headers(),
                json=payload,
                timeout=self.timeout,
            )
            log.http_status = response.status_code
            try:
                body = response.json()
            except ValueError:
                body = {'raw': response.text[:500]}
            log.response_payload = body if isinstance(body, dict) else {'data': body}
            if 200 <= response.status_code < 300:
                log.status = WHOSyncLog.Status.SUCCESS
                log.completed_at = timezone.now()
                log.save()
                self.integration.last_success_at = log.completed_at
                self.integration.last_error = ''
                self.integration.save(update_fields=['last_success_at', 'last_error'])
                return {'status_code': response.status_code, 'data': body}
            self._mark_failed(log, f'HTTP {response.status_code}: {response.text[:500]}')
            raise WHOClientError(log.error_message)
        except httpx.HTTPError as exc:
            self._mark_failed(log, str(exc))
            raise WHOClientError(str(exc))
        except WHOClientError as exc:
            # غياب الاعتمادادات أو رفض WHO: يُسجَّل الفشل ثم يُعاد الخطأ دون تسريب أي سر.
            if log.status == WHOSyncLog.Status.PROCESSING:
                self._mark_failed(log, str(exc) or 'فشل غير معروف في الاتصال بمنظمة الصحة العالمية.')
            raise

    def get(self, operation: str, path: str, resource_type: str = '', local_ref: str = '') -> dict:
        return self.request(operation, 'GET', path, resource_type=resource_type, local_ref=local_ref)

    def post(self, operation: str, path: str, payload: dict, resource_type: str = '', local_ref: str = '') -> dict:
        return self.request(operation, 'POST', path, resource_type=resource_type, local_ref=local_ref, payload=payload)

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<WHOClient base_url={self.base_url} client_id_set={bool(self.client_id)}>'


def test_connection(integration: WHOIntegration) -> dict:
    """اختبار اتصال سريع عبر نقطة الحالة **المضبوطة صراحةً** فقط.

    لا يوجد مسار افتراضي: أي مسار سابق كان مساراً داخلياً للمنصة ولا يجوز
    اعتباره نقطة WHO خارجية قبل تأكيد العقد الرسمي.
    """
    client = WHOClient(integration)
    status_path = client.config.status_path
    if not client.config.has_status_endpoint:
        return {'connected': False}
    try:
        result = client.get(WHOSyncLog.Operation.STATUS_CHECK, status_path, resource_type='system')
        return {'connected': True, **result}
    except WHOClientError:
        return {'connected': False}
