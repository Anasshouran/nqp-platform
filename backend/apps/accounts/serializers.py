from django.apps import apps
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from core.utils.scoping import resolve_user_sectors

from .models import EmployeeProfile, Permission, PermissionAudit, Role, RoleAssignment, ScopeType, User

UserModel = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'code', 'name', 'name_ar', 'description', 'default_scope',
            'permissions', 'permission_count', 'user_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions(self, obj) -> list[str]:
        return list(obj.permissions.order_by('code').values_list('code', flat=True))

    def get_permission_count(self, obj) -> int:
        value = getattr(obj, 'permission_count', None)
        if value is None:
            return obj.permissions.count()
        return value

    def get_user_count(self, obj) -> int:
        value = getattr(obj, 'user_count', None)
        if value is None:
            return obj.users.count()
        return value


class RoleWriteSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(
        slug_field='code', queryset=Permission.objects.all(), many=True, required=False
    )

    class Meta:
        model = Role
        fields = ['id', 'code', 'name', 'name_ar', 'description', 'default_scope', 'permissions']
        read_only_fields = ['id']

    def create(self, validated_data):
        permissions = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(permissions)
        return role

    def update(self, instance, validated_data):
        permissions = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if permissions is not None:
            instance.permissions.set(permissions)
        instance.save()
        return instance


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'code', 'name', 'resource', 'action']
        read_only_fields = ['id']


class PermissionAuditSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = PermissionAudit
        fields = [
            'id', 'user', 'user_email', 'permission_code', 'action',
            'granted', 'reason', 'ip_address', 'user_agent', 'created_at',
        ]
        read_only_fields = fields


