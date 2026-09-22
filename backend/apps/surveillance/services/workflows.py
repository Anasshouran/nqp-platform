from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q
from datetime import timedelta, date

from apps.surveillance.models.case import (
    HealthCase, CaseWorkflowState, CaseStatus, CaseClassification
)
from apps.surveillance.models.outbreak import Outbreak, OutbreakStatus
from apps.surveillance.models.contact import ContactTrace, ContactStatus, ContactFollowUp, FollowUpStatus
from apps.surveillance.models.alert import SurveillanceAlert, AlertStatus, AlertEvaluationStatus
from apps.surveillance.models.specimen import Specimen, SpecimenStatus
from apps.surveillance.models.investigation import Investigation, InvestigationStatus
from apps.surveillance.models.event import HealthEvent, HealthEventStatus


class CaseWorkflowService:
    """خدمة إدارة سير عمل الحالة - State Machine."""

    # تعريف الانتقالات المسموحة
    ALLOWED_TRANSITIONS = {
        CaseWorkflowState.OPEN: [
            CaseWorkflowState.UNDER_INVESTIGATION,
            CaseWorkflowState.CLOSED,
        ],
        CaseWorkflowState.UNDER_INVESTIGATION: [
            CaseWorkflowState.AWAITING_LAB,
            CaseWorkflowState.CONFIRMED,
            CaseWorkflowState.CLOSED,
        ],
        CaseWorkflowState.AWAITING_LAB: [
            CaseWorkflowState.CONFIRMED,
            CaseWorkflowState.UNDER_INVESTIGATION,
            CaseWorkflowState.CLOSED,
        ],
        CaseWorkflowState.CONFIRMED: [
            CaseWorkflowState.CLOSED,
        ],
        CaseWorkflowState.CLOSED: [],  # نهائي
    }

    # ربط حالة سير العمل بالحالة السريرية
    WORKFLOW_TO_CLINICAL_STATUS = {
        CaseWorkflowState.OPEN: CaseStatus.UNDER_INVESTIGATION,
        CaseWorkflowState.UNDER_INVESTIGATION: CaseStatus.UNDER_INVESTIGATION,
        CaseWorkflowState.AWAITING_LAB: CaseStatus.UNDER_INVESTIGATION,
        CaseWorkflowState.CONFIRMED: CaseStatus.UNDER_TREATMENT,
        CaseWorkflowState.CLOSED: CaseStatus.CLOSED,
    }

    @classmethod
    def can_transition(cls, current_state: str, new_state: str) -> bool:
        """التحقق من إمكانية الانتقال."""
        return new_state in cls.ALLOWED_TRANSITIONS.get(current_state, [])

    @classmethod
    def transition(cls, case: HealthCase, new_state: str, user, note: str = '') -> HealthCase:
        """تنفيذ انتقال الحالة."""
        if not cls.can_transition(case.workflow_state, new_state):
            raise ValueError(
                f'لا يمكن الانتقال من {case.get_workflow_state_display()} '
                f'إلى {dict(CaseWorkflowState.choices).get(new_state, new_state)}'
            )

        old_state = case.workflow_state
        case.workflow_state = new_state

        # تحديث الحالة السريرية تلقائياً
        if new_state in cls.WORKFLOW_TO_CLINICAL_STATUS:
            case.status = cls.WORKFLOW_TO_CLINICAL_STATUS[new_state]

        # تحديث تواريخ خاصة
        if new_state == CaseWorkflowState.CONFIRMED and not case.confirmation_date:
            case.confirmation_date = timezone.localdate()
        elif new_state == CaseWorkflowState.CLOSED and not case.closure_date:
            case.closure_date = timezone.localdate()

        case.save(update_fields=[
            'workflow_state', 'status', 'confirmation_date', 'closure_date', 'updated_at'
        ])

        # تسجيل في السجل
        CaseWorkflowService._log_transition(case, old_state, new_state, user, note)

        # إجراءات ما بعد الانتقال
        cls._post_transition_actions(case, old_state, new_state, user)

        return case

    @classmethod
    def _log_transition(cls, case, old_state, new_state, user, note):
        """تسجيل الانتقال في CaseStatusLog."""
        from apps.surveillance.models.case import CaseStatusLog
        CaseStatusLog.objects.create(
            case=case,
            field=CaseStatusLog.Field.WORKFLOW_STATE,
            old_value=old_state,
            new_value=new_state,
            note=note,
            changed_by=user,
        )

    @classmethod
    def _post_transition_actions(cls, case: HealthCase, old_state: str, new_state: str, user):
        """إجراءات ما بعد الانتقال."""
        # إذا تم تأكيد الحالة
        if new_state == CaseWorkflowState.CONFIRMED:
            # إنشاء إنذار إذا كان المرض وبائي
            if case.disease and case.disease.is_public_health_emergency:
                from apps.surveillance.services.ewars_engine import EWARSEngine
                EWARSEngine.create_lab_positive_alert(case)

            # تحديث المخالطين إذا كانوا في متابعة
            case.contacts.filter(status=ContactStatus.UNDER_MONITORING).update(
                status=ContactStatus.SYMPTOMATIC
            )

        # إذا تم إغلاق الحالة
        if new_state == CaseWorkflowState.CLOSED:
            # إغلاق المخالطين المرتبطين
            case.contacts.filter(
                status__in=[ContactStatus.UNDER_MONITORING, ContactStatus.SYMPTOMATIC]
            ).update(status=ContactStatus.COMPLETED)

    @classmethod
    def on_state_transition(cls, case: HealthCase, old_state: str, new_state: str):
        """معالجة إضافية عند تغيير الحالة (تستدعى من signals)."""
        # يمكن إضافة منطق إضافي هنا
        pass

    @classmethod
    def on_critical_lab_result(cls, case: HealthCase, lab_result):
        """عند نتيجة مختبر حرجة."""
        if case.workflow_state == CaseWorkflowState.OPEN:
            cls.transition(case, CaseWorkflowState.UNDER_INVESTIGATION, lab_result.entered_by,
                           'فتح تحقيق الحالة نتيجة نتيجة مختبر حرجة')
        if case.workflow_state != CaseWorkflowState.CONFIRMED:
            cls.transition(case, CaseWorkflowState.CONFIRMED, lab_result.entered_by,
                           f'نتيجة مختبر حرجة: {lab_result.result_qualitative}')


