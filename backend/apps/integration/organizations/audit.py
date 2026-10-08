"""عقد التدقيق — ما الذي يُسجَّل عن كل عملية تكامل، وكيف يُربط بالسجل القائم.

إعادة استخدام البنية القائمة (لا نموذج جديد في Phase 1):

* ``IntegrationLog`` في ``apps.integration.models`` جدول تدقيق عام بـ:
  ``integration_name`` / ``request_type`` / ``request_payload`` /
  ``response_payload`` / ``status_code``. يُعاد استخدامه كما هو.
* لا يوجد في ``IntegrationLog`` حقل لـ: معرّف الارتباط، المدة، أو فئة الخطأ.
  لذلك ``AuditEvent`` يحملها كاملة، و ``to_integration_log_fields()`` تُسقط
  الثلاثة وتُعلنها في ``UNMAPPED_FIELDS`` — توثيق فجوة تتطلب migration
  (خارج Phase 1، وموقوفة على مراجعة بشرية).

قواعد:

* **لا كتابة في Phase 1.** هذه الوحدة تبني قاموساً فقط ولا تلمس قاعدة
  البيانات ولا تستورد نماذج Django. ``models.IntegrationLog`` يظهر في
  ``to_integration_log_fields`` كسلسلة نصية للربط لا كمرجع فعلي.
* **لا أسرار ولا حمولة صحية خام.** ``AuditEvent`` يحمل أسماء عمليات
  ومراجع ونتائج منقّاة، لا رؤوس مصادقة ولا بيانات مرضى.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone as dt_timezone

from .contract import LabeledEnum
from .results import ErrorCategory, redact_text

#: حقول ``AuditEvent`` التي لا يقابلها حقل في ``IntegrationLog`` القائمة.
#: إضافةُ أيٍّ منها تتطلب migration — خارج نطاق Phase 1.
UNMAPPED_FIELDS = ('correlation_id', 'duration_ms', 'error_category')


class AuditOutcome(LabeledEnum):
    """نتيجة عملية واحدة من منظور التدقيق — مستقلة عن ``IntegrationStatus``."""

    SUCCESS = 'SUCCESS', 'نجحت'
    FAILED = 'FAILED', 'فشلت'
    REFUSED = 'REFUSED', 'رُفضت قبل الإرسال'
    NOT_ATTEMPTED = 'NOT_ATTEMPTED', 'لم تُحاول'


@dataclass(frozen=True)
class AuditEvent:
    """حدث تدقيق واحد — وصف ثابت قابل للتسلسل.

    ``duration_ms`` تُحسب من ``duration_seconds`` إن لم تُمرَّر مباشرة،
    لأن الطابع الزمني وحده لا يكفي لقياس المدة.
    """

    organization: str
    operation: str
    outcome: AuditOutcome
    status: str = ''
    timestamp: datetime = None
    correlation_id: str = ''
    duration_ms: int = 0
    error_category: ErrorCategory = None
    external_reference: str = ''
    detail: dict = field(default_factory=dict)

    def __post_init__(self):
        if not str(self.organization or '').strip():
            raise ValueError('AuditEvent يتطلب organization.')
        if not str(self.operation or '').strip():
            raise ValueError('AuditEvent يتطلب operation.')
        if self.timestamp is None:
            object.__setattr__(self, 'timestamp', datetime.now(dt_timezone.utc))
        if self.duration_ms is None:
            object.__setattr__(self, 'duration_ms', 0)
        object.__setattr__(self, 'detail', dict(self.detail or {}))

    @property
    def succeeded(self) -> bool:
        return self.outcome is AuditOutcome.SUCCESS

    def sanitized_summary(self) -> dict:
        """ملخّص آمن للتسجيل.

        يمنع ثلاث فئات: رؤوس ``Authorization``، قيم الاعتماد، والحمولة
        الخام. ``detail`` يُنسخ كما هو لكن **بعد تنقية نصية لكل قيمه**،
        حتى لا يمرّ سرّ عبر مفتاح جانبي.
        """
        safe_detail = {str(k): redact_text(v) for k, v in self.detail.items()}
        return {
            'organization': self.organization,
            'operation': self.operation,
            'outcome': self.outcome.value,
            'status': self.status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else '',
            'correlation_id': self.correlation_id,
            'duration_ms': self.duration_ms,
            'error_category': self.error_category.value if self.error_category else '',
            'external_reference': self.external_reference,
            'detail': safe_detail,
        }

    def to_integration_log_fields(self) -> dict:
        """تحويل إلى حقول ``IntegrationLog`` القائمة.

        يُسقط ``UNMAPPED_FIELDS`` عمداً لأن الجدول لا يحويها. الأسماء
        المستهدفة في السطر أدناه تطابق أعمدة ``IntegrationLog`` تماماً.
        """
        return {
            'integration_name': self.organization,
            'request_type': self.operation,
            'request_payload': {
                'correlation_id': self.correlation_id,
                'outcome': self.outcome.value,
                'detail': {str(k): redact_text(v) for k, v in self.detail.items()},
            },
            'response_payload': {
                'status': self.status,
                'external_reference': self.external_reference,
                'error_category': self.error_category.value if self.error_category else '',
                'duration_ms': self.duration_ms,
            },
            'status_code': None,
        }

    def unmapped_fields(self) -> tuple:
        """الحقول التي لا يمكن تمثيلها في ``IntegrationLog`` حالياً."""
        present = []
        if self.correlation_id:
            present.append('correlation_id')
        if self.duration_ms:
            present.append('duration_ms')
        if self.error_category is not None:
            present.append('error_category')
        return tuple(f for f in UNMAPPED_FIELDS if f in present)

    def __repr__(self) -> str:  # pragma: no cover - حماية من التسرّب في السجلات
        return f'<AuditEvent {self.organization}/{self.operation} {self.outcome.value}>'
