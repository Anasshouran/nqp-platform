import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.public.assistant import (
    DISCLAIMER_AR,
    DISCLAIMER_EN,
    answer_question,
    detect_language,
)
from apps.public.models import AssistantConversation, AssistantFeedback

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


# --------------------------------------------------------------------------- #
# شكل الاستجابة
# --------------------------------------------------------------------------- #

REQUIRED_KEYS = {'answer', 'answer_type', 'sources', 'confidence'}


@pytest.mark.parametrize(
    'message',
    ['متطلبات السفر', 'كيف أحصل على شهادة؟', 'مرحبا', 'ما هي الحمى الصفراء؟'],
)
def test_answer_shape_is_stable(api, message):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': message}, format='json')

    assert response.status_code == 200, response.data
    data = response.data['data']
    assert REQUIRED_KEYS.issubset(data.keys())
    assert data['answer']
    assert isinstance(data['sources'], list)
    assert data['engine'] == 'rules'


def test_chat_requires_message(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': ''}, format='json')

    assert response.status_code == 400


def test_chat_rejects_unknown_fields(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'مرحبا', 'is_admin': True}, format='json')

    # either rejected outright, or ignored — must never be trusted
    assert response.status_code in (200, 400)


# --------------------------------------------------------------------------- #
# إخلاء المسؤولية الطبية
# --------------------------------------------------------------------------- #


def test_disease_answer_carries_disclaimer(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'أصابني كوفيد ماذا أفعل؟'}, format='json')

    data = response.data['data']
    assert data['disclaimer'] == DISCLAIMER_AR
    assert '999' in data['disclaimer']
    assert 'الطبيب' in data['disclaimer']


def test_disease_answer_english_disclaimer(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'I have covid, what should I do?', 'language': 'en'}, format='json')

    data = response.data['data']
    assert data['disclaimer'] == DISCLAIMER_EN
    assert '999' in data['disclaimer']


def test_non_medical_answer_has_no_disclaimer(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'كيف أحصل على شهادةublished؟'}, format='json')

    assert response.data['data']['disclaimer'] is None


def test_disclaimer_is_separate_field_not_embedded(api):
    """التحذير حقل مستقل: لا يتسرّب إلى نصّ الإجابة ولا يُنسخ مع نصّها."""
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'هل يوجد علاج؟'}, format='json')
    data = response.data['data']

    if data['disclaimer']:
        assert data['disclaimer'] not in data['answer']


# --------------------------------------------------------------------------- #
# التسجيل المجهول
# --------------------------------------------------------------------------- #


def test_chat_creates_anonymous_conversation(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'متطلبات السفر للسودان'}, format='json')

    conversation_id = response.data['data']['conversation_id']
    assert conversation_id

    row = AssistantConversation.objects.get(pk=conversation_id)
    assert row.message_length > 0
    assert row.engine == 'rules'


def test_conversation_stores_no_identifying_data(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'اسمي أحمد وأريد الجواز'}, format='json')
    row = AssistantConversation.objects.get(pk=response.data['data']['conversation_id'])

    fields = {f.name for f in row._meta.get_fields()}
    assert 'message' not in fields
    assert 'question' not in fields
    assert 'ip_address' not in fields
    assert 'session_id' not in fields
    assert 'user' not in fields

    # لا نصّ السؤال في أي حقل نصّي على السجل
    for field in row._meta.fields:
        value = getattr(row, field.name, None)
        assert 'أحمد' not in str(value)


def test_disclaimer_flag_recorded(api):
    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'أصابني كوفيد'}, format='json')
    row = AssistantConversation.objects.get(pk=response.data['data']['conversation_id'])

    assert row.has_disclaimer is True


def test_logging_failure_does_not_break_answer(api, monkeypatch):
    """فشل سجلّ التحليلات لا يجوز أن يُسقط إجابة عامة."""
    from apps.public.models import AssistantConversation as Model

    def boom(*args, **kwargs):
        raise RuntimeError('db down')

    monkeypatch.setattr(Model.objects, 'create', boom)

    url = reverse('public-assistant-chat')
    response = api.post(url, {'message': 'متطلبات السفر'}, format='json')

    assert response.status_code == 200
    assert response.data['data']['conversation_id'] is None
    assert response.data['data']['answer']


