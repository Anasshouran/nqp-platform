from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceWindowViewSet, WindowCommodityViewSet, ShipmentTransactionViewSet,
    TransactionCommodityViewSet, CommodityDecisionViewSet, WindowAssignmentViewSet,
    WindowAuditLogViewSet,
)

router = DefaultRouter()
router.register('windows', ServiceWindowViewSet, basename='window')
router.register('commodities', WindowCommodityViewSet, basename='commodity')
router.register('transactions', ShipmentTransactionViewSet, basename='transaction')
router.register('transaction-commodities', TransactionCommodityViewSet, basename='transaction-commodity')
router.register('decisions', CommodityDecisionViewSet, basename='decision')
router.register('assignments', WindowAssignmentViewSet, basename='assignment')
router.register('audit-logs', WindowAuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
