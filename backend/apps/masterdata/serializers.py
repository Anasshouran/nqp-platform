from django.contrib.auth import get_user_model

from rest_framework import serializers

from apps.organization.models import Locality, Sector as OrgSector

from .models import EntryPoint, HealthFacility, Section, SectionMember, Sector, State, Station, Terminal


class MasterDataTreeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    name_ar = serializers.CharField()
    name_en = serializers.CharField()
    color = serializers.CharField()
    description = serializers.CharField(required=False, allow_null=True)
    order = serializers.IntegerField()
    states = serializers.ListField(child=serializers.DictField())


class SectorSerializer(serializers.ModelSerializer):
    states_count = serializers.SerializerMethodField()
    entry_points_count = serializers.SerializerMethodField()

    class Meta:
        model = Sector
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'color', 'description', 'order',
            'is_active', 'states_count', 'entry_points_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_states_count(self, obj):
        return obj.states.filter(is_active=True).count()

    def get_entry_points_count(self, obj):
        return State.objects.filter(
            sector=obj, is_active=True, entry_points__is_active=True
        ).distinct().count()


class StateSerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    entry_points_count = serializers.SerializerMethodField()

    class Meta:
        model = State
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'sector', 'sector_name', 'description',
            'order', 'is_active', 'entry_points_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_entry_points_count(self, obj):
        return obj.entry_points.filter(is_active=True).count()


class EntryPointSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    terminals_count = serializers.SerializerMethodField()

    class Meta:
        model = EntryPoint
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'kind', 'state', 'state_name',
            'sector', 'sector_name', 'locality', 'locality_name',
            'location', 'description', 'order', 'is_active',
            'terminals_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_terminals_count(self, obj):
        return obj.terminals.filter(is_active=True).count()


class HealthFacilitySerializer(serializers.ModelSerializer):
    locality_name = serializers.CharField(source='locality.name_ar', read_only=True, default=None)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)

    class Meta:
        model = HealthFacility
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'kind', 'locality', 'locality_name',
            'sector', 'sector_name', 'entry_point', 'entry_point_name',
            'location', 'address', 'phone', 'email', 'description', 'order', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TerminalSerializer(serializers.ModelSerializer):
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)
    stations_count = serializers.SerializerMethodField()

    class Meta:
        model = Terminal
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'entry_point', 'entry_point_name',
            'description', 'order', 'is_active', 'stations_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_stations_count(self, obj):
        return obj.stations.filter(is_active=True).count()


class StationSerializer(serializers.ModelSerializer):
    terminal_name = serializers.CharField(source='terminal.name_ar', read_only=True, default=None)
    entry_point_name = serializers.CharField(source='entry_point.name_ar', read_only=True, default=None)
    sections_count = serializers.SerializerMethodField()

    class Meta:
        model = Station
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'terminal', 'terminal_name',
            'entry_point', 'entry_point_name', 'location', 'description',
            'order', 'is_active', 'sections_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_sections_count(self, obj):
        return obj.sections.filter(is_active=True).count()


class SectionSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source='station.name_ar', read_only=True, default=None)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'code', 'name_ar', 'name_en', 'station', 'station_name',
            'description', 'order', 'is_active', 'members_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.members.filter(is_active=True).count()


class SectionMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    section_name = serializers.CharField(source='section.name_ar', read_only=True, default=None)

    class Meta:
        model = SectionMember
        fields = [
            'id', 'user', 'user_email', 'user_name', 'section', 'section_name',
            'role_label', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return getattr(obj.user, 'full_name', None) or obj.user.email


# ---------------- تواقيع الكتابة ----------------

class SectorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = ['id', 'code', 'name_ar', 'name_en', 'color', 'description', 'order', 'is_active']


class StateWriteSerializer(serializers.ModelSerializer):
    sector = serializers.PrimaryKeyRelatedField(queryset=Sector.objects.all())

    class Meta:
        model = State
        fields = ['id', 'code', 'name_ar', 'name_en', 'sector', 'description', 'order', 'is_active']


class EntryPointWriteSerializer(serializers.ModelSerializer):
    state = serializers.PrimaryKeyRelatedField(queryset=State.objects.all())
    sector = serializers.PrimaryKeyRelatedField(
        queryset=OrgSector.objects.all(), required=False, allow_null=True,
    )
    locality = serializers.PrimaryKeyRelatedField(
        queryset=Locality.objects.all(), required=False, allow_null=True,
    )

    class Meta:
        model = EntryPoint
        fields = ['id', 'code', 'name_ar', 'name_en', 'kind', 'state', 'sector', 'locality',
                  'location', 'description', 'order', 'is_active']

    def validate(self, attrs):
        locality = attrs.get('locality')
        sector = attrs.get('sector', getattr(self.instance, 'sector', None))
        if locality is not None and sector is not None and locality.sector_id != sector.pk:
            raise serializers.ValidationError({'locality': 'المحلية لا تنتمي إلى القطاع المحدد'})
        return attrs


class HealthFacilityWriteSerializer(serializers.ModelSerializer):
    locality = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=Locality.objects.all(),
    )
    sector = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=OrgSector.objects.all(),
    )
    entry_point = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=EntryPoint.objects.all(),
    )

    class Meta:
        model = HealthFacility
        fields = ['id', 'code', 'name_ar', 'name_en', 'kind', 'locality', 'sector',
                  'entry_point', 'location', 'address', 'phone', 'email', 'description', 'order', 'is_active']

    def validate(self, attrs):
        locality = attrs.get('locality')
        sector = attrs.get('sector', getattr(self.instance, 'sector', None))
        if locality is not None and sector is not None and locality.sector_id != sector.pk:
            raise serializers.ValidationError({'locality': 'المحلية لا تنتمي إلى القطاع المحدد'})
        return attrs


class TerminalWriteSerializer(serializers.ModelSerializer):
    entry_point = serializers.PrimaryKeyRelatedField(queryset=EntryPoint.objects.all())

    class Meta:
        model = Terminal
        fields = ['id', 'code', 'name_ar', 'name_en', 'entry_point', 'description', 'order', 'is_active']


class StationWriteSerializer(serializers.ModelSerializer):
    terminal = serializers.PrimaryKeyRelatedField(
        queryset=Terminal.objects.all(), required=False, allow_null=True
    )
    entry_point = serializers.PrimaryKeyRelatedField(
        queryset=EntryPoint.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Station
        fields = ['id', 'code', 'name_ar', 'name_en', 'terminal', 'entry_point', 'location', 'description', 'order', 'is_active']

    def validate(self, attrs):
        if not attrs.get('terminal') and not attrs.get('entry_point'):
            raise serializers.ValidationError(
                {'detail': 'يجب تحديد المنشأة (الطرفية) أو منفذ الدخول للمحطة'}
            )
        return attrs


class SectionWriteSerializer(serializers.ModelSerializer):
    station = serializers.PrimaryKeyRelatedField(queryset=Station.objects.all())

    class Meta:
        model = Section
        fields = ['id', 'code', 'name_ar', 'name_en', 'station', 'description', 'order', 'is_active']


class SectionMemberWriteSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    section = serializers.PrimaryKeyRelatedField(queryset=Section.objects.all())

    class Meta:
        model = SectionMember
        fields = ['id', 'user', 'section', 'role_label', 'is_active']