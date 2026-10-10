"""عميل تصنيف ICD-11 من منصة WHO — طبقة النقل فقط.

الإعدادات وعقدها في ``apps.who.config``؛ هنا فقط كيفية إرسال الطلب.

نقاط النهاية الرسمية المعتمدة في هذا المشروع (ICD-API v2):
  Auth : https://icdaccessmanagement.who.int/connect/token
  API  : https://id.who.int/icd/...  (يتطلب رأس API-Version: v2)
  OAuth: HTTP Basic + grant_type=client_credentials + scope=icdapi_access

انضباط Phase 0: لا يُطلب أي توكن عند الاستيراد ولا عند البناء، ولا قبل التأكد
من الصلاحية؛ التهيئة المغلقة تمنع إرسال أي طلب.
"""

import re
from typing import Optional

import httpx

from apps.who.clients.base_client import (
    WHOClientError,
    WHOClientValidationError,
    WHOExternalAccessDisabled,
)
from apps.who.config import (
    SETTING_ENABLED,
    SETTING_ICD_CLIENT_ID,
    SETTING_ICD_CLIENT_SECRET,
    is_valid_language,
    load_icd_configuration,
)

#: نطاق الحروف العربية (Basic Arabic + Supplement + Extended-A).
_ARABIC_RANGE = re.compile(r'[؀-ۿݐ-ݿ]')


def _is_arabic(text: str) -> bool:
    """هل يحتوي النص حرفاً عربياً؟ يُقرّر لغة الاستعلام في ``find_by_name``."""
    return bool(_ARABIC_RANGE.search(text or ''))


class ICD11Client:
    """وصول إلى واجهة WHO ICD-11 API.

    الافتراضيات تُقرأ من الإعدادات (``WHO_ICD_*``)، ويمكن تجاوزها صراحةً
    عند البناء. لا يجري أي طلب شبكي إلا عند استدعاء ``search`` أو ``entity``.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        timeout: Optional[float] = None,
        token_url: Optional[str] = None,
    ):
        self.config = load_icd_configuration(
            base_url=base_url,
            client_id=client_id,
            client_secret=client_secret,
            timeout=timeout,
            token_url=token_url,
        )
        self.base_url = self.config.base_url
        self.token_url = self.config.token_url
        self.client_id = self.config.client_id
        self.client_secret = self.config.client_secret
        self.timeout = self.config.timeout
        self.api_version = self.config.api_version
        self.scope = self.config.scope
        self._token_cache: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """هل بيانات الاعتماد متوفرة؟ تُفحص قبل أي طلب شبكي."""
        return self.config.has_credentials

    @property
    def is_enabled(self) -> bool:
        """هل التكامل مفعّل وصالح للإرسال؟"""
        return self.config.can_connect

    def _assert_ready(self, language: Optional[str] = None) -> None:
        """حراسة مشتركة قبل أي طلب: لغة ← اعتماد ← إعدادات سليمة ← تفعيل.

        ترتيب الفحص مقصود: غياب الاعتماد هو العطل الجذري ويُبلَّغ كخطأ عميل
        عام، أما التعطيل فيُبلَّغ فقط عندما تكون الاعتمادادات سليمة.
        """
        if language is not None and not is_valid_language(language):
            raise WHOClientValidationError(
                f'لغة غير مدعومة: {language!r} — استخدم رمز لغة قياسي (ar / en مدعومان).'
            )
        problems = []
        if not self.config.has_credentials:
            problems.append(
                f'بيانات الاعتماد غير مضبوطة: {SETTING_ICD_CLIENT_ID} / {SETTING_ICD_CLIENT_SECRET}'
            )
        problems.extend(self.config.issues)
        if problems:
            raise WHOClientError('تعذّر الاتصال بخدمة WHO ICD-11 — ' + '، '.join(problems) + '.')
        if not self.config.enabled:
            raise WHOExternalAccessDisabled(
                f'التكامل مع منظمة الصحة العالمية معطّل عبر {SETTING_ENABLED}=false — '
                'لم يُرسل أي طلب إلى ICD-11.'
            )

    def _token(self) -> str:
        if self._token_cache:
            return self._token_cache
        self._assert_ready()
        resp = httpx.post(
            self.token_url,
            auth=(self.client_id, self.client_secret),
            data={
                'grant_type': 'client_credentials',
                'scope': self.scope,
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
            'API-Version': self.api_version,
            'Accept-Language': language,
        }

    def search(self, query: str, release: str = 'mms', language: str = 'en') -> list:
        """بحث نصي في التصنيف. ``language`` يقبل ar / en ضمن نطاق ICD-11."""
        self._assert_ready(language)
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
        """جلب كيان واحد بمعرّفه (URI كامل أو كود مختصر)."""
        self._assert_ready(language)
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
        """بحث بالاسم ثم جلب أفضل نتيجة. يفشل بهدوء إن لم يوجد تطابق.

        ``language`` هي لغة **العرض** لا لغة الاستعلام. الاستعلام يُرسل
        بلغة الاسم نفسه: مفهرس ICD-11 لكل لغة مستقل، فبحثٌ عن ``"Cholera"``
        في الفهرس العربي يُرجع اللقاحات غير المترجمة
        (``Cholera, live attenuated vaccines``) بينما يُرجع الفهرس
        الإنجليزي مفهوم المرض نفسه. خلط اللغتين يُنتج ربطاً خاطئاً صامتاً.
        """
        query_language = 'ar' if _is_arabic(name_en) else 'en'
        results = self.search(name_en, language=query_language)
        if not results:
            return None
        first = results[0]
        try:
            return self.entity(first.get('id', ''), language=language)
        except httpx.HTTPError:
            return {'code': first.get('id', ''), 'klass': name_en}

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<ICD11Client base_url={self.base_url} client_id_set={bool(self.client_id)}>'
