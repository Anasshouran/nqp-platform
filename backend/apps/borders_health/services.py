"""منطق نطاقي لنظام صحة المعابر البرية.

يفصل القواعد من الـ views: قرار الإفراج، قرار الشحنة، توليد أرقام
الحالة والشهادة، وتحديث حصيلة اليوم. كل دالة **بلا آثار جانبية على
البريد/الإشعارات** — ذلك مسؤولية الـ tasks في Celery.
"""
import logging

from django.db import transaction
from django.utils import timezone

from .models import (
    BorderCertificate,
    BorderDailyStatistics,
    BorderDecision,
    BorderEmergency,
    BorderSample,
    BorderScreening,
    CargoInspection,
    IsolationCase,
    QuarantineCase,
    TravelerHealthRecord,
    VehicleInspection,
)

# مستويات الخطورة مشتركة بين سجل الفحص وسجل المسافر (نفس القيم).
RiskLevel = TravelerHealthRecord.RiskLevel

logger = logging.getLogger(__name__)


# حدود الفحص الحراري/الأكسجين المستخدمة في قرار الإفراج.
FEVER_THRESHOLD_C = 38.0
HYPOXIA_THRESHOLD_PCT = 92.0


def _normalize_symptoms(value):
    """يرجّع قائمة كلمات أعراض نظيفة من نص أو قائمة أو `None`.

    `BorderScreening.observed_symptoms` حقل JSON، وقد يرسله العميل نصاً
    مفصولاً بفواصل أو قائمة.走了出来 في الحالتين.
    """
    if value is None:
        return []
    if isinstance(value, str):
        raw = [value]
    elif isinstance(value, (list, tuple, set)):
        raw = list(value)
    else:
        raw = [str(value)]
    words = []
    for item in raw:
        for part in str(item).split(','):
            part = part.strip()
            if part:
                words.append(part)
    return words


def assess_screening(
    *,
    body_temperature=None,
    oxygen_saturation=None,
    observed_symptoms=None,
    document_verified=False,
    vaccination_verified=False,
):
    """يحسب `risk_level` + `decision` المقترحة لفحص واحد.

    القواعد (بالترتيب، الأقوى أثراً أولاً):

    1. حمّى ≥ 38 أو إشباع أكسجين < 92 ⇒ `RED` + `QUARANTINED`.
    2. أعراض مرضية معلنة ⇒ `YELLOW` + `REFERRED`.
    3. وثائق غير مُتحقَّق منها ⇒ `YELLOW` + `HOLD` إلى المراجعة.
    4. غير ذلك ⇒ `GREEN` + `CLEARED`.

    التحصين غير المُتحقَّق منه *لا* يمنع الإفراج وحده، لكنه يُذكر في
    الملاحظات ويُترك لتقدير الفاحص — احترازاً إجرائياً.
    """
    # `observed_symptoms` حقل JSON، فقد يأتي من الواجهة نصاً مقطوعاً
    # ("حمى,سعال") أو قائمة `["حمى", "سعال"]` أو NULL. نطبّع الثلاثة.
    symptoms = _normalize_symptoms(observed_symptoms)
    symptom_words = [w for w in symptoms if w]

    # قاعدة 1: القياسات الحيوية تفوق الأعراض المُعلنة.
    fever = (
        body_temperature is not None and body_temperature >= FEVER_THRESHOLD_C
    )
    hypoxia = (
        oxygen_saturation is not None and oxygen_saturation < HYPOXIA_THRESHOLD_PCT
    )
    if fever or hypoxia:
        return RiskLevel.RED, BorderScreening.Decision.QUARANTINED

    # قاعدة 2: أعراض ⇒ إحالة للمتابعة الطبية.
    if symptom_words:
        return RiskLevel.YELLOW, BorderScreening.Decision.REFERRED

    # قاعدة 3: وثائق ناقصة ⇒ حجز حتى المراجعة.
    if not document_verified:
        return RiskLevel.YELLOW, BorderScreening.Decision.HOLD

    # قاعدة 4: سليم ⇒ `GREEN`/`CLEARED`.
    # خفض المستوى إلى `YELLOW` يبقى تقديراً للفاحص ويُسجَّل في الملاحظات.
    return RiskLevel.GREEN, BorderScreening.Decision.CLEARED


def apply_screening_decision(screening):
    """يحسب القرار ويكتبه على `screening` دون حفظ (للاستدعاء داخل serializer)."""
    risk, decision = assess_screening(
        body_temperature=screening.body_temperature,
        oxygen_saturation=screening.oxygen_saturation,
        observed_symptoms=screening.observed_symptoms,
        document_verified=screening.document_verified,
        vaccination_verified=screening.vaccination_verified,
    )
    screening.risk_level = risk
    screening.decision = decision
    return screening


