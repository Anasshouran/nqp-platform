from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import PermissionAction
from core.utils.response import success_response
from core.utils.scoping import resolve_user_port_ids

from apps.accounts.models import RoleAssignment
from apps.surveillance.services.gis_export import GISExportService


def _parse_date(value):
    from django.utils.dateparse import parse_date
    return parse_date(value) if value else None


class GISViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer
    permission_classes = [PermissionAction]
    permission_resource = 'surveillance'
    permission_action = 'view'

    def _scope(self):
        """نطاق (port_ids, sector_ids) للمستخدم: (None, None) للوطني دون تقييد."""
        user = self.request.user
        if not user or user.is_anonymous or user.is_superuser:
            return None, None
        port_ids = resolve_user_port_ids(user)
        scopes = user.active_scopes('surveillance')
        sector_ids = {
            s['scope_id'] for s in scopes
            if s['scope_type'] in (RoleAssignment.ScopeType.SECTOR, RoleAssignment.ScopeType.REGION)
            and s['scope_id']
        }
        return port_ids, sector_ids

    @action(detail=False, methods=['get'], url_path='cases')
    def cases_geojson(self, request):
        params = request.query_params
        port_ids, sector_ids = self._scope()
        data = GISExportService.export_cases_geojson(
            sector=params.get('sector') or None,
            locality=params.get('locality') or None,
            port=params.get('port') or None,
            disease=params.get('disease') or None,
            date_from=_parse_date(params.get('date_from')),
            date_to=_parse_date(params.get('date_to')),
            port_ids=port_ids,
            sector_ids=sector_ids,
        )
        return Response(data)

    @action(detail=False, methods=['get'], url_path='outbreaks')
    def outbreaks_geojson(self, request):
        params = request.query_params
        port_ids, sector_ids = self._scope()
        data = GISExportService.export_outbreaks_geojson(
            status=params.get('status') or None,
            port_ids=port_ids,
            sector_ids=sector_ids,
        )
        return Response(data)

    @action(detail=False, methods=['get'], url_path='alerts')
    def alerts_geojson(self, request):
        params = request.query_params
        port_ids, sector_ids = self._scope()
        data = GISExportService.export_alerts_geojson(
            level=params.get('level') or None,
            status=params.get('status') or None,
            port_ids=port_ids,
            sector_ids=sector_ids,
        )
        return Response(data)

    @action(detail=False, methods=['get'], url_path='heatmap')
    def heatmap(self, request):
        params = request.query_params
        port_ids, sector_ids = self._scope()
        data = GISExportService.generate_heatmap_data(
            disease=params.get('disease') or None,
            date_from=_parse_date(params.get('date_from')),
            date_to=_parse_date(params.get('date_to')),
            port_ids=port_ids,
            sector_ids=sector_ids,
        )
        return Response(success_response(data))

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        params = request.query_params
        port_ids, sector_ids = self._scope()
        data = GISExportService.generate_summary_stats(
            sector=params.get('sector') or None,
            date_from=_parse_date(params.get('date_from')),
            date_to=_parse_date(params.get('date_to')),
            port_ids=port_ids,
            sector_ids=sector_ids,
        )
        return Response(success_response(data))