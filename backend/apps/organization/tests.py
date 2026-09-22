import pytest
from django.contrib.auth import get_user_model

from apps.organization.models import (
    Department,
    Locality,
    OrgAssignment,
    OrgPosition,
    Sector,
    Station,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def sector():
    return Sector.objects.create(code='RED-SEA', name_ar='البحر الأحمر')


@pytest.fixture
def user():
    return User.objects.create_user(
        email='org@test.sd', password='StrongPass123!', full_name='موظف تنظيمي'
    )


def test_sector_creation(sector):
    assert sector.pk is not None
    assert str(sector) == 'البحر الأحمر'


def test_sector_unique_code():
    Sector.objects.create(code='KH', name_ar='الخرطوم')
    with pytest.raises(Exception):
        Sector.objects.create(code='KH', name_ar='مكرر')


def test_locality(sector):
    loc = Locality.objects.create(
        code='KH-C', name_ar='الخرطوم بحري', sector=sector
    )
    assert loc.pk is not None
    assert loc in sector.localities.all()
    assert str(loc) == 'الخرطوم بحري'


def test_department(sector):
    dept = Department.objects.create(
        code='FOOD', name_ar='الأغذية', sector=sector
    )
    assert dept.pk is not None
    assert dept in sector.departments.all()


def test_department_unique_code():
    Department.objects.create(code='LAB', name_ar='المعمل')
    with pytest.raises(Exception):
        Department.objects.create(code='LAB', name_ar='معمل آخر')


def test_station(sector):
    station = Station.objects.create(
        code='KRT-1', name_ar='محطة الخرطوم', sector=sector
    )
    assert station.pk is not None
    assert station in sector.stations.all()


def test_org_position():
    pos = OrgPosition.objects.create(
        code='DIR', name_ar='مدير عام', level=1
    )
    assert pos.pk is not None
    assert str(pos) == 'مدير عام'


def test_org_position_unique_code():
    OrgPosition.objects.create(code='SEC', name_ar='سكرتير')
    with pytest.raises(Exception):
        OrgPosition.objects.create(code='SEC', name_ar='كرر')


def test_org_assignment(user, sector):
    assignment = OrgAssignment.objects.create(
        user=user, sector=sector, is_primary=True
    )
    assert assignment.pk is not None
    assert assignment in user.org_assignments.all()
