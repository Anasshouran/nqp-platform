"""PHASE 1.5 — مصفوفة أمان الفحص (SEC-M0-1) + اختبارات سلبية (§15/§16).

النموذج المطلوب: Authentication + Authorization (RBAC screening:*) + Object/POE scope.

الأدوار المعتمدة (مصدر الحقيقة: apps/accounts/management/commands/seed_iam_roles.py):
  INSPECTOR      — screening add/edit/view/export, default_scope POINT
  POE_MANAGER    — screening add/edit/view/export, default_scope POINT
  FEDERAL_DIRECTOR — screening view/export, default_scope GLOBAL
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import RoleAssignment
from apps.masterdata.models import EntryPoint, Sector as MasterSector, State
from apps.screening.models import HealthScreening
from apps.travelers.models import Country, Traveler

from apps.mobile_api.tests.conftest import bearer

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def country(db):
    return Country.objects.create(code='SD', name='Sudan', name_ar='السودان')


@pytest.fixture
def sector(db):
    return MasterSector.objects.create(code='AIR', name_ar='الجوي')


@pytest.fixture
def port_krt(sector):
    state = State.objects.create(code='KH', name_ar='الخرطوم', sector=sector)
    return EntryPoint.objects.create(
        code='KRT', name_ar='مطار الخرطوم', kind=EntryPoint.Kind.AIRPORT, state=state
    )


@pytest.fixture
def port_psd(sector):
    state = State.objects.create(code='PS', name_ar='بورسودان', sector=sector)
    return EntryPoint.objects.create(
        code='PSD', name_ar='ميناء بورسودان', kind=EntryPoint.Kind.SEAPORT, state=state
    )


@pytest.fixture
def traveler(country):
    return Traveler.objects.create(
        passport_number='P555M', first_name='محمد', last_name='عمر',
        date_of_birth='1990-01-01', nationality=country,
    )


@pytest.fixture
def screening_records(port_krt, port_psd, traveler):
    officer = User.objects.create_user(
        email='screener@nqp.gov.sd', password='StrongPass123!', full_name='مفتش'
    )
    krt = HealthScreening.objects.create(
        traveler=traveler, port=port_krt, officer=officer,
        body_temperature=37.1, observed_symptoms=[],
    )
    psd = HealthScreening.objects.create(
        traveler=traveler, port=port_psd, officer=officer,
        body_temperature=38.3, observed_symptoms=['COUGH'],
    )
    return krt, psd


def _make_user(email):
    return User.objects.create_user(
        email=email, password='StrongPass123!', full_name=email.split('@')[0],
    )


def _authorize(user, codes=(), scope_type='PORT', scope_id=None):
    from apps.accounts.models import Permission, Role, RoleAssignment

    perms = []
    for code in codes:
        resource, _, action = code.partition(':')
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={'name': f'{action} {resource}', 'resource': resource, 'action': action},
        )
        perms.append(perm)
    role, _ = Role.objects.get_or_create(
        code=f'P15_{user.pk}',
        defaults={
            'name': f'P15_{user.pk}', 'name_ar': f'P15_{user.pk}',
            'description': 'دور اختبار P1.5', 'default_scope': scope_type,
        },
    )
    if perms:
        role.permissions.add(*perms)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id,
        is_active=True, assigned_by=user,
    )
    return user


def _client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=bearer(user))
    return client


# --------------------------------------------------------------------------- #
# المصفوفة
# --------------------------------------------------------------------------- #
def test_matrix_anonymous_denied(port_krt):
    client = APIClient()
    assert client.get('/api/v1/screening/').status_code == 401
    assert client.post('/api/v1/screening/', {}, format='json').status_code == 401


def test_matrix_traveler_denied(traveler, port_krt, screening_records):
    trav_user = _make_user('tv-p15@nqp.gov.sd')
    trav_user.user_type = trav_user.UserType.TRAVELER
    trav_user.save(update_fields=['user_type'])
    client = _client(trav_user)
    assert client.get('/api/v1/screening/').status_code == 403
    assert client.get('/api/v1/screening/scan-qr/', {'qr_data': 'x'}).status_code in (403, 404, 405)


def test_matrix_bystander_role_denied(port_krt, screening_records, traveler):
    """دور مصادق بلا صلاحيات فحص (مثل مطبخ) → 403 لكل القراءات."""
    user = _authorize(_make_user('kitchen@nqp.gov.sd'), codes=('food:view',), scope_type='PORT', scope_id=port_krt.pk)
    client = _client(user)
    assert client.get('/api/v1/screening/').status_code == 403
    assert client.get(f"/api/v1/screening/{screening_records[0].pk}/").status_code == 403


def test_matrix_inspector_view_own_port_only(port_krt, port_psd, screening_records, traveler):
    krt, psd = screening_records
    inspector = _authorize(
        _make_user('insp-p15@nqp.gov.sd'),
        codes=('screening:view', 'screening:add'),
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=port_krt.pk,
    )
    client = _client(inspector)

    # قائمة: منافذ نطاقه فقط (KRT لا PSD)
    response = client.get('/api/v1/screening/')
    assert response.status_code == 200
    rows = response.json()['data']['results']
    ids = {row['id'] for row in rows}
    assert str(krt.pk) in ids
    assert str(psd.pk) not in ids

    # Retrieve سجل من نطاقه → 200
    detail = client.get(f'/api/v1/screening/{krt.pk}/')
    assert detail.status_code == 200

    # Retrieve سجل خارج النطاق → 404 (لا تسريب)
    outside = client.get(f'/api/v1/screening/{psd.pk}/')
    assert outside.status_code == 404

    # إنشاء خارج النطاق → 403
    create = client.post(
        '/api/v1/screening/',
        {'traveler': traveler.pk, 'port': port_psd.pk, 'body_temperature': 37.0, 'observed_symptoms': []},
        format='json',
    )
    assert create.status_code == 403

    # إنشاء داخل النطاق → 201
    create_ok = client.post(
        '/api/v1/screening/',
        {'traveler': traveler.pk, 'port': port_krt.pk, 'body_temperature': 37.2, 'observed_symptoms': []},
        format='json',
    )
    assert create_ok.status_code == 201


def test_matrix_global_scope_sees_all(port_krt, port_psd, screening_records):
    krt, psd = screening_records
    director = _authorize(
        _make_user('dir-p15@nqp.gov.sd'),
        codes=('screening:view',),
        scope_type=RoleAssignment.ScopeType.GLOBAL,
    )
    client = _client(director)
    response = client.get('/api/v1/screening/')
    assert response.status_code == 200
    ids = {row['id'] for row in response.json()['data']['results']}
    assert str(krt.pk) in ids
    assert str(psd.pk) in ids


def test_matrix_admin_superuser_unaffected(screening_records, traveler):
    krt, psd = screening_records
    admin = User.objects.create_superuser(
        email='admin-p15@nqp.gov.sd', password='StrongPass123!', full_name='مدير',
    )
    client = _client(admin)
    assert client.get('/api/v1/screening/').status_code == 200
    detail = client.get(f'/api/v1/screening/{krt.pk}/')
    assert detail.status_code == 200
    assert client.get(f'/api/v1/screening/{psd.pk}/').status_code == 200


def test_matrix_no_scope_no_rows(port_krt, screening_records):
    """صلاحية + نطاق غير محدد → فشل آمن: لا أسطر ولا تسريب."""
    user = _authorize(
        _make_user('noscope@nqp.gov.sd'),
        codes=('screening:view',),
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=None,
    )
    client = _client(user)
    response = client.get('/api/v1/screening/')
    assert response.status_code == 200
    assert response.json()['data']['results'] == []


# --- §16 negatives: search/filter/actions -------------------------------------
def test_negative_search_and_filter_scoped(port_krt, port_psd, screening_records, traveler):
    krt, psd = screening_records
    inspector = _authorize(
        _make_user('insp-search@nqp.gov.sd'),
        codes=('screening:view', 'screening:add'),
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=port_krt.pk,
    )
    client = _client(inspector)

    for query in (
        {'search': traveler.passport_number},
        {'port': port_psd.pk},
        {'traveler': traveler.pk},
    ):
        response = client.get('/api/v1/screening/', query)
        assert response.status_code == 200
        ids = {row['id'] for row in response.json()['data']['results']}
        assert str(psd.pk) not in ids, query  # لا تسرب من المنفذ الآخر


def test_negative_latest_risk_excluded_scope(port_krt, port_psd, screening_records):
    krt, psd = screening_records
    inspector = _authorize(
        _make_user('insp-risk@nqp.gov.sd'),
        codes=('screening:view',),
        scope_type=RoleAssignment.ScopeType.PORT,
        scope_id=port_krt.pk,
    )
    client = _client(inspector)
    assert client.get(f'/api/v1/screening/{psd.pk}/latest-risk/').status_code == 404