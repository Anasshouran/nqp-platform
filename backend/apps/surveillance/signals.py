import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.surveillance.models.case import HealthCase
from apps.surveillance.models.contact import ContactTrace, ContactFollowUp, FollowUpStatus
from apps.surveillance.models.specimen import Specimen, SpecimenLabResult
from apps.surveillance.models.alert import SurveillanceAlert
from apps.surveillance.models.outbreak import Outbreak, OutbreakCase
from apps.surveillance.models.event import HealthEvent
from apps.surveillance.models.vector_integration import VectorSurveillanceLink, VectorAlertRule
from apps.surveillance.services.notification_dispatch import NotificationDispatchService
from apps.surveillance.services.integration import SurveillanceIntegrationService

logger = logging.getLogger(__name__)


def _safe(func, *args, **kwargs):
    """تنفيذ آمن - لا نسمح لأخطاء الإشعارات بكسر حفظ النموذج."""
    try:
        func(*args, **kwargs)
    except Exception as e:
        logger.error(f'Surveillance signal error in {getattr(func, "__name__", func)}: {e}')


# ============================================
# HealthCase Signals
# ============================================

@receiver(pre_save, sender=HealthCase)
def health_case_track_changes(sender, instance, **kwargs):
    """تتبع التغييرات لتسجيلها في سجل انتقالات الحالة."""
    if instance.pk:
        try:
            old_instance = HealthCase.objects.get(pk=instance.pk)
            instance._old_case_type = old_instance.case_type
            instance._old_workflow_state = old_instance.workflow_state
            instance._old_status = old_instance.status
            instance._old_severity = old_instance.severity
        except HealthCase.DoesNotExist:
            pass


@receiver(post_save, sender=HealthCase)
def health_case_post_save(sender, instance, created, **kwargs):
    """بعد حفظ الحالة - إشعارات وتكامل."""
    if created:
        _safe(NotificationDispatchService.dispatch_case_registered, instance)

        if instance.source == 'SCREENING' and instance.port:
            _safe(SurveillanceIntegrationService.on_port_screening_case, instance)
        elif instance.source == 'LAB' and instance.lab_result:
            _safe(SurveillanceIntegrationService.on_lab_case_created, instance)


@receiver(post_save, sender=HealthCase)
def health_case_log_changes(sender, instance, created, **kwargs):
    """تسجيل التغييرات في سجل الحالة."""
    if created:
        return

    from apps.surveillance.models.case import CaseStatusLog
    user = getattr(instance, '_changed_by', None)
    note = getattr(instance, '_change_note', '')

    changes = [
        ('case_type', getattr(instance, '_old_case_type', None), instance.case_type),
        ('workflow_state', getattr(instance, '_old_workflow_state', None), instance.workflow_state),
        ('status', getattr(instance, '_old_status', None), instance.status),
        ('severity', getattr(instance, '_old_severity', None), instance.severity),
    ]
    for field, old, new in changes:
        if old is not None and old != new:
            CaseStatusLog.objects.create(
                case=instance,
                field=field,
                old_value=old,
                new_value=new,
                note=note,
                changed_by=user,
            )
            if field == 'workflow_state':
                _safe(NotificationDispatchService.dispatch_case_status_change, instance, old, new)


# ============================================
# ContactTrace Signals
# ============================================

@receiver(post_save, sender=ContactTrace)
def contact_trace_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(NotificationDispatchService.dispatch_contact_added, instance)


@receiver(post_save, sender=ContactFollowUp)
def contact_followup_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.status == FollowUpStatus.SYMPTOMATIC:
        _safe(NotificationDispatchService.dispatch_contact_symptomatic, instance)
    elif instance.status == FollowUpStatus.CONVERTED and instance.converted_case:
        _safe(NotificationDispatchService.dispatch_contact_converted, instance)
        _safe(SurveillanceIntegrationService.on_contact_converted_to_case, instance)


# ============================================
# Specimen Signals
# ============================================

@receiver(post_save, sender=Specimen)
def specimen_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(NotificationDispatchService.dispatch_specimen_collected, instance)


@receiver(post_save, sender=SpecimenLabResult)
def specimen_lab_result_post_save(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.result_qualitative == 'POSITIVE':
        _safe(NotificationDispatchService.dispatch_lab_result_positive, instance)
        SurveillanceIntegrationService.on_lab_result_positive(instance)


# ============================================
# SurveillanceAlert Signals
# ============================================

@receiver(post_save, sender=SurveillanceAlert)
def alert_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(NotificationDispatchService.dispatch_alert_generated, instance)
    elif hasattr(instance, '_old_status') and instance._old_status != instance.status:
        _safe(NotificationDispatchService.dispatch_alert_status_changed, instance)


@receiver(pre_save, sender=SurveillanceAlert)
def alert_track_status_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = SurveillanceAlert.objects.get(pk=instance.pk)
            instance._old_status = old.status
            instance._old_evaluation_status = old.evaluation_status
        except SurveillanceAlert.DoesNotExist:
            pass


# ============================================
# Outbreak Signals
# ============================================

@receiver(pre_save, sender=Outbreak)
def outbreak_track_status_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Outbreak.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except Outbreak.DoesNotExist:
            pass


@receiver(post_save, sender=Outbreak)
def outbreak_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(NotificationDispatchService.dispatch_outbreak_confirmed, instance)
    elif hasattr(instance, '_old_status') and instance._old_status != instance.status:
        _safe(NotificationDispatchService.dispatch_outbreak_status_changed, instance)


@receiver(post_save, sender=OutbreakCase)
def outbreak_case_post_save(sender, instance, created, **kwargs):
    if created:
        instance.outbreak.update_statistics()
        instance.outbreak.save(update_fields=[
            'total_cases', 'confirmed_cases', 'probable_cases',
            'suspected_cases', 'deaths', 'recovered', 'case_fatality_rate'
        ])


# ============================================
# HealthEvent Signals
# ============================================

@receiver(pre_save, sender=HealthEvent)
def health_event_track_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = HealthEvent.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except HealthEvent.DoesNotExist:
            pass


@receiver(post_save, sender=HealthEvent)
def health_event_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(NotificationDispatchService.dispatch_event_reported, instance)
    elif hasattr(instance, '_old_status') and instance._old_status != instance.status:
        _safe(NotificationDispatchService.dispatch_event_status_changed, instance)


# ============================================
# VectorSurveillanceLink Signals
# ============================================

@receiver(post_save, sender=VectorSurveillanceLink)
def vector_link_post_save(sender, instance, created, **kwargs):
    if created:
        link_type = getattr(instance, 'link_type', '')
        status = getattr(instance, 'association_strength', '')
        if status == 'STRONG' or link_type == 'CONFIRMED_LINK':
            _safe(SurveillanceIntegrationService.on_vector_case_link_confirmed, instance)


# ============================================
# Vector Alert Rule triggered via integration
# ============================================

@receiver(post_save, sender=VectorAlertRule)
def vector_alert_rule_post_save(sender, instance, created, **kwargs):
    if created:
        _safe(SurveillanceIntegrationService.on_vector_alert_rule_created, instance)