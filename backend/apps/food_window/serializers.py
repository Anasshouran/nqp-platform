from rest_framework import serializers
from .models import (
    ServiceWindow, WindowCommodity, ShipmentTransaction,
    TransactionCommodity, CommodityDecision, WindowAssignment, WindowAuditLog,
)


class WindowCommoditySerializer(serializers.ModelSerializer):
    class Meta:
        model = WindowCommodity
        fields = ['id', 'window', 'code', 'name_ar', 'name_en', 'order', 'is_active']
        read_only_fields = ['id']


class ServiceWindowSerializer(serializers.ModelSerializer):
    commodities = WindowCommoditySerializer(many=True, read_only=True)
    station_name = serializers.CharField(source='station.name_ar', read_only=True, default=None)
    station_kind = serializers.CharField(source='station.kind', read_only=True, default=None)

    class Meta:
        model = ServiceWindow
        fields = [
            'id', 'code', 'name_ar', 'station', 'station_name', 'station_kind',
            'window_type', 'is_active', 'order', 'commodities',
        ]
        read_only_fields = ['id']


class TransactionCommoditySerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source='commodity.name_ar', read_only=True, default=None)

    class Meta:
        model = TransactionCommodity
        fields = ['id', 'transaction', 'commodity', 'commodity_name', 'quantity', 'unit', 'decision', 'decided_at']
        read_only_fields = ['id', 'decided_at']


class CommodityDecisionSerializer(serializers.ModelSerializer):
    decided_by_name = serializers.CharField(source='decided_by.full_name', read_only=True, default=None)

    class Meta:
        model = CommodityDecision
        fields = ['id', 'line', 'decision', 'decided_by', 'decided_by_name', 'decided_at', 'reason']
        read_only_fields = ['id', 'decided_at']


class ShipmentTransactionSerializer(serializers.ModelSerializer):
    window_name = serializers.CharField(source='window.name_ar', read_only=True, default=None)
    commodity_lines = TransactionCommoditySerializer(many=True, read_only=True)
    clerk_name = serializers.CharField(source='clerk.full_name', read_only=True, default=None)
    shipment_manifest = serializers.CharField(source='shipment.manifest_number', read_only=True, default=None)

    class Meta:
        model = ShipmentTransaction
        fields = [
            'id', 'shipment', 'shipment_manifest', 'window', 'window_name',
            'commodity', 'clerk', 'clerk_name', 'status',
            'assigned_at', 'closed_at', 'commodity_lines',
        ]
        read_only_fields = ['id', 'assigned_at']


class WindowAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    window_name = serializers.CharField(source='window.name_ar', read_only=True, default=None)

    class Meta:
        model = WindowAssignment
        fields = ['id', 'user', 'user_name', 'window', 'window_name', 'commodities', 'is_active', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class WindowAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default=None)
    window_name = serializers.CharField(source='window.name_ar', read_only=True, default=None)

    class Meta:
        model = WindowAuditLog
        fields = ['id', 'window', 'window_name', 'user', 'user_name', 'action', 'detail', 'timestamp']
        read_only_fields = ['id', 'timestamp']
