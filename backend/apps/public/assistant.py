"""NQP Smart Assistant — محرك معرفة المساعد الذكي لمنصة الحجر الصحي القومي.

مصدر الإجابة هو المحتوى الرسمي المنشور حصراً:
  - الأسئلة الشائعة (FaqItem / cms)
  - متطلبات السفر ودول المغادرة (Country + HealthNotice)
  - الإشعارات والتنبيهات الصحية (HealthNotice)
  - خدمات المنصة (Service)

لا يخمّن المساعد أي متطلبات صحية؛ بل يعتمد على البيانات المنشورة والمعتمدة.
في الوضع العام (Public Assistant) لا يتم الوصول إلى أي بيانات شخصية.
"""

from __future__ import annotations

from datetime import date

from apps.carriers.models import HealthNotice
from apps.cms.models import FaqItem
from apps.travelers.models import Country

from .models import Service

# --------------------------------------------------------------------------- #
# أدوات نصية
# --------------------------------------------------------------------------- #

AR_DIACRITICS = dict.fromkeys(map(ord, '\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0640'), None)


def normalize(text: str) -> str:
    return (text or '').translate(AR_DIACRITICS).strip()


def contains_any(text: str, keywords: list[str]) -> bool:
    t = normalize(text)
    return any(normalize(kw) in t for kw in keywords)


def detect_language(message: str) -> str:
    arabic = sum(1 for ch in message if '\u0600' <= ch <= '\u06FF')
    if arabic > 0 and arabic >= len([c for c in message if c.isalpha()]) / 2:
        return 'ar'
    return 'en'


# --------------------------------------------------------------------------- #
# التصنيف (Intent)
# --------------------------------------------------------------------------- #

class Intent:
    GREETING = 'GREETING'
    THANKS = 'THANKS'
    FAQ = 'FAQ'
    TRAVEL_REQUIREMENTS = 'TRAVEL_REQUIREMENTS'
    COUNTRY_REQUIREMENTS = 'COUNTRY_REQUIREMENTS'
    VACCINATION = 'VACCINATION'
    DOCUMENTS = 'DOCUMENTS'
    QR = 'QR'
    CERTIFICATE = 'CERTIFICATE'
    TRACKING = 'TRACKING'
    REGISTRATION = 'REGISTRATION'
    SERVICES = 'SERVICES'
    NOTICE = 'NOTICE'
    DISEASE = 'DISEASE'
    CONTACT = 'CONTACT'
    ESCALATE = 'ESCALATE'
    UNKNOWN = 'UNKNOWN'


# أنواع الإجابة (تظهر في الواجهة بشارات مميزة)
class AnswerType:
    INFO = 'INFO'          # ℹ️ معلومات
    ACTION = 'ACTION'      # ⚙️ إجراء (زر بدء)
    ALERT = 'ALERT'        # 🔔 تنبيه صحي
    SOURCE = 'SOURCE'      # 📚 مصدر رسمي
    NOT_FOUND = 'NOT_FOUND'  # ⚠️ لم أجد معلومة رسمية


GREETING_WORDS = ['مرحب', 'اهلا', 'أهلا', 'السلام عليكم', 'صباح الخير', 'مساء', 'هاي', 'hello', 'hi', 'good morning']
HELP_WORDS = ['كيف يمكنني مساعدتك', 'هل يمكنني مساعدتك', 'كيف أساعدك', 'help me', 'can you help']
THANKS_WORDS = ['شكرا', 'شكراً', 'جزاك الله', 'thanks', 'thank you']
CONTACT_WORDS = ['تواصل', 'اتصال', 'رقم الهاتف', 'خط_sاخن', 'حار', 'بريد', 'الخط الساخن', 'contact', 'phone', 'email']
ESCALATE_WORDS = ['دعم فني', 'مساعدة بشرية', 'موظف', 'شكوى', 'مشكلة', 'human', 'support', 'complaint']
TRAVEL_WORDS = ['متطلبات السفر', 'متطلبات الدخول', 'شروط الدخول', 'السفر الى', 'السفر إلى', 'travel requirements',
                'entry requirements', 'can i travel', 'traveling to']
