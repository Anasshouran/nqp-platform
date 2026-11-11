"""M5-C-F — deny-all policy for screening / HR / laboratory (D-F-1/2/3).

القرارات المعتمدة:
  - D-F-1 = B ⇒ screening: deny-all (دلالة المنفذ ≠ دلالة المنشأة) → D-M5-C-F-2.
  - D-F-2 = D-M5-C-F-1 ⇒ HR: deny-all (لا `OrgAssignment.facility` FK) → M6.
  - D-F-3 = A ⇒ laboratory/vector: deny-all (لا حقل منشأة على النماذج) → D-M5-C-F-3.

هذه التطبيقات تبقى **بلا فروع FACILITY**: وجود `HealthFacility.entry_point`
لا يوسّعها، لأن كل تطبيق يملك مسار نطاقه الخاص ولا يقرأ scope_type=FACILITY.
"""
import uuid

import pytest
from django.utils import timezone

from apps.accounts.models import EmployeeProfile
from apps.laboratory.models import LabSample
from apps.organization.models import OrgAssignment
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

from .conftest import _build_world, _role_with_perm, api_client, list_items

from django.contrib.auth import get_user_model

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _make_facility_user(facility, *, with_perm):
    from apps.accounts.models import RoleAssignment
    uid = _uid()
    user = User.objects.create_user(email=f'facdeny_{uid}@x.com', password='x')
    role = _role_with_perm('FACILITY', list(with_perm))
    RoleAssignment.objects.create(
        user=user, role=role, scope_type='FACILITY', scope_id=facility.id,
    )
    return user


def _screening(ep, officer):
    uid = _uid()
    country = Country.objects.create(
        code=f'S{uid[:2]}'[:3], name=f'بلد {uid[:6]}', name_ar=f'بلد {uid[:6]}',
    )
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(traveler=traveler, port=ep, officer=officer)


def _sample(collector, world):
    return LabSample.objects.create(
        sample_barcode=f'BAR_{_uid()}', collector=collector,
        sector=world['org_sector'], entry_point=world['entry_point'],
    )


def _employee(world):
    uid = _uid()
    euser = User.objects.create_user(email=f'emp_{uid}@x.com', password='x')
    profile = EmployeeProfile.objects.create(user=euser, employee_number=f'EMP_{uid}')
    OrgAssignment.objects.create(
        user=euser, sector=world['org_sector'],
        entry_point=world['entry_point'], is_active=True,
    )
    return euser, profile


@pytest.mark.django_db
class TestFacilityDenyAll:

    def test_screening_deny_all(self, settings):
        """D-M5-C-F-2: FACILITY لا يرى فحوصات حتى في منفذ منشأته."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world = _build_world('X')
        user = _make_facility_user(world['facility'], with_perm=('screening',))
        _screening(world['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'D-M5-C-F-2 violated — FACILITY scope leaked into screening'
        )

    def test_hr_deny_all(self, settings):
        """D-M5-C-F-1: FACILITY لا يرى موظفي منفذ منشأته (لا facility FK)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world = _build_world('X')
        _employee(world)
        user = _make_facility_user(world['facility'], with_perm=('hr_employee',))

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'D-M5-C-F-1 violated — FACILITY scope leaked into HR'
        )

    def test_laboratory_deny_all(self, settings):
        """D-M5-C-F-3: FACILITY لا يرى عينات منفذ منشأته (لا facility FK)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world = _build_world('X')
        user = _make_facility_user(world['facility'], with_perm=('laboratory',))
        _sample(user, world)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        assert list_items(resp) == [], (
            'D-M5-C-F-3 violated — FACILITY scope leaked into laboratory'
        )
