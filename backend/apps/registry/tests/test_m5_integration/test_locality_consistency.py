"""M5-C-L — LOCALITY consistency عبر تطبيقات M5 (امتداد H1′).

نفس نمط اختبارات M5-B (H3/H4/H5) لكن بنطاق `LOCALITY`:
  - screening: `_entry_point_ids_for` — فرع LOCALITY خلف البوابة.
  - laboratory: `SectorFieldScopedMixin.locality_path` — union بلا استبدال.
  - hr: `SCOPE_LOOKUPS['LOCALITY']` + `resolve_own_org_scope_keys` — عبر
    `OrgAssignment.entry_point.locality_id`.
التسرب العابر بين محليتين ممنوع في كل تطبيق.
"""
import uuid

import pytest
from django.utils import timezone

from apps.accounts.models import EmployeeProfile
from apps.organization.models import OrgAssignment
from apps.laboratory.models import LabSample
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

from .conftest import (
    _build_world, api_client, list_items,
    make_locality_user,
)


def _uid():
    return uuid.uuid4().hex[:8]


def _sample(collector, world):
    return LabSample.objects.create(
        sample_barcode=f'BAR_{_uid()}', collector=collector,
        sector=world['org_sector'], entry_point=world['entry_point'],
    )


def _screening(ep, officer):
    uid = _uid()
    # كود ثابت عبر get_or_create — راجع test_h3_no_widening.py (تصادم 1/256).
    country, _ = Country.objects.get_or_create(
        code='TST',
        defaults={'name': 'Test Country', 'name_ar': 'بلد اختبار'},
    )
    traveler = Traveler.objects.create(
        passport_number=f'P{uid}', first_name='أول', last_name='الاسم',
        date_of_birth=timezone.localdate(), nationality=country,
    )
    return HealthScreening.objects.create(traveler=traveler, port=ep, officer=officer)


def _employee(world, entry_point=None):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    uid = _uid()
    euser = User.objects.create_user(email=f'emp_{uid}@x.com', password='x')
    profile = EmployeeProfile.objects.create(user=euser, employee_number=f'EMP_{uid}')
    OrgAssignment.objects.create(
        user=euser, sector=world['org_sector'], entry_point=entry_point, is_active=True,
    )
    return euser, profile


@pytest.mark.django_db
class TestLocalityApiConsistency:

    def test_locality_laboratory_sees_own_locality_samples(self, settings):
        """LOCALITY user يرى عينات محلية entry_point تبعته (via locality_path)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        collector = make_locality_user(world_a['locality'], with_perm=('laboratory',))
        sample_a = _sample(collector, world_a)

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample_a.id) in ids, (
            'LOCALITY laboratory channel silent — locality_path branch failed to widen visibility'
        )

    def test_locality_laboratory_no_cross_locality_leak(self, settings):
        """لا يرى عينات المحلية الأخرى."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        collector = make_locality_user(world_a['locality'], with_perm=('laboratory',))
        sample_b = _sample(collector, world_b)

        client = api_client()
        client.force_authenticate(user=collector)
        resp = client.get('/api/v1/laboratory/samples/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(sample_b.id) not in ids, 'Cross-locality leak in laboratory!'

    def test_locality_screening_sees_own_locality(self, settings):
        """LOCALITY officer يرى فحوصات منفذ محليته (via _entry_point_ids_for branch)."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'], with_perm=('screening',))
        screening = _screening(world_a['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(screening.id) in ids, 'LOCALITY screening channel silent'

    def test_locality_screening_no_cross_locality_leak(self, settings):
        """لا يرى فحوصات المحلية الأخرى."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        user = make_locality_user(world_a['locality'], with_perm=('screening',))
        screening_b = _screening(world_b['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        ids = {str(i['id']) for i in list_items(resp)}
        assert str(screening_b.id) not in ids, 'Cross-locality leak in screening!'

    def test_locality_gate_off_screening_denies_all(self, settings):
        """البوابة مغلقة في «prod» ⇒ LOCALITY channel deny (قائمة فارغة/حجب)."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        user = make_locality_user(world_a['locality'], with_perm=('screening',))
        _screening(world_a['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert list_items(resp) == [], 'LOCALITY channel leaked with gate OFF'

    def test_locality_hr_sees_employees_in_own_locality(self, settings):
        """LOCALITY HR user يرى موظفي محليته عبر OrgAssignment.entry_point.locality."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        _employee(world_a, entry_point=world_a['entry_point'])

        user = make_locality_user(world_a['locality'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert len(list_items(resp)) >= 1, 'LOCALITY HR channel silent'

    def test_locality_hr_no_cross_locality_leak(self, settings):
        """لا يرى موظفي المحلية الأخرى."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        world_b = _build_world('B')
        _employee(world_b, entry_point=world_b['entry_point'])

        user = make_locality_user(world_a['locality'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert list_items(resp) == [], 'Cross-locality leak in HR!'

    def test_locality_hr_gate_off_denies(self, settings):
        """البوابة مغلقة ⇒ HR/LOCALITY deny-all حتى مع تفويض LOCALITY."""
        settings.DEBUG = False
        settings.PROD_SCOPING_ENABLED = False
        world_a = _build_world('A')
        _employee(world_a, entry_point=world_a['entry_point'])

        user = make_locality_user(world_a['locality'], with_perm=('hr_employee',))
        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/hr/employees/')
        assert resp.status_code == 200
        assert list_items(resp) == [], 'HR LOCALITY channel leaked with gate OFF'
