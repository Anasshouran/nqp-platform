"""B2 — reconciliation records may be created/sealed/resolved, never PATCHed or DELETEd."""
import pytest

from apps.finance.models import Reconciliation
from apps.finance.services import create_reconciliation

from .conftest import login, make_user

pytestmark = pytest.mark.django_db

RECONCILIATIONS = '/api/v1/finance/reconciliations/'


@pytest.fixture
def reconciliation():
    creator = make_user('f1-rec-creator@test.sd', national=True)
    return create_reconciliation(
        creator, '2026-02-01', '2026-02-28', 'PAYMENT_GATEWAY', channel_total='0',
    )


def test_patch_reconciliation_is_405(api_client, reconciliation):
    make_user('f1-rec-root@test.sd', superuser=True)
    login(api_client, 'f1-rec-root@test.sd')
    res = api_client.patch(
        f'{RECONCILIATIONS}{reconciliation.id}/',
        {'system_total': '999999999'}, format='json',
    )
    assert res.status_code == 405, res.content
    reconciliation.refresh_from_db()
    assert reconciliation.system_total == 0


def test_delete_reconciliation_is_405(api_client, reconciliation):
    make_user('f1-rec-root2@test.sd', superuser=True)
    login(api_client, 'f1-rec-root2@test.sd')
    res = api_client.delete(f'{RECONCILIATIONS}{reconciliation.id}/')
    assert res.status_code == 405, res.content
    assert Reconciliation.objects.filter(pk=reconciliation.pk).exists()


def test_seal_ignores_client_system_total(api_client, reconciliation):
    """Computed totals come from the service; a forged body value is dropped."""
    sealer = make_user('f1-rec-sealer@test.sd', national=True)
    login(api_client, 'f1-rec-sealer@test.sd')
    original = reconciliation.system_total

    res = api_client.post(
        f'{RECONCILIATIONS}{reconciliation.id}/seal/',
        {'system_total': '999999999', 'channel_total': '0'}, format='json',
    )

    assert res.status_code == 200, res.content
    reconciliation.refresh_from_db()
    assert reconciliation.system_total == original
    assert reconciliation.system_total != 999999999
