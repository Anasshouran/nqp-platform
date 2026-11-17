from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import HealthScreeningByStateReportView, ScreeningViewSet

router = DefaultRouter()
router.register('', ScreeningViewSet, basename='screening')

urlpatterns = [
    path(
        'reports/screenings/by-state/',
        HealthScreeningByStateReportView.as_view(),
        name='screening-screenings-by-state',
    ),
    path('', include(router.urls)),
]
