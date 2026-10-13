"""Login throttle: 429 after the configured rate, on both IP and identifier.

Follows the pattern from hr/tests/test_throttle.py: bind a tight custom
throttle to the view via a fixture that restores throttle_classes.
"""
from __future__ import annotations

import pytest
from django.core.cache import caches
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.views import AuthViewSet
from apps.accounts.throttles import LoginIPThrottle, LoginUserThrottle


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    caches["throttle"].clear()
    yield
    caches["throttle"].clear()


def _post(client: APIClient, url: str, ident: str, password: str = "wrong-pass"):
    return client.post(
        url,
        {"identifier": ident, "password": password},
        format="json",
        REMOTE_ADDR="10.0.0.7",
    )


class LoginIPTestThrottle(LoginIPThrottle):
    rate = "5/min"


class LoginUserTestThrottle(LoginUserThrottle):
    rate = "1000/hour"


@pytest.fixture
def throttled_login_view():
    """Attach tight test throttles to AuthViewSet.login."""
    original = AuthViewSet.throttle_classes
    AuthViewSet.throttle_classes = [LoginIPTestThrottle, LoginUserTestThrottle]
    yield
    AuthViewSet.throttle_classes = original


class LoginIPTestThrottle2(LoginIPThrottle):
    rate = "1000/min"


class LoginUserTestThrottle2(LoginUserThrottle):
    rate = "3/min"


@pytest.fixture
def throttled_login_user_view():
    """Attach tight user throttle, loose IP throttle."""
    original = AuthViewSet.throttle_classes
    AuthViewSet.throttle_classes = [LoginIPTestThrottle2, LoginUserTestThrottle2]
    yield
    AuthViewSet.throttle_classes = original


class LoginIPTestThrottle3(LoginIPThrottle):
    rate = "2/min"


class LoginUserTestThrottle3(LoginUserThrottle):
    rate = "1000/hour"


@pytest.fixture
def throttled_login_retry_view():
    original = AuthViewSet.throttle_classes
    AuthViewSet.throttle_classes = [LoginIPTestThrottle3, LoginUserTestThrottle3]
    yield
    AuthViewSet.throttle_classes = original


@pytest.mark.django_db
def test_login_ip_throttle_returns_429_after_limit(throttled_login_view):
    url = reverse("auth-login")
    client = APIClient()
    statuses = [_post(client, url, "throttle-test@example.com").status_code for _ in range(7)]

    assert statuses[0] != 429, "first request must not be throttled"
    assert 429 in statuses, f"expected 429, got {statuses}"
    assert statuses[-1] == 429


@pytest.mark.django_db
def test_login_user_throttle_is_per_identifier(throttled_login_user_view):
    url = reverse("auth-login")
    client = APIClient()
    for _ in range(3):
        assert _post(client, url, "bucket-a@example.com").status_code != 429
    assert _post(client, url, "bucket-a@example.com").status_code == 429

    # Different identifier from same IP should still work (different bucket)
    assert _post(client, url, "bucket-b@example.com").status_code != 429


@pytest.mark.django_db
def test_throttle_returns_retry_after_header(throttled_login_retry_view):
    url = reverse("auth-login")
    client = APIClient()
    _post(client, url, "hdr@example.com")
    _post(client, url, "hdr@example.com")
    r = _post(client, url, "hdr@example.com")
    assert r.status_code == 429

    ra = r.headers.get("Retry-After")
    assert ra is not None, "Retry-After header is missing on 429"
    assert ra.isdigit() and int(ra) > 0