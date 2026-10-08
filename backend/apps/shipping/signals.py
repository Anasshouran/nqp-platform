from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from apps.shipping.models import ShippingAgent, VesselCompanyRelationship, ShippingAuditLog


def _create_audit_log(action, obj, object_type, detail=None):
    """إنشاء سجل تدقيق مشترك — المستخدم يُملأ من السياق عند توفر middleware."""
    ShippingAuditLog.objects.create(
        user=None,  # سيُملأ لاحقاً إذا توفر middleware للطلب الحالي
        action=action,
        object_type=object_type,
        object_id=str(obj.pk),
        object_label=str(obj)[:255],
        detail=detail or {},
    )


@receiver(post_save, sender='shipping.ShippingAgent')
def shipping_agent_audit(sender, instance, created, **kwargs):
    if created:
        ShippingAuditLog.objects.create(
            user=None,
            action='CREATE',
            object_type='ShippingAgent',
            object_id=str(instance.pk),
            object_label=str(instance)[:255],
            detail={'company_id': str(instance.company_id), 'status': instance.status},
        )
    else:
        ShippingAuditLog.objects.create(
            user=None,
            action='UPDATE',
            object_type='ShippingAgent',
            object_id=str(instance.pk),
            object_label=str(instance)[:255],
            detail={'company_id': str(instance.company_id), 'status': instance.status},
        )


@receiver(pre_delete, sender='shipping.ShippingAgent')
def shipping_agent_delete_audit(sender, instance, **kwargs):
    ShippingAuditLog.objects.create(
        user=None,
        action='DELETE',
        object_type='ShippingAgent',
        object_id=str(instance.pk),
        object_label=str(instance)[:255],
        detail={'company_id': str(instance.company_id), 'status': instance.status},
    )


@receiver(post_save, sender='shipping.VesselCompanyRelationship')
def vessel_company_relationship_audit(sender, instance, created, **kwargs):
    if created:
        ShippingAuditLog.objects.create(
            user=None,
            action='CREATE',
            object_type='VesselCompanyRelationship',
            object_id=str(instance.pk),
            object_label=str(instance)[:255],
            detail={'vessel_id': str(instance.vessel_id), 'role': instance.role},
        )
    else:
        ShippingAuditLog.objects.create(
            user=None,
            action='UPDATE',
            object_type='VesselCompanyRelationship',
            object_id=str(instance.pk),
            object_label=str(instance)[:255],
            detail={'vessel_id': str(instance.vessel_id), 'role': instance.role},
        )


@receiver(pre_delete, sender='shipping.VesselCompanyRelationship')
def vessel_company_relationship_delete_audit(sender, instance, **kwargs):
    ShippingAuditLog.objects.create(
        user=None,
        action='DELETE',
        object_type='VesselCompanyRelationship',
        object_id=str(instance.pk),
        object_label=str(instance)[:255],
        detail={'vessel_id': str(instance.vessel_id), 'role': instance.role},
    )