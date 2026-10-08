"""اختبارات المرحلة 4: سجلات الحضور والانصراف.

تركيز على ما يُفسد الرواتب فعلياً:
  - لا سجلَّان لنفس الموظف في نفس اليوم.
  - الحالة بلا أوقات لا تقبل أوقاتاً والعكس.
  - الاعتماد لا يكون للمُسجِّل نفسه.
  - سجل معتمد لا يُعدَّل ولا يُحذف.
  - الموظف يرى سجلاته هو، وي summary محسوباً من سجلاته وحدها.
"""

import uuid
from datetime import date, time, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.models import AttendanceRecord, AttendanceStatus
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()
ATTENDANCE_URL = '/api/v1/hr/attendance/'


def make_user(username, name=''):
    u = User.objects.create_user(
        username=username, email=f'{username}@nqp.sd', password='x',
    )
    if name:
        u.full_name = name
        u.save()
    return u


def make_profile(user, **kwargs):
    return EmployeeProfile.objects.create(
        user=user,
        employee_number=kwargs.pop('employee_number', f'E{uuid.uuid4().hex[:8]}'),
        **kwargs,
    )


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def sector():
    return Sector.objects.create(code='AT1', name_ar='قطاع')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='AD1', name_ar='قسم الحضور', sector=sector)


@pytest.fixture
def staff(department):
    u = make_user('at.staff', 'موظف الحضور')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    make_profile(u, full_name_ar='موظف الحضور')
    return u


@pytest.fixture
def recorder(department):
    u = make_user('at.recorder', 'مسجّل الحضور')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


@pytest.fixture
def approver(department):
    u = make_user('at.approver', 'معتمد الحضور')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


def make_record(employee, recorder, **kwargs):
    kwargs.setdefault('date', date(2026, 3, 1))
    kwargs.setdefault('status', AttendanceStatus.PRESENT)
    kwargs.setdefault('check_in', time(8, 0))
    kwargs.setdefault('check_out', time(16, 0))
    return AttendanceRecord.objects.create(employee=employee, recorded_by=recorder, **kwargs)


