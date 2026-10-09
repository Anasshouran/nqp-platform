"""عقد نطاق المنظمات الخارجية — الهوية والقدرات والحالة ونطاق مشاركة البيانات.

هذه الطبقة **نقية** ولا تعرف شيئاً عن WHO أو أي منظمة بعينها:

* لا استيراد من ``apps.who`` (وحدة ``WHO`` تتحقق من ذلك باختبار).
* لا استيراد من نماذج Django، ولا وصول لقاعدة بيانات.
* لا أي طلب شبكي.

مبدأ الحوكمة الحاكم: **deny by default**. كل حالة تبدأ من مغلقة:
التفعيل لا يُفترض، والاتصال لا يُفترض، والتفويض لا يُفترض.
الإعداد الصحيح (CONFIGURED) لا يعني اتصالاً خارجياً — انظر ``IntegrationStatus``.

الأسماء القانونية للإعدادات تُمرَّر من المحوّل (adapter) ولا تُخمَّن هنا.
"""

import hashlib
from dataclasses import dataclass, field, replace
from enum import Enum

# ============================================================
# التعدادات (vocabularies)
# ============================================================


class LabeledEnum(str, Enum):
    """تعداد نصّي مع تسمية عرض عربية منفصلة.

    السبب: ``django.db.models.TextChoices`` يسمح بالكتابة
    ``NAME = 'VALUE', 'تسمية'``، لكن ``enum.Enum`` القياسي يعتبر الزوج
    قيمةً واحدةً فيتعذّر فكها. هنا تبقى ``.value`` سلسلة بسيطة (قابلة
    للتخزين والمقارنة) و ``.label`` تسمية عرض منفصلة.

    لا اعتماد على Django: طبقة المفردات تبقى قابلة للاستيراد وحدها.
    """

    def __new__(cls, value, label=''):
        member = str.__new__(cls, value)
        member._value_ = value
        member.label = label
        return member

    def __str__(self) -> str:
        return str(self.value)


class OrganizationType(LabeledEnum):
    """نوع المنظمة — وصفي فقط، لا يفترض أي اتفاقية."""

    UN_AGENCY = 'UN_AGENCY', 'وكالة أممية متخصصة'
    INTERNATIONAL_ORGANIZATION = 'INTERNATIONAL_ORGANIZATION', 'منظمة دولية'
    GOVERNMENT = 'GOVERNMENT', 'جهة حكومية'
    NGO = 'NGO', 'منظمة غير حكومية'
    HEALTH_PARTNER = 'HEALTH_PARTNER', 'شريك صحي'
    OTHER = 'OTHER', 'أخرى'


class Capability(LabeledEnum):
    """قدرة تكامل وصفية.

    وجود القدرة في العقد **لا يعني أنها مفعّلة**. التفعيل مشتق من حالة
    الإعداد عند التشغيل عبر ``available_capabilities()``.
    """

    ICD11 = 'ICD11', 'ترميز ICD-11'
    IHR_EVENTS = 'IHR_EVENTS', 'أحداث IHR'
    DISEASE_SYNC = 'DISEASE_SYNC', 'مزامنة الأمراض'
    EVENT_SUBMISSION = 'EVENT_SUBMISSION', 'إرسال الأحداث'
    WEBHOOKS = 'WEBHOOKS', 'ويب هوك'
    HEALTH_DATA_EXCHANGE = 'HEALTH_DATA_EXCHANGE', 'تبادل بيانات صحية'


class DataSharingScope(LabeledEnum):
    """نطاق البيانات المسموح تبادلها.

    **لا يوجد نطاق على مستوى المريض في هذا التعداد.** أي مشاركة على مستوى
    المريض تحتاج عقداً معتمداً منفصلاً ومراجعة بشرية — وهي خارج Phase 1.
    """

    DISEASE_REFERENCE = 'DISEASE_REFERENCE', 'مرجع الأمراض'
    EPIDEMIOLOGICAL_SUMMARY = 'EPIDEMIOLOGICAL_SUMMARY', 'ملخص وبائي'
    IHR_EVENT = 'IHR_EVENT', 'حدث IHR'
    LABORATORY_SUMMARY = 'LABORATORY_SUMMARY', 'ملخص مختبري'
    ENTRY_POINT_EVENT = 'ENTRY_POINT_EVENT', 'حدث نقطة دخول'


