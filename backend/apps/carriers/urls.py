from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CarrierApiUsageLogViewSet,
    CarrierCompanyViewSet,
    CarrierDashboardViewSet,
    CarrierIntegrationViewSet,
    CarrierRegistrationViewSet,
    CarrierReportViewSet,
    CarrierViewSet,
    FlightHealthEventViewSet,
    FlightViewSet,
    HealthNoticeViewSet,
)

router = DefaultRouter()
router.register('flights', FlightViewSet, basename='flight')
router.register('companies', CarrierViewSet, basename='carrier')
router.register('notices', HealthNoticeViewSet, basename='notice')
router.register('company', CarrierCompanyViewSet, basename='company')
router.register('dashboard', CarrierDashboardViewSet, basename='dashboard')
router.register('reports', CarrierReportViewSet, basename='report')
router.register('registrations', CarrierRegistrationViewSet, basename='registration')
router.register('health-events', FlightHealthEventViewSet, basename='health-event')
router.register('api-logs', CarrierApiUsageLogViewSet, basename='api-log')

urlpatterns = [
    path('', include(router.urls)),
    path('integration/flights/', CarrierIntegrationViewSet.as_view({'post': 'create_flight'}), name='carrier-integration-flights'),
    path('integration/flights/manifest', CarrierIntegrationViewSet.as_view({'post': 'flight_manifest'}), name='carrier-integration-manifest'),
    path('integration/flights/<str:pk>/status/', CarrierIntegrationViewSet.as_view({'get': 'flight_status'}), name='carrier-integration-status'),
    path('integration/health-notices/', CarrierIntegrationViewSet.as_view({'get': 'health_notices'}), name='carrier-integration-notices'),
    path('integration/health-events/', CarrierIntegrationViewSet.as_view({'post': 'report_health_event'}, required_scope='health_events'), name='carrier-integration-health-events'),
]