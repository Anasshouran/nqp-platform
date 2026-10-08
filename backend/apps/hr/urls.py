"""مسارات وحدة شؤون الموظفين.

المرحلة 0 تأسّس الأساس (الصلاحيات والنطاق). المرحلة 1 تضيف ملفات الموظفين
والمسار الوظيفي. المرحلة 2 تضيف لوحة الموارد والوحدات التأسيسية.
المرحلة 3 تضيف طلبات النقل/الترقية.
المرحلة 4 تضيف سجلات الحضور والانصراف.
المرحلة 5 تضيف الإجازات وأرصدتها.
المرحلة 6 تضيف التدريب وتقييم الأداء.
المسارات تُضاف تباعاً مع بقية المراحل.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceRecordViewSet,
    EmployeeTimelineViewSet,
    PerformanceCycleViewSet,
    PerformanceReviewViewSet,
    TrainingEnrollmentViewSet,
    TrainingPlanViewSet,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
    EmployeeViewSet,
    HrDashboardView,
    HrEstablishmentViewSet,
    HrLinkableUserViewSet,
    HrPingView,
    PostingRequestViewSet,
)

app_name = 'hr'

router = DefaultRouter()
router.register('employees', EmployeeViewSet, basename='hr-employee')
router.register('employee-timeline', EmployeeTimelineViewSet, basename='hr-employee-timeline')
router.register('establishments', HrEstablishmentViewSet, basename='hr-establishment')
router.register('linkable-users', HrLinkableUserViewSet, basename='hr-linkable-user')
router.register('posting-requests', PostingRequestViewSet, basename='hr-posting-request')
router.register('attendance', AttendanceRecordViewSet, basename='hr-attendance')
router.register('leave-requests', LeaveRequestViewSet, basename='hr-leave-request')
router.register('leave-balances', LeaveBalanceViewSet, basename='hr-leave-balance')
router.register('leave-types', LeaveTypeViewSet, basename='hr-leave-type')
router.register('training-plans', TrainingPlanViewSet, basename='hr-training-plan')
router.register('training-enrollments', TrainingEnrollmentViewSet, basename='hr-training-enrollment')
router.register('performance-cycles', PerformanceCycleViewSet, basename='hr-performance-cycle')
router.register('performance-reviews', PerformanceReviewViewSet, basename='hr-performance-review')

urlpatterns = [
    path('ping/', HrPingView.as_view(), name='ping'),
    path('dashboard/', HrDashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