VACCINE_WORDS = ['تطعيم', 'لقاح', 'تحصين', 'vaccin', 'immuniz', 'shot']
YELLOW_FEVER_WORDS = ['حمى صفراء', 'yellow fever']
DOCUMENTS_WORDS = ['وثائق', 'مستندات', 'جواز', 'اوراق', 'أوراق', 'مطلوب', 'documents', 'passport', 'required']
QR_WORDS = ['qr', 'رمز', 'باركود', 'barcode', 'health pass', 'صحة رمز']
CERT_WORDS = ['شهادة', 'شهادة صحية', 'تحقق من الشهادة', 'certificate', 'إثبات']
TRACK_WORDS = ['حالة طلبي', 'متابعة الطلب', 'حالة الطلب', 'متابعة', 'بحث عن طلب', 'track', 'status', 'my request']
REGISTER_WORDS = ['تسجيل', 'تسجيل مسبق', 'التسجيل', 'register', 'pre-registration', 'سجل']
NOTICE_WORDS = ['اخر الاخبار', 'آخر الأخبار', 'إنذار', 'تنبيه', 'اخبار', 'أخبار', 'تعميم', 'إعلان', 'news', 'alert', 'notice']
DISEASE_WORDS = ['مرض', 'وباء', 'كوفيد', 'كورونا', 'أمراض', 'disease', 'virus', 'covid']
SERVICE_WORDS = ['خدمات', 'service']


def classify(message: str, text: str) -> str:
    q = normalize(message)
    t = normalize(text)

    if contains_any(q, ESCALATE_WORDS):
        return Intent.ESCALATE
    if contains_any(q, THANKS_WORDS):
        return Intent.THANKS
    if contains_any(q, GREETING_WORDS) or contains_any(q, HELP_WORDS):
        return Intent.GREETING

    has_country = False
    for country in Country.objects.all():
        if contains_any(q, [country.name, country.name_ar]):
            has_country = True
            break

    if contains_any(q, TRAVEL_WORDS) or has_country:
        if contains_any(q, VACCINE_WORDS) or contains_any(q, YELLOW_FEVER_WORDS):
            return Intent.VACCINATION
        return Intent.COUNTRY_REQUIREMENTS if has_country else Intent.TRAVEL_REQUIREMENTS
    if contains_any(q, VACCINE_WORDS) or contains_any(q, YELLOW_FEVER_WORDS):
        return Intent.VACCINATION
    if contains_any(q, TRACK_WORDS):
        return Intent.TRACKING
    if contains_any(q, QR_WORDS):
        return Intent.QR
    if contains_any(q, CERT_WORDS):
        return Intent.CERTIFICATE
    if contains_any(q, REGISTER_WORDS):
        return Intent.REGISTRATION
    if contains_any(q, DOCUMENTS_WORDS):
        return Intent.DOCUMENTS
    if contains_any(q, NOTICE_WORDS):
        return Intent.NOTICE
    if contains_any(q, DISEASE_WORDS):
        return Intent.DISEASE
    if contains_any(q, CONTACT_WORDS):
        return Intent.CONTACT
    if contains_any(q, SERVICE_WORDS):
        return Intent.SERVICES

    # FAQ تطابق حر
    faq = list(FaqItem.objects.filter(is_active=True))
    for item in faq:
        if contains_any(q, item.question.split()[:4]) or contains_any(t, normalize(item.question)):
            return Intent.FAQ
    for item in faq:
        if contains_any(normalize(item.question), normalize(q).split()[:4]):
            return Intent.FAQ

    return Intent.UNKNOWN


