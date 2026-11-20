"""Shared fixtures for the finance PR-F1 security suites.

Each helper is deliberately explicit about scopes so the fail-closed rules are
testable: PORT scope, GLOBAL scope, no scope at all, and superuser.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Permission, Role, RoleAssignment
from apps.finance.models import Invoice, InvoiceSource, InvoiceStatus
from apps.food_quarantine.models import FoodShipment
from apps.masterdata.models import EntryPoint, Sector as SectorType, State
from apps.organization.models import Sector

User = get_user_model()
PASSWORD = 'Str0ngPass!23'
FINANCE_ACTIONS = ('reports', 'collect', 'review', 'cancel_refund', 'audit', 'fee_manage')


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def two_ports():
    """Two unrelated administrative sectors, each with one entry point."""
    s1 = Sector.objects.create(code='F1-SEC-A', name_ar='قطاع أ')
    s2 = Sector.objects.create(code='F1-SEC-B', name_ar='قطاع ب')
    t1 = SectorType.objects.create(code='F1-TYPE-A', name_ar='نوع أ')
    t2 = SectorType.objects.create(code='F1-TYPE-B', name_ar='نوع ب')
    st1 = State.objects.create(code='F1-STA-A', name_ar='ولاية أ', sector=t1)
    st2 = State.objects.create(code='F1-STA-B', name_ar='ولاية ب', sector=t2)
    p1 = EntryPoint.objects.create(
        code='F1-EP-A', name_ar='منفذ أ', kind=EntryPoint.Kind.SEAPORT,
        state=st1, sector=s1,
    )
    p2 = EntryPoint.objects.create(
        code='F1-EP-B', name_ar='منفذ ب', kind=EntryPoint.Kind.SEAPORT,
        state=st2, sector=s2,
    )
    return {'sectors': (s1, s2), 'ports': (p1, p2)}


def make_user(email, *, port=None, national=False, superuser=False, actions=FINANCE_ACTIONS):
    """Create a user with finance permissions and an explicit scope shape.

    port=None and national=False means **no assignment** (empty scope → deny).
    """
    user = User.objects.create_user(
        email=email, password=PASSWORD, full_name=email,
        is_superuser=superuser, is_staff=superuser,
    )
    if superuser:
        return user

    role, _ = Role.objects.get_or_create(
        code='F1-FINANCE-TESTER',
        defaults={'name': 'Finance F1 tester', 'default_scope': 'PORT'},
    )
    for action in actions:
        perm, _ = Permission.objects.get_or_create(
            code=f'finance:{action}',
            defaults={'name': action, 'resource': 'finance', 'action': action},
        )
        role.permissions.add(perm)

    if national:
        RoleAssignment.objects.create(
            user=user, role=role, scope_type=RoleAssignment.ScopeType.GLOBAL,
            scope_id=None, is_active=True,
        )
    elif port is not None:
        RoleAssignment.objects.create(
            user=user, role=role, scope_type=RoleAssignment.ScopeType.PORT,
            scope_id=port.id, is_active=True,
        )
    else:
        # Permission via extra_permissions, but deliberately no scope assignment.
        for action in actions:
            perm, _ = Permission.objects.get_or_create(
                code=f'finance:{action}',
                defaults={'name': action, 'resource': 'finance', 'action': action},
            )
            user.extra_permissions.add(perm)
    return user


def login(api_client, email):
    res = api_client.post(
        '/api/v1/auth/login/', {'email': email, 'password': PASSWORD}, format='json',
    )
    assert res.status_code == 200, res.content
    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {res.data['data']['access_token']}"
    )
    return res


def make_invoice(port, number, issuer, *, applicant='أحمد', id_number='1000000001',
                 phone='+249100000001', status=InvoiceStatus.ISSUED):
    shipment = FoodShipment.objects.create(
        manifest_number=f'MAN-{number}',
        port=port,
        supplier_name='مورد اختبار',
        origin_country='Egypt',
        arrival_date='2026-01-15',
        shipment_type=FoodShipment.ShipmentType.IMPORT,
    )
    return Invoice.objects.create(
        invoice_number=number,
        source_type=InvoiceSource.FOOD_SHIPMENT,
        food_shipment=shipment,
        applicant_name=applicant,
        applicant_id_number=id_number,
        applicant_phone=phone,
        items=[],
        gross_amount='100.00',
        net_amount='100.00',
        currency='SDG',
        status=status,
        issued_by=issuer,
    )
