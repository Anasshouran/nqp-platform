from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EntryPointViewSet,
    HealthFacilityViewSet,
    MasterDataTreeView,
    SectionMemberViewSet,
    SectionViewSet,
    SectorViewSet,
    StateViewSet,
    StationViewSet,
    TerminalViewSet,
)

router = DefaultRouter()
router.register('tree', MasterDataTreeView, basename='masterdata-tree')
router.register('sectors', SectorViewSet, basename='masterdata-sector')
router.register('states', StateViewSet, basename='masterdata-state')
router.register('entry-points', EntryPointViewSet, basename='masterdata-entrypoint')
router.register('health-facilities', HealthFacilityViewSet, basename='masterdata-healthfacility')
router.register('terminals', TerminalViewSet, basename='masterdata-terminal')
router.register('stations', StationViewSet, basename='masterdata-station')
router.register('sections', SectionViewSet, basename='masterdata-section')
router.register('members', SectionMemberViewSet, basename='masterdata-member')

urlpatterns = [
    path('', include(router.urls)),
]