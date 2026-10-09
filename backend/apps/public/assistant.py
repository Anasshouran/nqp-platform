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


#: القيم التي تعني «اكتشف اللغة بنفسك» لا لغة صريحة.
AUTO_LANGUAGE_VALUES = {'', 'auto', 'und', 'unknown', 'none', 'null'}


def _script_ratios(text: str) -> tuple[float, float]:
    """نِسَب الحروف العربية واللاتينية إلى إجمالي الحروف."""
    arabic = sum(1 for ch in text if '\u0600' <= ch <= '\u06FF')
    latin = sum(1 for ch in text if ch.isascii() and ch.isalpha())
    total = arabic + latin
    if total == 0:
        return 0.0, 0.0
    return arabic / total, latin / total


def detect_language(message: str) -> str:
    """تحدّد لغة الرسالة: `ar` أو `en`.

    المرصود سابقاً: كان الشرط `arabic >= letters/2` يحسب نصفَ **عدد**
    الحروف لا النسبة، فتُرجع الرسائل الإنجليزية القصيرة («hi»، «fever»)
    عربيةً خطأً لأن المقام صغير.

    الآن: نِسَب صريحة من نوعَي الحروف (عربي مقابل لاتيني)، والأرقام
    والرموز لا تُحتسب في المقام.
    """
    text = (message or '').strip()
    if not text:
        return 'ar'

    arabic_ratio, latin_ratio = _script_ratios(text)

    # كلمات عربية حبيسة بين كلمات لاتينية («أريد Laboratory result») تبقى
    # عربية: المستخدم يكتب مصطلحاً إنجليزياً داخل جملة عربية، لا أنه
    # يسأل بالإنجليزية. نكتفي بـ 4 حروف عربية على الأقل كي لا نبتلع
    # رسالة لاتينية فيها رمز أو كلمة عربية عابرة.
    if arabic_ratio > 0 and sum(1 for ch in text if '\u0600' <= ch <= '\u06FF') >= 4:
        return 'ar'

    # أفضلية أحد النوعين تكفي — لا عتبة ولا احتياط.
    if latin_ratio > arabic_ratio:
        return 'en'
    if arabic_ratio > 0:
        return 'ar'

    # أرقام ورموز فقط: الافتراضي `en`.
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

#: أسماء الخدمات بالإنجليزية.
#:
#: `Service.name_en` فارغ في قاعدة البيانات الحالية (52 خدمة من 52)، فلا
#: ننتظر ترجمتها لنُظهر ردّاً إنجليزياً صحيحاً. هذه خريطة مترجمة مُداوَنة
#: في الشيفرة، وكل ما ليس فيها يعود إلى `name_en` ثم إلى الاسم العربي.
SERVICE_LABELS_EN = {
    'public-assistant': 'Smart Assistant',
    'public-lookup': 'Track request',
    'public-notifications': 'Health notices',
    'public-travel-requirements': 'Travel requirements',
    'public-verify-certificate': 'Verify certificate',
    'public-verify-qr': 'Verify QR code',
    'traveler-registration': 'Pre-arrival health registration',
    'traveler-declaration': 'Health declaration',
    'traveler-documents': 'Upload documents',
    'traveler-vaccines': 'Check vaccinations',
    'traveler-qr': 'QR Health Pass',
    'traveler-tracking': 'Track request',
    'traveler-trip-data': 'Trip data',
    'traveler-amend': 'Amend request',
    'food-import': 'Import (incoming shipment)',
    'food-export': 'Export (export certificate)',
    'food-inspection': 'Inspection',
    'food-sampling': 'Sampling',
    'food-certificates': 'Certificates',
    'food-fees': 'Fees',
    'food-release': 'Release decision',
    'food-tracking': 'Shipment tracking',
    'food-laboratory': 'Laboratory',
    'poe-land': 'Land border health',
    'poe-port': 'Port health',
    'poe-airport': 'Airport health',
    'surveillance-alerts': 'Health alerts',
    'surveillance-diseases': 'Diseases under surveillance',
    'surveillance-events': 'Health events',
    'surveillance-reports': 'Public reports',
    'lab-results': 'Test results',
    'lab-reports': 'Authorised lab reports',
    'lab-analysis-status': 'Analysis status',
    'lab-sample-lookup': 'Sample lookup',
    'carrier-flights': 'Flights',
    'carrier-manifest': 'Passenger manifest',
    'carrier-crew': 'Crew manifest',
    'carrier-portal': 'Carrier portal',
    'gov-verify': 'Verify certificates',
    'gov-shipments': 'Query shipments',
    'gov-release': 'Query release decisions',
    'gov-reports': 'Reports',
    'red-sea-portal': 'Red Sea sector portal',
    'vector-alerts': 'Vector alerts',
    'vector-general': 'General information',
    'vector-guidelines': 'Guidelines',
    'vector-info': 'Vector control information',
}


