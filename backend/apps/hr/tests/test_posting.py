"""اختبارات المرحلة 3: طلبات النقل/الترقية.

تركيز على حدود الصلاحيات لأنها مصدر الأخطاء الأخطر هنا:
  - الموظف يرى طلباته هو فقط، ولا يرى طلبات زملائه.
  - المعتمد لا يعتمد الطلب الذي رفعه بنفسه (فصل المهام على مستوى السجل).
  - الاعتمد ينفّذ النقل فعلاً: يُغلق التعيين القديم ويفتح الجديد ويسجّل
    حدثاً في المسار الوظيفي.
  - الرفض لا يمسّ التعيينات.
"""

import uuid
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.models import (
    EmployeeTimeline,
    EmployeeTimelineEvent,
    PostingKind,
    PostingRequest,
    PostingStatus,
    PostingStatusLog,
)
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()
POSTINGS_URL = '/api/v1/hr/posting-requests/'


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
    return Sector.objects.create(code='PH3', name_ar='القطاع الطبي')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='D1', name_ar='قسم ألف', sector=sector)


@pytest.fixture
def other_department(sector):
    return Department.objects.create(code='D2', name_ar='قسم باء', sector=sector)


@pytest.fixture
def staff(department):
    u = make_user('ph3.staff', 'موظف طلب')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    make_profile(u, full_name_ar='موظف طلب', job_title='محاسب')
    return u


@pytest.fixture
def hr_specialist(department):
    u = make_user('ph3.specialist', 'أخصائية موارد بشرية')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


@pytest.fixture
def hr_approver(department):
    u = make_user('ph3.approver', 'معتمد الطلبات')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


def make_posting(employee, requested_by, status=PostingStatus.DRAFT, **kwargs):
    return PostingRequest.objects.create(
        employee=employee,
        kind=kwargs.pop('kind', PostingKind.TRANSFER),
        status=status,
        requested_by=requested_by,
        **kwargs,
    )


