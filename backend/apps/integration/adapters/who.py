"""محوّل WHO — التنفيذ الأول لعقد ``OrganizationAdapter``.

المرجع الوحيد للإعدادات هو ``apps.who.config`` من Phase 0؛ لا تُعاد قراءتها
ولا تُخمَّن قيم هنا. هذا يجعل WHO مثالاً على العقد لا نسخة مكرَّرة منه.

ما لا يفعله هذا المحوّل عمداً:

* **لا يبني ``WHOClient`` ولا ``ICD11Client``.** الأول يحتاج نسخة
  ``WHOIntegration`` من قاعدة البيانات، والثاني يفتح شبكة عند الاستدعاء.
  كلاهما ممنوع أثناء الفحص. النقل الفعلي يبقى خارج هذا الملف.
* **لا يطلب توكناً.** ``OAuth2TokenProvider`` في Phase 0 كسول؛ يبقى كذلك.
* **لا يرسل حدث IHR.** المسار فارغ حتى تأكيد العقد الرسمي.
* **لا يدّعي ``READY``.** أقصى حالة يمكن بلوغها من قراءة الإعدادات هي
  ``CONFIGURED``؛ ``READY`` تتطلّب دليل اتصال صريحاً غير متوفر هنا.

قابلية إعادة الاستخدام: هذا الملف يضيف ``OrganizationType.UN_AGENCY`` وقائمة
قدرات، بينما المعرفة التقنية كلها (``WHO_ICD_*``) تبقى في ``apps.who``.
"""

from dataclasses import dataclass, field
from typing import Any, Mapping

from apps.who import config as who_config

from ..organizations.adapter import IntegrationRequest, OrganizationAdapter
from ..organizations.audit import AuditEvent, AuditOutcome
from ..organizations.contract import (
    Capability,
    IntegrationReadiness,
    IntegrationStatus,
    IntegrationStatusReport,
    Organization,
    OrganizationType,
    derive_status,
)
from ..organizations.endpoints import (
    AuthenticationContract,
    AuthenticationType,
    EndpointContract,
)
from ..organizations.results import ErrorCategory, IntegrationResult

# ============================================================
# هوية المنظمة
# ============================================================

#: النطاقان التقنيان داخل تكامل WHO الواحد.
ICD11_NAMESPACE = 'icd11'
IHR_NAMESPACE = 'ihr'

WHO_ORGANIZATION = Organization(
    identifier='WHO',
    name='World Health Organization',
    display_name='منظمة الصحة العالمية',
    organization_type=OrganizationType.UN_AGENCY,
    # 'INT' = كيان عابر للحدود؛ ليس ادعاءً برمز ISO لدولة بعينها.
    country='INT',
    # deny by default — الحالة المعلنة لا تعني شيئاً تشغيلياً.
    status=IntegrationStatus.DISABLED,
    capabilities=(
        Capability.ICD11,
        Capability.IHR_EVENTS,
        Capability.DISEASE_SYNC,
        Capability.EVENT_SUBMISSION,
    ),
    metadata={
        'reference': 'https://www.who.int',
        'namespaces': (ICD11_NAMESPACE, IHR_NAMESPACE),
        'contracts_confirmed': False,
    },
)

#: القدرة ⇐ مساحة الاسم التقنية التي تخدمها.
CAPABILITY_NAMESPACES = {
    Capability.ICD11: ICD11_NAMESPACE,
    Capability.IHR_EVENTS: IHR_NAMESPACE,
    Capability.DISEASE_SYNC: ICD11_NAMESPACE,
    Capability.EVENT_SUBMISSION: IHR_NAMESPACE,
}

#: أسماء إعدادات الاعتمادادات — **أسماء فقط**، لا قيم. تُستخدم في العقد
#: وفي التقارير، ولا تُقرأ قيمها هنا.
CREDENTIAL_REFERENCE_NAMES = {
    ICD11_NAMESPACE: (who_config.SETTING_ICD_CLIENT_ID, who_config.SETTING_ICD_CLIENT_SECRET),
    IHR_NAMESPACE: (who_config.SETTING_IHR_CLIENT_ID, who_config.SETTING_IHR_CLIENT_SECRET),
}


