from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentNodeAssignmentViewSet,
    FacilityOwnershipViewSet,
    FacilityOwnerViewSet,
    HealthFacilityNodeAssignmentViewSet,
    LocalityNodeAssignmentViewSet,
    RegistryChangeLogViewSet,
    RegistryDashboardViewSet,
    ReportingNodeViewSet,
    ServiceAvailabilityViewSet,
    ServiceViewSet,
    StateMinistryViewSet,
    StateNodeAssignmentViewSet,
    TechnicalSupervisorViewSet,
    TechnicalSupervisionViewSet,
)

router = DefaultRouter()
router.register("nodes", ReportingNodeViewSet, basename="registry-node")
router.register("states/assignments", StateNodeAssignmentViewSet, basename="registry-state-assignment")
router.register("localities/assignments", LocalityNodeAssignmentViewSet, basename="registry-locality-assignment")
router.register("facilities/assignments", HealthFacilityNodeAssignmentViewSet, basename="registry-facility-assignment")
router.register("ministries", StateMinistryViewSet, basename="registry-ministry")
router.register("changelog", RegistryChangeLogViewSet, basename="registry-changelog")
router.register("dashboard", RegistryDashboardViewSet, basename="registry-dashboard")
router.register("owners", FacilityOwnerViewSet, basename="registry-owners")
router.register("facility-ownerships", FacilityOwnershipViewSet, basename="registry-facility-ownerships")
router.register("technical-supervisors", TechnicalSupervisorViewSet, basename="registry-technical-supervisors")
router.register("technical-supervisions", TechnicalSupervisionViewSet, basename="registry-technical-supervisions")
router.register("department-assignments", DepartmentNodeAssignmentViewSet, basename="registry-department-assignments")
router.register("services", ServiceViewSet, basename="registry-services")
router.register("service-availability", ServiceAvailabilityViewSet, basename="registry-service-availability")

urlpatterns = [
    path("", include(router.urls)),
]
