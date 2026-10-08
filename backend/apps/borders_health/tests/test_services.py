"""اختبارات منطق النطاق (خدمات نظام صحة المعابر البرية)."""
from datetime import date

import pytest
from django.utils import timezone

from apps.borders_health.models import (
    BorderCertificate,
    BorderCrossing,
    BorderSample,
    BorderScreening,
    QuarantineCase,
    TravelerHealthRecord,
)
from apps.borders_health.services import (
    assess_cargo_inspection,
    assess_screening,
    issue_certificate,
    open_quarantine_case,
    national_overview,
    record_clearance_decision,
    refresh_daily_statistics,
)
from apps.masterdata.models import EntryPoint, Sector, State
from apps.travelers.models import Country, Traveler

pytestmark = pytest.mark.django_db


@pytest.fixture
def crossing():
    sector = Sector.objects.create(code='SEC1', name_ar='قطاع')
    state = State.objects.create(code='ST1', name_ar='ولاية', sector=sector)
    ep = EntryPoint.objects.create(
        code='BX', name_ar='معبر', kind=EntryPoint.Kind.LAND_PORT, state=state,
    )
    return BorderCrossing.objects.create(entry_point=ep, neighbor_country='دولة')


@pytest.fixture
def traveler():
    country = Country.objects.create(code='C1', name_ar='بلد')
    return Traveler.objects.create(
        first_name='س', last_name='المسافر', date_of_birth=date(1990, 1, 1),
        passport_number='X1', nationality=country,
    )


# ---------------------------------------------------------------------------
# قاعدة القرار
# ---------------------------------------------------------------------------


def test_fever_triggers_red_quarantine():
    risk, decision = assess_screening(body_temperature=38.4, document_verified=True)
    assert risk == TravelerHealthRecord.RiskLevel.RED
    assert decision == BorderScreening.Decision.QUARANTINED


def test_hypoxia_triggers_red_quarantine():
    risk, decision = assess_screening(oxygen_saturation=90, document_verified=True)
    assert risk == TravelerHealthRecord.RiskLevel.RED
    assert decision == BorderScreening.Decision.QUARANTINED


def test_symptoms_refer():
    risk, decision = assess_screening(observed_symptoms='سعال,حمى', document_verified=True)
    assert risk == TravelerHealthRecord.RiskLevel.YELLOW
    assert decision == BorderScreening.Decision.REFERRED


def test_missing_documents_hold():
    risk, decision = assess_screening(document_verified=False)
    assert risk == TravelerHealthRecord.RiskLevel.YELLOW
    assert decision == BorderScreening.Decision.HOLD


def test_clean_screening_clears():
    risk, decision = assess_screening(document_verified=True, vaccination_verified=True)
    assert risk == TravelerHealthRecord.RiskLevel.GREEN
    assert decision == BorderScreening.Decision.CLEARED


def test_vitals_outrank_symptoms():
    """الحمّى تتقدّم على الأعراض الموصوفة وتُرجّح الحجر."""
    risk, _ = assess_screening(
        body_temperature=39.0, observed_symptoms='سعال', document_verified=True,
    )
    assert risk == TravelerHealthRecord.RiskLevel.RED


# ---------------------------------------------------------------------------
# قرار الشحنة
# ---------------------------------------------------------------------------


def test_rejected_sample_rejects_cargo(crossing):
    from apps.borders_health.models import CargoInspection

    cargo = CargoInspection.objects.create(crossing=crossing, scope='FOOD')
    BorderSample.objects.create(
        crossing=crossing, cargo_inspection=cargo, sample_type='FOOD',
        status=BorderSample.SampleStatus.REJECTED,
    )
    assert assess_cargo_inspection(cargo) == 'REJECTED'


def test_positive_result_rejects_cargo(crossing):
    from apps.borders_health.models import CargoInspection

    cargo = CargoInspection.objects.create(crossing=crossing, scope='FOOD')
    BorderSample.objects.create(
        crossing=crossing, cargo_inspection=cargo, sample_type='FOOD',
        status=BorderSample.SampleStatus.RESULT_RECEIVED, result='Positive - E. coli',
    )
    assert assess_cargo_inspection(cargo) == 'REJECTED'


