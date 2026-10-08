from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.public.views import AssistantViewSet


@require_GET
def health(_request):
    """نقطة الصحة المستخدمة في Kubernetes Readiness/Liveness Probes."""
    return JsonResponse({'status': 'ok', 'service': 'afyatna-backend'})


urlpatterns = [
    path('api/v1/health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/me/', include('apps.accounts.me_urls')),
    path('api/v1/travelers/', include('apps.travelers.urls')),
    path('api/v1/carriers/', include('apps.carriers.urls')),
    path('api/v1/screening/', include('apps.screening.urls')),
    path('api/v1/risk/', include('apps.risk_engine.urls')),
    path('api/v1/clinic/', include('apps.clinic.urls')),
    path('api/v1/laboratory/', include('apps.laboratory.urls')),
    path('api/v1/food/', include('apps.food_quarantine.urls')),
    path('api/v1/food-window/', include('apps.food_window.urls')),
    path('api/v1/food-surveillance/', include('apps.food_surveillance.urls')),
    path('api/v1/emergency/', include('apps.emergency_eoc.urls')),
    path('api/v1/surveillance/', include('apps.surveillance.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reports/', include('apps.reporting.urls')),
    path('api/v1/integration/', include('apps.integration.urls')),
    path('api/v1/cms/', include('apps.cms.urls')),
    path('api/v1/airport/', include('apps.airport_health.urls')),
    path('api/v1/dbadmin/', include('apps.db_admin.urls')),
    path('api/v1/it/', include('apps.it_management.urls')),
    path('api/v1/organization/', include('apps.organization.urls')),
    path('api/v1/port-health/', include('apps.port_health.urls')),
    path('api/v1/shipping/', include('apps.shipping.urls')),
    path('api/v1/borders-health/', include('apps.borders_health.urls')),
    path('api/v1/vector-control/', include('apps.vector_control.urls')),
    path('api/v1/public/', include('apps.public.urls')),
    path('api/v1/master-data/', include('apps.masterdata.urls')),
    path('api/v1/chemistry/', include('apps.chemistry.urls')),
    path('api/v1/finance/', include('apps.finance.urls')),
    path('api/v1/ihr/', include('apps.ihr.urls')),
    path('api/v1/who/', include('apps.who.urls')),
    path('api/v1/vaccination/', include('apps.vaccination.urls')),
    path('api/v1/hr/', include('apps.hr.urls')),
    # مساحة API الجوال (AFYATNA) — عقد المرحلة M1 (docs/afyatna/mobile/phase-16).
    # لا يُلمس أي مسار قائم؛ التوجيه الجديد فقط.
    path('api/v1/mobile/', include('apps.mobile_api.urls')),
    # التوثيق (docs/05_API/Public_API.md) يسمّي المساعد `/api/v1/ai/...`،
    # بينما نفّذناه تحت `/api/v1/public/assistant/...`. نضيف المسارات
    # الموثّقة كأسماء بديلة فوق نفس الـviews بدل نقل المسارات وكسر
    # أي عميل يستخدم المسار الحالي.
    path('api/v1/ai/chat/', AssistantViewSet.as_view({'post': 'chat'}), name='ai-chat'),
    path('api/v1/ai/suggestions/', AssistantViewSet.as_view({'get': 'suggestions'}), name='ai-suggestions'),
    path('api/v1/ai/topics/', AssistantViewSet.as_view({'get': 'topics'}), name='ai-topics'),
    path('api/v1/ai/feedback/', AssistantViewSet.as_view({'post': 'feedback'}), name='ai-feedback'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