# ============================================================
# محوّل WHO على مستوى المنظمة
# ============================================================


class WHOAdapter(OrganizationAdapter):
    """غلاف تعاقدي حول إعدادات WHO القائمة — بلا نقل وبلا شبكة.

    ``get_status()`` قراءة محلية بحتة لـ ``apps.who.config``. لا يستورد
    نماذج Django ولا ``httpx`` ولا ``base_client``.
    """

    organization = WHO_ORGANIZATION
    capabilities = WHO_ORGANIZATION.capabilities

    def __init__(self, transport=None, *, readiness: IntegrationReadiness = None):
        super().__init__(transport=transport)
        self._readiness_override = readiness

    # ---- الحالة ----

    def get_status(self) -> IntegrationStatusReport:
        """يحسب الحالة محلياً لكل نطاق على حدة.

        ``INVALID`` و ``UNCONFIGURED`` يبقىان مميّزين لأنهما يعالجان
       - إعدادات مختلفة. الحالة العامة تأخذ قيمة المساحة الأدنى
        وفق قاعدة الأولوية.
        """
        reports = {}
        for namespace in (ICD11_NAMESPACE, IHR_NAMESPACE):
            cfg = self._configuration(namespace)
            reports[namespace] = {
                'enabled': cfg.enabled,
                'configured': self._is_configured(namespace, cfg),
                'invalid': bool(cfg.issues),
                'issues': tuple(cfg.issues),
            }

        enabled = all(r['enabled'] for r in reports.values())
        invalid = any(r['invalid'] for r in reports.values())
        configured = all(r['configured'] for r in reports.values())
        issues = tuple(i for r in reports.values() for i in r['issues'])

        readiness = self._readiness_override or IntegrationReadiness(
            configured=configured,
            enabled=enabled,
            # Phase 1: لا يوجد تفويض تبادل بيانات معتمد لأي منظمة.
            authorized=False,
            connected=False,
            operational=False,
        )

        status = derive_status(
            enabled=enabled,
            configured=configured,
            invalid=invalid,
            error_category=None,
            connectivity_observed=readiness.connectivity_observed,
        )

        #: المساحات التي اكتملت إعداداتها هي وحدها التي تجعل قدراتها متاحة.
        #: انتبه: «متاحة» تعني «يمكن بناء طلب لها» — لا أنها تعمل.
        ready_namespaces = tuple(
            namespace
            for namespace, report in reports.items()
            if report['enabled'] and report['configured'] and not report['invalid']
        )
        ready_capabilities = (
            tuple(c for c in self.capabilities if CAPABILITY_NAMESPACES.get(c) in ready_namespaces)
            if enabled and configured
            else ()
        )

        return IntegrationStatusReport(
            organization=self.organization.identifier,
            status=status,
            readiness=readiness,
            issues=issues,
            detail={
                'namespaces': reports,
                'ready_capabilities': tuple(c.value for c in ready_capabilities),
                'connectivity_tested': False,
                'contracts_confirmed': False,
                'max_status_from_configuration': IntegrationStatus.CONFIGURED.value,
            },
        )

    def validate_configuration(self) -> IntegrationResult:
        """تحقق محلي — ``success`` تعني «الإعدادات سليمة» لا «متصل»."""
        return super().validate_configuration()

    # ---- العقود ----

    def authentication_contract(self, namespace: str) -> AuthenticationContract:
        """عقد المصادقة لمساحة اسم تقنية.

        لا يُنفَّذ أي مصادقة. العقد يحمل **أسماء** الإعدادات فقط.
        """
        if namespace == ICD11_NAMESPACE:
            return AuthenticationContract(
                authentication_type=AuthenticationType.OAUTH2_CLIENT_CREDENTIALS,
                credential_references=CREDENTIAL_REFERENCE_NAMES[ICD11_NAMESPACE],
                scopes=(self._configuration(ICD11_NAMESPACE).scope,),
            )
        if namespace == IHR_NAMESPACE:
            return AuthenticationContract(
                authentication_type=AuthenticationType.OAUTH2_CLIENT_CREDENTIALS,
                credential_references=CREDENTIAL_REFERENCE_NAMES[IHR_NAMESPACE],
                # نقطة التوكن تُمرَّر من الإعدادات إن ضُبطت، ولا تُشتق.
                token_endpoint=self._configuration(IHR_NAMESPACE).token_url,
            )
        self.refuse(f'مساحة اسم غير معروفة: {namespace!r}', ErrorCategory.CONTRACT_ERROR)

    def endpoint_contract(
        self,
        namespace: str,
        *,
        resource_path: str = '',
        http_method: str = 'GET',
    ) -> EndpointContract:
        """عقد نقطة نهاية.

        ``resource_path`` يجب أن يأتي **من الإعدادات أو من المتصل صراحةً**.
        لا مسار افتراضي: مسارات IHR تبقى فارغة إلى أن يؤكد الطرف الآخر رسمياً
        العقد، ولا يُستخدم مسار داخلي للمنصة كبديل.
        """
        if namespace not in (ICD11_NAMESPACE, IHR_NAMESPACE):
            self.refuse(f'مساحة اسم غير معروفة: {namespace!r}', ErrorCategory.CONTRACT_ERROR)
        cfg = self._configuration(namespace)
        if resource_path:
            path = resource_path
        elif namespace == IHR_NAMESPACE:
            path = cfg.events_path
        else:
            # مسارات ICD-11 موثّقة في apps/who/clients/icd_client.py؛
            # وسمها هنا كمرجع، ولا يُشتق أي مسار آخر.
            path = cfg.resource_path if hasattr(cfg, 'resource_path') else ''
        return EndpointContract(
            base_url=cfg.base_url,
            token_url=cfg.token_url,
            resource_path=path,
            http_method=http_method,
            timeout=cfg.timeout,
        )

    # ---- بناء الطلب ----

    def build_request(
        self,
        capability: Capability,
        operation: str,
        *,
        endpoint: EndpointContract = None,
        auth: AuthenticationContract = None,
        json_body: dict = None,
        query: dict = None,
    ) -> IntegrationRequest:
        """يبني طلباً وصفياً. يرفض مبكراً إن كانت القدرة غير معلنة."""
        self._assert_declared(capability)
        namespace = CAPABILITY_NAMESPACES[capability]
        if endpoint is None:
            self.refuse(
                'لا يوجد عقد نقطة نهاية صريح — لا يُبنى أي مسار افتراضي.',
                ErrorCategory.CONFIGURATION_ERROR,
            )
        self._assert_endpoint_complete(endpoint)
        if auth is None:
            auth = self.authentication_contract(namespace)
        return IntegrationRequest(
            organization=self.organization.identifier,
            capability=capability,
            operation=operation,
            method=endpoint.http_method,
            url=endpoint.build_url(),
            auth=auth,
            endpoint=endpoint,
            json_body=json_body or {},
            query=query or {},
            timeout=endpoint.timeout,
        )

    # ----ICD-11 ----

    def icd11(self) -> 'ICD11Adapter':
        """قدرة ICD-11 بنفس النقل المُحقن."""
        return ICD11Adapter(parent=self, transport=self.transport)

    def ihr_events(self) -> 'IHREventAdapter':
        """قدرة أحداث IHR بنفس النقل المُحقن."""
        return IHREventAdapter(parent=self, transport=self.transport)

    # ---- داخلي ----

    def _configuration(self, namespace: str):
        """قراءة إعدادات WHO محلياً — لا شبكة ولا قاعدة بيانات."""
        if namespace == ICD11_NAMESPACE:
            return who_config.load_icd_configuration()
        if namespace == IHR_NAMESPACE:
            return who_config.load_ihr_configuration()
        self.refuse(f'مساحة اسم غير معروفة: {namespace!r}', ErrorCategory.CONTRACT_ERROR)

    def _is_configured(self, namespace: str, cfg) -> bool:
        if namespace == ICD11_NAMESPACE:
            return bool(cfg.enabled and cfg.has_credentials and not cfg.issues)
        # IHR: نقطة التوكن الصريحة شرط — لا اشتقاق.
        return bool(cfg.enabled and cfg.has_credentials and cfg.has_token_endpoint and not cfg.issues)

    def _extra_error_categories(self) -> dict:
        """يوسّع التصنيف بأخطاء WHO القائمة — دون أن تعرفها الطبقة الأساسية.

        الاستيراد كسول: طبقة الأساس تبقى قابلة للاستيراد بلا Django apps.
        """
        from apps.who.clients.base_client import (
            WHOClientError,
            WHOClientValidationError,
            WHOExternalAccessDisabled,
        )

        return {
            WHOExternalAccessDisabled: ErrorCategory.CONFIGURATION_ERROR,
            WHOClientValidationError: ErrorCategory.CONTRACT_ERROR,
            WHOClientError: ErrorCategory.NETWORK_ERROR,
        }


