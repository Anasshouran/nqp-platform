"""اختبارات مصادقة بوابة المسافرين (apps/travelers/auth).

ال要点: تسجيل حساب جديد، تسجيل الدخول، القفل بعد 5 محاولات،
استعادة كلمة المرور، واجهة /me، والربط التلقائي بالتسجيلات.
"""
import base64

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.travelers.models import Country, Traveler

User = get_user_model()

pytestmark = [pytest.mark.django_db]

API = '/api/v1/travelers/auth'

COUNTRY_CODE = 'EGY'
COUNTRY_ID = None  # set dynamically


def _user_data(**overrides):
    return {
        'full_name': 'مسافر تجريبي',
        'email': 'test.traveler@example.com',
        'password': 'T3st!Travel#2025',
        'confirm_password': 'T3st!Travel#2025',
        **overrides,
    }


@pytest.fixture(autouse=True)
def _seed_country():
    """يضمن وجود بلد في قاعدة البيانات للاختبارات."""
    global COUNTRY_ID
    country, _ = Country.objects.get_or_create(
        code=COUNTRY_CODE,
        defaults={'name': 'Egypt'},
    )
    COUNTRY_ID = country.id


def _register(client: APIClient, **overrides):
    return client.post(f'{API}/register/', _user_data(**overrides), format='json')


def _login(client: APIClient, identifier='test.traveler@example.com', password='T3st!Travel#2025'):
    return client.post(f'{API}/login/', {'identifier': identifier, 'password': password}, format='json')


# ── التسجيل ──

class TestRegister:
    def test_register_success(self):
        resp = _register(APIClient())
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.data['data']
        assert 'access_token' in data
        assert data['user']['email'] == 'test.traveler@example.com'
        assert data['user']['user_type'] == 'TRAVELER'

    def test_register_duplicate_email(self):
        _register(APIClient())
        resp = _register(APIClient())
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_weak_password(self):
        resp = _register(APIClient(), password='123', confirm_password='123')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch(self):
        resp = _register(APIClient(), confirm_password='NoMatch#2025')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_with_passport_links_existing(self):
        """حساب موجود بدون user يُربط بالحساب الجديد عند التسجيل ببيانات مطابقة.

        الاشتراط الأمني: تطابق تاريخ الميلاد مع سجل الجواز (وليستثنى الحسابات
        التي تحاول الاستيلاء على سجل دون معرفة تاريخ الميلاد).
        """
        country = Country.objects.get(code=COUNTRY_CODE)
        t = Traveler.objects.create(
            passport_number='X1234567',
            first_name='قديم',
            last_name='مسافر',
            date_of_birth='1990-01-01',
            nationality=country,
        )
        assert t.user is None
        resp = _register(APIClient(), passport_number='X1234567', date_of_birth='1990-01-01')
        assert resp.status_code == status.HTTP_201_CREATED
        t.refresh_from_db()
        assert t.user is not None

    def test_register_with_wrong_dob_rejects_claim(self):
        """مطالبة سجل موجود بتاريخ ميلاد خاطئ تُرفض (منع الاستيلاء)."""
        country = Country.objects.get(code=COUNTRY_CODE)
        t = Traveler.objects.create(
            passport_number='X8888888',
            first_name='قديم',
            last_name='مسافر',
            date_of_birth='1985-07-21',
            nationality=country,
        )
        resp = _register(APIClient(), passport_number='X8888888', date_of_birth='2000-01-01')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        t.refresh_from_db()
        assert t.user is None


# ── تسجيل الدخول ──