class TestPostingPermissions:
    def test_requires_authentication(self):
        assert APIClient().get(POSTINGS_URL).status_code == 401

    def test_hr_without_permission_is_denied(self, hr_specialist):
        assert client_for(hr_specialist).get(POSTINGS_URL).status_code == 403

    def test_hr_with_view_can_list(self, hr_specialist, staff, grant_permissions):
        make_posting(staff.profile, hr_specialist)
        grant_permissions(hr_specialist, 'P3V', ['hr_posting:view'])
        assert client_for(hr_specialist).get(POSTINGS_URL).status_code == 200

    def test_employee_sees_own_request_without_hr_permission(self, staff):
        make_posting(staff.profile, staff)
        assert client_for(staff).get(POSTINGS_URL).status_code == 200

    def test_employee_does_not_see_colleague_request(self, staff, department):
        other = make_user('ph3.other', 'زميل')
        OrgAssignment.objects.create(user=other, department=department, is_active=True)
        make_profile(other, full_name_ar='زميل')
        make_posting(other.profile, other)

        rows = client_for(staff).get(POSTINGS_URL).json()['data']
        assert rows['count'] == 0

    def test_approve_requires_approve_permission(self, hr_approver, staff, grant_permissions):
        posting = make_posting(staff.profile, hr_approver, status=PostingStatus.SUBMITTED)
        grant_permissions(hr_approver, 'P3W', ['hr_posting:view', 'hr_posting:edit'])
        # edit بلا approve = مرفوض
        assert client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_reject_requires_reject_permission(self, hr_approver, staff, grant_permissions):
        posting = make_posting(staff.profile, hr_approver, status=PostingStatus.SUBMITTED)
        grant_permissions(hr_approver, 'P3W', ['hr_posting:view', 'hr_posting:approve'])
        assert client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/reject/',
            {'rejection_reason': 'لا'}, format='json',
        ).status_code == 403

    def test_employee_cannot_approve_even_on_own_request(self, staff):
        posting = make_posting(staff.profile, staff, status=PostingStatus.SUBMITTED)
        res = client_for(staff).post(f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json')
        assert res.status_code == 403


class TestSeparationOfDuties:
    def test_approver_cannot_approve_own_request(self, hr_approver, staff, grant_permissions):
        """حتى لو حمل المعتمد صلاحية الاعتماد، لا يعتمد طلبه هو."""
        posting = make_posting(staff.profile, hr_approver, status=PostingStatus.SUBMITTED)
        grant_permissions(hr_approver, 'P3S', ['hr_posting:approve', 'hr_posting:reject'])
        res = client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json',
        )
        assert res.status_code == 400
        posting.refresh_from_db()
        assert posting.status == PostingStatus.SUBMITTED

    def test_double_approval_is_refused(self, hr_specialist, hr_approver, staff, grant_permissions):
        posting = make_posting(staff.profile, hr_specialist, status=PostingStatus.SUBMITTED)
        grant_permissions(hr_approver, 'P3S', ['hr_posting:approve', 'hr_posting:reject'])
        c = client_for(hr_approver)
        assert c.post(f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json').status_code == 200
        # الطلب مغلق الآن: اعتماد ثانٍ مرفوض
        assert c.post(f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json').status_code == 400
        assert PostingStatusLog.objects.filter(
            posting=posting, to_status=PostingStatus.APPROVED,
        ).count() == 1


class TestApprovalEffect:
    def test_approval_moves_the_employee(self, hr_specialist, hr_approver, staff,
                                         department, other_department, grant_permissions):
        posting = make_posting(
            staff.profile, hr_specialist,
            status=PostingStatus.SUBMITTED,
            target_department=other_department,
        )
        grant_permissions(hr_approver, 'P3E', ['hr_posting:approve'])
        res = client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json',
        )
        assert res.status_code == 200

        # 1) التعيين القديم أُغلق
        assert not OrgAssignment.objects.filter(
            user=staff, department=department, is_active=True,
        ).exists()
        # 2) التعيين الجديد مفتوح
        fresh = OrgAssignment.objects.get(user=staff, is_active=True)
        assert fresh.department_id == other_department.pk
        # 3) حدث في المسار الوظيفي
        assert EmployeeTimeline.objects.filter(
            employee=staff.profile, event=EmployeeTimelineEvent.TRANSFER,
        ).exists()

    def test_promotion_records_promotion_event(self, hr_specialist, hr_approver, staff,
                                               department, grant_permissions):
        posting = make_posting(
            staff.profile, hr_specialist,
            kind=PostingKind.PROMOTION, status=PostingStatus.SUBMITTED,
            target_department=department,
        )
        grant_permissions(hr_approver, 'P3E', ['hr_posting:approve'])
        client_for(hr_approver).post(f'{POSTINGS_URL}{posting.pk}/approve/', {}, format='json')
        assert EmployeeTimeline.objects.filter(
            employee=staff.profile, event=EmployeeTimelineEvent.PROMOTION,
        ).exists()

    def test_rejection_leaves_assignment_untouched(self, hr_specialist, hr_approver, staff,
                                                  department, grant_permissions):
        posting = make_posting(
            staff.profile, hr_specialist,
            status=PostingStatus.SUBMITTED, target_department=department,
        )
        grant_permissions(hr_approver, 'P3E', ['hr_posting:reject'])
        res = client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/reject/',
            {'rejection_reason': 'لا يوجد قسم شاغر'}, format='json',
        )
        assert res.status_code == 200
        assert OrgAssignment.objects.filter(user=staff, is_active=True).exists()
        assert not EmployeeTimeline.objects.filter(employee=staff.profile).exists()
        posting.refresh_from_db()
        assert posting.status == PostingStatus.REJECTED
        assert posting.rejection_reason == 'لا يوجد قسم شاغر'

    def test_reject_requires_reason(self, hr_specialist, hr_approver, staff, grant_permissions):
        posting = make_posting(
            staff.profile, hr_specialist, status=PostingStatus.SUBMITTED,
            target_department=staff.profile and None or None,
        )
        grant_permissions(hr_approver, 'P3E', ['hr_posting:reject'])
        res = client_for(hr_approver).post(
            f'{POSTINGS_URL}{posting.pk}/reject/', {}, format='json',
        )
        assert res.status_code == 400
        posting.refresh_from_db()
        assert posting.status == PostingStatus.SUBMITTED