def test_in_flight_sample_holds_cargo(crossing):
    from apps.borders_health.models import CargoInspection

    cargo = CargoInspection.objects.create(crossing=crossing, scope='FOOD')
    BorderSample.objects.create(
        crossing=crossing, cargo_inspection=cargo, sample_type='FOOD',
        status=BorderSample.SampleStatus.UNDER_TEST,
    )
    assert assess_cargo_inspection(cargo) == 'HOLD'


def test_negative_result_clears_cargo(crossing):
    from apps.borders_health.models import CargoInspection

    cargo = CargoInspection.objects.create(crossing=crossing, scope='FOOD')
    BorderSample.objects.create(
        crossing=crossing, cargo_inspection=cargo, sample_type='FOOD',
        status=BorderSample.SampleStatus.RESULT_RECEIVED, result='Negative',
    )
    assert assess_cargo_inspection(cargo) == 'CLEARED'


def test_cargo_without_samples_defaults_hold(crossing):
    from apps.borders_health.models import CargoInspection

    cargo = CargoInspection.objects.create(crossing=crossing, scope='CARGO')
    assert assess_cargo_inspection(cargo) == 'HOLD'


# ---------------------------------------------------------------------------
# الأرقام المولّدة
# ---------------------------------------------------------------------------


def test_certificate_number_is_unique_and_scoped(crossing):
    a = issue_certificate(crossing=crossing, certificate_type='HEALTH_CLEARANCE')
    b = issue_certificate(crossing=crossing, certificate_type='HEALTH_CLEARANCE')
    assert a.certificate_number != b.certificate_number
    assert a.certificate_number.startswith('BC-')
    assert a.qr_payload and a.certificate_number in a.qr_payload


def test_certificate_expiry_and_issued(crossing):
    cert = issue_certificate(
        crossing=crossing, certificate_type='HEALTH_CLEARANCE', expiry_days=7,
    )
    assert cert.status == BorderCertificate.Status.ISSUED
    assert (cert.expiry_date - cert.issue_date).days == 7


def test_quarantine_case_number_and_dates(crossing, traveler):
    case = open_quarantine_case(
        crossing=crossing, traveler=traveler, required_days=10,
    )
    assert case.case_number
    assert (case.expected_end_date - case.entry_at.date()).days == 10
    assert case.status == QuarantineCase.QuarantineStatus.UNDER_QUARANTINE
    assert case.person_name == traveler.full_name


def test_clearance_decision_recorded(crossing, traveler):
    from apps.borders_health.models import BorderDecision

    d = record_clearance_decision(
        crossing=crossing, subject_type='TRAVELER', outcome='CLEARED',
        traveler=traveler, reason='سليم',
    )
    assert BorderDecision.objects.filter(pk=d.pk).exists()
    assert d.outcome == 'CLEARED'


# ---------------------------------------------------------------------------
# الإحصاءات
# ---------------------------------------------------------------------------


def test_refresh_daily_statistics_aggregates(crossing, traveler):
    from apps.borders_health.models import Vehicle

    TravelerHealthRecord.objects.create(
        crossing=crossing, traveler=traveler, direction='INBOUND',
        risk_level=TravelerHealthRecord.RiskLevel.RED,
    )
    TravelerHealthRecord.objects.create(
        crossing=crossing, traveler=traveler, direction='OUTBOUND',
    )
    stats = refresh_daily_statistics(crossing)
    assert stats.travelers_inbound == 1
    assert stats.travelers_outbound == 1
    assert stats.suspected_cases == 1


def test_refresh_daily_statistics_is_idempotent(crossing, traveler):
    TravelerHealthRecord.objects.create(crossing=crossing, traveler=traveler)
    first = refresh_daily_statistics(crossing)
    second = refresh_daily_statistics(crossing)
    assert first.pk == second.pk
    assert BorderCrossing.objects.count() == 1


