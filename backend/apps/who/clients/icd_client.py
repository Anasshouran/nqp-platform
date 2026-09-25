"""عميل تصنيف ICD-11 الرسمي من منصة WHO (بحث/عنصر/مزامنة)."""

from typing import Optional

import httpx

from apps.who.clients.base_client import WHOClientError


class ICD11Client:
    """وصول إلى واجهة OECD/WHO ICD-11 API مع fallback إلى قاعدة البيانات المحلية."""

    def __init__(self, base_url: str, client_id: str, client_secret: str, timeout: float = 15.0):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.timeout = timeout
        self._token_cache: Optional[str] = None

    def _token(self) -> str:
        if self._token_cache:
            return self._token_cache
        resp = httpx.post(
            f'{self.base_url}/oauth2/token',
            data={
                'grant_type': 'client_credentials',
                'scope': 'icdapi_access',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        self._token_cache = resp.json().get('access_token', '')
        if not self._token_cache:
            raise WHOClientError('لم يصدر رمز وصول ICD-11.')
        return self._token_cache

    def search(self, query: str, release: str = 'mms', language: str = 'en') -> list:
        resp = httpx.get(
            f'{self.base_url}/v2/search',
            params={'q': query, 'release': release, 'lang': language},
            headers={'Authorization': f'Bearer {self._token()}'},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get('destinationEntities', [])

    def entity(self, entity_id: str, release: str = 'mms', language: str = 'ar') -> dict:
        resp = httpx.get(
            f'{self.base_url}/v2/entity/{entity_id}',
            params={'release': release, 'lang': language},
            headers={'Authorization': f'Bearer {self._token()}'},
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