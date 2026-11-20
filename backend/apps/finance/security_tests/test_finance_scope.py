"""B1 — IDOR / PII leak: port scoping is enforced fail-closed on every finance list."""
import pytest

from apps.finance.models import InvoiceStatus
from apps.finance.services import confirm_payment

from .conftest import login, make_invoice, make_user

pytestmark = pytest.mark.django_db

INVOICES = '/api/v1/finance/invoices/'
RECEIPTS = '/api/v1/finance/receipts/'


def _ids(response):
    return {row['id'] for row in response.json()['data']['results']}


def test_port_scoped_user_sees_only_his_port(api_client, two_ports):
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-1@test.sd', national=True)
    inv_a = make_invoice(port_a, 'INV-F1-S1-A', issuer)
    make_invoice(port_b, 'INV-F1-S1-B', issuer)

    make_user('f1-acct-1@test.sd', port=port_a)
    login(api_client, 'f1-acct-1@test.sd')
    res = api_client.get(INVOICES)

    assert res.status_code == 200, res.content
    assert _ids(res) == {str(inv_a.id)}


def test_user_without_scope_sees_nothing(api_client, two_ports):
    """No scope ≠ national: an unscoped accountant gets zero rows."""
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-2@test.sd', national=True)
    make_invoice(port_a, 'INV-F1-S2-A', issuer)
    make_invoice(port_b, 'INV-F1-S2-B', issuer)

    make_user('f1-acct-noscope@test.sd')  # permissions, but no RoleAssignment
    login(api_client, 'f1-acct-noscope@test.sd')
    res = api_client.get(INVOICES)

    assert res.status_code == 200, res.content
    assert _ids(res) == set()


def test_superuser_sees_all_ports(api_client, two_ports):
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-3@test.sd', national=True)
    inv_a = make_invoice(port_a, 'INV-F1-S3-A', issuer)
    inv_b = make_invoice(port_b, 'INV-F1-S3-B', issuer)

    make_user('f1-root@test.sd', superuser=True)
    login(api_client, 'f1-root@test.sd')
    res = api_client.get(INVOICES)

    assert res.status_code == 200, res.content
    assert _ids(res) == {str(inv_a.id), str(inv_b.id)}


def test_global_scope_non_superuser_sees_all_ports(api_client, two_ports):
    """GLOBAL scope ≠ superuser: a national (non-staff) actor stays unrestricted."""
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-global@test.sd', national=True)
    inv_a = make_invoice(port_a, 'INV-F1-GLOBAL-A', issuer)
    inv_b = make_invoice(port_b, 'INV-F1-GLOBAL-B', issuer)

    national = make_user('f1-global-viewer@test.sd', national=True)
    assert national.is_superuser is False and national.is_staff is False
    login(api_client, 'f1-global-viewer@test.sd')
    res = api_client.get(INVOICES)

    assert res.status_code == 200, res.content
    assert _ids(res) == {str(inv_a.id), str(inv_b.id)}


def test_other_port_pii_not_exposed_in_list_or_detail(api_client, two_ports):
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-4@test.sd', national=True)
    make_invoice(port_a, 'INV-F1-S4-A', issuer)
    foreign = make_invoice(
        port_b, 'INV-F1-S4-B', issuer,
        applicant='سرّي من المنفذ ب', id_number='9999999999', phone='+249999999999',
    )

    make_user('f1-acct-4@test.sd', port=port_a)
    login(api_client, 'f1-acct-4@test.sd')

    listing = api_client.get(INVOICES)
    assert '9999999999' not in listing.content.decode()
    detail = api_client.get(f'{INVOICES}{foreign.id}/')
    assert detail.status_code in (403, 404), detail.content
    assert '9999999999' not in detail.content.decode()


def test_print_receipt_respects_port_scope(api_client, two_ports):
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-5@test.sd', national=True)
    foreign = make_invoice(
        port_b, 'INV-F1-S5-B', issuer, status=InvoiceStatus.PENDING_PAYMENT,
        applicant='سرّي من المنفذ ب', id_number='8888888888', phone='+249888888888',
    )
    _, _, receipt = confirm_payment(foreign, issuer, 'CASH')

    make_user('f1-acct-5@test.sd', port=port_a)
    login(api_client, 'f1-acct-5@test.sd')
    res = api_client.get(f'{RECEIPTS}{receipt.id}/print/')

    assert res.status_code in (403, 404), res.content
    blob = res.content.decode()
    assert '8888888888' not in blob
    assert '+249888888888' not in blob


def test_sector_param_outside_scope_is_rejected(api_client, two_ports):
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-6@test.sd', national=True)
    make_invoice(port_a, 'INV-F1-S6-A', issuer)
    make_invoice(port_b, 'INV-F1-S6-B', issuer)

    make_user('f1-acct-6@test.sd', port=port_a)
    login(api_client, 'f1-acct-6@test.sd')
    res = api_client.get(INVOICES, {'sector': str(port_b.sector_id)})

    assert res.status_code == 403, res.content


def test_national_report_is_scoped_to_user_port(api_client, two_ports):
    """`national` has no separate permission, so it must be scoped like the rest."""
    port_a, port_b = two_ports['ports']
    issuer = make_user('f1-issuer-7@test.sd', national=True)
    make_invoice(port_a, 'INV-F1-S7-A', issuer, status=InvoiceStatus.PAID)
    make_invoice(port_b, 'INV-F1-S7-B', issuer, status=InvoiceStatus.PAID)

    make_user('f1-acct-7@test.sd', port=port_a)
    login(api_client, 'f1-acct-7@test.sd')
    res = api_client.get('/api/v1/finance/reports/national/')

    assert res.status_code == 200, res.content
    payload = res.json()['data']
    # الشجرة: {قطاع: {منفذ: {خدمة: ...}}} — نفحص النص كله لا المفتاح الأعلى فقط.
    blob = str(payload)
    assert 'منفذ أ' in blob
    assert 'منفذ ب' not in blob
