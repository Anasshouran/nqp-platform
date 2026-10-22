"""Tests for core/utils/qr_payload.py — SEC-PLAT-001 QR key separation."""
import hashlib
import hmac
import json

import pytest
from django.conf import settings
from django.test import override_settings

from core.utils.qr_payload import sign_payload, verify_payload, make_qr_payload


@pytest.fixture
def base_payload():
    return {
        'traveler_id': '11111111-2222-3333-4444-555555555555',
        'passport_hash': hashlib.sha256(b'P123456').hexdigest(),
        'issued_at': '2026-10-22T10:00:00+00:00',
        'expires_at': '2026-10-23T10:00:00+00:00',
    }


def test_sign_includes_key_id(base_payload):
    """sign_payload adds key_id to the signed data."""
    sig = sign_payload(base_payload)
    # The signature should change if key_id is different
    sig2 = sign_payload({**base_payload, 'key_id': 'v2'})
    assert sig != sig2, 'key_id should affect the signature'


def test_verify_accepts_current_key(base_payload):
    """verify_payload succeeds with the current key."""
    payload = dict(base_payload)
    payload['signature'] = sign_payload(payload)
    assert verify_payload(payload) is True


def test_verify_accepts_old_key(base_payload):
    """verify_payload succeeds with the old key during transition window."""
    with override_settings(QR_SIGNING_KEY_OLD='old-secret-key-for-transition', QR_KEY_ID='v2'):
        # Sign with old key (key_id='v1' != current 'v2')
        payload = {**base_payload, 'key_id': 'v1'}
        payload['signature'] = sign_payload(payload, key='old-secret-key-for-transition')
        assert verify_payload(payload) is True


def test_verify_rejects_tampered_key_id(base_payload):
    """Changing key_id after signing must fail verification."""
    payload = dict(base_payload)
    payload['signature'] = sign_payload(payload)
    # Tamper key_id
    payload['key_id'] = 'v999'
    assert verify_payload(payload) is False


def test_verify_rejects_missing_signature(base_payload):
    """Missing signature → fail-closed."""
    payload = dict(base_payload)
    assert verify_payload(payload) is False
    payload['signature'] = ''
    assert verify_payload(payload) is False
    payload['signature'] = None
    assert verify_payload(payload) is False


def test_verify_rejects_old_key_when_old_not_set(base_payload):
    """If QR_SIGNING_KEY_OLD is None and key_id differs from current, reject."""
    with override_settings(QR_SIGNING_KEY_OLD=None, QR_KEY_ID='v2'):
        payload = {**base_payload, 'key_id': 'v1'}
        payload['signature'] = sign_payload(payload, key='some-old-key')
        assert verify_payload(payload) is False


def test_key_separation(base_payload):
    """QR signing uses QR_SIGNING_KEY, not SECRET_KEY, when they differ."""
    with override_settings(QR_SIGNING_KEY='a-different-qr-key', SECRET_KEY='original-secret-key'):
        sig_qr = sign_payload(base_payload)
        # Compute what SECRET_KEY would produce
        import hmac, hashlib, json
        key_id = settings.QR_KEY_ID
        signed = {**base_payload, 'key_id': key_id}
        message = json.dumps(signed, separators=(',', ':'), sort_keys=True)
        sig_secret = hmac.new(b'original-secret-key', message.encode(), hashlib.sha256).hexdigest()
        assert sig_qr != sig_secret, 'QR signing should not use SECRET_KEY directly'


def test_make_qr_payload_includes_key_id():
    """make_qr_payload produces a payload with signature that verifies."""
    from unittest.mock import MagicMock
    traveler = MagicMock()
    traveler.id = '11111111-2222-3333-4444-555555555555'
    traveler.passport_number = 'P123456'
    payload = make_qr_payload(traveler)
    assert 'signature' in payload
    assert isinstance(payload['signature'], str)
    assert len(payload['signature']) == 64  # SHA-256 hex
    assert verify_payload(payload) is True