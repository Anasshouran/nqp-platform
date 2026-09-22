import base64
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.utils.response import success_response

from .auth_serializers import (
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    TravelerLoginSerializer,
    TravelerProfileSerializer,
    TravelerRegisterSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class TravelerAuthViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        return [AllowAny()]

    @action(detail=False, methods=['post'], url_path='register', serializer_class=TravelerRegisterSerializer)
    def register(self, request):
        serializer = TravelerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(success_response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            'user': TravelerProfileSerializer(user).data,
        }), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='login', serializer_class=TravelerLoginSerializer, permission_classes=[AllowAny])
    def login(self, request):
        serializer = TravelerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response(success_response({
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            'user': TravelerProfileSerializer(user).data,
        }))

    @action(detail=False, methods=['post'], url_path='forgot-password', serializer_class=ForgotPasswordSerializer, permission_classes=[AllowAny])
    def forgot_password(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = base64.urlsafe_b64encode(force_bytes(user.pk)).decode()
            token = default_token_generator.make_token(user)
            origin = request.headers.get('Origin') or request.build_absolute_uri('/')
            reset_url = f"{origin.rstrip('/')}/traveler/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    subject='إعادة تعيين كلمة المرور — بوابة المسافرين',
                    message=f'استخدم الرابط التالي لإعادة تعيين كلمة المرور:\n\n{reset_url}\n\nصالح لمدة ساعة واحدة.',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@nqp.gov.sd'),
                    recipient_list=[email],
                    fail_silently=True,
                )
            except Exception:
                logger.exception('Failed to send reset email to %s', email)
        return Response(success_response({'detail': 'إذا كان البريد مسجلاً، فستصلك رسالة خلال دقائق'}))

    @action(detail=False, methods=['post'], url_path='reset-password', serializer_class=ResetPasswordSerializer, permission_classes=[AllowAny])
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response({'detail': 'تم إعادة تعيين كلمة المرور بنجاح — يمكنك تسجيل الدخول الآن'}))

    @action(detail=False, methods=['get', 'patch'], url_path='me', serializer_class=TravelerProfileSerializer)
    def me(self, request):
        if request.method == 'PATCH':
            serializer = TravelerProfileSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            for field in ('full_name', 'phone'):
                if field in serializer.validated_data:
                    setattr(request.user, field, serializer.validated_data[field])
            request.user.save(update_fields=['full_name', 'phone'])
        return Response(success_response(TravelerProfileSerializer(request.user).data))
