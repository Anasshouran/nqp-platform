"""M6-bis — اختبارات backfill + سلامة الـ FK (D-M5-C-F-1/2/3).

تغطي:
  - nullability + SET_NULL على النماذج الأربعة.
  - `--dry-run` لا يكتب، والتشغيل الفعلي يكتب.
  - `--limit` يحدّ عدد الصفوف المعالجة.
  - الحالات غير الحصرية (أكثر من منشأة لنفس الجسر) تُتخطّى بأمان.
"""

import io
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db.models import SET_NULL

from apps.laboratory.models import LabSample
from apps.masterdata.models import EntryPoint, HealthFacility
from apps.masterdata.models import Sector as MasterdataSector
from apps.masterdata.models import State
from apps.organization.models import Locality, OrgAssignment, Sector
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler
from apps.vector_control.models import VectorUnit

pytestmark = pytest.mark.django_db

User = get_user_model()


def _uid():
    return uuid.uuid4().hex[:8]


def _build_world(tag):
    md = MasterdataSector.objects.create(code=f'MD_{tag}_{_uid()}', name_ar=f'نقل {tag}')
    org = Sector.objects.create(code=f'ORG_{tag}_{_uid()}', name_ar=f'قطاع {tag}')
    state = State.objects.create(code=f'ST_{tag}_{_uid()}', name_ar=f'ولاية {tag}', sector=md)
    loc = Locality.objects.create(code=f'LOC_{tag}_{_uid()}', name_ar=f'محلية {tag}', sector=org)
    ep = EntryPoint.objects.create(
        code=f'EP_{tag}_{_uid()}', name_ar=f'منفذ {tag}', kind='SEAPORT',
        state=state, sector=org, locality=loc,
    )
    fac = HealthFacility.objects.create(
        code=f'FAC_{tag}_{_uid()}', name_ar=f'منشأة {tag}',
        sector=org, locality=loc, entry_point=ep,
    )
    return {'sector': org, 'entry_point': ep, 'facility': fac}


def _user(tag='u'):
    return User.objects.create_user(
        email=f'{tag}_{_uid()}@nqp.sd', password='x', full_name=tag,
    )


def _run(name, **options):
    out = io.StringIO()
    call_command(name, stdout=out, **options)
    return out.getvalue()


class TestSchemaSafety:
    def test_facility_fk_is_nullable_with_set_null(self):
        models = (OrgAssignment, HealthScreening, LabSample, VectorUnit)
        for model in models:
            field = model._meta.get_field('facility')
            assert field.null is True, f'{model.__name__}.facility يجب أن يكون nullable'
            assert field.remote_field.on_delete is SET_NULL, (
                f'{model.__name__}.facility يجب أن يكون SET_NULL'
            )

    def test_set_null_on_facility_delete(self):
        world = _build_world('A')
        assignment = OrgAssignment.objects.create(
            user=_user('setnull'), facility=world['facility'], is_active=True,
        )
        world['facility'].delete()
        assignment.refresh_from_db()
        assert assignment.facility_id is None


class TestOrgAssignmentBackfill:
    def test_dry_run_does_not_write_then_apply_does(self):
        world = _build_world('A')
        assignment = OrgAssignment.objects.create(
            user=_user('org'), entry_point=world['entry_point'], is_active=True,
        )

        out = _run('backfill_org_assignment_facility', dry_run=True)
        assignment.refresh_from_db()
        assert assignment.facility_id is None
        assert '[DRY-RUN]' in out and 'updated=1' in out

        out = _run('backfill_org_assignment_facility')
        assignment.refresh_from_db()
        assert assignment.facility_id == world['facility'].id
        assert '[DRY-RUN]' not in out

    def test_limit_caps_processed_rows(self):
        world_a = _build_world('A')
        world_b = _build_world('B')
        for tag, world in (('orglimit_a', world_a), ('orglimit_b', world_b)):
            OrgAssignment.objects.create(
                user=_user(tag), entry_point=world['entry_point'], is_active=True,
            )

        _run('backfill_org_assignment_facility', limit=1)

        assert OrgAssignment.objects.filter(facility__isnull=False).count() == 1

    def test_ambiguous_entry_point_is_skipped(self):
        world = _build_world('A')
        HealthFacility.objects.create(
            code=f'FAC_AMB_{_uid()}', name_ar='منشأة ثانية',
            sector=world['sector'], entry_point=world['entry_point'],
        )
        assignment = OrgAssignment.objects.create(
            user=_user('orgamb'), entry_point=world['entry_point'], is_active=True,
        )

        out = _run('backfill_org_assignment_facility')

        assignment.refresh_from_db()
        assert assignment.facility_id is None
        assert 'ambiguous=1' in out


class TestOtherBackfills:
    def test_healthscreening_backfill_via_port(self):
        world = _build_world('A')
        officer = _user('off')
        country = Country.objects.create(code='SD', name='Sudan', name_ar='السودان')
        traveler = Traveler.objects.create(
            passport_number=f'P{_uid()}', first_name='محمد', last_name='عمر',
            date_of_birth='1990-01-01', nationality=country,
        )
        screening = HealthScreening.objects.create(
            traveler=traveler, port=world['entry_point'], officer=officer,
        )

        _run('backfill_healthscreening_facility')

        screening.refresh_from_db()
        assert screening.facility_id == world['facility'].id

    def test_labsample_backfill_via_entry_point(self):
        world = _build_world('A')
        sample = LabSample.objects.create(
            sample_type='SWAB', source='CLINIC', collector=_user('col'),
            sector=world['sector'], entry_point=world['entry_point'],
        )

        _run('backfill_labsample_facility')

        sample.refresh_from_db()
        assert sample.facility_id == world['facility'].id

    def test_vectorunit_backfill_via_sector(self):
        world = _build_world('A')
        unit = VectorUnit.objects.create(
            code=f'VU_{_uid()}', name_ar='وحدة ترصد',
            kind=VectorUnit.Kind.SURVEILLANCE, sector=world['sector'],
        )

        _run('backfill_vectorunit_facility')

        unit.refresh_from_db()
        assert unit.facility_id == world['facility'].id
