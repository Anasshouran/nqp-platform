from django.conf import settings
from django.db import models

from core.models import BaseModel


class OrgPosition(BaseModel):
    """منصب قيادي في الهيكل الإداري (وزير ← مدير عام ← ...)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    level = models.PositiveSmallIntegerField(default=1, verbose_name='المستوى الهرمي')
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children', verbose_name='المنصب الأعلى',
    )
    department = models.ForeignKey(
        'Department', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='positions', verbose_name='الوحدة/القسم',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['level', 'order', 'name_ar']
        verbose_name = 'منصب قيادي'
        verbose_name_plural = 'المناصب القيادية'

    def __str__(self):
        return self.name_ar


class Sector(BaseModel):
    """قطاع إداري (البحر الأحمر، كسلا، قضارف، الخرطوم، الشمالية، الأبيض)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=100, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=100, blank=True, verbose_name='الاسم بالإنجليزية')
    region = models.CharField(max_length=30, blank=True, verbose_name='المنطقة')
    description = models.TextField(blank=True, verbose_name='الوصف')
    color = models.CharField(max_length=9, default='#0a6b58', verbose_name='اللون')
    phone = models.CharField(max_length=50, blank=True, verbose_name='الهاتف')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    address = models.TextField(blank=True, verbose_name='العنوان')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط العرض')
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='خط الطول')
    logo = models.ImageField(upload_to='sectors/', blank=True, null=True, verbose_name='الشعار')
    website = models.URLField(blank=True, verbose_name='الموقع الإلكتروني')
    working_hours = models.CharField(max_length=200, blank=True, verbose_name='ساعات العمل')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'قطاع إداري'
        verbose_name_plural = 'القطاعات الإدارية'

    def __str__(self):
        return self.name_ar


class Locality(BaseModel):
    """محلية — مستوى إداري فرعي داخل القطاع (ولاية ← محلية ← وحدة صحية/نقطة دخول)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    sector = models.ForeignKey(
        Sector, on_delete=models.CASCADE, related_name='localities', verbose_name='القطاع'
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'محلية'
        verbose_name_plural = 'المحليات'

    def __str__(self):
        return self.name_ar


class Department(BaseModel):
    """قسم رئيسي أو وحدة فرعية (الأغذية، الكرنتينة، الترصد، الناقل، المعمل، ...)."""

    class Kind(models.TextChoices):
        DEPARTMENT = 'DEPARTMENT', 'قسم رئيسي'
        UNIT = 'UNIT', 'وحدة فرعية'
        ENTRY_POINT = 'ENTRY_POINT', 'نقطة دخول'
        ENTRY_GROUP = 'ENTRY_GROUP', 'مجموعة نقاط الدخول'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    sector = models.ForeignKey(
        Sector, on_delete=models.CASCADE, null=True, blank=True,
        related_name='departments', verbose_name='القطاع',
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='children', verbose_name='القسم الأعلى',
    )
    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.DEPARTMENT, verbose_name='النوع'
    )
    manager_position = models.ForeignKey(
        OrgPosition, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_departments', verbose_name='المنصب المسؤول',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'قسم/وحدة'
        verbose_name_plural = 'الأقسام والوحدات'

    def __str__(self):
        return self.name_ar


class Station(BaseModel):
    """محطة تشغيلية داخل إدارة (نقطة عمل ميداني يتبع إدارة داخل قطاع)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, null=True, blank=True,
        related_name='stations', verbose_name='الإدارة',
    )
    sector = models.ForeignKey(
        Sector, on_delete=models.CASCADE, null=True, blank=True,
        related_name='stations', verbose_name='القطاع',
    )
    location = models.CharField(max_length=150, blank=True, verbose_name='الموقع')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'محطة'
        verbose_name_plural = 'المحطات'

    def __str__(self):
        return self.name_ar


class OrgAssignment(BaseModel):
    """تعيين موظف في موقع هيكلي (منصب/قطاع/قسم) مع فترة صلاحية."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='org_assignments', verbose_name='الموظف',
    )
    position = models.ForeignKey(
        OrgPosition, on_delete=models.PROTECT, null=True, blank=True,
        related_name='assignments', verbose_name='المنصب',
    )
    sector = models.ForeignKey(
        Sector, on_delete=models.PROTECT, null=True, blank=True,
        related_name='assignments', verbose_name='القطاع',
    )
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, null=True, blank=True,
        related_name='assignments', verbose_name='القسم',
    )
    station = models.ForeignKey(
        Station, on_delete=models.PROTECT, null=True, blank=True,
        related_name='assignments', verbose_name='المحطة',
    )
    entry_point = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.PROTECT, null=True, blank=True,
        related_name='org_assignments', verbose_name='نقطة الدخول',
    )
    is_primary = models.BooleanField(default=False, verbose_name='التعيين الرئيسي')
    start_date = models.DateField(null=True, blank=True, verbose_name='تاريخ البداية')
    end_date = models.DateField(null=True, blank=True, verbose_name='تاريخ النهاية')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['-is_primary', '-start_date', '-created_at']
        verbose_name = 'تعيين هيكلي'
        verbose_name_plural = 'التعيينات الهيكلية'

    def __str__(self):
        return f'{self.user} → {self.position or self.sector or self.department or self.station}'
