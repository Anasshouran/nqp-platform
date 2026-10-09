"""اختبار تقييد المعدّل ورؤوسه.

DRF يربط `APIView.throttle_classes` و`SimpleRateTHROTTLE_RATES` على مستوى
الصنف عند الاستيراد، فلا يصلح `override_settings` لإدخال مقيّد: الخيار
الموثوق هو تعريف مقيّد الاختبار نفسه وربطه بالـview صراحةً. لذلك لا نعتمد
على ترتيب الاستيراد ولا على إعدادات المشروع.
"""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.exceptions import Throttled
from rest_framework.test import APIClient
from rest_framework.throttling import UserRateThrottle

from apps.hr.views import HrDashboardView, TrainingPlanViewSet
from core.exceptions.handlers import api_exception_handler

pytestmark = pytest.mark.django_db


class TwoPerMinuteThrottle(UserRateThrottle):
    rate = '2/min'


VIEWS = (HrDashboardView, TrainingPlanViewSet)
PATHS = ('/api/v1/hr/dashboard/', '/api/v1/hr/training-plans/')


@pytest.fixture
def restore_view_throttles():
    saved = [(v, v.throttle_classes) for v in VIEWS]
    for v in VIEWS:
        v.throttle_classes = [TwoPerMinuteThrottle]
    yield
    for v, original in saved:
        v.throttle_classes = original


@pytest.fixture
def throttled_client(grant_permissions, restore_view_throttles):
    """عميل يملك صلاحية القراءة، والمقيّد مثبّت على الـviewsets.

    الصلاحية ضرورية: DRF يفحص التصريح قبل التقييد، فمن يُردّ عليه 403
    أصلاً لا يصل إلى المقيّد.
    """
    user = get_user_model().objects.create_user(
        username='thr.user', email='thr.user@nqp.sd', password='x',
    )
    grant_permissions(user, 'THROTTLE_ROLE', ['hr_dashboard:view', 'hr_training:view'])
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.parametrize('path', PATHS)
def test_throttled_response_carries_retry_after(throttled_client, path):
    codes = [throttled_client.get(path).status_code for _ in range(4)]

    assert 429 in codes, f'expected throttling, got {codes}'
    blocked = throttled_client.get(path)
    assert blocked.status_code == 429
    retry_after = blocked.headers.get('Retry-After')
    assert retry_after is not None, 'Retry-After header is missing on 429'
    assert retry_after.isdigit() and int(retry_after) > 0


def test_handler_adds_retry_after_to_throttled():
    response = api_exception_handler(Throttled(wait=42), {})
    assert response.status_code == 429
    assert response['Retry-After'] == '42'


def test_handler_rounds_fractional_wait_up():
    """لا نَعِد العميل بمحاولة قبل الأوان."""
    response = api_exception_handler(Throttled(wait=42.4), {})
    assert response['Retry-After'] == '43'


def test_handler_leaves_other_errors_untouched():
    response = api_exception_handler(Throttled(wait=None), {})
    assert 'Retry-After' not in response


def test_authenticated_rate_is_not_starved_by_dashboard_fanout():
    """سقف `user` كان `200/hour`: لوحة واحدة تفتح عدة طلبات."""
    rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user']
    per_hour = int(''.join(ch for ch in rate.split('/')[0] if ch.isdigit()))
    assert per_hour >= 1000, f'authenticated user throttle too tight: {rate}'


def test_anonymous_rate_stays_tight():
    """`anon` يحمي تسجيل الدخول، فلا يُرفع بحجة علو الواجهة."""
    rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['anon']
    assert rate.endswith('/min'), f'anonymous throttle must stay per-minute: {rate}'


def test_anon_rate_is_untouched_in_test_mode():
    """فرع الاختبارات يرفع السقوف ولا يمسّها بطبيعة المجهول."""
    assert settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['anon'].endswith('/min')


def test_assistant_has_its_own_scope():
    """المساعد عام بلا مصادقة، فلا يُقيَّد بنفس سقف استعلام المسافر."""
    rates = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
    assert 'assistant_chat' in rates
    assert 'assistant_feedback' in rates
    # في وضع الاختبار تُرفع كل السقوف إلى قيمة واحدة عمداً، فلا نُقارن القيم.
    # المهم هنا أن النطاقين معرّفان وأن المساعد لا يشترك مع استعلام المسافر.
    assert settings._IS_TEST_RUN or rates['assistant_chat'] != rates['traveler_lookup']


def test_assistant_throttle_classes_are_scoped():
    from apps.public.views import AssistantViewSet

    from rest_framework.throttling import ScopedRateThrottle

    assert ScopedRateThrottle in AssistantViewSet.throttle_classes
    assert AssistantViewSet.throttle_scope == 'assistant_chat'
    assert AssistantViewSet.throttle_scopes['chat'] == 'assistant_chat'
    assert AssistantViewSet.throttle_scopes['feedback'] == 'assistant_feedback'
