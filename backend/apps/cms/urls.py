from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnnouncementViewSet,
    CircularViewSet,
    DirectorProfileViewSet,
    DocumentViewSet,
    FaqViewSet,
    MediaViewSet,
    NewsViewSet,
    PageViewSet,
    SettingsViewSet,
    SliderViewSet,
)

router = DefaultRouter()
router.register('news', NewsViewSet, basename='news')
router.register('circulars', CircularViewSet, basename='circular')
router.register('announcements', AnnouncementViewSet, basename='announcement')
router.register('pages', PageViewSet, basename='page')
router.register('faq', FaqViewSet, basename='faq')
router.register('documents', DocumentViewSet, basename='document')
router.register('sliders', SliderViewSet, basename='slider')
router.register('media', MediaViewSet, basename='media')
router.register('settings', SettingsViewSet, basename='setting')
router.register('director', DirectorProfileViewSet, basename='director-profile')

urlpatterns = [
    path('', include(router.urls)),
]
