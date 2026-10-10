from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CarrierApiUsageLogViewSet,
    CarrierCompanyViewSet,
    CarrierDashboardViewSet,
    CarrierDocumentViewSet,
    CarrierIntegrationViewSet,
    CarrierMemberViewSet,
    CarrierRegistrationViewSet,
    CarrierReportViewSet,
    CarrierViewSet,
    FlightHealthEventViewSet,
    FlightViewSet,
    HealthDeclarationViewSet,
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
router.register('health-declarations', HealthDeclarationViewSet, basename='health-declaration')
router.register('documents', CarrierDocumentViewSet, basename='carrier-document')
router.register('api-logs', CarrierApiUsageLogViewSet, basename='api-log')

urlpatterns = [
    path('', include(router.urls)),

    # M8-B.2: إدارة أعضاء شركة النقل — مسارات صريحة، لا nested router جديد.
    # `carrier_id` من المسار هو حامل النطاق، والتحقق منه داخل الـviewset لا
    # من جسد الطلب. لا رابط DELETE، فتعطيل العضوية هو الإزالة التشغيلية.
    path(
        'companies/<uuid:carrier_id>/members/',
        CarrierMemberViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='carrier-members',
    ),
    path(
        'companies/<uuid:carrier_id>/members/<uuid:pk>/',
        CarrierMemberViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}),
        name='carrier-member-detail',
    ),
    path(
        'companies/<uuid:carrier_id>/members/<uuid:pk>/activate/',
        CarrierMemberViewSet.as_view({'post': 'activate'}),
        name='carrier-member-activate',
    ),
    path(
        'companies/<uuid:carrier_id>/members/<uuid:pk>/deactivate/',
        CarrierMemberViewSet.as_view({'post': 'deactivate'}),
        name='carrier-member-deactivate',
    ),

    path('integration/flights/', CarrierIntegrationViewSet.as_view({'post': 'create_flight'}), name='carrier-integration-flights'),
    path('integration/flights/manifest', CarrierIntegrationViewSet.as_view({'post': 'flight_manifest'}), name='carrier-integration-manifest'),
    path('integration/flights/<str:pk>/status/', CarrierIntegrationViewSet.as_view({'get': 'flight_status'}), name='carrier-integration-status'),
    path('integration/health-notices/', CarrierIntegrationViewSet.as_view({'get': 'health_notices'}), name='carrier-integration-notices'),
    path('integration/health-events/', CarrierIntegrationViewSet.as_view({'post': 'report_health_event'}, required_scope='health_events'), name='carrier-integration-health-events'),
]