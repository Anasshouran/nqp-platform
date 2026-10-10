"""اختبارات المرحلة 5: الإجازات والأرصدة.

تركيز على صحة الأرقام لأنها تدخل الرواتب لاحقاً:
  - `taken` و`pending` و`available` مشتقّة، فلا تتناقض مع الطلبات.
  - الإرسال يحجز الأيام، والاعتماد ينقلها من محجوز إلى مأخوذ، والرفض
    والإلغاء يفرّغانها — فلا تُصرف الأيام مرتين.
  - طلبان متداخلان لنفس الموظف مرفوضان.
  - نوع الإجازة الذي يطلب مستنداً لا يُعتمد بلا مرفق.
  - المعتمد لا يعتمد الطلب الذي رفعه.
"""

import uuid
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.leave_service import count_days
from apps.hr.models import (
    EmployeeTimeline,
    EmployeeTimelineEvent,
    LeaveBalance,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
)
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()
LEAVE_URL = '/api/v1/hr/leave-requests/'
BALANCE_URL = '/api/v1/hr/leave-balances/'
TYPES_URL = '/api/v1/hr/leave-types/'


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
    return Sector.objects.create(code='LV1', name_ar='قطاع')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='LD1', name_ar='قسم الإجازات', sector=sector)


@pytest.fixture
def annual():
    return LeaveType.objects.create(
        code='ANNUAL', name_ar='إجازة سنوية',
        default_entitlement_days=21, max_consecutive_days=14,
    )


@pytest.fixture
def sick():
    return LeaveType.objects.create(
        code='SICK', name_ar='إجازة مرضية',
        requires_document=True, default_entitlement_days=10,
    )


@pytest.fixture
def staff(department):
    u = make_user('lv.staff', 'طالب الإجازة')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    make_profile(u, full_name_ar='طالب الإجازة')
    return u


@pytest.fixture
def specialist(department):
    u = make_user('lv.specialist', 'أخصائية الموارد')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


@pytest.fixture
def approver(department):
    u = make_user('lv.approver', 'معتمد الإجازات')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


def make_request(employee, requester, leave_type=None, days=5, status=LeaveRequestStatus.DRAFT,
                 start=None, **kwargs):
    start = start or date(2026, 6, 1)
    return LeaveRequest.objects.create(
        employee=employee, leave_type=leave_type, status=status,
        requested_by=requester, is_self_service=kwargs.pop('is_self_service', False),
        start_date=start, end_date=start + timedelta(days=days - 1),
        year=start.year, days=days, **kwargs,
    )


class TestDayCounting:
    def test_inclusive_of_both_ends(self):
        assert count_days(date(2026, 6, 1), date(2026, 6, 5)) == 5

    def test_single_day(self):
        assert count_days(date(2026, 6, 1), date(2026, 6, 1)) == 1

    def test_half_day(self):
        assert count_days(date(2026, 6, 1), date(2026, 6, 1), True) == 0.5

    def test_end_before_start_raises(self):
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError):
            count_days(date(2026, 6, 5), date(2026, 6, 1))


class TestBalanceMath:
    def test_available_is_derived_not_stored(self, staff, annual):
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026,
            entitled_days=21, carried_over_days=3,
        )
        assert b.available_days() == 24
        assert 'available' not in [f.name for f in LeaveBalance._meta.get_fields()]

    def test_submitted_request_reserves_days(self, staff, annual, specialist):
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.SUBMITTED)
        assert b.pending_days() == 5
        assert b.available_days() == 16

    def test_approved_moves_pending_to_taken(self, staff, annual, specialist):
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.APPROVED, decided_by=specialist)
        assert b.taken_days() == 5
        assert b.pending_days() == 0
        assert b.available_days() == 16

    def test_rejected_releases_reservation(self, staff, annual, specialist):
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.REJECTED, decided_by=specialist,
                     rejection_reason='ضغط العمل')
        assert b.pending_days() == 0
        assert b.available_days() == 21

    def test_draft_request_does_not_reserve(self, staff, annual, specialist):
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.DRAFT)
        assert b.pending_days() == 0
        assert b.available_days() == 21

    def test_overspend_shows_negative_not_silent_clip(self, staff, annual, specialist):
        """الموظف استنفد رصيده ثم قُدّم طلب سابق اعتماده: يظهر سالباً."""
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=3,
        )
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.APPROVED, decided_by=specialist)
        assert b.available_days() == -2

    def test_unique_per_employee_type_year(self, staff, annual):
        LeaveBalance.objects.create(employee=staff.profile, leave_type=annual, year=2026, entitled_days=21)
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            LeaveBalance.objects.create(
                employee=staff.profile, leave_type=annual, year=2026, entitled_days=30,
            )