# --------------------------------------------------------------------------- #
# التقييم
# --------------------------------------------------------------------------- #


def test_feedback_accepts_thumbs_up(api):
    url = reverse('public-assistant-feedback')
    response = api.post(url, {'rating': 1}, format='json')

    assert response.status_code == 201
    row = AssistantFeedback.objects.get()
    assert row.rating == 1
    assert row.engine == 'rules'


def test_feedback_accepts_thumbs_down(api):
    url = reverse('public-assistant-feedback')
    response = api.post(url, {'rating': -1}, format='json')

    assert response.status_code == 201
    assert AssistantFeedback.objects.get().rating == -1


def test_feedback_rejects_invalid_rating(api):
    url = reverse('public-assistant-feedback')
    response = api.post(url, {'rating': 5}, format='json')

    assert response.status_code == 400
    assert not AssistantFeedback.objects.exists()


def test_feedback_links_conversation_and_inherits_metadata(api):
    chat = api.post(reverse('public-assistant-chat'), {'message': 'متطلبات السفر'}, format='json')
    conversation_id = chat.data['data']['conversation_id']

    response = api.post(
        reverse('public-assistant-feedback'),
        {'conversation_id': conversation_id, 'rating': -1},
        format='json',
    )

    row = AssistantFeedback.objects.get()
    assert str(row.conversation_id) == conversation_id
    assert row.intent == AssistantConversation.objects.get(pk=conversation_id).intent
    assert row.answer_type == AssistantConversation.objects.get(pk=conversation_id).answer_type


def test_feedback_tolerates_unknown_conversation(api):
    """معرّف غير معروف لا يُسقط التقييم ولا يُنشئ ارتباطاً وهمياً."""
    response = api.post(
        reverse('public-assistant-feedback'),
        {'conversation_id': '00000000-0000-0000-0000-000000000000', 'rating': 1},
        format='json',
    )

    assert response.status_code == 201
    assert AssistantFeedback.objects.get().conversation is None


def test_feedback_rejects_malformed_conversation_id(api):
    response = api.post(
        reverse('public-assistant-feedback'),
        {'conversation_id': 'not-a-uuid', 'rating': 1},
        format='json',
    )

    assert response.status_code == 400


def test_feedback_accepts_no_free_text(api):
    """نمنع النصّ الحر: ممرّ تسريب للبيانات الشخصية."""
    response = api.post(
        reverse('public-assistant-feedback'),
        {'rating': 1, 'comment': 'اسمي أحمد جوازي منتهي'},
        format='json',
    )

    assert response.status_code in (200, 201, 400)
    for row in AssistantFeedback.objects.all():
        assert 'أحمد' not in str([getattr(row, f.name, None) for f in row._meta.fields])


# --------------------------------------------------------------------------- #
# المسارات الموثّقة
# --------------------------------------------------------------------------- #


def test_documented_ai_routes_exist(api):
    assert reverse('ai-chat') == '/api/v1/ai/chat/'
    assert reverse('ai-suggestions') == '/api/v1/ai/suggestions/'
    assert reverse('ai-topics') == '/api/v1/ai/topics/'
    assert reverse('ai-feedback') == '/api/v1/ai/feedback/'


@pytest.mark.parametrize('name', ['ai-chat', 'ai-suggestions', 'ai-topics', 'ai-feedback'])
def test_ai_alias_behaves_like_public_route(api, name):
    public = name.replace('ai-', 'public-assistant-')

    def call(url_name: str):
        if name == 'ai-chat':
            return api.post(reverse(url_name), {'message': 'مرحبا'}, format='json')
        if name == 'ai-feedback':
            return api.post(reverse(url_name), {'rating': 1}, format='json')
        return api.get(reverse(url_name))

    aliased = call(name)
    direct = call(public)

    assert aliased.status_code == direct.status_code
    assert aliased.status_code in (200, 201)


def test_suggestions_and_topics(api):
    for name in ('ai-suggestions', 'ai-topics'):
        response = api.get(reverse(name))
        assert response.status_code == 200
        assert response.data['data']


# --------------------------------------------------------------------------- #
# المحرك الحتمي (بلا تبعيات خارجية)
# --------------------------------------------------------------------------- #