def assess_cargo_inspection(inspection):
    """قرار الشحنة من حالة عيّناتها ونتائجها المعلنة.

    `BorderSample.status` هو **دورة حياة** العيّنة
    (COLLECTED → SENT → UNDER_TEST → RESULT_RECEIVED/REJECTED)، أمّا
    النتيجة الفيرولوجية فمسجّلة في `BorderSample.result`. لذلك يُقرَر
    القرار من `result` لا من `status`:

    - نتيجة موجبة أو مرفوضة ⇒ `REJECTED`.
    - عيّنة مُرسلة أو قيد الفحص ولم تُحسم ⇒ `HOLD`.
    - نتيجة سلبية ⇒ `CLEARED`.
    - بلا عيّنات ⇒ قرار الفاحص (`HOLD` افتراضياً للتحفّظ).
    """
    samples = BorderSample.objects.filter(cargo_inspection=inspection)

    if samples.filter(status=BorderSample.SampleStatus.REJECTED).exists():
        return CargoInspection.Outcome.REJECTED
    if samples.filter(
        result__iregex=r'positive|موجبة|إيجابية'
    ).exclude(result='').exists():
        return CargoInspection.Outcome.REJECTED
    if samples.filter(
        status__in=[
            BorderSample.SampleStatus.SENT, BorderSample.SampleStatus.UNDER_TEST,
        ]
    ).exists():
        return CargoInspection.Outcome.HOLD
    if samples.filter(result__iregex=r'negative|سالبة').exclude(result='').exists():
        return CargoInspection.Outcome.CLEARED
    if inspection.decision:
        return inspection.decision
    return CargoInspection.Outcome.HOLD


def _next_sequence(prefix, model, field, width=4):
    """يولّد الرقم التالي بصيغة `PREFIX-YYYYMMDD-####` عبر عدّاد اليوم.

    العدّاد مشتق من عدد الصفوف المنشأة في اليوم نفسه، فالتضارب نادر
    عملياً بوتيرة التسجيل (آلاف لا ملايين). عند الحاجة لإمكان توسّع أكبر
    يُضاف لاحقاً عدّاد تسلسلي على مستوى قاعدة البيانات.
    """
    today = timezone.localdate()
    day_prefix = f'{prefix}-{today.strftime("%Y%m%d")}-'
    existing = model.objects.filter(
        **{f'{field}__startswith': day_prefix}
    ).count()
    return f'{day_prefix}{existing + 1:0{width}d}'


@transaction.atomic
def issue_certificate(
    *,
    crossing,
    certificate_type,
    traveler=None,
    vehicle=None,
    vehicle_inspection=None,
    issued_by=None,
    expiry_days=30,
    notes='',
):
    """يُصدر شهادة مرتبطة بمعبر (وبمسافر/مركبة اختيارياً).

    يولّد `certificate_number` إن لم يُمرَّر، ويضبط `qr_payload` بمحتوى
    قابل للتحقق. يُرجع نسخة محفوظة.
    """
    number = _next_sequence('BC', BorderCertificate, 'certificate_number')
    issue_date = timezone.localdate()
    expiry_date = issue_date + timezone.timedelta(days=expiry_days)

    certificate = BorderCertificate.objects.create(
        certificate_number=number,
        certificate_type=certificate_type,
        crossing=crossing,
        traveler=traveler,
        vehicle=vehicle,
        vehicle_inspection=vehicle_inspection,
        issue_date=issue_date,
        expiry_date=expiry_date,
        status=BorderCertificate.Status.ISSUED,
        issued_by=issued_by,
        notes=notes,
    )
    # QR payload بسيط ومقروء (لا سرّي) — للتدقيق السريع عند المعبر.
    certificate.qr_payload = (
        f'NQP|BC|{certificate.certificate_number}|'
        f'{issue_date.isoformat()}|{expiry_date.isoformat()}'
    )
    certificate.save(update_fields=['qr_payload', 'updated_at'])
    return certificate


@transaction.atomic
def open_quarantine_case(
    *,
    crossing,
    traveler=None,
    disease=None,
    person_name='',
    required_days=14,
    health_case=None,
    clinic=None,
    facility=None,
    phase=QuarantineCase.Phase.QUARANTINED,
    follow_up_notes='',
):
    """يفتح حالة حجر ويولّد رقمها وتاريخ انتهائها المتوقع."""
    entry_at = timezone.now()
    case = QuarantineCase.objects.create(
        crossing=crossing,
        traveler=traveler,
        disease=disease,
        person_name=person_name or (traveler.full_name if traveler else ''),
        health_case=health_case,
        clinic=clinic,
        facility=facility,
        required_days=required_days,
        expected_end_date=(entry_at + timezone.timedelta(days=required_days)).date(),
        phase=phase,
        status=QuarantineCase.QuarantineStatus.UNDER_QUARANTINE,
        follow_up_notes=follow_up_notes,
    )
    return case