class RoleAssignmentSerializer(serializers.ModelSerializer):
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_name = serializers.CharField(source='role.name_ar', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True, default=None)
    is_current = serializers.BooleanField(read_only=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = RoleAssignment
        fields = [
            'id', 'user', 'user_email', 'role', 'role_code', 'role_name',
            'scope_type', 'scope_id', 'start_date', 'end_date',
            'is_active', 'assigned_by', 'assigned_by_email', 'is_current',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoleAssignmentWriteSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field='code', queryset=Role.objects.all()
    )
    scope_type = serializers.ChoiceField(choices=ScopeType.choices, required=False)
    scope_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    assigned_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = RoleAssignment
        fields = [
            'id', 'user', 'role', 'scope_type', 'scope_id',
            'start_date', 'end_date', 'is_active', 'assigned_by',
        ]
        read_only_fields = ['id']
        validators = []

    def validate(self, attrs):
        user = attrs.get('user') or getattr(self.instance, 'user', None)
        role = attrs.get('role') or getattr(self.instance, 'role', None)
        default_scope = role.default_scope if role else 'GLOBAL'
        if self.instance:
            scope_type = attrs.get('scope_type', self.instance.scope_type)
        else:
            scope_type = attrs.get('scope_type', default_scope)
        attrs['scope_type'] = scope_type
        scope_id = attrs.get('scope_id')
        instance = self.instance
        if scope_type == 'GLOBAL':
            attrs['scope_id'] = None
        elif not scope_id:
            raise serializers.ValidationError({'scope_id': 'النطاق المحدد يتطلب معرّفاً'})
        else:
            self._validate_scope_id(scope_type, scope_id)
        qs = RoleAssignment.objects.filter(user=user, role=role, scope_type=scope_type, scope_id=scope_id)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('تم تعيين هذا الدور بالفعل لهذا المستخدم في هذا النطاق')
        return attrs

    def _validate_scope_id(self, scope_type, scope_id):
        mapping = {
            'SECTOR': ('organization.Sector', 'القطاع'),
            'DEPARTMENT': ('organization.Department', 'الإدارة'),
            'STATION': ('organization.Station', 'المحطة'),
            'POINT': ('masterdata.EntryPoint', 'نقطة الدخول'),
            'PORT': ('masterdata.EntryPoint', 'الميناء'),
            'REGION': ('organization.Sector', 'المنطقة'),
        }
        model_path, label = mapping.get(scope_type)
        if not model_path:
            raise serializers.ValidationError({'scope_id': f'نوع النطاق {scope_type} غير معروف'})
        app_label, model_name = model_path.split('.')
        model = apps.get_model(app_label, model_name)
        if not model.objects.filter(pk=scope_id).exists():
            raise serializers.ValidationError(
                {'scope_id': f'{label} المحدد غير موجود'}
            )


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role_code', read_only=True)
    role_id = serializers.UUIDField(source='role.id', read_only=True, allow_null=True)
    sector = serializers.UUIDField(source='sector_id', read_only=True, allow_null=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True, default=None)
    sector_code = serializers.SerializerMethodField()
    sector_codes = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    extra_permissions = serializers.SerializerMethodField()
    blocked_permissions = serializers.SerializerMethodField()
    role_assignments = serializers.SerializerMethodField()
    employee_number = serializers.SerializerMethodField()
    primary_org = serializers.SerializerMethodField()

    class Meta:
        model = UserModel
        fields = [
            'id', 'email', 'username', 'full_name', 'phone', 'national_id',
            'user_type', 'organization_name', 'role', 'role_id',
            'sector', 'sector_name', 'sector_code', 'sector_codes',
            'permissions', 'extra_permissions', 'blocked_permissions',
            'role_assignments', 'employee_number', 'primary_org',
            'is_active', 'last_login', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions(self, obj) -> list[str]:
        return obj.effective_permission_codes()

    def get_extra_permissions(self, obj) -> list[str]:
        return list(obj.extra_permissions.order_by('code').values_list('code', flat=True))

    def get_blocked_permissions(self, obj) -> list[str]:
        return list(obj.blocked_permissions.order_by('code').values_list('code', flat=True))

    def get_role_assignments(self, obj) -> list[dict]:
        assignments = obj.role_assignments.select_related('role', 'assigned_by').order_by('-start_date')
        return RoleAssignmentSerializer(assignments, many=True).data

    def get_sector_code(self, obj):
        """كود القطاع من حقل المستخدم، مع احتياطي من تعيين الدور النشط ذي نطاق القطاع."""
        if obj.sector_id:
            return getattr(obj.sector, 'code', None)
        assignment = (
            obj.role_assignments.filter(scope_type=ScopeType.SECTOR, is_active=True)
            .order_by('-start_date')
            .first()
        )
        scope_id = getattr(assignment, 'scope_id', None)
        if not scope_id:
            return None
        from apps.organization.models import Sector

        sector = Sector.objects.filter(pk=scope_id).first()
        return sector.code if sector else None

    def get_sector_codes(self, obj) -> list[str]:
        """كل قطاعات المستخدم (للوطني: كل القطاعات؛ للقطاعي: قطاعه فقط)."""
        return [s.code for s in resolve_user_sectors(obj)]

    def get_employee_number(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.employee_number if profile else None

    def get_primary_org(self, obj):
        assignment = (
            obj.org_assignments.select_related('sector', 'department', 'station', 'entry_point')
            .order_by('-is_primary', '-start_date')
            .first()
        )
        if not assignment:
            return None
        return {
            'sector_id': str(assignment.sector_id) if assignment.sector_id else None,
            'sector_name': assignment.sector.name_ar if assignment.sector else None,
            'department_id': str(assignment.department_id) if assignment.department_id else None,
            'department_name': assignment.department.name_ar if assignment.department else None,
            'station_id': str(assignment.station_id) if assignment.station_id else None,
            'station_name': assignment.station.name_ar if assignment.station else None,
            'entry_point_id': str(assignment.entry_point_id) if assignment.entry_point_id else None,
            'entry_point_name': assignment.entry_point.name_ar if assignment.entry_point else None,
            'is_primary': assignment.is_primary,
        }


class UserWriteSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field='code', queryset=Role.objects.all(), required=False, allow_null=True
    )
    sector = serializers.UUIDField(required=False, allow_null=True)
    extra_permissions = serializers.SlugRelatedField(
        slug_field='code', queryset=Permission.objects.all(), many=True, required=False
    )
    blocked_permissions = serializers.SlugRelatedField(
        slug_field='code', queryset=Permission.objects.all(), many=True, required=False
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    employee_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = UserModel
        fields = [
            'id', 'email', 'username', 'full_name', 'phone', 'national_id',
            'user_type', 'organization_name', 'role', 'sector', 'extra_permissions',
            'blocked_permissions', 'password', 'employee_number',
            'is_active', 'is_staff',
        ]
        read_only_fields = ['id']

    @staticmethod
    def _clean_optional_identifiers(validated_data):
        for field in ('phone', 'national_id', 'username'):
            if field in validated_data and not validated_data[field]:
                validated_data[field] = None

    @staticmethod
    def _resolve_sector(sector_id):
        """يحلّ UUID القطاع إلى Sector، أو يقبل None."""
        if not sector_id:
            return None
        from apps.organization.models import Sector

        sector = Sector.objects.filter(pk=sector_id).first()
        if not sector:
            raise serializers.ValidationError({'sector': 'القطاع المحدد غير موجود'})
        return sector

    @staticmethod
    def _apply_role(user, role, sector=None):
        """مرآة كتابة الدور: تحدّث الحقل القديم وأنشئ/فعّل RoleAssignment (GLOBAL + SECTOR عند قطاع)."""
        _ = user  # اسماً محجوزاً لتوضيح التوقيع
        RoleAssignment.objects.filter(user=user, role=role, scope_type=ScopeType.GLOBAL).update(
            is_active=True, start_date=timezone.localdate()
        )
        if not RoleAssignment.objects.filter(
            user=user, role=role, scope_type=ScopeType.GLOBAL
        ).exists():
            RoleAssignment.objects.create(
                user=user, role=role, scope_type=ScopeType.GLOBAL,
                start_date=timezone.localdate(), is_active=True,
            )
        if sector:
            RoleAssignment.objects.update_or_create(
                user=user, role=role, scope_type=ScopeType.SECTOR, scope_id=sector.pk,
                defaults={'is_active': True, 'start_date': timezone.localdate()},
            )

    def _apply_employee_number(self, user, value):
        has_profile = EmployeeProfile.objects.filter(user=user).exists()
        if value:
            profile, _ = EmployeeProfile.objects.get_or_create(user=user)
            profile.employee_number = value
            profile.save(update_fields=['employee_number'])
        elif has_profile:
            EmployeeProfile.objects.filter(user=user).update(employee_number=None)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        employee_number = validated_data.pop('employee_number', None)
        extra_permissions = validated_data.pop('extra_permissions', [])
        blocked_permissions = validated_data.pop('blocked_permissions', [])
        role = validated_data.pop('role', None)
        sector_id = validated_data.pop('sector', None)
        self._clean_optional_identifiers(validated_data)
        sector = self._resolve_sector(sector_id)
        user = UserModel(**validated_data)
        if sector:
            user.sector = sector
        if password:
            user.set_password(password)
        user.save()
        user.extra_permissions.set(extra_permissions)
        user.blocked_permissions.set(blocked_permissions)
        if role:
            user.role = role
            user.save(update_fields=['role'])
            self._apply_role(user, role, sector)
        if employee_number:
            self._apply_employee_number(user, employee_number)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        employee_number = validated_data.pop('employee_number', None)
        extra_permissions = validated_data.pop('extra_permissions', None)
        blocked_permissions = validated_data.pop('blocked_permissions', None)
        role = validated_data.pop('role', 'UNSET')
        sector_id = validated_data.pop('sector', 'UNSET')
        self._clean_optional_identifiers(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if sector_id != 'UNSET':
            instance.sector = self._resolve_sector(sector_id)
        if password:
            instance.set_password(password)
        instance.save()
        if extra_permissions is not None:
            instance.extra_permissions.set(extra_permissions)
        if blocked_permissions is not None:
            instance.blocked_permissions.set(blocked_permissions)
        if employee_number is not None:
            self._apply_employee_number(instance, employee_number or None)
        if role != 'UNSET':
            old_role = instance.role
            instance.role = role
            instance.save(update_fields=['role'])
            if old_role and old_role != role:
                RoleAssignment.objects.filter(user=instance, role=old_role, is_active=True).update(is_active=False)
            self._apply_role(instance, role, instance.sector)
        return instance


def get_user_by_identifier(identifier: str):
    if not identifier:
        return None
    value = identifier.strip()
    if '@' in value:
        return UserModel.objects.filter(email__iexact=value).first()
    return (
        UserModel.objects.filter(username__iexact=value).first()
        or UserModel.objects.filter(phone=value).first()
        or UserModel.objects.filter(national_id=value).first()
        or UserModel.objects.filter(email__iexact=value).first()
    )


class LoginSerializer(serializers.Serializer):
    MAX_FAILED_ATTEMPTS = 5
    LOCK_MINUTES = 15

    identifier = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    national_id = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = (
            attrs.get('identifier')
            or attrs.get('email')
            or attrs.get('phone')
            or attrs.get('national_id')
        )
        if not identifier:
            raise serializers.ValidationError('يرجى إدخال البريد الإلكتروني أو رقم الجوال أو الرقم القومي')
        user = get_user_by_identifier(identifier)
        if not user or not user.check_password(attrs.get('password')):
            if user:
                user.register_failed_login(
                    max_attempts=self.MAX_FAILED_ATTEMPTS, lock_minutes=self.LOCK_MINUTES
                )
                remaining = self.MAX_FAILED_ATTEMPTS - user.failed_login_attempts
                if user.is_locked:
                    minutes = max(1, int((user.locked_until - timezone.now()).total_seconds() // 60) + 1)
                    raise serializers.ValidationError(
                        f'تم قفل الحساب مؤقتاً بعد {self.MAX_FAILED_ATTEMPTS} محاولات فاشلة. حاول مجدداً بعد {minutes} دقيقة'
                    )
                if remaining <= 2:
                    raise serializers.ValidationError(
                        f'بيانات الدخول غير صحيحة — تبقى {remaining} محاولة قبل قفل الحساب'
                    )
            raise serializers.ValidationError('بيانات الدخول غير صحيحة')
        if not user.is_active:
            raise serializers.ValidationError('الحساب معطل')
        if user.is_locked:
            minutes = max(1, int((user.locked_until - timezone.now()).total_seconds() // 60) + 1)
            raise serializers.ValidationError(
                f'الحساب مقفل مؤقتاً — حاول مجدداً بعد {minutes} دقيقة'
            )
        user.register_successful_login()
        attrs['user'] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = UserModel
        fields = [
            'id', 'full_name', 'email', 'phone', 'national_id',
            'user_type', 'organization_name', 'password', 'confirm_password',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'password': 'كلمتا المرور غير متطابقتين'})
        user_type = attrs.get('user_type', UserModel.UserType.CITIZEN)
        if user_type in (UserModel.UserType.COMPANY, UserModel.UserType.GOVERNMENT):
            if not attrs.get('organization_name'):
                raise serializers.ValidationError(
                    {'organization_name': 'اسم المنشأة / الجهة مطلوب لهذا النوع من الحسابات'}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        for field in ('phone', 'national_id'):
            if field in validated_data and not validated_data[field]:
                validated_data[field] = None
        user = UserModel(**validated_data)
        if validated_data.get('user_type') == UserModel.UserType.TRAVELER:
            traveler_role = Role.objects.filter(code='TRAVELER').first()
            if traveler_role:
                user.role = traveler_role
        user.set_password(password)
        user.save()
        return user


class TokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)
    refresh_token = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        token = attrs.get('refresh') or attrs.get('refresh_token')
        if not token:
            raise serializers.ValidationError('رمز التحديث مطلوب')
        try:
            refresh = RefreshToken(token)
            refresh.check_blacklist()
        except TokenError:
            raise serializers.ValidationError('رمز التحديث غير صالح')
        attrs['refresh'] = refresh
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)


class EmployeeProfileSerializer(serializers.ModelSerializer):
    """بيانات الموظف والتفضيلات والتوقيع الرقمي."""

    birth_date = serializers.DateField(required=False, allow_null=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    signature_issue_date = serializers.DateField(required=False, allow_null=True)
    signature_expiry_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            'employee_number', 'full_name_ar', 'full_name_en', 'gender',
            'birth_date', 'job_title', 'hire_date', 'employment_status',
            'internal_phone', 'office', 'preferred_contact',
            'language', 'theme', 'timezone',
            'notify_email', 'notify_sms', 'notify_in_app',
            'signature_status', 'certificate',
            'signature_issue_date', 'signature_expiry_date',
        ]
        read_only_fields = [
            'signature_status', 'certificate',
            'signature_issue_date', 'signature_expiry_date',
        ]


class ProfileUpdateSerializer(serializers.Serializer):
    """تحديث ذاتي للملف الشخصي (بيانات الموظف + التفضيلات + وسائل التواصل)."""

    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    full_name = serializers.CharField(required=False)
    profile = EmployeeProfileSerializer(required=False, partial=True)

    def update(self, user, validated_data):
        phone = validated_data.get('phone')
        if phone is not None:
            user.phone = phone or None
        full_name = validated_data.get('full_name')
        if full_name:
            user.full_name = full_name
        user.save()
        profile_data = validated_data.get('profile')
        if profile_data:
            profile, _ = EmployeeProfile.objects.get_or_create(user=user)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return user


class UserSecuritySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = [
            'id', 'is_active', 'is_staff', 'is_mfa_enabled',
            'account_expires_at', 'last_login', 'created_at',
        ]
        read_only_fields = fields


class ProfileSerializer(serializers.Serializer):
    """الملف الشخصي الموحّد للمستخدم (حساب + بيانات موظف + دور/صلاحيات + نطاق تنظيمي)."""

    user = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    security = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    effective_permissions = serializers.SerializerMethodField()
    scopes = serializers.SerializerMethodField()

    def get_user(self, obj):
        return UserSerializer(obj).data

    def get_profile(self, obj):
        profile, _ = EmployeeProfile.objects.get_or_create(user=obj)
        return EmployeeProfileSerializer(profile).data

    def get_security(self, obj):
        return UserSecuritySerializer(obj).data

    def get_roles(self, obj):
        return [
            {
                'role': a.role.code,
                'role_name': a.role.name_ar or a.role.name,
                'scope_type': a.scope_type,
                'scope_id': str(a.scope_id) if a.scope_id else None,
                'is_active': a.is_active,
                'start_date': a.start_date.isoformat() if a.start_date else None,
                'end_date': a.end_date.isoformat() if a.end_date else None,
            }
            for a in obj.role_assignments.select_related('role').order_by('-start_date')
        ]

    def get_organization(self, obj):
        try:
            assignments = obj.org_assignments.select_related(
                'position', 'sector', 'department', 'station'
            ).filter(is_active=True).order_by('-is_primary', '-start_date')
        except AttributeError:
            return []
        result = []
        for a in assignments[:3]:
            entry = {
                'position': str(a.position) if a.position else None,
                'position_code': a.position.code if a.position else None,
                'sector': (a.sector.name_ar or a.sector.name_en) if a.sector else None,
                'sector_code': a.sector.code if a.sector else None,
                'sector_id': str(a.sector.id) if a.sector else None,
                'department': (a.department.name_ar or a.department.name_en) if a.department else None,
                'department_code': a.department.code if a.department else None,
                'department_id': str(a.department.id) if a.department else None,
                'station': (a.station.name_ar or a.station.name_en) if a.station else None,
                'station_code': a.station.code if a.station else None,
                'station_id': str(a.station.id) if a.station else None,
                'lab': None,
                'lab_code': None,
                'lab_id': None,
                'is_primary': a.is_primary,
            }
            dept = a.department
            if dept and dept.parent:
                entry['lab'] = dept.parent.name_ar or dept.parent.name_en
                entry['lab_code'] = dept.parent.code
                entry['lab_id'] = str(dept.parent.id)
            elif dept:
                entry['lab'] = dept.name_ar or dept.name_en
                entry['lab_code'] = dept.code
                entry['lab_id'] = str(dept.id)
            result.append(entry)
        return result

    def get_effective_permissions(self, obj):
        return obj.effective_permission_codes()

    def get_scopes(self, obj):
        return [
            {
                'role': a.role.code,
                'scope_type': a.scope_type,
                'scope_id': str(a.scope_id) if a.scope_id else None,
            }
            for a in obj.role_assignments.select_related('role').filter(is_active=True)
        ]
