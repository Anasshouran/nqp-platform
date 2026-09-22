from rest_framework.filters import BaseFilterBackend


class ExactFilterBackend(BaseFilterBackend):
    """Applies exact-match query filters declared on the viewset.

    Viewsets declare `filter_fields = ['status', 'port']` and the frontend
    can then pass `?status=COMPLETED` etc. Values that are absent or blank
    are ignored. Complements DRF's built-in `SearchFilter` (fuzzy text
    search via `?search=`) and `OrderingFilter` (via `?ordering=`).
    """

    def filter_queryset(self, request, queryset, view):
        filter_fields = getattr(view, 'filter_fields', None) or []
        query = {}
        for field in filter_fields:
            value = request.query_params.get(field)
            if value in (None, ''):
                continue
            # Coerce boolean query params (?is_active=true) to Python bools so
            # they can be used against BooleanFields.
            if value.lower() in ('true', '1'):
                value = True
            elif value.lower() in ('false', '0'):
                value = False
            # Support multi-value filters via comma-separated values → field__in
            # (single values behave exactly as exact-match, preserving backward compat).
            parts = [p for p in str(value).split(',') if p]
            if len(parts) > 1:
                query[f'{field}__in'] = parts
            else:
                query[field] = value if isinstance(value, bool) else parts[0]
        if not query:
            return queryset
        return queryset.filter(**query)