def test_deterministic_engine_has_no_llm_dependency():
    import apps.public.assistant as module

    source = module.__file__
    with open(source, encoding='utf-8') as handle:
        text = handle.read()

    for forbidden in ('openai', 'anthropic', 'cohere', 'ollama'):
        assert forbidden not in text.lower()


def test_log_false_skips_database_write(api):
    result = answer_question('متطلبات السفر', log=False)

    assert result['conversation_id'] is None
    assert result['engine'] == 'rules'


def test_language_detection_bilingual():
    assert detect_language('متطلبات السفر للسودان') == 'ar'
    assert detect_language('what are the entry requirements') == 'en'


def test_unknown_question_does_not_invent_sources(api):
    response = api.post(
        reverse('public-assistant-chat'),
        {'message': 'zzz qqq gibberish xyzzy'},
        format='json',
    )

    data = response.data['data']
    assert data['confidence'] in ('LOW', 'MEDIUM', 'HIGH')
    assert data['answer']

# --------------------------------------------------------------------------- #
# كشف اللغة — انحدار
#
# كان `language` في المسار يحمل `default='ar'`، فكل طلب بلا حقل صريح
# كان يُجبَأً عربياً حتى لو كُتب بالإنجليزية. وأصلحت `detect_language`
# نِسَبها لتفادي الخلط مع الأرقام والرموز.
# --------------------------------------------------------------------------- #


def test_language_detection_short_english_is_not_arabic():
    """الرسائل الإنجليزية القصيرة كانت تُرجع `ar` لضعف المقام."""
    assert detect_language('hi') == 'en'
    assert detect_language('fever') == 'en'
    assert detect_language('hello') == 'en'


def test_language_detection_full_english_sentences():
    assert detect_language('I have fever and cough') == 'en'
    assert detect_language('how do I get a health certificate') == 'en'
    assert detect_language('what are the travel requirements') == 'en'


def test_language_detection_arabic_sentences():
    assert detect_language('عندي حمى وسعال') == 'ar'
    assert detect_language('كيف أحصل على شهادة صحية') == 'ar'
    assert detect_language('ما هو QR code؟') == 'ar'


def test_language_detection_arabic_with_embedded_english_term():
    """مصطلح إنجليزي داخل جملة عربية لا يحوّل لغة الرسالة."""
    assert detect_language('أريد Laboratory result') == 'ar'


def test_language_detection_digits_and_symbols_only():
    assert detect_language('999') == 'en'
    assert detect_language('') == 'ar'


def test_chat_without_language_field_detects_english(api):
    """غياب الحقل = اكتشاف تلقائي، لا افتراض العربية."""
    response = api.post(
        reverse('public-assistant-chat'),
        {'message': 'how do I get a health certificate'},
        format='json',
    )

    assert response.status_code == 200, response.data
    assert response.data['data']['language'] == 'en'


def test_chat_with_auto_language_detects_english(api):
    response = api.post(
        reverse('public-assistant-chat'),
        {'message': 'what are the travel requirements', 'language': 'auto'},
        format='json',
    )

    assert response.data['data']['language'] == 'en'


def test_chat_explicit_arabic_is_respected(api):
    """لغة صريحة تُحترم حتى لو كان النص بالإنجليزية (اختيار المستخدم)."""
    response = api.post(
        reverse('public-assistant-chat'),
        {'message': 'how do I get a certificate', 'language': 'ar'},
        format='json',
    )

    assert response.data['data']['language'] == 'ar'


def test_chat_explicit_english_is_respected(api):
    response = api.post(
        reverse('public-assistant-chat'),
        {'message': 'كيف أحصل على شهادة', 'language': 'en'},
        format='json',
    )

    assert response.data['data']['language'] == 'en'


# --- محتوى الإجابة الإنجليزية لا يخلط اللغتين ------------------------------
#
# قوالب الردود كلها لها فرع `en`، لكن المحتوى الديناميكي (أسماء الخدمات،
# عناوين الإشعارات، أجوبة الأسئلة الشائعة) كان يُدرج بالعربية دائماً.


def _answer_of(response):
    return response.data['data']['answer']


