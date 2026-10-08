"""مسارات نظام صحة المعابر البرية — تُركَّب تحت `/api/v1/borders-health/`."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BorderCertificateViewSet,
    BorderCrossingViewSet,
    BorderDailyStatisticsViewSet,
    BorderDecisionViewSet,
    BorderEmergencyViewSet,
    BorderFacilityViewSet,
    BorderHealthIncidentViewSet,
    BorderNotificationViewSet,
    BordersHealthDashboardViewSet,
    BorderSampleViewSet,
    BorderScreeningViewSet,
    BorderShiftViewSet,
    BorderStaffViewSet,
    CargoInspectionViewSet,
    ContactTracingCaseViewSet,
    ContactViewSet,
    HealthDeclarationViewSet,
    IsolationCaseViewSet,
    QuarantineCaseViewSet,
    TravelerHealthRecordViewSet,
    VehicleInspectionViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register('dashboard', BordersHealthDashboardViewSet, basename='borders-dashboard')
router.register('crossings', BorderCrossingViewSet, basename='border-crossing')
router.register('facilities', BorderFacilityViewSet, basename='border-facility')
router.register('shifts', BorderShiftViewSet, basename='border-shift')
router.register('staff', BorderStaffViewSet, basename='border-staff')
router.register('traveler-records', TravelerHealthRecordViewSet, basename='border-traveler-record')
router.register('declarations', HealthDeclarationViewSet, basename='border-declaration')
router.register('screenings', BorderScreeningViewSet, basename='border-screening')
router.register('vehicles', VehicleViewSet, basename='border-vehicle')
router.register('vehicle-inspections', VehicleInspectionViewSet, basename='border-vehicle-inspection')
router.register('cargo-inspections', CargoInspectionViewSet, basename='border-cargo-inspection')
router.register('samples', BorderSampleViewSet, basename='border-sample')
router.register('quarantine-cases', QuarantineCaseViewSet, basename='border-quarantine-case')
router.register('isolation-cases', IsolationCaseViewSet, basename='border-isolation-case')
router.register('contact-tracing-cases', ContactTracingCaseViewSet, basename='border-contact-tracing-case')
router.register('contacts', ContactViewSet, basename='border-contact')
router.register('incidents', BorderHealthIncidentViewSet, basename='border-incident')
router.register('emergencies', BorderEmergencyViewSet, basename='border-emergency')
router.register('certificates', BorderCertificateViewSet, basename='border-certificate')
router.register('decisions', BorderDecisionViewSet, basename='border-decision')
router.register('notifications', BorderNotificationViewSet, basename='border-notification')
router.register('daily-statistics', BorderDailyStatisticsViewSet, basename='border-daily-statistic')

urlpatterns = [
    path('', include(router.urls)),
]
