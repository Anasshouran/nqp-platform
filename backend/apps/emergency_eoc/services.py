"""خدمات الترصد الصحي: محرك الإنذار المبكر (EWARS)، الإنذار الفوري، الجسر للأحداث، الإشعارات."""

import math
import uuid
from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import RoleAssignment


def _hex(token_length=6):
    return uuid.uuid4().hex[:token_length].upper()


def generate_case_number():
    return f'C-{_hex()}'


def generate_alert_number():
    return f'EW-{_hex()}'


def generate_contact_number():
    return f'CT-{_hex()}'


def generate_report_number():
    return f'WR-{_hex()}'


def generate_investigation_number():
    return f'INV-{_hex()}'


def generate_event_number():
    return f'E-{_hex()}'


def _active_assignments_by_role(role_codes):
    """مستخدمو الدور حسب تعييناته الحالية أو حقل الدور القديم."""
    if not role_codes:
        return []
    User = get_user_model()
    assignment_user_ids = (
        RoleAssignment.objects.filter(role__code__in=role_codes, is_active=True)
        .values_list('user_id', flat=True)
        .distinct()
    )
    qs = User.objects.filter(is_active=True)
    from django.db.models import Q
    qs = qs.filter(Q(id__in=assignment_user_ids) | Q(role__code__in=role_codes))
    return list(qs.distinct())


def notify_roles(alert, role_codes):
    """ينشئ سجلات إشعار (NotificationLog) لمستخدمي الأدوار المحددة."""
    from apps.notifications.models import NotificationLog
    now = timezone.now()
    subject = f'إنذار ترصد: {alert.title}'
    body = (
        f'{alert.title}\n'
        f'المرض: {alert.disease.name_ar if alert.disease else "-"}\n'
        f'المستوى: {alert.get_level_display()}\n'
        f'الوصف: {alert.description or "-"}'
    )
    for user in _active_assignments_by_role(role_codes):
        NotificationLog.objects.create(
            user=user,
            channel='push',
            recipient=user.email,
            subject=subject,
            body=body,
            status=NotificationLog.NotificationStatus.SENT,
            sent_at=now,
        )


def _level_for_count(count, threshold, baseline):
    ratio = count / max(threshold, 1)
    if baseline and baseline > 0:
        base_ratio = count / baseline
    else:
        base_ratio = 0
    if ratio >= 3 or base_ratio >= 3:
        return 'LEVEL_3'
    if ratio >= 2 or base_ratio >= 2:
        return 'LEVEL_2'
    return 'LEVEL_1'


def _dedupe_window_alerts(disease, window_start, sector_id, locality_id, port_id):
    from .models import SurveillanceAlert
    return SurveillanceAlert.objects.filter(
        alert_type=SurveillanceAlert.AlertType.EWARS_THRESHOLD,
        disease=disease,
        generated_at__gte=window_start,
        status__in=[
            SurveillanceAlert.Status.NEW,
            SurveillanceAlert.Status.ACKNOWLEDGED,
            SurveillanceAlert.Status.RESPONDING,
        ],
        sector_id=sector_id,
        locality_id=locality_id,
        port_id=port_id,
    ).exists()


