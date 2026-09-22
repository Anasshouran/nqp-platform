"""أدوات إنشاء والتحقق من حمولة رمز QR الرسمية للمسافرين.

الرقم موقّع بـ HMAC-SHA256 باستخدام SECRET_KEY لضمان عدم إمكانية تزويره،
وهو التنسيق الذي تصدره بوابة المسافرين وتتحقق منه المنافذ والجهات العامة.
"""

from __future__ import annotations

import hashlib
import hmac
import json

from django.conf import settings
from django.utils import timezone

QR_TTL_HOURS = 24
QR_VALIDITY_DAYS = 90


def sign_payload(payload: dict) -> str:
    """توقيع حمولة QR عبر HMAC-SHA256 مع مفتاح المنصة."""
    message = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def make_qr_payload(traveler) -> dict:
    """إنشاء حمولة QR موقّعة لمسافر معيّن."""
    issued_at = timezone.now()
    expires_at = issued_at + timezone.timedelta(hours=QR_TTL_HOURS)
    payload = {
        'traveler_id': str(traveler.id),
        'passport_hash': hashlib.sha256(traveler.passport_number.encode()).hexdigest(),
        'issued_at': issued_at.isoformat(),
        'expires_at': expires_at.isoformat(),
    }
    payload['signature'] = sign_payload(payload)
    return payload


def verify_payload(payload) -> bool:
    """التحقق من توقيع حمولة QR. يقبل القاموس فقط."""
    if not isinstance(payload, dict):
        return False
    signed = {
        k: payload.get(k)
        for k in ('traveler_id', 'passport_hash', 'issued_at', 'expires_at')
    }
    signature = payload.get('signature')
    if not isinstance(signature, str) or not signature:
        return False
    expected = sign_payload(signed)
    return hmac.compare_digest(expected, signature)