class OutbreakWorkflowService:
    """خدمة إدارة سير عمل التفشي."""

    ALLOWED_TRANSITIONS = {
        OutbreakStatus.DRAFT: [OutbreakStatus.UNDER_EVALUATION, OutbreakStatus.REJECTED],
        OutbreakStatus.UNDER_EVALUATION: [OutbreakStatus.CONFIRMED, OutbreakStatus.REJECTED],
        OutbreakStatus.CONFIRMED: [OutbreakStatus.ACTIVE_RESPONSE],
        OutbreakStatus.ACTIVE_RESPONSE: [OutbreakStatus.MONITORING, OutbreakStatus.CONTROLLED],
        OutbreakStatus.MONITORING: [OutbreakStatus.CONTROLLED, OutbreakStatus.ACTIVE_RESPONSE],
        OutbreakStatus.CONTROLLED: [OutbreakStatus.CLOSED, OutbreakStatus.ACTIVE_RESPONSE],
        OutbreakStatus.CLOSED: [],
        OutbreakStatus.REJECTED: [],
    }

    @classmethod
    def can_transition(cls, current_status: str, new_status: str) -> bool:
        return new_status in cls.ALLOWED_TRANSITIONS.get(current_status, [])

    @classmethod
    def transition(cls, outbreak: Outbreak, new_status: str, user) -> Outbreak:
        if not cls.can_transition(outbreak.status, new_status):
            raise ValueError(
                f'لا يمكن الانتقال من {outbreak.get_status_display()} '
                f'إلى {dict(OutbreakStatus.choices).get(new_status, new_status)}'
            )

        old_status = outbreak.status
        outbreak.status = new_status

        # تحديث التواريخ
        if new_status == OutbreakStatus.CONFIRMED and not outbreak.confirmation_date:
            outbreak.confirmation_date = timezone.localdate()
        elif new_status == OutbreakStatus.CONTROLLED and not outbreak.end_date:
            outbreak.end_date = timezone.localdate()

        outbreak.save(update_fields=['status', 'confirmation_date', 'end_date', 'updated_at'])

        # تسجيل التدقيق
        from apps.surveillance.models.audit import SurveillanceAuditLog
        SurveillanceAuditLog.log_action(
            user=user,
            action='TRANSITION',
            obj=outbreak,
            description=f'تغيير حالة التفشي: {old_status} → {new_status}',
            changes={'status': {'old': old_status, 'new': new_status}},
        )

        return outbreak

    @classmethod
    def create_from_alert(cls, alert: SurveillanceAlert, user, outbreak_data: dict) -> Outbreak:
        """إنشاء تفشي من إنذار مصعد."""
        with transaction.atomic():
            # تغيير حالة الإنذار
            alert.status = AlertStatus.ESCALATED
            alert.evaluation_status = AlertEvaluationStatus.ESCALATED_TO_OUTBREAK
            alert.save(update_fields=['status', 'evaluation_status', 'updated_at'])

            # إنشاء التفشي
            outbreak = Outbreak.objects.create(
                disease=alert.disease,
                name=outbreak_data.get('name', f'تفشي {alert.disease.name_ar if alert.disease else "غير محدد"}'),
                description=outbreak_data.get('description', alert.description),
                sector=alert.sector,
                locality=alert.locality,
                port=alert.port,
                health_facility=alert.health_facility,
                onset_date=outbreak_data.get('onset_date') or alert.generated_at.date(),
                severity=outbreak_data.get('severity', 'LEVEL_2'),
                source_of_infection=outbreak_data.get('source_of_infection', ''),
                transmission_route=outbreak_data.get('transmission_route', ''),
                lead_epidemiologist=user,
                origin_alert=alert,
                status=OutbreakStatus.CONFIRMED,
                confirmation_date=timezone.localdate(),
            )

            # ربط الحالات
            if alert.cases.exists():
                for case in alert.cases.all():
                    case.outbreak = outbreak
                    case.workflow_state = CaseWorkflowState.CONFIRMED
                    case.save(update_fields=['outbreak', 'workflow_state', 'updated_at'])

                    from apps.surveillance.models.outbreak import OutbreakCase
                    OutbreakCase.objects.get_or_create(
                        outbreak=outbreak,
                        case=case,
                        defaults={'role': 'SECONDARY', 'confirmed_at': timezone.now()}
                    )

            outbreak.update_statistics()
            outbreak.save()

            return outbreak