class TestAttendancePermissions:
    def test_requires_authentication(self):
        assert APIClient().get(ATTENDANCE_URL).status_code == 401

    def test_hr_without_permission_denied(self, recorder):
        assert client_for(recorder).get(ATTENDANCE_URL).status_code == 403

    def test_hr_with_view_lists(self, recorder, staff, grant_permissions):
        make_record(staff.profile, recorder)
        grant_permissions(recorder, 'A1', ['hr_attendance:view'])
        assert client_for(recorder).get(ATTENDANCE_URL).status_code == 200

    def test_employee_reads_own_records_only(self, recorder, staff, department):
        mine = make_record(staff.profile, recorder)
        colleague = make_user('at.colleague', 'زميل')
        OrgAssignment.objects.create(user=colleague, department=department, is_active=True)
        make_profile(colleague, full_name_ar='زميل')
        make_record(colleague.profile, recorder)

        rows = client_for(staff).get(ATTENDANCE_URL).json()['data']
        assert rows['count'] == 1
        assert rows['results'][0]['id'] == str(mine.pk)

    def test_employee_cannot_approve(self, recorder, staff):
        rec = make_record(staff.profile, recorder)
        assert client_for(staff).post(
            f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_approve_requires_approve_permission(self, recorder, staff, approver, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(approver, 'A2', ['hr_attendance:view', 'hr_attendance:edit'])
        assert client_for(approver).post(
            f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_employee_cannot_create_own_record(self, staff):
        res = client_for(staff).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-01',
            'status': AttendanceStatus.PRESENT,
            'check_in': '08:00',
        }, format='json')
        assert res.status_code == 403


class TestAttendanceRules:
    def test_duplicate_employee_date_rejected(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A3', ['hr_attendance:add'])
        c = client_for(recorder)
        payload = {
            'employee': str(staff.profile.pk),
            'date': '2026-03-01',
            'status': AttendanceStatus.PRESENT,
            'check_in': '08:00',
            'check_out': '16:00',
        }
        assert c.post(ATTENDANCE_URL, payload, format='json').status_code == 201
        assert c.post(ATTENDANCE_URL, payload, format='json').status_code == 400

    def test_absent_rejects_punch_times(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A4', ['hr_attendance:add'])
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-02',
            'status': AttendanceStatus.ABSENT,
            'check_in': '08:00',
        }, format='json')
        assert res.status_code == 400

    def test_present_requires_check_in(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A5', ['hr_attendance:add'])
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-03',
            'status': AttendanceStatus.PRESENT,
        }, format='json')
        assert res.status_code == 400

    def test_check_out_before_check_in_rejected(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A6', ['hr_attendance:add'])
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-04',
            'status': AttendanceStatus.PRESENT,
            'check_in': '16:00',
            'check_out': '08:00',
        }, format='json')
        assert res.status_code == 400

    def test_future_date_rejected(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A7', ['hr_attendance:add'])
        future = (date.today() + timedelta(days=3)).isoformat()
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': future,
            'status': AttendanceStatus.PRESENT,
            'check_in': '08:00',
        }, format='json')
        assert res.status_code == 400

    def test_recorded_by_taken_from_actor(self, recorder, staff, approver, grant_permissions):
        """`recorded_by` من هوية المرسل، لا من جسم الطلب."""
        grant_permissions(recorder, 'A8', ['hr_attendance:add'])
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-05',
            'status': AttendanceStatus.PRESENT,
            'check_in': '08:00',
            'recorded_by': str(approver.pk),
        }, format='json')
        assert res.status_code == 201
        assert AttendanceRecord.objects.get(employee=staff.profile).recorded_by_id == recorder.pk

    def test_is_approved_cannot_be_forced_on_create(self, recorder, staff, grant_permissions):
        grant_permissions(recorder, 'A9', ['hr_attendance:add'])
        res = client_for(recorder).post(ATTENDANCE_URL, {
            'employee': str(staff.profile.pk),
            'date': '2026-03-06',
            'status': AttendanceStatus.PRESENT,
            'check_in': '08:00',
            'is_approved': True,
        }, format='json')
        assert res.status_code == 201
        assert AttendanceRecord.objects.get(employee=staff.profile).is_approved is False


