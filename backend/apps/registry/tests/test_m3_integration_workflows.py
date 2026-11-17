"""End-to-end workflows."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateNodeAssignment, StateMinistry,
    FacilityOwner, FacilityOwnership,
    Service, ServiceAvailability,
)

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


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
    return {'md': md, 'org': org, 'state': state, 'locality': loc, 'ep': ep, 'facility': fac}


@pytest.mark.django_db
class TestWorkflows:

    def test_full_registry_flow(self, db):
        """إنشاء tree → وزارة → مالك → إشراف → خدمة → تحقق من الشجرة."""
        uid = _uid()
        setup = _build_facility(uid)
        client = APIClient()
        client.force_authenticate(user=_make_superuser())

        # 1. Root + State node
        if not ReportingNode.objects.filter(parent__isnull=True).exists():
            ReportingNode.objects.create(code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL')
        root = ReportingNode.objects.filter(parent__isnull=True).first()

        state_node = ReportingNode.objects.create(
            code=f'SN_{uid}', name_ar='ولاية', kind='STATE', parent=root,
        )

        # 2. Assign State to node
        StateNodeAssignment.objects.create(
            state=setup['state'], node=state_node,
            valid_from='2026-01-01', is_primary=True,
        )

        # 3. StateMinistry
        StateMinistry.objects.create(state=setup['state'], ministry_name_ar='وزارة')

        # 4. Owner + ownership
        owner = FacilityOwner.objects.create(
            code=f'OWN_{uid}', name_ar='مالك', kind='STATE_MINISTRY',
        )
        FacilityOwnership.objects.create(
            facility=setup['facility'], owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )

        # 5. Service availability
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='خدمة', category='TB')
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=setup['facility'],
            valid_from='2026-01-01',
        )

        # --- تحقق ---
        # الشجرة تحتوي state node
        assert ReportingNode.objects.filter(parent=root).count() >= 1
        # الوزارة موجودة
        assert StateMinistry.objects.filter(state=setup['state']).exists()
        # الملكية موجودة
        assert FacilityOwnership.objects.filter(facility=setup['facility']).exists()
        # الخدمة موجودة
        assert ServiceAvailability.objects.filter(facility=setup['facility']).count() == 1

    def test_reassignment_history_flow(self, db):
        """تعيين ولاية → إعادة تعيين → التاريخ محفوظ."""
        uid = _uid()
        setup = _build_facility(uid)
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if not root:
            root = ReportingNode.objects.create(code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL')

        node1 = ReportingNode.objects.create(code=f'N1_{uid}', name_ar='n1', kind='STATE', parent=root)
        node2 = ReportingNode.objects.create(code=f'N2_{uid}', name_ar='n2', kind='STATE', parent=root)

        StateNodeAssignment.objects.create(
            state=setup['state'], node=node1,
            valid_from='2025-01-01', valid_to='2025-12-31', is_primary=True,
        )
        StateNodeAssignment.objects.create(
            state=setup['state'], node=node2,
            valid_from='2026-01-01', is_primary=True,
        )

        # تعيينان، واحد قديم مغلق، واحد نشط
        assert StateNodeAssignment.objects.filter(state=setup['state']).count() == 2
        assert StateNodeAssignment.objects.filter(
            state=setup['state'], valid_to__isnull=True, is_primary=True,
        ).count() == 1

    def test_service_m2m_workflow(self, db):
        """خدمة في 3 منشآت مختلفة."""
        uid = _uid()
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='خدمة', category='TB')
        facilities = []
        for i in range(3):
            setup = _build_facility(f'{uid}_{i}')
            facilities.append(setup['facility'])
            ServiceAvailability.objects.create(
                service=svc, target_type='FACILITY', facility=setup['facility'],
                valid_from='2026-01-01',
            )
        assert ServiceAvailability.objects.filter(service=svc).count() == 3

    def test_change_log_audit_trail(self, db):
        """إنشاء → تعديل → حذف ينتج 3 سجلات بترتيب صحيح."""
        from apps.registry.models import RegistryChangeLog
        uid = _uid()
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='قبل', category='TB')
        svc.name_ar = 'بعد'
        svc.save()
        svc_id = svc.id
        svc.delete()

        logs = RegistryChangeLog.objects.filter(
            entity_type='Service', entity_id=svc_id,
        ).order_by('created_at')
        actions = [l.action for l in logs]
        assert actions == ['CREATE', 'UPDATE', 'DELETE'], f'got {actions}'

    def test_tree_aggregation_endpoint(self, db):
        """GET /dashboard/tree/ يعيد الشجرة الكاملة."""
        uid = _uid()
        root = ReportingNode.objects.filter(parent__isnull=True).first()
        if not root:
            root = ReportingNode.objects.create(code=f'ROOT_{uid}', name_ar='جذر', kind='FEDERAL')
        ReportingNode.objects.create(code=f'STATE_{uid}', name_ar='ولاية', kind='STATE', parent=root)

        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/dashboard/tree/')
        assert response.status_code == 200
        body = response.json()
        data = body.get('data', body) if isinstance(body, dict) else body
        assert isinstance(data, (list, dict))
