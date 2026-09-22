from rest_framework.routers import DefaultRouter

from .views import (
    DiseaseMasterViewSet,
    WHOIntegrationViewSet,
    WHOSyncLogViewSet,
)

router = DefaultRouter()
router.register('integrations', WHOIntegrationViewSet, basename='who-integrations')
router.register('logs', WHOSyncLogViewSet, basename='who-logs')
router.register('diseases', DiseaseMasterViewSet, basename='who-diseases')

urlpatterns = router.urls