"""اختبارات المرحلة 1: توسيع الملف الوظيفي والمسار الوظيفي.

تركيز على:
  - صحّة حقول `EmployeeProfile` الجديدة.
  - قيود النطاق على قائمتَي الموظفين والمسار.
  - أن الخدمة الذاتية لا تستطيع الكتابة في حقول الإدارة (فصل الصلاحيات).
  - التحقق من تواريخ المسار.
"""

import uuid
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.models import EmployeeTimeline, EmployeeTimelineEvent
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()

LINKABLE_URL = '/api/v1/hr/linkable-users/'


def make_user(username):
    return User.objects.create_user(
        username=username, email=f'{username}@nqp.sd', password='x',
    )


def make_profile(user, **kwargs):
    return EmployeeProfile.objects.create(
        user=user, employee_number=kwargs.pop('employee_number', f'E{uuid.uuid4().hex[:8]}'),
        **kwargs,
    )


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def sector():
    return Sector.objects.create(code='MED', name_ar='القطاع الطبي')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='HR', name_ar='إدارة الموارد البشرية', sector=sector)


@pytest.fixture
def actor():
    return make_user('hr.actor')


@pytest.fixture
def colleague(department):
    user = make_user('hr.colleague')
    OrgAssignment.objects.create(user=user, department=department, is_active=True)
    make_profile(user, full_name_ar='موظف زميل', job_title='محاسب')
    return user


@pytest.fixture
def outsider():
    other = Sector.objects.create(code='VET', name_ar='القطاع البيطري')
    other_dept = Department.objects.create(code='VETD', name_ar='قسم بيطري', sector=other)
    user = make_user('hr.outsider')
    OrgAssignment.objects.create(user=user, department=other_dept, is_active=True)
    make_profile(user, full_name_ar='موظف خارجي')
    return user


class TestProfileFields:
    def test_employment_type_default_and_choices(self, colleague):
        assert colleague.profile.employment_type == EmployeeProfile.EmploymentType.PERMANENT
        assert EmployeeProfile.EmploymentType.CONTRACT

    def test_emergency_and_qualification_fields(self):
        user = make_user('hr.fields')
        p = make_profile(
            user,
            home_address='الخرطوم',
            emergency_contact_name='أم محمد',
            emergency_contact_phone='0912345678',
            emergency_contact_relation='أم',
            degree='بكالوريوس',
            specialization='طب وقاية',
            probation_end_date=date(2026, 12, 31),
        )
        assert p.emergency_contact_phone == '0912345678'
        assert p.specialization == 'طب وقاية'
        assert p.probation_end_date == date(2026, 12, 31)

    def test_reporting_manager_self_fk(self, colleague):
        mgr = make_profile(make_user('hr.manager'), full_name_ar='المدير')
        profile = colleague.profile
        profile.reporting_manager = mgr
        profile.save(update_fields=['reporting_manager'])
        assert mgr.direct_reports.filter(pk=profile.pk).exists()


class TestTimelineModel:
    def test_event_choices_exist(self):
        assert EmployeeTimelineEvent.HIRE
        assert EmployeeTimelineEvent.TERMINATION
        assert EmployeeTimelineEvent.PROMOTION

    def test_timeline_relation_and_str(self, colleague):
        p = colleague.profile
        event = EmployeeTimeline.objects.create(
            employee=p, event=EmployeeTimelineEvent.HIRE,
            start_date=date(2020, 1, 1), new_position='محاسب أول',
        )
        assert p.timeline.count() == 1
        assert 'محاسب أول' in str(event)
        assert 'توظيف' in str(event)

    def test_timeline_cascade_delete(self, colleague):
        p = colleague.profile
        EmployeeTimeline.objects.create(employee=p, event=EmployeeTimelineEvent.HIRE)
        p.delete()
        assert EmployeeTimeline.objects.count() == 0


