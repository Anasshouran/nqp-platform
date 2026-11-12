"""Signals — تدقيق تلقائي عبر RegistryChangeLog (M2).

يُسجَّل CREATE/UPDATE/DELETE لكل النماذج الـ6 في السجل التنظيمي.
يُعالج D-1 (يدوي فقط) بمصادقة تلقائية.

M3-1-A: يُستخدم middleware thread-local لاستخراج المستخدم (D-M2-1).

تحمل الحذر:
- استخدم RegistryChangeLog.objects.create() مباشرة (ليس .save() على log).
- bulk_create لا يُطلق signals — وثّق ذلك (D-3).
- user يُستخرج من contextvars — يرجع None خارج request context (shell/tests).
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import (
    DepartmentNodeAssignment,
    FacilityOwner,
    FacilityOwnership,
    HealthFacilityNodeAssignment,
    LocalityNodeAssignment,
    RegistryChangeLog,
    ReportingNode,
    Service,
    ServiceAvailability,
    ServiceNodeAssignment,
    StateMinistry,
    StateNodeAssignment,
    TechnicalSupervisor,
    TechnicalSupervision,
)


def _log(action, instance, label=""):
    """يسجّل حدثاً في ChangeLog — مباشرة بدون signals متتالية."""
    # D-M2-1 fix: يحاول استخراج المستخدم من middleware thread-local
    from .middleware import get_current_user
    user = get_current_user()

    RegistryChangeLog.objects.create(
        user=user,
        action=action,
        entity_type=instance.__class__.__name__,
        entity_id=instance.id,
        entity_label=label or str(instance),
        detail={},
    )


# ---------------------------------------------------------------------------
# ReportingNode
# ---------------------------------------------------------------------------

@receiver(post_save, sender=ReportingNode)
def log_node_save(sender, instance, created, **kwargs):
    _log("CREATE" if created else "UPDATE", instance)


@receiver(post_delete, sender=ReportingNode)
def log_node_delete(sender, instance, **kwargs):
    _log("DELETE", instance, label=f"{instance.code} (deleted)")


# ---------------------------------------------------------------------------
# StateNodeAssignment
# ---------------------------------------------------------------------------

@receiver(post_save, sender=StateNodeAssignment)
def log_state_assignment_save(sender, instance, created, **kwargs):
    action = "CREATE" if created else "UPDATE"
    label = f"{instance.state.code} → {instance.node.code}"
    _log(action, instance, label=label)


@receiver(post_delete, sender=StateNodeAssignment)
def log_state_assignment_delete(sender, instance, **kwargs):
    label = f"{instance.state.code} → {instance.node.code} (deleted)"
    _log("DELETE", instance, label=label)


# ---------------------------------------------------------------------------
# LocalityNodeAssignment
# ---------------------------------------------------------------------------

@receiver(post_save, sender=LocalityNodeAssignment)
def log_locality_assignment_save(sender, instance, created, **kwargs):
    action = "CREATE" if created else "UPDATE"
    label = f"{instance.locality.code} → {instance.node.code}"
    _log(action, instance, label=label)


@receiver(post_delete, sender=LocalityNodeAssignment)
def log_locality_assignment_delete(sender, instance, **kwargs):
    label = f"{instance.locality.code} → {instance.node.code} (deleted)"
    _log("DELETE", instance, label=label)


# ---------------------------------------------------------------------------
# HealthFacilityNodeAssignment
# ---------------------------------------------------------------------------

@receiver(post_save, sender=HealthFacilityNodeAssignment)
def log_facility_assignment_save(sender, instance, created, **kwargs):
    action = "CREATE" if created else "UPDATE"
    label = f"{instance.facility.code} → {instance.node.code}"
    _log(action, instance, label=label)


@receiver(post_delete, sender=HealthFacilityNodeAssignment)
def log_facility_assignment_delete(sender, instance, **kwargs):
    label = f"{instance.facility.code} → {instance.node.code} (deleted)"
    _log("DELETE", instance, label=label)


# ---------------------------------------------------------------------------
# StateMinistry
# ---------------------------------------------------------------------------

@receiver(post_save, sender=StateMinistry)
def log_ministry_save(sender, instance, created, **kwargs):
    _log("CREATE" if created else "UPDATE", instance)


@receiver(post_delete, sender=StateMinistry)
def log_ministry_delete(sender, instance, **kwargs):
    _log("DELETE", instance, label=f"{instance.ministry_name_ar} (deleted)")


# ---------------------------------------------------------------------------
# FacilityOwner (M3-2)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=FacilityOwner)
def log_owner_save(sender, instance, created, **kwargs):
    _log("CREATE" if created else "UPDATE", instance)


@receiver(post_delete, sender=FacilityOwner)
def log_owner_delete(sender, instance, **kwargs):
    _log("DELETE", instance, label=f"{instance.code} (deleted)")


# ---------------------------------------------------------------------------
# FacilityOwnership (M3-2)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=FacilityOwnership)
def log_ownership_save(sender, instance, created, **kwargs):
    action = "ASSIGN" if created else "REASSIGN"
    _log(action, instance)


@receiver(post_delete, sender=FacilityOwnership)
def log_ownership_delete(sender, instance, **kwargs):
    _log("DELETE", instance)


# ---------------------------------------------------------------------------
# TechnicalSupervisor (M3-3)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=TechnicalSupervisor)
def log_supervisor_save(sender, instance, created, **kwargs):
    _log("CREATE" if created else "UPDATE", instance)


@receiver(post_delete, sender=TechnicalSupervisor)
def log_supervisor_delete(sender, instance, **kwargs):
    _log("DELETE", instance, label=f"{instance.code} (deleted)")


# ---------------------------------------------------------------------------
# TechnicalSupervision (M3-3)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=TechnicalSupervision)
def log_supervision_save(sender, instance, created, **kwargs):
    action = "ASSIGN" if created else "REASSIGN"
    _log(action, instance)


@receiver(post_delete, sender=TechnicalSupervision)
def log_supervision_delete(sender, instance, **kwargs):
    _log("DELETE", instance)


# ---------------------------------------------------------------------------
# DepartmentNodeAssignment (M3-4)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=DepartmentNodeAssignment)
def log_dept_assign_save(sender, instance, created, **kwargs):
    action = "ASSIGN" if created else "REASSIGN"
    _log(action, instance)


@receiver(post_delete, sender=DepartmentNodeAssignment)
def log_dept_assign_delete(sender, instance, **kwargs):
    _log("DELETE", instance)


# ---------------------------------------------------------------------------
# Service (M3-5)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Service)
def log_service_save(sender, instance, created, **kwargs):
    _log("CREATE" if created else "UPDATE", instance)


@receiver(post_delete, sender=Service)
def log_service_delete(sender, instance, **kwargs):
    _log("DELETE", instance, label=f"{instance.code} (deleted)")


# ---------------------------------------------------------------------------
# ServiceAvailability (M3-5)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=ServiceAvailability)
def log_availability_save(sender, instance, created, **kwargs):
    action = "ASSIGN" if created else "REASSIGN"
    _log(action, instance)


@receiver(post_delete, sender=ServiceAvailability)
def log_availability_delete(sender, instance, **kwargs):
    _log("DELETE", instance)


# ---------------------------------------------------------------------------
# ServiceNodeAssignment (M4-2)
# ---------------------------------------------------------------------------

@receiver(post_save, sender=ServiceNodeAssignment)
def log_service_node_assign_save(sender, instance, created, **kwargs):
    action = "ASSIGN" if created else "REASSIGN"
    _log(action, instance)


@receiver(post_delete, sender=ServiceNodeAssignment)
def log_service_node_assign_delete(sender, instance, **kwargs):
    _log("DELETE", instance)
