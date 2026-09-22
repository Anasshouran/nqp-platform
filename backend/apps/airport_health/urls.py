from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AircraftInspectionViewSet,
    AirportDashboardViewSet,
    AirportScreeningViewSet,
    CrewHealthRecordViewSet,
    PortViewSet,
    ScreeningPointViewSet,
    TerminalViewSet,
)

router = DefaultRouter()
router.register('ports', PortViewSet, basename='port')
router.register('terminals', TerminalViewSet, basename='terminal')
router.register('screening-points', ScreeningPointViewSet, basename='screening-point')
router.register('screenings', AirportScreeningViewSet, basename='airport-screening')
router.register('aircraft-inspections', AircraftInspectionViewSet, basename='aircraft-inspection')
router.register('crew-records', CrewHealthRecordViewSet, basename='crew-record')
router.register('dashboard', AirportDashboardViewSet, basename='airport-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