def test_national_overview_empty_is_safe():
    out = national_overview([])
    assert out['crossings'] == 0
    assert out['travelers_today'] == 0


def test_national_overview_counts(crossing, traveler):
    open_quarantine_case(crossing=crossing, traveler=traveler)
    TravelerHealthRecord.objects.create(
        crossing=crossing, traveler=traveler, risk_level=TravelerHealthRecord.RiskLevel.RED,
    )
    out = national_overview([crossing.id])
    assert out['crossings'] == 1
    assert out['active_quarantine'] == 1
    assert out['suspected_cases'] == 1


# ---------------------------------------------------------------------------
# إصلاحات: تنسيق الأعراض، صلاحية الإجراءات، اكتمال الملخص، متوسط المعالجة
# ---------------------------------------------------------------------------


def test_assess_screening_accepts_symptom_list():
    """`observed_symptoms` حقل JSON ⇒ يجب أن تُقبل القائمة كما النص."""
    risk, decision = assess_screening(
        observed_symptoms=['حمى', 'سعال'], document_verified=True,
    )
    assert (risk, decision) == (
        TravelerHealthRecord.RiskLevel.YELLOW, BorderScreening.Decision.REFERRED,
    )


def test_assess_screening_accepts_symptom_string_and_empty_forms():
    for value, expected in [
        ('حمى, سعال', TravelerHealthRecord.RiskLevel.YELLOW),
        ('', TravelerHealthRecord.RiskLevel.GREEN),
        ([], TravelerHealthRecord.RiskLevel.GREEN),
        (None, TravelerHealthRecord.RiskLevel.GREEN),
    ]:
        risk, _ = assess_screening(observed_symptoms=value, document_verified=True)
        assert risk == expected, value


def test_assess_screening_does_not_crash_on_nested_json_value():
    """قيمة JSON غير نصية/قائمة (مثل رقم) لا ترفع استثناءً."""
    risk, _ = assess_screening(observed_symptoms=42, document_verified=True)
    assert risk in list(TravelerHealthRecord.RiskLevel)


def test_national_overview_shape_is_consistent(crossing, traveler):
    """مفتاح `open_emergencies` يجب أن يظهر في الفرعين معاً."""
    empty = national_overview([])
    populated = national_overview([crossing.id])
    assert set(empty) == set(populated), 'شكل الملخص يختلف بين الفرعين'
    assert 'open_emergencies' in populated


def test_national_overview_counts_open_emergencies(crossing, traveler):
    from apps.borders_health.models import BorderEmergency

    BorderEmergency.objects.create(
        crossing=crossing, title='تفشي عند معبر', status='ACTIVE',
    )
    out = national_overview([crossing.id])
    assert out['open_emergencies'] == 1


def test_daily_statistics_computes_average_processing(crossing, traveler):
    """متوسط زمن المعالجة يُحسب من الفارق بين الدخول وإتمام الفحص."""
    from datetime import timedelta

    TravelerHealthRecord.objects.create(
        crossing=crossing, traveler=traveler, direction='INBOUND',
        entry_at=timezone.now() - timedelta(hours=2),
    )
    BorderScreening.objects.create(
        crossing=crossing, traveler=traveler, document_verified=True,
        risk_level=TravelerHealthRecord.RiskLevel.GREEN,
        decision=BorderScreening.Decision.CLEARED,
        screened_at=timezone.now() - timedelta(hours=1),
    )
    stats = refresh_daily_statistics(crossing)
    assert stats.average_processing_minutes is not None
    assert 100 <= stats.average_processing_minutes <= 130


def test_daily_statistics_average_is_none_without_screening(crossing, traveler):
    TravelerHealthRecord.objects.create(
        crossing=crossing, traveler=traveler, direction='INBOUND',
    )
    stats = refresh_daily_statistics(crossing)
    assert stats.average_processing_minutes is None
