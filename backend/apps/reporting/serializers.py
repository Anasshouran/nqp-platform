from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'report_type', 'format', 'status', 'params', 'file', 'requested_by', 'created_at']
        read_only_fields = ['id', 'status', 'requested_by', 'created_at']
