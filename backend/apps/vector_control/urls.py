from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryMovementViewSet,
    VectorAlertViewSet,
    VectorAttachmentViewSet,
    VectorAuditLogViewSet,
    VectorCaseViewSet,
    VectorChemicalViewSet,
    VectorControlDashboardViewSet,
    VectorControlOperationViewSet,
    VectorEquipmentViewSet,
    VectorFocusViewSet,
    VectorFollowUpViewSet,
    VectorInspectionViewSet,
    VectorInventoryItemViewSet,
    VectorLabResultViewSet,
    VectorRegistryViewSet,
    VectorReportViewSet,
    VectorSampleViewSet,
    VectorSiteViewSet,
    VectorSurveyViewSet,
    VectorTeamViewSet,
    VectorUnitViewSet,
)

router = DefaultRouter()
router.register('units', VectorUnitViewSet, basename='vector-unit')
router.register('teams', VectorTeamViewSet, basename='vector-team')
router.register('sites', VectorSiteViewSet, basename='vector-site')
router.register('vectors', VectorRegistryViewSet, basename='vector')
router.register('reports', VectorReportViewSet, basename='vector-report')
router.register('foci', VectorFocusViewSet, basename='vector-focus')
router.register('inspections', VectorInspectionViewSet, basename='vector-inspection')
router.register('surveys', VectorSurveyViewSet, basename='vector-survey')
router.register('samples', VectorSampleViewSet, basename='vector-sample')
router.register('lab-results', VectorLabResultViewSet, basename='vector-lab-result')
router.register('operations', VectorControlOperationViewSet, basename='vector-operation')
router.register('chemicals', VectorChemicalViewSet, basename='vector-chemical')
router.register('equipment', VectorEquipmentViewSet, basename='vector-equipment')
router.register('inventory', VectorInventoryItemViewSet, basename='vector-inventory')
router.register('inventory-movements', InventoryMovementViewSet, basename='vector-movement')
router.register('followups', VectorFollowUpViewSet, basename='vector-followup')
router.register('cases', VectorCaseViewSet, basename='vector-case')
router.register('alerts', VectorAlertViewSet, basename='vector-alert')
router.register('attachments', VectorAttachmentViewSet, basename='vector-attachment')
router.register('audit-logs', VectorAuditLogViewSet, basename='vector-audit-log')
router.register('dashboard', VectorControlDashboardViewSet, basename='vector-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]