class ContactWorkflowService:
    """خدمة إدارة سير عمل المخالطين."""

    @classmethod
    def add_followup(cls, contact: ContactTrace, followup_data: dict, user) -> ContactFollowUp:
        """إضافة متابعة يومية."""
        followup = ContactFollowUp.objects.create(
            contact=contact,
            check_date=followup_data.get('check_date', timezone.localdate()),
            check_time=followup_data.get('check_time'),
            temperature=followup_data.get('temperature'),
            heart_rate=followup_data.get('heart_rate'),
            respiratory_rate=followup_data.get('respiratory_rate'),
            oxygen_saturation=followup_data.get('oxygen_saturation'),
            symptoms=followup_data.get('symptoms', []),
            symptom_onset_date=followup_data.get('symptom_onset_date'),
            status=followup_data.get('status', FollowUpStatus.OK),
            notes=followup_data.get('notes', ''),
            checked_by=user,
            check_method=followup_data.get('check_method', 'PHONE'),
            converted_case=followup_data.get('converted_case'),
        )
        return followup

    @classmethod
    def check_overdue_followups(cls, sector=None):
        """فحص المتابعات المتأخرة."""
        from apps.surveillance.models.notification import Notification
        today = timezone.localdate()

        contacts = ContactTrace.objects.filter(
            status=ContactStatus.UNDER_MONITORING,
            follow_up_start__lte=today,
        )
        if sector:
            contacts = contacts.filter(sector=sector)

        for contact in contacts:
            # التحقق من المتابعات المفقودة
            expected_days = (today - contact.follow_up_start).days + 1
            expected_days = min(expected_days, contact.follow_up_days)
            completed = contact.follow_ups.count()

            if completed < expected_days:
                missed = expected_days - completed
                # إشعار المسؤول
                if contact.assigned_to:
                    Notification.objects.create(
                        recipient=contact.assigned_to,
                        notification_type='CONTACT_MISSED',
                        priority='HIGH',
                        title=f'متابعات فائتة للمخالط {contact.contact_number}',
                        message=f'المخالط {contact.person_name} لديه {missed} متابعة فائتة.',
                        action_url=f'/surveillance/contacts/{contact.id}/',
                        channels=['IN_APP', 'PUSH'],
                    )

        return contacts.count()


