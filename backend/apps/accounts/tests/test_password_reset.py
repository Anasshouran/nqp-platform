"""اختبارات رابط إعادة تعيين كلمة المرور (موظفون).

الخلل المرجعي (SIVS-INTEG-002): كان الباكند يبني الرابط بـ `?uid=` بينما
الواجهة تقرأ `uidb64`، فتُفتح صفحة «رابط غير صالح» دائمًا. هذه الاختبارات
تثبّت عقد الرابط بين الباكند والواجهة وتتحقق من نجاح التدفق كاملًا.
"""

import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail

pytestmark = pytest.mark.django_db

User = get_user_model()

FORGOT_URL = '/api/v1/auth/forgot-password/'
RESET_URL = '/api/v1/auth/reset-password/'

LINK_RE = re.compile(
    r'https?://[^\s]+/reset-password\?uidb64=(?P<uidb64>[^&\s]+)&token=(?P<token>[^&\s]+)'
)


@pytest.fixture
def locmem_mail(settings):
    """التقاط البريد في الذاكرة بدل محاولة إرساله عبر SMTP."""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    mail.outbox.clear()
    yield mail.outbox
    mail.outbox.clear()


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        email='reset.staff@nqp.gov.sd',
        password='OldPass123!',
        full_name='موظف اختبار',
    )


def _extract_link(body: str):
    match = LINK_RE.search(body)
    assert match, f'رابط إعادة التعيين لا يطابق عقد الواجهة: {body}'
    return match.group('uidb64'), match.group('token')


def test_password_reset_link_contains_uidb64(client, staff_user, locmem_mail):
    response = client.post(FORGOT_URL, {'email': staff_user.email}, content_type='application/json')

    assert response.status_code == 200
    assert len(locmem_mail) == 1
    body = locmem_mail[0].body

    assert '?uidb64=' in body
    assert '?uid=' not in body, 'الرابط ما زال يستخدم uid بدل uidb64'
    _extract_link(body)


def test_password_reset_flow_end_to_end(client, staff_user, locmem_mail):
    client.post(FORGOT_URL, {'email': staff_user.email}, content_type='application/json')
    assert len(locmem_mail) == 1

    uidb64, token = _extract_link(locmem_mail[0].body)
    new_password = 'NewPass456!'

    response = client.post(
        RESET_URL,
        {
            'uidb64': uidb64,
            'token': token,
            'password': new_password,
            'confirm_password': new_password,
        },
        content_type='application/json',
    )

    assert response.status_code == 200
    staff_user.refresh_from_db()
    assert staff_user.check_password(new_password)

    login = client.post(
        '/api/v1/auth/login/',
        {'email': staff_user.email, 'password': new_password},
        content_type='application/json',
    )
    assert login.status_code == 200