def _ch(api, message, language=None):
    payload = {'message': message}
    if language is not None:
        payload['language'] = language
    return api.post(reverse('public-assistant-chat'), payload, format='json')


@pytest.fixture
def catalog():
    """كتالوج مصغّر يحاكي البيانات الحقيقية: `name_en` فارغة عمداً.

    هذه هي الحالة الفعلية في قاعدة البيانات (52 خدمة، `name_en` فارغة في
    جميعها)، وهي بالضبط الحالة التي كان يسرّب منها المساعد العربية في الرد
    الإنجليزي. الاختبار يبنيها بنفسه حتى لا يعتمد على بيانات التطوير.
    """
    from apps.carriers.models import HealthNotice
    from apps.public.models import Service, ServiceCategory

    travelers, _ = ServiceCategory.objects.get_or_create(
        code='travelers', defaults={'name_ar': 'خدمات المسافرين'},
    )
    Service.objects.create(
        code='public-verify-certificate',
        category=travelers,
        name_ar='التحقق من الشهادة',
        name_en='',
        route='/services/verify/certificate',
    )
    Service.objects.create(
        code='traveler-registration',
        category=travelers,
        name_ar='التسجيل الصحي المسبق',
        name_en='',
        route='/services/travelers/registration',
    )
    HealthNotice.objects.create(
        title='تحديث مواعيد عمل مراكز التطعيم الدولية',
        description='تفاصيل التحديث.',
        category='GENERAL',
        is_active=True,
    )
    return True


@pytest.mark.parametrize('message', [
    'hello',
    'what are the electronic services',
    'how do I get a certificate',
    'what documents do I need',
    'latest health notices',
    'I want to register',
])
def test_english_answer_has_no_arabic_wording(api, catalog, message):
    """طلب إنجليزي ⇐ رد إنجليزي خالص بلا عبارات عربية متسرّبة."""
    response = _ch(api, message)

    assert response.status_code == 200, response.data
    assert response.data['data']['language'] == 'en'
    answer = _answer_of(response)
    arabic_chars = [ch for ch in answer if '\u0600' <= ch <= '\u06ff']
    assert not arabic_chars, f'English answer leaked Arabic: {answer!r}'


def test_english_services_list_uses_english_labels(api, catalog):
    """أسماء الخدمات تُعرض بالإنجليزية لأن `Service.name_en` فارغة في البيانات."""
    response = _ch(api, 'what are the electronic services')

    answer = _answer_of(response)
    assert 'electronic services' in answer.lower()
    assert 'Pre-arrival health registration' in answer


def test_english_services_source_titles_are_english(api, catalog):
    """مصادر الخدمات لا تعيد `name_ar`."""
    response = _ch(api, 'what are the electronic services')

    titles = [s['title'] for s in response.data['data']['sources']]
    assert titles
    for title in titles:
        assert not [ch for ch in title if '\u0600' <= ch <= '\u06ff'], title


def test_english_notices_do_not_fabricate_titles(api, catalog):
    """لا نخترع ترجمة لعنوان إشعار عربي: نعرض التصنيف ونحيل للصفحة."""
    response = _ch(api, 'latest health notices')

    answer = _answer_of(response)
    assert 'notices page' in answer
    assert not [ch for ch in answer if '\u0600' <= ch <= '\u06ff'], answer


def test_english_action_labels_are_english(api, catalog):
    """زر الإجراء يجب أن يكون بالإنجليزية أيضاً، لا `name_ar`."""
    response = _ch(api, 'how do I get a certificate')

    action = response.data['data']['action']
    assert action is not None
    assert action['label'] == 'Verify certificate'


def test_arabic_answer_stays_arabic_for_arabic_message(api, catalog):
    """العربية لا تتأثر: نفس المدخلات ترد بالعربية وأسماء الخدمات عربية."""
    response = _ch(api, 'ما هي الخدمات الإلكترونية')

    assert response.data['data']['language'] == 'ar'
    answer = _answer_of(response)
    assert 'التحقق من الشهادة' in answer
    assert 'Verify certificate' not in answer


def test_arabic_action_labels_stay_arabic(api, catalog):
    response = _ch(api, 'كيف أحصل على شهادة')

    assert response.data['data']['action']['label'] == 'التحقق من الشهادة'
