"""اختبارات تشفير إشعارات الويب و VAPID (بدون اتصال شبكي)."""

import base64
import json

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from core.utils import webpush
from core.utils.vapid import create_vapid_token, get_vapid_public_key

pytestmark = pytest.mark.django_db


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _client_keypair():
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return priv, pub


def _int_to_der(i: int) -> bytes:
    raw = i.to_bytes(32, 'big').lstrip(b'\x00') or b'\x00'
    if raw[0] & 0x80:
        raw = b'\x00' + raw
    return b'\x02' + bytes([len(raw)]) + raw


def _raw_to_der(signature: bytes) -> bytes:
    r = int.from_bytes(signature[:32], 'big')
    s = int.from_bytes(signature[32:], 'big')
    body = _int_to_der(r) + _int_to_der(s)
    return b'\x30' + bytes([len(body)]) + body


def test_webpush_payload_round_trip():
    client_priv, client_pub = _client_keypair()
    auth = b'super-secret-auth'
    message = json.dumps({'title': 'تنبيه', 'body': 'مرحباً', 'url': '/services/tools'}).encode()

    payload, server_pub = webpush.encrypt_message(client_pub, auth, message)
    assert payload != message

    decrypted = webpush.decrypt_message(client_priv, client_pub, server_pub, auth, payload)
    assert decrypted == message


def test_webpush_rejects_truncated_payload():
    with pytest.raises(ValueError):
        webpush.decrypt_message(*[b''] * 5)


def test_vapid_token_signature_verifies():
    public_key_raw = base64.urlsafe_b64decode(get_vapid_public_key() + '==')
    public_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), public_key_raw)

    token, token_public = create_vapid_token('https://fcm.googleapis.com', 'mailto:test@nqp.gov.sd')
    assert token_public == get_vapid_public_key()

    header_enc, body_enc, sig_enc = token.split('.')
    signing_input = f'{header_enc}.{body_enc}'.encode()
    signature = base64.urlsafe_b64decode(sig_enc + '=' * (-len(sig_enc) % 4))
    assert len(signature) == 64

    public_key.verify(_raw_to_der(signature), signing_input, ec.ECDSA(hashes.SHA256()))

    claims = json.loads(base64.urlsafe_b64decode(body_enc + '=' * (-len(body_enc) % 4)))
    assert claims['aud'] == 'https://fcm.googleapis.com'
    assert claims['sub'] == 'mailto:test@nqp.gov.sd'


def test_send_web_push_rejects_invalid_subscription():
    result = webpush.send_web_push({'endpoint': '', 'keys': {}}, 't', 'b')
    assert result['success'] is False
    assert result['error'] == 'INVALID_SUBSCRIPTION'