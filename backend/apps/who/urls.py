from rest_framework.routers import DefaultRouter

from .views import (
    DiseaseMasterViewSet,
    WHOICDMappingViewSet,
    WHOICDSearchViewSet,
    WHOIntegrationViewSet,
    WHOSyncLogViewSet,
)

router = DefaultRouter()
router.register('integrations', WHOIntegrationViewSet, basename='who-integrations')
router.register('logs', WHOSyncLogViewSet, basename='who-logs')
router.register('diseases', DiseaseMasterViewSet, basename='who-diseases')
router.register('mappings', WHOICDMappingViewSet, basename='who-mappings')
router.register('icd', WHOICDSearchViewSet, basename='who-icd')

urlpatterns = router.urls