# --------------------------------------------------------------------------- #
# توليد الإجابة (Answer Generation)
# --------------------------------------------------------------------------- #

RISK_LABELS = {
    'GREEN': 'منخفض',
    'YELLOW': 'متوسط',
    'RED': 'مرتفع',
}
RISK_LABELS_EN = {
    'GREEN': 'Low',
    'YELLOW': 'Medium',
    'RED': 'High',
}

SOURCE_TRAVEL = 'TRAVEL_REQUIREMENT'
SOURCE_NOTICE = 'HEALTH_NOTICE'
SOURCE_FAQ = 'FAQ'
SOURCE_SERVICE = 'SERVICE'


def _confirmed_travel_requirements(country: Country | None):
    """يجلب متطلبات الدخول المنشورة والمعتمدة فقط (تُبنى من الإشعارات)."""
    qs = HealthNotice.objects.filter(
        is_active=True,
        category__in=[
            HealthNotice.NoticeCategory.ENTRY_REQUIREMENTS,
            HealthNotice.NoticeCategory.EPIDEMIC_ALERT,
        ],
    ).order_by('published_at', '-created_at')
    return list(qs)


def _country_for(message: str) -> Country | None:
    for country in Country.objects.all():
        if contains_any(message, [country.name, country.name_ar]):
            return country
    return None


def _active_services():
    return list(Service.objects.filter(is_active=True, status='ACTIVE').order_by('sort_order'))


def _updated(obj) -> date | None:
    """تاريخ آخر تحديث للمصدر (إن وُجد)."""
    val = getattr(obj, 'updated_at', None)
    if val is not None:
        try:
            return val.date()
        except Exception:
            return None
    pub = getattr(obj, 'published_at', None)
    if pub is not None:
        try:
            return pub.date()
        except Exception:
            return None
    return None


def _service_action(code: str, label: str | None = None) -> dict | None:
    """يبني بيانات زر الإجراء من خدمة في الكتالوج إن وُجدت."""
    svc = Service.objects.filter(code=code, is_active=True).first()
    if not svc or not svc.route:
        return None
    return {
        'label': label or svc.name_ar,
        'route': svc.route,
        'requires_auth': svc.requires_auth,
        'identity_provider': svc.identity_provider,
    }


# خريطة النيّة → نوع الإجابة
_ACTION_INTENTS = {Intent.REGISTRATION, Intent.TRACKING, Intent.QR, Intent.CERTIFICATE, Intent.DOCUMENTS, Intent.SERVICES}
_ALERT_INTENTS = {Intent.NOTICE}


def _answer_type_for_intent(intent: str) -> str:
    if intent in _ACTION_INTENTS:
        return AnswerType.ACTION
    if intent in _ALERT_INTENTS:
        return AnswerType.ALERT
    if intent == Intent.CONTACT or intent == Intent.ESCALATE or intent == Intent.FAQ:
        return AnswerType.SOURCE
    return AnswerType.INFO


def _ok(answer: str, sources, confidence, answer_type, language, action=None):
    """يبني الاستجابة الموحدة مع المصدر/الإجراء/النوع/اللغة."""
    return {
        'answer': answer,
        'answer_type': answer_type,
        'action': action,
        'sources': sources,
        'confidence': confidence,
        'language': language,
    }


def _greeting(en: bool) -> str:
    if en:
        return ('Welcome to the NQP Smart Assistant.\n'
                'I can help you with:\n'
                '• Travel requirements\n'
                '• Electronic services\n'
                '• Health guidance\n'
                '• Notices and circulars\n'
                '• Service enquiries\n\n'
                'How can I help?')
    return ('مرحباً بك في المساعد الذكي لمنصة الحجر الصحي القومي\n'
            'يمكنني مساعدتك في:\n'
            '• متطلبات السفر\n'
            '• الخدمات الإلكترونية\n'
            '• الإرشادات الصحية\n'
            '• التنبيهات والتعاميم\n'
            '• الاستعلام عن الخدمات\n\n'
            'كيف أستطيع مساعدتك؟')


