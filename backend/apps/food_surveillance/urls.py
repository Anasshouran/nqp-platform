from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CorrectiveActionViewSet,
    FoodAlertViewSet,
    FoodEstablishmentViewSet,
    FoodRecallViewSet,
    NonConformityViewSet,
    RiskAssessmentViewSet,
    SurveillanceDashboardViewSet,
)

router = DefaultRouter()
router.register('alerts', FoodAlertViewSet, basename='surveillance-alert')
router.register('establishments', FoodEstablishmentViewSet, basename='surveillance-establishment')
router.register('risk-assessments', RiskAssessmentViewSet, basename='surveillance-risk-assessment')
router.register('non-conformities', NonConformityViewSet, basename='surveillance-non-conformity')
router.register('corrective-actions', CorrectiveActionViewSet, basename='surveillance-corrective-action')
router.register('recalls', FoodRecallViewSet, basename='surveillance-recall')
router.register(
    'dashboard',
    SurveillanceDashboardViewSet,
    basename='surveillance-dashboard',
)

urlpatterns = [
    path('', include(router.urls)),
]