class TestLogin:
    def test_login_success(self):
        _register(APIClient())
        resp = _login(APIClient())
        assert resp.status_code == status.HTTP_200_OK
        assert 'access_token' in resp.data['data']

    def test_login_wrong_password(self):
        _register(APIClient())
        resp = _login(APIClient(), password='Wrong#Pass123')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_rejects_staff(self):
        _register(APIClient())
        user = User.objects.get(email='test.traveler@example.com')
        user.is_staff = True
        user.save(update_fields=['is_staff'])
        resp = _login(APIClient())
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'موظفي النظام' in str(resp.data)

    def test_lockout_after_5_attempts(self):
        _register(APIClient())
        for _ in range(5):
            _login(APIClient(), password='Wrong#123')
        resp = _login(APIClient(), password='Wrong#123')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'قفل' in str(resp.data)

    def test_lockout_resets_on_success(self):
        _register(APIClient())
        for _ in range(4):
            _login(APIClient(), password='Wrong#123')
        resp = _login(APIClient())
        assert resp.status_code == status.HTTP_200_OK
        user = User.objects.get(email='test.traveler@example.com')
        assert user.failed_login_attempts == 0


# ── استعادة كلمة المرور ──

class TestPasswordRecovery:
    def test_forgot_always_returns_200(self):
        resp = APIClient().post(f'{API}/forgot-password/', {'email': 'nonexistent@test.com'}, format='json')
        assert resp.status_code == status.HTTP_200_OK

    def test_reset_valid_token(self):
        _register(APIClient())
        user = User.objects.get(email='test.traveler@example.com')
        uid = base64.urlsafe_b64encode(force_bytes(user.pk)).decode()
        token = default_token_generator.make_token(user)
        new_pw = 'NewP4ss!2025'
        resp = APIClient().post(f'{API}/reset-password/', {
            'uidb64': uid, 'token': token,
            'password': new_pw, 'confirm_password': new_pw,
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.check_password(new_pw)

    def test_reset_invalid_token(self):
        _register(APIClient())
        user = User.objects.get(email='test.traveler@example.com')
        uid = base64.urlsafe_b64encode(force_bytes(user.pk)).decode()
        resp = APIClient().post(f'{API}/reset-password/', {
            'uidb64': uid, 'token': 'invalid-token',
            'password': 'NewP4ss!2025', 'confirm_password': 'NewP4ss!2025',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_clears_lockout(self):
        _register(APIClient())
        user = User.objects.get(email='test.traveler@example.com')
        user.failed_login_attempts = 5
        user.locked_until = timezone.now() + timezone.timedelta(minutes=10)
        user.save(update_fields=['failed_login_attempts', 'locked_until'])
        uid = base64.urlsafe_b64encode(force_bytes(user.pk)).decode()
        token = default_token_generator.make_token(user)
        new_pw = 'NewP4ss!2025'
        resp = APIClient().post(f'{API}/reset-password/', {
            'uidb64': uid, 'token': token,
            'password': new_pw, 'confirm_password': new_pw,
        }, format='json')
        assert resp.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None


# ── واجهة /me ──

class TestTravelerMe:
    def test_me_unauthenticated(self):
        resp = APIClient().get(f'{API}/me/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_authenticated(self):
        _register(APIClient())
        client = APIClient()
        login_resp = _login(client)
        token = login_resp.data['data']['access_token']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = client.get(f'{API}/me/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['data']['email'] == 'test.traveler@example.com'

    def test_patch_me_updates_name(self):
        _register(APIClient())
        client = APIClient()
        login_resp = _login(client)
        token = login_resp.data['data']['access_token']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = client.patch(f'{API}/me/', {'full_name': 'اسم جديد'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['data']['full_name'] == 'اسم جديد'


# ── الربط التلقائي عند إنشاء تسجيل رحلة ──

class TestAutoLink:
    def test_authenticated_traveler_links_on_create(self):
        """عند تسجيل رحلة عبر المسافر المسجّل → يُربط Traveler.user."""
        _register(APIClient())
        user = User.objects.get(email='test.traveler@example.com')
        client = APIClient()
        login_resp = _login(client)
        token = login_resp.data['data']['access_token']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = client.post('/api/v1/travelers/register/', {
            'passport_number': 'Y9999999',
            'first_name': 'جديد',
            'last_name': 'رحلة',
            'date_of_birth': '1995-06-15',
            'nationality': COUNTRY_CODE,
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        t = Traveler.objects.get(passport_number='Y9999999')
        assert t.user == user
