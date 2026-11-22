"""F4b — server-side reconciliation totals endpoint.

Verifies counts per status, the stable zero-default contract, permission
fail-closed (403), and scope fail-closed (200 with all zeros).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.finance.models import Reconciliation, ReconciliationChannel, ReconciliationStatus

from .conftest import make_user

pytestmark = pytest.mark.django_db

TOTALS_URL = '/api/v1/finance/reconciliations/totals/'
User = get_user_model()


def _recon(status, **kw):
    today = timezone.now().date()
    defaults = dict(
        period_start=today,
        period_end=today,
        channel=ReconciliationChannel.BANK,
        system_total=Decimal('0'),
        channel_total=Decimal('0'),
        difference=Decimal('0'),
        status=status,
    )
    defaults.update(kw)
    return Reconciliation.objects.create(**defaults)


def test_totals_counts_per_status(api_client):
    national = make_user('f4b-national@test.sd', national=True)
    _recon(ReconciliationStatus.DRAFT)
    _recon(ReconciliationStatus.DRAFT)
    _recon(ReconciliationStatus.MATCHED)
    _recon(ReconciliationStatus.RESOLVED)

    api_client.force_authenticate(national)
    res = api_client.get(TOTALS_URL)

    assert res.status_code == 200, res.content
    data = res.json()['data']
    assert data == {
        'DRAFT': 2,
        'MATCHED': 1,
        'DISCREPANCY': 0,
        'RESOLVED': 1,
    }


def test_totals_empty_returns_all_zeros(api_client):
    national = make_user('f4b-empty@test.sd', national=True)
    api_client.force_authenticate(national)
    res = api_client.get(TOTALS_URL)

    assert res.status_code == 200, res.content
    assert res.json()['data'] == {s: 0 for s in ReconciliationStatus.values}


def test_totals_requires_finance_reports_permission(api_client):
    """No finance:reports grant → 403 from PermissionAction (fail-closed)."""
    no_perm = User.objects.create_user(
        email='f4b-noperm@test.sd', password='Str0ngPass!23', full_name='No perm',
    )
    api_client.force_authenticate(no_perm)
    res = api_client.get(TOTALS_URL)

    assert res.status_code == 403, res.content


def test_totals_unscoped_user_sees_zeros(api_client):
    """finance:reports granted but no port scope → qs.none() → all zeros."""
    national = make_user('f4b-owner@test.sd', national=True)
    _recon(ReconciliationStatus.MATCHED)  # visible to national only

    unscoped = make_user('f4b-unscoped@test.sd')  # permissions, no RoleAssignment
    api_client.force_authenticate(unscoped)
    res = api_client.get(TOTALS_URL)

    assert res.status_code == 200, res.content
    assert res.json()['data'] == {s: 0 for s in ReconciliationStatus.values}
