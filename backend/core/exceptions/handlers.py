"""معالج استثناءات يضيف ترويسة `Retry-After` عند التقييد.

DRF يلتقط `Throttled` ويردّ 429 بنصّ إنجليزي داخل `detail` فقط، فتفقد
الواجهة ability عن معرفة متى تُعيد المحاولة إلا بتحليل نصّ. `Throttled` يحمل
`wait` بالثواني، فنحوّله إلى ترويسة HTTP قياسية يقرأها أي عميل.
"""

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    wait = getattr(exc, 'wait', None)
    if response.status_code == 429 and isinstance(wait, (int, float)) and wait > 0:
        # تقريب للأعلى: لا نَعِد العميل بمحاولة قبل الأوان.
        response['Retry-After'] = str(int(wait) + (1 if wait % 1 else 0))
    return response