class IntegrationStatus(LabeledEnum):
    """حالة التكامل على مستوى المنظمة.

    التدرّج واختصاره الحاسم:

    ``DISABLED → UNCONFIGURED → CONFIGURED → READY``

    * ``CONFIGURED`` = الإعدادات سليمة **محلياً**. لا يعني ولا يدّعي اتصالاً
      خارجياً؛ لم يُختبر أي اتصال في هذه المرحلة.
    * ``READY`` لا تُشتق من الإعدادات إطلاقاً. شرطها دليل اتصال صريح
      (``connectivity_observed``) لا يمكن إنشاؤه من قراءة الإعدادات.
    * ``INVALID`` تشديد لـ``UNCONFIGURED``: الإعداد موجود لكنه مشوّه.
    * ``ERROR`` تعني فشل عملية سابقة، ولا تُترجم أبداً إلى نجاح.
    """

    DISABLED = 'DISABLED', 'معطّل'
    UNCONFIGURED = 'UNCONFIGURED', 'غير مُهيّأ'
    INVALID = 'INVALID', 'إعدادات مشوّهة'
    CONFIGURED = 'CONFIGURED', 'مُهيّأ محلياً'
    READY = 'READY', 'جاهز'
    ERROR = 'ERROR', 'خطأ'


class IntegrationStatusError(RuntimeError):
    """خطأ في عقد التكامل نفسه (انتهاك عقد داخلي)."""


# ============================================================
# الهوية
# ============================================================


@dataclass(frozen=True)
class Organization:
    """هوية منظمة خارجية — وصف ثابت لا يتغيّر بتغيّر التشغيل.

    ``identifier`` هو المفتاح الحتمي: نفس المعرّف ⇐ نفس التبصمة
    (``fingerprint``). هذا يسمح بمقارنة هوية المنظمة دون أي طلب شبكة.

    ``status`` هنا هو **الحالة المعلنة** وقت البناء، وتبدأ دائماً من
    ``DISABLED`` (deny by default). الحالة الفعّالة وقت التشغيل تُحسب في
    ``IntegrationStatusReport`` وتكون هي المرجع.
    """

    identifier: str
    name: str
    display_name: str
    organization_type: OrganizationType
    country: str = 'INT'
    status: IntegrationStatus = IntegrationStatus.DISABLED
    capabilities: tuple = ()
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        if not str(self.identifier or '').strip():
            raise IntegrationStatusError('معرّف المنظمة مطلوب (identifier).')
        if not isinstance(self.organization_type, OrganizationType):
            raise IntegrationStatusError('organization_type يجب أن يكون OrganizationType.')
        for capability in self.capabilities:
            if not isinstance(capability, Capability):
                raise IntegrationStatusError(f'قدرة غير معروفة: {capability!r}')
        # يُثبَّت كـtuple فوراً حتى تبقى البصمة حتمية ونصية.
        object.__setattr__(self, 'capabilities', tuple(self.capabilities))
        object.__setattr__(self, 'metadata', dict(self.metadata))

    def declares(self, capability: Capability) -> bool:
        """هل القدرة **معلنة** في العقد؟ لا تعني أنها متاحة الآن."""
        return capability in self.capabilities

    @property
    def fingerprint(self) -> str:
        """بصمة حتمية للهوية — ثابتة لنفس المدخلات، بلا حالة تشغيل."""
        parts = [
            str(self.identifier).strip().lower(),
            str(self.name).strip().lower(),
            str(self.organization_type.value),
            str(self.country or '').strip().lower(),
            '|'.join(sorted(c.value for c in self.capabilities)),
        ]
        return hashlib.sha256('\x1f'.join(parts).encode('utf-8')).hexdigest()[:32]

    def describe(self) -> dict:
        """وصف آمن للطباعة — لا قيم سرّية هنا بحكم تصميم العقد."""
        return {
            'identifier': self.identifier,
            'name': self.name,
            'display_name': self.display_name,
            'organization_type': self.organization_type.value,
            'country': self.country,
            'declared_status': self.status.value,
            'declared_capabilities': [c.value for c in self.capabilities],
            'fingerprint': self.fingerprint,
            'metadata': dict(self.metadata),
        }

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<Organization {self.identifier} type={self.organization_type.value}>'


