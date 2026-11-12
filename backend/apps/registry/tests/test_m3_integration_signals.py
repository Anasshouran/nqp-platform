"""Cross-model signals — كل نموذج يُسجَّل بشكل متسق."""
import uuid
import pytest
from apps.registry.models import (
    ReportingNode, StateMinistry, FacilityOwner, TechnicalSupervisor,
    Service, RegistryChangeLog,
)


def _uid():
    return uuid.uuid4().hex[:8]


@pytest.mark.django_db
class TestSignalsConsistency:

    def test_all_models_create_logged(self):
        """كل نموذج من فئات مختلفة يُسجَّل عند الإنشاء."""
        models_to_create = [
            ('ReportingNode', lambda: ReportingNode.objects.create(
                code=f'SIG_RN_{_uid()}', name_ar='عقدة', kind='FEDERAL',
            )),
            ('FacilityOwner', lambda: FacilityOwner.objects.create(
                code=f'SIG_FO_{_uid()}', name_ar='مالك', kind='PRIVATE',
            )),
            ('TechnicalSupervisor', lambda: TechnicalSupervisor.objects.create(
                code=f'SIG_TS_{_uid()}', name_ar='مشرف', kind='FEDERAL_PROGRAM', domain='TB',
            )),
            ('Service', lambda: Service.objects.create(
                code=f'SIG_SVC_{_uid()}', name_ar='خدمة', category='TB',
            )),
        ]
        for entity_type, creator in models_to_create:
            before = RegistryChangeLog.objects.filter(entity_type=entity_type).count()
            instance = creator()
            after = RegistryChangeLog.objects.filter(entity_type=entity_type).count()
            assert after == before + 1, f'{entity_type} missing log on create'

            log = RegistryChangeLog.objects.filter(
                entity_type=entity_type, entity_id=instance.id,
            ).first()
            assert log is not None
            assert log.action == 'CREATE'

    def test_update_action_consistent(self):
        """تعديل أي نموذج → action=UPDATE."""
        owner = FacilityOwner.objects.create(
            code=f'UPD_{_uid()}', name_ar='قبل', kind='PRIVATE',
        )
        owner.name_ar = 'بعد'
        owner.save()
        last = RegistryChangeLog.objects.filter(
            entity_type='FacilityOwner', entity_id=owner.id,
        ).order_by('-created_at').first()
        assert last.action == 'UPDATE'

    def test_delete_action_consistent(self):
        """حذف أي نموذج → action=DELETE."""
        svc = Service.objects.create(
            code=f'DEL_{_uid()}', name_ar='حذف', category='TB',
        )
        svc_id = svc.id
        svc.delete()
        last = RegistryChangeLog.objects.filter(
            entity_type='Service', entity_id=svc_id,
        ).order_by('-created_at').first()
        assert last.action == 'DELETE'

    def test_no_duplicate_logs_on_single_save(self):
        """حفظ واحد → log واحد فقط (لا recursion، لا double signal)."""
        before = RegistryChangeLog.objects.count()
        ReportingNode.objects.create(
            code=f'NODUP_{_uid()}', name_ar='عقدة', kind='FEDERAL',
        )
        delta = RegistryChangeLog.objects.count() - before
        assert delta == 1, f'Expected exactly 1 log, got {delta}'