# ============================================================
# قدرة ICD-11
# ============================================================


class ICD11Adapter:
    """عقد ICD-11 المحلي: بحث وجلب كيان.

    التنفيذ في Phase 1 على **مستوى العقد فقط**: الدوال تبني طلباً وصفياً
    وتسلّمه للنقل المُحقن. لا OAuth، ولا طلب ICD، ولا تزامن قاعدة بيانات.

    حدّ الأدوات في هذه الفئة مقصود ومُوثَّق:

    * **انتهاك العقد يرفع** ``IntegrationError`` — استعلام فارغ، لغة غير
      مدعومة، أو قدرة غير معلنة. هذه أخطاء برمجية في الاستدعاء، وإخفاؤها
      في قيمة إرجاع يجعلها تظهر لاحقاً كأخطاء تشغيل.
    * **النتيجة التشغيلية تُرجَع** كـ ``IntegrationResult`` — مهلة، خطأ
      شبكة، استجابة تالفة، أو رفض النقل الافتراضي.
    """

    SEARCH_PATH = '/icd/entity/search'
    ENTITY_PATH = '/icd/entity'

    def __init__(self, parent: WHOAdapter, transport=None):
        self._parent = parent
        self._transport = transport if transport is not None else parent.transport

    @property
    def available(self) -> bool:
        """هل ICD-11 متاح الآن؟ مشتق من الحالة المحلية فقط."""
        return Capability.ICD11.value in self._parent.get_status().detail.get('ready_capabilities', ())

    def endpoint(self, resource_path: str, *, http_method: str = 'GET') -> EndpointContract:
        return self._parent.endpoint_contract(
            ICD11_NAMESPACE,
            resource_path=resource_path,
            http_method=http_method,
        )

    def search(self, query: str, *, language: str = 'ar', release: str = 'mms'):
        """بحث نصي — يبني الطلب فقط في Phase 1."""
        if not str(query or '').strip():
            self._parent.refuse('الاستعلام فارغ.', ErrorCategory.CONTRACT_ERROR)
        if not who_config.is_valid_language(language):
            self._parent.refuse(
                f'لغة غير مدعومة: {language!r} — استخدم رمز لغة قياسي (ar / en مدعومان).',
                ErrorCategory.CONTRACT_ERROR,
            )
        endpoint = self.endpoint(self.SEARCH_PATH, http_method='GET')
        request = self._parent.build_request(
            Capability.ICD11,
            'ICD11_SEARCH',
            endpoint=endpoint,
            query={'q': query, 'releaseId': release, 'lang': language},
        )
        return self._dispatch(request, 'ICD11_SEARCH')

    def lookup(self, entity_id: str, *, language: str = 'ar', release: str = 'mms'):
        """جلب كيان بمعرّفه — يبني الطلب فقط في Phase 1."""
        if not str(entity_id or '').strip():
            self._parent.refuse('معرّف الكيان مطلوب.', ErrorCategory.CONTRACT_ERROR)
        if not who_config.is_valid_language(language):
            self._parent.refuse(
                f'لغة غير مدعومة: {language!r} — استخدم رمز لغة قياسي (ar / en مدعومان).',
                ErrorCategory.CONTRACT_ERROR,
            )
        # المسار يُبنى من معرّف معطى، لا يُخمَّن.
        endpoint = self.endpoint(f'{self.ENTITY_PATH}/{entity_id}', http_method='GET')
        request = self._parent.build_request(
            Capability.ICD11,
            'ICD11_LOOKUP',
            endpoint=endpoint,
            query={'release': release, 'lang': language},
        )
        return self._dispatch(request, 'ICD11_LOOKUP')

    def _dispatch(self, request: IntegrationRequest, operation: str) -> IntegrationResult:
        """يمرّ بالنقل المُحقن — النتيجة موحّدة في كل الأحوال.

        لا ``try/except`` هنا: الأخطاء التشغيلية تُترجم إلى
        ``IntegrationResult`` داخل ``execute``، والانتهاكات التعاقدية
        تُرفع قبل الوصول إلى هذه النقطة أصلاً.
        """
        return self._parent.execute(request)


