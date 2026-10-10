"""أساس تكامل المنظمات الخارجية — طبقة عقد محايدة عن أي منظمة.

لا تعرف هذه الحزمة WHO ولا أي منظمة بعينها: ``adapters/`` هو ما يترجم
عقداً عاماً إلى إعدادات منظمة محددة. هذا ما يجعل إضافة IOM أو UNICEF
إضافة محوّل فقط، دون لمس الأساس.

المبدأ الحاكم: **deny by default** — الإعداد لا يعني الاتصال، والاتصال
لا يعني التفويض، والقدرة المعلنة لا تعني أنها متاحة.
"""

from .adapter import (
    IntegrationRequest,
    OrganizationAdapter,
    RefusingTransport,
    Transport,
)
from .audit import UNMAPPED_FIELDS, AuditEvent, AuditOutcome
from .contract import (
    STATUS_PRECEDENCE,
    Capability,
    DataSharingScope,
    IntegrationReadiness,
    IntegrationStatus,
    IntegrationStatusError,
    IntegrationStatusReport,
    Organization,
    OrganizationType,
    derive_status,
)
from .endpoints import (
    AuthenticationContract,
    AuthenticationType,
    EndpointContract,
    EndpointContractError,
)
from .results import (
    ErrorCategory,
    IntegrationError,
    IntegrationResult,
    contains_sensitive_text,
    map_error,
    redact_text,
)

__all__ = [
    'STATUS_PRECEDENCE',
    'UNMAPPED_FIELDS',
    'AuditEvent',
    'AuditOutcome',
    'AuthenticationContract',
    'AuthenticationType',
    'Capability',
    'DataSharingScope',
    'EndpointContract',
    'EndpointContractError',
    'ErrorCategory',
    'IntegrationError',
    'IntegrationReadiness',
    'IntegrationRequest',
    'IntegrationResult',
    'IntegrationStatus',
    'IntegrationStatusError',
    'IntegrationStatusReport',
    'Organization',
    'OrganizationAdapter',
    'OrganizationType',
    'RefusingTransport',
    'Transport',
    'contains_sensitive_text',
    'derive_status',
    'map_error',
    'redact_text',
]
