from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BerthViewSet,
    CargoInspectionViewSet,
    CrewMemberViewSet,
    FoodWaterInspectionViewSet,
    HealthCertificateViewSet,
    HealthDeclarationViewSet,
    IsolationRecordViewSet,
    PassengerViewSet,
    PortEmergencyViewSet,
    PortHealthDashboardViewSet,
    SanitationCertificateViewSet,
    SeaPortViewSet,
    ShipInspectionViewSet,
    SurveillanceCaseViewSet,
    VectorControlViewSet,
    VesselViewSet,
    VesselVisitViewSet,
    WasteInspectionViewSet,
)

router = DefaultRouter()
router.register('dashboard', PortHealthDashboardViewSet, basename='port-health-dashboard')
router.register('seaports', SeaPortViewSet, basename='seaport')
router.register('berths', BerthViewSet, basename='berth')
router.register('vessels', VesselViewSet, basename='vessel')
router.register('visits', VesselVisitViewSet, basename='vessel-visit')
router.register('crew', CrewMemberViewSet, basename='crew-member')
router.register('passengers', PassengerViewSet, basename='passenger')
router.register('declarations', HealthDeclarationViewSet, basename='health-declaration')
router.register('ship-inspections', ShipInspectionViewSet, basename='ship-inspection')
router.register('food-water-inspections', FoodWaterInspectionViewSet, basename='food-water-inspection')
router.register('sanitation-certificates', SanitationCertificateViewSet, basename='sanitation-certificate')
router.register('isolation-records', IsolationRecordViewSet, basename='isolation-record')
router.register('surveillance-cases', SurveillanceCaseViewSet, basename='surveillance-case')
router.register('vector-controls', VectorControlViewSet, basename='vector-control')
router.register('cargo-inspections', CargoInspectionViewSet, basename='cargo-inspection')
router.register('waste-inspections', WasteInspectionViewSet, basename='waste-inspection')
router.register('emergencies', PortEmergencyViewSet, basename='port-emergency')
router.register('certificates', HealthCertificateViewSet, basename='health-certificate')

urlpatterns = [
    path('', include(router.urls)),
]
