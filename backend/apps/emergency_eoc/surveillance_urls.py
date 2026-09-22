from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContactTraceViewSet,
    HealthCaseViewSet,
    InvestigationViewSet,
    ReportableDiseaseViewSet,
    SurveillanceAlertViewSet,
    SurveillanceDashboardViewSet,
    WeeklySurveillanceReportViewSet,
)

router = DefaultRouter()
router.register('reportable-diseases', ReportableDiseaseViewSet, basename='reportable-disease')
router.register('cases', HealthCaseViewSet, basename='health-case')
router.register('surveillance-alerts', SurveillanceAlertViewSet, basename='surveillance-alert')
router.register('contacts', ContactTraceViewSet, basename='contact-trace')
router.register('investigations', InvestigationViewSet, basename='investigation')
router.register('weekly-reports', WeeklySurveillanceReportViewSet, basename='weekly-report')

urlpatterns = [
    path(
        'dashboard/',
        SurveillanceDashboardViewSet.as_view({'get': 'stats'}),
        name='surveillance-dashboard',
    ),
    path('', include(router.urls))
]