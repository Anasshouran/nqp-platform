"""T-7/T-8: اختبارات فحص التناسق والبذر."""

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.masterdata.models import HealthFacility, Sector as MasterSector, State
from apps.organization.models import Locality, Sector as OrgSector


@pytest.fixture
def master_sector():
    return MasterSector.objects.create(
        code="TST_SEC2", name_ar="قطاع اختبار 2"
    )


@pytest.fixture
def org_sector_a():
    return OrgSector.objects.create(
        code="TST_ORG_A", name_ar="قطاع منظمة A"
    )


@pytest.fixture
def org_sector_b():
    return OrgSector.objects.create(
        code="TST_ORG_B", name_ar="قطاع منظمة B"
    )


@pytest.fixture
def locality_in_a(org_sector_a):
    return Locality.objects.create(
        code="TST_LOC", name_ar="محلية اختبار", sector=org_sector_a
    )


@pytest.mark.django_db
class TestConsistencyCheck:
    def test_mismatch_exits_with_code_1(self, org_sector_b, locality_in_a, master_sector, org_sector_a):
        # منشأة: locality في قطاع A لكن facility.sector = قطاع B → تناقض
        HealthFacility.objects.create(
            code="TST_FAC", name_ar="منشأة اختبار",
            kind="HEALTH_CENTER",
            locality=locality_in_a,
            sector=org_sector_b,
        )
        with pytest.raises(SystemExit) as exc:
            call_command("check_facility_consistency")
        assert exc.value.code == 1

    def test_no_data_exits_with_code_0(self):
        with pytest.raises(SystemExit) as exc:
            call_command("check_facility_consistency")
        assert exc.value.code == 0


@pytest.mark.django_db
class TestConsistencyEntryPoint:
    """D-4: تغطية الفحصين المتبقيين — entry_point related."""

    def _setup_base(self):
        """ينشئ قطاعين مختلفين + state + locality + entry_point + facility."""
        import uuid
        def _uid():
            return uuid.uuid4().hex[:8]

        md_sector1 = MasterSector.objects.create(code=f'MS1_{_uid()}', name_ar='نقل 1')
        md_sector2 = MasterSector.objects.create(code=f'MS2_{_uid()}', name_ar='نقل 2')
        state = State.objects.create(code=f'ST_{_uid()}', name_ar='ولاية', sector=md_sector1)

        org_sector1 = OrgSector.objects.create(code=f'OS1_{_uid()}', name_ar='قطاع 1')
        org_sector2 = OrgSector.objects.create(code=f'OS2_{_uid()}', name_ar='قطاع 2')

        locality = Locality.objects.create(code=f'LOC_{_uid()}', name_ar='محلية', sector=org_sector1)

        from apps.masterdata.models import EntryPoint
        entry_point = EntryPoint.objects.create(
            code=f'EP_{_uid()}', name_ar='منفذ',
            state=state, sector=org_sector1, locality=locality,
        )
        return {
            'org_sector1': org_sector1, 'org_sector2': org_sector2,
            'locality': locality, 'entry_point': entry_point, 'state': state,
        }

    def test_entry_point_sector_mismatch_detected(self):
        """entry_point.sector != facility.sector → exit 1."""
        import uuid

        def _uid():
            return uuid.uuid4().hex[:8]

        base = self._setup_base()
        # facility.sector = قطاع 2، entry_point.sector = قطاع 1
        HealthFacility.objects.create(
            code=f'FAC_{_uid()}', name_ar='منشأة',
            sector=base['org_sector2'],
            locality=base['locality'],
            entry_point=base['entry_point'],
        )
        with pytest.raises(SystemExit) as exc:
            call_command('check_facility_consistency')
        assert exc.value.code == 1

    def test_locality_entry_point_sector_mismatch_detected(self):
        """locality.sector != entry_point.sector → exit 1."""
        import uuid

        def _uid():
            return uuid.uuid4().hex[:8]

        base = self._setup_base()
        # entry_point.sector = قطاع 1، لكن نغير locality.sector إلى قطاع 2
        base['locality'].sector = base['org_sector2']
        base['locality'].save()
        HealthFacility.objects.create(
            code=f'FAC2_{_uid()}', name_ar='منشأة 2',
            sector=base['org_sector2'],
            locality=base['locality'],
            entry_point=base['entry_point'],
        )
        with pytest.raises(SystemExit) as exc:
            call_command('check_facility_consistency')
        assert exc.value.code == 1


@pytest.mark.django_db
class TestSeedIdempotency:
    @override_settings(DEBUG=True)
    def test_seed_twice_same_count(self, master_sector, org_sector_a):
        today = None
        from django.utils import timezone
        today = timezone.localdate()

        # تشغيل البذر مرتين
        call_command("seed_registry_testdata")
        count1 = HealthFacility.objects.count()
        call_command("seed_registry_testdata")
        count2 = HealthFacility.objects.count()
        assert count1 == count2

    @override_settings(DEBUG=False)
    def test_seed_refuses_in_production_mode(self):
        with pytest.raises(Exception) as exc:
            call_command("seed_registry_testdata")
        assert "Refuses" in str(exc.value) or "non-DEBUG" in str(exc.value)