class TestEmployeeWriteAPI:
    """إنشاء وتعديل الملف الوظيفي — بما فيها إنشاء الحساب المرافق."""

    URL = '/api/v1/hr/employees/'

    def _client(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_create_with_new_user(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='DEPARTMENT', scope_id=department.pk)
        resp = self._client(actor).post(
            self.URL,
            {
                'new_user': {
                    'email': 'new.hr@nqp.sd',
                    'full_name': 'موظف جديد',
                    'phone': '0912345678',
                    'password': 'Str0ngPass!',
                },
                'full_name_ar': 'موظف جديد',
                'job_title': 'أخصائي موارد بشرية',
                'employment_type': 'PERMANENT',
                'employment_status': 'ACTIVE',
                'gender': 'MALE',
                'hire_date': '2026-01-15',
            },
            format='json',
        )
        assert resp.status_code == 201, resp.content
        body = resp.json()['data']
        assert body['email'] == 'new.hr@nqp.sd'
        assert body['job_title'] == 'أخصائي موارد بشرية'
        assert body['employment_type'] == 'PERMANENT'
        assert body['hire_date'] == '2026-01-15'

        # الحساب أُنشئ فعلاً، وبصلاحيات صفرية (لا أدوار).
        created = User.objects.get(email='new.hr@nqp.sd')
        assert created.profile.pk
        assert created.role is None
        assert created.is_superuser is False
        assert created.is_staff is False

    def test_create_with_existing_user(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        # حساب موجود بلا ملف وظيفي (مثل مستخدم أُنشئ من وحدة أخرى).
        target = make_user('hr.existing.noprofile')
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='GLOBAL')
        resp = self._client(actor).post(
            self.URL,
            {'user': str(target.pk), 'full_name_ar': 'مضاف', 'job_title': 'مستشار'},
            format='json',
        )
        assert resp.status_code == 201, resp.content
        assert resp.json()['data']['job_title'] == 'مستشار'
        assert resp.json()['data']['email'] == target.email

    def test_create_requires_user_or_new_user(self, actor, department, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='GLOBAL')
        resp = self._client(actor).post(
            self.URL, {'full_name_ar': 'بلا حساب'}, format='json',
        )
        assert resp.status_code == 400
        assert 'new_user' in resp.json()

    def test_create_rejects_duplicate_email(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='GLOBAL')
        resp = self._client(actor).post(
            self.URL,
            {'new_user': {'email': colleague.email}, 'full_name_ar': 'مكرر'},
            format='json',
        )
        assert resp.status_code == 400
        assert 'new_user' in resp.json()

    def test_create_rejects_second_profile_for_user(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='GLOBAL')
        resp = self._client(actor).post(
            self.URL, {'user': str(colleague.pk), 'full_name_ar': 'مكرر'}, format='json',
        )
        assert resp.status_code == 400

    def test_patch_updates_profile(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:edit'], scope_type='GLOBAL')
        resp = self._client(actor).patch(
            f"{self.URL}{colleague.profile.pk}/",
            {'job_title': 'رئيس قسم', 'employment_type': 'CONTRACT'},
            format='json',
        )
        assert resp.status_code == 200, resp.content
        colleague.profile.refresh_from_db()
        assert colleague.profile.job_title == 'رئيس قسم'
        assert colleague.profile.employment_type == 'CONTRACT'

    def test_cannot_be_own_manager(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:edit'], scope_type='GLOBAL')
        resp = self._client(actor).patch(
            f"{self.URL}{colleague.profile.pk}/",
            {'reporting_manager': str(colleague.profile.pk)},
            format='json',
        )
        assert resp.status_code == 400

    def test_rejects_reporting_cycle(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        # b تحت a؛ جعل a مدير b يكسر acyclic invariant
        a = colleague.profile
        b = make_profile(make_user('hr.boss'), full_name_ar='رئيس')
        a.reporting_manager = b
        a.save(update_fields=['reporting_manager'])
        grant_permissions(actor, 'HRA', ['hr_employee:edit'], scope_type='GLOBAL')
        resp = self._client(actor).patch(
            f"{self.URL}{b.pk}/", {'reporting_manager': str(a.pk)}, format='json',
        )
        assert resp.status_code == 400


class TestEmployeeScopeAPI:
    URL = '/api/v1/hr/employees/'

    def _client(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_list_scoped_to_actor_scope(self, actor, department, colleague, outsider, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        make_profile(actor)
        grant_permissions(actor, 'HRV', ['hr_employee:view'], scope_type='DEPARTMENT', scope_id=department.pk)
        resp = self._client(actor).get(self.URL)
        assert resp.status_code == 200
        ids = {r['id'] for r in resp.json()['data']['results']}
        assert str(colleague.profile.id) in ids
        assert str(outsider.profile.id) not in ids

    def test_list_denied_without_scope(self, actor, outsider, grant_permissions):
        make_profile(actor)
        grant_permissions(actor, 'HRV', ['hr_employee:view'], scope_type='DEPARTMENT', scope_id=uuid.uuid4())
        resp = self._client(actor).get(self.URL)
        assert resp.status_code == 200
        assert resp.json()['data']['count'] == 0

    def test_list_denied_without_permission(self, actor):
        resp = self._client(actor).get(self.URL)
        assert resp.status_code == 403

    def test_create_outside_scope_forbidden(self, actor, outsider, grant_permissions):
        # `outsider` لديه ملف مسبق (OneToOne) فالتعارف غير المطلوب يسبق
        # فحص النطاق؛ ننشئ مستخدماً بلا ملف لاختبار النطاق صريحاً.
        target = make_user('hr.outsider.noprofile')
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='DEPARTMENT', scope_id=uuid.uuid4())
        resp = self._client(actor).post(
            self.URL, {'user': str(target.pk), 'full_name_ar': 'x'}, format='json',
        )
        assert resp.status_code == 403

    def test_filter_and_search(self, actor, colleague, grant_permissions):
        # النطاق الوطني = `GLOBAL` (لا يوجد نوع `NATIONAL` في `SCOPE_LOOKUPS`).
        grant_permissions(actor, 'HRA', ['hr_employee:view'], scope_type='GLOBAL')
        client = self._client(actor)
        resp = client.get(self.URL, {'search': colleague.profile.employee_number})
        assert resp.status_code == 200
        data = resp.json()['data']
        assert data['count'] >= 1
        ids = {r['id'] for r in data['results']}
        assert str(colleague.profile.id) in ids

        resp = client.get(self.URL, {'employment_status': 'ACTIVE'})
        assert resp.status_code == 200
        assert resp.json()['data']['count'] >= 1

        resp = client.get(self.URL, {'employment_type': 'PERMANENT'})
        assert resp.status_code == 200
        assert resp.json()['data']['count'] >= 1

    def test_national_sees_all(self, actor, colleague, outsider):
        actor.is_superuser = True
        actor.save(update_fields=['is_superuser'])
        make_profile(actor)
        resp = self._client(actor).get(self.URL)
        assert resp.status_code == 200
        assert resp.json()['data']['count'] == 3


class TestTimelineAPI:
    URL = '/api/v1/hr/employee-timeline/'

    def _client(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_timeline_scoped(self, actor, department, colleague, outsider, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        EmployeeTimeline.objects.create(employee=colleague.profile, event=EmployeeTimelineEvent.HIRE)
        EmployeeTimeline.objects.create(employee=outsider.profile, event=EmployeeTimelineEvent.HIRE)
        grant_permissions(actor, 'HRV', ['hr_employee:view'], scope_type='DEPARTMENT', scope_id=department.pk)
        resp = self._client(actor).get(self.URL)
        assert resp.status_code == 200
        assert resp.json()['data']['count'] == 1

    def test_timeline_filter_by_event_and_search(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        EmployeeTimeline.objects.create(
            employee=colleague.profile, event=EmployeeTimelineEvent.PROMOTION,
            new_position='مدير', reason='ترقية تقديرية',
        )
        EmployeeTimeline.objects.create(
            employee=colleague.profile, event=EmployeeTimelineEvent.TRANSFER,
            new_department='الشؤون القانونية',
        )
        grant_permissions(actor, 'HRV', ['hr_employee:view'], scope_type='DEPARTMENT', scope_id=department.pk)
        client = self._client(actor)

        resp = client.get(self.URL, {'event': 'PROMOTION'})
        assert resp.status_code == 200
        assert resp.json()['data']['count'] == 1

        resp = client.get(self.URL, {'search': 'ترقية تقديرية'})
        assert resp.status_code == 200
        assert resp.json()['data']['count'] == 1

    def test_create_sets_created_by(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='DEPARTMENT', scope_id=department.pk)
        resp = self._client(actor).post(
            self.URL,
            {'employee': str(colleague.profile.pk), 'event': 'PROMOTION', 'start_date': '2026-01-01'},
            format='json',
        )
        assert resp.status_code == 201, resp.data
        event = EmployeeTimeline.objects.get()
        assert event.created_by == actor

    def test_create_outside_scope_forbidden(self, actor, outsider, grant_permissions):
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='DEPARTMENT', scope_id=uuid.uuid4())
        resp = self._client(actor).post(
            self.URL,
            {'employee': str(outsider.profile.pk), 'event': 'HIRE', 'start_date': '2026-01-01'},
            format='json',
        )
        assert resp.status_code == 403

    def test_end_before_start_rejected(self, actor, department, colleague, grant_permissions):
        OrgAssignment.objects.create(user=actor, department=department, is_active=True)
        grant_permissions(actor, 'HRA', ['hr_employee:add'], scope_type='DEPARTMENT', scope_id=department.pk)
        resp = self._client(actor).post(
            self.URL,
            {
                'employee': str(colleague.profile.pk),
                'event': 'LEAVE_START',
                'start_date': '2026-05-10',
                'end_date': '2026-05-01',
            },
            format='json',
        )
        assert resp.status_code == 400
        assert 'end_date' in resp.data


class TestSelfServiceSecurity:
    """الخدمة الذاتية لا تكتب حقول الإدارة."""

    def _patch(self, user, payload):
        c = APIClient()
        c.force_authenticate(user)
        return c.patch('/api/v1/auth/profile/', payload, format='json')

    def test_cannot_self_edit_employment_type(self, colleague):
        resp = self._patch(colleague, {'profile': {'employment_type': 'CONTRACT'}})
        assert resp.status_code in (200, 400)
        colleague.profile.refresh_from_db()
        assert colleague.profile.employment_type == 'PERMANENT'

    def test_cannot_self_edit_reporting_manager(self, colleague):
        mgr = colleague.profile
        resp = self._patch(colleague, {'profile': {'reporting_manager': str(mgr.pk)}})
        assert resp.status_code in (200, 400)
        colleague.profile.refresh_from_db()
        assert colleague.profile.reporting_manager_id is None

    def test_cannot_self_edit_employee_number(self, colleague):
        original = colleague.profile.employee_number
        resp = self._patch(colleague, {'profile': {'employee_number': 'HACK-1'}})
        colleague.profile.refresh_from_db()
        assert colleague.profile.employee_number == original

    def test_can_self_edit_emergency_contact(self, colleague):
        resp = self._patch(colleague, {
            'profile': {
                'emergency_contact_name': 'أبو محمد',
                'emergency_contact_phone': '0911222333',
            }
        })
        assert resp.status_code == 200, resp.data
        colleague.profile.refresh_from_db()
        assert colleague.profile.emergency_contact_phone == '0911222333'


class TestLinkableUsersAPI:
    """`/hr/linkable-users/` — مرشحو «ربط حساب موجود».

    نموذج الموظف يرفض `user` له ملف مسبقاً، فقائمة الموظفين (profiles)
    مرشحات يرفضها الخادم كلها. هذا الـendpoint هو المصدر الصحيح.
    """

    def _mk_user(self, username, name=''):
        u = make_user(username)
        if name:
            u.full_name = name
            u.save()
        return u

    def test_lists_only_users_without_profile(self, grant_permissions, actor):
        plain = self._mk_user('link.plain', 'بلا ملف')
        profiled = self._mk_user('link.profiled', 'له ملف')
        make_profile(profiled, full_name_ar='له ملف')

        grant_permissions(actor, 'HRLINK1', ['hr_employee:view'])
        ids = [r['id'] for r in client_for(actor).get(LINKABLE_URL).json()['data']['results']]
        assert str(plain.pk) in ids
        assert str(profiled.pk) not in ids

    def test_excludes_inactive_accounts(self, grant_permissions, actor):
        u = self._mk_user('link.inactive', 'موقوف')
        u.is_active = False
        u.save()
        grant_permissions(actor, 'HRLINK2', ['hr_employee:view'])
        ids = [r['id'] for r in client_for(actor).get(LINKABLE_URL).json()['data']['results']]
        assert str(u.pk) not in ids

    def test_requires_authentication(self):
        assert APIClient().get(LINKABLE_URL).status_code == 401

    def test_requires_permission(self, actor):
        assert client_for(actor).get(LINKABLE_URL).status_code == 403

    def test_search_by_name(self, grant_permissions, actor):
        self._mk_user('link.findme', 'الاسم المطلوب')
        self._mk_user('link.other', 'اسم آخر')
        grant_permissions(actor, 'HRLINK3', ['hr_employee:view'])
        data = client_for(actor).get(LINKABLE_URL, {'search': 'الاسم المطلوب'}).json()['data']
        assert data['count'] == 1
        assert data['results'][0]['full_name'] == 'الاسم المطلوب'

    def test_scoped_to_actor_scope(self, grant_permissions, actor, department):
        in_scope = self._mk_user('link.inside', 'داخل')
        out_scope = self._mk_user('link.outside', 'خارج')
        OrgAssignment.objects.create(user=in_scope, department=department, is_active=True)
        other = Department.objects.create(name_ar='قسم آخر', code=f'LU{str(uuid.uuid4())[:8]}')
        OrgAssignment.objects.create(user=out_scope, department=other, is_active=True)

        grant_permissions(actor, 'HRLINK4', ['hr_employee:view'],
                          scope_type='DEPARTMENT', scope_id=department.pk)
        ids = [r['id'] for r in client_for(actor).get(LINKABLE_URL).json()['data']['results']]
        assert str(in_scope.pk) in ids
        assert str(out_scope.pk) not in ids

    def test_label_falls_back_to_username(self, grant_permissions, actor):
        u = self._mk_user('link.nolabel')
        grant_permissions(actor, 'HRLINK5', ['hr_employee:view'])
        row = next(r for r in client_for(actor).get(LINKABLE_URL).json()['data']['results']
                   if r['id'] == str(u.pk))
        assert row['label'] == 'link.nolabel'
