from django.urls import path

from .views import MeViewSet

me_actions = MeViewSet.as_view

urlpatterns = [
    path('', me_actions({'get': 'list'}), name='me-index'),
    path('profile/', me_actions({'patch': 'update_profile'}), name='me-profile'),
    path('organization/', me_actions({'get': 'organization'}), name='me-organization'),
    path('sessions/', me_actions({'get': 'sessions'}), name='me-sessions'),
    path('sessions/<int:pk>/', me_actions({'delete': 'delete_session'}), name='me-session-delete'),
    path('activity/', me_actions({'get': 'activity'}), name='me-activity'),
    path(
        'notifications/settings/',
        me_actions({'get': 'notifications_settings', 'patch': 'update_notifications_settings'}),
        name='me-notifications-settings',
    ),
    path('preferences/', me_actions({'patch': 'preferences'}), name='me-preferences'),
]