class TestLeaveRequestRules:
    def test_overlapping_requests_rejected(self, staff, annual, specialist):
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.SUBMITTED)
        from apps.hr import leave_service
        second = make_request(staff.profile, specialist, annual, days=3,
                              status=LeaveRequestStatus.DRAFT,
                              start=date(2026, 6, 3))
        with pytest.raises(Exception):
            leave_service.submit_leave(second, specialist)

    def test_adjacent_non_overlapping_allowed(self, staff, annual, specialist):
        from apps.hr import leave_service
        make_request(staff.profile, specialist, annual, days=5,
                     status=LeaveRequestStatus.SUBMITTED)  # 1-5 June
        # 6 June يبدأ بعد 5 فلا يتقاطعان
        second = make_request(staff.profile, specialist, annual, days=2,
                              status=LeaveRequestStatus.DRAFT, start=date(2026, 6, 6))
        second.save()
        leave_service.submit_leave(second, specialist)
        second.refresh_from_db()
        assert second.status == LeaveRequestStatus.SUBMITTED

    def test_max_consecutive_days_enforced(self, staff, annual, specialist, grant_permissions):
        grant_permissions(specialist, 'L1', ['hr_leave:add'])
        res = client_for(specialist).post(LEAVE_URL, {
            'employee': str(staff.profile.pk),
            'leave_type': str(annual.pk),
            'start_date': '2026-06-01',
            'end_date': '2026-06-20',   # السقف 14
        }, format='json')
        assert res.status_code == 400

    def test_year_and_days_derived_by_server(self, staff, annual, specialist, grant_permissions):
        grant_permissions(specialist, 'L2', ['hr_leave:add'])
        res = client_for(specialist).post(LEAVE_URL, {
            'employee': str(staff.profile.pk),
            'leave_type': str(annual.pk),
            'start_date': '2026-07-10',
            'end_date': '2026-07-12',
        }, format='json')
        assert res.status_code == 201
        saved = LeaveRequest.objects.get(pk=res.json()['data']['id'])
        assert saved.year == 2026
        assert saved.days == 3

    def test_client_cannot_contradict_dates(self, staff, annual, specialist, grant_permissions):
        """`days` من الخادم فقط: إرسال قيمة تناقض التواريخ لا يجدي."""
        grant_permissions(specialist, 'L3', ['hr_leave:add'])
        res = client_for(specialist).post(LEAVE_URL, {
            'employee': str(staff.profile.pk),
            'leave_type': str(annual.pk),
            'start_date': '2026-07-10',
            'end_date': '2026-07-12',
            'days': 99,
            'year': 1999,
        }, format='json')
        assert res.status_code == 201
        saved = LeaveRequest.objects.get(pk=res.json()['data']['id'])
        assert saved.days == 3
        assert saved.year == 2026

    def test_document_required_type_blocks_approval(self, staff, sick, specialist, approver,
                                                   grant_permissions):
        req = make_request(staff.profile, specialist, sick, days=2,
                           status=LeaveRequestStatus.SUBMITTED, decided_by=None)
        grant_permissions(approver, 'L4', ['hr_leave:approve'])
        res = client_for(approver).post(f'{LEAVE_URL}{req.pk}/approve/', {}, format='json')
        assert res.status_code == 400
        req.refresh_from_db()
        assert req.status == LeaveRequestStatus.SUBMITTED

    def test_document_satisfies_approval(self, staff, sick, specialist, approver, grant_permissions):
        req = make_request(staff.profile, specialist, sick, days=2,
                           status=LeaveRequestStatus.SUBMITTED, document='تقرير-1.pdf')
        grant_permissions(approver, 'L5', ['hr_leave:approve'])
        res = client_for(approver).post(f'{LEAVE_URL}{req.pk}/approve/', {}, format='json')
        assert res.status_code == 200

    def test_submit_rejected_when_balance_insufficient(self, staff, annual, specialist):
        from apps.hr import leave_service
        LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=2,
        )
        req = make_request(staff.profile, specialist, annual, days=5,
                           status=LeaveRequestStatus.DRAFT)
        with pytest.raises(Exception):
            leave_service.submit_leave(req, specialist)

    def test_submit_allowed_when_balance_sufficient(self, staff, annual, specialist):
        from apps.hr import leave_service
        LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=10,
        )
        req = make_request(staff.profile, specialist, annual, days=5,
                           status=LeaveRequestStatus.DRAFT)
        leave_service.submit_leave(req, specialist)
        req.refresh_from_db()
        assert req.status == LeaveRequestStatus.SUBMITTED

    def test_unlimited_type_skips_balance_check(self, staff, specialist):
        """نوع بلا سقف (مرضية) لا يحتاج رصيداً."""
        from apps.hr import leave_service
        unlimited = LeaveType.objects.create(
            code='UNL', name_ar='إجازة بلا سقف', default_entitlement_days=None,
        )
        req = make_request(staff.profile, specialist, unlimited, days=30,
                           status=LeaveRequestStatus.DRAFT)
        leave_service.submit_leave(req, specialist)
        req.refresh_from_db()
        assert req.status == LeaveRequestStatus.SUBMITTED