class TestLifecycle:
    def test_submit_transitions_draft_to_submitted(self, staff):
        posting = make_posting(staff.profile, staff, is_self_service=True)
        res = client_for(staff).post(f'{POSTINGS_URL}{posting.pk}/submit/', {}, format='json')
        assert res.status_code == 200
        posting.refresh_from_db()
        assert posting.status == PostingStatus.SUBMITTED
        assert PostingStatusLog.objects.filter(
            posting=posting, to_status=PostingStatus.SUBMITTED,
        ).exists()

    def test_cancel_submitted_request(self, staff):
        posting = make_posting(staff.profile, staff, is_self_service=True)
        c = client_for(staff)
        c.post(f'{POSTINGS_URL}{posting.pk}/submit/', {}, format='json')
        res = c.post(f'{POSTINGS_URL}{posting.pk}/cancel/', {}, format='json')
        assert res.status_code == 200
        posting.refresh_from_db()
        assert posting.status == PostingStatus.CANCELLED

    @pytest.mark.parametrize('status', [
        PostingStatus.SUBMITTED, PostingStatus.APPROVED,
        PostingStatus.REJECTED, PostingStatus.CANCELLED,
    ])
    def test_cannot_edit_non_draft_request(self, hr_specialist, staff, grant_permissions,
                                           other_department, status):
        """`DRAFT` وحدها قابلة للتعديل.

        `SUBMITTED` معروضة على المعتمد، فتعديل وجهتها بعد العرض يجعل ما
        وافق عليه ليس ما اعتُمد — والآنواع النهائية مقفلة أصلاً.
        """
        posting = make_posting(
            staff.profile, hr_specialist,
            status=status, target_department=other_department,
        )
        grant_permissions(hr_specialist, 'P3E', ['hr_posting:edit'])
        res = client_for(hr_specialist).patch(
            f'{POSTINGS_URL}{posting.pk}/', {'reason': 'x'}, format='json',
        )
        assert res.status_code == 400
        posting.refresh_from_db()
        assert posting.reason == ''

    def test_draft_request_is_editable(self, hr_specialist, staff, grant_permissions):
        posting = make_posting(staff.profile, hr_specialist)
        grant_permissions(hr_specialist, 'P3E', ['hr_posting:edit'])
        res = client_for(hr_specialist).patch(
            f'{POSTINGS_URL}{posting.pk}/', {'reason': 'نقل لخلل التغطية'}, format='json',
        )
        assert res.status_code == 200
        posting.refresh_from_db()
        assert posting.reason == 'نقل لخلل التغطية'

    def test_timeline_lists_status_history(self, staff):
        posting = make_posting(staff.profile, staff, is_self_service=True)
        client_for(staff).post(f'{POSTINGS_URL}{posting.pk}/submit/', {}, format='json')
        data = client_for(staff).get(f'{POSTINGS_URL}{posting.pk}/timeline/').json()['data']
        assert [r['to_status'] for r in data] == [PostingStatus.SUBMITTED]


class TestValidation:
    def test_past_effective_date_rejected(self, hr_specialist, staff, grant_permissions, department):
        grant_permissions(hr_specialist, 'P3C', ['hr_posting:add'])
        res = client_for(hr_specialist).post(POSTINGS_URL, {
            'employee': str(staff.profile.pk),
            'kind': PostingKind.TRANSFER,
            'target_department': str(department.pk),
            'effective_date': str(date(2020, 1, 1)),
        }, format='json')
        assert res.status_code == 400

    def test_promotion_without_target_rejected(self, hr_specialist, staff, grant_permissions):
        grant_permissions(hr_specialist, 'P3C', ['hr_posting:add'])
        res = client_for(hr_specialist).post(POSTINGS_URL, {
            'employee': str(staff.profile.pk),
            'kind': PostingKind.PROMOTION,
        }, format='json')
        assert res.status_code == 400

    def test_hr_cannot_file_request_for_employee_outside_scope(
        self, hr_specialist, department, grant_permissions,
    ):
        other_sector = Sector.objects.create(code='O3', name_ar='قطاع آخر')
        other_dep = Department.objects.create(code='D9', name_ar='قسم بعيد', sector=other_sector)
        far = make_user('ph3.far', 'بعيد')
        OrgAssignment.objects.create(user=far, department=other_dep, is_active=True)
        make_profile(far, full_name_ar='بعيد')

        # نطاق إداري محدود: بلا GLOBAL (وإلا صار وطنياً والتقييد لا معنى له)
        grant_permissions(
            hr_specialist, 'P3C', ['hr_posting:add'],
            scope_type='DEPARTMENT', scope_id=department.pk,
        )
        res = client_for(hr_specialist).post(POSTINGS_URL, {
            'employee': str(far.profile.pk),
            'kind': PostingKind.TRANSFER,
            'target_department': str(other_dep.pk),
        }, format='json')
        assert res.status_code == 403

    def test_requested_by_cannot_be_spoofed(self, hr_specialist, staff, hr_approver,
                                             grant_permissions, department):
        """`requested_by` يحدّده الخادم من هوية المرسل، لا من جسم الطلب."""
        grant_permissions(hr_specialist, 'P3C', ['hr_posting:add'])
        res = client_for(hr_specialist).post(POSTINGS_URL, {
            'employee': str(staff.profile.pk),
            'kind': PostingKind.TRANSFER,
            'target_department': str(department.pk),
            'requested_by': str(hr_approver.pk),
        }, format='json')
        assert res.status_code == 201
        created = PostingRequest.objects.get(employee=staff.profile)
        assert created.requested_by_id == hr_specialist.pk
