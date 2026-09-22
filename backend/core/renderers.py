from rest_framework.renderers import JSONRenderer


class EnvelopeRenderer(JSONRenderer):
    """Wraps all successful API responses in the `{status, data}` envelope.

    Responses that already carry a `status` field (manual `success_response`
    / `error_response` dicts) are passed through untouched.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if renderer_context is None:
            return super().render(data, accepted_media_type, renderer_context)
        status_code = renderer_context['response'].status_code
        if status_code == 204:
            return b''
        if 200 <= status_code < 300:
            if not (isinstance(data, dict) and data.get('status') in ('success', 'error')):
                data = {'status': 'success', 'data': data}
        return super().render(data, accepted_media_type, renderer_context)
