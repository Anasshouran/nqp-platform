"""Thread-local storage for the current request user.

Used by Registry signals to attribute changes to a user.
Uses contextvars (async-safe).
"""
import contextvars

_current_user = contextvars.ContextVar('current_user', default=None)


class CurrentUserMiddleware:
    """Sets the current request user in thread-local/context storage."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = _current_user.set(
            request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        )
        try:
            response = self.get_response(request)
        finally:
            _current_user.reset(token)
        return response


def get_current_user():
    """Returns the current request user or None."""
    return _current_user.get()