#: تصنيفات الإشعارات الصحية بالإنجليزية. `HealthNotice` لا تملك حقلاً
#: إنجليزياً (عنوانها عربي فقط)، فلا نخترع ترجمة داخل الشيفرة: نعرض
#: التصنيف ونُحيل المستخدم إلى صفحة الإشعارات للنص الرسمي الكامل.
NOTICE_CATEGORY_LABELS_EN = {
    'FLIGHT_SUSPENSION': 'Flight suspension notice',
    'ENTRY_REQUIREMENTS': 'Entry requirements notice',
    'EPIDEMIC_ALERT': 'Epidemic alert',
    'GENERAL': 'General health notice',
}

#: يظهر مع كل مصدر عربي في طلب إنجليزي، ليعرف المستخدم سبب العربية.
ARABIC_ONLY_NOTE_EN = (
    'The official text of this notice is published in Arabic; '
    'open the notices page to read the full statement.'
)


def _notice_title(notice, en: bool) -> str:
    """عنوان الإشعار بلغة الطلب.

    يفضّل `title_en` إن أُضيف لاحقاً، ثم التصنيف بالإنجليزية، ثم العربية.
    """
    if not en:
        return notice.title
    translated = (getattr(notice, 'title_en', '') or '').strip()
    if translated:
        return translated
    return NOTICE_CATEGORY_LABELS_EN.get(notice.category, 'Health notice')


def _faq_answer(item, en: bool) -> str:
    """جواب سؤال شائع بلغة الطلب، بلا اختلاق ترجمة."""
    if not en:
        return item.answer
    translated = (getattr(item, 'answer_en', '') or '').strip()
    if translated:
        return translated
    return (
        'The official answer to this question is published in Arabic. '
        'Please open the FAQ page to read it.'
    )


def _service_label(service, en: bool) -> str:
    """اسم الخدمة بلغة الطلب، مع fallback إلى `name_en` ثم العربية."""
    if en:
        return (
            SERVICE_LABELS_EN.get(service.code)
            or (service.name_en or '').strip()
            or service.name_ar
        )
    return service.name_ar

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


def _service_action(code: str, label: str | None = None, en: bool = False) -> dict | None:
    """يبني بيانات زر الإجراء من خدمة في الكتالوج إن وُجدت."""
    svc = Service.objects.filter(code=code, is_active=True).first()
    if not svc or not svc.route:
        return None
    return {
        'label': label or _service_label(svc, en),
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
        'disclaimer': None,
        'conversation_id': None,
    }


# --------------------------------------------------------------------------- #
# إخلاء المسؤولية الطبية + الطوارئ
# --------------------------------------------------------------------------- #

#: النوايا التي قد تُقرأ كإرشاد طبي، فلا بد أن تحمل التحذير.
MEDICAL_INTENTS = {Intent.DISEASE}

DISCLAIMER_AR = (
    'تنبيه: المساعد يقدّم معلومات عامة وإرشادية فقط ولا يُغني عن '
    'استشارة الطبيب. في حالات الطوارئ اتصل بالرقم 999.'
)
DISCLAIMER_EN = (
    'Notice: this assistant provides general information only and does not '
    'replace professional medical advice. In an emergency call 999.'
)


def _disclaimer_for(intent: str, language: str) -> str | None:
    """نصّ التحذير المناسب للنية، أو `None` إن لم تكن إرشادية.

    نُعيده كحقل مستقل في الاستجابة بدل لصقِه في نصّ الإجابة: الحقل
    يتيح للواجهة عرضه ثابتاً في أسفل المحادثة (كما يطلب التوثيق: «في
    بداية كل محادثة») فلا يتسرّب في نسخ الإجابة ولا يُنسخ معاها.
    """
    if intent not in MEDICAL_INTENTS:
        return None
    return DISCLAIMER_EN if language == 'en' else DISCLAIMER_AR


