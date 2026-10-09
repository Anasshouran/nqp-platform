"""اختبارات المرحلة 6: التدريب وتقييم الأداء.

تركيز على ما يُفسد الأرقام:
  - الإتمام مشتق من الدرجة مقابل شرط الاجتياز، لا يكتبه المستخدم.
  - مجموع أوزان المؤشرات 100 شرط لإغلاق الدورة، ووجود مؤشرات ليس كافياً.
  - الدرجة النهائية والتقدير مشتقّان، ولا يقبلهما العميل.
  - التقييم الناقص لا يُرسل ولا يُعتمد.
  - المعتمد لا يقرّر تقييمه ولا يقرّر بعد اعتماده.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import EmployeeProfile
from apps.hr.models import (
    CycleStatus,
    EnrollmentStatus,
    PerformanceCycle,
    PerformanceKPI,
    PerformanceReview,
    ReviewStatus,
    TrainingEnrollment,
    TrainingPlan,
)
from apps.organization.models import Department, OrgAssignment, Sector

pytestmark = pytest.mark.django_db

User = get_user_model()
PLANS_URL = '/api/v1/hr/training-plans/'
ENROLL_URL = '/api/v1/hr/training-enrollments/'
CYCLES_URL = '/api/v1/hr/performance-cycles/'
REVIEWS_URL = '/api/v1/hr/performance-reviews/'


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
    return Sector.objects.create(code='TR1', name_ar='قطاع')


@pytest.fixture
def department(sector):
    return Department.objects.create(code='TD1', name_ar='قسم التدريب', sector=sector)


@pytest.fixture
def staff(department):
    u = make_user('tr.staff', 'موظف التدريب')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    make_profile(u, full_name_ar='موظف التدريب')
    return u


@pytest.fixture
def specialist(department):
    u = make_user('tr.specialist', 'أخصائية التدريب')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


@pytest.fixture
def approver(department):
    u = make_user('tr.approver', 'معتمد التدريب')
    OrgAssignment.objects.create(user=u, department=department, is_active=True)
    return u


@pytest.fixture
def plan():
    return TrainingPlan.objects.create(
        code='NQP-101', name_ar='أساسيات الرقابة الصحية',
        duration_hours=20, is_mandatory=True,
    )


def make_enrollment(employee, requester, plan, **kwargs):
    kwargs.setdefault('status', EnrollmentStatus.DRAFT)
    return TrainingEnrollment.objects.create(
        employee=employee, plan=plan, requested_by=requester, **kwargs,
    )


class TestTrainingPlan:
    def test_requires_authentication(self):
        assert APIClient().get(PLANS_URL).status_code == 401

    def test_hr_with_view_lists(self, plan, specialist, grant_permissions):
        grant_permissions(specialist, 'T1', ['hr_training:view'])
        assert client_for(specialist).get(PLANS_URL).status_code == 200

    def test_employee_cannot_create_plan(self, staff):
        res = client_for(staff).post(PLANS_URL, {
            'code': 'X', 'name_ar': 'دورة',
        }, format='json')
        assert res.status_code == 403

    def test_plan_with_enrollments_cannot_be_deleted(self, staff, plan, specialist, grant_permissions):
        make_enrollment(staff.profile, specialist, plan)
        grant_permissions(specialist, 'T2', ['hr_training:delete'])
        assert client_for(specialist).delete(f'{PLANS_URL}{plan.pk}/').status_code == 400

    def test_employee_count_distinct(self, staff, specialist, department, grant_permissions):
        """عدّ الموظفين لا عدد صفوف التسجيل: موظف واحد بدورتين = 1."""
        colleague = make_user('tr.c2', 'زميل')
        OrgAssignment.objects.create(user=colleague, department=department, is_active=True)
        make_profile(colleague, full_name_ar='زميل')
        p1 = TrainingPlan.objects.create(code='P1', name_ar='دورة 1')
        p2 = TrainingPlan.objects.create(code='P2', name_ar='دورة 2')
        make_enrollment(staff.profile, specialist, p1)
        make_enrollment(staff.profile, specialist, p2)

        grant_permissions(specialist, 'TD1', ['hr_training:view'])
        row = next(
            r for r in client_for(specialist).get(
                f'{PLANS_URL}?search=دورة 1').json()['data']['results']
            if r['code'] == 'P1'
        )
        assert row['employee_count'] == 1


class TestTrainingEnrollment:
    def test_employee_enrolls_self(self, staff, plan):
        res = client_for(staff).post(ENROLL_URL, {
            'employee': str(staff.profile.pk),
            'plan': str(plan.pk),
        }, format='json')
        assert res.status_code == 201
        saved = TrainingEnrollment.objects.get(pk=res.json()['data']['id'])
        assert saved.is_self_service is True

    def test_employee_cannot_enroll_colleague(self, staff, plan, department):
        other = make_user('tr.other', 'زميل')
        OrgAssignment.objects.create(user=other, department=department, is_active=True)
        make_profile(other, full_name_ar='زميل')
        res = client_for(staff).post(ENROLL_URL, {
            'employee': str(other.profile.pk),
            'plan': str(plan.pk),
        }, format='json')
        assert res.status_code == 403

    def test_duplicate_active_enrollment_blocked(self, staff, plan, specialist, grant_permissions):
        make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.APPROVED)
        grant_permissions(specialist, 'T3', ['hr_training:add'])
        res = client_for(specialist).post(ENROLL_URL, {
            'employee': str(staff.profile.pk), 'plan': str(plan.pk),
        }, format='json')
        assert res.status_code == 400

    def test_cancelled_enrollment_frees_the_slot(self, staff, plan, specialist, grant_permissions):
        make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.CANCELLED)
        grant_permissions(specialist, 'T4', ['hr_training:add'])
        res = client_for(specialist).post(ENROLL_URL, {
            'employee': str(staff.profile.pk), 'plan': str(plan.pk),
        }, format='json')
        assert res.status_code == 201

    def test_inactive_plan_rejected(self, staff, plan, specialist, grant_permissions):
        plan.is_active = False
        plan.save()
        grant_permissions(specialist, 'T5', ['hr_training:add'])
        res = client_for(specialist).post(ENROLL_URL, {
            'employee': str(staff.profile.pk), 'plan': str(plan.pk),
        }, format='json')
        assert res.status_code == 400

    def test_filer_cannot_approve_own(self, staff, plan, specialist, grant_permissions):
        e = make_enrollment(staff.profile, specialist, plan,
                            status=EnrollmentStatus.REQUESTED)
        grant_permissions(specialist, 'T6', ['hr_training:approve', 'hr_training:edit'])
        res = client_for(specialist).post(f'{ENROLL_URL}{e.pk}/approve/', {}, format='json')
        assert res.status_code == 400
        e.refresh_from_db()
        assert e.status == EnrollmentStatus.REQUESTED

    def test_employee_cannot_approve(self, staff, plan):
        e = make_enrollment(staff.profile, staff, plan,
                            status=EnrollmentStatus.REQUESTED, is_self_service=True)
        assert client_for(staff).post(
            f'{ENROLL_URL}{e.pk}/approve/', {}, format='json',
        ).status_code == 403

    def test_employee_cannot_complete_own_enrollment(self, staff, plan):
        """تسجيل الإتمام فعل HR لا موظف — وإلا رقّع الموظف درجته بنفسه."""
        e = make_enrollment(staff.profile, staff, plan,
                            status=EnrollmentStatus.APPROVED, is_self_service=True)
        assert client_for(staff).post(
            f'{ENROLL_URL}{e.pk}/complete/', {'score': 100}, format='json',
        ).status_code == 403
        e.refresh_from_db()
        assert e.status == EnrollmentStatus.APPROVED
        assert e.score is None

    def test_approved_enrollment_not_editable(self, staff, plan, specialist, grant_permissions):
        e = make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.APPROVED)
        grant_permissions(specialist, 'T7', ['hr_training:edit'])
        res = client_for(specialist).patch(
            f'{ENROLL_URL}{e.pk}/', {'notes': 'x'}, format='json',
        )
        assert res.status_code == 400

    def test_logs_record_transitions(self, staff, plan, approver):
        from apps.hr import training_service
        e = make_enrollment(staff.profile, staff, plan, is_self_service=True)
        # `submit`/`approve` يعيدان النسخة المقفلة؛ نتبعها لأن `e` الأصلية
        # بقيت `DRAFT` في الذاكرة.
        e = training_service.submit_enrollment(e, staff)
        e = training_service.approve_enrollment(e, approver)
        assert [log.to_status for log in e.status_logs.order_by('created_at')] == [
            EnrollmentStatus.REQUESTED, EnrollmentStatus.APPROVED,
        ]


class TestCompletionDerivation:
    """الإتمام يُشتق من الدرجة، فلا يُكتب يدوياً."""

    def test_score_below_threshold_fails(self, staff, plan, specialist):
        e = make_enrollment(staff.profile, specialist, plan,
                            status=EnrollmentStatus.APPROVED, pass_score=Decimal('70'))
        assert e.is_completed() is False
        e.score = Decimal('60')
        assert e.is_completed() is False

    def test_score_at_threshold_passes(self, staff, plan, specialist):
        e = make_enrollment(staff.profile, specialist, plan,
                            status=EnrollmentStatus.APPROVED, pass_score=Decimal('70'))
        e.score = Decimal('70')
        assert e.is_completed() is True

    def test_no_threshold_means_pass(self, staff, plan, specialist):
        e = make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.APPROVED)
        e.score = Decimal('1')
        assert e.is_completed() is True

    def test_no_score_means_not_completed(self, staff, plan, specialist):
        e = make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.APPROVED)
        assert e.is_completed() is False

    def test_record_completion_derives_status(self, staff, plan, specialist, grant_permissions):
        from apps.hr import training_service
        grant_permissions(specialist, 'T8', ['hr_training:edit'])
        e = make_enrollment(staff.profile, specialist, plan,
                            status=EnrollmentStatus.APPROVED, pass_score=Decimal('70'))
        training_service.record_completion(e, specialist, score=Decimal('55'))
        e.refresh_from_db()
        assert e.status == EnrollmentStatus.FAILED

    def test_record_completion_passes_on_good_score(self, staff, plan, specialist, grant_permissions):
        from apps.hr import training_service
        grant_permissions(specialist, 'T9', ['hr_training:edit'])
        e = make_enrollment(staff.profile, specialist, plan,
                            status=EnrollmentStatus.APPROVED, pass_score=Decimal('70'))
        training_service.record_completion(e, specialist, score=Decimal('88'),
                                           certificate_ref='CERT-1')
        e.refresh_from_db()
        assert e.status == EnrollmentStatus.COMPLETED
        assert e.certificate_ref == 'CERT-1'

    def test_completion_on_unapproved_rejected(self, staff, plan, specialist, grant_permissions):
        from apps.hr import training_service
        grant_permissions(specialist, 'T10', ['hr_training:edit'])
        e = make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.REQUESTED)
        with pytest.raises(Exception):
            training_service.record_completion(e, specialist, score=Decimal('90'))

    def test_api_cannot_forge_completion(self, staff, plan, specialist, grant_permissions):
        """`is_completed` مشتقّ فلا يقبله الإدخال أصلاً."""
        grant_permissions(specialist, 'T11', ['hr_training:edit'])
        e = make_enrollment(staff.profile, specialist, plan, status=EnrollmentStatus.APPROVED)
        res = client_for(specialist).patch(
            f'{ENROLL_URL}{e.pk}/', {'is_completed': True}, format='json',
        )
        e.refresh_from_db()
        assert e.is_completed() is False  # بلا درجة، فليس مجتازاً
        assert res.status_code in (200, 400)


# ---------------------------------------------------------------------
# تقييم الأداء
# ---------------------------------------------------------------------
@pytest.fixture
def cycle(department):
    return PerformanceCycle.objects.create(
        name='تقييم 2026 - Q1',
        period_start=date(2026, 1, 1), period_end=date(2026, 3, 31),
        review_due_date=date(2026, 4, 15),
        status=CycleStatus.OPEN, department=department,
    )


@pytest.fixture
def kpis(cycle):
    return [
        PerformanceKPI.objects.create(cycle=cycle, name='الالتزام بالمواعيد', weight=Decimal('60'), order=1),
        PerformanceKPI.objects.create(cycle=cycle, name='جودة العمل', weight=Decimal('40'), order=2),
    ]


def make_review(employee, reviewer, cycle, kpi_scores=None):
    from apps.hr.models import ReviewKPIScore
    r = PerformanceReview.objects.create(
        cycle=cycle, employee=employee, reviewed_by=reviewer,
    )
    for kpi, score in (kpi_scores or {}).items():
        ReviewKPIScore.objects.create(review=r, kpi=kpi, score=score)
    return r


class TestPerformanceScoring:
    def test_weighted_total(self, cycle, kpis, staff, specialist):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle, {k1: Decimal('80'), k2: Decimal('90')})
        # 80*0.6 + 90*0.4 = 48 + 36 = 84
        assert r.compute_total() == Decimal('84.00')

    def test_partial_scores_return_none(self, cycle, kpis, staff, specialist):
        k1, _k2 = kpis
        r = make_review(staff.profile, specialist, cycle, {k1: Decimal('80')})
        assert r.compute_total() is None

    def test_no_kpis_returns_none(self, cycle, staff, specialist):
        r = make_review(staff.profile, specialist, cycle)
        assert r.compute_total() is None

    @pytest.mark.parametrize('score,expected', [
        (Decimal('95'), 'EXCELLENT'),
        (Decimal('85'), 'VERY_GOOD'),
        (Decimal('75'), 'GOOD'),
        (Decimal('65'), 'ACCEPTABLE'),
        (Decimal('30'), 'NEEDS_IMPROVEMENT'),
        (Decimal('100'), 'EXCELLENT'),
    ])
    def test_rating_bands(self, cycle, kpis, staff, specialist, score, expected):
        k1, k2 = kpis
        # نجعل المؤشرين بالدرجة نفسها ليساوي الوزن الإجمالي الدرجة
        r = make_review(staff.profile, specialist, cycle, {k1: score, k2: score})
        total = r.compute_total()
        assert r.rating_for(total) == expected

    def test_client_cannot_send_total_or_rating(self, staff, cycle, kpis, specialist,
                                                grant_permissions):
        grant_permissions(specialist, 'P1', ['hr_performance:add'])
        res = client_for(specialist).post(REVIEWS_URL, {
            'cycle': str(cycle.pk),
            'employee': str(staff.profile.pk),
            'total_score': 100,
            'rating': 'EXCELLENT',
        }, format='json')
        assert res.status_code == 201
        saved = PerformanceReview.objects.get(pk=res.json()['data']['id'])
        assert saved.total_score is None
        assert saved.rating == ''

    def test_kpi_from_other_cycle_rejected(self, staff, cycle, kpis, specialist,
                                           grant_permissions, department):
        other_cycle = PerformanceCycle.objects.create(
            name='دورة أخرى', period_start=date(2025, 1, 1), period_end=date(2025, 3, 31),
            status=CycleStatus.OPEN,
        )
        foreign = PerformanceKPI.objects.create(
            cycle=other_cycle, name='مؤشر غريب', weight=Decimal('100'),
        )
        grant_permissions(specialist, 'P2', ['hr_performance:add'])
        res = client_for(specialist).post(REVIEWS_URL, {
            'cycle': str(cycle.pk),
            'employee': str(staff.profile.pk),
            'kpi_scores': [{'kpi': str(foreign.pk), 'score': 90}],
        }, format='json')
        assert res.status_code == 400

    def test_score_out_of_range_rejected(self, staff, cycle, kpis, specialist, grant_permissions):
        grant_permissions(specialist, 'P3', ['hr_performance:add'])
        res = client_for(specialist).post(REVIEWS_URL, {
            'cycle': str(cycle.pk),
            'employee': str(staff.profile.pk),
            'kpi_scores': [{'kpi': str(kpis[0].pk), 'score': 150}],
        }, format='json')
        assert res.status_code == 400


class TestReviewWorkflow:
    def test_incomplete_review_cannot_be_submitted(self, staff, cycle, kpis, specialist,
                                                  grant_permissions):
        k1, _k2 = kpis
        r = make_review(staff.profile, specialist, cycle, {k1: Decimal('80')})
        grant_permissions(specialist, 'P4', ['hr_performance:edit'])
        res = client_for(specialist).post(f'{REVIEWS_URL}{r.pk}/submit/', {}, format='json')
        assert res.status_code == 400
        r.refresh_from_db()
        assert r.status == ReviewStatus.DRAFT

    def test_submit_computes_total_and_rating(self, staff, cycle, kpis, specialist,
                                              grant_permissions):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')})
        grant_permissions(specialist, 'P5', ['hr_performance:edit'])
        assert client_for(specialist).post(
            f'{REVIEWS_URL}{r.pk}/submit/', {}, format='json',
        ).status_code == 200
        r.refresh_from_db()
        assert r.status == ReviewStatus.SUBMITTED
        assert r.total_score == Decimal('90.00')
        assert r.rating == 'EXCELLENT'

    def test_approval_recomputes_after_score_change(self, staff, cycle, kpis, specialist,
                                                    approver, grant_permissions):
        """تعديل الدرجة بعد الإرسال ينعكس على المعتمد، لا على المخزَّن."""
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')})
        grant_permissions(specialist, 'P6', ['hr_performance:edit'])
        client_for(specialist).post(f'{REVIEWS_URL}{r.pk}/submit/', {}, format='json')
        r.refresh_from_db()
        assert r.total_score == Decimal('90.00')

        #-correct score downward before approval
        r.kpi_scores.filter(kpi=k1).update(score=Decimal('30'))
        grant_permissions(approver, 'P7', ['hr_performance:approve'])
        assert client_for(approver).post(
            f'{REVIEWS_URL}{r.pk}/approve/', {}, format='json',
        ).status_code == 200
        r.refresh_from_db()
        assert r.total_score == Decimal('54.00')  # 30*0.6 + 90*0.4
        assert r.rating == 'NEEDS_IMPROVEMENT'

    def test_reviewer_cannot_approve_own(self, staff, cycle, kpis, specialist, grant_permissions):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')},
                        )
        r.status = ReviewStatus.SUBMITTED
        r.save()
        grant_permissions(specialist, 'P8', ['hr_performance:approve', 'hr_performance:edit'])
        res = client_for(specialist).post(f'{REVIEWS_URL}{r.pk}/approve/', {}, format='json')
        assert res.status_code == 400

    def test_return_then_resubmit(self, staff, cycle, kpis, specialist, approver,
                                  grant_permissions):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')})
        r.status = ReviewStatus.SUBMITTED
        r.save()
        grant_permissions(approver, 'P9', ['hr_performance:approve'])
        assert client_for(approver).post(
            f'{REVIEWS_URL}{r.pk}/return_for_revision/', {'note': 'راجع'}, format='json',
        ).status_code == 200
        r.refresh_from_db()
        assert r.status == ReviewStatus.RETURNED
        assert r.is_editable() is True

    def test_employee_cannot_return_own_review_for_revision(self, staff, cycle, kpis):
        """إعادة التقييم قرار معتمد — لا تُفتح للموظف على تقييمه."""
        r = make_review(staff.profile, staff, cycle, kpi_scores={kpis[0]: Decimal('90')})
        r.status = ReviewStatus.SUBMITTED
        r.save(update_fields=['status', 'updated_at'])
        assert client_for(staff).post(
            f'{REVIEWS_URL}{r.pk}/return_for_revision/', {'note': 'حاول'}, format='json',
        ).status_code == 403
        r.refresh_from_db()
        assert r.status == ReviewStatus.SUBMITTED

    def test_approved_review_not_editable(self, staff, cycle, kpis, specialist, grant_permissions):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')},
                        )
        r.status = ReviewStatus.APPROVED
        r.save()
        grant_permissions(specialist, 'P10', ['hr_performance:edit'])
        res = client_for(specialist).patch(
            f'{REVIEWS_URL}{r.pk}/', {'comments': 'x'}, format='json',
        )
        assert res.status_code == 400

    def test_closed_cycle_blocks_new_reviews(self, staff, cycle, kpis, specialist,
                                            grant_permissions):
        k1, k2 = kpis
        r = make_review(staff.profile, specialist, cycle,
                        {k1: Decimal('90'), k2: Decimal('90')},
                        )
        r.status = ReviewStatus.SUBMITTED
        r.save()
        grant_permissions(specialist, 'P11', ['hr_performance:edit'])
        cycle.status = CycleStatus.CLOSED
        cycle.save()
        res = client_for(specialist).post(f'{REVIEWS_URL}{r.pk}/submit/', {}, format='json')
        assert res.status_code == 400


class TestCycleClose:
    def test_weights_must_total_100(self, cycle, staff, specialist, approver, grant_permissions):
        r = make_review(staff.profile, specialist, cycle)
        r.status = ReviewStatus.APPROVED
        r.save()
        PerformanceKPI.objects.create(cycle=cycle, name='مؤشر ناقص', weight=Decimal('10'))
        grant_permissions(approver, 'P12', ['hr_performance:approve'])
        res = client_for(approver).post(f'{CYCLES_URL}{cycle.pk}/close/', {}, format='json')
        assert res.status_code == 400
        cycle.refresh_from_db()
        assert cycle.status == CycleStatus.OPEN

    def test_kpis_present_but_wrong_total_still_blocks(self, cycle, staff, specialist,
                                                       approver, grant_permissions):
        """وجود مؤشرات ليس كافياً — يجب أن يكون المجموع 100."""
        PerformanceKPI.objects.create(cycle=cycle, name='مؤشر', weight=Decimal('50'))
        grant_permissions(approver, 'P13', ['hr_performance:approve'])
        res = client_for(approver).post(f'{CYCLES_URL}{cycle.pk}/close/', {}, format='json')
        assert res.status_code == 400

    def test_unapproved_review_blocks_close(self, cycle, kpis, staff, specialist,
                                            approver, grant_permissions):
        r = make_review(staff.profile, specialist, cycle,
                        {kpis[0]: Decimal('90'), kpis[1]: Decimal('90')},
                        )
        r.status = ReviewStatus.SUBMITTED
        r.save()
        grant_permissions(approver, 'P14', ['hr_performance:approve'])
        res = client_for(approver).post(f'{CYCLES_URL}{cycle.pk}/close/', {}, format='json')
        assert res.status_code == 400

    def test_close_succeeds_when_all_approved(self, cycle, kpis, staff, specialist,
                                              approver, grant_permissions):
        r = make_review(staff.profile, specialist, cycle,
                        {kpis[0]: Decimal('90'), kpis[1]: Decimal('90')},
                        )
        r.status = ReviewStatus.APPROVED
        r.save()
        grant_permissions(approver, 'P15', ['hr_performance:approve'])
        res = client_for(approver).post(f'{CYCLES_URL}{cycle.pk}/close/', {}, format='json')
        assert res.status_code == 200
        cycle.refresh_from_db()
        assert cycle.status == CycleStatus.CLOSED

    def test_cannot_edit_open_cycle(self, cycle, kpis, specialist, grant_permissions):
        grant_permissions(specialist, 'P16', ['hr_performance:edit'])
        res = client_for(specialist).patch(
            f'{CYCLES_URL}{cycle.pk}/', {'name': 'x'}, format='json',
        )
        assert res.status_code == 400

    def test_kpis_only_addable_to_draft(self, cycle, specialist, grant_permissions):
        grant_permissions(specialist, 'P17', ['hr_performance:edit'])
        res = client_for(specialist).post(f'{CYCLES_URL}{cycle.pk}/kpis/', {
            'name': 'مؤشر', 'weight': 30,
        }, format='json')
        assert res.status_code == 400

    def test_kpi_can_be_corrected_or_removed(self, specialist, grant_permissions):
        draft = PerformanceCycle.objects.create(
            name='مسودة', period_start=date(2026, 1, 1), period_end=date(2026, 3, 31),
            status=CycleStatus.DRAFT,
        )
        grant_permissions(specialist, 'P6x', ['hr_performance:edit'])
        created = client_for(specialist).post(
            f'{CYCLES_URL}{draft.pk}/kpis/', {'name': 'الإنجاز', 'weight': 60}, format='json',
        )
        assert created.status_code == 201, created.content
        kpi_id = created.json()['data']['id']

        fixed = client_for(specialist).patch(
            f'{CYCLES_URL}{draft.pk}/kpis/{kpi_id}/', {'weight': 70}, format='json',
        )
        assert fixed.status_code == 200, fixed.content
        assert Decimal(fixed.json()['data']['weight']) == Decimal('70')

        gone = client_for(specialist).delete(f'{CYCLES_URL}{draft.pk}/kpis/{kpi_id}/')
        assert gone.status_code == 204
        assert not PerformanceKPI.objects.filter(pk=kpi_id).exists()

    def test_kpi_of_other_cycle_is_not_reachable(self, cycle, specialist, grant_permissions):
        # القراءة تتطلّب `view`؛ الصلاحية تُفحص قبل جلب المؤشر، فالمقصود
        # هنا إثبات أن مؤشر دورة أخرى غير قابل للوصول أصلاً.
        grant_permissions(specialist, 'P6y', ['hr_performance:view', 'hr_performance:edit'])
        other = PerformanceCycle.objects.create(
            name='دورة أخرى', period_start=date(2026, 4, 1), period_end=date(2026, 6, 30),
            status=CycleStatus.DRAFT,
        )
        kpi = PerformanceKPI.objects.create(cycle=other, name='مؤشر', weight=Decimal('100'))
        assert client_for(specialist).get(
            f'{CYCLES_URL}{cycle.pk}/kpis/{kpi.pk}/'
        ).status_code == 404

    def test_closed_cycle_blocks_kpi_edits(self, cycle, specialist, grant_permissions):
        grant_permissions(specialist, 'P6z', ['hr_performance:edit'])
        kpi = PerformanceKPI.objects.create(cycle=cycle, name='مؤشر', weight=Decimal('100'))
        cycle.status = CycleStatus.CLOSED
        cycle.save(update_fields=['status', 'updated_at'])
        assert client_for(specialist).patch(
            f'{CYCLES_URL}{cycle.pk}/kpis/{kpi.pk}/', {'weight': 50}, format='json',
        ).status_code == 400
        assert client_for(specialist).delete(
            f'{CYCLES_URL}{cycle.pk}/kpis/{kpi.pk}/'
        ).status_code == 400

    def test_client_cannot_open_cycle_by_setting_status(self, specialist, grant_permissions):
        """`status` مشتق من قرار (`open`) لا من حمولة العميل."""
        grant_permissions(specialist, 'P6s', ['hr_performance:add'])
        res = client_for(specialist).post(f'{CYCLES_URL}', {
            'name': 'محاولة فتح', 'period_start': '2026-01-01', 'period_end': '2026-03-31',
            'status': CycleStatus.OPEN,
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['status'] == CycleStatus.DRAFT

    def test_client_cannot_request_unapproved_enrollment(self, staff, plan, grant_permissions):
        grant_permissions(staff, 'T6s', ['hr_training:add'])
        res = client_for(staff).post(f'{ENROLL_URL}', {
            'employee': staff.profile.id, 'plan': plan.pk, 'status': EnrollmentStatus.APPROVED,
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['status'] == EnrollmentStatus.DRAFT

    def test_client_cannot_submit_review_by_setting_status(self, staff, cycle, specialist,
                                                            grant_permissions):
        grant_permissions(specialist, 'P6r', ['hr_performance:add'])
        res = client_for(specialist).post(f'{REVIEWS_URL}', {
            'cycle': cycle.pk, 'employee': staff.profile.id,
            'status': ReviewStatus.APPROVED,
        }, format='json')
        assert res.status_code == 201, res.content
        assert res.json()['data']['status'] == ReviewStatus.DRAFT
        assert res.json()['data']['decided_by'] is None

    def test_duplicate_kpi_name_rejected(self, cycle, kpis, specialist, grant_permissions):
        grant_permissions(specialist, 'P18', ['hr_performance:edit'])
        res = client_for(specialist).post(f'{CYCLES_URL}{cycle.pk}/kpis/', {
            'name': 'الالتزام بالمواعيد', 'weight': 10,
        }, format='json')
        assert res.status_code == 400

    def test_employee_cannot_close_cycle(self, staff, cycle, kpis):
        """الإغلاق قرار معتمد — الموظف لا يُغلق دورته."""
        assert client_for(staff).post(
            f'{CYCLES_URL}{cycle.pk}/close/', {}, format='json',
        ).status_code == 403
        cycle.refresh_from_db()
        assert cycle.status == CycleStatus.OPEN

    def test_employee_reads_catalogs_but_cannot_write_them(self, staff, plan, cycle, kpis):
        """الموظف يحتاج القوائم لملء نماذجه، ولا يملك الكتابة عليها.

        الروابط: دورات التدريب لاختيار ما يشترك فيه، والدورة المفتوحة
        ليعرف ما يُقيَّم به.
        """
        assert client_for(staff).get(PLANS_URL).status_code == 200
        assert client_for(staff).get(f'{PLANS_URL}{plan.pk}/').status_code == 200
        assert client_for(staff).get(CYCLES_URL).status_code == 200

        assert client_for(staff).post(
            PLANS_URL, {'name': 'x', 'code': 'X1'}, format='json',
        ).status_code == 403
        assert client_for(staff).post(CYCLES_URL, {
            'name': 'محاولة', 'period_start': '2026-01-01', 'period_end': '2026-03-31',
        }, format='json').status_code == 403

    def test_employee_does_not_see_review_counts(self, staff, cycle, kpis, specialist,
                                                 grant_permissions):
        """عدّاد التقييمات إحصاء إداري عن موظفين آخرين."""
        make_review(staff.profile, specialist, cycle, kpi_scores={kpis[0]: 90})
        grant_permissions(specialist, 'P6c', ['hr_performance:view'])

        seen_by_employee = client_for(staff).get(CYCLES_URL).json()['data']['results'][0]
        assert seen_by_employee['review_count'] is None
        assert seen_by_employee['approved_count'] is None

        seen_by_hr = client_for(specialist).get(CYCLES_URL).json()['data']['results'][0]
        assert seen_by_hr['review_count'] == 1
        assert seen_by_hr['approved_count'] == 0

    def test_draft_cycle_opens_only_with_kpi_and_approver(self, specialist, approver,
                                                            grant_permissions):
        draft = PerformanceCycle.objects.create(
            name='مسودة', period_start=date(2026, 1, 1), period_end=date(2026, 3, 31),
            status=CycleStatus.DRAFT,
        )
        grant_permissions(specialist, 'P6o', ['hr_performance:edit'])
        grant_permissions(approver, 'P6p', ['hr_performance:approve'])

        # بلا مؤشرات: لا فائدة من فتح دورة لا يمكن تقييمها.
        assert client_for(approver).post(
            f'{CYCLES_URL}{draft.pk}/open/', {}, format='json',
        ).status_code == 400

        PerformanceKPI.objects.create(cycle=draft, name='مؤشر', weight=Decimal('100'))
        assert client_for(approver).post(
            f'{CYCLES_URL}{draft.pk}/open/', {}, format='json',
        ).status_code == 200
        draft.refresh_from_db()
        assert draft.status == CycleStatus.OPEN

        # لا يُفتح مرتين، ولا يفتحه من لا يملك الاعتماد.
        assert client_for(approver).post(
            f'{CYCLES_URL}{draft.pk}/open/', {}, format='json',
        ).status_code == 400
        assert client_for(specialist).post(
            f'{CYCLES_URL}{draft.pk}/open/', {}, format='json',
        ).status_code == 403

    def test_cycle_with_reviews_cannot_be_deleted(self, cycle, staff, specialist,
                                                  grant_permissions):
        make_review(staff.profile, specialist, cycle)
        grant_permissions(specialist, 'P19', ['hr_performance:delete'])
        assert client_for(specialist).delete(f'{CYCLES_URL}{cycle.pk}/').status_code == 400
