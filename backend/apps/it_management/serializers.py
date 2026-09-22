from rest_framework import serializers

from django.contrib.auth import get_user_model

from .models import GovernmentIntegration, ITAsset, ItSystem, NetworkStatus, SupportTicket

User = get_user_model()


class ItSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItSystem
        fields = [
            'id', 'code', 'name', 'name_ar', 'status', 'request_count',
            'last_checked_at', 'last_error', 'sector',
        ]
        read_only_fields = ['sector']


class ITAssetSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)

    class Meta:
        model = ITAsset
        fields = [
            'id', 'name', 'asset_type', 'serial_number', 'entry_point', 'entry_point_name',
            'location', 'assigned_to', 'assigned_to_name', 'status', 'notes', 'sector',
        ]
        read_only_fields = ['sector']


class SupportTicketSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_no', 'subject', 'description', 'priority', 'status', 'entry_point',
            'entry_point_name', 'created_by', 'created_by_name', 'assigned_to',
            'assigned_to_name', 'resolved_at', 'sector',
        ]
        read_only_fields = ['sector', 'ticket_no']


class NetworkStatusSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True)
    entry_point_code = serializers.CharField(source='entry_point.code', read_only=True)

    class Meta:
        model = NetworkStatus
        fields = [
            'id', 'entry_point', 'entry_point_code', 'entry_point_name',
            'connected', 'ping_ms', 'last_sync', 'sector',
        ]
        read_only_fields = ['sector']


class ItDashboardSerializer(serializers.Serializer):
    active_systems = serializers.IntegerField()
    warning_systems = serializers.IntegerField()
    offline_systems = serializers.IntegerField()
    connected_ports = serializers.IntegerField()
    asset_count = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    critical_tickets = serializers.IntegerField()
    high_tickets = serializers.IntegerField()


class GovernmentIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentIntegration
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'status',
            'last_sync_at', 'error_count', 'notes', 'order', 'is_active',
        ]


class SectorItPerformanceSerializer(serializers.Serializer):
    id = serializers.CharField()
    code = serializers.CharField()
    name_ar = serializers.CharField()
    total_systems = serializers.IntegerField()
    active_systems = serializers.IntegerField()
    warning_systems = serializers.IntegerField()
    offline_systems = serializers.IntegerField()
    connected_ports = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    critical_tickets = serializers.IntegerField()
    connectivity = serializers.CharField()


class NationalItDashboardSerializer(serializers.Serializer):
    sectors = SectorItPerformanceSerializer(many=True)
    systems = ItSystemSerializer(many=True)
    integrations = GovernmentIntegrationSerializer(many=True)
    active_systems = serializers.IntegerField()
    warning_systems = serializers.IntegerField()
    offline_systems = serializers.IntegerField()
    connected_ports = serializers.IntegerField()
    asset_count = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    critical_tickets = serializers.IntegerField()
    recent_tickets = SupportTicketSerializer(many=True)


class ItReportSerializer(serializers.Serializer):
    systems = ItSystemSerializer(many=True)
    assets = ITAssetSerializer(many=True)
    tickets = SupportTicketSerializer(many=True)
    networks = NetworkStatusSerializer(many=True)