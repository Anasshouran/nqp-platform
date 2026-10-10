"""Shared test helpers for the shipping app.

Permissions are created once per session rather than per test: creating the
same rows inside many concurrently-running test transactions deadlocked on
`accounts_permission` (`accounts_permission_code_key`).
"""
from django.contrib.auth import get_user_model
from django.db import OperationalError, transaction
from rest_framework.test import APIClient

import pytest

from apps.accounts.models import Permission

User = get_user_model()


def ensure_permissions(codes):
    """Create any missing permission rows.

    Must run inside the caller's test transaction: rows created by a previous
    test are rolled back, so a module-level "already done" cache would leave the
    permissions missing for every subsequent test. Instead we check the table
    each time, which is a cheap indexed lookup, and insert only what is absent.

    PostgreSQL aborts a whole transaction on a deadlock/lock timeout, so the
    insert is retried on a fresh savepoint: concurrent fixtures seeding
    overlapping permission sets can otherwise collide on the
    ``accounts_permission_code_key`` unique index and fail the test spuriously.
    """
    missing = [
        code for code in codes
        if not Permission.objects.filter(code=code).exists()
    ]
    if not missing:
        return

    attempts = 4
    for attempt in range(attempts):
        try:
            with transaction.atomic():
                Permission.objects.bulk_create([
                    Permission(
                        code=code,
                        resource=code.partition(':')[0],
                        action=code.partition(':')[2],
                        name=f"{code.partition(':')[2]} {code.partition(':')[0]}",
                    )
                    for code in missing
                ], ignore_conflicts=True)
            return
        except OperationalError:
            if attempt == attempts - 1:
                raise
            # The row set may have been committed by a sibling connection while
            # we were blocked, so re-check before inserting again.
            missing = [
                code for code in missing
                if not Permission.objects.filter(code=code).exists()
            ]
            if not missing:
                return


def perms(codes):
    ensure_permissions(codes)
    return list(Permission.objects.filter(code__in=codes))


def auth(client, user):
    """Log in and attach the bearer token, matching the project's test style."""
    login = client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")


@pytest.fixture
def api_client():
    return APIClient()
