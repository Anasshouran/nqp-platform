from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ClearanceDecisionRecordView,
    PortClearanceDecisionViewSet,
    ShippingCompanyViewSet,
    ShippingAgentViewSet,
    PreArrivalNotificationViewSet,
    VesselCompanyRelationshipViewSet,
    VesselDepartureView,
    VesselVisitRequestView,
    ShippingAuditLogViewSet,
)

router = DefaultRouter()
router.register(r'companies', ShippingCompanyViewSet, basename='shipping-company')
router.register(r'agents', ShippingAgentViewSet, basename='shipping-agent')
router.register(r'pre-arrivals', PreArrivalNotificationViewSet, basename='pre-arrival-notification')
router.register(r'clearance-decisions', PortClearanceDecisionViewSet, basename='port-clearance-decision')
router.register(r'vessel-relationships', VesselCompanyRelationshipViewSet, basename='vessel-company-relationship')
router.register(r'audit-logs', ShippingAuditLogViewSet, basename='shipping-audit-log')

# Single write path for a clearance decision, always against an explicit port call.
clearance_record = ClearanceDecisionRecordView.as_view({
    'post': 'create',
    'get': 'list',
})

# Single write path for a departure. Departure is a domain action, never a
# `PATCH {"status": "DEPARTED"}`.
departure_record = VesselDepartureView.as_view({'post': 'create'})

# Self-service port-call request (company/agent). Creates an EXPECTED visit.
visit_request = VesselVisitRequestView.as_view({'post': 'create'})

urlpatterns = [
    path('vessel-visits/<uuid:vessel_visit_id>/clearance-decision/', clearance_record,
         name='vessel-visit-clearance-decision'),
    path('vessel-visits/<uuid:vessel_visit_id>/depart/', departure_record,
         name='vessel-visit-depart'),
    path('vessel-visits/request/', visit_request, name='vessel-visit-request'),
    *router.urls,
]