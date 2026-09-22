from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GovernmentIntegrationViewSet,
    ITAssetViewSet,
    ItDashboardViewSet,
    ItReportViewSet,
    ItSystemViewSet,
    NationalItDashboardViewSet,
    NetworkStatusViewSet,
    SupportTicketViewSet,
)

router = DefaultRouter()
router.register('dashboard', ItDashboardViewSet, basename='it-dashboard')
router.register('systems', ItSystemViewSet, basename='it-system')
router.register('assets', ITAssetViewSet, basename='it-asset')
router.register('tickets', SupportTicketViewSet, basename='it-ticket')
router.register('networks', NetworkStatusViewSet, basename='it-network')
router.register('reports', ItReportViewSet, basename='it-report')
router.register('national/dashboard', NationalItDashboardViewSet, basename='it-national-dashboard')
router.register('integrations', GovernmentIntegrationViewSet, basename='it-integration')

urlpatterns = [
    path('', include(router.urls)),
]