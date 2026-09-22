from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import TravelerAuthViewSet
from .views import TravelerViewSet

router = DefaultRouter()
router.register('', TravelerViewSet, basename='traveler')

urlpatterns = [
    path('auth/register/', TravelerAuthViewSet.as_view({'post': 'register'}), name='traveler-auth-register'),
    path('auth/login/', TravelerAuthViewSet.as_view({'post': 'login'}), name='traveler-auth-login'),
    path('auth/forgot-password/', TravelerAuthViewSet.as_view({'post': 'forgot_password'}), name='traveler-auth-forgot'),
    path('auth/reset-password/', TravelerAuthViewSet.as_view({'post': 'reset_password'}), name='traveler-auth-reset'),
    path('auth/me/', TravelerAuthViewSet.as_view({'get': 'me', 'patch': 'me'}), name='traveler-auth-me'),
    path('', include(router.urls)),
]
