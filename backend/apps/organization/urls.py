from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    LocalityViewSet,
    OrganizationTreeViewSet,
    OrgAssignmentViewSet,
    OrgPositionViewSet,
    SectorViewSet,
    StationViewSet,
)

router = DefaultRouter()
router.register('tree', OrganizationTreeViewSet, basename='org-tree')
router.register('positions', OrgPositionViewSet, basename='org-position')
router.register('sectors', SectorViewSet, basename='org-sector')
router.register('localities', LocalityViewSet, basename='org-locality')
router.register('departments', DepartmentViewSet, basename='org-department')
router.register('stations', StationViewSet, basename='org-station')
router.register('assignments', OrgAssignmentViewSet, basename='org-assignment')

urlpatterns = [
    path('', include(router.urls)),
]