class InvestigationWorkflowService:
    """خدمة إدارة سير عمل التحقيق."""

    @classmethod
    def complete_axis(cls, axis: 'InvestigationAxis', user, findings: str = ''):
        """إكمال محور تحقيق."""
        axis.is_completed = True
        axis.completed_at = timezone.now()
        axis.completed_by = user
        if findings:
            axis.findings = findings
        axis.save(update_fields=['is_completed', 'completed_at', 'completed_by', 'findings'])

        # التحقق من اكتمال جميع المحاور
        investigation = axis.investigation
        if investigation.axes.filter(is_completed=False).count() == 0:
            investigation.status = InvestigationStatus.COMPLETED
            investigation.completed_at = timezone.localdate()
            investigation.save(update_fields=['status', 'completed_at'])

    @classmethod
    def close_investigation(cls, investigation: Investigation, user, closure_notes: str = ''):
        """إغلاق التحقيق."""
        investigation.status = InvestigationStatus.CLOSED
        if closure_notes:
            investigation.notes = closure_notes
        investigation.closed_at = timezone.localdate()
        investigation.save(update_fields=['status', 'closed_at', 'notes', 'updated_at'])


class SpecimenWorkflowService:
    """خدمة إدارة سير عمل العينات."""

    ALLOWED_TRANSITIONS = {
        SpecimenStatus.ORDERED: [SpecimenStatus.COLLECTED, SpecimenStatus.REJECTED],
        SpecimenStatus.COLLECTED: [SpecimenStatus.IN_TRANSIT, SpecimenStatus.RECEIVED, SpecimenStatus.REJECTED],
        SpecimenStatus.IN_TRANSIT: [SpecimenStatus.RECEIVED, SpecimenStatus.REJECTED],
        SpecimenStatus.RECEIVED: [SpecimenStatus.ACCEPTED, SpecimenStatus.REJECTED],
        SpecimenStatus.ACCEPTED: [SpecimenStatus.PROCESSING, SpecimenStatus.REJECTED],
        SpecimenStatus.PROCESSING: [SpecimenStatus.TESTED, SpecimenStatus.REJECTED],
        SpecimenStatus.TESTED: [SpecimenStatus.RESULT_READY],
        SpecimenStatus.RESULT_READY: [SpecimenStatus.RESULT_REPORTED],
        SpecimenStatus.RESULT_REPORTED: [SpecimenStatus.ARCHIVED],
        SpecimenStatus.REJECTED: [SpecimenStatus.DISPOSED],
        SpecimenStatus.ARCHIVED: [SpecimenStatus.DISPOSED],
    }

    @classmethod
    def transition(cls, specimen: Specimen, new_status: str, user, note: str = '') -> Specimen:
        if new_status not in cls.ALLOWED_TRANSITIONS.get(specimen.status, []):
            raise ValueError(
                f'لا يمكن الانتقال من {specimen.get_status_display()} '
                f'إلى {dict(SpecimenStatus.choices).get(new_status, new_status)}'
            )

        old_status = specimen.status
        specimen.status = new_status

        # تحديث الحقول الزمنية
        now = timezone.now()
        if new_status == SpecimenStatus.COLLECTED:
            specimen.collected_at = now
            specimen.collected_by = user
        elif new_status == SpecimenStatus.RECEIVED:
            specimen.received_at = now
            specimen.received_by = user
        elif new_status == SpecimenStatus.RESULT_REPORTED:
            specimen.result_reported_at = now
            specimen.result_reported_to = user

        specimen.save(update_fields=['status', 'collected_at', 'received_at', 'result_reported_at',
                                     'collected_by', 'received_by', 'result_reported_to', 'updated_at'])

        # تسجيل الحركة
        from apps.surveillance.models.specimen import SpecimenMovement
        SpecimenMovement.objects.create(
            specimen=specimen,
            action=SpecimenMovement.Action(new_status),
            handler=user,
            notes=note,
        )

        return specimen


