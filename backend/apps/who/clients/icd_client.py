"""عميل تصنيف ICD-11 الرسمي من منصة WHO (بحث/عنصر/مزامنة)."""

from typing import Optional

import httpx
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from apps.who.clients.base_client import WHOClientError

# نقاط نهاية WHO ICD-API الرسمية (إصدار 2):
#   Auth:  https://icdaccessmanagement.who.int/connect/token
#   API:   https://id.who.int/icd/...  (يُشترط رأس API-Version: v2)
WHO_API_BASE_URL = 'https://id.who.int'
WHO_API_TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
WHO_API_VERSION = 'v2'
WHO_OAUTH_SCOPE = 'icdapi_access'
WHO_OAUTH_GRANT = 'client_credentials'


def _setting(name: str, fallback: str = '') -> str:
    """قراءة إعداد مركزي من Django settings مع الرجوع للافتراضي غير السري.

    الغرض: إبقاء بيانات الاعتماد في البيئة (WHO_ICD_*) ومصدرها settings وحده،
    دون كسر استيراد أو استخدام هذا العميل خارج Django أو قبل تهيئة الإعدادات.
    """
    try:
        value = getattr(settings, name, fallback)
    except ImproperlyConfigured:
        return fallback
    return value or fallback


class ICD11Client:
    """وصول إلى واجهة WHO ICD-11 API.

    الافتراضيات تُقرأ من الإعدادات المركزية (WHO_ICD_BASE_URL / WHO_ICD_TOKEN_URL /
    WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET)، ويمكن تجاوزها صراحةً عند البناء.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        timeout: float = 15.0,
        token_url: Optional[str] = None,
    ):
        self.base_url = (base_url or _setting('WHO_ICD_BASE_URL', WHO_API_BASE_URL)).rstrip('/')
        self.token_url = (token_url or _setting('WHO_ICD_TOKEN_URL', WHO_API_TOKEN_URL)).rstrip('/')
        self.client_id = client_id or _setting('WHO_ICD_CLIENT_ID')
        self.client_secret = client_secret or _setting('WHO_ICD_CLIENT_SECRET')
        self.timeout = timeout
        self._token_cache: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """هل بيانات الاعتماد متوفرة؟ تُفحص قبل أي طلب شبكي."""
        return bool(self.client_id and self.client_secret)

    def _token(self) -> str:
        if self._token_cache:
            return self._token_cache
        if not self.is_configured:
            raise WHOClientError(
                'بيانات اعتماد WHO ICD-11 غير مُهيّأة — يجب ضبط '
                'WHO_ICD_CLIENT_ID و WHO_ICD_CLIENT_SECRET في البيئة.'
            )
        resp = httpx.post(
            self.token_url,
            auth=(self.client_id, self.client_secret),
            data={
                'grant_type': WHO_OAUTH_GRANT,
                'scope': WHO_OAUTH_SCOPE,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        self._token_cache = resp.json().get('access_token', '')
        if not self._token_cache:
            raise WHOClientError('لم يصدر رمز وصول ICD-11.')
        return self._token_cache

    def _api_headers(self, language: str) -> dict:
        return {
            'Authorization': f'Bearer {self._token()}',
            'Accept': 'application/json',
            'API-Version': WHO_API_VERSION,
            'Accept-Language': language,
        }

    def search(self, query: str, release: str = 'mms', language: str = 'en') -> list:
        params = {'q': query}
        if release and release != 'mms':
            params['releaseId'] = release
        resp = httpx.get(
            f'{self.base_url}/icd/entity/search',
            params=params,
            headers=self._api_headers(language),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get('destinationEntities', [])

    def entity(self, entity_id: str, release: str = 'mms', language: str = 'ar') -> dict:
        if entity_id.startswith('http://'):
            url = f'https://{entity_id[len("http://"):]}'
        elif entity_id.startswith('https://'):
            url = entity_id
        else:
            url = f'{self.base_url}/icd/entity/{entity_id}'
        params = {}
        if release and release != 'mms':
            params['release'] = release
        resp = httpx.get(
            url,
            params=params,
            headers=self._api_headers(language),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def find_by_name(self, name_en: str, language: str = 'ar') -> Optional[dict]:
        results = self.search(name_en, language=language)
        if not results:
            return None
        first = results[0]
        try:
            return self.entity(first.get('id', ''), language=language)
        except httpx.HTTPError:
            return {'code': first.get('id', ''), 'klass': name_en}