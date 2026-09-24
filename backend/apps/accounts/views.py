from django.conf import settings
from django.db.models import Count
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from rest_framework_simplejwt.tokens import RefreshToken, TokenError, UntypedToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.settings import api_settings

from core.filters import ExactFilterBackend
from core.permissions import AdminOrPermissionAction
from core.utils.response import success_response

from .models import EmployeeProfile, Permission, PermissionAudit, Role, RoleAssignment, User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PermissionAuditSerializer,
    PermissionSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    RoleAssignmentSerializer,
    RoleAssignmentWriteSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    TokenRefreshSerializer,
    UserSerializer,
    UserWriteSerializer,
)


class AuthViewSet(ViewSet):
    PUBLIC_ACTIONS = {'login', 'refresh', 'register', 'forgot_password', 'reset_password'}

    def get_permissions(self):
        if self.action in self.PUBLIC_ACTIONS:
            return [AllowAny()]
        return [IsAuthenticated()]

    @extend_schema(
        request=LoginSerializer,
        responses={200: OpenApiResponse(description='تم تسجيل الدخول بنجاح')},
    )
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        self._attach_session_claims(request, refresh, user)
        data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            'user': UserSerializer(user).data,
        }
        return Response(success_response(data))

    @extend_schema(
        request=RegisterSerializer,
        responses={201: OpenApiResponse(description='تم إنشاء الحساب بنجاح')},
    )
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        self._attach_session_claims(request, refresh, user)
        data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            'user': UserSerializer(user).data,
        }
        return Response(success_response(data), status=status.HTTP_201_CREATED)

    @staticmethod
    def _client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR') or ''

    @staticmethod
    def _device_label(user_agent):
        ua = (user_agent or '').lower()
        if 'iphone' in ua or 'android' in ua and 'mobile' in ua:
            return 'جوال'
        if 'tablet' in ua or 'ipad' in ua:
            return 'جهاز لوحي'
        if 'windows' in ua:
            return 'كمبيوتر (Windows)'
        if 'mac os' in ua:
            return 'كمبيوتر (Mac)'
        if 'android' in ua:
            return 'جوال أندرويد'
        if 'linux' in ua:
            return 'كمبيوتر (Linux)'
        if ua:
            return 'جهاز آخر'
        return 'جهاز غير معروف'

    def _attach_session_claims(self, request, refresh, user):
        """يضيف بيانات الجلسة (IP + الجهاز) إلى رمز التحديث ويثبّتها في سجلات الجلسات."""
        ip = self._client_ip(request)
        ua = (request.META.get('HTTP_USER_AGENT') or '')[:255]
        device = self._device_label(ua)
        refresh['ip'] = ip
        refresh['user_agent'] = ua
        refresh['device'] = device
        jti = refresh[api_settings.JTI_CLAIM]
        try:
            outstanding = OutstandingToken.objects.get(jti=jti, user=user)
            outstanding.token = str(refresh)
            outstanding.save(update_fields=['token'])
        except OutstandingToken.DoesNotExist:
            pass

    @extend_schema(
        request=TokenRefreshSerializer,
        responses={200: OpenApiResponse(description='تم تحديث الرمز بنجاح')},
    )
    def refresh(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data['refresh']
        data = {
            'access_token': str(refresh.access_token),
            'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
        }
        return Response(success_response(data))

    @extend_schema(
        request=TokenRefreshSerializer,
        responses={204: OpenApiResponse(description='تم تسجيل الخروج')},
    )
    def logout(self, request):
        token = request.data.get('refresh') or request.data.get('refresh_token')
        if not token:
            return Response(
                {'status': 'error', 'message': 'رمز التحديث مطلوب'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            refresh = RefreshToken(token)
            refresh.blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: OpenApiResponse(description='تم تغيير كلمة المرور بنجاح')},
    )
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'status': 'error', 'message': 'كلمة المرور الحالية غير صحيحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response(success_response(message='تم تغيير كلمة المرور بنجاح'))

    @action(detail=False, methods=['post'], url_path='forgot-password', permission_classes=[AllowAny])
    def forgot_password(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.core.mail import send_mail

        email = (request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            base = getattr(settings, 'PASSWORD_RESET_BASE_URL', '') or request.build_absolute_uri('/').rstrip('/')
            reset_url = f"{base}/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    subject='إعادة تعيين كلمة المرور — نظام الرقابة القومية',
                    message=f'استخدم الرابط التالي لإعادة تعيين كلمة المرور:\n\n{reset_url}\n\nصالح لمدة ساعة واحدة.',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@nqp.gov.sd'),
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                pass
        return Response(success_response({'detail': 'إذا كان البريد مسجلاً، فستصلك رسالة خلال دقائق'}))

    @action(detail=False, methods=['post'], url_path='reset-password', permission_classes=[AllowAny])
    def reset_password(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        uidb64 = request.data.get('uidb64') or ''
        token = request.data.get('token') or ''
        password = request.data.get('password') or ''
        confirm = request.data.get('confirm_password') or ''
        if password != confirm or len(password) < 8:
            return Response(
                {'status': 'error', 'message': 'كلمة المرور يجب ألا تقل عن 8 أحرف وكلمتا المرور متطابقتان'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except Exception:
            return Response(
                {'status': 'error', 'message': 'رابط غير صالح'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not default_token_generator.check_token(user, token):
            return Response(
                {'status': 'error', 'message': 'التوكن غير صالح أو منتهي الصلاحية'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])
        return Response(success_response({'detail': 'تم إعادة تعيين كلمة المرور بنجاح — يمكنك تسجيل الدخول الآن'}))

    @extend_schema(
        responses={200: UserSerializer},
    )
    def me(self, request):
        return Response(success_response(UserSerializer(request.user).data))

    @extend_schema(
        responses={200: ProfileSerializer},
    )
    def profile(self, request):
        return Response(success_response(ProfileSerializer(request.user).data))

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={200: ProfileSerializer},
    )
    def update_profile(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(success_response(ProfileSerializer(request.user).data))


class MeViewSet(ViewSet):
    """نقاط طرفية ذاتية للملف/الحساب تحت /api/v1/me/ — بيانات المستخدم الحالي فقط."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(success_response(UserSerializer(request.user).data))

    def update_profile(self, request):
        user = request.user
        phone = request.data.get('phone')
        if phone is not None:
            user.phone = phone or None
        full_name = request.data.get('full_name')
        if full_name:
            user.full_name = full_name
        user.save()
        profile_data = request.data.get('profile')
        fields = ('full_name_ar', 'full_name_en', 'job_title')
        top_level = {f: request.data.get(f) for f in fields if request.data.get(f) is not None}
        if profile_data or top_level:
            profile, _ = EmployeeProfile.objects.get_or_create(user=user)
            merged = {**(profile_data or {}), **top_level}
            for field, value in merged.items():
                if hasattr(profile, field):
                    setattr(profile, field, value)
            profile.save()
        return Response(success_response(ProfileSerializer(user).data))

    def organization(self, request):
        user = request.user
        entries = []
        assignments = user.org_assignments.select_related(
            'position', 'sector', 'department', 'station'
        ).order_by('-is_primary', '-start_date')
        for a in assignments[:5]:
            dept = a.department
            position = a.position
            unit = None
            if position and position.department_id:
                unit = position.department
            entry = {
                'sector': a.sector.name_ar if a.sector else None,
                'sector_name': a.sector.name_ar if a.sector else None,
                'sector_code': a.sector.code if a.sector else None,
                'department': dept.name_ar or dept.name_en if dept else None,
                'department_name': dept.name_ar or dept.name_en if dept else None,
                'station': a.station.name_ar or a.station.name_en if a.station else None,
                'station_name': a.station.name_ar or a.station.name_en if a.station else None,
                'unit': unit.name_ar or unit.name_en if unit else None,
                'unit_name': unit.name_ar or unit.name_en if unit else None,
                'position': position.name_ar or position.name_en if position else None,
                'position_name': position.name_ar or position.name_en if position else None,
            }
            entries.append(entry)
        if not entries and user.sector_id:
            entries.append({
                'sector': user.sector.name_ar if user.sector else None,
                'sector_name': user.sector.name_ar if user.sector else None,
                'sector_code': user.sector.code if user.sector else None,
                'department': None, 'department_name': None,
                'station': None, 'station_name': None,
                'unit': None, 'unit_name': None,
                'position': None, 'position_name': None,
            })
        return Response(success_response(entries))

    def sessions(self, request):
        user = request.user
        now = timezone.now()
        tokens = OutstandingToken.objects.filter(user=user).order_by('-created_at')[:50]
        blacklisted_jtis = set(
            BlacklistedToken.objects.filter(token__user=user).values_list('token__jti', flat=True)
        )
        sessions = []
        for token in tokens:
            try:
                payload = UntypedToken(token.token).payload
            except (TokenError, ValueError):
                payload = {}
            sessions.append({
                'id': str(token.id),
                'created_at': token.created_at.isoformat() if token.created_at else None,
                'last_activity': token.created_at.isoformat() if token.created_at else None,
                'expires_at': token.expires_at.isoformat(),
                'is_active': token.expires_at > now and token.jti not in blacklisted_jtis,
                'device_info': payload.get('device') or '',
                'ip_address': payload.get('ip') or '',
                'user_agent': payload.get('user_agent') or '',
                'current': False,
            })
        return Response(success_response(sessions))

    def delete_session(self, request, pk=None):
        user = request.user
        try:
            token = OutstandingToken.objects.get(pk=pk, user=user)
        except (OutstandingToken.DoesNotExist, ValueError):
            return Response(status=status.HTTP_404_NOT_FOUND)
        if BlacklistedToken.objects.filter(token=token).exists():
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            refresh = RefreshToken(token.token)
            refresh.blacklist()
        except TokenError:
            return Response(
                {'status': 'error', 'message': 'الجلسة غير صالحة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def activity(self, request):
        user = request.user
        entries = []

        def add(dt, action, description):
            if not dt:
                return
            local = timezone.localtime(dt)
            entries.append({
                'date': local.date().isoformat(),
                'time': local.strftime('%H:%M'),
                'action': action,
                'description': description,
            })

        add(user.created_at, 'ACCOUNT_CREATED', 'إنشاء الحساب')
        add(user.last_login, 'LOGIN', 'تسجيل دخول ناجح')
        audits = PermissionAudit.objects.filter(user=user).order_by('-created_at')[:20]
        labels = {
            PermissionAudit.Action.GRANT: 'منح صلاحية',
            PermissionAudit.Action.DENY: 'حظر صلاحية',
            PermissionAudit.Action.REVOKE: 'إلغاء صلاحية',
        }
        for a in audits:
            add(a.created_at, a.action, f"{labels.get(a.action, a.action)} {a.permission_code}")
        entries.sort(key=lambda e: (e['date'], e['time']), reverse=True)
        return Response(success_response(entries))

    def notifications_settings(self, request):
        profile, _ = EmployeeProfile.objects.get_or_create(user=request.user)
        settings_data = [
            {'key': 'notify_email', 'label': 'الإشعار عبر البريد', 'value': profile.notify_email},
            {'key': 'notify_sms', 'label': 'الإشعار عبر الرسائل', 'value': profile.notify_sms},
            {'key': 'notify_in_app', 'label': 'الإشعار داخل النظام', 'value': profile.notify_in_app},
            {'key': 'notify_transactions', 'label': 'إشعارات المعاملات', 'value': profile.notify_in_app},
            {'key': 'notify_tasks', 'label': 'إشعارات المهام', 'value': profile.notify_in_app},
            {'key': 'notify_health', 'label': 'إشعارات الصحة', 'value': profile.notify_in_app},
            {'key': 'notify_certificates', 'label': 'إشعارات الشهادات', 'value': profile.notify_in_app},
            {'key': 'notify_system', 'label': 'إشعارات النظام', 'value': profile.notify_email},
        ]
        return Response(success_response(settings_data))

    def update_notifications_settings(self, request):
        profile, _ = EmployeeProfile.objects.get_or_create(user=request.user)
        for field in ('notify_email', 'notify_sms', 'notify_in_app'):
            if field in request.data:
                setattr(profile, field, bool(request.data.get(field)))
        if any(k in request.data for k in ('notify_transactions', 'notify_tasks', 'notify_health', 'notify_certificates')):
            profile.notify_in_app = bool(request.data.get('notify_in_app', profile.notify_in_app))
        profile.save()
        return Response(success_response(self._notification_list(profile)))

    @staticmethod
    def _notification_list(profile):
        return [
            {'key': 'notify_email', 'label': 'الإشعار عبر البريد', 'value': profile.notify_email},
            {'key': 'notify_sms', 'label': 'الإشعار عبر الرسائل', 'value': profile.notify_sms},
            {'key': 'notify_in_app', 'label': 'الإشعار داخل النظام', 'value': profile.notify_in_app},
        ]

    def preferences(self, request):
        profile, _ = EmployeeProfile.objects.get_or_create(user=request.user)
        language = request.data.get('language')
        if language:
            profile.language = 'AR' if str(language).lower() in ('ar', 'arabic', 'rtl') else 'EN'
        timezone_val = request.data.get('timezone')
        if timezone_val:
            profile.timezone = timezone_val
        profile.save()
        data = {
            'language': 'ar' if profile.language == 'AR' else 'en',
            'direction': 'RTL' if profile.language == 'AR' else 'LTR',
            'timezone': profile.timezone,
        }
        return Response(success_response(data))


def log_permission_audit(request, user, old_extra, old_blocked, new_extra, new_blocked):
    """يسجّل تغييرات المنح/الحظر على صلاحيات المستخدم في PermissionAudit."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = (xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')) or ''
    ua = (request.META.get('HTTP_USER_AGENT') or '')[:255]

    entries = []
    changes = [
        ('GRANT', set(new_extra) - set(old_extra)),
        ('DENY', set(new_blocked) - set(old_blocked)),
        ('REVOKE', set(old_extra) - set(new_extra)),
        ('REVOKE', set(old_blocked) - set(new_blocked)),
    ]
    for action, codes in changes:
        entries.extend([
            PermissionAudit(
                user=user,
                permission_code=code,
                action=action,
                granted=action != 'REVOKE',
                ip_address=ip,
                user_agent=ua,
            )
            for code in codes
        ])
    if entries:
        PermissionAudit.objects.bulk_create(entries)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('role').all()
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'users'
    action_permission_map = {
        'roles': 'view',
        'effective_permissions': 'view',
        'profile': 'view',
        'permission_audit': 'view',
        'scopes': 'view',
        'reset_password': 'edit',
    }
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['email', 'full_name', 'phone', 'national_id', 'organization_name']
    ordering_fields = ['created_at', 'full_name', 'email']
    filter_fields = ['user_type', 'is_active', 'role']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UserWriteSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_permission_audit(
            request, user,
            [],
            [],
            list(user.extra_permissions.values_list('code', flat=True)),
            list(user.blocked_permissions.values_list('code', flat=True)),
        )
        return Response(
            success_response(UserSerializer(user).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_extra = list(instance.extra_permissions.values_list('code', flat=True))
        old_blocked = list(instance.blocked_permissions.values_list('code', flat=True))
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_permission_audit(
            request, user,
            old_extra, old_blocked,
            list(user.extra_permissions.values_list('code', flat=True)),
            list(user.blocked_permissions.values_list('code', flat=True)),
        )
        return Response(success_response(UserSerializer(user).data))

    @action(detail=False, methods=['get'], url_path='roles')
    def roles(self, request):
        roles = Role.objects.order_by('name_ar').all()
        return Response(success_response(RoleSerializer(roles, many=True).data))

    @action(detail=True, methods=['get'], url_path='effective-permissions')
    def effective_permissions(self, request, pk=None):
        user = self.get_object()
        return Response(success_response(user.effective_permission_codes()))

    @action(detail=True, methods=['get'], url_path='profile')
    def profile(self, request, pk=None):
        """الملف الكامل للمستخدم: الحساب، بيانات الموظف، الأمان، الأدوار، التنظيم، الصلاحيات الفعلية."""
        user = self.get_object()
        return Response(success_response(ProfileSerializer(user).data))

    @action(detail=True, methods=['get'], url_path='permission-audit')
    def permission_audit(self, request, pk=None):
        user = self.get_object()
        audits = PermissionAudit.objects.filter(user=user).order_by('-created_at')[:50]
        return Response(success_response(PermissionAuditSerializer(audits, many=True).data))

    @action(detail=True, methods=['get'], url_path='scopes')
    def scopes(self, request, pk=None):
        user = self.get_object()
        resource = request.query_params.get('resource', 'travelers')
        return Response(success_response(user.active_scopes(resource)))

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """تعيين كلمة مرور جديدة للمستخدم (موظفو الأمان) مع فك قفل الحساب."""
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'status': 'error', 'message': 'كلمة المرور يجب ألا تقل عن 8 أحرف'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])
        return Response(success_response({'email': user.email, 'reset': True}))


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.annotate(
        permission_count=Count('permissions', distinct=True),
        user_count=Count('users', distinct=True),
    ).prefetch_related('permissions').order_by('code')
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'roles'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['code', 'name', 'name_ar', 'description']
    ordering_fields = ['code', 'name', 'name_ar']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RoleWriteSerializer
        return RoleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            success_response(RoleSerializer(role).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(success_response(RoleSerializer(role).data))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {'status': 'error', 'message': 'لا يمكن حذف هذا الدور لأنه معيّن لمستخدمين'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.order_by('code')
    serializer_class = PermissionSerializer
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'permissions'
    action_permission_map = {'tree': 'view'}
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['code', 'name', 'resource']
    ordering_fields = ['resource', 'code']
    filter_fields = ['resource', 'action']

    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        perms = Permission.objects.order_by('resource', 'code')
        grouped: dict[str, list] = {}
        for perm in perms:
            grouped.setdefault(perm.resource, []).append(PermissionSerializer(perm).data)
        return Response(success_response(grouped))


class RoleAssignmentViewSet(viewsets.ModelViewSet):
    queryset = RoleAssignment.objects.select_related(
        'user', 'role', 'assigned_by'
    ).all()
    permission_classes = [AdminOrPermissionAction]
    permission_resource = 'role_assignments'
    http_method_names = ['get', 'post', 'patch', 'delete']
    filter_backends = [SearchFilter, OrderingFilter, ExactFilterBackend]
    search_fields = ['user__email', 'user__full_name', 'role__code']
    ordering_fields = ['start_date', 'end_date', 'is_active', 'created_at']
    filter_fields = ['user', 'role', 'scope_type', 'is_active']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RoleAssignmentWriteSerializer
        return RoleAssignmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(
            success_response(RoleAssignmentSerializer(assignment).data),
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(success_response(RoleAssignmentSerializer(assignment).data))
