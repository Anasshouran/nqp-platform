from rest_framework.exceptions import APIException

from .handlers import api_exception_handler

__all__ = ['ServiceUnavailable', 'api_exception_handler']


class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = 'Service temporarily unavailable'
    default_code = 'service_unavailable'