# ============================================================
# عقد حدث IHR
# ============================================================

#: هل تم تأكيد مخطط WHO الخارجي؟ لا. أي حمولة produced هنا **مرشحة محلية**
#: وليست تمثيلاً لمخطط WHO الرسمي. الانتقال إلى المخطط الرسمي يتطلب عقداً
#: رسمياً — وهو فجوة معلنة في وثائق Phase 1.
WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED = False


@dataclass(frozen=True)
class IHREventContract:
    """الحدث localities IHR في صيغته **المحلية المرشحة**.

    الفصل المطلوب: ``NQP IHR model → WHO IHR mapper → WHO external contract``.

    هذه الطبقة هي الوسط. ``from_nqp_payload`` يقرأ حمولة مبنية محلياً
    (من ``apps.who.services.event_service.build_event_payload``) بلا قاعدة
    بيانات، و ``to_external_payload`` هي نقطة التسليم المستقبلية — وهي
    الآن **محجوبة** لأن مخطط WHO غير مؤكد.
    """

    event_id: str
    event_type: str
    event_time: str
    location: dict = field(default_factory=dict)
    risk_assessment: dict = field(default_factory=dict)
    public_health_action: dict = field(default_factory=dict)
    payload: dict = field(default_factory=dict)

    @property
    def external_schema_confirmed(self) -> bool:
        return WHO_IHR_EXTERNAL_SCHEMA_CONFIRMED

    @classmethod
    def from_nqp_payload(cls, payload: Mapping) -> 'IHREventContract':
        """يعيد ترتيب حمولة NQP المحلية إلى عقد المنظمة.

        لا يرسل شيئاً ولا يفترض مخططاً خارجياً. يقبل قاموساً فقط حتى يبقى
        قابلاً للاختبار بلا قاعدة بيانات.
        """
        if not isinstance(payload, Mapping):
            raise TypeError('from_nqp_payload يحتاج قاموساً (Mapping).')
        cases = payload.get('cases') or {}
        disease = payload.get('disease') or {}
        location = dict(payload.get('location') or {})
        return cls(
            event_id=str(payload.get('event_id') or ''),
            event_type=str(payload.get('event_type') or ''),
            event_time=str(payload.get('date_detected') or ''),
            location={
                'point_of_entry': location.get('point_of_entry', ''),
                'sector': location.get('sector', ''),
                'locality': location.get('locality', ''),
            },
            risk_assessment={
                'risk_level': payload.get('risk_level', ''),
                'status': payload.get('status', ''),
            },
            public_health_action={
                'cases_suspected': cases.get('suspected', 0),
                'cases_probable': cases.get('probable', 0),
                'cases_confirmed': cases.get('confirmed', 0),
                'deaths': cases.get('deaths', 0),
            },
            payload={'disease': dict(disease), 'source': payload.get('source', '')},
        )

    def to_external_payload(self) -> dict:
        """محوّل خرجي — **محجوب حتى تأكيد مخطط WHO الرسمي**.

        الرمي مقصود: وجود هذه الدالة لا يعني أن المخطط معروف. أي محاولة
        إرسال الآن يجب أن تفشل loudly لا أن تُرسل شكلاً مخترَعاً.
        """
        raise NotImplementedError(
            'مخطط WHO IHR الخارجي غير مؤكد. لا يمكن إنتاج حمولة خارجية قبل '
            'الحصول على العقد الرسمي — جرى تثبيت العقد المحلي فقط.'
        )

    def describe(self) -> dict:
        return {
            'event_id': self.event_id,
            'event_type': self.event_type,
            'event_time': self.event_time,
            'location': dict(self.location),
            'risk_assessment': dict(self.risk_assessment),
            'public_health_action': dict(self.public_health_action),
            'external_schema_confirmed': self.external_schema_confirmed,
        }


