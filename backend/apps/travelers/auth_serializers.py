import base64
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from rest_framework import serializers

from apps.accounts.models import Role
from apps.accounts.serializers import get_user_by_identifier
from apps.travelers.models import Country, Traveler

User = get_user_model()


class TravelerRegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    passport_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    nationality = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('هذا البريد مسجل مسبقاً')
        return value.lower().strip()

    def validate_phone(self, value):
        phone = (value or '').strip() or None
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError('رقم الجوال مسجل مسبقاً')
        return phone

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'password': 'كلمتا المرور غير متطابقتين'})
        try:
            validate_password(attrs['password'])
        except Exception as e:
            raise serializers.ValidationError({'password': e.messages})
        passport = attrs.get('passport_number')
        if passport:
            existing = Traveler.objects.filter(passport_number=passport, user__isnull=True).first()
            if existing:
                dob = attrs.get('date_of_birth')
                if dob != existing.date_of_birth:
                    raise serializers.ValidationError(
                        {'date_of_birth': 'رقم الجواز مرتبط بسجل موجود — تحقق من تاريخ الميلاد المطابق للجواز'}
                    )
                if existing.email and existing.email.lower() != attrs.get('email', '').strip().lower():
                    raise serializers.ValidationError(
                        {'email': 'رقم الجواز مرتبط ببريد إلكتروني مختلف — استخدم البريد المسجل على الجواز'}
                    )
                attrs['_existing_traveler'] = existing
        return attrs

    def create(self, validated_data):
        existing_traveler = validated_data.pop('_existing_traveler', None)
        validated_data.pop('passport_number', None)
        validated_data.pop('date_of_birth', None)
        nationality_code = validated_data.pop('nationality', '')
        phone = validated_data.pop('phone', '') or None
        traveler_role = Role.objects.filter(code='TRAVELER').first()
        user = User(
            email=validated_data.pop('email'),
            full_name=validated_data.pop('full_name'),
            user_type=User.UserType.TRAVELER,
            is_staff=False,
            role=traveler_role,
            phone=phone,
        )
        user.set_password(validated_data.pop('password'))
        user.save()
        passport = self.initial_data.get('passport_number')
        dob = self.initial_data.get('date_of_birth')
        country = Country.objects.filter(code__iexact=nationality_code).first() if nationality_code else None
        if passport and country and not existing_traveler:
            Traveler.objects.create(
                passport_number=passport,
                first_name=user.full_name.split()[0] if user.full_name else user.full_name,
                last_name=' '.join(user.full_name.split()[1:]) if user.full_name and len(user.full_name.split()) > 1 else '',
                date_of_birth=dob or timezone.now().date(),
                nationality=country,
                phone=user.phone or '',
                email=user.email,
                user=user,
            )
        elif existing_traveler:
            existing_traveler.user = user
            existing_traveler.save(update_fields=['user'])
        return user


class TravelerLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs['identifier']
        user = get_user_by_identifier(identifier)
        if not user or not user.check_password(attrs['password']):
            if user:
                user.register_failed_login(max_attempts=5, lock_minutes=15)
                if user.is_locked:
                    minutes = max(1, int((user.locked_until - timezone.now()).total_seconds() // 60) + 1)
                    raise serializers.ValidationError(f'تم قفل الحساب مؤقتاً — حاول مجدداً بعد {minutes} دقيقة')
                remaining = 5 - user.failed_login_attempts
                if remaining <= 2:
                    raise serializers.ValidationError(f'بيانات الدخول غير صحيحة — تبقى {remaining} محاولة قبل القفل')
            raise serializers.ValidationError('بيانات الدخول غير صحيحة')
        if not user.is_active:
            raise serializers.ValidationError('الحساب معطل')
        if user.is_locked:
            minutes = max(1, int((user.locked_until - timezone.now()).total_seconds() // 60) + 1)
            raise serializers.ValidationError(f'الحساب مقفل مؤقتاً — حاول مجدداً بعد {minutes} دقيقة')
        if user.is_staff:
            raise serializers.ValidationError('لا يمكن لموظفي النظام تسجيل الدخول من بوابة المسافرين')
        user.register_successful_login()
        attrs['user'] = user
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class ResetPasswordSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'password': 'كلمتا المرور غير متطابقتين'})
        try:
            uid = force_str(base64.urlsafe_b64decode(attrs['uidb64']))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError({'uidb64': 'رابط غير صالح'})
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'التوكن غير صالح أو منتهي الصلاحية'})
        attrs['_user'] = user
        return attrs

    def save(self):
        user = self.validated_data['_user']
        user.set_password(self.validated_data['password'])
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until'])
        return user


class TravelerProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    user_type = serializers.CharField(read_only=True)
    travelers = serializers.SerializerMethodField()

    def get_travelers(self, obj):
        travelers = obj.travelers.select_related('nationality').all()[:5]
        return [
            {
                'id': str(t.id),
                'passport_number': t.passport_number,
                'full_name': f'{t.first_name} {t.last_name}',
                'registration_status': t.registration_status,
                'nationality': getattr(t.nationality, 'name', None),
            }
            for t in travelers
        ]
