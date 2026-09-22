from rest_framework.routers import DefaultRouter

from .views import (
    IHREventViewSet,
    NationalFocalPointViewSet,
    RiskAssessmentViewSet,
    SPARAssessmentViewSet,
    SPARIndicatorViewSet,
)

router = DefaultRouter()
router.register('events', IHREventViewSet, basename='ihr-events')
router.register('risk-assessments', RiskAssessmentViewSet, basename='ihr-risk-assessments')
router.register('nfp', NationalFocalPointViewSet, basename='ihr-nfp')
router.register('spar/indicators', SPARIndicatorViewSet, basename='ihr-spar-indicators')
router.register('spar', SPARAssessmentViewSet, basename='ihr-spar-assessments')

urlpatterns = router.urls