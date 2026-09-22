import logging
from collections import defaultdict
from datetime import date, timedelta
from django.db.models import Count, Q, Avg, StdDev
from django.utils import timezone
from django.db import transaction

from apps.surveillance.models.case import HealthCase, CaseClassification
from apps.surveillance.models.alert import SurveillanceAlert, AlertRule, AlertType, AlertLevel, AlertStatus, AlertEvaluationStatus
from apps.surveillance.models.event import HealthEvent
from apps.surveillance.models.outbreak import Outbreak
from apps.laboratory.models import Disease

logger = logging.getLogger(__name__)


class EWARSEngine:
    """محرك الإنذار المبكر والاستجابة (EWARS) - نسخة محسنة."""

    @classmethod
    def run_all_rules(cls, sector=None, date_from=None, date_to=None) -> dict:
        """تشغيل جميع القواعد المفعلة."""
        rules = AlertRule.objects.filter(is_active=True)
        if sector:
            rules = rules.filter(Q(disease__isnull=True) | Q(disease__sector=sector))

        results = {
            'total_rules': rules.count(),
            'triggered': 0,
            'alerts_created': [],
            'errors': [],
        }

        for rule in rules:
            try:
                created = cls.evaluate_rule(rule, sector, date_from, date_to)
                results['triggered'] += len(created)
                results['alerts_created'].extend(created)
            except Exception as e:
                logger.error(f'Error evaluating rule {rule.id}: {e}')
                results['errors'].append({'rule_id': str(rule.id), 'error': str(e)})

        return results

    @classmethod
    def evaluate_rule(cls, rule: AlertRule, sector=None, date_from=None, date_to=None):
        """تقييم قاعدة واحدة."""
        if rule.rule_type == AlertRule.RuleType.THRESHOLD:
            return cls._evaluate_threshold_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.CLUSTER:
            return cls._evaluate_cluster_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.SINGLE_CASE:
            return cls._evaluate_single_case_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.LAB_CONFIRMATION:
            return cls._evaluate_lab_confirmation_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.VECTOR_INDEX:
            return cls._evaluate_vector_index_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.ZERO_REPORTING:
            return cls._evaluate_zero_reporting_rule(rule, sector, date_from, date_to)
        elif rule.rule_type == AlertRule.RuleType.RATE_CHANGE:
            return cls._evaluate_rate_change_rule(rule, sector, date_from, date_to)
        else:
            logger.warning(f'Unknown rule type: {rule.rule_type}')
            return []

    @classmethod
    def _evaluate_threshold_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """تقييم قاعدة العتبة العددية (EWARS الكلاسيكي)."""
        if not rule.disease:
            return []

        if not date_to:
            date_to = timezone.localdate()
        if not date_from:
            date_from = date_to - timedelta(days=rule.window_days)

        # استعلام الحالات
        cases_qs = HealthCase.objects.filter(
            disease=rule.disease,
            reported_date__gte=date_from,
            reported_date__lte=date_to,
            case_type__in=[CaseClassification.SUSPECTED, CaseClassification.PROBABLE, CaseClassification.CONFIRMED],
        )
        if sector:
            cases_qs = cases_qs.filter(sector=sector)

        observed_cases = cases_qs.count()

        # حساب خط الأساس (baseline)
        baseline_end = date_from - timedelta(days=1)
        baseline_start = baseline_end - timedelta(weeks=rule.baseline_weeks)
        baseline_cases = HealthCase.objects.filter(
            disease=rule.disease,
            reported_date__gte=baseline_start,
            reported_date__lte=baseline_end,
            case_type__in=[CaseClassification.SUSPECTED, CaseClassification.PROBABLE, CaseClassification.CONFIRMED],
        )
        if sector:
            baseline_cases = baseline_cases.filter(sector=sector)

        baseline_count = baseline_cases.count()
        expected_cases = baseline_count / rule.baseline_weeks * (rule.window_days / 7) if rule.baseline_weeks > 0 else 0

        # التحقق من العتبة
        threshold = rule.threshold_value or rule.ewars_threshold
        if observed_cases >= threshold and observed_cases >= rule.min_cases_for_alert:
            # إنشاء إنذار
            alert = cls._create_alert(
                rule=rule,
                alert_type=AlertType.THRESHOLD_BREACH,
                disease=rule.disease,
                sector=sector,
                title=f'تجاوز عتبة {rule.disease.name_ar}: {observed_cases} حالة (العتبة: {threshold})',
                description=f'تم رصد {observed_cases} حالة خلال {rule.window_days} يوماً، '
                           f'بينما المتوقع بناءً على خط الأساس ({rule.baseline_weeks} أسبوع): {expected_cases:.1f} حالة.',
                trigger_data={
                    'observed_cases': observed_cases,
                    'expected_cases': round(expected_cases, 1),
                    'threshold': float(threshold),
                    'window_days': rule.window_days,
                    'baseline_weeks': rule.baseline_weeks,
                    'baseline_cases': baseline_count,
                    'date_from': date_from.isoformat(),
                    'date_to': date_to.isoformat(),
                },
                case_ids=list(cases_qs.values_list('id', flat=True)),
                level=rule.alert_level,
            )
            return [alert]

        return []

    @classmethod
    def _evaluate_cluster_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """تقييم قاعدة التجمع المكاني/الزماني (Kulldorff scan statistic المبسط)."""
        if not rule.disease:
            return []

        if not date_to:
            date_to = timezone.localdate()
        if not date_from:
            date_from = date_to - timedelta(days=rule.temporal_window_days or rule.window_days)

        # تجميع الحالات حسب المنفذ/المحلية
        cases_qs = HealthCase.objects.filter(
            disease=rule.disease,
            reported_date__gte=date_from,
            reported_date__lte=date_to,
            case_type__in=[CaseClassification.SUSPECTED, CaseClassification.PROBABLE, CaseClassification.CONFIRMED],
        )
        if sector:
            cases_qs = cases_qs.filter(sector=sector)

        # تجميع حسب المنفذ
        port_counts = cases_qs.exclude(port__isnull=True).values(
            'port__id', 'port__name_ar', 'port__code'
        ).annotate(count=Count('id')).filter(count__gte=rule.min_cases_for_alert)

        # تجميع حسب المحلية
        locality_counts = cases_qs.exclude(locality__isnull=True).values(
            'locality__id', 'locality__name_ar'
        ).annotate(count=Count('id')).filter(count__gte=rule.min_cases_for_alert)

        created_alerts = []

        for pc in port_counts:
            if pc['count'] >= rule.min_cases_for_alert:
                alert = cls._create_alert(
                    rule=rule,
                    alert_type=AlertType.CLUSTER_DETECTION,
                    disease=rule.disease,
                    sector=sector,
                    port_id=pc['port__id'],
                    title=f'تجمع حالات {rule.disease.name_ar} في {pc["port__name_ar"]}',
                    description=f'تم رصد {pc["count"]} حالة في المنفذ {pc["port__name_ar"]} خلال فترة الرصد.',
                    trigger_data={
                        'cluster_type': 'PORT',
                        'location_id': str(pc['port__id']),
                        'location_name': pc['port__name_ar'],
                        'case_count': pc['count'],
                        'date_from': date_from.isoformat(),
                        'date_to': date_to.isoformat(),
                    },
                    level=rule.alert_level,
                )
                created_alerts.append(alert)

        for lc in locality_counts:
            if lc['count'] >= rule.min_cases_for_alert:
                alert = cls._create_alert(
                    rule=rule,
                    alert_type=AlertType.CLUSTER_DETECTION,
                    disease=rule.disease,
                    sector=sector,
                    locality_id=lc['locality__id'],
                    title=f'تجمع حالات {rule.disease.name_ar} في {lc["locality__name_ar"]}',
                    description=f'تم رصد {lc["count"]} حالة في المحلية {lc["locality__name_ar"]} خلال فترة الرصد.',
                    trigger_data={
                        'cluster_type': 'LOCALITY',
                        'location_id': str(lc['locality__id']),
                        'location_name': lc['locality__name_ar'],
                        'case_count': lc['count'],
                        'date_from': date_from.isoformat(),
                        'date_to': date_to.isoformat(),
                    },
                    level=rule.alert_level,
                )
                created_alerts.append(alert)

        return created_alerts

    @classmethod
    def _evaluate_single_case_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """قاعدة: حالة واحدة لمرض محدد = إنذار فوري."""
        if not rule.disease:
            return []

        if not date_to:
            date_to = timezone.localdate()
        if not date_from:
            date_from = date_to - timedelta(days=rule.window_days)

        cases = HealthCase.objects.filter(
            disease=rule.disease,
            reported_date__gte=date_from,
            reported_date__lte=date_to,
        )
        if sector:
            cases = cases.filter(sector=sector)

        created_alerts = []
        for case in cases:
            # التحقق من عدم وجود إنذار سابق لهذه الحالة
            existing = SurveillanceAlert.objects.filter(
                cases=case, alert_type=AlertType.SINGLE_EVENT
            ).exists()
            if not existing:
                alert = cls._create_alert(
                    rule=rule,
                    alert_type=AlertType.SINGLE_EVENT,
                    disease=rule.disease,
                    sector=case.sector,
                    port=case.port,
                    locality=case.locality,
                    title=f'حالة {rule.disease.name_ar}: {case.case_number}',
                    description=f'تم تسجيل حالة {case.case_type} للمرض {rule.disease.name_ar} '
                               f'في {case.port.name_ar if case.port else case.sector.name_ar if case.sector else "غير محدد"}.',
                    trigger_data={
                        'case_id': str(case.id),
                        'case_number': case.case_number,
                        'case_type': case.case_type,
                        'source': case.source,
                    },
                    case_ids=[str(case.id)],
                    level=rule.alert_level,
                )
                created_alerts.append(alert)

        return created_alerts

    @classmethod
    def _evaluate_lab_confirmation_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """قاعدة: تأكيد مختبري لمرض وبائي."""
        if not rule.disease or not rule.disease.is_public_health_emergency:
            return []

        if not date_to:
            date_to = timezone.localdate()
        if not date_from:
            date_from = date_to - timedelta(days=rule.window_days)

        from apps.laboratory.models import LabResult
        lab_results = LabResult.objects.filter(
            disease=rule.disease,
            result=LabResult.Result.POSITIVE,
            result_date__date__gte=date_from,
            result_date__date__lte=date_to,
        )
        if sector:
            lab_results = lab_results.filter(sample__sector=sector)

        created_alerts = []
        for lab_result in lab_results:
            # البحث عن الحالة المرتبطة
            case = HealthCase.objects.filter(lab_result=lab_result).first()
            if not case:
                continue

            existing = SurveillanceAlert.objects.filter(
                cases=case, alert_type=AlertType.LAB_POSITIVE
            ).exists()
            if not existing:
                alert = cls._create_alert(
                    rule=rule,
                    alert_type=AlertType.LAB_POSITIVE,
                    disease=rule.disease,
                    sector=case.sector,
                    port=case.port,
                    locality=case.locality,
                    title=f'نتيجة مختبر إيجابية: {rule.disease.name_ar}',
                    description=f'نتيجة مختبر إيجابية للحالة {case.case_number} ({case.person_name}).',
                    trigger_data={
                        'lab_result_id': str(lab_result.id),
                        'case_id': str(case.id),
                        'test_name': getattr(lab_result, 'test_name', ''),
                    },
                    case_ids=[str(case.id)],
                    level=AlertLevel.LEVEL_2,  # مستوى أعلى للنتائج المختبرية
                )
                created_alerts.append(alert)

        return created_alerts

    @classmethod
    def _evaluate_vector_index_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """قاعدة: مؤشر ناقل يتجاوز العتبة."""
        if not date_to:
            date_to = timezone.localdate()
        if not date_from:
            date_from = date_to - timedelta(days=rule.focus_window_days)

        from apps.vector_control.models import VectorFocus, VectorSurvey
        from apps.surveillance.models.vector_integration import VectorAlertRule as SurveillanceVectorAlertRule

        # البحث عن قواعد التكامل
        vector_rules = SurveillanceVectorAlertRule.objects.filter(is_active=True)
        if sector:
            vector_rules = vector_rules.filter(Q(disease__isnull=True) | Q(disease__sector=sector))

        created_alerts = []
        for v_rule in vector_rules:
            # بؤر عالية الخطورة
            foci = VectorFocus.objects.filter(
                opened_at__gte=date_from,
                opened_at__lte=date_to,
                severity__in=['HIGH', 'CRITICAL'],
            )
            if v_rule.vector_type:
                foci = foci.filter(vector=v_rule.vector_type)
            if sector:
                foci = foci.filter(entry_point__sector=sector)

            for focus in foci:
                # البحث عن حالات في نفس المنطقة
                nearby_cases = HealthCase.objects.filter(
                    port=focus.entry_point,
                    reported_date__gte=date_from,
                    reported_date__lte=date_to,
                    case_type__in=[CaseClassification.SUSPECTED, CaseClassification.PROBABLE, CaseClassification.CONFIRMED],
                )
                if v_rule.disease:
                    nearby_cases = nearby_cases.filter(disease=v_rule.disease)

                if nearby_cases.count() >= v_rule.case_threshold:
                    existing = SurveillanceAlert.objects.filter(
                        trigger__vector_focus_id=str(focus.id),
                        alert_type=AlertType.VECTOR_SURGE
                    ).exists()
                    if not existing:
                        alert = cls._create_alert(
                            rule=v_rule,
                            alert_type=AlertType.VECTOR_SURGE,
                            disease=v_rule.disease,
                            sector=focus.entry_point.sector,
                            port=focus.entry_point,
                            title=f'ارتفاع مؤشرات نواقل مع حالات: {focus.vector.name_ar}',
                            description=f'بؤرة {focus.focus_number} ({focus.vector.name_ar}) بدرجة {focus.get_severity_display()} '
                                       f'مع {nearby_cases.count()} حالات في نفس المنطقة.',
                            trigger_data={
                                'vector_focus_id': str(focus.id),
                                'focus_number': focus.focus_number,
                                'vector_name': focus.vector.name_ar,
                                'focus_severity': focus.severity,
                                'nearby_cases_count': nearby_cases.count(),
                            },
                            case_ids=list(nearby_cases.values_list('id', flat=True)),
                            level=v_rule.alert_level,
                        )
                        created_alerts.append(alert)

        return created_alerts

    @classmethod
    def _evaluate_zero_reporting_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """قاعدة: إبلاغ صفري - وحدة لم تقدم بلاغاً."""
        # يتم تشغيلها بشكل منفصل عبر task
        return []

    @classmethod
    def _evaluate_rate_change_rule(cls, rule: AlertRule, sector, date_from, date_to):
        """قاعدة: تغير في معدل الحالات."""
        # تنفيذ متقدم - يستخدم تحليل السلسلة الزمنية
        return []

    @classmethod
    def _create_alert(cls, rule, alert_type, disease, sector, title, description,
                      trigger_data, case_ids, level, port=None, locality=None, health_facility=None):
        """إنشاء إنذار جديد."""
        alert = SurveillanceAlert.objects.create(
            alert_type=alert_type,
            level=level,
            title=title,
            description=description,
            disease=disease,
            sector=sector,
            port=port,
            locality=locality,
            health_facility=health_facility,
            trigger=trigger_data,
            case_count=len(case_ids),
            case_numbers=[],  # سيتم ملؤه لاحقاً
            trigger_rule=rule if isinstance(rule, AlertRule) else None,
            status=AlertStatus.NEW,
            evaluation_status=AlertEvaluationStatus.PENDING,
        )

        # ربط الحالات
        if case_ids:
            cases = HealthCase.objects.filter(id__in=case_ids)
            alert.cases.set(cases)
            alert.case_numbers = list(cases.values_list('case_number', flat=True))
            alert.save(update_fields=['case_numbers'])

        # تحديث إحصائيات القاعدة
        if isinstance(rule, AlertRule):
            rule.last_triggered = timezone.now()
            rule.trigger_count += 1
            rule.save(update_fields=['last_triggered', 'trigger_count'])

        logger.info(f'Created alert {alert.alert_number}: {title}')
        return alert

    @classmethod
    def create_lab_positive_alert(cls, case: HealthCase) -> SurveillanceAlert:
        """إنشاء إنذار نتيجة مختبر إيجابية لحالة مؤكدة."""
        if not case.disease or not case.disease.is_public_health_emergency:
            return None

        # البحث عن قاعدة مناسبة
        rule = AlertRule.objects.filter(
            disease=case.disease,
            rule_type=AlertRule.RuleType.LAB_CONFIRMATION,
            is_active=True
        ).first()

        if not rule:
            # إنشاء إنذار افتراضي
            alert = SurveillanceAlert.objects.create(
                alert_type=AlertType.LAB_POSITIVE,
                level=AlertLevel.LEVEL_2,
                title=f'نتيجة مختبر إيجابية لمرض وبائي: {case.disease.name_ar}',
                description=f'الحالة {case.case_number} ({case.person_name}) مؤكدة مخبرياً '
                           f'للمرض {case.disease.name_ar}.',
                disease=case.disease,
                sector=case.sector,
                port=case.port,
                locality=case.locality,
                trigger={
                    'case_id': str(case.id),
                    'case_number': case.case_number,
                    'confirmation_date': case.confirmation_date.isoformat() if case.confirmation_date else None,
                },
                case_count=1,
                case_numbers=[case.case_number],
                status=AlertStatus.NEW,
                evaluation_status=AlertEvaluationStatus.PENDING,
            )
            alert.cases.add(case)
            return alert

        return cls._create_alert(
            rule=rule,
            alert_type=AlertType.LAB_POSITIVE,
            disease=case.disease,
            sector=case.sector,
            port=case.port,
            locality=case.locality,
            title=f'نتيجة مختبر إيجابية: {case.disease.name_ar}',
            description=f'الحالة {case.case_number} مؤكدة مخبرياً.',
            trigger_data={'case_id': str(case.id), 'case_number': case.case_number},
            case_ids=[str(case.id)],
            level=AlertLevel.LEVEL_2,
        )

    @classmethod
    def compute_baseline_statistics(cls, disease, sector=None, weeks=8):
        """حساب إحصائيات خط الأساس."""
        end_date = timezone.localdate() - timedelta(days=1)
        start_date = end_date - timedelta(weeks=weeks)

        qs = HealthCase.objects.filter(
            disease=disease,
            reported_date__gte=start_date,
            reported_date__lte=end_date,
            case_type__in=[CaseClassification.SUSPECTED, CaseClassification.PROBABLE, CaseClassification.CONFIRMED],
        )
        if sector:
            qs = qs.filter(sector=sector)

        weekly_counts = qs.extra(
            select={'week': 'date_trunc(\'week\', reported_date)'}
        ).values('week').annotate(count=Count('id')).order_by('week')

        counts = [w['count'] for w in weekly_counts]
        if not counts:
            return {'mean': 0, 'std': 0, 'threshold': 2}

        mean = sum(counts) / len(counts)
        std = (sum((c - mean) ** 2 for c in counts) / len(counts)) ** 0.5 if len(counts) > 1 else 0

        # عتبة EWARS: mean + 2*std أو 2 كحد أدنى
        threshold = max(mean + 2 * std, 2)

        return {
            'mean': round(mean, 2),
            'std': round(std, 2),
            'threshold': round(threshold, 2),
            'weeks_analyzed': len(counts),
            'weekly_counts': counts,
        }