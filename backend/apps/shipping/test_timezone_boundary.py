"""اختبار انحدار لحدود UTC/الخرطوم: تواريخ «اليوم» تُحسب بتوقيت الخرطوم لا UTC.

يكشف هذا الاختبار التراجعات التي تعيد production code إلى
`timezone.now().date()` (UTC) بدل `timezone.localdate()` (Africa/Khartoum)،
وهو الفرق الذي كان يسبّب تقلّبات الاختبارات بين 22:00 و00:00 UTC.
"""
from datetime import date, datetime
from datetime import timezone as dt_timezone
from unittest import mock

import pytest

from apps.carriers.models import Carrier
from apps.shipping.models import ShippingAgent, ShippingAgentStatus

pytestmark = pytest.mark.django_db

# 2026-10-14T22:30Z = 2026-10-15T00:30 في توقيت الخرطوم (UTC+2).
_BOUNDARY = datetime(2026, 10, 14, 22, 30, tzinfo=dt_timezone.utc)
_KHARTOUM_DAY = date(2026, 10, 15)


def test_shipping_agent_is_valid_uses_khartoum_day_at_utc_boundary():
    carrier = Carrier.objects.create(name='خط ملاحي', iata_code='XX1', icao_code='XXX')
    agent = ShippingAgent.objects.create(
        company=carrier,
        name='وكيل حدودي',
        status=ShippingAgentStatus.ACTIVE,
        is_active=True,
        valid_from=_KHARTOUM_DAY,
        valid_until=_KHARTOUM_DAY,
    )
    with mock.patch('django.utils.timezone.now', return_value=_BOUNDARY):
        # قبل الإصلاح كان is_valid يستخدم timezone.now().date() = 2026-10-14 (UTC)
        # فيعتبر الوكيل غير ساري رغم أنه سارٍ في تاريخ الخرطوم.
        assert agent.is_valid() is True
