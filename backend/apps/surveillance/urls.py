from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.surveillance.views import (
    AlertRuleViewSet,
    ContactTraceViewSet,
    DailyReportViewSet,
    HealthCaseViewSet,
    HealthEventViewSet,
    InvestigationReportViewSet,
    InvestigationViewSet,
    MonthlyReportViewSet,
    NotificationViewSet,
    OutbreakReportViewSet,
    OutbreakViewSet,
    SpecimenViewSet,
    SurveillanceAlertViewSet,
    SurveillanceDashboardViewSet,
    VectorLinkViewSet,
    WeeklyReportViewSet,
)
from apps.surveillance.views.gis import GISViewSet

app_name = 'surveillance'

router = DefaultRouter()
router.register('cases', HealthCaseViewSet, basename='case')
router.register('contacts', ContactTraceViewSet, basename='contact')
router.register('investigations', InvestigationViewSet, basename='investigation')
router.register('specimens', SpecimenViewSet, basename='specimen')
router.register('alerts', SurveillanceAlertViewSet, basename='alert')
router.register('alert-rules', AlertRuleViewSet, basename='alert-rule')
router.register('outbreaks', OutbreakViewSet, basename='outbreak')
router.register('events', HealthEventViewSet, basename='event')
router.register('reports/daily', DailyReportViewSet, basename='report-daily')
router.register('reports/weekly', WeeklyReportViewSet, basename='report-weekly')
router.register('reports/monthly', MonthlyReportViewSet, basename='report-monthly')
router.register('reports/outbreaks', OutbreakReportViewSet, basename='report-outbreak')
router.register('reports/investigations', InvestigationReportViewSet, basename='report-investigation')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('vector-links', VectorLinkViewSet, basename='vector-link')
router.register('gis', GISViewSet, basename='gis')

urlpatterns = [
    path(
        'dashboard/stats/',
        SurveillanceDashboardViewSet.as_view({'get': 'stats'}),
        name='dashboard-stats',
    ),
    path(
        'dashboard/timeline/',
        SurveillanceDashboardViewSet.as_view({'get': 'timeline'}),
        name='dashboard-timeline',
    ),
    path('', include(router.urls)),
]