def greeting_disclaimer(language: str = 'ar') -> str:
    """التحذير الافتتاحي الثابت الذي يعرض في بداية المحادثة."""
    return DISCLAIMER_EN if language == 'en' else DISCLAIMER_AR


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
            # `Country.name` هو الاسم اللاتيني و`name_ar` العربي.
            label = c.name if en else c.name_ar
            lines.append(f'- {label} ({rlabel})')
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
        req_lines = '\n'.join(f'• {_notice_title(r, en)}' for r in reqs)
        sources = [{'type': SOURCE_NOTICE, 'id': str(r.id), 'title': r.title,
                    'source_url': '/notices', 'source_updated_at': str(_updated(r)) if _updated(r) else None}
                   for r in reqs]
        country_body = (
            f'Country: {country.name} (risk level: {rlabel})\n'
            f'Published entry requirements:\n{req_lines}\n{ARABIC_ONLY_NOTE_EN}'
            if en else
            f'الدولة: {country.name_ar} (مستوى الخطورة: {rlabel})\n'
            f'المتطلبات المنشورة للدخول:\n{req_lines}'
        )
        return _ok(
            country_body,
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
        action = _service_action('traveler-documents', 'Upload documents' if en else 'رفع الوثائق', en=en)
        return _ok(
            ('The essential documents for entry are: a valid passport, and a valid yellow-fever vaccination '
             'certificate for travellers arriving from endemic countries (subject to the country of departure).') if en else
            'الوثائق الأساسية المطلوبة للدخول: جواز سفر ساري المفعول، وشهادة تطعيم الحمى الصفراء للقادمين من الدول الموبوءة، حسب متطلبات الدولة القادم منها.',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.QR:
        action = _service_action('public-verify-qr', 'Verify QR code' if en else 'التحقق من رمز QR', en=en)
        return _ok(
            ('You can verify a QR code or check your request status through the smart tools: '
             '"Lookup request" or "Verify QR code".') if en else
            'يمكنك التحقق من رمز QR أو من حالة طلبك عبر الأدوات الذكية: "البحث عن الطلب" أو "التحقق من QR Code".',
            [], 'MEDIUM', AnswerType.ACTION, language, action=action,
        )

    if intent == Intent.CERTIFICATE:
        action = _service_action('public-verify-certificate', 'Verify certificate' if en else 'التحقق من الشهادة', en=en)
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
        action = _service_action('traveler-registration', 'Start registration' if en else 'بدء التسجيل', en=en)
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
        lines = '\n'.join(f'• {_notice_title(n, en)}' for n in notices)
        sources = [{'type': SOURCE_NOTICE, 'id': str(n.id), 'title': n.title,
                    'source_url': '/notices', 'source_updated_at': str(_updated(n)) if _updated(n) else None}
                   for n in notices]
        body = 'Latest health notices:'
        if en:
            body += f'\n{ARABIC_ONLY_NOTE_EN}'
        return _ok(
            f'{body}\n{lines}' if en else
            f'أحدث الإشعارات الصحية:\n{lines}',
            sources, 'MEDIUM', AnswerType.ALERT, language,
        )

    if intent == Intent.DISEASE or intent == Intent.FAQ:
        faqs = list(FaqItem.objects.filter(is_active=True).order_by('order'))[:5]
        match = faqs[0] if faqs else None
        if match:
            sources = [{'type': SOURCE_FAQ, 'id': str(match.id), 'title': match.question,
                        'source_url': '/faq', 'source_updated_at': str(_updated(match)) if _updated(match) else None}]
            return _ok(_faq_answer(match, en), sources, 'HIGH', AnswerType.SOURCE, language)
        return _ok(
            'Please contact us for more specific information.' if en else
            'يرجى التواصل معنا للحصول على معلومات أكثر تحديداً.',
            [], 'LOW', AnswerType.NOT_FOUND, language,
        )

    if intent == Intent.SERVICES:
        services = _active_services()[:8]
        lines = '\n'.join(f'• {_service_label(s, en)}' + (f' ({s.route})' if s.route else '') for s in services)
        sources = [{'type': SOURCE_SERVICE, 'id': s.code, 'title': _service_label(s, en), 'source_url': s.route or '/services'}
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


def answer_question(
    message: str,
    language: str | None = None,
    context: dict | None = None,
    log: bool = True,
) -> dict:
    """نقطة الدخول الرئيسية: ترجع إجابة منظمة بالمصدر/الإجراء/النوع/درجة الثقة واللغة.

    `log=False` يعطّل تسجيل المحادثة (للاختبارات ولكل استدعاء داخلي).

    `language`: قيمة صريحة (`ar`/`en`) تُحترم؛ وأي قيمة أخرى — بما فيها
    `None` و`auto` والسوابق — تُعامل كـ«اكتشفها بنفسك». قبل الإصلاح كان
    الحقل في المسار يحمل `default='ar'`، فكل طلب بلا `language` صريح كان
    يُجبَأً عربياً حتى لو كُتب بالإنجليزية.
    """
    requested = (language or '').strip().lower()
    if requested in {'ar', 'en'}:
        lang = requested
    else:
        lang = detect_language(message)
    intent = classify(message, message)
    result = _build_answer(intent, message, lang, context or {})
    result['disclaimer'] = _disclaimer_for(intent, lang)
    result['engine'] = 'rules'

    if log:
        result['conversation_id'] = _log_conversation(message, intent, result)
    return result


def _log_conversation(message: str, intent: str, result: dict) -> str | None:
    """يسجّل السؤال مجهولاً ويعيد معرّف السجل للتقييم لاحقاً.

    يُبتلع أي فشل في الكتابة: فقد السجل لا يجوز أن يُسقط إجابةً عامة.
    """
    from .models import AssistantConversation

    try:
        row = AssistantConversation.objects.create(
            intent=intent if intent in AssistantConversation.Intent.values else 'UNKNOWN',
            answer_type=result.get('answer_type') or 'INFO',
            confidence=result.get('confidence') or 'LOW',
            language=result.get('language') or 'ar',
            source_count=len(result.get('sources') or []),
            message_length=len(message or ''),
            has_disclaimer=bool(result.get('disclaimer')),
            engine=result.get('engine') or 'rules',
        )
    except Exception:  # pragma: no cover - مسار ثانوي
        return None
    return str(row.pk)


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
