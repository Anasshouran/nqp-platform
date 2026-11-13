"""M5-C-F — FACILITY scope policy for screening / HR / laboratory (D-F-1/2/3).

تاريخيًا (M5-C-F) كانت التطبيقات الثلاثة deny-all لقناة FACILITY.
**M6-bis أغلق هذا الدين**: أُضيف `facility` FK (nullable) للنماذج الثلاثة
وأصبحت القناة مفعّلة (خلف بوابة `PROD_SCOPING_ENABLED`).

ما يبقى مُختبَرًا هنا هو **الفشل الآمن للسجلات غير المرتبطة**:
سجل بلا `facility` FK لا يُفتح لمستخدم FACILITY عبر أي جسر ضمني.
  - screening: الفحص يُربط بالمنشأة عبر منفذها (`HealthFacility.entry_point`)
    — اتحاد مقصود مع قناة المنشأة المباشرة (M6-bis، D-M5-C-F-2).
  - HR: `OrgAssignment.facility` NULL ⇒ غير مرئي (D-M5-C-F-1).
  - laboratory: `LabSample.facility` NULL ⇒ غير مرئي (D-M5-C-F-3).
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
class TestFacilityUnlinkedRecordsDenyAll:

    def test_screening_facility_resolves_via_entry_point(self, settings):
        """M6-bis (D-M5-C-F-2): منشأة → منفذها (`HealthFacility.entry_point`) — مرئي."""
        settings.DEBUG = True
        settings.PROD_SCOPING_ENABLED = False
        world = _build_world('X')
        user = _make_facility_user(world['facility'], with_perm=('screening',))
        screening = _screening(world['entry_point'], user)

        client = api_client()
        client.force_authenticate(user=user)
        resp = client.get('/api/v1/screening/')
        assert resp.status_code == 200
        assert [row['id'] for row in list_items(resp)] == [str(screening.id)], (
            'M6-bis — جسر المنشأة→المنفذ يجب أن يفتح فحوصات منشأة المستخدم'
        )

    def test_hr_unlinked_assignment_stays_invisible(self, settings):
        """D-M5-C-F-1: تعيين بلا `facility` FK لا يُفتح لمستخدم FACILITY."""
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
            'D-M5-C-F-1 violated — تعيين بلا facility تسرّب إلى FACILITY user'
        )

    def test_laboratory_unlinked_sample_stays_invisible(self, settings):
        """D-M5-C-F-3: عينة بلا `facility` FK لا تُفتح لمستخدم FACILITY."""
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
            'D-M5-C-F-3 violated — عينة بلا facility تسرّبت إلى FACILITY user'
        )