class TestLeavePermissions:
    def test_requires_authentication(self):
        assert APIClient().get(LEAVE_URL).status_code == 401

    def test_hr_without_permission_denied(self, specialist):
        assert client_for(specialist).get(LEAVE_URL).status_code == 403

    def test_employee_files_own_request(self, staff, annual):
        """الخدمة الذاتية: الموظف يرفع طلبه بلا صلاحية `hr_leave`."""
        res = client_for(staff).post(LEAVE_URL, {
            'employee': str(staff.profile.pk),
            'leave_type': str(annual.pk),
            'start_date': '2026-08-01',
            'end_date': '2026-08-03',
        }, format='json')
        assert res.status_code == 201
        saved = LeaveRequest.objects.get(pk=res.json()['data']['id'])
        assert saved.is_self_service is True
        assert saved.requested_by_id == staff.pk

    def test_employee_cannot_file_for_colleague(self, staff, annual, department):
        other = make_user('lv.other', 'زميل')
        OrgAssignment.objects.create(user=other, department=department, is_active=True)
        make_profile(other, full_name_ar='زميل')
        res = client_for(staff).post(LEAVE_URL, {
            'employee': str(other.profile.pk),
            'leave_type': str(annual.pk),
            'start_date': '2026-08-01',
            'end_date': '2026-08-02',
        }, format='json')
        assert res.status_code == 403

    def test_employee_sees_own_requests_only(self, staff, annual, specialist, department):
        colleague = make_user('lv.other', 'زميل')
        OrgAssignment.objects.create(user=colleague, department=department, is_active=True)
        make_profile(colleague, full_name_ar='زميل')
        make_request(staff.profile, staff, annual, is_self_service=True)
        make_request(colleague.profile, colleague, annual, is_self_service=True)

        rows = client_for(staff).get(LEAVE_URL).json()['data']
        assert rows['count'] == 1

    def test_employee_cannot_approve(self, staff, annual):
        req = make_request(staff.profile, staff, annual, is_self_service=True,
                           status=LeaveRequestStatus.SUBMITTED)
        assert client_for(staff).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_filer_cannot_approve_own_request(self, specialist, staff, annual, grant_permissions):
        req = make_request(staff.profile, specialist, annual,
                           status=LeaveRequestStatus.SUBMITTED)
        grant_permissions(specialist, 'L6', ['hr_leave:approve', 'hr_leave:reject'])
        res = client_for(specialist).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        )
        assert res.status_code == 400
        req.refresh_from_db()
        assert req.status == LeaveRequestStatus.SUBMITTED

    def test_approve_needs_approve_permission(self, specialist, staff, annual, approver,
                                              grant_permissions):
        req = make_request(staff.profile, specialist, annual,
                           status=LeaveRequestStatus.SUBMITTED)
        grant_permissions(approver, 'L7', ['hr_leave:view', 'hr_leave:edit'])
        assert client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_reject_needs_reason(self, staff, annual, approver, grant_permissions):
        req = make_request(staff.profile, approver, annual,
                           status=LeaveRequestStatus.SUBMITTED)
        grant_permissions(approver, 'L8', ['hr_leave:reject'])
        res = client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/reject/', {}, format='json',
        )
        assert res.status_code == 400

    def test_hr_outside_scope_cannot_file(self, specialist, department, grant_permissions):
        other_sector = Sector.objects.create(code='LV2', name_ar='قطاع آخر')
        other_dep = Department.objects.create(code='LD9', name_ar='قسم بعيد', sector=other_sector)
        far_dep = department  # نطاق الأخصائية: قسمها هي
        far = make_user('lv.far', 'بعيد')
        OrgAssignment.objects.create(user=far, department=other_dep, is_active=True)
        make_profile(far, full_name_ar='بعيد')
        lt = LeaveType.objects.create(code='X', name_ar='نوع')

        # نطاق إداري على قطاع *آخر* فقط: الموظف البعيد في `other_dep`
        # من ذلك القطاع نفسه فيبدو داخل النطاق. نضيّقه إلى قسمه هو حتى
        # يكون `other_dep` خارجه فعلاً.
        grant_permissions(
            specialist, 'L9', ['hr_leave:add'],
            scope_type='DEPARTMENT', scope_id=far_dep.pk,
        )
        res = client_for(specialist).post(LEAVE_URL, {
            'employee': str(far.profile.pk),
            'leave_type': str(lt.pk),
            'start_date': '2026-09-01',
            'end_date': '2026-09-02',
        }, format='json')
        assert res.status_code == 403


