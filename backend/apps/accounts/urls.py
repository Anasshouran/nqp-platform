from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuthViewSet, PermissionViewSet, RoleAssignmentViewSet, RoleViewSet, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('roles', RoleViewSet, basename='role')
router.register('permissions', PermissionViewSet, basename='permission')
router.register('role-assignments', RoleAssignmentViewSet, basename='role-assignment')

urlpatterns = [
    path('login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('register/', AuthViewSet.as_view({'post': 'register'}), name='auth-register'),
    path('refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='auth-refresh'),
    path('logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('change-password/', AuthViewSet.as_view({'post': 'change_password'}), name='auth-change-password'),
    path('forgot-password/', AuthViewSet.as_view({'post': 'forgot_password'}), name='auth-forgot-password'),
    path('reset-password/', AuthViewSet.as_view({'post': 'reset_password'}), name='auth-reset-password'),
    path('me/', AuthViewSet.as_view({'get': 'me'}), name='auth-me'),
    path('profile/', AuthViewSet.as_view({'get': 'profile', 'patch': 'update_profile'}), name='auth-profile'),
    path('', include(router.urls)),
]
