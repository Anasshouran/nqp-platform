"""اختبارات ServiceRegistry — Service + ServiceAvailability."""
import uuid
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.test import APIClient

from apps.masterdata.models import (
    Sector as MasterdataSector, State, EntryPoint, HealthFacility,
)
from apps.organization.models import Sector as OrgSector, Locality, Department
from apps.registry.models import Service, ServiceAvailability

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_superuser():
    user = User.objects.create_user(email=f'admin_{_uid()}@test.com', password='x')
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


def _make_service(category='TB'):
    return Service.objects.create(
        code=f'SVC_{_uid()}', name_ar='خدمة', category=category,
    )


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


def _make_department():
    return Department.objects.create(
        code=f'DEPT_{_uid()}', name_ar='إدارة', kind='DEPARTMENT',
    )


@pytest.mark.django_db
class TestServiceModel:

    def test_create_service(self):
        svc = _make_service()
        assert svc.is_active
        assert svc.category == 'TB'

    def test_code_unique(self):
        code = f'UNIQ_{_uid()}'
        Service.objects.create(code=code, name_ar='1', category='TB')
        with pytest.raises(IntegrityError):
            Service.objects.create(code=code, name_ar='2', category='HIV')


@pytest.mark.django_db
class TestServiceAvailabilityModel:

    def test_facility_target(self):
        svc = _make_service()
        fac = _make_facility()
        av = ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=fac,
            valid_from='2026-01-01',
        )
        assert av.facility_id == fac.id

    def test_department_target(self):
        svc = _make_service()
        dept = _make_department()
        av = ServiceAvailability.objects.create(
            service=svc, target_type='DEPARTMENT', department=dept,
            valid_from='2026-01-01',
        )
        assert av.department_id == dept.id

    def test_exactly_one_target(self):
        """target_type=FACILITY بدون facility → ValidationError."""
        svc = _make_service()
        av = ServiceAvailability(
            service=svc, target_type='FACILITY',
            valid_from='2026-01-01',
        )
        with pytest.raises((ValidationError, Exception)):
            av.full_clean()

    def test_facility_and_department_both_set_rejected(self):
        """target_type=FACILITY + department set → ValidationError."""
        svc = _make_service()
        fac = _make_facility()
        dept = _make_department()
        av = ServiceAvailability(
            service=svc, target_type='FACILITY',
            facility=fac, department=dept,
            valid_from='2026-01-01',
        )
        with pytest.raises((ValidationError, Exception)):
            av.full_clean()

    def test_invalid_date_range(self):
        svc = _make_service()
        fac = _make_facility()
        av = ServiceAvailability(
            service=svc, target_type='FACILITY', facility=fac,
            valid_from='2026-12-31', valid_to='2026-01-01',
        )
        with pytest.raises((ValidationError, Exception)):
            av.full_clean()

    def test_duplicate_active_facility_rejected(self):
        """ADR-03: M2M — لكن (service, facility) نشط واحد فقط في وقت واحد."""
        svc = _make_service()
        fac = _make_facility()
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=fac,
            valid_from='2026-01-01',
        )
        with pytest.raises(IntegrityError):
            ServiceAvailability.objects.create(
                service=svc, target_type='FACILITY', facility=fac,
                valid_from='2026-06-01',
            )

    def test_service_offered_at_multiple_facilities(self):
        """ADR-03: خدمة تُقدَّم في منشآت متعددة."""
        svc = _make_service()
        fac1 = _make_facility()
        fac2 = _make_facility()
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=fac1,
            valid_from='2026-01-01',
        )
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=fac2,
            valid_from='2026-01-01',
        )
        assert svc.availabilities.filter(valid_to__isnull=True).count() == 2

    def test_service_offered_at_facility_and_department(self):
        """ADR-03: خدمة تُقدَّم في منشأة AND إدارة."""
        svc = _make_service()
        fac = _make_facility()
        dept = _make_department()
        ServiceAvailability.objects.create(
            service=svc, target_type='FACILITY', facility=fac,
            valid_from='2026-01-01',
        )
        ServiceAvailability.objects.create(
            service=svc, target_type='DEPARTMENT', department=dept,
            valid_from='2026-01-01',
        )
        assert svc.availabilities.filter(valid_to__isnull=True).count() == 2


@pytest.mark.django_db
class TestServiceAPI:

    def test_list_services_authenticated(self):
        _make_service()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.get('/api/v1/registry/services/')
        assert response.status_code == 200

    def test_create_service_global(self):
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/services/', {
            'code': f'API_{_uid()}', 'name_ar': 'خدمة API', 'category': 'TB',
        })
        assert response.status_code == 201, response.json()

    def test_create_service_non_global_forbidden(self):
        user = User.objects.create_user(email=f'plain_{_uid()}@test.com', password='x')
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/v1/registry/services/', {
            'code': f'DENY_{_uid()}', 'name_ar': 'x', 'category': 'TB',
        })
        assert response.status_code in (403, 401)

    def test_create_availability_api(self):
        svc = _make_service()
        fac = _make_facility()
        client = APIClient()
        client.force_authenticate(user=_make_superuser())
        response = client.post('/api/v1/registry/service-availability/', {
            'service': str(svc.id), 'target_type': 'FACILITY',
            'facility': str(fac.id), 'valid_from': '2026-01-01',
        })
        assert response.status_code == 201, response.json()


@pytest.mark.django_db
class TestServiceSignals:

    def test_service_create_logs(self):
        from apps.registry.models import RegistryChangeLog
        before = RegistryChangeLog.objects.count()
        Service.objects.create(
            code=f'SIG_{_uid()}', name_ar='سيج', category='TB',
        )
        assert RegistryChangeLog.objects.count() == before + 1
