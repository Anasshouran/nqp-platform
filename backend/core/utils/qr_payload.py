"""أدوات إنشاء والتحقق من حمولة رمز QR الرسمية للمسافرين.

الرقم موقّع بـ HMAC-SHA256 باستخدام QR_SIGNING_KEY (منفصل عن SECRET_KEY)
لضمان عدم إمكانية تزويره، وهو التنسيق الذي تصدره بوابة المسافرين وتتحقق
منه المنافذ والجهات العامة.

يدعم key_id (DEC-SEC-005) لاختيار المفتاح، وdual-key verification
(DEC-SEC-002) أثناء نافذة الانتقال.
"""

from __future__ import annotations

import hashlib
import hmac
import json

from django.conf import settings
from django.utils import timezone

QR_TTL_HOURS = 24
QR_VALIDITY_DAYS = 90


def _sign(payload: dict, key: str) -> str:
    """توقيع حمولة عبر HMAC-SHA256 مع مفتاح محدد."""
    message = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(
        key.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def sign_payload(payload: dict, key: str | None = None) -> str:
    """توقيع حمولة QR عبر HMAC-SHA256 مع مفتاح QR_SIGNING_KEY.

    يضيف `key_id` إلى الحمولة قبل التوقيع (DEC-SEC-005).
    """
    if key is None:
        key = settings.QR_SIGNING_KEY
    key_id = payload.get('key_id', settings.QR_KEY_ID)
    payload['key_id'] = key_id
    return _sign(payload, key)


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


def verify_payload(payload, key=None) -> bool:
    """التحقق من توقيع حمولة QR. يقبل القاموس فقط.

    يختار المفتاح بناءً على `key_id`:
    - key_id == QR_KEY_ID (الحالي) → QR_SIGNING_KEY
    - key_id != QR_KEY_ID → QR_SIGNING_KEY_OLD (إن ضُبط)
    - key_id مفقود → backward compat: يحاول QR_SIGNING_KEY ثم QR_SIGNING_KEY_OLD

    fail-closed: أي فشل في التحديد → False.
    """
    if not isinstance(payload, dict):
        return False
    signature = payload.get('signature')
    if not isinstance(signature, str) or not signature:
        return False

    base_fields = ('traveler_id', 'passport_hash', 'issued_at', 'expires_at', 'certificate_number', 'qr_token')
    base = {k: payload.get(k) for k in base_fields if payload.get(k) is not None}
    key_id = payload.get('key_id')  # None if missing (backward compat)

    if key is not None:
        keys_to_try = [key]
    elif key_id is None:
        # Backward compat: try both keys
        keys_to_try = [settings.QR_SIGNING_KEY]
        old_key = getattr(settings, 'QR_SIGNING_KEY_OLD', None)
        if old_key:
            keys_to_try.append(old_key)
    elif key_id == settings.QR_KEY_ID:
        keys_to_try = [settings.QR_SIGNING_KEY]
    else:
        old_key = getattr(settings, 'QR_SIGNING_KEY_OLD', None)
        keys_to_try = [old_key] if old_key else []

    for k in keys_to_try:
        if k is None:
            continue
        # Try with key_id
        if key_id is not None:
            signed = {**base, 'key_id': key_id}
            expected = _sign(signed, k)
            if hmac.compare_digest(expected, signature):
                return True
        # Try without key_id (backward compat with pre-change payloads)
        expected = _sign(base, k)
        if hmac.compare_digest(expected, signature):
            return True

    return False