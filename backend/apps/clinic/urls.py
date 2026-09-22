from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificatesViewSet,
    ClinicDashboardViewSet,
    ClinicTypeViewSet,
    ClinicViewSet,
    IsolationViewSet,
    LabRequestViewSet,
    PatientViewSet,
    PublicCertificateVerifyView,
    ReferralViewSet,
    VisitViewSet,
)

router = DefaultRouter()
router.register('dashboard', ClinicDashboardViewSet, basename='clinic-dashboard')
router.register('clinics', ClinicViewSet, basename='clinic')
router.register('clinic-types', ClinicTypeViewSet, basename='clinic-type')
router.register('patients', PatientViewSet, basename='clinic-patient')
router.register('referrals', ReferralViewSet, basename='referral')
router.register('visits', VisitViewSet, basename='visit')
router.register('lab-requests', LabRequestViewSet, basename='clinic-lab-request')
router.register('isolation', IsolationViewSet, basename='isolation')
router.register('certificates', CertificatesViewSet, basename='certificate')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'public/certificates/<str:number>/verify/',
        PublicCertificateVerifyView.as_view(),
        name='certificate-verify',
    ),
]