class TestAttendanceApproval:
    def test_recorder_cannot_approve_own_record(self, recorder, staff, grant_permissions):
        """من يُسجّل حضور يوم لا يوثّقه في السجل نفسه."""
        rec = make_record(staff.profile, recorder)
        grant_permissions(recorder, 'A10', ['hr_attendance:approve', 'hr_attendance:add'])
        res = client_for(recorder).post(
            f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json',
        )
        assert res.status_code == 400
        rec.refresh_from_db()
        assert rec.is_approved is False

    def test_approver_approves(self, recorder, staff, approver, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(approver, 'A11', ['hr_attendance:approve'])
        res = client_for(approver).post(
            f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json',
        )
        assert res.status_code == 200
        rec.refresh_from_db()
        assert rec.is_approved is True
        assert rec.approved_by_id == approver.pk
        assert rec.approved_at is not None

    def test_double_approval_refused(self, recorder, staff, approver, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(approver, 'A12', ['hr_attendance:approve'])
        c = client_for(approver)
        assert c.post(f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json').status_code == 200
        assert c.post(f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json').status_code == 400

    def test_approved_record_cannot_be_edited(self, recorder, staff, approver, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(
            approver, 'A13', ['hr_attendance:approve'],
        )
        client_for(approver).post(f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json')
        grant_permissions(recorder, 'A13R', ['hr_attendance:edit'])
        res = client_for(recorder).patch(
            f'{ATTENDANCE_URL}{rec.pk}/', {'overtime_minutes': 999}, format='json',
        )
        assert res.status_code == 400
        rec.refresh_from_db()
        assert rec.overtime_minutes == 0

    def test_approved_record_cannot_be_deleted(self, recorder, staff, grant_permissions):
        """سجل معتمد واقعة محاسبية: لا يُحذف حتى بمن له `delete`.

        `destroy` مُغلق على الخدمة الذاتية دائماً، فالمسار كله محمي؛
        ومع ذلك يبقى `perform_destroy` حارساً ثانياً لو فُتح المسار لاحقاً.
        """
        rec = make_record(staff.profile, recorder)
        grant_permissions(recorder, 'A14', ['hr_attendance:approve', 'hr_attendance:delete'])
        client_for(recorder).post(f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json')
        rec.refresh_from_db()
        assert rec.is_approved is False  # المُسجِّل لا يعتمد سجله
        # يعيد الاعتماد بمُعتمد آخر
        grant_permissions(staff, 'A14B', ['hr_attendance:approve'])
        approver2 = make_user('at.approver2', 'معتمد آخر')
        grant_permissions(approver2, 'A14C', ['hr_attendance:approve', 'hr_attendance:delete'])
        assert client_for(approver2).post(
            f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json',
        ).status_code == 200
        assert client_for(approver2).delete(f'{ATTENDANCE_URL}{rec.pk}/').status_code in (400, 403)
        assert AttendanceRecord.objects.filter(pk=rec.pk).exists()

    def test_unapproved_record_deletable_by_hr(self, recorder, staff, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(recorder, 'A14D', ['hr_attendance:delete'])
        assert client_for(recorder).delete(f'{ATTENDANCE_URL}{rec.pk}/').status_code == 204
        assert not AttendanceRecord.objects.filter(pk=rec.pk).exists()

    def test_unapprove_allows_edit_again(self, recorder, staff, approver, grant_permissions):
        rec = make_record(staff.profile, recorder)
        grant_permissions(approver, 'A15', ['hr_attendance:approve', 'hr_attendance:edit'])
        c = client_for(approver)
        c.post(f'{ATTENDANCE_URL}{rec.pk}/approve/', {}, format='json')
        assert c.post(f'{ATTENDANCE_URL}{rec.pk}/unapprove/', {}, format='json').status_code == 200
        res = c.patch(f'{ATTENDANCE_URL}{rec.pk}/', {'overtime_minutes': 45}, format='json')
        assert res.status_code == 200


class TestAttendanceSummary:
    def test_summary_counts_from_own_records(self, recorder, staff):
        # النافذة «آخر N يوماً حتى اليوم»، فالتواريخ النسبية لesterday.
        t = date.today()
        make_record(staff.profile, recorder, date=t, status=AttendanceStatus.PRESENT)
        make_record(staff.profile, recorder, date=t - timedelta(days=1),
                    status=AttendanceStatus.LATE, check_in=time(9, 0))
        make_record(staff.profile, recorder, date=t - timedelta(days=2),
                    status=AttendanceStatus.ABSENT, check_in=None, check_out=None)

        data = client_for(staff).get(f'{ATTENDANCE_URL}summary/').json()['data']
        assert data['present_days'] == 1
        assert data['late_days'] == 1
        assert data['absent_days'] == 1
        assert data['pending_approval'] == 3

    def test_summary_excludes_other_employees(self, recorder, staff, department):
        colleague = make_user('at.other', 'آخر')
        OrgAssignment.objects.create(user=colleague, department=department, is_active=True)
        make_profile(colleague, full_name_ar='آخر')
        make_record(colleague.profile, recorder, date=date.today())

        data = client_for(staff).get(f'{ATTENDANCE_URL}summary/').json()['data']
        assert data['present_days'] == 0

    def test_worked_minutes_computed(self, recorder, staff):
        rec = make_record(
            staff.profile, recorder, date=date.today(),
            check_in=time(8, 0), check_out=time(16, 30), overtime_minutes=30,
        )
        assert rec.worked_minutes() == 510
        assert rec.total_minutes() == 540

    def test_summary_without_profile_returns_empty(self, grant_permissions):
        # مستخدم بلا `EmployeeProfile`: لا تجميع له، ويردّ المسار بفراغ
        # لا بخطأ 500.
        bare = make_user('at.bare', 'بلا ملف')
        grant_permissions(bare, 'A16', ['hr_attendance:view'])
        res = client_for(bare).get(f'{ATTENDANCE_URL}summary/')
        assert res.status_code == 200
        assert res.json()['data'] == {}
