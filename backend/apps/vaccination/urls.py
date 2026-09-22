from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificateVerificationViewSet,
    PublicVaccinationLookupView,
    PublicVaccinationVerifyView,
    VaccinationCertificateViewSet,
    VaccinationDashboardViewSet,
    VaccinationRecordViewSet,
    VaccinationRuleViewSet,
    VaccinationSiteViewSet,
    VaccineBatchViewSet,
    VaccineInventoryViewSet,
    VaccineViewSet,
)

router = DefaultRouter()
router.register('vaccines', VaccineViewSet, basename='vaccine')
router.register('batches', VaccineBatchViewSet, basename='vaccine-batch')
router.register('sites', VaccinationSiteViewSet, basename='vaccination-site')
router.register('records', VaccinationRecordViewSet, basename='vaccination-record')
router.register('certificates', VaccinationCertificateViewSet, basename='vaccination-certificate')
router.register('rules', VaccinationRuleViewSet, basename='vaccination-rule')
router.register('inventory', VaccineInventoryViewSet, basename='vaccine-inventory')
router.register('verifications', CertificateVerificationViewSet, basename='vaccination-verification')
router.register('dashboard', VaccinationDashboardViewSet, basename='vaccination-dashboard')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'public/verify/<str:code>/',
        PublicVaccinationVerifyView.as_view(),
        name='vaccination-public-verify',
    ),
    path(
        'public/lookup/',
        PublicVaccinationLookupView.as_view(),
        name='vaccination-public-lookup',
    ),
]