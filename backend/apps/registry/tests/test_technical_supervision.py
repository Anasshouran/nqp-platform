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
