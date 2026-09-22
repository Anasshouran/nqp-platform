from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RiskAssessmentViewSet, RiskSettingsViewSet

router = DefaultRouter()
router.register('assessments', RiskAssessmentViewSet, basename='risk-assessment')
router.register('settings', RiskSettingsViewSet, basename='risk-settings')

urlpatterns = [
    path('', include(router.urls)),
]