def compute_ewars(now=None):
    """محرك الإنذار المبكر: يعدّ الحالات لكل مرض/نطاق، ويقارن بخط الأساس، ويولّد الإنذارات.

    يُنشئ إنذاراً لكل (مرض، قطاع، محلية، منفذ) تتجاوز عدّاداته العتبة مع مراعاة الخط الأساس،
    ثم يرسل إشعارات لمستخدمي notified_roles ويجسّر LEVEL≥2 إلى حدث طوارئ.
    """
    now = now or timezone.now()
    from apps.laboratory.models import Disease
    from .models import (
        HealthCase,
        ReportableDisease,
        SurveillanceAlert,
    )

    created = []
    for reportable in ReportableDisease.objects.select_related('disease').filter(is_enabled=True):
        disease = reportable.disease
        threshold = max(reportable.ewars_threshold, 1)
        window_start = now - timedelta(days=reportable.window_days)
        baseline_weeks = max(reportable.baseline_weeks, 1)

        cases = (
            HealthCase.objects.filter(
                disease=disease,
                created_at__gte=window_start,
            )
            .exclude(case_type__in=[HealthCase.CaseType.NOT_A_CASE])
        )
        region_counts = defaultdict(int)
        for pk, sector_id, locality_id, port_id in cases.values_list(
            'id', 'sector_id', 'locality_id', 'port_id'
        ):
            region_counts[(sector_id, locality_id, port_id)] += 1

        baseline_counts = {}
        for offset in range(1, baseline_weeks + 1):
            win_start = now - timedelta(days=reportable.window_days * offset)
            win_end = now - timedelta(days=reportable.window_days * (offset - 1))
            hist = defaultdict(int)
            for sector_id, locality_id, port_id in HealthCase.objects.filter(
                disease=disease,
                created_at__gte=win_start,
                created_at__lt=win_end,
            ).exclude(case_type=HealthCase.CaseType.NOT_A_CASE).values_list(
                'sector_id', 'locality_id', 'port_id'
            ):
                hist[(sector_id, locality_id, port_id)] += 1
            for region_key, cnt in hist.items():
                baseline_counts.setdefault(region_key, []).append(cnt)

        for (sector_id, locality_id, port_id), count in region_counts.items():
            if count < threshold:
                continue
            bl = baseline_counts.get((sector_id, locality_id, port_id), [])
            baseline = float(sum(bl)) / len(bl) if bl else 0
            if _dedupe_window_alerts(disease, window_start, sector_id, locality_id, port_id):
                continue
            level = _level_for_count(count, threshold, baseline)
            sector = (
                HealthCase._meta.get_field('sector').related_model.objects.filter(pk=sector_id).first()
                if sector_id else None
            )
            locality = (
                HealthCase._meta.get_field('locality').related_model.objects.filter(pk=locality_id).first()
                if locality_id else None
            )
            port = (
                HealthCase._meta.get_field('port').related_model.objects.filter(pk=port_id).first()
                if port_id else None
            )
            scope_label = (
                locality.name_ar if locality else (sector.name_ar if sector else (port.name_ar if port else 'المنطقة'))
            )
            base_text = f' خط الأساس: {baseline:.1f}' if baseline else ''
            alert = SurveillanceAlert.objects.create(
                alert_number=generate_alert_number(),
                alert_type=SurveillanceAlert.AlertType.EWARS_THRESHOLD,
                level=level,
                title=f'تجاوز عتبة {disease.name_ar} في {scope_label}',
                description=(
                    f'سُجّلت {count} حالة من {disease.name_ar} خلال {reportable.window_days} يوماً '
                    f'(العتبة: {threshold}){base_text}.'
                ),
                disease=disease,
                sector=sector,
                locality=locality,
                port=port,
                trigger={
                    'count': count,
                    'threshold': threshold,
                    'baseline': round(baseline, 2),
                    'window_days': reportable.window_days,
                },
                case_count=count,
            )
            alert.cases.set(
                cases.filter(
                    sector_id=sector_id, locality_id=locality_id, port_id=port_id
                ).values_list('id', flat=True)
            )
            created.append(alert)
            notify_roles(alert, reportable.notified_roles)
            if level in ('LEVEL_2', 'LEVEL_3'):
                bridge_alert_to_event(alert, reportable)
    return created