class TestLeaveApprovalEffects:
    def test_approval_writes_timeline_event(self, staff, annual, specialist, approver,
                                            grant_permissions):
        req = make_request(staff.profile, specialist, annual, days=3,
                           status=LeaveRequestStatus.SUBMITTED)
        grant_permissions(approver, 'L10', ['hr_leave:approve'])
        assert client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        ).status_code == 200
        assert EmployeeTimeline.objects.filter(
            employee=staff.profile, event=EmployeeTimelineEvent.LEAVE_START,
        ).exists()

    def test_rejection_leaves_assignment_active(self, staff, annual, specialist, approver,
                                                grant_permissions):
        req = make_request(staff.profile, specialist, annual, days=3,
                           status=LeaveRequestStatus.SUBMITTED)
        grant_permissions(approver, 'L11', ['hr_leave:reject'])
        res = client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/reject/',
            {'rejection_reason': 'ذروة عمل'}, format='json',
        )
        assert res.status_code == 200
        assert OrgAssignment.objects.filter(user=staff, is_active=True).exists()
        assert not EmployeeTimeline.objects.filter(employee=staff.profile).exists()

    def test_cancel_releases_reservation(self, staff, annual, grant_permissions):
        from apps.hr import leave_service
        b = LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=10,
        )
        req = make_request(staff.profile, staff, annual, days=4,
                           is_self_service=True, status=LeaveRequestStatus.SUBMITTED)
        assert b.available_days() == 6
        leave_service.cancel_leave(req, staff)
        assert b.available_days() == 10

    def test_unpaid_leave_suspends_assignment(self, staff, specialist, approver,
                                              grant_permissions):
        unpaid = LeaveType.objects.create(
            code='UNPAID', name_ar='إجازة بلا راتب',
            is_paid=False, default_entitlement_days=30, suspends_assignment=True,
        )
        req = make_request(staff.profile, specialist, unpaid, days=3,
                           status=LeaveRequestStatus.SUBMITTED,
                           start=date.today())
        grant_permissions(approver, 'L12', ['hr_leave:approve'])
        assert client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        ).status_code == 200
        assert not OrgAssignment.objects.filter(user=staff, is_active=True).exists()

    def test_paid_leave_keeps_assignment(self, staff, annual, specialist, approver,
                                         grant_permissions):
        req = make_request(staff.profile, specialist, annual, days=3,
                           status=LeaveRequestStatus.SUBMITTED, start=date.today())
        grant_permissions(approver, 'L13', ['hr_leave:approve'])
        assert client_for(approver).post(
            f'{LEAVE_URL}{req.pk}/approve/', {}, format='json',
        ).status_code == 200
        assert OrgAssignment.objects.filter(user=staff, is_active=True).exists()

    def test_draft_not_editable_after_submit(self, staff, annual, grant_permissions):
        req = make_request(staff.profile, staff, annual, is_self_service=True)
        from apps.hr import leave_service
        leave_service.submit_leave(req, staff)
        grant_permissions(staff, 'L14', ['hr_leave:edit'])
        res = client_for(staff).patch(
            f'{LEAVE_URL}{req.pk}/', {'end_date': '2026-06-20'}, format='json',
        )
        assert res.status_code == 400


