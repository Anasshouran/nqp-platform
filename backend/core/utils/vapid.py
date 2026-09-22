"""مفتاح VAPID وإصدار JWT (ES256) لإشعارات الويب المدفوعة.

يعتمد المفتاح على SECRET_KEY حتى يبقى ثابتاً بين عمليات التشغيل دون إعداد إضافي،
ويمكن تثبيته صراحة عبر إعدادات البيئة VAPID_* إن وُجدت.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import time

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

VAPID_SUBJECT = os.environ.get('VAPID_SUBJECT', 'mailto:no-reply@nqp.gov.sd')
VAPID_TTL_SECONDS = 43200  # 12 ساعة

_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

_keys: tuple[ec.EllipticCurvePrivateKey, ec.EllipticCurvePublicKey, str] | None = None


def _load_vapid_keys():
    global _keys
    p256dh_priv = os.environ.get('VAPID_PRIVATE_KEY')
    p256dh_pub = os.environ.get('VAPID_PUBLIC_KEY')
    if p256dh_priv and p256dh_pub:
        try:
            priv = ec.derive_private_key(
                int.from_bytes(base64.urlsafe_b64decode(p256dh_priv), 'big'),
                ec.SECP256R1(),
            )
            pub = serialization.load_pem_public_key(
                base64.urlsafe_b64decode(p256dh_pub),
            )
            public_key_b64 = _extract_b64url(pub)
            _keys = (priv, pub.public_key(), public_key_b64)
            return
        except Exception:
            _keys = None

    seed = hashlib.sha256(b'afyatna:vapid:v1:' + __import__('django').conf.settings.SECRET_KEY.encode()).digest()
    private_int = int.from_bytes(seed, 'big') % _N
    if private_int == 0:
        private_int = 1
    priv = ec.derive_private_key(private_int, ec.SECP256R1())
    pub = priv.public_key()
    _keys = (priv, pub, _extract_b64url(pub))


def _extract_b64url(pub_key) -> str:
    raw = pub_key.public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return _b64url_encode(raw)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + '=' * (-len(data) % 4))


def _der_to_raw_r_s(der: bytes) -> bytes:
    """تحويل توقيع ECDSA من DER إلى الصيغة الخام r||s المطلوبة في JOSE."""
    if not der or der[0] != 0x30:
        raise ValueError('invalid DER signature')

    def _read_length(i: int):
        length = der[i]
        i += 1
        if length & 0x80:
            count = length & 0x7F
            length = int.from_bytes(der[i:i + count], 'big')
            i += count
        return length, i

    total, i = _read_length(1)

    def _read_int(i: int):
        if der[i] != 0x02:
            raise ValueError('expected INTEGER')
        length, j = _read_length(i + 1)
        value = der[j:j + length]
        value = value.lstrip(b'\x00') or b'\x00'
        return value, j + length

    r, i = _read_int(i)
    s, i = _read_int(i)
    size = 32
    return r.rjust(size, b'\x00') + s.rjust(size, b'\x00')


def _sign_es256(priv: ec.EllipticCurvePrivateKey, message: bytes) -> bytes:
    der = priv.sign(message, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)
    size = 32
    return r.to_bytes(size, 'big') + s.to_bytes(size, 'big')


def create_vapid_token(audience: str, subject: str | None = None) -> tuple[str, str]:
    """إصدار JWT ES256 مصدّق بمفتاح VAPID. يعيد (token, مفتاح عام base64url)."""
    if _keys is None:
        _load_vapid_keys()
    priv, pub, public_b64 = _keys  # type: ignore[misc]
    header = _b64url_encode(json.dumps({'typ': 'JWT', 'alg': 'ES256'}).encode())
    now = int(time.time())
    claims = {
        'aud': audience,
        'exp': now + VAPID_TTL_SECONDS,
        'sub': subject or VAPID_SUBJECT,
    }
    body = _b64url_encode(json.dumps(claims, separators=(',', ':')).encode())
    signing_input = f'{header}.{body}'.encode()
    signature = _sign_es256(priv, signing_input)
    return f'{header}.{body}.{_b64url_encode(signature)}', public_b64


def get_vapid_public_key() -> str:
    if _keys is None:
        _load_vapid_keys()
    return _keys[2]  # type: ignore[misc]