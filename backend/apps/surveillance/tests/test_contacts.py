import pytest

from apps.surveillance.models.contact import (
    ContactTrace,
    ContactStatus,
    ContactType,
    ContactFollowUp,
    FollowUpStatus,
)
from apps.surveillance.models.case import HealthCase
from apps.surveillance.services.workflows import ContactWorkflowService

pytestmark = pytest.mark.django_db


@pytest.fixture
def case(world, officer_user):
    return HealthCase.objects.create(
        disease=world['disease'],
        person_name='عبير التجاني',
        person_age=30,
        person_sex='F',
        port=world['port'],
        sector=world['sector'],
        reported_by=officer_user,
        source='MANUAL',
    )


@pytest.fixture
def contact(world, officer_user, case):
    return ContactTrace.objects.create(
        index_case=case,
        person_name='محمد أحمد',
        age=25,
        sex='M',
        phone='0911111111',
        port=world['port'],
        sector=world['sector'],
        contact_type=ContactType.FAMILY,
        status=ContactStatus.UNDER_MONITORING,
        assigned_to=officer_user,
        follow_up_days=14,
        follow_up_start='2026-09-12',
    )


# ==============================================================================
# نموذج المخالط والمتابعات
# ==============================================================================

def test_contact_number_auto_generated(contact):
    assert contact.contact_number


def test_add_followup_ok(officer_user, contact):
    up = ContactWorkflowService.add_followup(
        contact, {'status': FollowUpStatus.OK, 'temperature': '36.5'}, officer_user
    )
    assert up.contact_id == contact.id
    assert up.checked_by_id == officer_user.id


def test_add_followup_symptomatic_updates_contact(officer_user, contact):
    ContactWorkflowService.add_followup(
        contact, {'status': FollowUpStatus.SYMPTOMATIC}, officer_user
    )
    contact.refresh_from_db()
    assert contact.status == ContactStatus.SYMPTOMATIC


def test_missed_followups_count(officer_user, contact):
    # بدون متابعات يجب أن يكون الرقم > 0 بعد أيام
    count = contact.get_missed_followups_count()
    assert count is not None


def test_check_overdue_followups(officer_user, contact):
    # قم بتعيين start قريب، لا يوجد متابعات → المبشرات ستنشأ
    from apps.surveillance.models.notification import Notification
    count = ContactWorkflowService.check_overdue_followups()
    assert isinstance(count, int)
    # إن وجدت أشعار للمخالف
    Notification.objects.all().delete()


# ==============================================================================
# واجهات API
# ==============================================================================

def test_contacts_requires_authentication(api_client, world):
    resp = api_client.get('/api/v1/surveillance/contacts/')
    assert resp.status_code in (401, 403)


def test_create_contact_api(login, officer_user, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:add', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        '/api/v1/surveillance/contacts/',
        {
            'index_case': case.id,
            'person_name': 'مخالط جديد',
            'age': 30,
            'sex': 'M',
            'contact_type': 'FAMILY',
            'last_exposure_date': '2026-09-11',
            'port': world['port'].id,
            'sector': world['sector'].id,
        },
        format='json',
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()['data']['contact_number']


def test_list_contacts(login, officer_user, contact, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:view'])
    client = login(officer_user)
    resp = client.get('/api/v1/surveillance/contacts/')
    assert resp.status_code == 200
    assert resp.json()['data']['count'] >= 1


def test_contact_add_followup_api(login, officer_user, contact, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    resp = client.post(
        f'/api/v1/surveillance/contacts/{contact.id}/follow-up/',
        {'status': FollowUpStatus.OK, 'temperature': '36.7'},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    contact.refresh_from_db()
    assert contact.follow_ups.count() == 1


def test_contact_followups_list(login, officer_user, contact, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    up = ContactWorkflowService.add_followup(
        contact, {'status': FollowUpStatus.OK}, officer_user
    )
    resp = client.get(f'/api/v1/surveillance/contacts/{contact.id}/follow-ups/')
    assert resp.status_code == 200
    assert len(resp.json()['data']) == 1


def test_contact_converted_updates_status(login, officer_user, contact, case, world, grant_permissions):
    grant_permissions(officer_user, codes=['surveillance:edit', 'surveillance:view'])
    client = login(officer_user)
    converted = HealthCase.objects.create(
        disease=case.disease, person_name='حالة جديدة من مخالط',
        port=world['port'], sector=world['sector'], reported_by=officer_user, source='MANUAL',
    )
    resp = client.post(
        f'/api/v1/surveillance/contacts/{contact.id}/follow-up/',
        {'status': 'CONVERTED', 'converted_case': converted.id},
        format='json',
    )
    assert resp.status_code == 201, resp.content
    contact.refresh_from_db()
    assert contact.status == ContactStatus.CONVERTED_CASE