class AlertWorkflowService:
    """خدمة إدارة سير عمل الإنذارات."""

    @classmethod
    def acknowledge(cls, alert: SurveillanceAlert, user, note: str = '') -> SurveillanceAlert:
        """إقرار الإنذار."""
        if alert.status not in [AlertStatus.NEW, AlertStatus.UNDER_REVIEW]:
            raise ValueError('لا يمكن إقرار هذا الإنذار في حالته الحالية')

        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = timezone.now()
        if note:
            alert.evaluation_notes = note
        alert.save(update_fields=['status', 'acknowledged_at', 'evaluation_notes'])

        # إنشاء تقييم
        from apps.surveillance.models.alert import AlertEvaluation
        AlertEvaluation.objects.create(
            alert=alert,
            evaluator=user,
            previous_status=AlertEvaluationStatus.PENDING,
            new_status=AlertEvaluationStatus.UNDER_EVALUATION,
            decision='MONITOR',
            justification=note or 'تم الإقرار للمراجعة',
        )

        return alert

    @classmethod
    def evaluate(cls, alert: SurveillanceAlert, user, decision: str, risk_level: str,
                 justification: str, recommended_actions: list = None) -> SurveillanceAlert:
        """تقييم الإنذار."""
        alert.evaluation_status = {
            'ACCEPT': AlertEvaluationStatus.ACCEPTED,
            'REJECT': AlertEvaluationStatus.REJECTED,
            'REQUEST_INFO': AlertEvaluationStatus.NEEDS_MORE_INFO,
            'ESCALATE': AlertEvaluationStatus.ESCALATED_TO_OUTBREAK,
        }.get(decision, AlertEvaluationStatus.ACCEPTED)

        alert.evaluated_by = user
        alert.evaluated_at = timezone.now()
        alert.evaluation_notes = justification
        alert.risk_assessment = {
            'risk_level': risk_level,
            'recommended_actions': recommended_actions or [],
        }

        if decision == 'ACCEPT':
            alert.status = AlertStatus.INVESTIGATING
        elif decision == 'REJECT':
            alert.status = AlertStatus.FALSE_ALARM
        elif decision == 'ESCALATE':
            alert.status = AlertStatus.ESCALATED

        alert.save(update_fields=[
            'evaluation_status', 'status', 'evaluated_by', 'evaluated_at',
            'evaluation_notes', 'risk_assessment', 'updated_at'
        ])

        # تسجيل التقييم
        from apps.surveillance.models.alert import AlertEvaluation
        AlertEvaluation.objects.create(
            alert=alert,
            evaluator=user,
            previous_status=AlertEvaluationStatus.PENDING,
            new_status=alert.evaluation_status,
            decision=decision,
            risk_level=risk_level,
            justification=justification,
            recommended_actions=recommended_actions or [],
        )

        return alert

    @classmethod
    def close(cls, alert: SurveillanceAlert, user, reason: str = '') -> SurveillanceAlert:
        """إغلاق الإنذار."""
        alert.status = AlertStatus.CLOSED
        alert.resolved_by = user
        alert.resolved_at = timezone.now()
        alert.closure_reason = reason
        alert.save(update_fields=['status', 'resolved_by', 'resolved_at', 'closure_reason'])
        return alert