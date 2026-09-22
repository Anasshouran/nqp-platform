from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.carriers.views import CarrierIntegrationViewSet
from .views import (
    DeveloperAppViewSet,
    ExternalEntityViewSet,
    IntegrationLogViewSet,
    IntegrationViewSet,
    WebhookEndpointViewSet,
)

router = DefaultRouter()
router.register('logs', IntegrationLogViewSet, basename='integration-log')
router.register('entities', ExternalEntityViewSet, basename='external-entity')
router.register('developer-apps', DeveloperAppViewSet, basename='developer-app')
router.register('webhooks', WebhookEndpointViewSet, basename='webhook')

urlpatterns = [
    path('', IntegrationViewSet.as_view({
        'get': 'overview',
    }), name='integration-root'),
    path('airlines/flights/', CarrierIntegrationViewSet.as_view({'post': 'create_flight'}), name='integration-airlines-flights'),
    path('airlines/manifest/', CarrierIntegrationViewSet.as_view({'post': 'flight_manifest'}), name='integration-airlines-manifest'),
    path('airlines/notices/', CarrierIntegrationViewSet.as_view({'get': 'health_notices'}), name='integration-airlines-notices'),
    path('moh/reports/', IntegrationViewSet.as_view({'post': 'moh_reports'}), name='integration-moh-reports'),
    path('moh/alerts/', IntegrationViewSet.as_view({'post': 'moh_alerts'}), name='integration-moh-alerts'),
    path('moh/policies/', IntegrationViewSet.as_view({'post': 'moh_policies'}), name='integration-moh-policies'),
    path('customs/certificate/', IntegrationViewSet.as_view({'post': 'customs_certificate'}), name='integration-customs-cert'),
    path('customs/status/', IntegrationViewSet.as_view({'post': 'customs_status'}), name='integration-customs-status'),
    path('ihr/report/pheic/', IntegrationViewSet.as_view({'get': 'ihr_pheic'}), name='integration-ihr-pheic'),
    path('ihr/report/submit/', IntegrationViewSet.as_view({'post': 'ihr_submit'}), name='integration-ihr-submit'),
    path('ihr/report/weekly/', IntegrationViewSet.as_view({'get': 'ihr_weekly'}), name='integration-ihr-weekly'),
    path('immigration/verify/', IntegrationViewSet.as_view({'post': 'immigration_verify'}), name='integration-immigration'),
    path('labs/request/', IntegrationViewSet.as_view({'post': 'labs_request'}), name='integration-labs-request'),
    path('labs/result/', IntegrationViewSet.as_view({'post': 'labs_result'}), name='integration-labs-result'),
    path('surveillance/aggregated/', IntegrationViewSet.as_view({'post': 'surveillance_aggregated'}), name='integration-surv-aggregated'),
    path('surveillance/alert/', IntegrationViewSet.as_view({'post': 'surveillance_alert'}), name='integration-surv-alert'),
    path('hospitals/referral/', IntegrationViewSet.as_view({'post': 'hospitals_referral'}), name='integration-hosp-referral'),
    path('hospitals/confirm/', IntegrationViewSet.as_view({'post': 'hospitals_confirm'}), name='integration-hosp-confirm'),
    path('', include(router.urls)),
]
