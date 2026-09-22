from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CapaRecordViewSet,
    CriticalResultViewSet,
    DiseaseViewSet,
    LabEquipmentViewSet,
    LabSampleViewSet,
    LabSectionViewSet,
    LabTestCatalogViewSet,
    LabUserViewSet,
    MaterialIssueViewSet,
    NonConformityViewSet,
    QCRecordViewSet,
    ReagentLotViewSet,
    ReagentViewSet,
    SampleTestViewSet,
    StorageLocationViewSet,
)

router = DefaultRouter()
router.register('samples', LabSampleViewSet, basename='sample')
router.register('sample-tests', SampleTestViewSet, basename='sample-test')
router.register('sections', LabSectionViewSet, basename='lab-section')
router.register('test-catalog', LabTestCatalogViewSet, basename='lab-test-catalog')
router.register('equipment', LabEquipmentViewSet, basename='lab-equipment')
router.register('reagents', ReagentViewSet, basename='reagent')
router.register('reagent-lots', ReagentLotViewSet, basename='reagent-lot')
router.register('material-issues', MaterialIssueViewSet, basename='material-issue')
router.register('storage-locations', StorageLocationViewSet, basename='storage-location')
router.register('qc', QCRecordViewSet, basename='qc-record')
router.register('non-conformities', NonConformityViewSet, basename='non-conformity')
router.register('capa', CapaRecordViewSet, basename='capa')
router.register('critical', CriticalResultViewSet, basename='critical-result')
router.register('diseases', DiseaseViewSet, basename='disease')
router.register('users', LabUserViewSet, basename='lab-user')

urlpatterns = [
    path('', include(router.urls)),
]