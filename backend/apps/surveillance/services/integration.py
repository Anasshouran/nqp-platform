import logging
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from apps.surveillance.models.case import HealthCase, CaseSource, CaseWorkflowState
from apps.surveillance.models.contact import ContactTrace, ContactFollowUp, FollowUpStatus
from apps.surveillance.models.specimen import Specimen, SpecimenType, SpecimenStatus, SpecimenLabResult
from apps.surveillance.models.alert import SurveillanceAlert, AlertType, AlertLevel, AlertStatus
from apps.surveillance.models.outbreak import Outbreak
from apps.surveillance.models.event import HealthEvent
from apps.surveillance.models.vector_integration import VectorSurveillanceLink, VectorAlertRule

logger = logging.getLogger(__name__)


class SurveillanceIntegrationService:
    """خدمة التكامل بين الترصد والأنظمة الأخرى (مختبر، نواقل، أغذية، منافذ)."""

    # ============================================
    # تكامل مع المختبر
    # ============================================

    @classmethod
    def on_lab_result_positive(cls, lab_result_specimen: SpecimenLabResult):
        """عند نتيجة مختبر إيجابية - يتم استدعاؤها من Signal."""
        case = lab_result_specimen.specimen.case
        if not case:
            return

        # تحديث حالة سير العمل (مسار قانوني: مفتوحة → قيد التحقيق → مؤكدة)
        if case.workflow_state != CaseWorkflowState.CONFIRMED:
            from apps.surveillance.services.workflows import CaseWorkflowService
            actor = lab_result_specimen.entered_by or case.assigned_to
            if case.workflow_state == CaseWorkflowState.OPEN:
                CaseWorkflowService.transition(
                    case, CaseWorkflowState.UNDER_INVESTIGATION, actor,
                    'فتح تحقيق الحالة نتيجة نتيجة مختبر إيجابية'
                )
            CaseWorkflowService.transition(
                case, CaseWorkflowState.CONFIRMED, actor,
                f'نتيجة مختبر إيجابية: {lab_result_specimen.result_qualitative}'
            )

        # إنشاء إنذار إذا كان المرض وبائي
        if lab_result_specimen.disease and lab_result_specimen.disease.is_public_health_emergency:
            from apps.surveillance.services.ewars_engine import EWARSEngine
            EWARSEngine.create_lab_positive_alert(case)

        # تحديث الحالات المرتبطة بالتفشي
        if case.outbreak:
            case.outbreak.update_statistics()
            case.outbreak.save()

    @classmethod
    def on_lab_sample_received(cls, lab_sample):
        """عند استلام عينة في المختبر."""
        specimens = Specimen.objects.filter(lab_sample=lab_sample)
        for specimen in specimens:
            specimen.status = 'RECEIVED'
            specimen.received_at = timezone.now()
            specimen.received_by = lab_sample.reception_decision_by
            specimen.save(update_fields=['status', 'received_at', 'received_by'])

            # تسجيل الحركة
            from apps.surveillance.models.specimen import SpecimenMovement
            SpecimenMovement.objects.create(
                specimen=specimen,
                action=SpecimenMovement.Action.RECEIVED,
                handler=lab_sample.reception_decision_by,
                to_location=f'مختبر {lab_sample.section}',
            )

    @classmethod
    def on_port_screening_case(cls, case: HealthCase):
        """عند اكتشاف حالة من فحص المنفذ."""
        # تحديث إحصائيات المنفذ
        if case.port:
            from apps.surveillance.models.location import PortOfEntrySurveillance
            port_surveillance, _ = PortOfEntrySurveillance.objects.get_or_create(port=case.port)
            port_surveillance.cases_detected += 1
            port_surveillance.last_screening_date = timezone.localdate()
            port_surveillance.save(update_fields=['cases_detected', 'last_screening_date'])

        # ربط العينات إذا كانت موجودة
        if case.specimens.exists():
            for specimen in case.specimens.all():
                specimen.status = SpecimenStatus.COLLECTED
                specimen.save(update_fields=['status'])

    # ============================================
    # تكامل مع مكافحة النواقل
    # ============================================

    @classmethod
    def on_vector_focus_high_severity(cls, vector_focus):
        """عند بؤرة ناقل عالية الخطورة."""
        # البحث عن حالات حمى/مرض نواقل في نفس المنطقة
        from apps.laboratory.models import Disease
        vector_diseases = Disease.objects.filter(
            transmission_methods__icontains='vector',
            is_active=True
        )

        # الحالات في نفس المنفذ خلال 14 يوم
        recent_cases = HealthCase.objects.filter(
            port=vector_focus.entry_point,
            reported_date__gte=timezone.localdate() - timezone.timedelta(days=14),
            case_type__in=['SUSPECTED', 'PROBABLE', 'CONFIRMED'],
            disease__in=vector_diseases,
        )

        if recent_cases.count() >= 2:  # عتبة قابلة للتهيئة
            # إنشاء رابط ترصد-نواقل
            for case in recent_cases:
                link, created = VectorSurveillanceLink.objects.get_or_create(
                    health_case=case,
                    vector_focus=vector_focus,
                    link_type='CASE_FOCUS',
                    defaults={
                        'distance_km': 0,  # نفس المنفذ
                        'spatial_overlap': True,
                        'association_strength': 'MODERATE',
                        'epidemiological_notes': f'حالة {case.case_number} في نفس منفذ البؤرة {vector_focus.focus_number}',
                    }
                )
                if created:
                    logger.info(f'Created vector surveillance link: {link}')

            # تقييم قواعد الإنذار المتقاطعة
            cls._evaluate_vector_alert_rules(vector_focus, recent_cases)

    @classmethod
    def on_vector_sample_positive(cls, vector_lab_result):
        """عند نتيجة عينة ناقل إيجابية."""
        # البحث عن حالات مرتبطة
        if vector_lab_result.sample and vector_lab_result.sample.focus:
            focus = vector_lab_result.sample.focus
            cls.on_vector_focus_high_severity(focus)

    @classmethod
    def on_vector_survey_high_index(cls, vector_survey):
        """عند مسح نواقل بمؤشرات عالية."""
        if vector_survey.breteau_index and vector_survey.breteau_index > 50:  # عتبة عالية
            # البحث عن حالات في نفس المنفذ
            recent_cases = HealthCase.objects.filter(
                port=vector_survey.entry_point,
                reported_date__gte=timezone.localdate() - timezone.timedelta(days=21),
            )
            if recent_cases.exists():
                from apps.surveillance.services.ewars_engine import EWARSEngine
                rule = AlertRule.objects.filter(
                    rule_type=AlertRule.RuleType.VECTOR_INDEX,
                    is_active=True
                ).first()
                if rule:
                    EWARSEngine._evaluate_vector_index_rule(rule, vector_survey.entry_point.sector, None, None)

    @classmethod
    def _evaluate_vector_alert_rules(cls, vector_focus, cases):
        """تقييم قواعد الإنذار المتقاطعة نواقل-ترصد."""
        rules = VectorAlertRule.objects.filter(is_active=True)
        for rule in rules:
            # فحص شروط المرض
            if rule.disease and not cases.filter(disease=rule.disease).exists():
                continue

            # فحص شروط الناقل
            if rule.vector_type and vector_focus.vector != rule.vector_type:
                continue

            # فحص خطورة البؤرة
            if rule.focus_severity and vector_focus.severity != rule.focus_severity:
                continue

            # فحص عدد الحالات
            if cases.count() < rule.case_threshold:
                continue

            # إنشاء إنذار
            from apps.surveillance.services.ewars_engine import EWARSEngine
            alert = EWARSEngine._create_alert(
                rule=rule,
                alert_type=AlertType.VECTOR_SURGE,
                disease=rule.disease,
                sector=vector_focus.entry_point.sector,
                port=vector_focus.entry_point,
                title=f'ارتباط نواقل-حالات: {vector_focus.vector.name_ar}',
                description=f'بؤرة {vector_focus.focus_number} مرتبطة بـ {cases.count()} حالات.',
                trigger_data={
                    'vector_focus_id': str(vector_focus.id),
                    'vector_name': vector_focus.vector.name_ar,
                    'focus_severity': vector_focus.severity,
                    'linked_cases': cases.count(),
                },
                case_ids=list(cases.values_list('id', flat=True)),
                level=rule.alert_level,
            )

    @classmethod
    def on_lab_case_created(cls, case: HealthCase):
        """حالة مصدرها المختبر - تكامل مع سير عمل المختبر."""
        # إنشاء عينة من نتيجة المختبر إذا لم تكن موجودة
        if case.lab_result and not Specimen.objects.filter(case=case).exists():
            Specimen.objects.create(
                case=case,
                specimen_type=SpecimenType.SWAB_NASOPHARYNGEAL,
                status=SpecimenStatus.RESULT_REPORTED,
                result_summary=f'نتيجة مختبر: {case.lab_result}',
                clinical_info=case.clinical_notes,
            )

        # تحويل الحالة إلى مؤكدة إذا كانت نتيجة إيجابية
        if case.lab_result and not case.confirmation_date:
            from apps.surveillance.services.workflows import CaseWorkflowService
            try:
                CaseWorkflowService.transition(
                    case, CaseWorkflowState.CONFIRMED,
                    case.reported_by, 'منبعها من المختبر بنتيجة إيجابية'
                )
            except ValueError:
                pass

    @classmethod
    def on_contact_converted_to_case(cls, followup):
        """عند تحول مخالط إلى حالة - ربط الحالة بالمخالط."""
        contact = followup.contact
        converted_case = followup.converted_case
        if not converted_case:
            return

        # نسخ البيانات الوبائية
        if not converted_case.disease and contact.index_case:
            converted_case.disease = contact.index_case.disease
        if contact.index_case and contact.index_case.outbreak:
            converted_case.outbreak = contact.index_case.outbreak
        if not converted_case.port:
            converted_case.port = contact.index_case.port if contact.index_case else contact.port
        if not converted_case.sector:
            converted_case.sector = contact.index_case.sector if contact.index_case else contact.sector

        if 'CONTACT_TRACING' not in (converted_case.risk_factors or []):
            converted_case.risk_factors = (converted_case.risk_factors or []) + ['CONTACT_TRACING']
        converted_case.exposure_history = (
            f'مخالط للحالة {contact.index_case.case_number if contact.index_case else "غير محددة"} '
            f'(آخر تعرض: {contact.last_exposure_date})'
        )
        converted_case.save(update_fields=[
            'disease', 'outbreak', 'port', 'sector', 'risk_factors', 'exposure_history'
        ])

        # إنشاء سجل تعرض
        from apps.surveillance.models.case import CaseExposure
        CaseExposure.objects.get_or_create(
            case=converted_case,
            exposure_type=CaseExposure.ExposureType.CONTACT_CASE,
            source_case=contact.index_case,
            defaults={
                'description': f'تعرض من خلال المخالطة (أيام تعرض: {contact.exposure_duration_minutes or "غير محدد"})',
                'start_date': contact.last_exposure_date,
            },
        )

        # تحديث إحصائيات التفشي إذا كان موجوداً
        if converted_case.outbreak:
            converted_case.outbreak.update_statistics()
            converted_case.outbreak.save()

    @classmethod
    def on_vector_case_link_confirmed(cls, link: VectorSurveillanceLink):
        """عند تأكيد رابط ترصد-نواقل - إنشاء إنذار متقاطع."""
        if not link.health_case and not link.outbreak:
            return

        cases = []
        if link.health_case:
            cases = [link.health_case]
        elif link.outbreak:
            cases = list(link.outbreak.cases.all()) or []

        case = cases[0] if cases else None
        if not case:
            return

        # تحديد المرض
        disease = None
        if link.vector_focus and link.vector_focus.vector:
            # البحث عن أول مرض مرتبط
            if case and case.disease:
                disease = case.disease
        elif case and case.disease:
            disease = case.disease

        # البحث عن قاعدة إنذار متقاطعة
        rules = VectorAlertRule.objects.filter(is_active=True)
        if link.vector_focus and link.vector_focus.vector:
            rules = rules.filter(vector_type=link.vector_focus.vector, is_active=True)
        rule = rules.first()

        from apps.surveillance.services.ewars_engine import EWARSEngine
        brute = EWARSEngine._create_alert(
            rule=rule,
            alert_type='VECTOR_SURGE',
            disease=disease,
            sector=link.vector_focus.entry_point.sector if link.vector_focus else None,
            port=link.vector_focus.entry_point if link.vector_focus else None,
            title=f'رابط مؤكد ترصد-نواقل: {link.vector_focus.focus_number if link.vector_focus else ""}',
            description=f'رابط قوي بين {case.case_number if case else "حالة"} و'
                        f'بؤرة ناقل {link.vector_focus.focus_number if link.vector_focus else ""}.',
            trigger_data={
                'link_id': str(link.id),
                'link_type': link.link_type,
                'vector_focus_id': str(link.vector_focus.id) if link.vector_focus else '',
                'association_strength': link.association_strength,
                'distance_km': str(link.distance_km) if link.distance_km else None,
            },
            case_ids=[c.id for c in cases if c and hasattr(c, 'id')],
            level='LEVEL_1',
        )

    @classmethod
    def on_vector_alert_rule_created(cls, rule):
        """عند إنشاء قاعدة إنذار تقاطعية - تقييم أولي فوري."""
        from apps.surveillance.services.ewars_engine import EWARSEngine
        EWARSEngine._evaluate_vector_index_rule(rule, None, None, None)

    # ============================================
    # تكامل مع رقابة الأغذية
    # ============================================

    @classmethod
    def on_food_contamination_event(cls, food_event):
        """حادث تلوث غذائي - إنشاء حدث صحي."""
        event = HealthEvent.objects.create(
            event_type='FOOD_CONTAMINATION',
            title=f'تلوث غذائي: {food_event.get_contamination_type_display()}',
            description=food_event.description,
            sector=food_event.sector,
            locality=food_event.locality,
            port=food_event.port,
            health_facility=food_event.health_facility,
            specific_location=food_event.location,
            affected_count=food_event.affected_count or 0,
            suspected_disease=food_event.suspected_pathogen,
            source='FOOD_SAFETY',
            source_details=f'بلاغ أغذية: {food_event.report_number}',
            reported_by=food_event.reported_by,
            event_date=food_event.event_date,
            priority='HIGH',
            public_health_risk='HIGH',
        )
        return event

    @classmethod
    def on_foodborne_outbreak(cls, outbreak):
        """تفشي منقول بالغذاء - ربط مع الترصد."""
        # البحث عن حالات مرتبطة
        cases = HealthCase.objects.filter(
            disease=outbreak.disease,
            sector=outbreak.sector,
            reported_date__gte=outbreak.onset_date,
        )
        for case in cases:
            case.outbreak = outbreak
            case.save(update_fields=['outbreak'])

    # ============================================
    # تكامل مع نقاط الدخول
    # ============================================

    @classmethod
    def on_traveler_screening_alert(cls, screening):
        """فحص مسافر يكشف حالة مشتبهة."""
        from apps.screening.models import HealthScreening
        from apps.travelers.models import Traveler

        if screening.result not in ['SUSPECTED', 'POSITIVE']:
            return

        # إنشاء حالة ترصد
        traveler = screening.traveler
        case = HealthCase.objects.create(
            disease=screening.disease,
            case_type='SUSPECTED',
            workflow_state=CaseWorkflowState.OPEN,
            status='UNDER_INVESTIGATION',
            source=CaseSource.SCREENING,
            traveler=traveler,
            person_name=traveler.full_name,
            person_age=traveler.age,
            person_sex=traveler.gender,
            nationality=traveler.nationality,
            passport_number=traveler.passport_number,
            phone=traveler.phone,
            port=screening.port,
            sector=screening.port.sector,
            health_facility=screening.facility,
            onset_date=screening.screened_at.date() if screening.screened_at else None,
            reported_date=timezone.localdate(),
            symptoms=screening.symptoms or [],
            exposure_history=f'فحص منفذ: {screening.port.name_ar}',
            reported_by=screening.screened_by,
        )

        # إنشاء عينة إذا لزم
        if screening.disease and screening.disease.is_public_health_emergency:
            Specimen.objects.create(
                case=case,
                specimen_type='SWAB_NASOPHARYNGEAL',
                status=SpecimenStatus.ORDERED,
                priority='URGENT',
                clinical_info=f'فحص منفذ إيجابي: {screening.result}',
            )

        return case

    # ============================================
    # تكامل مع البلاغات المجتمعية (EBS)
    # ============================================

    @classmethod
    def on_community_report(cls, report_data: dict):
        """بلاغ مجتمعي عبر التطبيق/الخط الساخن."""
        event = HealthEvent.objects.create(
            event_type=report_data.get('event_type', 'OTHER'),
            title=report_data.get('title', 'بلاغ مجتمعي'),
            description=report_data.get('description', ''),
            sector=report_data.get('sector'),
            locality=report_data.get('locality'),
            specific_location=report_data.get('location'),
            gps_latitude=report_data.get('latitude'),
            gps_longitude=report_data.get('longitude'),
            affected_count=report_data.get('affected_count', 0),
            source='COMMUNITY',
            source_details=report_data.get('source_details', 'تطبيق عافيتنا'),
            reporter_contact=report_data.get('contact'),
            event_date=report_data.get('event_date', timezone.localdate()),
            priority=report_data.get('priority', 'MEDIUM'),
            public_health_risk=report_data.get('risk', 'MODERATE'),
            attachments=report_data.get('attachments', []),
            images=report_data.get('images', []),
        )
        return event

    # ============================================
    # تكامل مع WHO/IHR
    # ============================================

    @classmethod
    def check_ihr_notification_required(cls, outbreak: Outbreak):
        """فحص ما إذا كان التفشي يتطلب إبلاغ IHR."""
        disease = outbreak.disease
        if disease.ihr_category in ['PHEIC', 'TARGETED_ERADICATION']:
            # معايير IHR
            criteria = []
            if outbreak.deaths > 0:
                criteria.append('وفيات')
            if outbreak.total_cases >= 10:
                criteria.append('عدد حالات >= 10')
            if outbreak.spread_international:
                criteria.append('انتشار دولي')

            if criteria:
                return {
                    'required': True,
                    'criteria': criteria,
                    'disease_category': disease.get_ihr_category_display(),
                }
        return {'required': False}

    @classmethod
    def prepare_ihr_notification(cls, outbreak: Outbreak):
        """إعداد بيانات إبلاغ IHR."""
        from apps.surveillance.models.event import HealthEvent

        ihr_data = {
            'disease': outbreak.disease.icd_11_code,
            'disease_name': outbreak.disease.name_en,
            'event_name': outbreak.name,
            'country': 'Sudan',
            'region': outbreak.sector.name_en if outbreak.sector else '',
            'onset_date': outbreak.onset_date.isoformat() if outbreak.onset_date else '',
            'confirmation_date': outbreak.confirmation_date.isoformat() if outbreak.confirmation_date else '',
            'cases': outbreak.total_cases,
            'deaths': outbreak.deaths,
            'cfr': float(outbreak.case_fatality_rate) if outbreak.case_fatality_rate else 0,
            'transmission_route': outbreak.transmission_route,
            'source': outbreak.source_of_infection,
            'control_measures': [a.action_type for a in outbreak.response_actions.all()],
            'risk_assessment': outbreak.risk_assessment,
        }
        return ihr_data