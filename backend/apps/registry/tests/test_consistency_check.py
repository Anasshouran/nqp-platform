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
