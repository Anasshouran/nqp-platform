import pytest
from django.contrib.auth import get_user_model

from apps.it_management.models import (
    GovernmentIntegration,
    ITAsset,
    ItSystem,
    NetworkStatus,
    SupportTicket,
)
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.organization.models import Sector as OrgSector

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def org_sector():
    return OrgSector.objects.create(code='RED-SEA', name_ar='البحر الأحمر')


@pytest.fixture
def entry_point():
    ms = MasterSector.objects.create(code='SEA', name_ar='البحري')
    state = State.objects.create(code='RS', name_ar='البحر الأحمر', sector=ms)
    return EntryPoint.objects.create(
        code='PSD', name_ar='بورتسودان', kind=EntryPoint.Kind.SEAPORT, state=state
    )


def test_it_system(org_sector):
    system = ItSystem.objects.create(
        code='CLEARANCE', name='Clearance System', name_ar='نظام الفسح', sector=org_sector
    )
    assert system.pk is not None
    assert system.status == ItSystem.Status.ONLINE
    assert str(system) == 'نظام الفسح'


def test_it_asset_unique_serial(org_sector):
    ITAsset.objects.create(name='حاسب 1', serial_number='SN-001', sector=org_sector)
    with pytest.raises(Exception):
        ITAsset.objects.create(name='حاسب 2', serial_number='SN-001', sector=org_sector)


def test_support_ticket_autonumber(org_sector, entry_point):
    creator = User.objects.create_user(
        email='it@nqp.gov.sd', password='StrongPass123!', full_name='مسؤول تقنية'
    )
    ticket = SupportTicket.objects.create(
        subject='شبكة مقطوعة', description='لا يوجد اتصال', sector=org_sector,
        entry_point=entry_point, created_by=creator,
    )
    assert ticket.ticket_no.startswith('TKT-')
    assert ticket.status == SupportTicket.Status.OPEN


def test_network_status(org_sector, entry_point):
    net = NetworkStatus.objects.create(
        entry_point=entry_point, connected=True, ping_ms=12, sector=org_sector
    )
    assert str(net) == f'{entry_point.name_ar} — متصل'


def test_government_integration():
    integration = GovernmentIntegration.objects.create(
        code='MOH', name_ar='وزارة الصحة', name_en='Ministry of Health'
    )
    assert integration.pk is not None
    assert integration.status == GovernmentIntegration.Status.CONNECTED