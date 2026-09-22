from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FeeViewSet,
    InvoiceViewSet,
    PaymentAttemptViewSet,
    ReceiptViewSet,
    ReconciliationViewSet,
    FinancialAuditLogViewSet,
    FinanceReportViewSet,
)

router = DefaultRouter()
router.register('fees', FeeViewSet, basename='fee')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('payments', PaymentAttemptViewSet, basename='payment')
router.register('receipts', ReceiptViewSet, basename='receipt')
router.register('reconciliations', ReconciliationViewSet, basename='reconciliation')
router.register('audit-logs', FinancialAuditLogViewSet, basename='audit-log')
router.register('reports', FinanceReportViewSet, basename='finance-report')

urlpatterns = [
    path('', include(router.urls)),
]