def raise_single_event(case, notified_by=None):
    """إنذار فوري عند تسجيل حالة مرض يتطلب إبلاغاً فورياً (IMMEDIATE)."""
    from .models import HealthCase, ReportableDisease, SurveillanceAlert
    if case.case_type == HealthCase.CaseType.NOT_A_CASE:
        return None
    try:
        reportable = ReportableDisease.objects.select_related('disease').get(
            disease_id=case.disease_id, is_enabled=True
        )
    except ReportableDisease.DoesNotExist:
        return None
    if reportable.notification_timeline != ReportableDisease.NotificationTimeline.IMMEDIATE:
        return None
    if not case.disease:
        return None
    level = _level_for_count(1, max(reportable.ewars_threshold, 1), 0)
    alert = SurveillanceAlert.objects.create(
        alert_number=generate_alert_number(),
        alert_type=SurveillanceAlert.AlertType.SINGLE_EVENT,
        level=level,
        title=f'حالة {case.disease.name_ar} ({case.case_number})',
        description=(
            f'سُجّلت حالة {case.get_case_type_display()} من {case.disease.name_ar} '
            f'بالمصدر {case.get_source_display()} — تتطلب إبلاغاً فورياً.'
        ),
        disease=case.disease,
        sector=case.sector,
        locality=case.locality,
        port=case.port,
        case_count=1,
    )
    alert.cases.set([case])
    return alert


def raise_lab_positive(case):
    """إنذار مبكر (LAB_POSITIVE) عند نتيجة مختبر إيجابية لمرض واجب الإبلاغ.

    يمنع تكرار الإنذار لنفس نتيجة المختبر ما دام إنذار مماثل مفتوحاً.
    """
    from .models import HealthCase, ReportableDisease, SurveillanceAlert
    if case.case_type == HealthCase.CaseType.NOT_A_CASE:
        return None
    if not case.disease_id or not case.lab_result_id:
        return None
    reportable = ReportableDisease.objects.filter(disease_id=case.disease_id, is_enabled=True).first()
    if reportable is None:
        return None
    exists = SurveillanceAlert.objects.filter(
        alert_type=SurveillanceAlert.AlertType.LAB_POSITIVE,
        disease_id=case.disease_id,
        port_id=case.port_id,
        status__in=[
            SurveillanceAlert.Status.NEW,
            SurveillanceAlert.Status.ACKNOWLEDGED,
            SurveillanceAlert.Status.RESPONDING,
        ],
        trigger__lab_result_id=str(case.lab_result_id),
    ).exists()
    if exists:
        return None
    level = _level_for_count(1, max(reportable.ewars_threshold, 1), 0)
    alert = SurveillanceAlert.objects.create(
        alert_number=generate_alert_number(),
        alert_type=SurveillanceAlert.AlertType.LAB_POSITIVE,
        level=level,
        title=f'نتيجة مختبر إيجابية: {case.disease.name_ar} ({case.case_number})',
        description=(
            f'ظهرت نتيجة إيجابية لـ {case.disease.name_ar} على حالة {case.case_number}. '
            f'تاريخ التأكيد: {case.confirmation_date or "-"}.'
        ),
        disease=case.disease,
        sector=case.sector,
        locality=case.locality,
        port=case.port,
        trigger={'lab_result_id': str(case.lab_result_id)},
        case_count=1,
    )
    alert.cases.set([case])
    notify_roles(alert, reportable.notified_roles)
    return alert


def bridge_alert_to_event(alert, reportable=None):
    """يجسر إنذار LEVEL≥2 إلى حدث طوارئ (يظهر في لوحات الأوبئة الحالية)."""
    from .models import EmergencyEvent
    event = EmergencyEvent.objects.create(
        title=alert.title,
        description=alert.description,
        event_type='EWARS',
        disease=alert.disease,
        source_type=EmergencyEvent.SourceType.EBS,
        severity=(
            EmergencyEvent.Severity.CRITICAL
            if alert.level == 'LEVEL_3'
            else EmergencyEvent.Severity.HIGH
        ),
        status=EmergencyEvent.EventStatus.IDENTIFIED,
        location_port=alert.port,
        locality=alert.locality,
        case_count=alert.case_count,
    )
    event.event_number = f'E-{event.pk.hex[:6].upper()}'
    event.save(update_fields=['event_number'])
    alert.event = event
    alert.save(update_fields=['event'])
    return event