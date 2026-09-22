from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, TemplateViewSet

router = DefaultRouter()
router.register('templates', TemplateViewSet, basename='template')

urlpatterns = [
    path('send/', NotificationViewSet.as_view({'post': 'send'}), name='notification-send'),
    path('unread-count/', NotificationViewSet.as_view({'get': 'unread_count'}), name='notification-unread-count'),
    path('read-all/', NotificationViewSet.as_view({'post': 'mark_all_read'}), name='notification-read-all'),
    path('<uuid:pk>/read/', NotificationViewSet.as_view({'post': 'mark_read'}), name='notification-read'),
    path('', NotificationViewSet.as_view({'get': 'list'}), name='notification-list'),
    path('device/', NotificationViewSet.as_view({'post': 'device'}), name='notification-device'),
    path('', include(router.urls)),
]
