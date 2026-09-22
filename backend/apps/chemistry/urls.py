from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChemistryTestViewSet,
    ChemistryEquipmentViewSet,
    ChemistryReagentViewSet,
    QCRecordViewSet,
    ChemistryAnalysisSessionViewSet,
)

router = DefaultRouter()
router.register('tests', ChemistryTestViewSet, basename='chemistry-test')
router.register('equipment', ChemistryEquipmentViewSet, basename='chemistry-equipment')
router.register('reagents', ChemistryReagentViewSet, basename='chemistry-reagent')
router.register('qc-records', QCRecordViewSet, basename='qc-record')
router.register('analysis-sessions', ChemistryAnalysisSessionViewSet, basename='analysis-session')

urlpatterns = [
    path('', include(router.urls)),
]