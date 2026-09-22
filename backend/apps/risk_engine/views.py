from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from core.filters import ExactFilterBackend
from core.permissions import IsAdmin
from core.utils.response import success_response

from .models import RiskAssessment, RiskSettings
from .serializers import RiskAssessmentSerializer, RiskSettingsSerializer


class RiskAssessmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RiskAssessment.objects.select_related(
        'screening', 'screening__traveler', 'screening__port'
    ).all()
    serializer_class = RiskAssessmentSerializer
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['screening__traveler__passport_number', 'screening__traveler__first_name', 'screening__traveler__last_name']
    ordering_fields = ['assessed_at', 'risk_score']
    filter_fields = ['risk_level', 'recommendation']


class RiskSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RiskSettings.objects.all()
    serializer_class = RiskSettingsSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'put']

    def list(self, request):
        settings = RiskSettings.get_settings()
        return Response(success_response(RiskSettingsSerializer(settings).data))

    def update(self, request, *args, **kwargs):
        settings = RiskSettings.get_settings()
        serializer = RiskSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(serializer.data), status=status.HTTP_200_OK)