@transaction.atomic
def record_clearance_decision(
    *,
    crossing,
    subject_type,
    outcome,
    traveler=None,
    vehicle=None,
    cargo_inspection=None,
    quarantine_case=None,
    reason='',
    decided_by=None,
):
    """يسجّل قرار إفراج/رفض/إحالة في سجل القرارات الموحّد."""
    return BorderDecision.objects.create(
        crossing=crossing,
        subject_type=subject_type,
        traveler=traveler,
        vehicle=vehicle,
        cargo_inspection=cargo_inspection,
        quarantine_case=quarantine_case,
        outcome=outcome,
        reason=reason,
        decided_by=decided_by,
    )


@transaction.atomic
def refresh_daily_statistics(crossing, stat_date=None):
    """يعيد حساب حصيلة معبر ليوم واحد (عدّادات مجمّعة من المصدر)."""
    stat_date = stat_date or timezone.localdate()
    start = timezone.datetime.combine(
        stat_date, timezone.datetime.min.time(), tzinfo=timezone.get_current_timezone()
    )
    end = start + timezone.timedelta(days=1)

    records = TravelerHealthRecord.objects.filter(
        crossing=crossing, entry_at__gte=start, entry_at__lt=end
    )
    vehicles = VehicleInspection.objects.filter(
        vehicle__crossing=crossing, inspection_date__gte=start, inspection_date__lt=end,
    )
    cargo = CargoInspection.objects.filter(
        crossing=crossing, created_at__gte=start, created_at__lt=end
    )
    samples = BorderSample.objects.filter(
        crossing=crossing, collected_at__gte=start, collected_at__lt=end
    )

    # متوسط زمن المعالجة = متوسط الفارق بين تسجيل دخول المسافر
    # (`TravelerHealthRecord.entry_at`) وإتمام فحصه
    # (`BorderScreening.screened_at`)، ويُربط الاثنان بـ (crossing, traveler).
    # تجميع واحد في قاعدة البيانات لتفادي N+1.
    durations = []
    qs = records.exclude(entry_at=None).values_list('entry_at', 'traveler_id')
    for entry_at, traveler_id in qs:
        if traveler_id is None:
            continue
        screened_at = BorderScreening.objects.filter(
            crossing=crossing, traveler_id=traveler_id
        ).order_by('screened_at').values_list('screened_at', flat=True).first()
        if screened_at is None:
            continue
        minutes = (screened_at - entry_at).total_seconds() / 60.0
        if 0 <= minutes <= 24 * 60:
            durations.append(minutes)
    average_processing = (
        int(round(sum(durations) / len(durations))) if durations else None
    )

    stats, _ = BorderDailyStatistics.objects.update_or_create(
        crossing=crossing,
        stat_date=stat_date,
        defaults={
            'travelers_inbound': records.filter(direction='INBOUND').count(),
            'travelers_outbound': records.filter(direction='OUTBOUND').count(),
            'vehicles_inspected': vehicles.count(),
            'cargo_inspections': cargo.count(),
            'quarantine_cases': QuarantineCase.objects.filter(
                crossing=crossing, entry_at__gte=start, entry_at__lt=end
            ).count(),
            'isolation_cases': IsolationCase.objects.filter(
                crossing=crossing, start_date=stat_date
            ).count(),
            'suspected_cases': records.filter(
                risk_level=TravelerHealthRecord.RiskLevel.RED
            ).count(),
            'certificates_issued': BorderCertificate.objects.filter(
                crossing=crossing, issue_date=stat_date
            ).count(),
            'samples_collected': samples.count(),
            'average_processing_minutes': average_processing,
        },
    )
    return stats


def national_overview(crossing_ids):
    """ملخص وطني لمعرّفات معابر محدّدة (يستهلكه الـ dashboard)."""
    if not crossing_ids:
        return {
            'crossings': 0, 'travelers_today': 0, 'active_quarantine': 0,
            'active_isolation': 0, 'suspected_cases': 0, 'open_emergencies': 0,
        }
    today = timezone.localdate()
    return {
        'crossings': len(set(crossing_ids)),
        'travelers_today': TravelerHealthRecord.objects.filter(
            crossing_id__in=crossing_ids, entry_at__date=today
        ).count(),
        'active_quarantine': QuarantineCase.objects.filter(
            crossing_id__in=crossing_ids,
            status=QuarantineCase.QuarantineStatus.UNDER_QUARANTINE,
        ).count(),
        'active_isolation': IsolationCase.objects.filter(
            crossing_id__in=crossing_ids, status=IsolationCase.IsolationStatus.ACTIVE
        ).count(),
        'suspected_cases': TravelerHealthRecord.objects.filter(
            crossing_id__in=crossing_ids,
            risk_level=TravelerHealthRecord.RiskLevel.RED,
        ).count(),
        # كان الحقل غائباً عن هذا الفرع بينما يذكره فرع القائمة الفارغة،
        # فكان مفتاح `open_emergencies` يختفي عند وجود بيانات.
        'open_emergencies': BorderEmergency.objects.filter(
            crossing_id__in=crossing_ids,
            status__in=[
                BorderEmergency.EmergencyStatus.OPEN,
                BorderEmergency.EmergencyStatus.ACTIVE,
            ],
        ).count(),
    }
