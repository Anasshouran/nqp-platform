"""مساحة ``/api/v1/mobile/`` — توجيه موحّد للنقاط المُعرَّفة في العقد.

التسجيل في ``nqp_backend/urls.py`` يحدث عبر هذا الوحدة فقط؛ لا يُلمس أي
مسار قائم آخر.
"""

from django.urls import path

from .views import (
    MobileAuthLoginView,
    MobileAuthRefreshView,
    MobileCertificateDetailView,
    MobileCertificatesView,
    MobileDeclarationsView,
    MobileNotificationReadView,
    MobileNotificationsView,
    MobileProfileView,
    MobileRequirementsView,
    MobileSyncStatusView,
    MobileTripDetailView,
    MobileTripsView,
)

app_name = 'mobile_api'

urlpatterns = [
    path('auth/login/', MobileAuthLoginView.as_view(), name='mobile-auth-login'),
    path('auth/refresh/', MobileAuthRefreshView.as_view(), name='mobile-auth-refresh'),
    path('profile/', MobileProfileView.as_view(), name='mobile-profile'),
    path('trips/', MobileTripsView.as_view(), name='mobile-trips'),
    path('trips/<uuid:pk>/', MobileTripDetailView.as_view(), name='mobile-trip-detail'),
    path('requirements/', MobileRequirementsView.as_view(), name='mobile-requirements'),
    path('certificates/', MobileCertificatesView.as_view(), name='mobile-certificates'),
    path('certificates/<uuid:pk>/', MobileCertificateDetailView.as_view(), name='mobile-certificate-detail'),
    path('declarations/', MobileDeclarationsView.as_view(), name='mobile-declarations'),
    path('notifications/', MobileNotificationsView.as_view(), name='mobile-notifications'),
    path('notifications/<uuid:pk>/read/', MobileNotificationReadView.as_view(), name='mobile-notification-read'),
    path('sync/status/', MobileSyncStatusView.as_view(), name='mobile-sync-status'),
]