class TestLeaveBalanceAPI:
    def test_balance_derived_fields_not_writable(self, staff, annual, specialist,
                                                 grant_permissions):
        grant_permissions(specialist, 'L15', ['hr_leave:add'])
        res = client_for(specialist).post(BALANCE_URL, {
            'employee': str(staff.profile.pk),
            'leave_type': str(annual.pk),
            'year': 2026,
            'entitled_days': 21,
            'available_days': 999,      # محسوب — لا يقبل
        }, format='json')
        # يُتجاهل كحقل مشتقّ غير مسموح به في الإدخال
        assert res.status_code in (201, 400)
        if res.status_code == 201:
            assert LeaveBalance.objects.get(pk=res.json()['data']['id']).entitled_days == 21

    def test_employee_sees_own_balance(self, staff, annual, grant_permissions):
        LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        rows = client_for(staff).get(BALANCE_URL).json()['data']
        assert rows['count'] == 1
        assert rows['results'][0]['available_days'] == 21

    def test_employee_summary_endpoint(self, staff, annual, specialist):
        LeaveBalance.objects.create(
            employee=staff.profile, leave_type=annual, year=2026, entitled_days=21,
        )
        make_request(staff.profile, staff, annual, days=5, is_self_service=True,
                     start=date(2026, 6, 1), status=LeaveRequestStatus.APPROVED,
                     decided_by=specialist)
        data = client_for(staff).get(f'{BALANCE_URL}summary/').json()['data']
        assert data['year'] == 2026
        assert data['total_available'] == 16

    def test_summary_without_profile_empty(self, grant_permissions):
        bare = make_user('lv.bare', 'بلا ملف')
        grant_permissions(bare, 'L16', ['hr_leave:view'])
        assert client_for(bare).get(f'{BALANCE_URL}summary/').json()['data'] == {}


class TestLeaveTypes:
    def test_list_is_open_to_hr_with_view(self, specialist, grant_permissions):
        grant_permissions(specialist, 'L17', ['hr_leave:view'])
        assert client_for(specialist).get(TYPES_URL).status_code == 200

    def test_used_type_cannot_be_deleted(self, staff, annual, specialist, grant_permissions):
        make_request(staff.profile, specialist, annual)
        grant_permissions(specialist, 'L18', ['hr_leave:edit'])
        res = client_for(specialist).delete(f'{TYPES_URL}{annual.pk}/')
        assert res.status_code == 400

    def test_unused_type_can_be_deleted(self, annual, specialist, grant_permissions):
        grant_permissions(specialist, 'L19', ['hr_leave:edit'])
        assert client_for(specialist).delete(f'{TYPES_URL}{annual.pk}/').status_code == 204

    def test_employee_cannot_write_types(self, staff, grant_permissions):
        res = client_for(staff).post(TYPES_URL, {
            'code': 'X', 'name_ar': 'نوع',
        }, format='json')
        assert res.status_code == 403
