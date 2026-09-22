import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, RoleAssignment, ScopeType
from apps.cms.models import Announcement, ContentStatus, NewsArticle
from apps.organization.models import Sector

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def khartoum_sector():
    return Sector.objects.create(
        code='KHARTOUM',
        name_ar='قطاع الخرطوم',
        region='الخرطوم',
        color='#0e7490',
        order=2,
    )


def _role(code):
    return Role.objects.create(code=code, name=code, name_ar=code, default_scope=ScopeType.SECTOR)


def _scoped_user(client, role_code, sector, password='Passw0rd!2026'):
    user = User.objects.create_user(
        email=f'{role_code.lower()}@nqp.gov.sd', password=password, full_name=role_code
    )
    role = _role(role_code)
    RoleAssignment.objects.create(
        user=user, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.id, is_active=True
    )
    login = client.post('/api/v1/auth/login/', {'email': user.email, 'password': password}, format='json')
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access_token']}")
    return user


@pytest.fixture
def writer(khartoum_sector, api_client):
    return _scoped_user(api_client, 'SECTOR_CONTENT_EDITOR', khartoum_sector)


@pytest.fixture
def reviewer(khartoum_sector):
    client = APIClient()
    return _scoped_user(client, 'SECTOR_CONTENT_REVIEWER', khartoum_sector)


@pytest.fixture
def approver(khartoum_sector):
    client = APIClient()
    return _scoped_user(client, 'SECTOR_CONTENT_APPROVER', khartoum_sector)


def _news(**kwargs):
    defaults = dict(title='خبر اختباري', content='محتوى الخبر', status=ContentStatus.DRAFT)
    defaults.update(kwargs)
    return NewsArticle.objects.create(**defaults)


def test_create_forces_draft_for_writer(writer, api_client, khartoum_sector):
    res = api_client.post(
        '/api/v1/cms/news/',
        {'title': 'خبر', 'content': 'نص', 'status': ContentStatus.PUBLISHED, 'is_published': True},
        format='json',
    )
    assert res.status_code == 201
    news = NewsArticle.objects.get(id=res.data['id'])
    assert news.status == ContentStatus.DRAFT
    assert news.is_published is False
    assert news.sector_id == khartoum_sector.id


def test_writer_cannot_patch_status_directly(writer, api_client, khartoum_sector):
    news = _news(sector=khartoum_sector)
    res = api_client.patch(f'/api/v1/cms/news/{news.id}/', {'status': ContentStatus.PUBLISHED}, format='json')
    assert res.status_code == 403


def test_writer_submits_to_review(writer, api_client, khartoum_sector):
    news = _news(sector=khartoum_sector)
    res = api_client.post(f'/api/v1/cms/news/{news.id}/submit/')
    assert res.status_code == 200
    news.refresh_from_db()
    assert news.status == ContentStatus.REVIEW


def test_writer_cannot_approve(reviewer, khartoum_sector):
    client = APIClient()
    _scoped_user(client, 'SECTOR_CONTENT_EDITOR', khartoum_sector)
    news = _news(sector=khartoum_sector, status=ContentStatus.REVIEW)
    res = client.post(f'/api/v1/cms/news/{news.id}/approve/')
    assert res.status_code == 403


def test_reviewer_approves_and_publish_forbidden(khartoum_sector):
    client = APIClient()
    _scoped_user(client, 'SECTOR_CONTENT_REVIEWER', khartoum_sector)
    news = _news(sector=khartoum_sector, status=ContentStatus.REVIEW)
    res = client.post(f'/api/v1/cms/news/{news.id}/approve/')
    assert res.status_code == 200
    news.refresh_from_db()
    assert news.status == ContentStatus.APPROVED
    assert news.reviewer == 'SECTOR_CONTENT_REVIEWER'
    res = client.post(f'/api/v1/cms/news/{news.id}/publish/')
    assert res.status_code == 403


def test_reviewer_rejects(api_client, khartoum_sector):
    _scoped_user(api_client, 'SECTOR_CONTENT_REVIEWER', khartoum_sector)
    news = _news(sector=khartoum_sector, status=ContentStatus.REVIEW)
    res = api_client.post(f'/api/v1/cms/news/{news.id}/reject/')
    assert res.status_code == 200
    news.refresh_from_db()
    assert news.status == ContentStatus.DRAFT


def test_approver_publishes_and_archives(api_client, khartoum_sector):
    _scoped_user(api_client, 'SECTOR_CONTENT_APPROVER', khartoum_sector)
    news = _news(sector=khartoum_sector, status=ContentStatus.APPROVED)
    res = api_client.post(f'/api/v1/cms/news/{news.id}/publish/')
    assert res.status_code == 200
    news.refresh_from_db()
    assert news.status == ContentStatus.PUBLISHED
    assert news.is_published is True
    assert news.published_at is not None
    res = api_client.post(f'/api/v1/cms/news/{news.id}/archive/')
    assert res.status_code == 200
    news.refresh_from_db()
    assert news.status == ContentStatus.ARCHIVED
    assert news.is_published is False


def test_invalid_transition_returns_400(api_client, khartoum_sector):
    _scoped_user(api_client, 'SECTOR_CONTENT_APPROVER', khartoum_sector)
    news = _news(sector=khartoum_sector, status=ContentStatus.DRAFT)
    res = api_client.post(f'/api/v1/cms/news/{news.id}/publish/')
    assert res.status_code == 400


def test_sector_isolation_blocks_cross_sector_action(writer, api_client, khartoum_sector):
    other = Sector.objects.create(code='RED_SEA', name_ar='قطاع البحر الأحمر', region='البحر الأحمر', color='#e63946', order=1)
    news = _news(sector=other, status=ContentStatus.REVIEW)
    res = api_client.post(f'/api/v1/cms/news/{news.id}/submit/')
    assert res.status_code in (403, 404)


def test_announcements_public_filter(api_client, khartoum_sector):
    now = timezone.now()
    visible = Announcement.objects.create(
        title='إعلان منشور',
        body='نص',
        sector=khartoum_sector,
        status=ContentStatus.PUBLISHED,
        is_published=True,
        start_at=now - timezone.timedelta(days=1),
        end_at=now + timezone.timedelta(days=1),
    )
    draft = Announcement.objects.create(
        title='مسودة', body='نص', sector=khartoum_sector, status=ContentStatus.DRAFT, is_published=False
    )
    expired = Announcement.objects.create(
        title='منتهي',
        body='نص',
        sector=khartoum_sector,
        status=ContentStatus.PUBLISHED,
        is_published=True,
        end_at=now - timezone.timedelta(days=2),
    )
    client = APIClient()
    res = client.get('/api/v1/cms/announcements/')
    assert res.status_code == 200
    ids = {item['id'] for item in res.data['results']}
    assert str(visible.id) in ids
    assert str(draft.id) not in ids
    assert str(expired.id) not in ids


def test_announcement_workflow_uses_shared_endpoints(writer, api_client, khartoum_sector):
    res = api_client.post(
        '/api/v1/cms/announcements/',
        {'title': 'إعلان', 'body': 'نص', 'priority': 'URGENT', 'audience': ['TRAVELERS']},
        format='json',
    )
    assert res.status_code == 201
    announcement = Announcement.objects.get(id=res.data['id'])
    assert announcement.status == ContentStatus.DRAFT
    res = api_client.post(f'/api/v1/cms/announcements/{announcement.id}/submit/')
    assert res.status_code == 200
    announcement.refresh_from_db()
    assert announcement.status == ContentStatus.REVIEW