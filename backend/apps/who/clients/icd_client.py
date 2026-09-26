"""عميل تصنيف ICD-11 الرسمي من منصة WHO (بحث/عنصر/مزامنة)."""

from typing import Optional

import httpx

from apps.who.clients.base_client import WHOClientError

# نقاط نهاية WHO ICD-API الرسمية (إصدار 2):
#   Auth:  https://icdaccessmanagement.who.int/connect/token
#   API:   https://id.who.int/icd/...  (يُشترط رأس API-Version: v2)
WHO_API_BASE_URL = 'https://id.who.int'
WHO_API_TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
WHO_API_VERSION = 'v2'
WHO_OAUTH_SCOPE = 'icdapi_access'
WHO_OAUTH_GRANT = 'client_credentials'


class ICD11Client:
    """وصول إلى واجهة OECD/WHO ICD-11 API مع fallback إلى قاعدة البيانات المحلية."""

    def __init__(
        self,
        base_url: str = WHO_API_BASE_URL,
        client_id: str = '',
        client_secret: str = '',
        timeout: float = 15.0,
        token_url: str = WHO_API_TOKEN_URL,
    ):
        self.base_url = (base_url or WHO_API_BASE_URL).rstrip('/')
        self.token_url = (token_url or WHO_API_TOKEN_URL).rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token_cache: Optional[str] = None

    def _token(self) -> str:
        if self._token_cache:
            return self._token_cache
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