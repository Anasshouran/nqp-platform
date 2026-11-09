"""اختبارات TechnicalSupervision — تاريخية + قيود + target validation."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality
from apps.registry.models import TechnicalSupervisor, TechnicalSupervision

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_facility():
    md = MasterdataSector.objects.create(code=f'MD_{_uid()}', name_ar='نقل')
    org = OrgSector.objects.create(code=f'ORG_{_uid()}', name_ar='قطاع')
    state = State.objects.create(code=f'ST_{_uid()}', name_ar='ولاية', sector=md)
    loc = Locality.objects.create(code=f'LOC_{_uid()}', name_ar='محلية', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{_uid()}', name_ar='منفذ',
        state=state, sector=org, locality=loc,
    )
    return HealthFacility.objects.create(
        code=f'FAC_{_uid()}', name_ar='منشأة',
        sector=org, locality=loc, entry_point=ep,
    )


def _make_supervisor(domain='TB'):
    return TechnicalSupervisor.objects.create(
        code=f'SUP_{_uid()}', name_ar='مشرف',
        kind='FEDERAL_PROGRAM', domain=domain,
    )


@pytest.mark.django_db
class TestTechnicalSupervisionModel:

    def test_create_supervision(self):
        facility = _make_facility()
        supervisor = _make_supervisor()
        sv = TechnicalSupervision.objects.create(
            facility=facility, supervisor=supervisor,
            valid_from='2026-01-01', is_primary=True,
            target_type='FACILITY',
        )
        assert sv.is_primary
        assert sv.target_type == 'FACILITY'

    def test_facility_required_for_facility_target(self):
        """target_type=FACILITY بدون facility → ValidationError."""
        supervisor = _make_supervisor()
        sv = TechnicalSupervision(
            supervisor=supervisor,
            valid_from='2026-01-01',
            target_type='FACILITY',
            facility=None,
        )
        with pytest.raises((ValidationError, Exception)):
            sv.full_clean()

    def test_invalid_date_range(self):
        facility = _make_facility()
        supervisor = _make_supervisor()
        sv = TechnicalSupervision(
            facility=facility, supervisor=supervisor,
            valid_from='2026-12-31', valid_to='2026-01-01',
            target_type='FACILITY',
        )
        with pytest.raises((ValidationError, Exception)):
            sv.full_clean()

    def test_duplicate_active_supervision_rejected(self):
        """UniqueConstraint: تعيينان نشطان لنفس (facility, supervisor)."""
        from django.db import IntegrityError
        facility = _make_facility()
        supervisor = _make_supervisor()
        TechnicalSupervision.objects.create(
            facility=facility, supervisor=supervisor,
            valid_from='2026-01-01', target_type='FACILITY',
        )
        with pytest.raises(IntegrityError):
            TechnicalSupervision.objects.create(
                facility=facility, supervisor=supervisor,
                valid_from='2026-06-01', target_type='FACILITY',
            )

    def test_historical_supervision_allowed(self):
        facility = _make_facility()
        supervisor = _make_supervisor()
        TechnicalSupervision.objects.create(
            facility=facility, supervisor=supervisor,
            valid_from='2025-01-01', valid_to='2025-12-31',
            target_type='FACILITY',
        )
        sv2 = TechnicalSupervision.objects.create(
            facility=facility, supervisor=supervisor,
            valid_from='2026-01-01', target_type='FACILITY',
        )
        assert sv2.pk is not None


@pytest.mark.django_db
class TestTechnicalSupervisionAPI:

    def test_create_supervision_api(self):
        facility = _make_facility()
        supervisor = _make_supervisor()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/technical-supervisions/', {
            'target_type': 'FACILITY',
            'facility': str(facility.id),
            'supervisor': str(supervisor.id),
            'valid_from': '2026-01-01',
            'is_primary': True,
        })
        assert response.status_code == 201, response.json()

    def test_sector_user_sees_own_sector_supervisions(self):
        """D-M3-3-2: SECTOR user يرى supervisions منشآت قطاعه فقط."""
        from apps.accounts.models import Role, RoleAssignment
        from apps.organization.models import Sector as OrgSector
        from apps.masterdata.models import (
            Sector as MasterdataSector, State, EntryPoint,
        )
        from apps.organization.models import Locality

        uid = _uid()

        # Sector A (user's sector)
        md_a = MasterdataSector.objects.create(code=f'MDA_{uid}', name_ar='نقل أ')
        org_a = OrgSector.objects.create(code=f'ORGA_{uid}', name_ar='قطاع أ')
        state_a = State.objects.create(code=f'STA_{uid}', name_ar='ولاية أ', sector=md_a)
        loc_a = Locality.objects.create(code=f'LOCA_{uid}', name_ar='محلية أ', sector=org_a)
        ep_a = EntryPoint.objects.create(
            code=f'EPA_{uid}', name_ar='منفذ أ',
            state=state_a, sector=org_a, locality=loc_a,
        )
        facility_a = HealthFacility.objects.create(
            code=f'FACA_{uid}', name_ar='منشأة أ',
            sector=org_a, locality=loc_a, entry_point=ep_a,
        )
        supervisor_a = _make_supervisor()
        sv_a = TechnicalSupervision.objects.create(
            facility=facility_a, supervisor=supervisor_a,
            valid_from='2026-01-01', is_primary=True, target_type='FACILITY',
        )

        # Sector B (other)
        md_b = MasterdataSector.objects.create(code=f'MDB_{uid}', name_ar='نقل ب')
        org_b = OrgSector.objects.create(code=f'ORGB_{uid}', name_ar='قطاع ب')
        state_b = State.objects.create(code=f'STB_{uid}', name_ar='ولاية ب', sector=md_b)
        loc_b = Locality.objects.create(code=f'LOCB_{uid}', name_ar='محلية ب', sector=org_b)
        ep_b = EntryPoint.objects.create(
            code=f'EPB_{uid}', name_ar='منفذ ب',
            state=state_b, sector=org_b, locality=loc_b,
        )
        facility_b = HealthFacility.objects.create(
            code=f'FACB_{uid}', name_ar='منشأة ب',
            sector=org_b, locality=loc_b, entry_point=ep_b,
        )
        supervisor_b = _make_supervisor()
        sv_b = TechnicalSupervision.objects.create(
            facility=facility_b, supervisor=supervisor_b,
            valid_from='2026-01-01', is_primary=True, target_type='FACILITY',
        )

        # SECTOR user for org_a
        user = User.objects.create_user(email=f'sector_{uid}@test.com', password='x')
        user.sector = org_a
        user.save()
        role = Role.objects.create(name=f'SECTOR_ROLE_{uid}')
        RoleAssignment.objects.create(
            user=user, role=role, scope_type='SECTOR', scope_id=org_a.id,
        )

        # منح صلاحية القراءة للدور
        from apps.accounts.models import Permission
        perm, _ = Permission.objects.get_or_create(
            code='registry:view', defaults={'name': 'View Registry', 'resource': 'registry', 'action': 'view'}
        )
        role.permissions.add(perm)

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get('/api/v1/registry/technical-supervisions/')
        assert response.status_code == 200, response.json()

        body = response.json()
        inner = body.get('data', {})
        if isinstance(inner, dict) and 'results' in inner:
            items = inner['results']
        elif isinstance(inner, list):
            items = inner
        else:
            items = []
        ids = {str(item['id']) for item in items}

        assert str(sv_a.id) in ids, "SECTOR user missing own supervision"
        assert str(sv_b.id) not in ids, "SECTOR user sees other sector's supervision — LEAK!"