class IHREventAdapter:
    """قدرة أحداث IHR — بناء العقد منفصل عن النقل.

    Phase 1: ``submit`` يرفض دائماً ما لم يكن هناك نقل مُحقن، ومسار الإرسال
    يبقى فارغاً حتى تأكيد العقد الرسمي. لا إرسال.
    """

    def __init__(self, parent: WHOAdapter, transport=None):
        self._parent = parent
        self._transport = transport if transport is not None else parent.transport

    @property
    def available(self) -> bool:
        return Capability.IHR_EVENTS.value in self._parent.get_status().detail.get('ready_capabilities', ())

    def endpoint(self) -> EndpointContract:
        """نقطة الإرسال — من الإعدادات فقط. فارغة ⇐ لا شيء يُخمَّن."""
        return self._parent.endpoint_contract(IHR_NAMESPACE, http_method='POST')

    def build_event(self, nqp_payload: Mapping) -> IHREventContract:
        """بناء العقد المحلي من حمولة NQP — بلا شبكة وبلا قاعدة بيانات."""
        return IHREventContract.from_nqp_payload(nqp_payload)

    def submit(self, event: IHREventContract):
        """محجوب في Phase 1.

        حتى مع نقل مُحقن، لا مسار إرسال مؤكد. الغرض أن يكون الرفض صريحاً
        عند نقطة معروفة بدل اكتشافه أثناء حادث.
        """
        self._parent.refuse(
            'إرسال حدث IHR إلى WHO غير ممكن: '
            'WHO_IHR_EVENTS_PATH غير مؤكد رسمياً ولم يُكتمل عقد IHR الخارجي.',
            ErrorCategory.CONFIGURATION_ERROR,
        )

    def audit_preview(self, event: IHREventContract) -> AuditEvent:
        """معاينة حدث تدقيق **بلا كتابة** — لإثبات شكل السجل المستقبلي.

        ``IntegrationLog`` لا يُلمس: لا ``save`` ولا ``create``.
        """
        return AuditEvent(
            organization=self._parent.organization.identifier,
            operation='IHR_EVENT_SUBMIT',
            outcome=AuditOutcome.NOT_ATTEMPTED,
            status='UNCONFIRMED_ENDPOINT',
            correlation_id=event.event_id,
            detail={
                'event_type': event.event_type,
                'external_schema_confirmed': event.external_schema_confirmed,
            },
        )
