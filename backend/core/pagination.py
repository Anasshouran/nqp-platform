from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Shared pagination with configurable page size (used by all list endpoints).

    Supports `?page=` and `?page_size=` (capped at 500) so the frontend can
    request larger pages for exports and server-side pagination.
    """

    page_size_query_param = 'page_size'
    max_page_size = 500
