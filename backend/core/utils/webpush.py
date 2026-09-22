"""إرسال إشعارات الويب المدفوعة وفق RFC 8291 (aes128gcm) و VAPID.

لا يتطلب أي اعتماديات خارجية؛ يستخدم ``cryptography`` لإجراءات ECDH/HKDF/AES-GCM
و ``urllib`` لإرسال الطلب إلى نقطة دفع المتصفح.
"""

from __future__ import annotations

import base64
import json
import os
import struct
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from cryptography.hazmat.primitives import hashes, hmac as hmac_primitives
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from .vapid import create_vapid_token

RECORD_SIZE = 4096


def _b64(url_b64: str) -> bytes:
    return base64.urlsafe_b64decode(url_b64 + '=' * (-len(url_b64) % 4))


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _hmac_sha256(key: bytes, message: bytes) -> bytes:
    h = hmac_primitives.HMAC(key, hashes.SHA256())
    h.update(message)
    return h.finalize()


def _hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    return _hmac_sha256(salt, ikm)


def _hkdf_expand(prk: bytes, info: bytes, length: int) -> bytes:
    okm = b''
    counter = 1
    previous = b''
    while len(okm) < length:
        previous = _hmac_sha256(prk, previous + info + bytes([counter]))
        okm += previous
        counter += 1
    return okm[:length]


def _load_client_public(client_public: bytes) -> ec.EllipticCurvePublicKey:
    return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), client_public)


def _payload_key(server_priv, client_public: bytes, auth_secret: bytes) -> tuple[bytes, bytes]:
    ecdh_secret = server_priv.exchange(ec.ECDH(), _load_client_public(client_public))
    server_public = server_priv.public_key().public_bytes(
        Encoding.X962, PublicFormat.UncompressedPoint,
    )
    prk_key = _hmac_sha256(auth_secret, b'Content-Encoding: auth\x00' + ecdh_secret)
    ikm_enc = _hmac_sha256(
        prk_key,
        b'Content-Encoding: aes128gcm\x00' + server_public,
    )
    return ikm_enc, server_public


def _encrypt_aes128gcm(server_priv, client_public: bytes, auth_secret: bytes, plaintext: bytes) -> bytes:
    ikm_enc, server_public = _payload_key(server_priv, client_public, auth_secret)
    salt = os.urandom(16)
    context = (
        b'P-256\x00'
        + bytes([len(server_public)]) + server_public
        + bytes([len(client_public)]) + client_public
    )
    prk = _hkdf_extract(salt, ikm_enc)
    kek = _hkdf_expand(prk, b'Content-Encoding: aes128gcm\x00' + context, 16)
    nonce = _hkdf_expand(prk, b'Content-Encoding: nonce\x00' + context, 12)

    aesgcm = AESGCM(kek)
    ciphertext = aesgcm.encrypt(nonce, plaintext + b'\x02', None)

    header = salt + struct.pack('>I', RECORD_SIZE) + bytes([len(server_public)]) + server_public
    return header + ciphertext


def encrypt_message(client_public: bytes, auth_secret: bytes, plaintext: bytes) -> tuple[bytes, bytes]:
    """تشفير رسالة لإشعار مدفوع. يعيد (الحمولة الشبكية, المفتاح العام المؤقت)."""
    server_priv = ec.generate_private_key(ec.SECP256R1())
    return _encrypt_aes128gcm(server_priv, client_public, auth_secret, plaintext), server_priv.public_key().public_bytes(
        Encoding.X962, PublicFormat.UncompressedPoint,
    )


def decrypt_message(client_priv, client_public: bytes, server_public: bytes, auth_secret: bytes, encrypted: bytes) -> bytes:
    """فك تشفير رسالة aes128gcm (يُستخدم في اختبارات تطابق التشفير)."""
    if len(encrypted) < 16 + 4 + 1 + 65:
        raise ValueError('payload too short')
    salt = encrypted[:16]
    rs = struct.unpack('>I', encrypted[16:20])[0]
    idlen = encrypted[20]
    server_pub = encrypted[21:21 + idlen]
    ciphertext = encrypted[21 + idlen:]

    ecdh_secret = client_priv.exchange(ec.ECDH(), _load_client_public(server_pub))
    prk_key = _hmac_sha256(auth_secret, b'Content-Encoding: auth\x00' + ecdh_secret)
    ikm_enc = _hmac_sha256(prk_key, b'Content-Encoding: aes128gcm\x00' + server_pub)
    context = (
        b'P-256\x00'
        + bytes([len(server_pub)]) + server_pub
        + bytes([len(client_public)]) + client_public
    )
    prk = _hkdf_extract(salt, ikm_enc)
    kek = _hkdf_expand(prk, b'Content-Encoding: aes128gcm\x00' + context, 16)
    nonce = _hkdf_expand(prk, b'Content-Encoding: nonce\x00' + context, 12)
    aesgcm = AESGCM(kek)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    if not plaintext or plaintext[-1] != 0x02:
        raise ValueError('missing padding delimiter')
    return plaintext[:-1]


def send_web_push(subscription: dict, title: str, body: str, url: str = '/services/tools', ttl: int = 60) -> dict:
    """إرسال إشعار مدفوع إلى اشتراك متصفح. يعيد النتيجة مع حالة النجاح/الفشل."""
    endpoint = subscription.get('endpoint')
    keys = subscription.get('keys') or {}
    client_public = _b64(keys.get('p256dh', ''))
    auth_secret = _b64(keys.get('auth', ''))
    if not endpoint or not client_public or not auth_secret:
        return {'success': False, 'error': 'INVALID_SUBSCRIPTION'}

    message = {
        'title': title,
        'body': body,
        'url': url,
        'id': str(uuid.uuid4()),
    }
    payload, server_public = encrypt_message(client_public, auth_secret, json.dumps(message).encode())

    audience = _extract_audience(endpoint)
    token, public_b64 = create_vapid_token(audience)
    headers = {
        'Authorization': f'vapid t={token}, k={public_b64}',
        'Content-Type': 'application/octet-stream',
        'TTL': str(ttl),
    }
    request = Request(endpoint, data=payload, headers=headers, method='POST')
    try:
        with urlopen(request, timeout=10) as response:
            return {'success': response.status in (200, 201), 'status': response.status}
    except HTTPError as exc:
        return {'success': False, 'status': exc.code, 'error': str(exc.reason)}
    except URLError as exc:
        return {'success': False, 'error': str(exc.reason)}
    except Exception as exc:  # noqa: BLE001
        return {'success': False, 'error': str(exc)}


def _extract_audience(endpoint: str) -> str:
    """استخراج نطاق نقطة الدفع (مثال: https://fcm.googleapis.com)."""
    scheme_end = endpoint.find('://')
    if scheme_end == -1:
        return endpoint
    rest = endpoint[scheme_end + 3:]
    path_start = rest.find('/')
    if path_start == -1:
        return endpoint
    return endpoint[:scheme_end + 3 + path_start]