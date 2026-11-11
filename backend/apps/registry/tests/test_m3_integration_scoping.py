"""Cross-model scoping — SECTOR user sees consistent scope."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import (
    ReportingNode, StateMinistry, FacilityOwner, FacilityOwnership,
    TechnicalSupervisor, TechnicalSupervision, Service, ServiceAvailability,
    DepartmentNodeAssignment,
)
from apps.accounts.models import Role, RoleAssignment

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _build_sector_setup(uid):
    """ينشئ قطاعين كاملين: sector + state + locality + entry_point + facility لكل منهما."""
    results = {}
    for tag in ['A', 'B']:
        md = MasterdataSector.objects.create(code=f'MD_{tag}_{uid}', name_ar=f'نقل {tag}')
        org = OrgSector.objects.create(code=f'ORG_{tag}_{uid}', name_ar=f'قطاع {tag}')
        state = State.objects.create(code=f'ST_{tag}_{uid}', name_ar=f'ولاية {tag}', sector=md)
        loc = Locality.objects.create(code=f'LOC_{tag}_{uid}', name_ar=f'محلية {tag}', sector=org)
        ep = EntryPoint.objects.create(
            code=f'EP_{tag}_{uid}', name_ar=f'منفذ {tag}',
            state=state, sector=org, locality=loc,
        )
        fac = HealthFacility.objects.create(
            code=f'FAC_{tag}_{uid}', name_ar=f'منشأة {tag}',
            sector=org, locality=loc, entry_point=ep,
        )
        results[tag] = {
            'md_sector': md, 'org_sector': org, 'state': state,
            'locality': loc, 'entry_point': ep, 'facility': fac,
        }
    return results


@pytest.mark.django_db
class TestCrossModelScoping:

    def _make_sector_user(self, org_sector):
        uid = uuid.uuid4().hex[:8]
        user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
        user.sector = org_sector
        user.save()
        role = Role.objects.create(name=f'SECTOR_ROLE_{uid}')
        RoleAssignment.objects.create(
            user=user, role=role, scope_type='SECTOR', scope_id=org_sector.id,
        )
        from apps.accounts.models import Permission
        perm, _ = Permission.objects.get_or_create(
            code='registry:view', defaults={'name': 'View', 'resource': 'registry', 'action': 'view'}
        )
        role.permissions.add(perm)
        perm2, _ = Permission.objects.get_or_create(
            code='ministry:view', defaults={'name': 'View Ministry', 'resource': 'ministry', 'action': 'view'}
        )
        role.permissions.add(perm2)
        return user

    def test_ministries_scoping(self, db):
        """SECTOR user يرى فقط وزارات قطاعه."""
        uid = uuid.uuid4().hex[:8]
        setup = _build_sector_setup(uid)
        min_a = StateMinistry.objects.create(state=setup['A']['state'], ministry_name_ar='وزارة A')
        min_b = StateMinistry.objects.create(state=setup['B']['state'], ministry_name_ar='وزارة B')
        user = self._make_sector_user(setup['A']['org_sector'])

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/ministries/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', {}).get('results', []) if isinstance(body, dict) and isinstance(body.get('data'), dict) else (body.get('data', []) if isinstance(body, dict) else body)
        ids = {str(i['id']) for i in items}
        assert str(min_a.id) in ids
        assert str(min_b.id) not in ids

    def test_ownerships_scoping(self, db):
        """SECTOR user يرى فقط ownerships قطاعه."""
        uid = uuid.uuid4().hex[:8]
        setup = _build_sector_setup(uid)
        owner = FacilityOwner.objects.create(code=f'OWN_{uid}', name_ar='مالك', kind='PRIVATE')
        ow_a = FacilityOwnership.objects.create(
            facility=setup['A']['facility'], owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        ow_b = FacilityOwnership.objects.create(
            facility=setup['B']['facility'], owner=owner,
            valid_from='2026-01-01', is_primary=True,
        )
        user = self._make_sector_user(setup['A']['org_sector'])

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/facility-ownerships/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', {}).get('results', []) if isinstance(body, dict) and isinstance(body.get('data'), dict) else (body.get('data', []) if isinstance(body, dict) else body)
        ids = {str(i['id']) for i in items}
        assert str(ow_a.id) in ids
        assert str(ow_b.id) not in ids

    def test_supervisions_scoping(self, db):
        """SECTOR user يرى فقط supervisions قطاعه."""
        uid = uuid.uuid4().hex[:8]
        setup = _build_sector_setup(uid)
        sup = TechnicalSupervisor.objects.create(
            code=f'SUP_{uid}', name_ar='مشرف', kind='FEDERAL_PROGRAM', domain='TB',
        )
        sv_a = TechnicalSupervision.objects.create(
            facility=setup['A']['facility'], supervisor=sup,
            valid_from='2026-01-01', is_primary=True, target_type='FACILITY',
        )
        sv_b = TechnicalSupervision.objects.create(
            facility=setup['B']['facility'], supervisor=sup,
            valid_from='2026-01-01', is_primary=True, target_type='FACILITY',
        )
        user = self._make_sector_user(setup['A']['org_sector'])

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/technical-supervisions/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', {}).get('results', []) if isinstance(body, dict) and isinstance(body.get('data'), dict) else (body.get('data', []) if isinstance(body, dict) else body)
        ids = {str(i['id']) for i in items}
        assert str(sv_a.id) in ids
        assert str(sv_b.id) not in ids

    def test_service_availability_scoping(self, db):
        """SECTOR user يرى فقط availabilities قطاعه."""
        uid = uuid.uuid4().hex[:8]
        setup = _build_sector_setup(uid)
        svc = Service.objects.create(code=f'SVC_{uid}', name_ar='خدمة', category='TB')
        av_a = ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=setup['A']['facility'],
            valid_from='2026-01-01',
        )
        av_b = ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=setup['B']['facility'],
            valid_from='2026-01-01',
        )
        user = self._make_sector_user(setup['A']['org_sector'])

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/service-availability/')
        assert response.status_code == 200
        body = response.json()
        items = body.get('data', {}).get('results', []) if isinstance(body, dict) and isinstance(body.get('data'), dict) else (body.get('data', []) if isinstance(body, dict) else body)
        ids = {str(i['id']) for i in items}
        assert str(av_a.id) in ids
        assert str(av_b.id) not in ids

    def test_plain_user_denied_everywhere(self, db):
        """Plain user (no scope) → qs.none() عبر كل endpoints."""
        uid = uuid.uuid4().hex[:8]
        setup = _build_sector_setup(uid)
        StateMinistry.objects.create(state=setup['A']['state'], ministry_name_ar='وزارة')

        plain = User.objects.create_user(email=f'plain_{uid}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=plain)

        for endpoint in [
            '/api/v1/registry/ministries/',
            '/api/v1/registry/facility-ownerships/',
            '/api/v1/registry/technical-supervisions/',
            '/api/v1/registry/service-availability/',
        ]:
            response = client.get(endpoint)
            assert response.status_code in (200, 403), f'{endpoint}: {response.status_code}'
            if response.status_code == 200:
                body = response.json()
                items = body.get('data', {}).get('results', []) if isinstance(body, dict) and isinstance(body.get('data'), dict) else (body.get('data', []) if isinstance(body, dict) else body)
                assert items == [], f'{endpoint} leaks: {len(items)} items for plain user'