# ============================================================
# الحالة الفعّالة + بوابات الجاهزية
# ============================================================

#: ترتيب الأولوية الحتمي عند اشتقاق الحالة. الأولى الفائمة تفوز.
STATUS_PRECEDENCE = (
    IntegrationStatus.DISABLED,
    IntegrationStatus.INVALID,
    IntegrationStatus.UNCONFIGURED,
    IntegrationStatus.ERROR,
    IntegrationStatus.CONFIGURED,
    IntegrationStatus.READY,
)


@dataclass(frozen=True)
class IntegrationReadiness:
    """خمس بوابات مستقلة. كل واحدة ``False`` افتراضياً (deny by default).

    ``configured``   — الإعدادات كاملة وصحيحة شكلياً.
    ``enabled``      — مُفعَّل صريحاً عبر إعدادات البيئة.
    ``authorized``   — مُرخَّص تبادل البيانات بنطاق محدد. ``False`` دائماً في
                       Phase 1: لا يوجد أي تفويض معتمد.
    ``connected``    — **دليل اتصال خارجي مُلاحَظ**. لا يمكن استنتاجه من
                       ``configured``؛ يتطلب ``with_connectivity_evidence()``.
    ``operational``  — عملية واحدة نجحت فعلياً بعد الاتصال المُثبت.
    """

    configured: bool = False
    enabled: bool = False
    authorized: bool = False
    connected: bool = False
    operational: bool = False
    connectivity_observed: bool = False

    def with_connectivity_evidence(self, *, operational: bool = False) -> 'IntegrationReadiness':
        """البوابة الوحيدة التي ترفع ``connected`` — بدليل صريح لا بالإعداد.

        ``connectivity_observed`` عَلَم إسناد: يوثّق أن الدليل قدّم، بينما
        ``connected`` يبقى ``False`` إلى أن يثبته مُراقب خارجي. هذا يمنع
        تحويل إعداد صحيح إلى ادعاء اتصال.
        """
        return replace(self, connectivity_observed=True, operational=operational)

    @property
    def may_exchange_data(self) -> bool:
        """التبادل الفعلي مشروط بثلاث بوابات: مُفعَّل + مُهيّأ + مُرخَّص."""
        return self.enabled and self.configured and self.authorized


@dataclass(frozen=True)
class IntegrationStatusReport:
    """تقرير حالة مُجمَّع — المصدر المرجع للحالة وقت التشغيل."""

    organization: str
    status: IntegrationStatus
    readiness: IntegrationReadiness
    issues: tuple = ()
    detail: dict = field(default_factory=dict)

    @property
    def is_operational(self) -> bool:
        return self.readiness.may_exchange_data and self.status is IntegrationStatus.READY

    def describe(self) -> dict:
        return {
            'organization': self.organization,
            'status': self.status.value,
            'readiness': {
                'configured': self.readiness.configured,
                'enabled': self.readiness.enabled,
                'authorized': self.readiness.authorized,
                'connected': self.readiness.connected,
                'operational': self.readiness.operational,
            },
            'issues': list(self.issues),
            'detail': dict(self.detail),
        }


def derive_status(
    *,
    enabled: bool,
    configured: bool,
    invalid: bool = False,
    error_category=None,
    connectivity_observed: bool = False,
) -> IntegrationStatus:
    """اشتقاق الحالة بقواعد حتمية — لا تُرجع ``READY`` من الإعداد وحده.

    القاعدة الحاسمة: ``READY`` تتطلّب ``connectivity_observed``، وهو علم لا
    يُشتق من قراءة الإعدادات. إعداد كامل بدون دليل ⇐ ``CONFIGURED``.
    """
    if not enabled:
        return IntegrationStatus.DISABLED
    if invalid:
        return IntegrationStatus.INVALID
    if not configured:
        return IntegrationStatus.UNCONFIGURED
    if error_category is not None:
        return IntegrationStatus.ERROR
    if connectivity_observed:
        return IntegrationStatus.READY
    return IntegrationStatus.CONFIGURED
