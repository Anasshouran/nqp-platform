from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from core.models import BaseModel


class ScopeType(models.TextChoices):
    GLOBAL = 'GLOBAL', 'عام'
    POINT = 'POINT', 'نقطة حدودية'
    PORT = 'PORT', 'ميناء'
    REGION = 'REGION', 'منطقة'
    SECTOR = 'SECTOR', 'قطاع إداري'
    DEPARTMENT = 'DEPARTMENT', 'إدارة'
    STATION = 'STATION', 'محطة'


class Role(BaseModel):
    code = models.CharField(max_length=50, unique=True, verbose_name='الكود')
    name = models.CharField(max_length=100, verbose_name='الاسم')
    name_ar = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالعربية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    default_scope = models.CharField(
        max_length=20,
        choices=ScopeType.choices,
        default=ScopeType.GLOBAL,
        verbose_name='النطاق الافتراضي',
    )
    permissions = models.ManyToManyField(
        'Permission', related_name='roles', blank=True, verbose_name='الصلاحيات'
    )

    class Meta:
        ordering = ['code']
        verbose_name = 'دور'
        verbose_name_plural = 'الأدوار'

    def __str__(self):
        return self.code


class Permission(BaseModel):
    code = models.CharField(max_length=100, unique=True, verbose_name='الكود')
    name = models.CharField(max_length=100, verbose_name='الاسم')
    resource = models.CharField(max_length=50, verbose_name='الفئة')
    action = models.CharField(max_length=20, verbose_name='العملية')

    class Meta:
        ordering = ['code']
        verbose_name = 'صلاحية'
        verbose_name_plural = 'الصلاحيات'

    def __str__(self):
        return self.code


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('البريد الإلكتروني مطلوب')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    class UserType(models.TextChoices):
        CITIZEN = 'CITIZEN', 'مواطن'
        TRAVELER = 'TRAVELER', 'مسافر'
        IMPORTER = 'IMPORTER', 'مستورد'
        EXPORTER = 'EXPORTER', 'مصدر'
        COMPANY = 'COMPANY', 'شركة'
        GOVERNMENT = 'GOVERNMENT', 'جهة حكومية'
        MINISTRY_STAFF = 'MINISTRY_STAFF', 'موظف وزارة'

    email = models.EmailField(unique=True, verbose_name='البريد الإلكتروني')
    username = models.CharField(
        max_length=50, unique=True, null=True, blank=True, verbose_name='اسم المستخدم',
        help_text='معرّف تسجيل دخول اختياري يُسمح بالدخول به بدلاً من البريد',
    )
    phone = models.CharField(
        max_length=20, unique=True, null=True, blank=True, verbose_name='رقم الجوال'
    )
    full_name = models.CharField(max_length=255, verbose_name='الاسم الكامل')
    national_id = models.CharField(
        max_length=20, null=True, blank=True, verbose_name='الرقم القومي'
    )
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.CITIZEN,
        verbose_name='نوع المستخدم',
    )
    organization_name = models.CharField(max_length=255, blank=True, verbose_name='اسم المنشأة / الجهة')
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users',
        null=True,
        blank=True,
        verbose_name='الدور',
    )
    sector = models.ForeignKey(
        'organization.Sector',
        on_delete=models.SET_NULL,
        related_name='users',
        null=True,
        blank=True,
        verbose_name='القطاع',
    )
    extra_permissions = models.ManyToManyField(
        Permission, related_name='users', blank=True, verbose_name='صلاحيات إضافية'
    )
    blocked_permissions = models.ManyToManyField(
        Permission, related_name='blocked_users', blank=True, verbose_name='صلاحيات محظورة'
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    is_staff = models.BooleanField(default=False, verbose_name='موظف')
    is_mfa_enabled = models.BooleanField(default=False, verbose_name='المصادقة الثنائية')
    account_expires_at = models.DateField(null=True, blank=True, verbose_name='تاريخ انتهاء الحساب')
    failed_login_attempts = models.PositiveIntegerField(default=0, verbose_name='محاولات الدخول الفاشلة')
    locked_until = models.DateTimeField(null=True, blank=True, verbose_name='مقفل حتى')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        ordering = ['full_name']
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'

    def __str__(self):
        return self.email

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    def register_failed_login(self, max_attempts=5, lock_minutes=15):
        """يسجّل محاولة دخول فاشلة ويقفل الحساب عند تجاوز الحد."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = timezone.now() + timedelta(minutes=lock_minutes)
            self.failed_login_attempts = 0
        self.save(update_fields=['failed_login_attempts', 'locked_until'])

    def register_successful_login(self):
        """يصفّر عدّاد المحاولات والقفل بعد دخول ناجح ويسجّل آخر دخول."""
        self.last_login = timezone.now()
        if self.failed_login_attempts or self.locked_until:
            self.failed_login_attempts = 0
            self.locked_until = None
            self.save(update_fields=['last_login', 'failed_login_attempts', 'locked_until'])
        else:
            self.save(update_fields=['last_login'])

    @property
    def role_code(self):
        return self.role.code if self.role else None

    def has_permission(self, code):
        return self.can(code)

    def can(self, permission_code):
        if self.is_superuser:
            return True
        if self.blocked_permissions.filter(code=permission_code).exists():
            return False
        if self.extra_permissions.filter(code=permission_code).exists():
            return True
        now = timezone.now()
        assignments = self.role_assignments.filter(
            is_active=True,
            start_date__lte=now,
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gt=now),
        ).select_related('role')
        for assignment in assignments:
            if assignment.role.permissions.filter(code=permission_code).exists():
                return True
        return False

    def can_resource(self, resource, action='view'):
        return self.can(f'{resource}:{action}')

    def effective_permission_codes(self):
        if self.is_superuser:
            return list(Permission.objects.values_list('code', flat=True))
        codes = set(self.extra_permissions.values_list('code', flat=True))
        now = timezone.now()
        assignments = self.role_assignments.filter(
            is_active=True,
            start_date__lte=now,
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gt=now),
        ).select_related('role')
        for assignment in assignments:
            codes.update(
                assignment.role.permissions.values_list('code', flat=True)
            )
        blocked = set(self.blocked_permissions.values_list('code', flat=True))
        return sorted(codes - blocked)

    def active_scopes(self, resource):
        now = timezone.now()
        assignments = self.role_assignments.filter(
            is_active=True,
            start_date__lte=now,
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gt=now),
            scope_type__isnull=False,
        ).exclude(scope_type='GLOBAL')
        return [
            {'scope_type': a.scope_type, 'scope_id': a.scope_id}
            for a in assignments
            if a.role.permissions.filter(resource=resource).exists()
        ]

    def clear_permission_cache(self):
        pass


class RoleAssignment(BaseModel):
    ScopeType = ScopeType

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='role_assignments', verbose_name='المستخدم'
    )
    role = models.ForeignKey(
        Role, on_delete=models.PROTECT, related_name='assignments', verbose_name='الدور'
    )
    scope_type = models.CharField(
        max_length=20,
        choices=ScopeType.choices,
        default=ScopeType.GLOBAL,
        verbose_name='نوع النطاق',
    )
    scope_id = models.UUIDField(null=True, blank=True, verbose_name='معرف النطاق')
    start_date = models.DateField(default=timezone.localdate, verbose_name='تاريخ البداية')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ النهاية')
    is_active = models.BooleanField(default=True, verbose_name='نشط')
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_role_assignments',
        verbose_name='أُعطي بواسطة',
    )

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'تعيين دور'
        verbose_name_plural = 'تعيينات الأدوار'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'role', 'scope_type', 'scope_id'],
                name='unique_role_assignment',
            ),
        ]

    def __str__(self):
        scope = f' ({self.scope_type}:{self.scope_id})' if self.scope_id else ''
        return f'{self.user.email} → {self.role.code}{scope}'

    @property
    def is_current(self):
        now = timezone.now().date()
        return (
            self.is_active
            and self.start_date <= now
            and (self.end_date is None or self.end_date >= now)
        )


class PermissionAudit(BaseModel):
    class Action(models.TextChoices):
        GRANT = 'GRANT', 'منح'
        DENY = 'DENY', 'رفض'
        REVOKE = 'REVOKE', 'إلغاء'

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='permission_audits', verbose_name='المستخدم'
    )
    permission_code = models.CharField(max_length=100, verbose_name='كود الصلاحية')
    action = models.CharField(
        max_length=10, choices=Action.choices, verbose_name='الإجراء'
    )
    granted = models.BooleanField(verbose_name='ممنوحة')
    reason = models.TextField(blank=True, verbose_name='السبب')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    user_agent = models.CharField(max_length=255, blank=True, verbose_name='وكيل المستخدم')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تدقيق صلاحيات'
        verbose_name_plural = 'تدقيق الصلاحيات'

    def __str__(self):
        status = '✓' if self.granted else '✗'
        return f'{status} {self.user.email} {self.action} {self.permission_code}'


class EmployeeProfile(BaseModel):
    """الملف الوظيفي الموحّد للمستخدم (بيانات الموظف والتفضيلات والتوقيع الرقمي)."""

    class Gender(models.TextChoices):
        MALE = 'MALE', 'ذكر'
        FEMALE = 'FEMALE', 'أنثى'

    class EmploymentStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'على رأس العمل'
        ON_LEAVE = 'ON_LEAVE', 'إجازة'
        SUSPENDED = 'SUSPENDED', 'موقوف'
        TERMINATED = 'TERMINATED', 'منتهي الخدمة'

    class PreferredContact(models.TextChoices):
        EMAIL = 'EMAIL', 'البريد الإلكتروني'
        SMS = 'SMS', 'رسالة نصية'
        PHONE = 'PHONE', 'اتصال هاتفي'
        IN_APP = 'IN_APP', 'داخل النظام'

    class Language(models.TextChoices):
        AR = 'AR', 'العربية'
        EN = 'EN', 'English'

    class Theme(models.TextChoices):
        LIGHT = 'LIGHT', 'فاتح'
        DARK = 'DARK', 'داكن'

    class SignatureStatus(models.TextChoices):
        UNREGISTERED = 'UNREGISTERED', 'غير مسجلة'
        REGISTERED = 'REGISTERED', 'مسجلة'
        VERIFIED = 'VERIFIED', 'موثّقة'
        EXPIRED = 'EXPIRED', 'منتهية'

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='profile', verbose_name='المستخدم',
    )

    # البيانات الأساسية والوظيفية
    employee_number = models.CharField(
        max_length=50, unique=True, null=True, blank=True, verbose_name='الرقم الوظيفي'
    )
    full_name_ar = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالعربية')
    full_name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    gender = models.CharField(
        max_length=10, choices=Gender.choices, blank=True, verbose_name='الجنس'
    )
    birth_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الميلاد')
    job_title = models.CharField(max_length=200, blank=True, verbose_name='المسمى الوظيفي')
    hire_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التعيين')
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
        verbose_name='حالة الموظف',
    )

    # التواصل وبيانات الاتصال
    internal_phone = models.CharField(max_length=20, blank=True, verbose_name='الهاتف الداخلي')
    office = models.CharField(max_length=200, blank=True, verbose_name='المكتب')
    preferred_contact = models.CharField(
        max_length=20,
        choices=PreferredContact.choices,
        default=PreferredContact.EMAIL,
        verbose_name='وسيلة التواصل المفضلة',
    )

    # التفضيلات
    language = models.CharField(
        max_length=10, choices=Language.choices, default=Language.AR, verbose_name='اللغة'
    )
    theme = models.CharField(
        max_length=10, choices=Theme.choices, default=Theme.LIGHT, verbose_name='المظهر'
    )
    timezone = models.CharField(
        max_length=50, default='Africa/Khartoum', verbose_name='المنطقة الزمنية'
    )
    notify_email = models.BooleanField(default=True, verbose_name='الإشعار عبر البريد')
    notify_sms = models.BooleanField(default=False, verbose_name='الإشعار عبر الرسائل')
    notify_in_app = models.BooleanField(default=True, verbose_name='الإشعار داخل النظام')

    # التوقيع الرقمي (لمن يملكون صلاحية الاعتماد)
    signature_status = models.CharField(
        max_length=20,
        choices=SignatureStatus.choices,
        default=SignatureStatus.UNREGISTERED,
        verbose_name='حالة التوقيع',
    )
    certificate = models.CharField(max_length=255, blank=True, verbose_name='الشهادة')
    signature_issue_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الإصدار')
    signature_expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'ملف موظف'
        verbose_name_plural = 'ملفات الموظفين'

    def __str__(self):
        return f'{self.user.email} — {self.job_title or self.employee_number or "بدون ملف"}'
