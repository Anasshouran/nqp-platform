"""اختبارات إعداد CSRF_TRUSTED_ORIGINS (Gate D — STAGING-0-R7).

تقدّم CSRF_TRUSTED_ORIGINS بوضوح عبر متغيّر البيئة CSRF_TRUSTED_ORIGINS
(قائمة مفصولة بفواصل). الافتراضي فارغ. لا تُضاف أي wildcards. Django يتولى
فحص مخطط الأصل (scheme://netloc) كما هو معتمد لدى الإصدار المثبّت.
"""
import os
from pathlib import Path

import pytest

from nqp_backend.settings import parse_csrf_trusted_origins

REPO_ROOT = Path(__file__).resolve().parents[4]


def test_single_https_origin():
    parsed = parse_csrf_trusted_origins('https://staging.example.invalid')
    assert parsed == ['https://staging.example.invalid']


def test_multiple_https_origins():
    parsed = parse_csrf_trusted_origins(
        'https://staging.example.invalid,https://staging-api.example.invalid'
    )
    assert parsed == [
        'https://staging.example.invalid',
        'https://staging-api.example.invalid',
    ]


def test_empty_or_missing_value_is_safest_default():
    assert parse_csrf_trusted_origins('') == []
    assert parse_csrf_trusted_origins() == []
    assert parse_csrf_trusted_origins(None) == []


def test_whitespace_is_stripped_and_empty_entries_ignored():
    parsed = parse_csrf_trusted_origins(
        '  https://a.example.invalid , https://b.example.invalid ,  ,'
    )
    assert parsed == [
        'https://a.example.invalid',
        'https://b.example.invalid',
    ]


def test_no_permissive_wildcard_is_ever_introduced():
    # بدون إدخال: لا wildcard. مع إدخال صريح: يُمرَّر حرفياً — Django يرفض
    # الأنماط خارج مخطط Django، ولا توجد إضافة تلقائية لأي "*".
    assert parse_csrf_trusted_origins('') == []
    assert '*' not in ''.join(parse_csrf_trusted_origins('https://ok.example.invalid'))
    # حتى لو مُرِّر '*' صراحةً (إدخال خاطئ من المشغّل) لا يتم تحويله إلى
    # wildcard شاملة؛ يبقى ما دخل بعينه، ولن يتجاوز فحص Django.
    explicit = parse_csrf_trusted_origins('*')
    assert explicit == ['*']
    assert len(explicit) == 1


def test_scheme_is_preserved_for_django_validation():
    # Django يتطلب scheme://netloc. تُحفَظ الصيغة كما هي دون تعديل.
    parsed = parse_csrf_trusted_origins('https://staging.example.invalid')
    assert parsed[0].startswith('https://')
    assert '://' in parsed[0]


def test_staging_config_reads_the_intended_environment_variable():
    # المعيار الذهبي: compose يُمرّر متغيّر CSRF_TRUSTED_ORIGINS إلى backend
    # من STAGING_CSRF_TRUSTED_ORIGINS (ملء من .env)، والإعدادات تقرأه فوراً.
    compose = (REPO_ROOT / 'deploy/staging/docker-compose.yml').read_text()
    settings_src = (REPO_ROOT / 'backend/nqp_backend/settings.py').read_text()

    assert 'CSRF_TRUSTED_ORIGINS: ${STAGING_CSRF_TRUSTED_ORIGINS}' in compose
    # نفس المتغيّر يُقرأ بدون تحويل أسماء على مستوى كود الإعدادات.
    assert "os.environ.get('CSRF_TRUSTED_ORIGINS', '')" in settings_src


def test_csrf_trusted_origins_matches_allowed_hosts_is_not_assumed():
    # ALLOWED_HOSTS و CSRF_TRUSTED_ORIGINS مفهومان منفصلان — لا افتراض بأن
    # قائمة origin تساوي قائمة hosts تلقائياً.
    assert 'CSRF_TRUSTED_ORIGINS = ALLOWED_HOSTS' not in (
        Path(__file__).parents[3] / 'nqp_backend' / 'settings.py'
    ).read_text()
    assert 'ALLOWED_HOSTS = CSRF_TRUSTED_ORIGINS' not in (
        Path(__file__).parents[3] / 'nqp_backend' / 'settings.py'
    ).read_text()