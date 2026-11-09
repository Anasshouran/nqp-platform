from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    HealthFacilityNodeAssignmentViewSet,
    LocalityNodeAssignmentViewSet,
    RegistryChangeLogViewSet,
    RegistryDashboardViewSet,
    ReportingNodeViewSet,
    StateMinistryViewSet,
    StateNodeAssignmentViewSet,
)

router = DefaultRouter()
router.register("nodes", ReportingNodeViewSet, basename="registry-node")
router.register("states/assignments", StateNodeAssignmentViewSet, basename="registry-state-assignment")
router.register("localities/assignments", LocalityNodeAssignmentViewSet, basename="registry-locality-assignment")
router.register("facilities/assignments", HealthFacilityNodeAssignmentViewSet, basename="registry-facility-assignment")
router.register("ministries", StateMinistryViewSet, basename="registry-ministry")
router.register("changelog", RegistryChangeLogViewSet, basename="registry-changelog")
router.register("dashboard", RegistryDashboardViewSet, basename="registry-dashboard")

urlpatterns = [
    path("", include(router.urls)),
]
