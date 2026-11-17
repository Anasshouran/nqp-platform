"""Cross-model data integrity."""
import uuid
import pytest
from django.db.models import ProtectedError
from django.contrib.auth import get_user_model

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, StateMinistry,
    FacilityOwner, FacilityOwnership,
    TechnicalSupervisor, TechnicalSupervision,
    Service, ServiceAvailability,
)


def _uid():
    return uuid.uuid4().hex[:8]


def _build_facility(uid):
    md = MasterdataSector.objects.create(code=f'MD_{uid}', name_ar='نقل')
    org = OrgSector.objects.create(code=f'ORG_{uid}', name_ar='قطاع')
    state = State.objects.create(code=f'ST_{uid}', name_ar='ولاية', sector=md)
    loc = Locality.objects.create(code=f'LOC_{uid}', name_ar='محلية', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{uid}', name_ar='منفذ', state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_{uid}', name_ar='منشأة', sector=org, locality=loc, entry_point=ep,
    )
    return {'state': state, 'facility': fac}


@pytest.mark.django_db
class TestIntegrity:

    def test_facility_protected_when_ownership_exists(self):
        """حذف facility مع ownership → ProtectedError."""
        uid = _uid()
        setup = _build_facility(uid)
        owner = FacilityOwner.objects.create(code=f'OWN_{uid}', name_ar='مالك', kind='PRIVATE')
        FacilityOwnership.objects.create(
            facility=setup['facility'], owner=owner,
            valid_from='2026-01-01',
        )
        with pytest.raises(ProtectedError):
            setup['facility'].delete()

    def test_facility_protected_when_supervision_exists(self):
        """حذف facility مع supervision → ProtectedError."""
        uid = _uid()
        setup = _build_facility(uid)
        sup = TechnicalSupervisor.objects.create(
            code=f'SUP_{uid}', name_ar='مشرف', kind='FEDERAL_PROGRAM', domain='TB',
        )
        TechnicalSupervision.objects.create(
            facility=setup['facility'], supervisor=sup,
            valid_from='2026-01-01', target_type='FACILITY',
        )
        with pytest.raises(ProtectedError):
            setup['facility'].delete()

    def test_node_protected_when_assignment_exists(self):
        """حذف ReportingNode مع StateNodeAssignment → ProtectedError."""
        uid = _uid()
        setup = _build_facility(uid)
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if not root:
            root = ReportingNode.objects.create(code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL')
        node = ReportingNode.objects.create(code=f'N_{uid}', name_ar='n', kind='STATE', parent=root)
        StateNodeAssignment.objects.create(
            state=setup['state'], node=node, valid_from='2026-01-01',
        )
        with pytest.raises(ProtectedError):
            node.delete()

    def test_service_availability_cascades_on_facility_delete(self):
        """حذف facility → ServiceAvailability cascades (CASCADE)."""
        uid = _uid()
        setup = _build_facility(uid)
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='خدمة', category='TB')
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=setup['facility'],
            valid_from='2026-01-01',
        )
        # FacilityOwnership (PROTECT) لا يمنع؟ — نتحقق
        # إن كان لديه ownership، سيُحمى. لذا لا نضيف ownership هنا.
        setup['facility'].delete()
        assert ServiceAvailability.objects.filter(service=svc).count() == 0

    def test_all_models_have_created_at_and_updated_at(self):
        """كل النماذج لها created_at/updated_at (توارث BaseModel)."""
        from apps.registry.models import (
            ReportingNode, StateNodeAssignment, LocalityNodeAssignment,
            HealthFacilityNodeAssignment, StateMinistry, RegistryChangeLog,
            FacilityOwner, FacilityOwnership, TechnicalSupervisor,
            TechnicalSupervision, DepartmentNodeAssignment,
            Service, ServiceAvailability,
        )
        models_to_check = [
            ReportingNode, StateNodeAssignment, LocalityNodeAssignment,
            HealthFacilityNodeAssignment, StateMinistry, RegistryChangeLog,
            FacilityOwner, FacilityOwnership, TechnicalSupervisor,
            TechnicalSupervision, DepartmentNodeAssignment,
            Service, ServiceAvailability,
        ]
        for model in models_to_check:
            field_names = {f.name for f in model._meta.fields}
            assert 'id' in field_names, f'{model.__name__} missing id'
            assert 'created_at' in field_names, f'{model.__name__} missing created_at'
            assert 'updated_at' in field_names, f'{model.__name__} missing updated_at'
