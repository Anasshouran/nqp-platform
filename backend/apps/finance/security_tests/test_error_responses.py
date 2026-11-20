"""B3 — DRF actions must return Response objects (4xx), never bare dicts (500)."""
import pytest

from apps.finance.models import Fee

from .conftest import login, make_user

pytestmark = pytest.mark.django_db


def test_preview_without_permission_is_403_not_500(api_client):
    make_user('f1-noperm@test.sd', actions=())
    login(api_client, 'f1-noperm@test.sd')
    res = api_client.get('/api/v1/finance/reconciliations/preview/')
    assert res.status_code == 403, res.content
    assert res.status_code != 500


def test_preview_with_missing_params_is_400_not_500(api_client):
    make_user('f1-permitted@test.sd', national=True)
    login(api_client, 'f1-permitted@test.sd')
    res = api_client.get('/api/v1/finance/reconciliations/preview/')
    assert res.status_code == 400, res.content
    assert res.status_code != 500


def test_fee_destroy_returns_200_and_deactivates(api_client):
    fee = Fee.objects.create(
        code='F1-FEE-1', name_ar='رسم اختبار', service_type='INSPECTION',
        amount_sdg='10.00', effective_from='2026-01-01', is_active=True,
    )
    make_user('f1-fee-root@test.sd', superuser=True)
    login(api_client, 'f1-fee-root@test.sd')

    res = api_client.delete(f'/api/v1/finance/fees/{fee.id}/')

    assert res.status_code == 200, res.content
    assert 'detail' in res.json()['data']
    fee.refresh_from_db()
    assert fee.is_active is False
