from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.masterdata.models import EntryPoint

from .models import Department, Locality, OrgAssignment, OrgPosition, Sector, Station


class OrganizationHierarchySerializer(serializers.Serializer):
    positions = serializers.ListField(child=serializers.DictField())
    sectors = serializers.ListField(child=serializers.DictField())


class OrgPositionSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name_ar', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name_ar', read_only=True, default=None)
    children_count = serializers.SerializerMethodField()
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = OrgPosition
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'level', 'parent', 'parent_name',
            'department', 'department_name',
            'description', 'order', 'is_active', 'children_count', 'assignments_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()

    def get_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()


class OrgPositionWriteSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=OrgPosition.objects.all(), required=False, allow_null=True
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = OrgPosition
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'level', 'parent', 'department',
            'description', 'order', 'is_active',
        ]


class SectorSerializer(serializers.ModelSerializer):
    department_count = serializers.SerializerMethodField()
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = Sector
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'region', 'description', 'color',
            'order', 'is_active', 'department_count', 'assignments_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_department_count(self, obj):
        return obj.departments.filter(is_active=True).count()

    def get_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()


class SectorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'region', 'description', 'color',
            'order', 'is_active',
        ]


class LocalitySerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    facilities_count = serializers.SerializerMethodField()

    class Meta:
        model = Locality
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'sector', 'sector_name',
            'location', 'description', 'order', 'is_active',
            'facilities_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_facilities_count(self, obj):
        return getattr(obj, 'facilities', None).filter(is_active=True).count() if hasattr(obj, 'facilities') else 0


class LocalityWriteSerializer(serializers.ModelSerializer):
    sector = serializers.PrimaryKeyRelatedField(queryset=Sector.objects.all())

    class Meta:
        model = Locality
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'sector', 'location',
            'description', 'order', 'is_active',
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    parent_name = serializers.CharField(source='parent.name_ar', read_only=True, default=None)
    manager_name = serializers.CharField(source='manager_position.name_ar', read_only=True, default=None)
    children_count = serializers.SerializerMethodField()
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'sector', 'sector_name',
            'parent', 'parent_name', 'kind', 'manager_position', 'manager_name',
            'description', 'order', 'is_active',
            'children_count', 'assignments_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()

    def get_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()


class DepartmentWriteSerializer(serializers.ModelSerializer):
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(), required=False, allow_null=True
    )
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    manager_position = serializers.PrimaryKeyRelatedField(
        queryset=OrgPosition.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Department
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'sector', 'parent', 'kind',
            'manager_position', 'description', 'order', 'is_active',
        ]


class OrgAssignmentSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    position_name = serializers.CharField(source='position.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name_ar', read_only=True, default=None)
    station_name = serializers.CharField(source='station.name_ar', read_only=True, default=None)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)

    class Meta:
        model = OrgAssignment
        fields = [
            'id', 'user', 'user_email', 'user_name', 'position', 'position_name',
            'sector', 'sector_name', 'department', 'department_name',
            'station', 'station_name', 'entry_point', 'entry_point_name',
            'is_primary', 'start_date', 'end_date', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return getattr(obj.user, 'full_name', None) or obj.user.email


class OrgAssignmentWriteSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    position = serializers.PrimaryKeyRelatedField(
        queryset=OrgPosition.objects.all(), required=False, allow_null=True
    )
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(), required=False, allow_null=True
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    station = serializers.PrimaryKeyRelatedField(
        queryset=Station.objects.all(), required=False, allow_null=True
    )
    entry_point = serializers.PrimaryKeyRelatedField(
        queryset=EntryPoint.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = OrgAssignment
        fields = [
            'id', 'user', 'position', 'sector', 'department', 'station',
            'entry_point', 'is_primary', 'start_date', 'end_date', 'is_active',
        ]

    def validate(self, attrs):
        if not any(attrs.get(f) for f in ('position', 'sector', 'department', 'station', 'entry_point')):
            raise serializers.ValidationError(
                {'detail': 'يجب تحديد منصب أو قطاع أو قسم أو محطة أو نقطة دخول على الأقل'}
            )
        entry_point = attrs.get('entry_point')
        sector = attrs.get('sector')
        if entry_point is not None:
            if sector is not None and entry_point.sector_id and entry_point.sector_id != sector.pk:
                raise serializers.ValidationError(
                    {'entry_point': 'نقطة الدخول لا تنتمي إلى القطاع المحدد'}
                )
        return attrs


class StationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    assignments_count = serializers.SerializerMethodField()

    class Meta:
        model = Station
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'department', 'department_name',
            'sector', 'sector_name', 'location', 'description', 'order',
            'is_active', 'assignments_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()


class StationWriteSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Station
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'department', 'sector',
            'location', 'description', 'order', 'is_active',
        ]