def _build_answer(intent: str, message: str, language: str, context):
    country_code = (context or {}).get('country')
    country = None
    if country_code:
        country = Country.objects.filter(code__iexact=country_code).first()
    if not country:
        country = _country_for(message)

    en = language == 'en'
    atype = _answer_type_for_intent(intent)

    if intent == Intent.GREETING:
        return _ok(_greeting(en), [], 'HIGH', AnswerType.INFO, language)

    if intent == Intent.THANKS:
        return _ok(
            'You are welcome! I am happy to help. Do you have any other question?' if en else
            'العفو! يسعدني مساعدتك دائماً. هل لديك أي استفسار آخر؟',
            [], 'HIGH', AnswerType.INFO, language,
        )

    if intent == Intent.CONTACT:
        return _ok(
            'For human assistance, contact the NQP hotline 18777, or email info@nqp.gov.sd, '
            'or visit the "Contact Us" page.' if en else
            'للتواصل مع الإدارة أو الدعم البشري: الخط الساخن 18777، البريد info@nqp.gov.sd، أو عبر صفحة "اتصل بنا".',
            [], 'HIGH', AnswerType.SOURCE, language,
        )

    if intent == Intent.ESCALATE:
        return _ok(
            ('A human support officer will help you. Contact the NQP hotline 18777 or email info@nqp.gov.sd, '
             'or use the "Contact Us" page.') if en else
            'سيساعدك موظف الدعم البشري. تواصل عبر الخط الساخن 18777 أو البريد info@nqp.gov.sd، أو عبر صفحة "اتصل بنا".',
            [], 'HIGH', AnswerType.SOURCE, language,
        )

    if intent == Intent.TRAVEL_REQUIREMENTS:
        reqs = _confirmed_travel_requirements(None)
        if not reqs:
            return _ok(
                'No published travel-requirements data is currently available.' if en else
                'لا توجد بيانات متطلبات سفر منشورة حالياً.',
                [], 'LOW', AnswerType.NOT_FOUND, language,
            )
        body = ('Please select your departure country, then the latest officially published requirements will be shown.' if en else
                'يرجى تحديد دولة المغادرة، ثم تُعرض آخر المتطلبات المنشورة رسمياً.')
        lines = []
        for c in Country.objects.order_by('name_ar')[:12]:
            rlabel = (RISK_LABELS_EN if en else RISK_LABELS).get(c.risk_level, c.risk_level)
            lines.append(f'- {c.name_ar} ({rlabel})' if not en else f'- {c.name} ({rlabel})')
        sources = []
        for r in reqs[:5]:
            sources.append({'type': SOURCE_NOTICE, 'id': str(r.id), 'title': r.title,
                           'source_url': '/notices', 'source_updated_at': str(_updated(r)) if _updated(r) else None})
        return _ok(f'{body}\n\n' + '\n'.join(lines), sources, 'MEDIUM', AnswerType.INFO, language)

    if intent == Intent.COUNTRY_REQUIREMENTS:
        if not country:
            return _ok(
                'Please specify the departure country (e.g. Egypt).' if en else
                'يرجى تحديد دولة المغادرة (مثال: مصر).',
                [], 'LOW', AnswerType.INFO, language,
            )
        reqs = _confirmed_travel_requirements(country)
        rlabel = (RISK_LABELS_EN if en else RISK_LABELS).get(country.risk_level, country.risk_level)
        if not reqs:
            return _ok(
                f'Country: {country.name} (risk: {rlabel}). No additional officially published requirements are currently listed.'
                if en else
                f'الدولة: {country.name_ar} (مستوى الخطورة: {rlabel}). لا توجد متطلبات دخول إضافية منشورة حالياً.',
                [], 'MEDIUM', AnswerType.INFO, language,
            )
        req_lines = '\n'.join(f'• {r.title}' for r in reqs)
        sources = [{'type': SOURCE_NOTICE, 'id': str(r.id), 'title': r.title,
                    'source_url': '/notices', 'source_updated_at': str(_updated(r)) if _updated(r) else None}
                   for r in reqs]
        return _ok(
            f'Country: {country.name} (risk level: {rlabel})\nPublished entry requirements:\n{req_lines}'
            if en else
            f'الدولة: {country.name_ar} (مستوى الخطورة: {rlabel})\nالمتطلبات المنشورة للدخول:\n{req_lines}',
            sources, 'MEDIUM', AnswerType.INFO, language,
        )

    if intent == Intent.VACCINATION:
        return _ok(
            ('For travel from yellow-fever endemic countries, a valid yellow-fever vaccination certificate is required. '
             'You can verify your certificate using the "Certificate verification" tool.') if en else
            'للسفر من الدول الموبوءة بالحمى الصفراء يجب تقديم شهادة تطعيم سارية ضد الحمى الصفراء. يمكنك التحقق من صحة شهادتك في خدمة "التحقق من شهادة صحية".',
            [], 'MEDIUM', AnswerType.INFO, language,
        )

    if intent == Intent.DOCUMENTS:
        action = _service_action('traveler-documents', 'رفع الوثائق')
        return _ok(
            ('The essential documents for entry are: a valid passport, and a valid yellow-fever vaccination '
             'certificate for travellers arriving from endemic countries (subject to the country of departure).') if en else
            'الوثائق الأساسية المطلوبة للدخول: جواز سفر ساري المفعول، وشهادة تطعيم الحمى الصفراء للقادمين من الدول الموبوءة، حسب متطلبات الدولة القادم منها.',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.QR:
        action = _service_action('public-verify-qr', 'التحقق من رمز QR')
        return _ok(
            ('You can verify a QR code or check your request status through the smart tools: '
             '"Lookup request" or "Verify QR code".') if en else
            'يمكنك التحقق من رمز QR أو من حالة طلبك عبر الأدوات الذكية: "البحث عن الطلب" أو "التحقق من QR Code".',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.CERTIFICATE:
        action = _service_action('public-verify-certificate', 'التحقق من الشهادة')
        return _ok(
            ('You can verify the authenticity and validity of a health certificate by its number using the '
             '"Certificate verification" tool.') if en else
            'يمكنك التحقق من صحة وصلاحية الشهادة الصحية برقمها عبر خدمة "التحقق من شهادة صحية".',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.TRACKING:
        # يتطلب الوصول إلى بيانات شخصية → مسار موثّق (الوضع العام يعرض إجراءً آمنًا فقط)
        action = {
            'label': 'المتابعة عبر تسجيل الدخول' if not en else 'Continue with login',
            'route': '/services/verify/lookup',
            'requires_auth': True,
            'identity_provider': 'CREDENTIALS',
        }
        return _ok(
            ('You can check your request status. To access your personal request data, '
             'you must first log in.') if en else
            'يمكنني مساعدتك في الاستعلام عن طلبك.\n\nللوصول إلى بيانات طلبك، يجب تسجيل الدخول أولاً.',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.REGISTRATION:
        action = _service_action('traveler-registration', 'بدء التسجيل' if not en else 'Start registration')
        note = ('Registration requires you to log in.' if en else
                'يتطلب التسجيل تسجيل الدخول.')
        return _ok(
            ('You can complete the traveller health registration electronically.\n\n' + note) if en else
            ('يمكنك التسجيل الصحي للمسافر إلكترونياً.\n\n' + note),
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.NOTICE:
        notices = list(HealthNotice.objects.filter(is_active=True).order_by('-published_at')[:5])
        if not notices:
            return _ok(
                'There are currently no published health notices.' if en else
                'لا توجد إشعارات صحية منشورة حالياً.',
                [], 'LOW', AnswerType.NOT_FOUND, language,
            )
        lines = '\n'.join(f'• {n.title}' for n in notices)
        sources = [{'type': SOURCE_NOTICE, 'id': str(n.id), 'title': n.title,
                    'source_url': '/notices', 'source_updated_at': str(_updated(n)) if _updated(n) else None}
                   for n in notices]
        return _ok(
            f'Latest health notices:\n{lines}' if en else
            f'أحدث الإشعارات الصحية:\n{lines}',
            sources, 'MEDIUM', AnswerType.ALERT, language,
        )

    if intent == Intent.DISEASE or intent == Intent.FAQ:
        faqs = list(FaqItem.objects.filter(is_active=True).order_by('order'))[:5]
        match = faqs[0] if faqs else None
        if match:
            sources = [{'type': SOURCE_FAQ, 'id': str(match.id), 'title': match.question,
                        'source_url': '/faq', 'source_updated_at': str(_updated(match)) if _updated(match) else None}]
            return _ok(match.answer, sources, 'HIGH', AnswerType.SOURCE, language)
        return _ok(
            'Please contact us for more specific information.' if en else
            'يرجى التواصل معنا للحصول على معلومات أكثر تحديداً.',
            [], 'LOW', AnswerType.NOT_FOUND, language,
        )

    if intent == Intent.SERVICES:
        services = _active_services()[:8]
        lines = '\n'.join(f'• {s.name_ar}{(" (" + s.route + ")") if s.route else ""}' for s in services)
        sources = [{'type': SOURCE_SERVICE, 'id': s.code, 'title': s.name_ar, 'source_url': s.route or '/services'}
                   for s in services[:5]]
        return _ok(
            f'The NQP electronic services are available from the /services catalog:\n{lines}' if en else
            f'خدمات المنصة الإلكترونية متاحة من كتالوج /services:\n{lines}',
            sources, 'MEDIUM', AnswerType.ACTION, language,
        )

    # UNKNOWN
    return _ok(
        ('Sorry, I did not find sufficient official information to answer. '
         'Try words like: "travel requirements", "vaccinations", "documents", or contact us.') if en else
        'عذراً، لم أجد معلومة رسمية كافية للإجابة. جرّب كلمات مثل: "متطلبات السفر"، "التطعيمات"، "وثائق الدخول"، أو تواصل معنا عبر صفحة "اتصل بنا".',
        [], 'LOW', AnswerType.NOT_FOUND, language,
    )


def answer_question(message: str, language: str | None = None, context: dict | None = None) -> dict:
    """نقطة الدخول الرئيسية: ترجع إجابة منظمة بالمصدر/الإجراء/النوع/درجة الثقة واللغة."""
    lang = language or detect_language(message)
    intent = classify(message, message)
    result = _build_answer(intent, message, lang, context or {})
    return result


# --------------------------------------------------------------------------- #
# اقتراحات سريعة وموضوعات
# --------------------------------------------------------------------------- #

def suggestions() -> list[str]:
    return ['متطلبات السفر', 'التطعيمات', 'الحمى الصفراء', 'وثائق الدخول', 'أحدث الإشعارات']


def topics() -> list[dict]:
    faq_count = FaqItem.objects.filter(is_active=True).count()
    notice_count = HealthNotice.objects.filter(is_active=True).count()
    country_count = Country.objects.count()
    return [
        {'group': 'FAQ', 'title': 'الأسئلة الشائعة', 'count': faq_count},
        {'group': 'TRAVEL', 'title': 'متطلبات السفر', 'count': country_count},
        {'group': 'NOTICES', 'title': 'الإشعارات الصحية', 'count': notice_count},
        {'group': 'SERVICES', 'title': 'خدمات المنصة', 'count': Service.objects.filter(is_active=True).count()},
        {'group': 'ESCALATION', 'title': 'التواصل والدعم', 'count': 1},
    ]
