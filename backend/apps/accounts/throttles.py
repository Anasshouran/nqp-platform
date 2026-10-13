"""Login-specific throttles.

Two scopes:

* ``login``      → per client IP (``get_ident``).
* ``login_user`` → per login identifier (email / phone / national_id).

Both use the dedicated ``throttle`` cache alias (Redis in production) so
counters are shared across gunicorn workers. ``CACHES['default']`` is left
untouched.

Keying on *both* axes means a distributed spray from a single IP against many
accounts — or many IPs against a single account — is still limited by the
other scope. The identifier is read from the request body, since the login
endpoint is anonymous.
"""

from __future__ import annotations

from typing import Any, Optional

from django.core.cache import caches
from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle

#: Body fields that may carry the login identifier, in priority order.
_IDENTIFIER_FIELDS = ('identifier', 'email', 'phone', 'national_id', 'username')


class _LoginBaseThrottle(SimpleRateThrottle):
    """Shared base: both login scopes live in the dedicated ``throttle`` cache."""

    cache = caches['throttle']

    def get_cache_key(self, request: Request, view: Any) -> Optional[str]:
        raise NotImplementedError


class LoginIPThrottle(_LoginBaseThrottle):
    """``login`` — rate-limit login attempts per client IP."""

    scope = 'login'

    def get_cache_key(self, request: Request, view: Any) -> str:
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginUserThrottle(_LoginBaseThrottle):
    """``login_user`` — rate-limit login attempts per identifier.

    Falls back to an IP-derived key when the body carries no identifier, so
    empty probes still count (against the caller's IP) rather than escaping
    both buckets.
    """

    scope = 'login_user'

    def get_cache_key(self, request: Request, view: Any) -> str:
        ident = ''
        try:
            data = request.data
            for field in _IDENTIFIER_FIELDS:
                value = data.get(field)
                if value:
                    ident = str(value).strip().lower()
                    break
        except Exception:
            ident = ''

        if not ident:
            ident = f'anon:{self.get_ident(request)}'

        return self.cache_format % {'scope': self.scope, 'ident': ident}