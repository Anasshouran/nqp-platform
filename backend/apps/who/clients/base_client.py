"""عميل HTTP أساسي للتواصل مع منظمة الصحة العالمية."""

from typing import Any, Optional

import httpx
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone

from apps.who.models import WHOSyncLog, WHOIntegration


class WHOClientError(Exception):
    """خطأ في الاتصال بمنظمة الصحة العالمية."""


def _setting(name: str, fallback: str = '') -> str:
    """قراءة إعداد مركزي من Django settings مع الرجوع للافتراضي.

    ملاحظة: نسخة مطابقة لـ apps.who.clients.icd_client._setting — التوحيد 후보
    في مرحلة لاحقة (وحدة مشتركة) لتفادي التكرار.
    """
    try:
        value = getattr(settings, name, fallback)
    except ImproperlyConfigured:
        return fallback
    return value or fallback


class OAuth2TokenProvider:
    """مدير رمز الوصول OAuth2 العمليات-الاعتماد (client credentials)."""

    def __init__(
        self,
        base_url: str,
        client_id: str,
        client_secret: str,
        timeout: float = 10.0,
        token_url: str = '',
    ):
        self.token_url = (token_url or f'{base_url.rstrip("/")}/oauth2/token').rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._access_token: Optional[str] = None

    def get_token(self) -> str:
        if self._access_token:
            return self._access_token
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


class WHOClient:
    """عميل REST قصير العمر لمنظمة الصحة العالمية مع تسجيل السجلات.

    ترتيب مصدر الاعتمادادات: تمرير صريح ← الإعدادات (WHO_IHR_*) ← WHOIntegration (fallback أخير).
    يبقى WHOIntegration مصدراً لحالة التكامل (base_url/environment) ومرجعاً للتدقيق.
    """

    def __init__(
        self,
        integration: WHOIntegration,
        timeout: float = 15.0,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_url: str = '',
    ):
        self.integration = integration
        self.timeout = timeout
        self.base_url = integration.base_url.rstrip('/')
        self.client_id = client_id or _setting('WHO_IHR_CLIENT_ID') or integration.client_id
        self.client_secret = (
            client_secret or _setting('WHO_IHR_CLIENT_SECRET') or integration.client_secret
        )
        self._token_provider = None
        if integration.authentication_type == WHOIntegration.AuthType.OAUTH2:
            self._token_provider = OAuth2TokenProvider(
                self.base_url,
                self.client_id,
                self.client_secret,
                token_url=token_url or _setting('WHO_IHR_TOKEN_URL'),
            )

    @property
    def is_configured(self) -> bool:
        """هل تتوفر بيانات اعتماد صالحة لنمط المصادقة المستخدم؟"""
        auth_type = self.integration.authentication_type
        if auth_type == WHOIntegration.AuthType.NONE:
            return True
        if auth_type == WHOIntegration.AuthType.API_KEY:
            return bool(self.client_id)
        return bool(self.client_id and self.client_secret)

    def _headers(self) -> dict:
        if not self.is_configured:
            raise WHOClientError(
                'بيانات اعتماد WHO IHR غير مُهيّأة — يجب ضبط WHO_IHR_CLIENT_ID '
                'و WHO_IHR_CLIENT_SECRET في البيئة أو تخزينها في تكامل WHO.'
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
                body: Any = response.json()
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


def test_connection(integration: WHOIntegration) -> dict:
    """اختبار اتصال سريع بنقطة نهاية الحالة لدى WHO."""
    client = WHOClient(integration)
    try:
        result = client.get(WHOSyncLog.Operation.STATUS_CHECK, '/api/v1/status', resource_type='system')
        return {'connected': True, **result}
    except WHOClientError:
        return {'connected': False}