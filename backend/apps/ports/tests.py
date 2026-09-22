import pytest

from apps.organization.models import Sector as OrgSector
from apps.ports.models import Port
from apps.travelers.models import Country

pytestmark = pytest.mark.django_db


@pytest.fixture
def country():
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def sector():
    return OrgSector.objects.create(code='RED-SEA', name_ar='البحر الأحمر')


def test_port_creation(country, sector):
    port = Port.objects.create(
        code='PSD',
        name_ar='ميناء بورتسودان',
        name_en='Port Sudan Port',
        type=Port.PortType.SEAPORT,
        country=country,
        sector=sector,
    )
    assert port.pk is not None
    assert str(port) == 'PSD - ميناء بورتسودان'
    assert port.pk
    assert port.phone == ''


def test_port_unique_code(country):
    Port.objects.create(
        code='KRT', name_ar='مطار الخرطوم', type=Port.PortType.AIRPORT, country=country
    )
    with pytest.raises(Exception):
        Port.objects.create(
            code='KRT', name_ar='مطار آخر', type=Port.PortType.AIRPORT, country=country
        )


def test_port_sector_related_name(country, sector):
    port = Port.objects.create(
        code='OSM', name_ar='ميناء أوسيف', type=Port.PortType.SEAPORT, country=country, sector=sector
    )
    assert port in sector.legacy_ports.all()


def test_model_module_importable():
    import importlib

    assert importlib.util.find_spec('apps.ports.models') is not None