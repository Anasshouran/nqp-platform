from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlertViewSet,
    ContactTraceViewSet,
    DashboardViewSet,
    EmergencyEventViewSet,
    HealthCaseViewSet,
    InvestigationViewSet,
    KillSwitchViewSet,
    ReportableDiseaseViewSet,
    ResponsePlanViewSet,
    SurveillanceAlertViewSet,
    SurveillanceDashboardViewSet,
    WeeklySurveillanceReportViewSet,
)

router = DefaultRouter()
router.register('alerts', AlertViewSet, basename='alert')
router.register('kill-switch', KillSwitchViewSet, basename='kill-switch')
router.register('plans', ResponsePlanViewSet, basename='plan')
router.register('events', EmergencyEventViewSet, basename='event')
router.register('reportable-diseases', ReportableDiseaseViewSet, basename='reportable-disease')
router.register('cases', HealthCaseViewSet, basename='health-case')
router.register('surveillance-alerts', SurveillanceAlertViewSet, basename='surveillance-alert')
router.register('contacts', ContactTraceViewSet, basename='contact-trace')
router.register('investigations', InvestigationViewSet, basename='investigation')
router.register('weekly-reports', WeeklySurveillanceReportViewSet, basename='weekly-report')

urlpatterns = [
    path('dashboard/', DashboardViewSet.as_view({'get': 'stats'}), name='eoc-dashboard'),
    path(
        'surveillance/dashboard/',
        SurveillanceDashboardViewSet.as_view({'get': 'stats'}),
        name='surveillance-dashboard',
    ),
    path('', include(router.urls)),
]